module.exports = {
    exec: (bot, message, args, config, users) => {
        bot.createMessage(message.channel.id, "pong");
    },
    meta: {
        name: "ping",
        aliases: [ "pong" ],
        description: "Simple ping command."
    }
};