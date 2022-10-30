import { nanoid } from "../../../deps.ts";
import { SocketHandler, Connection } from "../index.ts";

export function handleSocket(req: Request, { connections, eventHandlers, uniqueIdLength }: SocketHandler, socket: WebSocket) {
    const id = nanoid(uniqueIdLength);
    const connection = { id, socket, originRequest: req };

    socket.onopen = async () => {
        connections.set(id, connection);
        return await eventHandlers?.open?.(connection);
    };

    socket.onmessage = async (event: MessageEvent) => await eventHandlers?.message?.(connections.get(id) as Connection, event);

    socket.onclose = async (event: CloseEvent) => {
        connections.delete(id);
        return await eventHandlers?.close?.(connection, event);
    };
};