import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { createRouter, register } from "./modules/http/index.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection } from "./modules/websocket/index.ts";
import { httpRequestHandler } from "./methods/httpRequestHandler.ts";
import { tryParseJson } from "./methods/tryParseJson.ts";

dotenv({ export: true });

interface User {
    id: string,
    socket: WebSocket,
    ipAddr: string,
    userAgent: string,
    username?: string,
    room?: string
};

const users = new Map<string, User>();

const router = createRouter({});

// upload attachments
register({
    router,
    method: "post",
    route: "/rooms/:room/attachments",
    handler: async (req: Request) => {
        console.log(await req.blob());
        return new Response("test");
    }
});

// send message to room users
register({
    router,
    method: "post",
    route: "/rooms/:room/messages",
    handler: async (req: Request) => {
        const body = tryParseJson(await req.text());
        if (!Object.entries(body).length) return new Response("Malformed JSON body.", { status: 400 });

        const {
            userId = null,
            content = null
        } = body;

        if (!(userId && content)) return new Response("Missing required fields.", { status: 400 });

        console.log(userId, content);
        return new Response(null, { status: 204 });
    }
});

// respond with messages from room, preferrably have a "limit" param to specfy how many messages to return
register({
    router,
    method: "get",
    route: "/rooms/:room/messages",
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
            const ipAddr = Array.isArray(addrs) ? addrs[0] : "local"; // change "local" to null in prod
            const userAgent = req.headers.get("user-agent");

            if (!(ipAddr && userAgent)) return socket.close(1007, "Received invalid headers.");

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
            if (!user) return socket.close(1008, "Client connection is invalid.");

            switch(type) {
                case "join": {
                    const {
                        username = null,
                        room = null
                    } = data;
    
                    if (!(username && room)) return socket.close(1007, "Received invalid data.");

                    if (user?.room) unsubscribe(wss, conn);

                    subscribe(wss, conn, room);
                    users.set(id, { ...user, username, room });

                    break;
                }
                default:
                    break;
            }
        },
        close: (conn: Connection, event: CloseEvent) => {
            // console.log("close", conn, event);
        }
    }
});

serve(async (req: Request) => {
    return await httpRequestHandler(req, router, wss);
}, { port: 3000 });