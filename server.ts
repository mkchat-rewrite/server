import { dotenv } from "./deps.ts";
import { serve } from "https://deno.land/std@0.154.0/http/server.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts"

dotenv({ export: true });

const users = new Map();

function reqHandler(req: Request) {
    if (req.headers.get("upgrade") !== "websocket") return new Response(null, { status: 501 });

    const { socket: ws, response } = Deno.upgradeWebSocket(req);
    const id = nanoid(16);

    ws.onopen = () => {
        console.log(req.headers)

        const addrs = req.headers.get("x-forwarded-for");
        const ip = Array.isArray(addrs) ? addrs[0] : null;

        // if (!ip) return ws.close(0, "Missing IP address");

        users.set(id, { ip, ws });
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

                if (!(username && room)) ws.close(0, "Invalid join data.");

                users.set(id, { ...users.get(id), username, room, id });

                console.log(users);

                break;
            }
            case "message": {
                const { text = null } = data;
                console.log(text);
                break;
            }
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