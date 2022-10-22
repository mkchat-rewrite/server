import * as traceUnhandled from "trace-unhandled";
traceUnhandled.register();
import fs from "fs/promises";
import { createHash } from "crypto";
import uws from "uWebSockets.js";
import { request } from "undici";
import mime from "mime-types";
import { startBot, createBot, sendMessage, addRole, removeRole, getUser, Intents } from "discordeno";
import { nanoid } from "nanoid";
import { FastRateLimit } from "fast-ratelimit";
import { createClient } from "@supabase/supabase-js";
import { executeWebhook, parseMessage, parseQuery, filterName, checkName, filterMessage, buildMessage, buildServerMessage, wordFilter, logModAction, logJoin, getStickerUrl, getAvatarUrl, iteratorToArr, checkBan, attachmentParser, noDiscordMentions, parseGif, loadCommands, fetchRoom, isRemoteAddressAsnBan, abToStr } from "./helpers.js";
import config from "./config.js";
import { fileTypeFromBuffer } from "file-type";

let lastWebhookMessageUsername = "";

async function updateWebhookNameAndAvatar(webhookUrl, username, avatarData) {
    await request(webhookUrl, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: username,
            avatar: avatarData
        })
    });
};

async function encodeUserAvatar(avatarUrl) {
    const { body } = await request(avatarUrl);
    const data = await body.arrayBuffer();
    const baseStr = Buffer.from(data).toString("base64");
    return `data:image/png;base64,${baseStr}`;
};

async function sendTestWebhookChatMessage(username, avatarData, message) {
    const webhookUrl = "https://discord.com/api/webhooks/1030821578390380654/symSSgNAhrBFhFBFHEa-mPpSjyeHmvvkBVZwraIMQATlY1KCUD30Ey15aOLaIafUZXXP";

    if (lastWebhookMessageUsername !== username) await updateWebhookNameAndAvatar(webhookUrl, username, avatarData);

    await executeWebhook(webhookUrl, {
        content: message,
        allowed_mentions: {
            parse: []
        }
    });

    lastWebhookMessageUsername = `${username} extradatatofixissueshopefully`;
};

process.on("uncaughtException", (err) => {
    console.error(err.stack);
    console.log("uncaught error, no exit");
});

process.on("unhandledRejection", (reason, promise) => {
    console.log("Unhandled Rejection at:", promise, "reason:", reason);
});

const ratelimit = new FastRateLimit({ threshold: 5, ttl: 10 });
const app = uws.App();
const supabase = createClient(config.DATABASE.URL, config.DATABASE.KEY);

class UserMap extends Map {
    list(room) {
        const result = [];

        for (const user of this.values()) {
            if (user.room === room) result.push({
                username: filterName(user.username),
                avatar: getAvatar(user.username)
            });
        };

        return result;
    };

    listBasic(room) {
        const result = [];

        for (const user of this.values()) {
            if (user.room === room) result.push(filterName(user.username));
        };

        return result;
    };
};

const users = new UserMap();
const persistentUsers = new UserMap();
const moderators = new Map(); // doesnt need list function for anything right now so a regular map will sufice

