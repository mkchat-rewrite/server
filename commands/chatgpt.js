import { sendMessage, editMessage } from "discordeno";

export default {
    exec: async (bot, message, args, _config, _users, chatGPT) => {
        const initial = await sendMessage(bot, message.channelId, {
            content: "Thinking <a:typing:991905178750033950>",
            messageReference: {
                messageId: message.id,
                channelId: message.channelId,
                failIfNotExists: false
            }
        });

        const response = await chatGPT.sendMessage(args.join(" "));

        await editMessage(bot, message.channelId, initial.id, { content: response });

        // await editMessage(
        //     bot: Bot,
        //     channelId: BigString,
        //     messageId: BigString,
        //     options: EditMessage,
        //     ): Promise<Message>

        // await initial.edit({ content: response });
    },
    meta: {
        name: "chatgpt",
        aliases: [],
        description: "Utilizes the chatgpt api and returns the response.",
        restricted: false
    }
};