import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection } from "./websocket/index.ts";
import { httpRequestHandler } from "./methods/httpRequestHandler.ts";
import { tryParseJson } from "./methods/tryParseJson.ts";

const wss = createSocketHandler({
    uniqueIdLength: 16,
    events: {
        open: (conn: Connection) => {
            console.log("open", conn);
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

serve((req: Request) => httpRequestHandler(wss, req), { port: 3000 });