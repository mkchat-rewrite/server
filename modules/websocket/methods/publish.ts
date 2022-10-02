import { Connection, SocketHandler } from "../index.ts";

export function publish({ connections }: SocketHandler, { channel = null }: Connection, data: any) {
    if (!channel) {
        throw new Error("Cannot publish because the connection is not subscribed to a channel.");
    } else {
        for (const conn of connections.values()) {
            if (conn.channel === channel) conn.socket.send(data);
        }
    };
};