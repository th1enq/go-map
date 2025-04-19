package services

import (
	"gorm.io/gorm"
)

type ClusteringService struct {
	db *gorm.DB
}

func NewClusteringService(db *gorm.DB) *ClusteringService {
	return &ClusteringService{db: db}
}
