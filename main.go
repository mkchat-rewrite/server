package main

import (
	"log"

	r "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"
)

func main() {
	router := r.New()

	router.GET("/", func(ctx *fasthttp.RequestCtx) {
		ctx.SetStatusCode(fasthttp.StatusOK)
		ctx.WriteString("Hello World!")
	})

	log.Fatal(fasthttp.ListenAndServe(":8080", router.Handler))
}
