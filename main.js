/*
TODO:
    - filter messages to prevent blocked words
    - filter names to prevent blocked words
    - bans & moderation dashboard
*/

const fs = require("fs");
const fetch = require("node-fetch");
const { nanoid } = require("nanoid");
const mime = require("mime-types");
const db = require("quick.db");
const { FastRateLimit } = require("fast-ratelimit");
const Eris = require("eris");
const uws = require("uWebSockets.js");
const config = require("./config.js");

const ratelimit = new FastRateLimit({ threshold: 5, ttl: 10 });
const bot = new Eris(config.BOT_TOKEN, { intents: [ "guildMessages" ] });
const app = uws.App();

class UserMap extends Map {
    list(room) {
        const result = [];

        for (const user of this.values()) {
            if (user.room === room) result.push(user.username);
        };

        return result;
    };
};

const users = new UserMap();

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
    message: (ws, msg, _isBinary) => {
        const message = parseMessage(msg);
        if (!message) return;

        const user = users.get(ws.id);
        const room = user.room;
        const channel = config.CHANNELS[room];

        switch(message.type) {
            case "join":                
                if (!(user.username || user.ip || user.room)) return ws.end(0, "inv"); // incase the join http request from client fails for whatever reason, todo: find out why client doesnt receive close message

                ws.send(buildServerMessage(`Welcome to room: ${room}`));

                ws.subscribe(`rooms/${room}`); // connects the client to desired room

                ws.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.SUCCESS};">${user.username} has joined!</span>`));

                app.publish(`rooms/${room}`, JSON.stringify({
                    type: "updateusers",
                    users: users.list(room)
                }));

                if(channel) bot.createMessage(channel, {
                    embed: {
                        color: config.EMBED_COLORS.SUCCESS,
                        description: `**${user.username}** has joined the chat!`
                    }
                });
                break;
            case "message":
                // published globally to the room through app instead of by the user socket, so the client recieves it's own message back and the message is equally mirrored across all clients
                ratelimit.consume(ws.id).then(() => {
                    app.publish(`rooms/${room}`, buildMessage({
                        author: user.username,
                        text: filterMessage(message.text)
                    }));
                }).catch(() => { /* message gets eaten 😋 */ });

                if(channel) bot.createMessage(channel, `**${user.username}:** ${message.text}`);
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

        app.publish(`rooms/${room}`, buildServerMessage(`<span class="blockquote" style="border-left-color: ${config.EMBED_COLOR_STRINGS.ERROR};">${user.username} has left!</span>`));

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
        });
    }
});

registerWebAssets("web"); // registers endpoints to serve client code at root

app.get("/", (reply, _req) => {
     /* removing index will crash the server, but i see no reason why index would be removed to begin with */
    const data = fs.readFileSync("./web/index.html", "utf8");
    reply.writeHeader("Content-Type", "text/html").end(data);
});

app.get("/join/:id", (reply, req) => {
    const id = req.getParameter();
    const ips = req.getHeader("x-forwarded-for").split(", ");
    const ip = ips[ips.length - 1];
    const query = parseQuery(req.getQuery());
    const room = removeHtml(query.room);
    const userlist = users.list(room);
    const name = filterName(query.name);

    reply.writeHeader("Access-Control-Allow-Origin", "*");
    reply.writeHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // i hate cors so much

    if (!users.get(id) || !ip || !name || !room) {
        reply.write("err");
    } else if (userlist.includes(name)) {
        reply.write("username taken");
    } else if (false) {
        reply.write("username invalid");
    } else if (false) {
        reply.write("you are banned");
    } else {
        users.set(id, {
            username: name,
            ip,
            room: room
        });
    
        reply.write("ok");
    }; // *cough* yandere dev technique

    reply.end();
});

app.get("/bans", (reply, req) => {
    const query = parseQuery(req.getQuery());
    const password = query.password;
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

bot.on("messageCreate", msg => {
    if (msg.author.id === bot.user.id) return;

    const prefix = config.BOT_PREFIX;
    const args = msg.content.slice(prefix.length).trim().split(" ");
    const cmd = args.shift().toLowerCase();
    const command = bot.commands.has(cmd) ? bot.commands.get(cmd) : bot.commands.get(bot.aliases.get(cmd));

    try {
        command.exec(bot, msg, args, config, users); // pass args
    } catch (err) {
        return; // these errors shouldnt matter
    };

    const room = config.ROOMS[msg.channel.id];
    if (!room) return;

    app.publish(`rooms/${room}`, buildMessage({
        author: msg.author.username,
        text: filterMessage(msg.content),
        badge: "Discord User"
    }));
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

    const items = decodeURI(queryStr).split("&");

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

function filterMessage(message) {
    const nohtml = removeHtml(message);
    return quoteParser(headerParser(wordFilter(nohtml)));
};

function removeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/`/g, "&#x60;").replace(/\(/g, "&#40;").replace(/\)/g, "&#41;");
};

function buildMessage({ author, text, badge, avatar }) {
    return JSON.stringify({
        type: "message",
        author,
        text,
        badge,
        avatar,
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
    const disallowed = [ "test" ];
    const seperated = text.split(" ");

    const result = [];

    for (const word of seperated) {
        const filtered = disallowed.includes(word) ? replaceWithStars(word) : word;
        result.push(filtered);
    };

    return result.join(" ");
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

        app.get(`${prefix}/${file}`, (reply, _req) => {
            reply.writeHeader("Content-Type", mime.lookup(file)).end(data);
        });
    };
};

async function loadCommands() {
    const commands = new Map(), aliases = new Map();

    return new Promise((res, rej) => {
        fs.readdir("./commands", (err, files) => {            
            const commandFiles = files.filter(f => f.endsWith(".js"));
            if (!commandFiles) rej("The commands folder does not contain any javascript files!");

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

async function logJoin(name, ip, id, room) {
    await fetch(config.WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify({
            embeds: [{
                "description": `**${name}** joined the chat!`,
                "color": 0x7189FF,
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
        }),
        headers: { "Content-Type": "application/json" }
    });
};