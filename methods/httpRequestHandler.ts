import { handleRoutes, HttpRouter } from "../http/index.ts";
import { handleSocket, SocketHandler } from "../websocket/index.ts";

export function httpRequestHandler(req: Request, router: HttpRouter, wss: SocketHandler) {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        handleSocket(req, wss, socket);
        return response;
    } else {
        return handleRoutes(router, req);
    };

    // return new Response("Upgrade Required", { status: 426 })
};