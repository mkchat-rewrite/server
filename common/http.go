package common

import (
	"encoding/json"
	"net/http"
)

type Error struct {
	ErrorMessage string `json:"errorMessage"`
}

func WriteError(w http.ResponseWriter, statusCode int, errStr string) (int, error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	return WriteJson(w, Error{ErrorMessage: errStr})
}

func WriteInternalServerError(w http.ResponseWriter, errStr string) (int, error) {
	return WriteError(w, http.StatusInternalServerError, errStr)
}

func WriteBadRequest(w http.ResponseWriter, errStr string) (int, error) {
	return WriteError(w, http.StatusBadRequest, errStr)
}

func WriteNotFound(w http.ResponseWriter, errStr string) (int, error) {
	return WriteError(w, http.StatusNotFound, errStr)
}

func WriteJson(w http.ResponseWriter, v any) (int, error) {
	data, err := json.Marshal(v)
	if err != nil {
		w.Write([]byte(err.Error())) // send a string here to prevent a potential recursive loop
	}

	w.Header().Set("Content-Type", "application/json")
	return w.Write(data)
}
