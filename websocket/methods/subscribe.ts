import { Connection, SocketHandler } from "../index.ts";

export async function subscribe({ connections }: SocketHandler, { id }: Connection, channel: string) {
    connections.set(id, {  ...connections.get(id) as Connection, channel });
};