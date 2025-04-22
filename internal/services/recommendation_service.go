package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sort"

	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
)

type RecommendationService struct {
	db            *db.DB
	similaritySvc *SimilarityService
	frameworkSvc  *HierarchicalFrameworkService
	stayPointSvc  *StayPointServices
	locationSvc   *LocationServices
}

func NewRecommendationService(
	db *db.DB,
	similaritySvc *SimilarityService,
	frameworkSvc *HierarchicalFrameworkService,
	stayPointSvc *StayPointServices,
	locationSvc *LocationServices,
) *RecommendationService {
	return &RecommendationService{
		db:            db,
		similaritySvc: similaritySvc,
		frameworkSvc:  frameworkSvc,
		stayPointSvc:  stayPointSvc,
		locationSvc:   locationSvc,
	}
}

// UserSimilarity represents a user and their similarity score
type UserSimilarity struct {
	UserID     uint
	Similarity float64
}

// LocationScore represents a location and its predicted score
type LocationScore struct {
	LocationID uint
	Score      float64
}

func (r *RecommendationService) FixLocations(locations []models.Location) ([]models.Location, error) {
	var updatedLocations []models.Location

	for _, location := range locations {
		// Skip if location already has a name
		if location.Name != "" {
			updatedLocations = append(updatedLocations, location)
			continue
		}

		// Query Nominatim API
		baseURL := "https://nominatim.openstreetmap.org/reverse"
		params := url.Values{}
		params.Add("format", "json")
		params.Add("lat", fmt.Sprintf("%f", location.Latitude))
		params.Add("lon", fmt.Sprintf("%f", location.Longitude))
		params.Add("zoom", "18")            // Maximum zoom level for most detailed results
		params.Add("namedetails", "1")      // Include alternative names
		params.Add("accept-language", "en") // Request English names

		req, err := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
		if err != nil {
			continue
		}

		// Add headers to request
		req.Header.Add("Accept-Language", "en")
		req.Header.Add("User-Agent", "Go-Map-App")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			continue // Skip this location if API fails
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			continue
		}

		var nominatimResult struct {
			PlaceID     int64   `json:"place_id"`
			License     string  `json:"licence"`
			OsmType     string  `json:"osm_type"`
			OsmID       int64   `json:"osm_id"`
			Lat         string  `json:"lat"`
			Lon         string  `json:"lon"`
			Class       string  `json:"class"`
			Type        string  `json:"type"`
			PlaceRank   int     `json:"place_rank"`
			Importance  float64 `json:"importance"`
			AddressType string  `json:"addresstype"`
			Name        string  `json:"name"`
			DisplayName string  `json:"display_name"`
			Namedetails struct {
				NameEn string `json:"name:en"`
			} `json:"namedetails"`
			Address struct {
				Amenity      string `json:"amenity"`
				HouseNumber  string `json:"house_number"`
				Road         string `json:"road"`
				CityDistrict string `json:"city_district"`
				City         string `json:"city"`
				State        string `json:"state"`
				Postcode     string `json:"postcode"`
				Country      string `json:"country"`
				CountryCode  string `json:"country_code"`
			} `json:"address"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&nominatimResult); err != nil {
			continue
		}

		// Only update if we got a name
		if nominatimResult.Name != "" {
			// Use English name if available, otherwise use the default name
			name := nominatimResult.Name
			if nominatimResult.Namedetails.NameEn != "" {
				name = nominatimResult.Namedetails.NameEn
			}

			// Update location in database
			location.Name = name
			location.Description = nominatimResult.DisplayName
			if err := r.db.Save(&location).Error; err != nil {
				continue
			}

			updatedLocations = append(updatedLocations, location)
		}
	}

	return updatedLocations, nil
}

func (r *RecommendationService) GetNearByCluster(lat, lng, radiusKm float64) ([]models.Location, error) {
	var clusters []models.Cluster

	// Convert radius from kilometers to meters (since radius in Cluster is stored in meters)
	radiusMeters := radiusKm * 1000

	// Use PostGIS ST_DWithin function to find clusters within the specified radius
	// The formula used is the Haversine formula for calculating distances on a sphere
	query := `
		SELECT * FROM clusters 
		WHERE layer_id = 1 and ST_DWithin(
			ST_MakePoint(center_lng, center_lat)::geography,
			ST_MakePoint(?, ?)::geography,
			?
		)
		ORDER BY visit_count DESC
	`

	err := r.db.Raw(query, lng, lat, radiusMeters).Scan(&clusters).Error
	if err != nil {
		return nil, err
	}

	return r.ProcessClustersToLocations(clusters)
}

// processClustersToLocations converts a list of clusters to locations, fetching names from API when needed
func (r *RecommendationService) ProcessClustersToLocations(clusters []models.Cluster) ([]models.Location, error) {
	locations := make([]models.Location, 0)

	for _, cluster := range clusters {
		var existingLocation models.Location
		dbResult := r.db.Where("cluster_id = ?", cluster.ID).First(&existingLocation)

		if dbResult.Error == nil {
			// Location exists in database
			if existingLocation.Name != "" {
				// Name already exists, add to results
				locations = append(locations, existingLocation)
				continue
			} else {
				// Location exists but name is empty, query API and update
				updatedLocation, err := r.fetchAndUpdateLocationName(existingLocation, cluster.CenterLat, cluster.CenterLng)
				if err == nil && updatedLocation.Name != "" {
					locations = append(locations, updatedLocation)
					continue
				}
			}
		} else {
			// Location doesn't exist, create new location with API data
			newLocation, err := r.createLocationFromAPI(cluster)
			if err == nil {
				locations = append(locations, newLocation)
			}
		}
	}

	return locations, nil
}

// Helper function to fetch location name from API and update existing record
func (r *RecommendationService) fetchAndUpdateLocationName(location models.Location, lat, lng float64) (models.Location, error) {
	// Query Nominatim API
	baseURL := "https://nominatim.openstreetmap.org/reverse"
	params := url.Values{}
	params.Add("format", "json")
	params.Add("lat", fmt.Sprintf("%f", lat))
	params.Add("lon", fmt.Sprintf("%f", lng))
	params.Add("zoom", "18")            // Maximum zoom level for most detailed results
	params.Add("namedetails", "1")      // Include alternative names
	params.Add("accept-language", "en") // Request English names

	req, err := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return location, err
	}

	// Add headers to request
	req.Header.Add("Accept-Language", "en")
	req.Header.Add("User-Agent", "Go-Map-App")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return location, err // Return original location if API fails
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return location, fmt.Errorf("API returned status code %d", resp.StatusCode)
	}

	var nominatimResult struct {
		PlaceID     int64   `json:"place_id"`
		License     string  `json:"licence"`
		OsmType     string  `json:"osm_type"`
		OsmID       int64   `json:"osm_id"`
		Lat         string  `json:"lat"`
		Lon         string  `json:"lon"`
		Class       string  `json:"class"`
		Type        string  `json:"type"`
		PlaceRank   int     `json:"place_rank"`
		Importance  float64 `json:"importance"`
		AddressType string  `json:"addresstype"`
		Name        string  `json:"name"`
		DisplayName string  `json:"display_name"`
		Namedetails struct {
			NameEn string `json:"name:en"`
		} `json:"namedetails"`
		Address struct {
			Amenity      string `json:"amenity"`
			HouseNumber  string `json:"house_number"`
			Road         string `json:"road"`
			CityDistrict string `json:"city_district"`
			City         string `json:"city"`
			State        string `json:"state"`
			Postcode     string `json:"postcode"`
			Country      string `json:"country"`
			CountryCode  string `json:"country_code"`
		} `json:"address"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&nominatimResult); err != nil {
		return location, err
	}

	// Update location if we got a name
	if nominatimResult.Name != "" {
		// Use English name if available, otherwise use the default name
		name := nominatimResult.Name
		if nominatimResult.Namedetails.NameEn != "" {
			name = nominatimResult.Namedetails.NameEn
		}

		// Update location
		location.Name = name
		location.Description = nominatimResult.DisplayName

		// Save to database
		if err := r.db.Save(&location).Error; err != nil {
			return location, err
		}
	}

	return location, nil
}

