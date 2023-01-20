package main

import (
	"chat/common"
	"chat/services/admin"
	"chat/services/motd"
	"chat/services/rooms"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	if err := common.LoadEnv(); err != nil {
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

	router.Route("/api", func(r chi.Router) {
		r.Route("/_admin", admin.Router)
		r.Route("/motd", motd.Router)
		r.Route("/rooms", rooms.Router)
	})

	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatal(err)
	}
}

// https://ggicci.github.io/httpin/integrations/gochi
