module.exports = {
    exec: (bot, message, args, config, users) => {
        if (!config.MOD_IDS.includes(message.author.id)) return bot.createMessage(message.channel.id, "You are not permitted to utilize this command!");
        if (!args) return bot.createMessage(message.channel.id, "Please enter something to evaluate.");

        if (args.join(" ").toLowerCase().includes("token")) return;

        const toEval = args.join(" ");
        const evaluated = eval(toEval);
      
        bot.createMessage(message.channel.id, {
            embed: {
                title: "Eval",
                color: config.EMBED_COLORS.INFO,
                fields: [
                    {
                        name: "To evaluate:",
                        value: `\`\`\`js\n${args.join(" ")}\n\`\`\``,
                        inline: true
                    },
                    {
                        name: "Evaluated:",
                        value: `\`\`\`js\n${evaluated}\n\`\`\``,
                        inline: false
                    },
                    {
                        name: "Type of:",
                        value: typeof(evaluated),
                        inline: false
                    }
                ],
                footer: {
                    text: "MKChat Bot",
                    icon_url: bot.user.avatarURL
                }
            }
        });
    },
    meta: {
        name: "eval",
        aliases: [],
        description: "Evaluates code."
    }
};
