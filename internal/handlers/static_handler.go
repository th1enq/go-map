package handlers

import (
	"net/http"
	"os"
	"path/filepath"
)

func ServeFrontend(w http.ResponseWriter, r *http.Request) {
	// Get the absolute path to the frontend build directory
	wd, err := os.Getwd()
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Path to the frontend build directory
	frontendPath := filepath.Join(wd, "frontend", "go_map", "dist")

	// Check if the requested file exists
	path := filepath.Join(frontendPath, r.URL.Path)
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		// If the file doesn't exist, serve index.html
		http.ServeFile(w, r, filepath.Join(frontendPath, "index.html"))
		return
	}

	// Serve the requested file
	http.ServeFile(w, r, path)
}
