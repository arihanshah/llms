.PHONY: dev-backend dev-frontend build test deploy clean

dev-backend:
	go run main.go -static web/out

dev-frontend:
	cd web && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev

build: build-frontend build-backend

build-frontend:
	cd web && npm run build

build-backend:
	CGO_ENABLED=0 go build -o bin/llms .

test:
	go test ./...

deploy:
	fly deploy

clean:
	rm -rf bin/ web/out web/.next
