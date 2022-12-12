import { sendMessage } from "discordeno";

export default {
    exec: async (bot, message, _args, _config, _users, _chatGPT) => {
        sendMessage(bot, message.channelId, { content: "pong" });
    },
    meta: {
        name: "ping",
        aliases: [ "pong" ],
        description: "Pings and pongs.",
        restricted: false
    }
};