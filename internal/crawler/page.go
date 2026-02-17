package crawler

// Page holds metadata extracted from a single crawled page.
type Page struct {
	URL         string `json:"url"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Path        string `json:"path"`
	H1          string `json:"h1"`
	Depth       int    `json:"depth"`
	WordCount   int    `json:"word_count"`
	Body        string `json:"-"`
}
