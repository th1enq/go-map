package services

import (
	"math"
	"time"

	"github.com/th1enq/go-map/internal/models"
	"gorm.io/gorm"
)

type SimilarityService struct {
	db *gorm.DB
	hf *HierarchicalFrameworkService
}

func NewSimilarityService(db *gorm.DB, hf *HierarchicalFrameworkService) *SimilarityService {
	return &SimilarityService{
		db: db,
		hf: hf,
	}
}

// SimilarSequence represents a similar sequence between two users
type SimilarSequence struct {
	Length     int
	Layer      int
	Nodes      []uint
	TimeDiffs  []time.Duration
	Similarity float64
}

// CalculateUserSimilarity calculates the similarity score between two users
func (s *SimilarityService) CalculateUserSimilarity(user1ID, user2ID uint, frameworkID uint) (float64, error) {
	// Get both users' hierarchical graphs
	graph1, err := s.hf.GetUserGraph(user1ID, frameworkID)
	if err != nil {
		return 0, err
	}

	graph2, err := s.hf.GetUserGraph(user2ID, frameworkID)
	if err != nil {
		return 0, err
	}

	// Find similar sequences at each layer
	var totalSimilarity float64
	for layer := 1; layer <= 3; layer++ { // Assuming 3 layers
		sequences, err := s.findSimilarSequences(graph1, graph2, layer)
		if err != nil {
			return 0, err
		}

		// Calculate layer-specific similarity
		layerSimilarity := s.calculateLayerSimilarity(sequences, layer)
		totalSimilarity += layerSimilarity
	}

	// Normalize by the size of both users' data
	user1Size := len(graph1.Nodes)
	user2Size := len(graph2.Nodes)
	if user1Size == 0 || user2Size == 0 {
		return 0, nil
	}

	return totalSimilarity / float64(user1Size*user2Size), nil
}

// findSimilarSequences finds similar sequences between two graphs at a specific layer
func (s *SimilarityService) findSimilarSequences(graph1, graph2 *models.HierarchicalGraph, layer int) ([]SimilarSequence, error) {
	var sequences []SimilarSequence

	// Get all nodes from both graphs at this layer
	nodes1 := s.getNodesAtLayer(graph1, layer)
	nodes2 := s.getNodesAtLayer(graph2, layer)

	// Find common nodes
	commonNodes := s.findCommonNodes(nodes1, nodes2)

	// For each common node, try to find sequences
	for _, node := range commonNodes {
		seq := s.findSequenceFromNode(node, graph1, graph2, layer)
		if seq.Length > 1 { // Only consider sequences of length > 1
			sequences = append(sequences, seq)
		}
	}

	return sequences, nil
}

// calculateLayerSimilarity calculates the similarity score for a specific layer
func (s *SimilarityService) calculateLayerSimilarity(sequences []SimilarSequence, layer int) float64 {
	var layerScore float64
	alpha := math.Pow(2, float64(layer-1)) // Layer-dependent weight

	for _, seq := range sequences {
		// Calculate sequence score
		sequenceScore := s.calculateSequenceScore(seq)
		layerScore += sequenceScore
	}

	return alpha * layerScore
}

// calculateSequenceScore calculates the score for a specific sequence
func (s *SimilarityService) calculateSequenceScore(seq SimilarSequence) float64 {
	// Calculate IDF for each node in the sequence
	var idfSum float64
	for _, nodeID := range seq.Nodes {
		idf := s.calculateIDF(nodeID)
		idfSum += idf
	}

	// Calculate time similarity
	timeSimilarity := s.calculateTimeSimilarity(seq.TimeDiffs)

	// Combine factors
	beta := math.Pow(2, float64(seq.Length-1)) // Length-dependent weight
	return beta * idfSum * timeSimilarity
}

// calculateIDF calculates the Inverse Document Frequency for a node
func (s *SimilarityService) calculateIDF(nodeID uint) float64 {
	var totalUsers int64
	var usersVisited int64

	s.db.Model(&models.User{}).Count(&totalUsers)
	s.db.Model(&models.GraphNode{}).Where("cluster_id = ?", nodeID).Count(&usersVisited)

	if usersVisited == 0 {
		return 0
	}

	return math.Log(float64(totalUsers) / float64(usersVisited))
}

// calculateTimeSimilarity calculates the similarity of time differences
func (s *SimilarityService) calculateTimeSimilarity(timeDiffs []time.Duration) float64 {
	if len(timeDiffs) == 0 {
		return 0
	}

	var similarity float64
	for i := 0; i < len(timeDiffs)-1; i++ {
		diff := math.Abs(float64(timeDiffs[i] - timeDiffs[i+1]))
		maxDiff := math.Max(float64(timeDiffs[i]), float64(timeDiffs[i+1]))
		if maxDiff > 0 {
			similarity += 1 - (diff / maxDiff)
		}
	}

	return similarity / float64(len(timeDiffs)-1)
}

// getNodesAtLayer returns all nodes at a specific layer
func (s *SimilarityService) getNodesAtLayer(graph *models.HierarchicalGraph, layer int) []models.GraphNode {
	var nodes []models.GraphNode
	for _, node := range graph.Nodes {
		// Assuming we can determine the layer from the cluster
		cluster := models.Cluster{}
		s.db.First(&cluster, node.ClusterID)
		if cluster.LayerID == uint(layer) {
			nodes = append(nodes, node)
		}
	}
	return nodes
}

// findCommonNodes finds nodes that exist in both graphs
func (s *SimilarityService) findCommonNodes(nodes1, nodes2 []models.GraphNode) []models.GraphNode {
	var common []models.GraphNode
	nodeMap := make(map[uint]bool)

	for _, node := range nodes1 {
		nodeMap[node.ClusterID] = true
	}

	for _, node := range nodes2 {
		if nodeMap[node.ClusterID] {
			common = append(common, node)
		}
	}

	return common
}

// findSequenceFromNode finds the longest similar sequence starting from a node
func (s *SimilarityService) findSequenceFromNode(node models.GraphNode, graph1, graph2 *models.HierarchicalGraph, layer int) SimilarSequence {
	// Implementation of sequence finding algorithm
	// This is a simplified version - you might want to implement a more sophisticated algorithm
	return SimilarSequence{
		Length:     1,
		Layer:      layer,
		Nodes:      []uint{node.ClusterID},
		TimeDiffs:  []time.Duration{},
		Similarity: 0,
	}
}
