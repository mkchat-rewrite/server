import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { createRouter, register } from "./http/index.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection } from "./websocket/index.ts";
import { httpRequestHandler } from "./methods/httpRequestHandler.ts";
import { tryParseJson } from "./methods/tryParseJson.ts";

const router = createRouter({

});

register({
    router,
    method: "get",
    route: "/",
    handler: (req: Request) => {
        return new Response("test");
    }
});

const wss = createSocketHandler({
    uniqueIdLength: 16,
    events: {
        open: (conn: Connection) => {
            console.log("open", conn);
            console.log("originating request:", conn.originRequest);
        },
        message: (conn: Connection, event: MessageEvent) => {
            const {
                type = null,
                data = null
            } = tryParseJson(event.data);

            switch(type) {
                case "broadcast": // test broadcasting data to all clients
                    broadcast(wss, JSON.stringify(data));
                    break;
                case "subscribe":
                    subscribe(wss, conn, "test");
                    break;
                case "publish":
                    try {
                        publish(wss, conn, "test");
                    } catch (err) {
                        console.error(err);
                    };
                    break;
            }
        },
        close: (conn: Connection, event: CloseEvent) => {
            console.log("close", conn, event);
        }
    }
});

serve((req: Request) => {
    console.log(req.url.split("/"));
    return httpRequestHandler(req, router, wss);
}, { port: 3000 });