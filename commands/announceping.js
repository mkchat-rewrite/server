import { sendMessage, editRole, deleteMessage } from "discordeno";

export default {
    exec: async (bot, message, _args, config, _users, _chatGPT) => {
        await deleteMessage(bot, message.channelId, message.id);

        await editRole(bot, message.guildId, config.ROLE_IDS.CHAT_PING, { mentionable: true });
        sendMessage(bot, message.channelId, { content: `<@&${config.ROLE_IDS.CHAT_PING}>` });
        await editRole(bot, message.guildId, config.ROLE_IDS.CHAT_PING, { mentionable: false });
    },
    meta: {
        name: "announceping",
        aliases: [],
        description: "Pings the mk chat announcements role.",
        restricted: true
    }
};