package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/th1enq/go-map/internal/algorithms"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/services"
	"gorm.io/datatypes"
)

type LoadingDataHandler struct {
	*services.TrajectoryServices
	*services.StayPointServices
	*services.UserServices
}

func NewLoadingDataHandler(t *services.TrajectoryServices, s *services.StayPointServices, u *services.UserServices) *LoadingDataHandler {
	return &LoadingDataHandler{t, s, u}
}

func (l *LoadingDataHandler) LoadGeolifeData(dataDir string) error {
	// Kiểm tra thư mục dữ liệu
	if _, err := os.Stat(dataDir); os.IsNotExist(err) {
		return fmt.Errorf("data directory not found: %s", dataDir)
	}

	// Duyệt qua các thư mục người dùng
	userDirs, err := os.ReadDir(filepath.Join(dataDir, "Data"))
	if err != nil {
		return fmt.Errorf("error reading Data directory: %w", err)
	}

	// cnt := 0

	for _, userDir := range userDirs {
		if !userDir.IsDir() {
			continue
		}

		// cnt++
		// if cnt == 2 {
		// 	break
		// }

		userFolder := userDir.Name()
		// Tạo hoặc tìm user tương ứng trong database
		user, err := l.UserServices.FindOrCreateByFolder(userFolder)
		if err != nil {
			if err.Error() == "user data already imported" {
				fmt.Printf("Skipping user %s: data already imported\n", userFolder)
				continue
			}
			fmt.Printf("Error getting user for folder %s: %v\n", userFolder, err)
			continue
		}

		userID := user.ID

		trajectoryPath := filepath.Join(dataDir, "Data", userFolder, "Trajectory")
		if _, err := os.Stat(trajectoryPath); os.IsNotExist(err) {
			continue
		}

		files, err := os.ReadDir(trajectoryPath)
		if err != nil {
			fmt.Printf("Error reading trajectory directory for user %s: %v\n", userFolder, err)
			continue
		}

		for _, file := range files {
			if filepath.Ext(file.Name()) != ".plt" {
				continue
			}

			filePath := filepath.Join(trajectoryPath, file.Name())
			err = l.processPLTFile(filePath, userID)
			if err != nil {
				fmt.Printf("Error processing file %s: %v\n", filePath, err)
				continue
			}
		}
	}

	return nil
}

// Xử lý một file PLT
func (l *LoadingDataHandler) processPLTFile(filePath string, userID uint) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)

	// Bỏ qua 6 dòng đầu (header)
	for i := 0; i < 6; i++ {
		if !scanner.Scan() {
			return fmt.Errorf("file too short, cannot skip header")
		}
	}

	var points []models.GPSPoint
	var startTime, endTime time.Time

	// Đọc dữ liệu
	for scanner.Scan() {
		line := scanner.Text()
		fields := strings.Split(line, ",")

		if len(fields) < 7 {
			continue
		}

		lat, err := strconv.ParseFloat(fields[0], 64)
		if err != nil {
			continue
		}

		lng, err := strconv.ParseFloat(fields[1], 64)
		if err != nil {
			continue
		}

		altitude, err := strconv.ParseFloat(fields[3], 64)
		if err != nil {
			continue
		}

		// Parse date and time
		dateStr := fields[5] + " " + fields[6]
		timestamp, err := time.Parse("2006-01-02 15:04:05", dateStr)
		if err != nil {
			continue
		}

		point := models.GPSPoint{
			Latitude:  lat,
			Longitude: lng,
			Altitude:  altitude,
			Timestamp: timestamp,
		}

		points = append(points, point)

		// Cập nhật thời gian bắt đầu và kết thúc
		if startTime.IsZero() || timestamp.Before(startTime) {
			startTime = timestamp
		}
		if endTime.IsZero() || timestamp.After(endTime) {
			endTime = timestamp
		}
	}

	if len(points) == 0 {
		return nil
	}

	// Chuyển points sang JSON
	pointsJSON, err := json.Marshal(points)
	if err != nil {
		return err
	}

	// Tạo quỹ đạo mới
	trajectory := models.Trajectory{
		UserID:    userID,
		Points:    datatypes.JSON(pointsJSON),
		StartTime: startTime,
		EndTime:   endTime,
	}

	// Lưu quỹ đạo vào database
	trajectoryID, err := l.TrajectoryServices.Create(trajectory)
	if err != nil {
		return err
	}

	// Cập nhật ID
	trajectory.ID = trajectoryID

	// Phát hiện các điểm lưu trú
	stayPoints := algorithms.StayPointDetection(
		trajectory,
		200,            // 200m ngưỡng khoảng cách
		30*time.Minute, // 30 phút ngưỡng thời gian
	)

	// Lưu các điểm lưu trú vào DB
	if len(stayPoints) > 0 {
		err = l.StayPointServices.BatchCreate(stayPoints)
		if err != nil {
			fmt.Printf("Error saving stay points: %v\n", err)
		}
	}

	return nil
}
