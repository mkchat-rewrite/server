export interface ExtendedWebsocket extends WebSocket {
    id: string,
    channel: string
};

type Subscriptions = Map<string, ExtendedWebsocket>;

interface SocketEvents {
    open: (ws: ExtendedWebsocket) => unknown;
    message: (ws: ExtendedWebsocket) => unknown;
    close: (ws: ExtendedWebsocket) => unknown;
};

interface HandlerOptions {
    socket: WebSocket,
    events?: Partial<SocketEvents>
};

export function createSocketHandler(opts: HandlerOptions): ExtendedWebsocket {
    const subscriptions: Subscriptions = new Map();

};

export function subscribe(socket: ExtendedWebsocket, channel: string) {

};

export function publish(socket: ExtendedWebsocket) {

};

export function broadcast(data) {

};

// export async function createSubscription(socket: ExtendedWebSocket, channel: string) {
//     return {
//         publish(data: any) {
//             socket.send()
//         }
//     }
// };