const bot = createBot({
    token: config.TOKEN,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMessageReactions,
    events: {
        async ready() {
            console.log("Ahh i'm alive! Please do not end the process for I will cease to exist.");

            try {
                [bot.commands, bot.aliases] = await loadCommands();
            } catch (err) {
                console.error(err);
            };
        },
        async messageCreate(bot, message) {
            if (message.isFromBot) return;

            const room = fetchRoom(message.channelId);//config.ROOMS[message.channelId];
            if (room) {
                const sticker = message.stickerItems ? message.stickerItems[0] : null;

                const user = await getUser(bot, message.authorId);
                let avatar = getAvatar(user.username);

                try {
                    avatar = await getAvatarUrl(bot, user);
                } catch (err) {
                    console.error(err);
                };

                app.publish(`rooms/${room}`, buildMessage({
                    author: user.username,
                    text: await parseGif(filterMessage(message.content)) + attachmentParser(message.attachments),
                    badge: config.MOD_IDS.includes(message.authorId) ? "<i class='fa-solid fa-shield'></i> Moderator" : "<i class='fa-brands fa-discord'></i> Discord User",
                    sticker: sticker ? getStickerUrl(sticker) : null,
                    avatar: avatar,
                    color: getColor(user.username)
                }));
            };

            const prefix = "m?";
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(" ");
            const cmd = args.shift().toLowerCase();
            const command = bot.commands.has(cmd) ? bot.commands.get(cmd) : bot.commands.get(bot.aliases.get(cmd));

            try {
                if (command.meta.restricted && !message.member.roles.includes(config.ROLE_IDS.MODERATION)) throw new Error("You do not have the required permission to use this command!");

                if (command) await command.exec(bot, message, args, config, users);
            } catch (err) {
                sendMessage(bot, message.channelId, {
                    embeds: [{
                        title: ":x: Something went wrong! :x:",
                        description: `\`\`\`js\n${err}\n\`\`\``,
                        color: config.EMBED_COLORS.ERROR
                    }]
                });
            };
        },
        async reactionAdd(bot, { userId, messageId, guildId, emoji }) {
            for (const entry of config.ROLE_REACTIONS) {
                if (messageId === entry.messageId && emoji.id === entry.emojiId) addRole(bot, guildId, userId, entry.roleId);
            };
        },
        async reactionRemove(bot, { userId, messageId, guildId, emoji }) {
            for (const entry of config.ROLE_REACTIONS) {
                if (messageId === entry.messageId && emoji.id === entry.emojiId) removeRole(bot, guildId, userId, entry.roleId);
            };
        }
    }
});

