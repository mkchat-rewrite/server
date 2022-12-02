import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.166.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v2.5.6/mod.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection, SocketHandler } from "./modules/websocket/index.ts";
import { requestHandler } from "./methods/requestHandler.ts";
import { oauthRouter } from "./routes/oauth.ts";

dotenv({ export: true });

const serv = new Hono();
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
                case "JOIN": {
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

serv.get("/", ctx => ctx.text("Iridescent development server online."));

serv.route("/", oauthRouter);

serve(async (req: Request) => {
    return await requestHandler(req, serv.fetch, wss);
}, { port: Number(Deno.env.get("PORT")) ?? 3000 });

// note: all incoming post bodies MUST be json format, form data will not be accepted