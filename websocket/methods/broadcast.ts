import { SocketHandler } from "../index.ts";

export function broadcast({ connections }: SocketHandler, data: any) {
    for (const conn of connections.values()) {
        conn.socket.send(data);
    }
};