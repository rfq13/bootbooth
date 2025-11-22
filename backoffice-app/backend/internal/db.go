package backend

import (
    "database/sql"
    _ "github.com/lib/pq"
    "os"
    "time"
)

func NewDB() (*sql.DB, error) {
    dsn := os.Getenv("DATABASE_URL")
    db, err := sql.Open("postgres", dsn)
    if err != nil { return nil, err }
    db.SetMaxOpenConns(1)
    db.SetMaxIdleConns(0)
    db.SetConnMaxLifetime(30 * time.Second)
    if err := db.Ping(); err != nil { return nil, err }
    return db, nil
}