package algorithms

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/th1enq/go-map/internal/models"
)

func SearchLocationsByActivity(lat, lng float64, radiusKm float64, category string) ([]models.Location, error) {
	var locations []models.Location

	apiURL := "https://nominatim.openstreetmap.org/search"

	const degreePerKm = 0.009
	delta := radiusKm * degreePerKm
	minLat := lat - delta
	maxLat := lat + delta
	minLng := lng - delta
	maxLng := lng + delta

	categoryTags := map[string][]string{
		"travel":        {"hotel", "motel", "guest_house", "hostel", "attraction", "viewpoint", "bus_station", "ferry_terminal", "taxi", "airport", "bus_stop", "station", "subway_entrance", "tram_stop"},
		"restaurant":    {"restaurant", "cafe", "fast_food", "bar", "pub", "food_court", "bakery", "confectionery", "beverages", "deli"},
		"entertainment": {"cinema", "theatre", "nightclub", "casino", "arts_centre", "amusement_arcade", "escape_game", "miniature_golf", "museum", "zoo", "aquarium", "theme_park"},
		"sport":         {"gym", "stadium", "soccer", "basketball", "swimming", "tennis", "climbing", "yoga", "swimming"},
		"education":     {"school", "university", "kindergarten", "library"},
	}

	tags, ok := categoryTags[strings.ToLower(category)]
	if !ok {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	// Create a WaitGroup to wait for all goroutines to complete
	var wg sync.WaitGroup
	locationChannel := make(chan models.Location)

	client := &http.Client{}

	// Process each tag concurrently
	for _, tag := range tags {
		wg.Add(1) // Add 1 to the WaitGroup for each goroutine
		go func(tag string) {
			defer wg.Done() // Mark the goroutine as done when it finishes
			params := url.Values{}
			params.Set("q", tag)
			params.Set("format", "json")
			params.Set("bounded", "1")
			params.Set("viewbox", fmt.Sprintf("%f,%f,%f,%f", minLng, maxLat, maxLng, minLat))
			params.Set("limit", "10")

			fullURL := fmt.Sprintf("%s?%s", apiURL, params.Encode())
			req, _ := http.NewRequest("GET", fullURL, nil)
			req.Header.Set("User-Agent", "golang-client")

			resp, err := client.Do(req)
			if err != nil {
				fmt.Println("Error fetching", tag, ":", err)
				return
			}
			defer resp.Body.Close()

			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				return
			}

			var results []struct {
				DisplayName string `json:"display_name"`
				Lat         string `json:"lat"`
				Lon         string `json:"lon"`
			}
			if err := json.Unmarshal(body, &results); err != nil {
				return
			}

			// Send the results to the channel
			for _, result := range results {
				lat, _ := strconv.ParseFloat(result.Lat, 64)
				lng, _ := strconv.ParseFloat(result.Lon, 64)
				locationChannel <- models.Location{
					Name:      result.DisplayName,
					Latitude:  lat,
					Longitude: lng,
				}
			}
		}(tag) // Pass the tag to the goroutine
	}

	// Create a goroutine to close the channel once all work is done
	go func() {
		wg.Wait()              // Wait for all the goroutines to finish
		close(locationChannel) // Close the channel
	}()

	// Collect all locations from the channel
	for location := range locationChannel {
		locations = append(locations, location)
	}

	return locations, nil
}

func SearchActivitiesByLocation(lat, lng float64, radiusKm float64) ([]models.Location, error) {
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
	params.Set("format", "json")
	params.Set("bounded", "1")
	params.Set("viewbox", fmt.Sprintf("%f,%f,%f,%f", minLng, minLat, maxLng, maxLat))
	params.Set("limit", "50") // Limit the number of results

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

func FilterLocationsByActivity(locations []models.Location, activity string) []models.Location {
	var result []models.Location

	for _, loc := range locations {
		var activities []string

		json.Unmarshal([]byte(loc.Activities), &activities)

		for _, act := range activities {
			if strings.ToLower(act) == strings.ToLower(activity) {
				result = append(result, loc)
				break
			}
		}
	}

	return result
}

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
