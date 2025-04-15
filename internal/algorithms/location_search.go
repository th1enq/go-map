package algorithms

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"

	"github.com/th1enq/go-map/internal/models"
)

func SearchLocationsByActivity(
	lat, lng float64,
	activity string,
	radiusKm float64,
) ([]models.Location, error) {
	var locations []models.Location

	// Nominatim API URL
	apiURL := "https://nominatim.openstreetmap.org/search"

	// Create the bounding box (radius in degrees)
	const degreePerKm = 0.009 // Approximation for 1km
	delta := radiusKm * degreePerKm
	minLat := lat - delta
	maxLat := lat + delta
	minLng := lng - delta
	maxLng := lng + delta

	// Prepare the query parameters
	params := url.Values{}
	params.Set("q", activity)
	params.Set("format", "json")
	params.Set("bounded", "1")
	params.Set("viewbox", fmt.Sprintf("%f,%f,%f,%f", minLng, minLat, maxLng, maxLat))
	params.Set("limit", "50")

	// Make the HTTP request
	resp, err := http.Get(fmt.Sprintf("%s?%s", apiURL, params.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read and parse the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var results []struct {
		DisplayName string `json:"display_name"`
		Lat         string `json:"lat"`
		Lon         string `json:"lon"`
	}
	if err := json.Unmarshal(body, &results); err != nil {
		return nil, err
	}

	// Map the results to the Location model
	for _, result := range results {
		lat, _ := strconv.ParseFloat(result.Lat, 64)
		lng, _ := strconv.ParseFloat(result.Lon, 64)
		locations = append(locations, models.Location{
			Name:      result.DisplayName,
			Latitude:  lat,
			Longitude: lng,
		})
	}

	return locations, nil
}

// func SearchActivitiesByLocation(
// 	lat, lng float64,
// 	radiusKm float64,
// ) ([]models.Activity, error) {

// }

// func FilterLocationsByActivity(locations []models.Location, activity string) []models.Location {
// 	var result []models.Location

// 	for _, loc := range locations {
// 		var activities []string

// 		json.Unmarshal([]byte(loc.Activities), &activities)

// 		for _, act := range activities {
// 			if strings.ToLower(act) == strings.ToLower(activity) {
// 				result = append(result, loc)
// 				break
// 			}
// 		}
// 	}

// 	return result
// }

func FilterNearbyLocations(locations []models.Location, lat, lng float64, radiusKm float64) []models.Location {
	var result []models.Location

	for _, loc := range locations {
		dist := Distance(lat, lng, loc.Latitude, loc.Longitude)
		if dist <= radiusKm {
			result = append(result, loc)
		}
	}

	return result
}
