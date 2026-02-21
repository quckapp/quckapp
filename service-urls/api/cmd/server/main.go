package main

import (
	"log"

	"github.com/quckapp/service-urls-api/internal/api"
	"github.com/quckapp/service-urls-api/internal/config"
	"github.com/quckapp/service-urls-api/internal/db"
	"github.com/quckapp/service-urls-api/internal/repository"
)

func main() {
	cfg := config.Load()

	database := db.Connect(cfg.DSN())
	defer database.Close()

	repo := repository.New(database)
	handler := api.NewHandler(repo, cfg.JWTSecret)
	router := api.SetupRouter(handler, cfg.JWTSecret, repo)

	log.Printf("Service URLs API starting on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
