import { createSocketHandler, ExtendedWebsocket } from "./index.ts";

function requestHandler(req: Request) {
    if (req.headers.get("upgrade") !== "websocket") return new Response("Upgrade Required", { status: 426 });

    const { socket, response } = Deno.upgradeWebSocket(req);

    const wss = createSocketHandler({
        socket,
        events: {
            open: (ws: ExtendedWebsocket) => {
                console.log("open", ws);
            },
            message: (ws: ExtendedWebsocket, event: MessageEvent) => {
                console.log("message", ws);
            },
            close: (ws: ExtendedWebsocket, event: CloseEvent) => {
                console.log("close", ws);
            }
        }
    });

    return response;
}

serve(requestHandler, { port: 3000 });