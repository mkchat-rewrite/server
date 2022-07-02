import fs from "fs/promises";
import uws from "uWebSockets.js";
import { startBot, createBot, sendMessage, addRole, removeRole, getUser, Intents } from "discordeno";
import { nanoid } from "nanoid";
import { FastRateLimit } from "fast-ratelimit";
import { createClient } from "@supabase/supabase-js";
import { parseMessage, parseQuery, filterName, checkName, filterMessage, removeHtml, buildMessage, buildServerMessage, wordFilter, logModAction, logJoin, getStickerUrl, getAvatarUrl, iteratorToArr, checkBan, attachmentParser, noDiscordMentions, parseGif, loadCommands, fetchRoom } from "./helpers.js";
import config from "./config.js";

const ratelimit = new FastRateLimit({ threshold: 5, ttl: 10 });
const app = uws.App();
const supabase = createClient(config.DATABASE.URL, config.DATABASE.KEY);

class UserMap extends Map {
    list(room) {
        const result = [];

        for (const user of this.values()) {
            if (user.room === room) result.push(filterName(user.username));
        };

        return result;
    };
};

const users = new UserMap();
const persistentUsers = new UserMap();

const bot = createBot({
    token: config.TOKEN,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent | Intents.GuildMessageReactions,
    events: {
        async ready() {
            console.log("Ahh i'm alive! Please do not end the process for I will cease to exist.");

            try {
                [ bot.commands, bot.aliases ] = await loadCommands();
            } catch (err) {
                console.error(err);
            };
        },
        async messageCreate(bot, message) {
            if (message.isBot) return;

            const room = fetchRoom(message.channelId);//config.ROOMS[message.channelId];
            if (room) {
                const sticker = message.stickerItems ? message.stickerItems[0] : null;

                const user = await getUser(bot, message.authorId);

                app.publish(`rooms/${room}`, buildMessage({
                    author: user.username,
                    text: await parseGif(filterMessage(message.content)) + attachmentParser(message.attachments),
                    badge: config.MOD_IDS.includes(message.authorId) ? "Chat Staff" : "Discord User",
                    sticker: sticker ? getStickerUrl(sticker) : null,
                    avatar: await getAvatarUrl(user)
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

app.ws("/*", {
    idleTimeout: 32, //otherwise the client will disconnect for seemingly no reason every 2 minutes

    open: ws => {
        ws.id = nanoid(16);

        users.set(ws.id, {}); // value will be empty until the client sends join request to server (this is used because uws socket remoteaddress function is practically useless to us and we might as well send connect params along with it instead of via another socket message)

        ws.send(JSON.stringify({
            type: "connect",
            id: ws.id
        }));
    },
    message: async (ws, msg, _isBinary) => {
        const message = parseMessage(msg);
        if (!message) return;

        const user = users.get(ws.id);
        const room = user.room;
        const channel = config.CHANNELS[room];

        const { data, error } = await supabase.from(config.DATABASE.TABLE).select().match({ ip: user.ip });
        if (error) console.error("A fatal error has occured when querying ban data:", error); // hopefully this never actually happens :)

        if (Array.isArray(data) && data[0]) return ws.end(1, "you are banned");

        switch(message.type) {
            case "join":                
                if (!(user.username || user.ip || user.room)) return ws.end(1, "invalid join data"); // incase the join http request from client fails for whatever reason, todo: find out why client doesnt receive close message

                try {
                    ws.send(buildServerMessage(`Welcome to room: ${room}`));
                } catch {
                    return; // ahhhhhh
                };

                ws.subscribe(`rooms/${room}`); // connects the client to desired room

                ws.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.SUCCESS};">${filterName(user.username)} has joined!</span>`));

                app.publish(`rooms/${room}`, JSON.stringify({
                    type: "updateusers",
                    users: users.list(room)
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
                if (message.text.length > 250) return;
                
                // published globally to the room through app instead of by the user socket, so the client recieves it's own message back and the message is equally mirrored across all clients
                ratelimit.consume(ws.id).then(() => {
                    app.publish(`rooms/${room}`, buildMessage({
                        author: filterName(user.username),
                        text: filterMessage(message.text)
                    }));
                }).catch(() => { /* message gets eaten 😋 */ });

                if (channel) await sendMessage(bot, channel, { content: `**${user.username}:** ${wordFilter(noDiscordMentions(message.text))}` });
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
        const user = users.get(ws.id);
        const room = user.room;

        users.delete(ws.id);

        app.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.ERROR};">${filterName(user.username)} has left!</span>`));

        app.publish(`rooms/${room}`, JSON.stringify({
            type: "updateusers",
            users: users.list(room)
        }));

        const channel = config.CHANNELS[room];
        if (channel) await sendMessage(bot, channel, {
            embeds: [{
                color: config.EMBED_COLORS.ERROR,
                description: `**${user.username}** has left the chat!`
            }]
        });
    }
});

registerWebAssets("web"); // registers endpoints to serve client code at root

app.get("/join/:id", async (reply, req) => {
    const id = req.getParameter();
    const ips = req.getHeader("x-forwarded-for").split(", ");
    const ip = ips[0];
    const query = parseQuery(req.getQuery());
    const room = removeHtml(query.room);
    const userlist = users.list(room);
    const name = query.name;

    reply.onAborted(() => {
        reply.aborted = true;
    });

    if (reply.aborted) return;

    reply.writeHeader("Access-Control-Allow-Origin", "*");
    reply.writeHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //i hate cors so much

    const { data, error } = await supabase.from(config.DATABASE.TABLE).select().match({ ip: ip });
    if (error) throw new Error("A fatal error has occured when querying ban data:", error); // hopefully this never actually happens :)
    // throwing because chat NEEDS to die once this happens because it's most likely important

    if (!users.get(id) || !ip || !name || !room) {
        reply.write("err");
    } else if (userlist.includes(name)) {
        reply.write("username taken");
    } else if (!checkName(name)) {
        reply.write("username invalid");
    } else if (Array.isArray(data) && data[0]) {
        reply.write("you are banned");
    } else if (name.length > 30) {
        reply.write("username too long");
    } else {
        const user = {
            username: name,
            ip,
            room: room
        };
        
        users.set(id, user);
        persistentUsers.set(id, { ...user, id });
    
        reply.write("ok");
    }; // *cough* yandere dev technique
    
    reply.end();
});

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
    
    const { data, error } = await supabase.from(config.DATABASE.TABLE).insert([ banData ]);
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
    if (query.password != config.MODERATION_PASSWORD) return reply.writeStatus("400").end("Invalid password!");

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

        const data = await fs.readFile(`./${folder}/${file}`);

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