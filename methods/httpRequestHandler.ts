import { handleRoutes, HttpRouter } from "../modules/http/index.ts";
import { handleSocket, SocketHandler } from "../modules/websocket/index.ts";

export async function httpRequestHandler(req: Request, router: HttpRouter, wss: SocketHandler): Promise<Response> {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        handleSocket(req, wss, socket);
        return response;
    } else {
        return await handleRoutes(req, router);
    };

    // return new Response("Upgrade Required", { status: 426 })
};