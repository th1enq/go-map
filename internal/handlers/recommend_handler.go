package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/th1enq/go-map/internal/services"
)

type RecommendHandler struct {
	recommendServices *services.RecommendServices
}

func NewRecommendHandler(r *services.RecommendServices) *RecommendHandler {
	return &RecommendHandler{recommendServices: r}
}

func (r *RecommendHandler) RecommendByHotStayPoint(c *gin.Context) {

}

func (r *RecommendHandler) RecommendBySameTracjectory(c *gin.Context) {
	
}
