package server

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"

	"github.com/arihan/llms/internal/crawler"
	"github.com/arihan/llms/internal/generator"
)

type generateRequest struct {
	URL string `json:"url"`
}

type generateResponse struct {
	Result       string `json:"result"`
	Cached       bool   `json:"cached"`
	PagesCrawled int    `json:"pages_crawled"`
}

// handleGenerate is the synchronous POST endpoint.
func (s *Server) handleGenerate(w http.ResponseWriter, r *http.Request) {
	var req generateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	targetURL, err := validateURL(req.URL)
	if err != nil {
		http.Error(w, `{"error":"invalid URL"}`, http.StatusBadRequest)
		return
	}

	// Check cache
	if cached, found, _ := s.cache.Get(targetURL); found {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(generateResponse{
			Result: cached,
			Cached: true,
		})
		return
	}

	pages, err := s.crawler.Crawl(targetURL, nil)
	if err != nil {
		log.Printf("crawl error: %v", err)
		http.Error(w, `{"error":"failed to crawl site"}`, http.StatusInternalServerError)
		return
	}

	if len(pages) == 0 {
		http.Error(w, `{"error":"no pages found — site may be unreachable or blocking crawlers"}`, http.StatusUnprocessableEntity)
		return
	}

	root, sections := crawler.ClassifyPages(pages, targetURL)
	result := generator.Generate(root, sections)

	pagesJSON, _ := json.Marshal(pages)
	s.cache.Set(targetURL, result, string(pagesJSON))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(generateResponse{
		Result:       result,
		Cached:       false,
		PagesCrawled: len(pages),
	})
}

// handleGenerateStream is the SSE endpoint for real-time progress.
func (s *Server) handleGenerateStream(w http.ResponseWriter, r *http.Request) {
	targetURL, err := validateURL(r.URL.Query().Get("url"))
	if err != nil {
		http.Error(w, `{"error":"invalid URL"}`, http.StatusBadRequest)
		return
	}

	sse, err := NewSSEWriter(w)
	if err != nil {
		http.Error(w, `{"error":"streaming not supported"}`, http.StatusInternalServerError)
		return
	}

	// Check cache
	if cached, found, _ := s.cache.Get(targetURL); found {
		sse.Send("complete", map[string]any{
			"result":        cached,
			"cached":        true,
			"pages_crawled": 0,
		})
		return
	}

	pages, err := s.crawler.Crawl(targetURL, func(pagesFound int, currentURL string) {
		sse.Send("progress", map[string]any{
			"status":      "crawling",
			"pages_found": pagesFound,
			"current_url": currentURL,
		})
	})
	if err != nil {
		log.Printf("crawl error: %v", err)
		sse.Send("error", map[string]string{"message": "failed to crawl site"})
		return
	}

	if len(pages) == 0 {
		sse.Send("error", map[string]string{"message": "no pages found — site may be unreachable or blocking crawlers"})
		return
	}

	root, sections := crawler.ClassifyPages(pages, targetURL)
	result := generator.Generate(root, sections)

	pagesJSON, _ := json.Marshal(pages)
	s.cache.Set(targetURL, result, string(pagesJSON))

	sse.Send("complete", map[string]any{
		"result":        result,
		"cached":        false,
		"pages_crawled": len(pages),
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func validateURL(raw string) (string, error) {
	if raw == "" {
		return "", http.ErrMissingFile
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", &url.Error{Op: "parse", URL: raw, Err: nil}
	}
	if u.Host == "" {
		return "", &url.Error{Op: "parse", URL: raw, Err: nil}
	}
	return u.String(), nil
}
