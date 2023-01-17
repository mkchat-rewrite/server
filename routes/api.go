package routes

import (
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func Api(router chi.Router) {
	router.Get("/motd", func(w http.ResponseWriter, r *http.Request) {
		w.Write(randomMotdByte())
	})
}

func randomMotdByte() []byte {
	data, err := os.ReadFile("./resources/motds.txt")
	if err != nil {
		panic(err)
	}

	var motds [][]byte
	index := 0

	for _, b := range data {
		if len(motds) == index {
			motds = append(motds, []byte{})
		}

		if b == 10 {
			index++
		} else {
			motds[index] = append(motds[index], b)
		}
	}

	rand.Seed(time.Now().UnixNano())
	min := 0
	max := len(motds)
	i := rand.Intn(max-min) + min

	return motds[i]
}

func randomMotdStr() string {
	data, err := os.ReadFile("./resources/motds.txt")
	if err != nil {
		panic(err)
	}

	motds := strings.Split(string(data), "\n")

	rand.Seed(time.Now().UnixNano())
	min := 0
	max := len(motds)
	i := rand.Intn(max-min) + min

	return motds[i]
}

// (average "randomMotd" and fmt.Println result exec time over 10 runs):
//     string manipulation: 88.8514µs
//     byte arrays: 76.1911µs
