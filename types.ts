export interface User {
    id: string,
    socket: WebSocket,
    ipAddr: string,
    userAgent: string,
    username?: string,
    room?: string
};

export interface ChatMessage {
    author: {
        id: string,
        username: string
    },
    content: string,
    attachments: string[]
};