// Helper function to create a new location from API data
func (r *RecommendationService) createLocationFromAPI(cluster models.Cluster) (models.Location, error) {
	// Query Nominatim API
	baseURL := "https://nominatim.openstreetmap.org/reverse"
	params := url.Values{}
	params.Add("format", "json")
	params.Add("lat", fmt.Sprintf("%f", cluster.CenterLat))
	params.Add("lon", fmt.Sprintf("%f", cluster.CenterLng))
	params.Add("zoom", "18")            // Maximum zoom level for most detailed results
	params.Add("namedetails", "1")      // Include alternative names
	params.Add("accept-language", "en") // Request English names

	req, err := http.NewRequest("GET", baseURL+"?"+params.Encode(), nil)
	if err != nil {
		return models.Location{}, err
	}

	// Add headers to request
	req.Header.Add("Accept-Language", "en")
	req.Header.Add("User-Agent", "Go-Map-App")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return models.Location{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.Location{}, fmt.Errorf("API returned status code %d", resp.StatusCode)
	}

	var nominatimResult struct {
		PlaceID     int64   `json:"place_id"`
		License     string  `json:"licence"`
		OsmType     string  `json:"osm_type"`
		OsmID       int64   `json:"osm_id"`
		Lat         string  `json:"lat"`
		Lon         string  `json:"lon"`
		Class       string  `json:"class"`
		Type        string  `json:"type"`
		PlaceRank   int     `json:"place_rank"`
		Importance  float64 `json:"importance"`
		AddressType string  `json:"addresstype"`
		Name        string  `json:"name"`
		DisplayName string  `json:"display_name"`
		Namedetails struct {
			NameEn string `json:"name:en"`
		} `json:"namedetails"`
		Address struct {
			Amenity      string `json:"amenity"`
			HouseNumber  string `json:"house_number"`
			Road         string `json:"road"`
			CityDistrict string `json:"city_district"`
			City         string `json:"city"`
			State        string `json:"state"`
			Postcode     string `json:"postcode"`
			Country      string `json:"country"`
			CountryCode  string `json:"country_code"`
		} `json:"address"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&nominatimResult); err != nil {
		return models.Location{}, err
	}

	// Only create location if we got a name
	if nominatimResult.Name == "" {
		return models.Location{}, fmt.Errorf("no name found for location")
	}

	// Use English name if available, otherwise use the default name
	name := nominatimResult.Name
	if nominatimResult.Namedetails.NameEn != "" {
		name = nominatimResult.Namedetails.NameEn
	}

	// Create new location
	newLocation := models.Location{
		Latitude:    cluster.CenterLat,
		Longitude:   cluster.CenterLng,
		Name:        name,
		Description: nominatimResult.DisplayName,
		Category:    models.LocationCategory("travel"), // Default category
		ClusterID:   cluster.ID,
		VisitCount:  cluster.VisitCount,
	}

	// Save to database
	if err := r.db.Create(&newLocation).Error; err != nil {
		return models.Location{}, err
	}

	return newLocation, nil
}

// FindPotentialFriends finds users with high similarity scores
func (s *RecommendationService) FindPotentialFriends(queryUserID uint, frameworkID uint, threshold float64) ([]UserSimilarity, error) {
	// Get all users except the query user
	var users []models.User
	if err := s.db.Where("id != ?", queryUserID).Find(&users).Error; err != nil {
		return nil, err
	}

	// Calculate similarity scores
	var userSimilarities []UserSimilarity
	for _, user := range users {
		score, err := s.similaritySvc.CalculateSimilarityScore(queryUserID, user.ID, frameworkID)
		if err != nil {
			continue
		}

		if score >= threshold {
			userSimilarities = append(userSimilarities, UserSimilarity{
				UserID:     user.ID,
				Similarity: score,
			})
		}
	}

	// Sort by similarity score in descending order
	sort.Slice(userSimilarities, func(i, j int) bool {
		return userSimilarities[i].Similarity > userSimilarities[j].Similarity
	})

	return userSimilarities, nil
}

// FindUnvisitedLocations finds locations visited by potential friends but not by the query user
func (s *RecommendationService) FindUnvisitedLocations(queryUserID uint, potentialFriends []UserSimilarity) ([]models.Location, error) {
	// Get all locations visited by the query user
	var visitedLocations []models.Location
	if err := s.db.Model(&models.StayPoint{}).
		Joins("JOIN locations ON stay_points.location_id = locations.id").
		Where("stay_points.user_id = ?", queryUserID).
		Select("DISTINCT locations.*").
		Find(&visitedLocations).Error; err != nil {
		return nil, err
	}

	// Create a map of visited location IDs
	visitedMap := make(map[uint]bool)
	for _, loc := range visitedLocations {
		visitedMap[loc.ID] = true
	}

	// Get locations visited by potential friends
	var friendLocations []models.Location
	for _, friend := range potentialFriends {
		var locations []models.Location
		if err := s.db.Model(&models.StayPoint{}).
			Joins("JOIN locations ON stay_points.location_id = locations.id").
			Where("stay_points.user_id = ?", friend.UserID).
			Select("DISTINCT locations.*").
			Find(&locations).Error; err != nil {
			continue
		}

		// Add only unvisited locations
		for _, loc := range locations {
			if !visitedMap[loc.ID] {
				friendLocations = append(friendLocations, loc)
			}
		}
	}

	return friendLocations, nil
}

// PredictLocationScores predicts scores for unvisited locations using collaborative filtering
func (s *RecommendationService) PredictLocationScores(
	queryUserID uint,
	unvisitedLocations []models.Location,
	potentialFriends []UserSimilarity,
) ([]LocationScore, error) {
	var locationScores []LocationScore

	// Get total similarity score for normalization
	totalSimilarity := 0.0
	for _, friend := range potentialFriends {
		totalSimilarity += friend.Similarity
	}

	// Calculate predicted score for each location
	for _, location := range unvisitedLocations {
		score := 0.0

		// For each potential friend who visited this location
		for _, friend := range potentialFriends {
			// Check if friend visited this location
			var visitCount int64
			if err := s.db.Model(&models.StayPoint{}).
				Where("user_id = ? AND location_id = ?", friend.UserID, location.ID).
				Count(&visitCount).Error; err != nil {
				continue
			}

			if visitCount > 0 {
				// Calculate normalized similarity
				normalizedSimilarity := friend.Similarity / totalSimilarity
				// Add to score
				score += normalizedSimilarity * float64(visitCount)
			}
		}

		locationScores = append(locationScores, LocationScore{
			LocationID: location.ID,
			Score:      score,
		})
	}

	// Sort by score in descending order
	sort.Slice(locationScores, func(i, j int) bool {
		return locationScores[i].Score > locationScores[j].Score
	})

	return locationScores, nil
}

// GetRecommendations gets top N location recommendations for a user
func (s *RecommendationService) GetRecommendations(
	queryUserID uint,
	frameworkID uint,
	similarityThreshold float64,
	topN int,
) ([]models.Location, error) {
	// Step 1: Find potential friends based on cluster similarity
	potentialFriends, err := s.FindPotentialFriends(queryUserID, frameworkID, similarityThreshold)
	if err != nil {
		return nil, err
	}

	log.Println(len(potentialFriends))

	// Step 2: Get clusters visited by the query user
	var userClusters []models.Cluster
	if err := s.db.Model(&models.GraphNode{}).
		Joins("JOIN clusters ON graph_nodes.cluster_id = clusters.id").
		Where("graph_nodes.graph_id = ? AND clusters.framework_id = ?", queryUserID, frameworkID).
		Select("DISTINCT clusters.*").
		Find(&userClusters).Error; err != nil {
		return nil, err
	}

	// Create a map of visited cluster IDs
	visitedClusterMap := make(map[uint]bool)
	for _, cluster := range userClusters {
		visitedClusterMap[cluster.ID] = true
	}

	// Step 3: Get clusters visited by potential friends but not by the query user
	var friendClusters []models.Cluster
	for _, friend := range potentialFriends {
		var clusters []models.Cluster
		if err := s.db.Model(&models.GraphNode{}).
			Joins("JOIN clusters ON graph_nodes.cluster_id = clusters.id").
			Where("graph_nodes.graph_id = ? AND clusters.framework_id = ?", friend.UserID, frameworkID).
			Select("DISTINCT clusters.*").
			Find(&clusters).Error; err != nil {
			continue
		}

		// Add only unvisited clusters
		for _, cluster := range clusters {
			if !visitedClusterMap[cluster.ID] {
				friendClusters = append(friendClusters, cluster)
			}
		}
	}

	// Step 4: Get locations for the recommended clusters
	var recommendedLocations []models.Location
	for _, cluster := range friendClusters {
		var location models.Location
		if err := s.db.Where("cluster_id = ?", cluster.ID).First(&location).Error; err != nil {
			continue
		}
		recommendedLocations = append(recommendedLocations, location)
	}

	// Step 5: Sort by visit count and similarity
	sort.Slice(recommendedLocations, func(i, j int) bool {
		// Get the clusters for these locations
		var clusterI, clusterJ models.Cluster
		s.db.First(&clusterI, recommendedLocations[i].ClusterID)
		s.db.First(&clusterJ, recommendedLocations[j].ClusterID)

		// Calculate weighted score based on visit count and similarity
		scoreI := float64(clusterI.VisitCount) * float64(recommendedLocations[i].VisitCount)
		scoreJ := float64(clusterJ.VisitCount) * float64(recommendedLocations[j].VisitCount)

		return scoreI > scoreJ
	})

	// Return top N locations
	if len(recommendedLocations) > topN {
		return recommendedLocations[:topN], nil
	}

	return recommendedLocations, nil
}
