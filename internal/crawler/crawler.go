package crawler

import (
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly/v2"
)

// ProgressFunc is called each time a new page is crawled.
type ProgressFunc func(pagesFound int, currentURL string)

// Crawler traverses a website and extracts page metadata.
type Crawler struct {
	MaxDepth     int
	MaxPages     int
	Parallelism  int
	Delay        time.Duration
	ExcludePaths []string
}

// New returns a Crawler with sensible defaults.
func New() *Crawler {
	return &Crawler{
		MaxDepth:    3,
		MaxPages:    50,
		Parallelism: 2,
		Delay:       200 * time.Millisecond,
	}
}

// Crawl starts at targetURL and returns discovered pages.
// onProgress is called after each page is processed (may be nil).
func (cr *Crawler) Crawl(targetURL string, onProgress ProgressFunc) ([]Page, error) {
	parsed, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	var mu sync.Mutex
	var pages []Page
	done := false

	c := colly.NewCollector(
		colly.AllowedDomains(parsed.Host),
		colly.MaxDepth(cr.MaxDepth),
		colly.Async(true),
	)

	c.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: cr.Parallelism,
		Delay:       cr.Delay,
	})

	c.OnHTML("html", func(e *colly.HTMLElement) {
		mu.Lock()
		if done {
			mu.Unlock()
			return
		}
		mu.Unlock()

		if cr.isExcluded(e.Request.URL.String()) {
			return
		}

		page := Page{
			URL:   e.Request.URL.String(),
			Path:  e.Request.URL.Path,
			Depth: e.Request.Depth,
		}

		page.Title = e.ChildText("title")
		page.H1 = e.ChildText("h1")
		page.Description = e.ChildAttr(`meta[name="description"]`, "content")
		if page.Description == "" {
			page.Description = e.ChildAttr(`meta[property="og:description"]`, "content")
		}

		body := e.ChildText("main")
		if body == "" {
			body = e.ChildText("body")
		}
		page.WordCount = len(strings.Fields(body))
		page.Body = body

		mu.Lock()
		pages = append(pages, page)
		count := len(pages)
		if count >= cr.MaxPages {
			done = true
		}
		mu.Unlock()

		if onProgress != nil {
			onProgress(count, page.URL)
		}
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		mu.Lock()
		if done {
			mu.Unlock()
			return
		}
		mu.Unlock()

		link := e.Attr("href")
		absURL := e.Request.AbsoluteURL(link)
		if shouldFollow(absURL, parsed.Host) && !cr.isExcluded(absURL) {
			e.Request.Visit(absURL)
		}
	})

	c.Visit(targetURL)
	c.Wait()

	return pages, nil
}

// isExcluded returns true if the URL path starts with any excluded prefix.
func (cr *Crawler) isExcluded(absURL string) bool {
	if len(cr.ExcludePaths) == 0 {
		return false
	}
	u, err := url.Parse(absURL)
	if err != nil {
		return false
	}
	for _, prefix := range cr.ExcludePaths {
		if strings.HasPrefix(u.Path, prefix) {
			return true
		}
	}
	return false
}

func shouldFollow(absURL, allowedHost string) bool {
	u, err := url.Parse(absURL)
	if err != nil {
		return false
	}
	if u.Host != allowedHost {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	lower := strings.ToLower(u.Path)
	skip := []string{".pdf", ".jpg", ".jpeg", ".png", ".gif", ".css", ".js", ".svg", ".ico", ".xml", ".zip", ".mp4", ".mp3", ".woff", ".woff2", ".ttf"}
	for _, ext := range skip {
		if strings.HasSuffix(lower, ext) {
			return false
		}
	}
	return true
}
