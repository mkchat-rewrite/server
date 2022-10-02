import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { createRouter, register } from "./http/index.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection } from "./websocket/index.ts";
import { httpRequestHandler } from "./methods/httpRequestHandler.ts";
import { tryParseJson } from "./methods/tryParseJson.ts";

dotenv({ export: true });

const users = new Map();

interface User {
    id: string,
    socket: WebSocket,
    ipAddr: string,
    userAgent: string,
    username?: string,
    room?: string
};

const router = createRouter({

});

register({
    router,
    method: "get",
    route: "/:id/test",
    handler: (req: Request) => {
        console.log(req);
        return new Response("test");
    }
});

const wss = createSocketHandler({
    uniqueIdLength: 16,
    events: {
        open: ({ id, socket, originRequest: req }: Connection) => {
            const addrs = req.headers.get("x-forwarded-for")?.split(",");
            const ipAddr = Array.isArray(addrs) ? addrs[0] : null;
            const userAgent = req.headers.get("user-agent");

            // if (!(ipAddr && userAgent)) return socket.close(1007, "Received invalid headers.");

            users.set(id, {
                id,
                socket,
                ipAddr,
                userAgent
            });
        },
        message: (conn: Connection, event: MessageEvent) => {
            const {
                type = null,
                data = null
            } = tryParseJson(event.data);

            const { id, socket } = conn;

            const user = users.get(id);
            if (!user) socket.close(1008, "Client connection is invalid.");

            switch(type) {
                case "join": {
                    const {
                        username = null,
                        room = null
                    } = data;
    
                    if (!(username && room)) socket.close(1008, "Client provided invalid data.");

                    if (user.room) unsubscribe(wss, conn);

                    subscribe(wss, conn, room);
                    users.set(id, { ...users.get(id), username, room });
                    break;
                }
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
            // console.log("close", conn, event);
        }
    }
});

serve((req: Request) => {
    return httpRequestHandler(req, router, wss);
}, { port: 3000 });