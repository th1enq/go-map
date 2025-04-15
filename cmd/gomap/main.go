package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/th1enq/go-map/config"
	"github.com/th1enq/go-map/internal/api"
	"github.com/th1enq/go-map/internal/db"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := db.Load(cfg)
	if err != nil {
		log.Fatalf("failed to load database: %v", err)
	}

	router := api.SetupNewRouter(db)

	server := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: router,
	}

	go func() {
		fmt.Printf("Server listening on port: %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server starting failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced shutdown: %v", err)
	}
	fmt.Println("Shutting down server")
}

func searchNearbyPlaces(location, activity string) ([]map[string]interface{}, error) {
	// client := resty.New()
	// url := "https://nominatim.openstreetmap.org/search"

	// // Parse the location into longitude and latitude
	// fmt.Println
	// const delta = 0.01 // Approx. 1km in degrees
	// minLon := lon - delta
	// maxLon := lon + delta
	// minLat := lat - delta
	// maxLat := lat + delta
	// viewbox := fmt.Sprintf("%f,%f,%f,%f", minLon, minLat, maxLon, maxLat)

	// // Log the calculated bounding box for debugging
	// log.Printf("Calculated viewbox: %s", viewbox)

	// // Make the API request
	// resp, err := client.R().
	// 	SetQueryParams(map[string]string{
	// 		"q":       activity,
	// 		"format":  "json",
	// 		"limit":   "10",
	// 		"viewbox": viewbox, // Use the calculated bounding box
	// 		"bounded": "1",     // Restrict results to the bounding box
	// 	}).
	// 	SetHeader("User-Agent", "go-map-app").
	// 	Get(url)

	// if err != nil {
	// 	return nil, err
	// }

	// Parse the API response
	// var results []map[string]interface{}
	// if err := json.Unmarshal(resp.Body(), &results); err != nil {
	// 	return nil, err
	// }

	// // Log the raw response body for debugging
	// log.Printf("Nominatim API response: %s", resp.Body())

	// return results, nil
	return nil, nil
}
