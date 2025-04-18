package handlers

import "github.com/th1enq/go-map/internal/services"

type RecommendHandler struct {
	recommendServices *services.RecommendServices
}

func NewRecommendServices(r *services.RecommendServices) *RecommendHandler {
	return &RecommendHandler{recommendServices: r}
}
