package routes

import (
	"chat/common"
	"fmt"
	"net/http"
	"time"

	"github.com/ggicci/httpin"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
)

// USER_JOINED, USER_LEFT

type RoomEntry struct {
	ID         string    `json:"id" bson:"_id"`
	Name       string    `json:"name"`
	Public     bool      `json:"public" bson:"public"`
	Users      string    `json:"users"`
	Messages   string    `json:"messages"`
	LastActive time.Time `json:"lastActive"`
	CreatedAt  time.Time `json:"createdAt"`
}

type RoomEntryDTO struct {
	Name   string `in:"form=name;required"`
	Public bool   `in:"form=public;required"`
}

func Rooms(router chi.Router) {
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		rooms, err := common.FetchFromDBAll[RoomEntry]("rooms", bson.M{"public": true})
		if err != nil {
			common.WriteInternalServerError(w, err.Error())
			return
		}

		common.WriteJson(w, rooms)
	})

	router.With(httpin.NewInput(RoomEntryDTO{})).Put("/", func(w http.ResponseWriter, r *http.Request) {
		common.WriteError(w, http.StatusNotImplemented, "Creating new rooms is not yet supported.")
	})

	router.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		common.WriteNotFound(w, fmt.Sprintf("Room with id {%s} not found.", id))
	})
}
