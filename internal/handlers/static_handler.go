// Package handlers provides HTTP request handlers for the application
package handlers

import (
	"net/http"
	"os"
	"path/filepath"
)

// StaticHandler handles serving static frontend files
type StaticHandler struct {
	frontendPath string
}

// NewStaticHandler creates a new instance of StaticHandler
func NewStaticHandler(frontendPath string) *StaticHandler {
	return &StaticHandler{
		frontendPath: frontendPath,
	}
}

// ServeFrontend serves the frontend static files or the index.html for SPA routing
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
		// If the file doesn't exist, serve index.html for SPA routing
		http.ServeFile(w, r, filepath.Join(frontendPath, "index.html"))
		return
	}

	// Serve the requested file
	http.ServeFile(w, r, path)
}

// ServeStatic serves static files from a specific path
func (h *StaticHandler) ServeStatic(w http.ResponseWriter, r *http.Request) {
	// Check if the requested file exists
	path := filepath.Join(h.frontendPath, r.URL.Path)
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		// If the file doesn't exist, serve index.html for SPA routing
		http.ServeFile(w, r, filepath.Join(h.frontendPath, "index.html"))
		return
	}

	// Serve the requested file
	http.ServeFile(w, r, path)
}
