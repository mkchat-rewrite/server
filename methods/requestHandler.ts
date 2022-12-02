import { Hono } from "https://deno.land/x/hono@v2.5.6/mod.ts";
import { handleSocket, SocketHandler } from "../modules/websocket/index.ts";

export function requestHandler(req: Request, fetch: Hono["fetch"], wss: SocketHandler): Response | Promise<Response> {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        handleSocket(req, wss, socket);
        return response;
    } else {
        return fetch(req);
    };
};