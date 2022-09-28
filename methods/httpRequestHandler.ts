import { handleSocket } from "../websocket/methods/handleSocket.ts";

export function httpRequestHandler(req: Request, wss) {
    if (req.headers.get("upgrade") !== "websocket") return new Response("Upgrade Required", { status: 426 });

    const { socket, response } = Deno.upgradeWebSocket(req);

    handleSocket(wss, socket);

    return response;
};