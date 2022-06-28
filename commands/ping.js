import { sendMessage } from "discordeno";

export default {
    exec: async (bot, message, _args, _config, users) => {
        sendMessage(bot, message.channelId, { content: "pong" });
    },
    meta: {
        name: "ping",
        aliases: [ "pong" ],
        description: "Pings and pongs.",
        restricted: false
    }
};