package routes

import (
	"chat/common"
	"chat/models"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
)

func Users(router chi.Router) {
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		col := common.GetDBCollection("users")

		users := make(models.Users, 0)
		cursor, err := col.Find(r.Context(), bson.M{})
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		if err = cursor.All(r.Context(), &users); err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		data, err := json.Marshal(users)
		if err != nil {
			w.Write([]byte(err.Error()))
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	})
}
