# Architecture

## Overview

A web application that generates spec-compliant [llms.txt](https://llmstxt.org) files by crawling websites. Users enter a URL, the backend crawls the site, extracts metadata, classifies pages into sections, and outputs a formatted `llms.txt` file.

```
┌──────────────────┐     SSE stream      ┌──────────────────────────────┐
│   Next.js SPA    │ ──────────────────→  │         Go Server            │
│   (static HTML)  │ ←────────────────── │                              │
│                  │    progress events   │  ┌──────────┐ ┌───────────┐ │
│  - URL input     │    + final result    │  │ Crawler  │ │ Generator │ │
│  - Progress bar  │                      │  │ (colly)  │ │           │ │
│  - Result view   │                      │  └──────────┘ └───────────┘ │
│  - Copy/Download │                      │  ┌──────────┐               │
└──────────────────┘                      │  │  Cache   │               │
                                          │  │ (SQLite) │               │
                                          │  └──────────┘               │
                                          └──────────────────────────────┘
```

## Request Flow

1. User enters a URL in the frontend
2. Frontend opens an `EventSource` to `GET /api/generate/stream?url=...`
3. Server checks SQLite cache — if hit, returns immediately
4. On cache miss, colly crawler traverses the site (max depth 3, max 50 pages)
5. Each page discovery fires an SSE `progress` event to the frontend
6. After crawling, pages are classified by URL path structure into sections
7. Generator builds the llms.txt string from the classified sections
8. Result is cached in SQLite and sent as SSE `complete` event

## Package Design

### `internal/crawler/`
- **crawler.go** — colly-based crawler with configurable depth/page limits
- **page.go** — `Page` struct: URL, title, description, H1, path, depth, word count
- **classifier.go** — Groups pages into sections by first URL path segment

### `internal/generator/`
- **generator.go** — Builds spec-compliant llms.txt from root page + sections

### `internal/cache/`
- **cache.go** — SQLite cache with TTL-based expiration (1 hour default)

### `internal/server/`
- **server.go** — HTTP router (stdlib `ServeMux`), static file serving
- **handlers.go** — `POST /api/generate` (sync) and `GET /api/generate/stream` (SSE)
- **sse.go** — SSE writer helper

## Key Design Decisions

### Why Go + colly for crawling?
Colly handles concurrency, URL deduplication, rate limiting, and robots.txt compliance out of the box. Go compiles to a single binary with no runtime dependencies. Colly doesn't execute JavaScript, but most sites worth generating llms.txt for (docs, blogs, marketing) have server-rendered content.

### Why SSE instead of WebSockets?
SSE is unidirectional (server→client), which matches our use case exactly. It uses standard HTTP, works through proxies without special configuration, and the browser's `EventSource` API handles reconnection. WebSockets would add complexity for no benefit.

### Why SQLite instead of Redis or Postgres?
Single-instance deployment means no external database service needed. The `modernc.org/sqlite` driver is pure Go (no CGO), keeping the build simple. Trade-off: doesn't scale horizontally, but that's fine for this scope.

### Why static export for Next.js?
The frontend is a single interactive page with no SEO requirements. `output: 'export'` produces pure HTML+JS+CSS that the Go binary serves directly. No Node.js process needed in production.

### Why URL-path-based page classification?
URL paths encode information architecture — `/docs/*`, `/blog/*`, `/about` are near-universal patterns. This heuristic is fast, deterministic, and debuggable. An ML approach would add complexity and unpredictability for marginal improvement.

### Crawler limits: MaxDepth 3, MaxPages 50
Deep enough to find important pages (home → section → detail), shallow enough to complete in seconds. llms.txt is an overview, not an exhaustive site index. These are the most impactful tuning parameters.

### Pure Go SQLite (modernc.org/sqlite)
Chose over `mattn/go-sqlite3` (CGO) to keep builds simple. Cross-compilation works, minimal Docker images work, no C toolchain needed. Slightly slower but vastly simpler operationally.

## What I'd Do Differently at Scale

- **Postgres** for multi-instance cache coordination
- **Job queue** (Redis + workers) for long crawls instead of holding HTTP connections
- **Rate limiting** per IP to prevent abuse
- **Headless browser fallback** (`chromedp`) for JavaScript-heavy sites
- **LLM-enhanced descriptions** — use an LLM to summarize page content for better link descriptions
