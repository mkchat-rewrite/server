package routes

import (
	"embed"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

//go:embed resources
var resources embed.FS

func Motd(router chi.Router) {
	router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write(randomMotdByte())
	})
}

func randomMotdByte() []byte {
	data, err := resources.ReadFile("resources/motds.txt")
	if err != nil {
		panic(err)
	}

	motds := splitBytes(data, 10) // 10 == "\n"

	rand.Seed(time.Now().UnixNano())
	min := 0
	max := len(motds)
	i := rand.Intn(max-min) + min

	return motds[i]
}

func splitBytes(a []byte, sep byte) [][]byte {
	var res [][]byte
	index := 0

	for _, b := range a {
		if len(res) == index {
			res = append(res, []byte{})
		}

		if b == sep {
			index++
		} else {
			res[index] = append(res[index], b)
		}
	}

	return res
}

// func randomMotdStr() string {
// 	data, err := os.ReadFile("./resources/motds.txt")
// 	if err != nil {
// 		panic(err)
// 	}

// 	motds := strings.Split(string(data), "\n")

// 	rand.Seed(time.Now().UnixNano())
// 	min := 0
// 	max := len(motds)
// 	i := rand.Intn(max-min) + min

// 	return motds[i]
// }

// (average "randomMotd" and fmt.Println result exec time over 10 runs):
//     string manipulation: 88.8514µs
//     byte arrays: 76.1911µs
