package routes

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type User struct {
	Id       string `json:"id"`
	Username string `json:"username"`
}

func Admin(router chi.Router) {
	users := make([]User, 0)

	users = append(users, User{
		Id:       "123",
		Username: "test",
	})

	router.Get("/users", func(w http.ResponseWriter, r *http.Request) {
		WriteJson(w, users)
	})

	router.Get("/bans", func(w http.ResponseWriter, r *http.Request) {

	})

	router.Put("/bans", func(w http.ResponseWriter, r *http.Request) {

	})

	router.Delete("/bans/{id}", func(w http.ResponseWriter, r *http.Request) {

	})
}

func WriteJson(w http.ResponseWriter, v any) (int, error) {
	data, err := json.Marshal(v)
	if err != nil {
		w.Write([]byte(err.Error()))
	}

	w.Header().Set("Content-Type", "application/json")

	return w.Write(data)
}
