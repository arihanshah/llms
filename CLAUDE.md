# llms — llms.txt Generator

## Project Overview
Web application that generates spec-compliant `llms.txt` files by crawling websites.
Go backend (colly crawler + SQLite cache) with Next.js frontend (static export embedded in Go binary).

## Development

```bash
# Backend (Go on :8080)
make dev-backend

# Frontend (Next.js on :3000, proxies /api/* to :8080)
make dev-frontend

# Full build (static binary with embedded frontend)
make build

# Run tests
go test ./...

# Deploy
fly deploy
```

## Architecture
- `internal/crawler/` — colly-based web crawler, page classification
- `internal/generator/` — llms.txt output builder
- `internal/cache/` — SQLite cache layer
- `internal/server/` — HTTP handlers, SSE streaming, static file serving
- `web/` — Next.js frontend (static export)

## Key Conventions
- Go 1.22+ enhanced mux patterns (`"POST /api/generate"`)
- No external router — stdlib `net/http` only
- Pure Go SQLite (`modernc.org/sqlite`) — no CGO
- Frontend embedded via `embed.FS` in production
- All packages in `internal/` — not importable externally
