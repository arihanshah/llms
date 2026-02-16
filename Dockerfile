# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Go binary
FROM golang:1.25-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /llms .

# Stage 3: Minimal runtime
FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=backend /llms /llms
COPY --from=frontend /app/web/out /static
EXPOSE 8080
ENV STATIC_DIR=/static
ENV DB_PATH=/data/llms.db
CMD ["/llms"]
