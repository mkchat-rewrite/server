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
        users.set(id, {});
        console.log(id);
    };

    ws.onmessage = (event: MessageEvent) => {
        const { type=null, data=null } = tryParseJson(event.data);
        console.log(type, data);
    };

    ws.onclose = (event: CloseEvent) => {
        console.log(event);
    };

    return response;
}

serve(reqHandler, { port: Number(Deno.env.get("PORT")) });

function tryParseJson(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}