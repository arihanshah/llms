package server

import (
	"io/fs"
	"net/http"
	"os"

	"github.com/arihan/llms/internal/cache"
	"github.com/arihan/llms/internal/crawler"
)

// Server is the HTTP server for the llms.txt generator API.
type Server struct {
	cache   *cache.Cache
	crawler *crawler.Crawler
	mux     *http.ServeMux
}

// New creates a Server with the given cache and optional static file directory.
// If staticDir is set, serves the frontend from that directory.
func New(c *cache.Cache, staticDir string) *Server {
	s := &Server{
		cache:   c,
		crawler: crawler.New(),
		mux:     http.NewServeMux(),
	}
	s.routes(staticDir)
	return s
}

func (s *Server) routes(staticDir string) {
	s.mux.HandleFunc("POST /api/generate", s.handleGenerate)
	s.mux.HandleFunc("GET /api/generate/stream", s.handleGenerateStream)
	s.mux.HandleFunc("GET /api/health", s.handleHealth)

	if staticDir != "" {
		if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
			s.mux.Handle("GET /", spaHandler(os.DirFS(staticDir)))
			return
		}
	}

	// Fallback placeholder when no frontend is built
	s.mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(`<!DOCTYPE html><html><body><h1>llms.txt Generator</h1><p>API is running. Build the frontend with: cd web && npm run build</p></body></html>`))
	})
}

// spaHandler serves static files, falling back to index.html for client-side routing.
func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file directly
		path := r.URL.Path
		if path == "/" {
			path = "index.html"
		} else {
			path = path[1:] // strip leading /
		}

		if _, err := fs.Stat(fsys, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routing
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}

// ServeHTTP implements http.Handler.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS for development
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	s.mux.ServeHTTP(w, r)
}
