module.exports = {
    exec: (bot, message, args, config, users) => {
        const room = args.join(" ");
        
        bot.createMessage(message.channel.id, {
            embed: {
                color: config.EMBED_COLORS.INFO,
                description: `There are currently ${room ? users.list(room).length : users.size} users connected to ${room ? "room: " + room : "mkchat"}`
            }
        });
    },
    meta: {
        name: "users",
        aliases: [ "users" ],
        description: "Shows the number of users currently connected to mkchat."
    }
};