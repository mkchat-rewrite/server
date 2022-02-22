module.exports = {
    exec: (/* pass args */) => {
        console.log("ping"); //
    },
    meta: {
        name: "ping",
        aliases: [ "pong" ],
        description: "Simple ping command."
    }
};
