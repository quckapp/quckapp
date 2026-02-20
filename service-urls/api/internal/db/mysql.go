package db

import (
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

func Connect(dsn string) *sqlx.DB {
	var db *sqlx.DB
	var err error

	for i := 0; i < 30; i++ {
		db, err = sqlx.Connect("mysql", dsn)
		if err == nil {
			break
		}
		log.Printf("Waiting for MySQL... attempt %d/30: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatal(fmt.Errorf("failed to connect to MySQL after 30 attempts: %w", err))
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Connected to MySQL")
	return db
}
