package main

import (
    "flag"
    "fmt"
    "log"
    "os"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
)

func main() {
    dir := flag.String("dir", "backend/migrations", "migrations directory")
    dsn := flag.String("db", os.Getenv("DATABASE_URL"), "database url")
    up := flag.Bool("up", false, "apply all up migrations")
    down := flag.Bool("down", false, "rollback one migration")
    forceVersion := flag.Int("force", -1, "force version")
    flag.Parse()

    if *dsn == "" { log.Fatal("DATABASE_URL is required (or pass -db)") }
    src := fmt.Sprintf("file://%s", *dir)
    m, err := migrate.New(src, *dsn)
    if err != nil { log.Fatal(err) }
    if *forceVersion >= 0 { if err := m.Force(*forceVersion); err != nil { log.Fatal(err) } }
    if *up { if err := m.Up(); err != nil && err != migrate.ErrNoChange { log.Fatal(err) } }
    if *down { if err := m.Steps(-1); err != nil { log.Fatal(err) } }
}