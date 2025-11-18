package main

import (
    "database/sql"
    _ "github.com/lib/pq"
    "flag"
    "fmt"
    "io/ioutil"
    "log"
    "os"
)

func main() {
    env := flag.String("env", os.Getenv("APP_ENV"), "environment: dev|staging|prod")
    dsn := flag.String("db", os.Getenv("DATABASE_URL"), "database url")
    dir := flag.String("dir", "backend/seeds", "seeds directory")
    flag.Parse()
    if *env == "" { *env = "dev" }
    if *dsn == "" { log.Fatal("DATABASE_URL is required (or pass -db)") }
    path := fmt.Sprintf("%s/%s.sql", *dir, *env)
    sqlBytes, err := ioutil.ReadFile(path)
    if err != nil { log.Fatal(err) }
    db, err := sql.Open("postgres", *dsn)
    if err != nil { log.Fatal(err) }
    defer db.Close()
    db.SetMaxOpenConns(1)
    db.SetMaxIdleConns(0)
    if _, err := db.Exec(string(sqlBytes)); err != nil { log.Fatal(err) }
}