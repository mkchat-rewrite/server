package main

import (
	"chat/common"
	"chat/routes"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
)

func main() {
	if err := loadEnv(); err != nil {
		log.Fatal("Unable to load local .env file.")
	}

	if err := common.InitDB(os.Getenv("MONGO_URI"), "chat"); err != nil {
		log.Fatal(err)
	}

	defer common.CloseDB()

	router := chi.NewRouter()

	router.Use(middleware.Logger)

	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	router.Route("/api/users", routes.Users)

	http.ListenAndServe(":8080", router)
}

// https://ggicci.github.io/httpin/integrations/gochi

// only load .env if not in production environment
func loadEnv() error {
	_, isProd := os.LookupEnv("PROD")

	if !isProd {
		err := godotenv.Load(".env")
		if err != nil {
			return err
		}
	}

	return nil
}
