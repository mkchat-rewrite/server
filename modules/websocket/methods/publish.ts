import { Connection, SocketHandler } from "../index.ts";

export function publish({ connections }: SocketHandler, sender: Connection, data: any, channel: string) {
    Array.from(connections.values()).forEach(conn => {
        if (conn?.id === sender.id) return;
        if (conn?.channel === channel) conn.socket.send(data);
    });
};