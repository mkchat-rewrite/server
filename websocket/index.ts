// TODO: move the handleSocket method to it's own file and export it instead of returning from main method

import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

export interface Connection {
    id: string,
    channel?: string | null,
    socket: WebSocket
};

export interface SocketHandler {
    connections: Map<string, Connection>,
    handleSocket: (socket: WebSocket) => void
};

interface SocketEvents {
    open: (conn: Connection) => unknown;
    message: (conn: Connection, event: MessageEvent) => unknown;
    close: (conn: Connection, event: CloseEvent) => unknown;
};

interface HandlerOptions {
    uniqueIdLength?: number,
    events: Partial<SocketEvents>
};

export function createSocketHandler(opts: HandlerOptions): SocketHandler {
    const connections = new Map<string, Connection>();

    const handleSocket = (socket: WebSocket) => {
        const id = nanoid(opts.uniqueIdLength ?? 16);
        const connection = { id, socket };

        socket.onopen = async () => {
            connections.set(id, connection);
            return await opts.events?.open?.(connection);
        };

        socket.onmessage = async (event: MessageEvent) => await opts.events?.message?.(connections.get(id) as Connection, event);

        socket.onclose = async (event: CloseEvent) => {
            connections.delete(id);
            return await opts.events?.close?.(connection, event);
        };
    };

    return {
        connections,
        handleSocket
    };
};

export { broadcast } from "./methods/broadcast.ts";
export { publish } from "./methods/publish.ts";
export { subscribe } from "./methods/subscribe.ts";