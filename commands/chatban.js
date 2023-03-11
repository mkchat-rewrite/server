import { sendMessage, addRole, removeRole, getMember } from "discordeno";

export default {
    exec: async (bot, message, _args, config, _users) => {
        const targetUserId = message.mentionedUserIds[0];
        const targetIsChatBanned = (await getMember(bot, message.guildId, targetUserId)).roles.includes(config.discord.roleIds.chatBan);

        let content;

        if (targetIsChatBanned) {
            addRole(bot, message.guildId, targetUserId, config.discord.roleIds.chatUser);
            removeRole(bot, message.guildId, targetUserId, config.discord.roleIds.chatBan);

            content = `Removed the 'not h' role from <@${targetUserId}>`;
        } else {
            removeRole(bot, message.guildId, targetUserId, config.discord.roleIds.chatUser);
            addRole(bot, message.guildId, targetUserId, config.discord.roleIds.chatBan);

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