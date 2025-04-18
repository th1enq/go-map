package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/models"
	"github.com/th1enq/go-map/internal/repositories"
)

type StayPointHandler struct {
	StayPointRepo *repositories.StayPointRepository
}

func NewStayPointHandler(stayPointRepo *repositories.StayPointRepository) *StayPointHandler {
	return &StayPointHandler{
		StayPointRepo: stayPointRepo,
	}
}

// OSMResponse represents the response from Nominatim API
type OSMResponse struct {
	DisplayName string `json:"display_name"`
	Address     struct {
		Road        string `json:"road"`
		Suburb      string `json:"suburb"`
		City        string `json:"city"`
		County      string `json:"county"`
		State       string `json:"state"`
		Postcode    string `json:"postcode"`
		Country     string `json:"country"`
		CountryCode string `json:"country_code"`
	} `json:"address"`
}

func (h *StayPointHandler) GetStayPointsWithOSMInfo(c *gin.Context) {
	// Get stay points from repository
	stayPoints, err := h.StayPointRepo.GetByUserID(1) // Assuming user ID 1 for now
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create a channel to collect results
	type Result struct {
		StayPoint models.StayPoint
		OSMInfo   OSMResponse
		Error     error
	}
	results := make(chan Result, len(stayPoints))

	// Create a rate limiter channel
	rateLimiter := make(chan struct{}, 1) // Allow 1 request per second

	// Process each stay point concurrently
	for _, sp := range stayPoints {
		go func(sp models.StayPoint) {
			// Wait for rate limiter
			rateLimiter <- struct{}{}
			defer func() { <-rateLimiter }()

			// Query Nominatim API
			url := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?format=json&lat=%f&lon=%f&zoom=18&addressdetails=1",
				sp.Latitude, sp.Longitude)

			// Create a new request
			req, err := http.NewRequest("GET", url, nil)
			if err != nil {
				results <- Result{StayPoint: sp, Error: err}
				return
			}

			// Add required headers
			req.Header.Set("User-Agent", "GoMap/1.0")
			req.Header.Set("Accept", "application/json")

			// Create HTTP client with timeout
			client := &http.Client{
				Timeout: 10 * time.Second,
			}

			resp, err := client.Do(req)
			if err != nil {
				results <- Result{StayPoint: sp, Error: err}
				return
			}
			defer resp.Body.Close()

			// Check response status
			if resp.StatusCode != http.StatusOK {
				results <- Result{StayPoint: sp, Error: fmt.Errorf("OSM API returned status: %d", resp.StatusCode)}
				return
			}

			var osmResp OSMResponse
			if err := json.NewDecoder(resp.Body).Decode(&osmResp); err != nil {
				results <- Result{StayPoint: sp, Error: fmt.Errorf("failed to decode OSM response: %v", err)}
				return
			}

			results <- Result{StayPoint: sp, OSMInfo: osmResp}
		}(sp)

		// Add delay between starting goroutines to prevent overwhelming the API
		time.Sleep(1 * time.Second)
	}

	// Collect results
	var enrichedStayPoints []gin.H
	for i := 0; i < len(stayPoints); i++ {
		result := <-results
		if result.Error != nil {
			fmt.Printf("Error processing stay point: %v\n", result.Error)
			continue
		}

		// Calculate duration
		duration := result.StayPoint.LeaveTime.Sub(result.StayPoint.ArrivalTime)
		hours := int(duration.Hours())
		minutes := int(duration.Minutes()) % 60

		enrichedStayPoints = append(enrichedStayPoints, gin.H{
			"stay_point": gin.H{
				"id": result.StayPoint.ID,
				"coordinates": gin.H{
					"latitude":  result.StayPoint.Latitude,
					"longitude": result.StayPoint.Longitude,
				},
				"time": gin.H{
					"arrival":  result.StayPoint.ArrivalTime.Format("2006-01-02 15:04:05"),
					"leave":    result.StayPoint.LeaveTime.Format("2006-01-02 15:04:05"),
					"duration": fmt.Sprintf("%d hours %d minutes", hours, minutes),
				},
			},
			"location": gin.H{
				"display_name": result.OSMInfo.DisplayName,
				"address": gin.H{
					"road":     result.OSMInfo.Address.Road,
					"suburb":   result.OSMInfo.Address.Suburb,
					"city":     result.OSMInfo.Address.City,
					"state":    result.OSMInfo.Address.State,
					"country":  result.OSMInfo.Address.Country,
					"postcode": result.OSMInfo.Address.Postcode,
				},
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_stay_points": len(enrichedStayPoints),
		"stay_points":       enrichedStayPoints,
	})
}
