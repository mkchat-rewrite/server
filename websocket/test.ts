import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { createSocketHandler, broadcast, handleSocket, publish, subscribe, Connection } from "./index.ts";

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

function requestHandler(req: Request) {
    if (req.headers.get("upgrade") !== "websocket") return new Response("Upgrade Required", { status: 426 });

    const { socket, response } = Deno.upgradeWebSocket(req);

    handleSocket(wss, socket);

    return response;
}

serve(requestHandler, { port: 3000 });

function tryParseJson(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}