import fs from "fs/promises";
import Scraper from "lite-meta-scraper";
import { request } from "undici";
import { avatarURL } from "discordeno";
import config from "./config.js";
const badWords = /(we8ryweiufgh7324r9i43yhfkjerhfkjrehbfgkjedfbgkjdfbngkjfdbgkjrfdhbgkjfdngkjfdn)/gi;
// const badWords = /(((n|ɴ|[//])|(n|ɴ|[//])\s*)((i|ɪ|l|x|1|!|[*]|ee)|(i|ɪ|l|x|1|!|[*]|ee)\s*)((ɢ|g|b|q|6)|(ɢ|g|b|q|6)\s*){2}((e+r|e+\s*r)|a|ᴀ|@|3+r)|niga|ɴɪɢɢᴀ|discord.gg|teenxchat|rule34|pchat|r34|ziachat|\/nigg|n.i.g.g)/gi;

export function abToStr(buf) {
    return Buffer.from(buf).toString("utf8");
};

export function parseMessage(msg) {
    try {
        return JSON.parse(abToStr(msg));
    } catch {
        return null;
    };
};

// this function is probably over complicated, but it gets the job done so i see no issue with it rn
export function parseQuery(queryStr) {
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

export function filterName(name) {
    if (!name) return "";
    
    return removeHtml(name);
};

export function checkName(name) {
    const isBad = name.match(badWords);
    if (isBad) return null;
    return name;
};

export function filterMessage(message) {
    const nohtml = removeHtml(message);
    return parseEmoji(quoteParser(headerParser(wordFilter(nohtml))));
};

export function removeHtml(text) {
    if (!text) return "";
    
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/`/g, "&#x60;").replace(/\(/g, "&#40;").replace(/\)/g, "&#41;");
};

export function buildMessage({ author, text, badge, avatar, color, sticker }) {
    return JSON.stringify({
        type: "message",
        author,
        text,
        badge,
        avatar,
        color,
        sticker,
        date: new Date()
    });
};

export function buildServerMessage(text) {
    return buildMessage({
        author: "SERVER",
        text: text,
        badge: "<i class='fa-solid fa-robot'></i> System",
        avatar: "https://mkchat.app/imgs/favicon.png",
        color: "#ffffff"
    });
};

// function to prevent racism, advertising, etc.
export function wordFilter(text) {
    let result = text;

    const matches = text.match(badWords);
    if (!matches) return result;

    for (const match of matches) {
        result = result.replace(match, replaceWithStars(match));
    };

    return result;
};

export function replaceWithStars(str) {
    let result = "";

    for (let i = 0; i < str.length; i++) {
        result += "*";
    };

    return result;
};

// ### text -> <h3>text</h3>
export function headerParser(text) {
    if (!text.startsWith("#")) return text;

    let occurences = 0;

    for (const char of text) {
        if (char === "#" && occurences < 6) occurences++;
    };

    return text.replace(/#+/, `<h${occurences}>`) + `</h${occurences}>`;
};

export function quoteParser(text) {
    if (!text.startsWith("&gt;")) return text;

    return `${text.replace("&gt;", "<span class='blockquote'>")}</span>`;
};

export async function executeWebhook(url, message) {
    try {
        await request(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
    } catch (err) {
        console.error("Error executing webhook: ", err);
    };
};

export async function logModAction(ip, action, details) {
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

export async function logJoin(name, ip, id, room) {
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

export function getStickerUrl(sticker) {
    const result = {
        type: sticker.formatType < 3 ? 1 : 2
    };

    switch(sticker.formatType) {
        case 1:
            result.url = `${config.PROXY_URL}/discord/stickers/${sticker.id}.webp`;
            break;
        case 2:
            result.url = `${config.PROXY_URL}/discord/stickers/${sticker.id}.png`;
            break;
        case 3:
            result.url = `${config.PROXY_URL}/discord/lottiesticker/${sticker.id}`;
            break;
    };

    return result;
};

export async function getAvatarUrl(bot, author) {
    const discordAv = await avatarURL(bot, author.id, author.discriminator, {
        avatar: author.avatar,
        format: "png"
    });
    const avatarId = discordAv.split("/")[5].split(".png")[0];

    const { statusCode } = await request(`${config.PROXY_URL}/discord/avatars/${author.id}/${avatarId}.gif`);
    return `${config.PROXY_URL}/discord/avatars/${author.id}/${avatarId}.${statusCode === 200 ? "gif" : "webp"}`;
};

export function iteratorToArr(iterator) {
    const result = [];

    for (const item of iterator) {
        result.push(item);
    };

    return result;
};

export async function checkBan(query) {
    const { data, error } = await supabase.from(config.DATABASE.TABLE).select().match(query);

    if (error) {
        throw new Error(error);
    } else if (Array.isArray(data) && data[0]) {
        return data[0];
    } else {
        return false;
    };
};

export function parseEmoji(text) {
    const pattern = /&lt;(a:|:)[a-zA-Z0-9_-]*:[0-9]{18}&gt;/g;
    const emojis = text.match(pattern);
      
    if (!emojis) return text;

    for(const emoji of emojis) {
        const id = emoji.match(/[0-9]{18}/g);
        const format = emoji.startsWith("&lt;a") ? "gif" : "png";

        text = text.replace(emoji, `<img class="discordEmoji" src="${config.PROXY_URL}/discord/emojis/${id}.${format}" alt="discord emoji" style="height: 1.375em; width: 1.375em;" />`);
    };
      
    return text;
};

export function attachmentParser(attachments) {
    if (!attachments) return "";
    
    const videoFormats = [ "mp4", "mov", "wmv", "ebm", "mkv", "m4v" ];
    let result = "";
    
    for (const attachment of attachments) {
        if (videoFormats.includes(attachment.url.slice(-3))) {
            result += `<video controls><source src="${attachment.url.replace('https://cdn.discordapp.com', config.PROXY_URL + '/discord')}" style="width: ${attachment.width}px; height: ${attachment.height}px;" type=${attachment.content_type} /></video>`;
        } else {
            result += `<img src="${attachment.url.replace('https://cdn.discordapp.com', config.PROXY_URL + '/discord')}" alt="${attachment.filename}" style="width: ${attachment.width}px; height: ${attachment.height}px;" />`
        };
    };

    return result;
};

export function noDiscordMentions(text) {
    return text ? text.replaceAll(">", "").replaceAll("<", "") : "";
};

export function parseGif(messageContent) {
    const tenorGifUrlRegex = /https:\/\/tenor.com\/view\/[\S]+/g;

    if (!tenorGifUrlRegex.test(messageContent)) return messageContent;

    return new Promise((res, _rej) => {
        const tenorGifUrl = messageContent.match(tenorGifUrlRegex)[0];

        new Scraper({
            host: "https://tenor.com",
            path: tenorGifUrl.replace("https://tenor.com", "")
        }).scrape((err, data) => {
            if (err || !data?.ogUrl) res(messageContent); // stupid but idc
            res(messageContent.replace(tenorGifUrl, `<img src="${data.ogUrl}" alt="tenor gif" style="width: ${data.ogImageWidth}px; height: ${data.ogImageHeight}px;" />`));
        });
    });
};

export function loadCommands() {
    const commands = new Map(), aliases = new Map();

    return new Promise(async (res, _rej) => {
        const files = (await fs.readdir("./commands")).filter(f => f.endsWith(".js"));

        for (const file of files) {
            const { default: cmd } = await import(`./commands/${file}`);

            commands.set(cmd.meta.name, cmd);
            for (const alias of cmd.meta.aliases) {
                aliases.set(alias, cmd.meta.name);
            };
        };

        res([ commands, aliases ]);
    });
};

export function fetchRoom(channelId) {
    const rooms = config.ROOMS;

    for (const room in rooms) {
        if (BigInt(room) === channelId) return rooms[room];
    };

    return null;
};