app.ws("/", {
    idleTimeout: 32, //otherwise the client will disconnect for seemingly no reason every 2 minutes
    maxPayloadLength: 4096 * 4096,

    upgrade: (reply, req, context) => {
        const ips = req.getHeader("x-forwarded-for").split(",");
        const ip = ips[0];

        reply.upgrade(
            { remoteAddress: ip, url: req.getUrl() },
            req.getHeader("sec-websocket-key"),
            req.getHeader("sec-websocket-protocol"),
            req.getHeader("sec-websocket-extensions"),
            context
        );
    },
    open: ws => {
        ws.id = nanoid(16);

        users.set(ws.id, {
            ip: ws.remoteAddress,
            disconnect: function () {
                ws.end(1, "kicked!");
            }
        });
    },
    message: async (ws, msg, _isBinary) => {
        const message = parseMessage(msg);

        const userData = users.get(ws.id);
        const room = userData?.room;

        const { data, error } = await supabase.from(config.DATABASE.TABLE).select().match({ ip: userData.ip });
        if (error) console.error("A fatal error has occured when querying ban data:", error); // hopefully this never actually happens :)
        // throwing because chat NEEDS to die once this happens because it's most likely important [as of 10/15/22 i have no idea what this was meant to convey as the error is not thrown]

        if ((Array.isArray(data) && data[0]) || await isRemoteAddressAsnBan(userData.ip)) return ws.end(1, "you are banned");

        switch (message.type) {
            case "join":
                if (userData?.room) acknowledgeDisconnect(userData.username, userData.room);

                const username = message?.data?.username;
                const userRoom = message?.data?.room;
                const userlist = users.listBasic(userRoom);
                const channel = config.CHANNELS[userRoom];

                if (!userData?.ip || !username || !userRoom) {
                    // ws.end(1, "invalid join data");
                } else if (userlist.includes(username)) {
                    ws.end(1, "username taken");
                } else if (!checkName(username)) {
                    ws.end(1, "username invalid");
                } else if (username?.length > 30) {
                    ws.end(1, "username too long");
                };

                const userAvatarUrl = getAvatar(username);

                users.set(ws.id, {
                    ...userData,
                    username,
                    avatar: userAvatarUrl,
                    room: userRoom,
                    avatarData: await encodeUserAvatar(userAvatarUrl)
                });
                const user = users.get(ws.id);
                persistentUsers.set(ws.id, { ...user, id: ws.id });

                try {
                    ws.send(buildServerMessage(`Welcome to room: ${user.room}`));
                } catch {
                    return; // ahhhhhh
                };

                ws.subscribe(`rooms/${user.room}`); // connects the client to desired room

                ws.send(JSON.stringify({
                    type: "connect",
                    id: ws.id
                }));

                ws.publish(`rooms/${user.room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.SUCCESS};">${filterName(user.username)} has joined!</span>`));

                if (userData?.room) ws.publish(`rooms/${userData.room}`, JSON.stringify({
                    type: "updateusers",
                    users: users.list(userData.room)
                }));

                app.publish(`rooms/${user.room}`, JSON.stringify({
                    type: "updateusers",
                    users: users.list(user.room)
                }));

                if (channel) await sendMessage(bot, channel, {
                    embeds: [{
                        color: config.EMBED_COLORS.SUCCESS,
                        description: `**${user.username}** has joined the chat!`
                    }]
                });

                logJoin(user.username, user.ip, ws.id, user.room); //name, ip, id, room
                break;
            case "message":
                if (message?.text?.length > 250) return;

                const messageFile = message?.file;
                let attachmentUrl = null;
                let attachment = "";

                if (messageFile) {
                    const fileBuffer = new Buffer.from(messageFile, "binary");
                    const fileData = await fileTypeFromBuffer(fileBuffer);
                    const videoFormats = ["mp4", "mov", "wmv", "ebm", "mkv", "m4v", "webm"];
                    const imageFormats = ["png", "apng", "jpg", "jpeg", "gif"];

                    if (fileData && (videoFormats.includes(fileData.ext) || imageFormats.includes(fileData.ext))) {
                        const fileHash = createHash("sha1").update(messageFile).digest("hex");
                        const fileName = `${fileHash}.${fileData.ext.replace("apng", "png")}`;
                        const { data: ret, error: err } = await supabase.storage.from("attachments").upload(fileName, fileBuffer);
                        attachmentUrl = `${config.PROXY_URL}/attachments/${fileName}`;

                        if (videoFormats.includes(fileData.ext)) {
                            attachment = `<video class="attachment" alt="attachment" controls><source src="${attachmentUrl}" type="${fileData.mime}" /></video>`;
                        } else if (imageFormats.includes(fileData.ext)) {
                            attachment = `<img src="${attachmentUrl}" class="attachment" alt="attachment">`;
                        };
                    };
                };

                // published globally to the room through app instead of by the user socket, so the client recieves it's own message back and the message is equally mirrored across all clients
                ratelimit.consume(ws.id).then(() => {
                    app.publish(`rooms/${users.get(ws.id).room}`, buildMessage({
                        author: filterName(users.get(ws.id).username),
                        text: filterMessage(message.text) + attachment,
                        avatar: users.get(ws.id).avatar,
                        color: getColor(users.get(ws.id).username)
                    }));
                }).catch(() => { /* message gets eaten 😋 */ });

                if (users.get(ws.id).room === "rp") {
                    await sendTestWebhookChatMessage(users.get(ws.id).username, users.get(ws.id).avatarData, wordFilter(noDiscordMentions(message.text))+`${attachmentUrl ? `\n${attachmentUrl}` : ""}`)
                } else if (config.CHANNELS[users.get(ws.id).room]) await sendMessage(bot, config.CHANNELS[users.get(ws.id).room], {
                    content: `**${users.get(ws.id).username}:** ${wordFilter(noDiscordMentions(message.text))}${attachmentUrl ? `\n${attachmentUrl}` : ""}`,
                });
                break;
            case "kickme":
                user.disconnect();
                break;
            default:
                break;
        };
    },
    drain: ws => {
        console.log(`WebSocket backpressure: ${ws.getBufferedAmount()}`);
        // not handling backpressue because im lazy lmfao
    },
    close: async (ws, _code, _msg) => {
        const userId = ws.id;
        const user = users.get(userId);
        const persistentUser = persistentUsers.get(userId);
        const room = user.room;

        users.delete(userId);
        persistentUsers.set(userId, { ...persistentUser, isDisconnected: true });

        acknowledgeDisconnect(user.username, room);

        // app.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.ERROR};">${filterName(user.username)} has left!</span>`));

        // app.publish(`rooms/${room}`, JSON.stringify({
        //     type: "updateusers",
        //     users: users.list(room)
        // }));

        // const channel = config.CHANNELS[room];
        // if (channel) await sendMessage(bot, channel, {
        //     embeds: [{
        //         color: config.EMBED_COLORS.ERROR,
        //         description: `**${user.username}** has left the chat!`
        //     }]
        // });
    }
});

