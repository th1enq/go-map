package services

import "github.com/th1enq/go-map/internal/db"

type RecommendServices struct {
	db *db.DB
}

func NewRecommendServices(db *db.DB) *RecommendServices {
	return &RecommendServices{db: db}
}
