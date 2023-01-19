package routes

import (
	"chat/common"
	"chat/common/users"
	"fmt"
	"net/http"
	"time"

	"github.com/ggicci/httpin"
	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type BanEntry struct {
	ID        string    `json:"id" bson:"_id"`
	IpAddress string    `json:"ipAddress"`
	Username  string    `json:"username"`
	Reason    string    `json:"reason"`
	Length    int       `json:"length"` // in seconds
	CreatedAt time.Time `json:"createdAt"`
}

type BanEntryDTO struct {
	IpAddress string `in:"form=ipAddress;required"`
	Username  string `in:"form=username;required"`
	Reason    string `in:"form=reason;required"`
	Length    int    `in:"form=length;required"` // in seconds
}

func Admin(router chi.Router) {
	userList := users.List()

	users.Add(users.User{
		Id:       "123",
		IpAddress: "127.0.0.1",
		Username: "admin",
		Room: "testing",
	})

	router.Get("/users", func(w http.ResponseWriter, r *http.Request) {
		common.WriteJson(w, &userList)
	})

	router.Get("/bans", func(w http.ResponseWriter, r *http.Request) {
		bans, err := common.FetchFromDBAll[BanEntry]("bans", bson.M{})
		if err != nil {
			common.WriteInternalServerError(w, err.Error())
			return
		}

		common.WriteJson(w, bans)
	})

	router.With(httpin.NewInput(BanEntryDTO{})).Put("/bans", func(w http.ResponseWriter, r *http.Request) {
		input := r.Context().Value(httpin.Input).(*BanEntryDTO)

		col := common.GetDBCollection("bans")

		ban := BanEntry{
			ID:        primitive.NewObjectID().Hex(),
			IpAddress: input.IpAddress,
			Username:  input.Username,
			Reason:    input.Reason,
			Length:    input.Length,
			CreatedAt: time.Now(),
		}

		_, err := col.InsertOne(r.Context(), ban)
		if err != nil {
			common.WriteInternalServerError(w, err.Error())
			return
		}

		common.WriteJson(w, ban)
	})

	router.Delete("/bans/{id}", func(w http.ResponseWriter, r *http.Request) {
		col := common.GetDBCollection("bans")

		id := chi.URLParam(r, "id")
		res, err := col.DeleteOne(r.Context(), bson.M{"_id": id})
		if err != nil {
			common.WriteInternalServerError(w, err.Error())
			return
		}

		if res.DeletedCount == 0 {
			common.WriteNotFound(w, fmt.Sprintf("Ban with id {%s} not found.", id))
			return
		}

		w.WriteHeader(http.StatusNoContent)
	})
}
