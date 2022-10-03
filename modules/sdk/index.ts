export type IncomingSocketEvent = "JOIN" | "LEAVE";
export type OutgoingSocketEvent = "MESSAGE" | "SYSTEM_MESSAGE";

export interface User {
    id: string,
    socket: WebSocket,
    ipAddr: string,
    userAgent: string,
    username?: string,
    room?: string
};