import { sendMessage } from "discordeno";

export default {
    exec: async (bot, message, args, config, users) => {
        const room = args.join(" ");

        sendMessage(bot, message.channelId, { embeds: [{
            color: config.EMBED_COLORS.INFO,
            description: `There are currently ${room ? users.list(room).length : users.size} users connected to ${room ? "room: " + room : "mkchat"}`
        }] });
    },
    meta: {
        name: "users",
        aliases: [ ],
        description: "Shows the number of users currently connected to mkchat.",
        restricted: true
    }
};