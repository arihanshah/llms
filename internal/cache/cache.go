package cache

import (
	"database/sql"
	"time"

	_ "modernc.org/sqlite"
)

// Cache stores crawl results in SQLite with TTL-based expiration.
type Cache struct {
	db  *sql.DB
	ttl time.Duration
}

// New opens (or creates) a SQLite database at dbPath.
func New(dbPath string, ttl time.Duration) (*Cache, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA synchronous=NORMAL")

	c := &Cache{db: db, ttl: ttl}
	if err := c.migrate(); err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Cache) migrate() error {
	_, err := c.db.Exec(`
		CREATE TABLE IF NOT EXISTS crawl_cache (
			url        TEXT PRIMARY KEY,
			result     TEXT NOT NULL,
			pages_json TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}

// Get returns the cached result for url, or found=false if missing/expired.
func (c *Cache) Get(url string) (result string, found bool, err error) {
	var res string
	var createdAt time.Time
	err = c.db.QueryRow(
		"SELECT result, created_at FROM crawl_cache WHERE url = ?", url,
	).Scan(&res, &createdAt)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if time.Since(createdAt) > c.ttl {
		c.db.Exec("DELETE FROM crawl_cache WHERE url = ?", url)
		return "", false, nil
	}
	return res, true, nil
}

// Set stores a result in the cache, replacing any existing entry for url.
func (c *Cache) Set(url, result, pagesJSON string) error {
	_, err := c.db.Exec(
		`INSERT OR REPLACE INTO crawl_cache (url, result, pages_json) VALUES (?, ?, ?)`,
		url, result, pagesJSON,
	)
	return err
}

// Close closes the underlying database connection.
func (c *Cache) Close() error {
	return c.db.Close()
}
