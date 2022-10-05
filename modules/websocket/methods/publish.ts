import { Connection, SocketHandler } from "../index.ts";

export function publish({ connections }: SocketHandler, channel: string, data: any) {
    for (const conn of connections.values()) {
        if (conn?.channel === channel) conn.socket.send(data);
    }
};