package common

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var db *mongo.Database

func GetDBCollection(col string) *mongo.Collection {
	return db.Collection(col)
}

func InitDB(uri string, database string) error {
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}

	db = client.Database(database)

	return nil
}

func CloseDB() error {
	return db.Client().Disconnect(context.Background())
}

func FetchFromDBAll[T interface{}](collection string, filter bson.M) ([]T, error) {
	col := GetDBCollection(collection)

	data := make([]T, 0)

	cursor, err := col.Find(context.Background(), filter)
	if err != nil {
		return data, err
	}

	if err = cursor.All(context.Background(), &data); err != nil {
		return data, err
	}

	return data, nil
}

func FetchFromDB[T interface{}](collection string, filter bson.M) (T, error) {
	col := GetDBCollection(collection)

	var data T
	if err := col.FindOne(context.Background(), filter).Decode(&data); err != nil {
		return data, err
	}

	return data, nil
}
