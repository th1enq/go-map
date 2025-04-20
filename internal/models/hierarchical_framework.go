package models

import (
	"time"
)

// HierarchicalFramework represents the top-level framework
type HierarchicalFramework struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Layers    []Layer   `json:"layers" gorm:"foreignKey:FrameworkID"`
}

// Layer represents a level in the hierarchical framework
type Layer struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	FrameworkID uint      `json:"framework_id" gorm:"index"`
	Level       int       `json:"level"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Clusters    []Cluster `json:"clusters" gorm:"foreignKey:LayerID"`
}

// Cluster represents a group of stay points
type Cluster struct {
	ID          uint        `json:"id"`
	FrameworkID uint        `json:"framework_id"`
	LayerID     uint        `json:"layer_id"`
	CenterLat   float64     `json:"center_lat"`
	CenterLng   float64     `json:"center_lng"`
	Radius      float64     `json:"radius"` // in meters
	VisitCount  int         `json:"visit_count"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	StayPoints  []StayPoint `json:"stay_points"`
}

// HierarchicalGraph represents a user's personal graph in the framework
type HierarchicalGraph struct {
	ID          uint        `json:"id"`
	UserID      uint        `json:"user_id"`
	FrameworkID uint        `json:"framework_id"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
	Nodes       []GraphNode `json:"nodes" gorm:"foreignKey:GraphID;references:ID"`
	Edges       []GraphEdge `json:"edges" gorm:"foreignKey:GraphID;references:ID"`
}

type GraphNode struct {
	ID           uint      `json:"id"`
	GraphID      uint      `json:"graph_id" gorm:"index"`
	ClusterID    uint      `json:"cluster_id"`
	VisitCount   int       `json:"visit_count"`
	FirstVisitAt time.Time `json:"first_visit_at"`
	LastVisitAt  time.Time `json:"last_visit_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// GraphEdge represents an edge between nodes in a user's hierarchical graph
type GraphEdge struct {
	ID             uint      `json:"id"`
	GraphID        uint      `json:"graph_id"`
	FromNodeID     uint      `json:"from_node_id"`
	ToNodeID       uint      `json:"to_node_id"`
	TransitionTime int       `json:"transition_time"` // in seconds
	VisitCount     int       `json:"visit_count"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
