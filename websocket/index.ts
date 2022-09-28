import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

export interface HandlerOptions {
    uniqueIdLength?: number,
    events: Partial<SocketEvents>
};

export interface SocketHandler {
    connections: Map<string, Connection>,
    uniqueIdLength: number,
    eventHandlers: Partial<SocketEvents>
};

export interface SocketEvents {
    open: (conn: Connection) => unknown;
    message: (conn: Connection, event: MessageEvent) => unknown;
    close: (conn: Connection, event: CloseEvent) => unknown;
};

export interface Connection {
    id: string,
    channel?: string | null,
    socket: WebSocket
};

export function createSocketHandler(opts: HandlerOptions): SocketHandler {
    const connections = new Map<string, Connection>();
    const { uniqueIdLength = 16 } = opts;
    const eventHandlers = opts.events;

    return {
        connections,
        uniqueIdLength,
        eventHandlers
    };
};

export { broadcast } from "./methods/broadcast.ts";
export { handleSocket } from "./methods/handleSocket.ts";
export { publish } from "./methods/publish.ts";
export { subscribe } from "./methods/subscribe.ts";
export { unsubscribe } from "./methods/unsubscribe.ts";