registerWebAssets("web"); // registers endpoints to serve client code at root

app.get("/modlogin", (reply, req) => {
    const query = parseQuery(req.getQuery());
    const password = query.password;

    if (password === config.MODERATION_PASSWORD) return reply.writeStatus("204").end();

    reply.writeStatus("418").end(); // i'm a 🫖
});

app.get("/users", (reply, req) => {
    const query = parseQuery(req.getQuery());
    if (query.password != config.MODERATION_PASSWORD) return reply.writeStatus("400").end();

    reply.writeStatus("200").end(JSON.stringify(iteratorToArr(persistentUsers.values())));
});

app.get("/bans", async (reply, req) => {
    const query = parseQuery(req.getQuery());
    if (query.password != config.MODERATION_PASSWORD) return reply.writeStatus("400").end();

    reply.onAborted(() => {
        reply.aborted = true;
    });

    if (reply.aborted) return;

    const { data, error } = await supabase.from(config.DATABASE.TABLE).select();
    if (error) console.error("A fatal error has occured when querying ban data:", error); // hopefully this never actually happens :)

    reply.writeStatus("200").end(JSON.stringify(data));
});

app.get("/doban", async (reply, req) => {
    const requestAddrs = req.getHeader("x-forwarded-for").split(", ");
    const modAddr = requestAddrs[0];
    const query = parseQuery(req.getQuery());
    if (query.password != config.MODERATION_PASSWORD) return reply.writeStatus("400").end("Invalid password!");

    reply.onAborted(() => {
        reply.aborted = true;
    });

    if (reply.aborted) return;

    const isBanned = await checkBan({ ip: query.ip }).catch(err => console.error(err));
    if (isBanned) return reply.writeStatus("400").end("User already banned!");

    const banData = {
        ip: query.ip,
        username: query.username,
        reason: query.reason,
        length: query.length
    };

    const { data, error } = await supabase.from(config.DATABASE.TABLE).insert([banData]);
    if (error) {
        console.error(`A fatal error has occured when attempting to ban: ${query.ip}`);
        return reply.writeStatus("400").end("Database error!");
    };

    await logModAction(modAddr, "ban", banData);

    reply.writeStatus("204").end();
});

app.get("/unban", async (reply, req) => {
    const requestAddrs = req.getHeader("x-forwarded-for").split(", ");
    const modAddr = requestAddrs[0];
    const query = parseQuery(req.getQuery());
    if (query.password !== config.MODERATION_PASSWORD) return reply.writeStatus("400").end("Invalid password!");

    reply.onAborted(() => {
        reply.aborted = true;
    });

    if (reply.aborted) return;

    const isBanned = await checkBan({ ip: query.ip }).catch(err => console.error(err));
    if (!isBanned) return reply.writeStatus("400").end("User isn't banned!");

    const { data, error } = await supabase.from(config.DATABASE.TABLE).delete().match({ ip: query.ip });
    if (error) {
        console.error(`A fatal error has occured when attempting to unban: ${query.ip}`);
        return reply.writeStatus("400").end("Database error!");
    };

    await logModAction(modAddr, "unban", isBanned);

    reply.writeStatus("204").end();
});

app.get("/motd", async (reply, req) => {
    reply.onAborted(() => reply.aborted = true);
    if (reply.aborted) return;

    const motds = (await fs.readFile("./motds.txt", "utf-8")).split("\n");
    const motd = motds[Math.floor(Math.random() * motds.length)];

    reply.writeHeader("Access-Control-Allow-Origin", "*");
    reply.writeHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    reply.writeStatus("200").end(motd);
});

