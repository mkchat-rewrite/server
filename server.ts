// todo: implement pub/sub

import { dotenv } from "./deps.ts";
import { serve } from "https://deno.land/std@0.154.0/http/server.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

dotenv({ export: true });

interface User {
    ws?: WebSocket,
    username?: string,
    room?: string,
    id?: string,
    ipAddr?: string,
    userAgent?: string
};

const users = new Map<string, User>();
const messages = new Map(); // store message history in memory for now, later use redis/deta for perm storage

function reqHandler(req: Request) {
    if (req.headers.get("upgrade") !== "websocket") return new Response("Upgrade Required", { status: 426 });
    // remove above line when http endpoints are introduced

    const { socket: ws, response } = Deno.upgradeWebSocket(req);
    const id = nanoid(16);

    ws.onopen = () => {
        console.log(req.headers);

        const addrs = req.headers.get("x-forwarded-for")?.split(",");
        const ipAddr = Array.isArray(addrs) ? addrs[0] : null;
        const userAgent = req.headers.get("user-agent");

        if (!(ipAddr && userAgent)) return ws.close(1007, "Received invalid headers.");

        users.set(id, { ipAddr, userAgent, ws });
    };

    ws.onmessage = (event: MessageEvent) => {
        const {
            type = null,
            data = null
        } = tryParseJson(event.data);

        switch(type) {
            case "join": {
                const {
                    username = null,
                    room = null
                } = data;

                if (!(username && room)) ws.close(1007, "Received invalid data.");

                users.set(id, { ...users.get(id), username, room, id });

                console.log(users);

                break;
            }
            case "message": {
                const { text = null } = data;
                console.log(text);
                break;
            }
            case "broadcast": {
                for (const user of users.values()) {
                    user?.ws?.send(data);
                };
            } // test broadcasting data to all clients
        }

        console.log(type, data);
    };

    ws.onclose = (event: CloseEvent) => {
        console.log(event);
    };

    return response;
}

serve(reqHandler, { port: Number(Deno.env.get("PORT")), hostname: Deno.env.get("HOST") });

function tryParseJson(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

// spec for close events: https://github.com/Luka967/websocket-close-codes