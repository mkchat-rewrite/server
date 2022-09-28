import { Connection, SocketHandler } from "../index.ts";

export async function unsubscribe({ connections }: SocketHandler, { id, channel = null }: Connection) {
    if (!channel) {
        throw new Error("Cannot unsubscribe because the connection is not subscribed to a channel.");
    } else {
        const conn = connections.get(id);
        delete conn.channel;
        connections.set(id, conn);
    };
};