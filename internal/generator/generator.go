package generator

import (
	"fmt"
	"strings"

	"github.com/arihan/llms/internal/crawler"
)

// Generate produces a spec-compliant llms.txt string from crawled data.
func Generate(root crawler.Page, sections []crawler.Section) string {
	var b strings.Builder

	// H1: site title (required by spec)
	title := root.H1
	if title == "" {
		title = root.Title
	}
	if title == "" {
		title = root.URL
	}
	fmt.Fprintf(&b, "# %s\n", title)

	// Blockquote: description
	if root.Description != "" {
		fmt.Fprintf(&b, "\n> %s\n", root.Description)
	}

	// Sections with link lists
	for _, section := range sections {
		fmt.Fprintf(&b, "\n## %s\n\n", section.Name)
		for _, page := range section.Pages {
			name := linkName(page)
			if page.Description != "" {
				fmt.Fprintf(&b, "- [%s](%s): %s\n", name, page.URL, page.Description)
			} else {
				fmt.Fprintf(&b, "- [%s](%s)\n", name, page.URL)
			}
		}
	}

	return b.String()
}

// GenerateFull produces an llms-full.txt string with full page content as markdown sections.
func GenerateFull(root crawler.Page, sections []crawler.Section) string {
	var b strings.Builder

	title := root.H1
	if title == "" {
		title = root.Title
	}
	if title == "" {
		title = root.URL
	}
	fmt.Fprintf(&b, "# %s\n", title)

	if root.Description != "" {
		fmt.Fprintf(&b, "\n> %s\n", root.Description)
	}

	for _, section := range sections {
		fmt.Fprintf(&b, "\n## %s\n", section.Name)
		for _, page := range section.Pages {
			name := linkName(page)
			fmt.Fprintf(&b, "\n### %s\n\n", name)
			fmt.Fprintf(&b, "URL: %s\n\n", page.URL)
			if page.Body != "" {
				fmt.Fprintf(&b, "%s\n", page.Body)
			} else if page.Description != "" {
				fmt.Fprintf(&b, "%s\n", page.Description)
			}
		}
	}

	return b.String()
}

func linkName(p crawler.Page) string {
	if p.Title != "" {
		return p.Title
	}
	if p.H1 != "" {
		return p.H1
	}
	return p.Path
}
