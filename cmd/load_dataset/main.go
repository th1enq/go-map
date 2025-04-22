package main

import (
	"log"

	"github.com/th1enq/go-map/config"
	"github.com/th1enq/go-map/internal/db"
	"github.com/th1enq/go-map/internal/handlers"
	"github.com/th1enq/go-map/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := db.Load(cfg)
	if err != nil {
		log.Fatalf("failed to load database: %v", err)
	}

	trajectorySvc := services.NewTrajectoryServices(db)
	staypointSvc := services.NewStayPointServices(db)
	userSvc := services.NewUserServices(db)
	frameworkSvc := services.NewHierarchicalFrameworkService(db.DB)
	locationSvc := services.NewLocationServices(db.DB)

	dataLoadingHandler := handlers.NewLoadingDataHandler(trajectorySvc, staypointSvc, userSvc)
	frameworkHandler := handlers.NewHierarchicalFrameworkHandler(frameworkSvc, staypointSvc, locationSvc)
	userGraphHandler := handlers.NewUserGraphHandler(frameworkSvc, staypointSvc)

	dataLoadingHandler.LoadGeolifeData("dataset/Geolife Trajectories 1.3")
	frameworkHandler.BuildFramework()
	for i := 1; i <= 182; i++ {
		userGraphHandler.BuildUserGraph(uint(i))
	}
}
