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
		"travel":        {"hotel", "hostel", "guest_house", "bus_station", "train_station", "airport", "ferry_terminal", "taxi"},
		"restaurant":    {"restaurant", "cafe", "fast_food", "pho", "noodle", "rice", "food_court", "market"},
		"entertainment": {"cinema", "theatre", "mall", "shopping_centre", "park", "garden", "temple", "pagoda"},
		"sport":         {"stadium", "sports_centre", "fitness_centre", "sport", "swimming", "gym"},
		"education":     {"school", "university", "college", "library", "kindergarten"},
	}

	tags, ok := categoryTags[strings.ToLower(category)]
	if !ok {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	// Create a WaitGroup to wait for all goroutines to complete
	var wg sync.WaitGroup
	locationChannel := make(chan models.Location)
	errorChannel := make(chan error)

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
			fmt.Printf("Searching for %s with URL: %s\n", tag, fullURL)

			req, err := http.NewRequest("GET", fullURL, nil)
			if err != nil {
				errorChannel <- fmt.Errorf("error creating request for %s: %v", tag, err)
				return
			}

			req.Header.Set("User-Agent", "golang-client")

			resp, err := client.Do(req)
			if err != nil {
				errorChannel <- fmt.Errorf("error fetching %s: %v", tag, err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				errorChannel <- fmt.Errorf("error response for %s: status code %d", tag, resp.StatusCode)
				return
			}

			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				errorChannel <- fmt.Errorf("error reading response for %s: %v", tag, err)
				return
			}

			var results []struct {
				DisplayName string `json:"display_name"`
				Lat         string `json:"lat"`
				Lon         string `json:"lon"`
			}

			if err := json.Unmarshal(body, &results); err != nil {
				errorChannel <- fmt.Errorf("error parsing response for %s: %v", tag, err)
				return
			}

			if len(results) == 0 {
				fmt.Printf("No results found for tag: %s\n", tag)
				return
			}

			// Send the results to the channel
			for _, result := range results {
				lat, err := strconv.ParseFloat(result.Lat, 64)
				if err != nil {
					errorChannel <- fmt.Errorf("error parsing latitude for %s: %v", tag, err)
					continue
				}

				lng, err := strconv.ParseFloat(result.Lon, 64)
				if err != nil {
					errorChannel <- fmt.Errorf("error parsing longitude for %s: %v", tag, err)
					continue
				}

				locationChannel <- models.Location{
					Name:      result.DisplayName,
					Latitude:  lat,
					Longitude: lng,
				}
			}
		}(tag)
	}

	// Create a goroutine to close the channels once all work is done
	go func() {
		wg.Wait()
		close(locationChannel)
		close(errorChannel)
	}()

	// Collect all locations from the channel
	for location := range locationChannel {
		locations = append(locations, location)
	}

	// Check for any errors
	for err := range errorChannel {
		fmt.Printf("Error occurred: %v\n", err)
	}

	if len(locations) == 0 {
		return nil, fmt.Errorf("no locations found for category: %s in the specified area", category)
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

	fullURL := fmt.Sprintf("%s?%s", apiURL, params.Encode())
	fmt.Printf("Searching nearby places with URL: %s\n", fullURL)

	// Make the HTTP request
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("User-Agent", "golang-client")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error response: status code %d", resp.StatusCode)
	}

	// Read and parse the response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	var results []struct {
		DisplayName string `json:"display_name"`
		Lat         string `json:"lat"`
		Lon         string `json:"lon"`
	}

	if err := json.Unmarshal(body, &results); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no locations found in the specified area")
	}

	// Map the results to the Location model
	for _, result := range results {
		lat, err := strconv.ParseFloat(result.Lat, 64)
		if err != nil {
			fmt.Printf("Error parsing latitude: %v\n", err)
			continue
		}

		lng, err := strconv.ParseFloat(result.Lon, 64)
		if err != nil {
			fmt.Printf("Error parsing longitude: %v\n", err)
			continue
		}

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
