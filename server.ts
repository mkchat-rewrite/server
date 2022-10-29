import { config as dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { serve } from "https://deno.land/std@0.157.0/http/server.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import { createRouter, register } from "./modules/http/index.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection, SocketHandler } from "./modules/websocket/index.ts";
import { httpRequestHandler } from "./methods/httpRequestHandler.ts";
import { tryParseJson } from "./methods/tryParseJson.ts";
import { User, ChatMessage, UserAccount } from "./types.ts";

dotenv({ export: true });

const users = new Map<string, User>();

const router = createRouter({});

const tempAccountStore = new Map<string, UserAccount>();

register({
    router,
    method: "POST",
    route: "/auth/account/register",
    handler: async (req: Request) => {
        const data = await req.formData();
        const {
            email,
            username,
            password
        } = Object.fromEntries(Array.from(data.entries()).map(([k, v]) => [k, v as string]));

        if (!(email && username && password)) return new Response("Missing Field(s)", { status: 400 });

        if (tempAccountStore.get(email)) return new Response("Email Already Registered!", { status: 409 });
    
        // set by email for now because doesnt matter and email should be unique anyway
        tempAccountStore.set(email, {
            id: nanoid(30),
            createdAt: Date.now(),
            email,
            username,
            password,
            connectionAddresses: []
        });

        return new Response("", { status: 200 });
    }
});

register({
    router,
    method: "POST",
    route: "/auth/account/login",
    handler: async (req: Request) => {
        console.log(await req.blob());
        return new Response("test");
    }
});

const wss = createSocketHandler({
    events: {}
});

// const wss = createSocketHandler({
//     uniqueIdLength: 16,
//     events: {
//         open: ({ id, socket, originRequest: req }: Connection) => {
//             const addrs = req.headers.get("x-forwarded-for")?.split(",");
//             const ipAddr = Array.isArray(addrs) ? addrs[0] : "local"; // change "local" to null in prod
//             const userAgent = req.headers.get("user-agent");

//             if (!(ipAddr && userAgent)) return socket.close(1007, "Received invalid headers.");

//             users.set(id, {
//                 id,
//                 socket,
//                 ipAddr,
//                 userAgent
//             });
//         },
//         message: (conn: Connection, event: MessageEvent) => {
//             const {
//                 type = null,
//                 data = null
//             } = tryParseJson(event.data);

//             const { id, socket } = conn;

//             const user = users.get(id);
//             if (!user) return socket.close(1008, "Client connection is invalid.");

//             switch(type) {
//                 case "JOIN": {
//                     const {
//                         username = null,
//                         room = null
//                     } = data;
    
//                     if (!(username && room)) return socket.close(1007, "Received invalid data.");

//                     if (user?.room) unsubscribe(wss, conn);

//                     subscribe(wss, conn, room);
//                     users.set(id, { ...user, username, room });

//                     break;
//                 }
//                 default:
//                     break;
//             }
//         },
//         close: (conn: Connection, event: CloseEvent) => {
//             // console.log("close", conn, event);
//         }
//     }
// });

// // upload attachments
// register({
//     router,
//     method: "POST",
//     route: "/rooms/:room/attachments",
//     handler: async (req: Request) => {
//         console.log(await req.blob());
//         return new Response("test");
//     }
// });

// // request attachment
// register({
//     router,
//     method: "GET",
//     route: "/rooms/:room/attachments/:attachment",
//     handler: async (req: Request) => {
//         console.log(await req.blob());
//         return new Response("test");
//     }
// });

// // send message to room users
// register({
//     router,
//     method: "POST",
//     route: "/rooms/:room/messages",
//     handler: async (req: Request) => {
//         const body = tryParseJson(await req.text());
//         if (!Object.entries(body).length) return new Response("Malformed JSON body.", { status: 400 });

//         const {
//             userId = null,
//             content = null,
//             attachments = []
//         } = body;
//         if (!(userId && content)) return new Response("Missing required fields.", { status: 400 });

//         const user = users.get(userId);
//         if (!(user)) return new Response("Client connection is invalid.", { status: 400 });

//         const {
//             id,
//             username = null,
//             room = null
//         } = user;

//         if (!(username && room)) return new Response("Client has not joined a room.", { status: 400 });

//         sendChatMessage(wss, room, {
//             author: {
//                 id,
//                 username
//             },
//             content,
//             attachments
//         });

//         console.log(userId, content);
//         return new Response(null, { status: 204 });
//     }
// });

// // respond with messages from room, preferrably have a "limit" param to specfy how many messages to return
// register({
//     router,
//     method: "GET",
//     route: "/rooms/:room/messages",
//     handler: (req: Request) => {
//         console.log(req);
//         return new Response("test");
//     }
// });

serve(async (req: Request) => {
    return await httpRequestHandler(req, router, wss);
}, { port: Number(Deno.env.get("PORT")) ?? 3000 });

function sendChatMessage(wss: SocketHandler, room: string, message: ChatMessage) {
    publish(wss, room, JSON.stringify({
        type: "MESSAGE",
        data: {
            ...message,
            timestamp: Date.now()
        }
    }));
};