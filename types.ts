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

export interface UserAccount {
    id: string, // unique id (immutable)
    email: string,
    username: string,
    password: string, // DO NOT STORE PASSWORD PLAINTEXT, THIS WILL BE SALTED HASH BECAUSE SECURITY!
    connectionAddresses: string[] // array of all ip addresses the user connects from
};