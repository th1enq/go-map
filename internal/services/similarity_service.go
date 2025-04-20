package services

import (
	"log"
	"math"
	"time"

	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/models"
)

type SimilarityService struct {
	db *db.DB
	hf *HierarchicalFrameworkService
}

func NewSimilarityService(db *db.DB, hf *HierarchicalFrameworkService) *SimilarityService {
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

// UserData represents a user's hierarchical graph data
type UserData struct {
	UserID     uint
	Sequences  [][]models.GraphNode
	VisitCount map[uint]int
}

// ClusterSequence represents a sequence of clusters
type ClusterSequence struct {
	ClusterID uint
	CountP    int
	CountQ    int
	UserCount int
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

// CalculateSimilarityScore calculates the similarity score between two users
func (s *SimilarityService) CalculateSimilarityScore(userP, userQ uint, frameworkID uint) (float64, error) {
	// Get both users' graphs
	graphP, err := s.hf.GetUserGraph(userP, frameworkID)
	if err != nil {
		return 0, err
	}

	graphQ, err := s.hf.GetUserGraph(userQ, frameworkID)
	if err != nil {
		return 0, err
	}

	log.Println("get data successfull", userP, userQ)

	// Prepare user data
	userDataP := s.prepareUserData(graphP)
	userDataQ := s.prepareUserData(graphQ)

	// Find similar sequences at each layer
	similarSequences := make(map[int][][]ClusterSequence)
	layers := []int{1, 2, 3} // Assuming 3 layers

	for _, layer := range layers {
		sequences, err := s.findSimilarSequencesAtLayer(userDataP, userDataQ, layer)
		if err != nil {
			return 0, err
		}
		similarSequences[layer] = sequences
	}

	// Calculate similarity score
	score := s.calculateSS(userDataP, userDataQ, similarSequences, layers)

	return score, nil
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
	alpha := math.Pow(0.5, float64(layer-1)) // Layer-dependent weight

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

// prepareUserData prepares user data from a hierarchical graph
func (s *SimilarityService) prepareUserData(graph *models.HierarchicalGraph) UserData {
	// Group nodes by layer
	sequences := make([][]models.GraphNode, 0)
	visitCount := make(map[uint]int)

	// Sort nodes by first visit time
	nodes := graph.Nodes
	for i := 0; i < len(nodes)-1; i++ {
		for j := i + 1; j < len(nodes); j++ {
			if nodes[i].FirstVisitAt.After(nodes[j].FirstVisitAt) {
				nodes[i], nodes[j] = nodes[j], nodes[i]
			}
		}
	}

	// Create sequences based on temporal order
	currentSequence := make([]models.GraphNode, 0)
	for _, node := range nodes {
		if len(currentSequence) == 0 {
			currentSequence = append(currentSequence, node)
		} else {
			// Check if this node is part of the same sequence
			lastNode := currentSequence[len(currentSequence)-1]
			timeDiff := node.FirstVisitAt.Sub(lastNode.LastVisitAt)
			if timeDiff <= 24*time.Hour { // Consider as same sequence if within 24 hours
				currentSequence = append(currentSequence, node)
			} else {
				if len(currentSequence) > 1 {
					sequences = append(sequences, currentSequence)
				}
				currentSequence = []models.GraphNode{node}
			}
		}
		visitCount[node.ClusterID] = node.VisitCount
	}
	if len(currentSequence) > 1 {
		sequences = append(sequences, currentSequence)
	}

	return UserData{
		UserID:     graph.UserID,
		Sequences:  sequences,
		VisitCount: visitCount,
	}
}

// findSimilarSequencesAtLayer finds similar sequences between two users at a specific layer
func (s *SimilarityService) findSimilarSequencesAtLayer(userP, userQ UserData, layer int) ([][]ClusterSequence, error) {
	var similarSequences [][]ClusterSequence

	// For each sequence in userP
	for _, seqP := range userP.Sequences {
		// Find matching sequences in userQ
		for _, seqQ := range userQ.Sequences {
			if len(seqP) != len(seqQ) {
				continue
			}

			// Check if sequences are similar
			isSimilar := true
			clusterSeq := make([]ClusterSequence, len(seqP))
			for i := 0; i < len(seqP); i++ {
				if seqP[i].ClusterID != seqQ[i].ClusterID {
					isSimilar = false
					break
				}

				// Get user count for this cluster
				var userCount int64
				s.db.Model(&models.Cluster{}).
					Where("id = ?", seqP[i].ClusterID).
					Count(&userCount)

				if userCount == 0 {
					log.Fatal(userQ.UserID)
				}

				clusterSeq[i] = ClusterSequence{
					ClusterID: seqP[i].ClusterID,
					CountP:    userP.VisitCount[seqP[i].ClusterID],
					CountQ:    userQ.VisitCount[seqQ[i].ClusterID],
					UserCount: int(userCount),
				}
			}

			if isSimilar {
				similarSequences = append(similarSequences, clusterSeq)
			}
		}
	}

	return similarSequences, nil
}

// calculateSS calculates the similarity score between two users
func (s *SimilarityService) calculateSS(userP, userQ UserData, sseq map[int][][]ClusterSequence, L []int) float64 {
	totalSS := 0.0
	totalUsers, _ := s.getTotalUsers()

	for _, layer := range L {
		alpha := f(layer) // Layer weight
		ssLayer := 0.0

		for _, seq := range sseq[layer] {
			beta := fPrime(len(seq)) // Sequence length weight
			ssq := 0.0

			for _, cluster := range seq {
				idf := min(3.5, math.Log(float64(totalUsers)/float64(cluster.UserCount)))
				minCount := math.Min(float64(cluster.CountP), float64(cluster.CountQ))
				ssq += idf * minCount
			}

			ssLayer += beta * ssq
		}

		totalSS += alpha * ssLayer
	}

	// Normalize
	norm := float64(len(userP.Sequences) * len(userQ.Sequences))
	if norm == 0 {
		return 0
	}
	score := totalSS / norm
	return score / (1 + score)
}

// f calculates the weight for a layer
func f(layer int) float64 {
	// Higher layers get lower weights
	return 1.0 / float64(layer+1)
}

// fPrime calculates the weight for a sequence length
func fPrime(length int) float64 {
	// Longer sequences get higher weights
	beta := math.Log(float64(length) + 1)
	return beta
}

// getTotalUsers returns the total number of users in the system
func (s *SimilarityService) getTotalUsers() (int64, error) {
	var count int64
	if err := s.db.Model(&models.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
