package crawler

import (
	"sort"
	"strings"
	"unicode"
)

// Section groups related pages under a named heading.
type Section struct {
	Name     string
	Pages    []Page
	Optional bool
}

// ClassifyPages groups pages into logical sections for llms.txt output.
// Uses the first URL path segment as the grouping key.
func ClassifyPages(pages []Page, rootURL string) (Page, []Section) {
	var rootPage Page
	groups := map[string][]Page{}
	var topLevel []Page

	for _, p := range pages {
		if p.URL == rootURL || p.Path == "/" || p.Path == "" {
			rootPage = p
			continue
		}

		parts := strings.Split(strings.Trim(p.Path, "/"), "/")
		if len(parts) <= 1 {
			topLevel = append(topLevel, p)
		} else {
			key := titleCase(parts[0])
			groups[key] = append(groups[key], p)
		}
	}

	var sections []Section

	if len(topLevel) > 0 {
		sections = append(sections, Section{Name: "Main", Pages: topLevel})
	}

	// Sort groups by size descending — larger sections are more important.
	type kv struct {
		key   string
		pages []Page
	}
	var sorted []kv
	for k, v := range groups {
		sorted = append(sorted, kv{k, v})
	}
	sort.Slice(sorted, func(i, j int) bool {
		return len(sorted[i].pages) > len(sorted[j].pages)
	})

	for _, s := range sorted {
		optional := len(s.pages) <= 1
		sections = append(sections, Section{
			Name:     s.key,
			Pages:    s.pages,
			Optional: optional,
		})
	}

	// Move optional sections to the end and merge them.
	var opt []Page
	var result []Section
	for _, s := range sections {
		if s.Optional {
			opt = append(opt, s.Pages...)
		} else {
			result = append(result, s)
		}
	}
	if len(opt) > 0 {
		result = append(result, Section{Name: "Optional", Pages: opt, Optional: true})
	}

	return rootPage, result
}

func titleCase(s string) string {
	if s == "" {
		return s
	}
	runes := []rune(s)
	runes[0] = unicode.ToUpper(runes[0])
	// Replace hyphens/underscores with spaces
	out := strings.NewReplacer("-", " ", "_", " ").Replace(string(runes))
	words := strings.Fields(out)
	for i, w := range words {
		r := []rune(w)
		r[0] = unicode.ToUpper(r[0])
		words[i] = string(r)
	}
	return strings.Join(words, " ")
}
