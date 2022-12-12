import { sendMessage, addRole, removeRole, getMember } from "discordeno";

export default {
    exec: async (bot, message, _args, config, _users, _chatGPT) => {
        const targetUserId = message.mentionedUserIds[0];
        const targetIsChatBanned = (await getMember(bot, message.guildId, targetUserId)).roles.includes(config.ROLE_IDS.CHAT_BAN);

        let content;

        if (targetIsChatBanned) {
            addRole(bot, message.guildId, targetUserId, config.ROLE_IDS.CHAT_USER);
            removeRole(bot, message.guildId, targetUserId, config.ROLE_IDS.CHAT_BAN);

            content = `Removed the 'not h' role from <@${targetUserId}>`;
        } else {
            removeRole(bot, message.guildId, targetUserId, config.ROLE_IDS.CHAT_USER);
            addRole(bot, message.guildId, targetUserId, config.ROLE_IDS.CHAT_BAN);

            content = `Added the 'not h' role to <@${targetUserId}>`;
        };

        sendMessage(bot, message.channelId, { content });
    },
    meta: {
        name: "chatban",
        aliases: ["noth"],
        description: "Bans stinky kids from mkchat.",
        restricted: true
    }
};