app.listen(config.HOST, config.PORT, token => console.log(`${token ? "Listening" : "Failed to listen"} on port: ${config.PORT}`));

await startBot(bot);

// folder name supplied should have no slashes (unless subfolder ex. folder/subfolder)
export async function registerWebAssets(folder) {
    const files = await fs.readdir(folder);

    for (const file of files) {
        if (!file.includes(".")) {
            registerWebAssets(`./${folder}/${file}`);
            continue;
        };

        let data;

        try {
            data = await fs.readFile(`./${folder}/${file}`);
        } catch {
            continue;
        };

        const prefix = folder.replace(/(.\/web|web)/, ""); // hardcoding this makes passing folder name as param useless, but who cares
        const mimeType = mime.lookup(file);

        app.get(`${prefix}/${file}`, (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });

        if (file !== "index.html") continue;

        app.get(prefix || "/", (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });

        app.get(`${prefix}/`, (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });
    };
};

app.ws("/moderation", {
    idleTimeout: 32,

    upgrade: (reply, req, context) => {
        console.log(`http upgrading to ws, URL: ${req.getUrl()}`);

        const ips = req.getHeader("x-forwarded-for").split(", ");
        const ip = ips[0];

        console.log(ip); // not intended to be used long-term, just testing for some future changes to how connections take place

        reply.upgrade(
            { url: req.getUrl() },
            req.getHeader("sec-websocket-key"),
            req.getHeader("sec-websocket-protocol"),
            req.getHeader("sec-websocket-extensions"),
            context
        );
    },
    open: ws => {
        ws.id = nanoid(64);

        moderators.set(ws.id, {});
    },
    message: async (ws, msg, _isBinary) => {
        const message = parseMessage(msg);
        if (!message) return;

        switch (message.type) {
            case "login":
                break;
            case "kick":
                const user = persistentUsers.get(message?.userId);
                user.disconnect();
                break;
            case "ban":
                break;
            case "unban":
                break;
            case "requestusersupdate":
                ws.send(JSON.stringify({
                    type: "updateuserlist",
                    data: iteratorToArr(persistentUsers.values())
                }));
                break;
            case "requestbansupdate":
                const { data, error } = await supabase.from(config.DATABASE.TABLE).select();
                if (error) console.error("A fatal error has occured when querying ban data:", error); // hopefully this never actually happens :)

                try {
                    ws.send(JSON.stringify({
                        type: "updatebanlist",
                        data: data
                    }));
                } catch {
                    return;
                };
                break;
            default:
                break;
        };
    },
    drain: ws => {
        console.log(`WebSocket backpressure: ${ws.getBufferedAmount()}`);
        // not handling backpressue because im lazy lmfao   
    },
    close: async (ws, _code, _msg) => {
        moderators.delete(ws.id);
    }
});


function getColor(key) {
    if (!key || !key.hasOwnProperty("length")) return "";
    let hash = key.length;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + (hash << 5) - hash;
    };

    const res = Math.abs(hash % 255);

    const color = ["FF", "99", res.toString(16)].map(c => c.padStart(2, c)).sort(() => 0.5 - res / 255).join("");
    return "#" + color;
};

// function getAvatar(key) {
//     return `https://rail-proxy.mkchat.app/dicebear/avatars/${new Buffer.from(key || "", "utf8").toString("hex")}.svg?b=${getColor(key).replace("#", "%23")}`;
// };

function getAvatar(key) {
    return `https://rail-proxy.mkchat.app/seasonal/halloween/avatars/${key}`;
};

async function acknowledgeDisconnect(username, room) {
    app.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.ERROR};">${filterName(username)} has left!</span>`));

    app.publish(`rooms/${room}`, JSON.stringify({
        type: "updateusers",
        users: users.list(room)
    }));

    const channel = config.CHANNELS[room];
    if (channel) await sendMessage(bot, channel, {
        embeds: [{
            color: config.EMBED_COLORS.ERROR,
            description: `**${username}** has left the chat!`
        }]
    });
};
