import { Connection, SocketHandler } from "../index.ts";

export function publish({ connections }: SocketHandler, channel: string, data: any) {
    Array.from(connections.values()).forEach(conn => {
        if (conn?.channel === channel) conn.socket.send(data);
    });
};