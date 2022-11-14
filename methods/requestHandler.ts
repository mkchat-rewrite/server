import { handleSocket, SocketHandler } from "../modules/websocket/index.ts";

export function requestHandler(req: Request, fetch: any, wss: SocketHandler): Response {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        handleSocket(req, wss, socket);
        return response;
    } else {
        return fetch(req);
    };
};