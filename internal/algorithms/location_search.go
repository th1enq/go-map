package algorithms

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/th1enq/go-map/internal/models"
)

// OverpassResponse represents the response from Overpass API
type OverpassResponse struct {
	Elements []struct {
		Type   string            `json:"type"`
		ID     int64             `json:"id"`
		Lat    float64           `json:"lat"`
		Lon    float64           `json:"lon"`
		Tags   map[string]string `json:"tags"`
		Center struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		} `json:"center"`
	} `json:"elements"`
}

// filterLocationsByDistance filters locations within the specified radius
func filterLocationsByDistance(locations []models.Location, centerLat, centerLng, radiusKm float64) []models.Location {
	var filteredLocations []models.Location

	for _, loc := range locations {
		distance := Distance(centerLat, centerLng, loc.Latitude, loc.Longitude)
		if distance <= radiusKm {
			filteredLocations = append(filteredLocations, loc)
		}
	}

	return filteredLocations
}

func SearchLocationsByActivity(lat, lng float64, radiusKm float64, category string) ([]models.Location, error) {
	var locations []models.Location

	// Convert radius from km to meters (with some buffer to account for potential inaccuracies)
	radiusMeters := int(radiusKm * 1100) // Add 10% buffer

	// Define categories and their corresponding OSM tags with more detailed suggestions
	categories := map[string]string{
		"travel": `["amenity"~"taxi|bus|hotel|hostel|guest_house|motel|camp_site|caravan_site|bus_station|train_station|airport|ferry_terminal|taxi|car_rental|car_sharing|bicycle_rental|bicycle_repair_station|parking|parking_space|parking_entrance|charging_station|travel_agency|tourist_information|visitor_centre"]`,

		"restaurant": `["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|biergarten|ice_cream|juice_bar|smoothie_bar|coffee_shop|bakery|confectionery|marketplace|supermarket|convenience|grocery|butcher|fishmonger|greengrocer|food_court|hawker_centre|street_food|noodle_house|pho_restaurant|dim_sum|barbecue|seafood|vegetarian|halal|kosher"]`,

		"entertainment": `["amenity"~"cinema|theatre|arts_centre|concert_hall|conference_centre|exhibition_centre|museum|gallery|library|community_centre|social_centre|studio|casino|karaoke|bowling_alley|amusement_arcade|park|garden|playground|fitness_centre|sports_centre|stadium|swimming_pool|water_park|beach_resort|fishing|horse_riding|ice_rink|miniature_golf|pitch|sauna|tanning_salon|dance_studio|yoga|martial_arts|boxing|climbing|golf_course|tennis_court|basketball_court|volleyball_court|football_pitch|baseball|table_tennis|bowling_alley|skateboard|skiing|attraction|viewpoint|theme_park|zoo|aquarium|planetarium|picnic_site|camp_site|caravan_site|hostel|hotel|motel|guest_house|information|artwork|massage|spa|traditional_market|night_market|shopping_street|craft_centre"]`,

		"sport": `["leisure"~"sports_centre|fitness_centre|stadium|swimming_pool|gym|sports_hall|dance_studio|yoga|martial_arts|boxing|climbing|golf_course|tennis_court|basketball_court|volleyball_court|football_pitch|baseball|table_tennis|bowling_alley|skateboard|skiing|badminton_court|table_tennis|traditional_sports|wrestling|muay_thai|taekwondo|judo|karate|kung_fu"]`,

		"education": `["amenity"~"school|university|college|library|kindergarten|language_school|music_school|driving_school|training|workshop|research_institute|archive|public_bookcase|temple_school|monastery|meditation_centre|cultural_centre|art_school|dance_school|martial_arts_school|cooking_school"]`,
	}

	tagFilter, ok := categories[strings.ToLower(category)]
	if !ok {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	// Construct Overpass QL query
	query := fmt.Sprintf(`
		[out:json][timeout:25];
		(
			node%s(around:%d,%f,%f);
			way%s(around:%d,%f,%f);
			relation%s(around:%d,%f,%f);
		);
		out body;
		>;
		out skel qt;
	`, tagFilter, radiusMeters, lat, lng,
		tagFilter, radiusMeters, lat, lng,
		tagFilter, radiusMeters, lat, lng)

	// Encode query for URL
	encodedQuery := url.QueryEscape(query)

	// Make request to Overpass API
	resp, err := http.Get("https://overpass-api.de/api/interpreter?data=" + encodedQuery)
	if err != nil {
		return nil, fmt.Errorf("error fetching data: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error response: status code %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	var result OverpassResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("error parsing response: %v", err)
	}

	// Process results
	for _, element := range result.Elements {
		var locationLat, locationLon float64

		// Get coordinates based on element type
		if element.Type == "node" {
			locationLat = element.Lat
			locationLon = element.Lon
		} else {
			locationLat = element.Center.Lat
			locationLon = element.Center.Lon
		}

		// Get name from tags
		name := element.Tags["name"]

		// Skip if no real name is available
		if name == "" {
			continue
		}

		// Create location object with additional details
		location := models.Location{
			Name:      name,
			Latitude:  locationLat,
			Longitude: locationLon,
			Category:  category,
		}

		// Add description if available
		if element.Tags["description"] != "" {
			location.Description = element.Tags["description"]
		} else if element.Tags["note"] != "" {
			location.Description = element.Tags["note"]
		}

		locations = append(locations, location)
	}

	// Filter locations by exact distance
	locations = filterLocationsByDistance(locations, lat, lng, radiusKm)

	if len(locations) == 0 {
		return nil, fmt.Errorf("no locations found for category: %s in the specified area", category)
	}

	return locations, nil
}

// SearchActivitiesByLocation searches for activities near a location using Overpass API
func SearchActivitiesByLocation(lat, lng float64, radiusKm float64) ([]models.Location, error) {
	var locations []models.Location

	// Convert radius from km to meters (with some buffer to account for potential inaccuracies)
	radiusMeters := int(radiusKm * 1100) // Add 10% buffer

	// Define categories and their corresponding OSM tags
	categories := map[string]string{
		"travel":        `["amenity"~"taxi|bus|hotel|hostel|guest_house|bus_station|train_station|airport|ferry_terminal|taxi"]`,
		"restaurant":    `["amenity"~"restaurant|cafe|fast_food|food_court"]`,
		"entertainment": `["amenity"~"cinema|theatre|mall|shopping_centre|park|garden|temple|pagoda"]`,
		"sport":         `["leisure"~"sports_centre|fitness_centre|stadium|swimming_pool|gym"]`,
		"education":     `["amenity"~"school|university|college|library|kindergarten"]`,
	}

	// Create a WaitGroup to wait for all goroutines to complete
	var wg sync.WaitGroup
	locationChannel := make(chan models.Location)
	errorChannel := make(chan error)

	// Process each category concurrently
	for category, tagFilter := range categories {
		wg.Add(1)
		go func(category, tagFilter string) {
			defer wg.Done()

			// Construct Overpass QL query
			query := fmt.Sprintf(`
				[out:json][timeout:25];
				(
					node%s(around:%d,%f,%f);
					way%s(around:%d,%f,%f);
					relation%s(around:%d,%f,%f);
				);
				out body;
				>;
				out skel qt;
			`, tagFilter, radiusMeters, lat, lng,
				tagFilter, radiusMeters, lat, lng,
				tagFilter, radiusMeters, lat, lng)

			// Encode query for URL
			encodedQuery := url.QueryEscape(query)

			// Make request to Overpass API
			resp, err := http.Get("https://overpass-api.de/api/interpreter?data=" + encodedQuery)
			if err != nil {
				errorChannel <- fmt.Errorf("error fetching data for category %s: %v", category, err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				errorChannel <- fmt.Errorf("error response for category %s: status code %d", category, resp.StatusCode)
				return
			}

			body, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				errorChannel <- fmt.Errorf("error reading response for category %s: %v", category, err)
				return
			}

			var result OverpassResponse
			if err := json.Unmarshal(body, &result); err != nil {
				errorChannel <- fmt.Errorf("error parsing response for category %s: %v", category, err)
				return
			}

			// Process results
			for _, element := range result.Elements {
				var locationLat, locationLon float64

				// Get coordinates based on element type
				if element.Type == "node" {
					locationLat = element.Lat
					locationLon = element.Lon
				} else {
					locationLat = element.Center.Lat
					locationLon = element.Center.Lon
				}

				// Get name from tags
				name := element.Tags["name"]

				// Skip if no real name is available
				if name == "" {
					continue
				}

				// Create location object with additional details
				location := models.Location{
					Name:      name,
					Latitude:  locationLat,
					Longitude: locationLon,
					Category:  category,
				}

				// Add description if available
				if element.Tags["description"] != "" {
					location.Description = element.Tags["description"]
				} else if element.Tags["note"] != "" {
					location.Description = element.Tags["note"]
				}

				locationChannel <- location
			}
		}(category, tagFilter)
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

	// Filter locations by exact distance
	locations = filterLocationsByDistance(locations, lat, lng, radiusKm)

	// Check for any errors
	for err := range errorChannel {
		fmt.Printf("Error occurred: %v\n", err)
	}

	if len(locations) == 0 {
		return nil, fmt.Errorf("no locations found in the specified area")
	}

	return locations, nil
}
