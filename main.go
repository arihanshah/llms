package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/arihan/llms/internal/cache"
	"github.com/arihan/llms/internal/server"
)

func main() {
	port := flag.String("port", getEnv("PORT", "8080"), "server port")
	dbPath := flag.String("db", getEnv("DB_PATH", "llms.db"), "SQLite database path")
	staticDir := flag.String("static", getEnv("STATIC_DIR", "web/out"), "static files directory")
	cacheTTL := flag.Duration("cache-ttl", 1*time.Hour, "cache TTL")
	flag.Parse()

	c, err := cache.New(*dbPath, *cacheTTL)
	if err != nil {
		log.Fatalf("failed to open cache: %v", err)
	}
	defer c.Close()

	srv := server.New(c, *staticDir)
	log.Printf("llms.txt generator listening on :%s", *port)
	log.Fatal(http.ListenAndServe(":"+*port, srv))
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
