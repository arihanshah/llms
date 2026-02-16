# llms.txt Generator

A web application that generates [llms.txt](https://llmstxt.org) files for any website. Enter a URL, and the tool crawls the site to produce a spec-compliant `llms.txt` file with real-time progress streaming.

## Quick Start

### Prerequisites
- Go 1.22+
- Node.js 20+

### Development

Run the Go backend and Next.js frontend in separate terminals:

```bash
# Terminal 1: Go API server on :8080
make dev-backend

# Terminal 2: Next.js dev server on :3000
make dev-frontend
```

Open http://localhost:3000.

### Production Build

```bash
make build
./bin/llms
```

Open http://localhost:8080.

## How It Works

1. User enters a website URL
2. The Go backend crawls the site using [colly](https://github.com/gocolly/colly) (max 3 levels deep, max 50 pages)
3. Pages are classified into sections by URL path structure
4. A spec-compliant `llms.txt` is generated
5. Results are cached in SQLite for 1 hour

Progress is streamed to the browser via Server-Sent Events (SSE).

## API

### `POST /api/generate`
Synchronous generation. Returns the full result as JSON.

```bash
curl -X POST http://localhost:8080/api/generate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://llmstxt.org"}'
```

### `GET /api/generate/stream?url=<url>`
SSE endpoint with real-time crawl progress.

```bash
curl -N "http://localhost:8080/api/generate/stream?url=https://llmstxt.org"
```

Events: `progress` (pages found), `complete` (final result), `error`.

## Deployment

### Fly.io

```bash
fly launch
fly volumes create data --size 1 --region iad
fly deploy
```

### Docker

```bash
docker build -t llms .
docker run -p 8080:8080 -v llms-data:/data llms
```

## Project Structure

```
├── main.go                 # Entry point
├── internal/
│   ├── crawler/            # colly-based web crawler + page classifier
│   ├── generator/          # llms.txt output builder
│   ├── cache/              # SQLite cache with TTL
│   └── server/             # HTTP handlers + SSE streaming
├── web/                    # Next.js frontend (static export)
├── Dockerfile              # Multi-stage build
├── fly.toml                # Fly.io config
└── ARCHITECTURE.md         # Design decisions and tradeoffs
```

## Tech Stack

- **Backend**: Go, [colly](https://github.com/gocolly/colly), [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite)
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Deploy**: Fly.io (single container)
