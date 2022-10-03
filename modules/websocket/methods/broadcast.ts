import { SocketHandler } from "../index.ts";

export function broadcast({ connections }: SocketHandler, data: any, channel?: string) {
    const conns = connections.values();

    for (const conn of connections.values()) {
        if (!channel) {
            conn.socket.send(data);
        } else {
            if (conn?.channel === channel) conn.socket.send(data);
        };
    }
};