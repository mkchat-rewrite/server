/*
TODO:
    - filter messages and ratelimit to prevent xss, blocked words, and spam
    - filter names to prevent xss and blocked words
    - discord channel mirroring for main rooms
    - markdown support (partially done with # * {i} becoming h{i})
    - bans
    - take fraud score of ip into account
    - verbose alerts through discord bot
    - moderation dashboard

    *** Currently there are simple solutions for  both xss and word filtering, but word filtering should be improved to stop bypassing by adding chars to the word ( - probably needs to be done with regex :( - ) ***
*/

const { nanoid } = require("nanoid");
const uws = require("uWebSockets.js");
const app = uws.App();
const PORT = process.env.PORT || 3000;

const users = new Map();

app.ws("/*", {
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

        switch(message.type) {
            case "join":
                ws.send(buildMessage({
                    author: "SERVER",
                    text: `Welcome to room: ${room}`,
                    badge: "system"
                }));
                
                ws.subscribe(`rooms/${room}`); // connects the client to desired room

                ws.publish(`rooms/${room}`, buildMessage({
                    author: "SERVER",
                    text: `${user.username} has joined`,
                    badge: "system"
                }));
                
                app.publish(`rooms/${room}`, JSON.stringify({
                    type: "updateusers",
                    users: listUsers(users, room)
                }));
                break;
            case "message":
                // published globally to the room through app instead of by the user socket, so the client recieves it's own message back and the message is equally mirrored across all clients
                app.publish(`rooms/${room}`, buildMessage({
                    author: user.username,
                    text: formatMessage(message.text)
                }));
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

        app.publish(`rooms/${room}`, buildMessage({
            author: "SERVER",
            text: `${user.username} has left`,
            badge: "system"
        }));

        app.publish(`rooms/${room}`, JSON.stringify({
            type: "updateusers",
            users: listUsers(users, room)
        }));
    }
});

app.get("/", (reply, _req) => {
    reply.end("h");
});

app.get("/join/:id", (reply, req) => {
    const id = req.getParameter();
    const ips = req.getHeader("x-forwarded-for").split(", ");
    const ip = ips[ips.length - 1];
    const query = parseQuery(req.getQuery());
    const userlist = listUsers(users, query.room);
    const name = formatName(query.name);

    reply.writeHeader("Access-Control-Allow-Origin", "*");
    reply.writeHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // i hate cors so much

    if (!users.get(id) || !ip || !name || !query.room) {
        return reply.end("err");
    } else if (userlist.includes(name)) {
        return reply.end("username taken");
    } else if (false) {
        return reply.end("username invalid");
    };

    users.set(id, {
        username: name,
        ip,
        room: query.room
    });

    reply.end("ok");
});

app.listen(PORT, token => console.log(`${token ? "Listening" : "Failed to listen"} on port: ${PORT}`));

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
    const items = queryStr.split("&");
    const result = {};

    for (const item of items) {
        const keyValue = item.split("=");
        result[keyValue[0]] = keyValue[1].replace(/%20/g, " ");
    };

    return result;
};

function listUsers(users, room) {
    const result = [];
    
    for (const user of users.values()) {
        if (user.room === room) result.push(user.username);
    };

    return result;
};

function formatName(name) {
    return name.replace(/(%3C|%3E)/g, "");
};

function formatMessage(message) {
    const nohtml = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return headerParser(wordFilter(nohtml));
};

function buildMessage({ author, text, badge }) {
    return JSON.stringify({
        type: "message",
        author,
        text,
        badge,
        date: new Date()
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

    return text.replace(/#+/g, `<h${occurences}>`) + `</h${occurences}>`;
};

/*
    README: The initial connection is essentially a back and forth dance between client and server, which i do not consider ideal, however it seems to work well enough and I would consider it better than using the bloated socket.io package.
*/

/*
    message data that is produced from data provided by the client: author, text, emoji
    message data that is produced only by the server: badge, buttons
*/
