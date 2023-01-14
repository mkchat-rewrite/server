package models

import (
	"chat/common"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type RawUser struct {
	ID        string    `json:"id" bson:"_id"`
	Username  string    `json:"username" bson:"username"`
	Password  string    `json:"-" bson:"password"`
	Addresses []string  `json:"addresses" bson:"addresses"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
}

type User struct {
	ID        string    `json:"id" bson:"_id"`
	Username  string    `json:"username" bson:"username"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
}

type Users []User

func GetUser(id string) (User, error) {
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return User{}, err
	}

	user, err := common.FetchFromDB[User]("users", bson.M{"_id": objectId})
	if err != nil {
		return User{}, err
	}

	return user, nil
}
