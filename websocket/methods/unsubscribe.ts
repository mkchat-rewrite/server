import { Connection, SocketHandler } from "../index.ts";

export async function unsubscribe({ connections }: SocketHandler, { id, channel = null }: Connection) {
    if (!channel) throw new Error("Cannot unsubscribe because the connection is not subscribed to a channel.");

    const conn = connections.get(id);
    if (conn) connections.set(id, { ...conn, channel: null });
};