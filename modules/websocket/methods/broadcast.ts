import { SocketHandler } from "../index.ts";

export function broadcast({ connections }: SocketHandler, data: any, channel?: string) {
    Array.from(connections.values()).forEach(conn => {
        if (channel && conn?.channel !== channel) return;
        conn.socket.send(data);
    });
};