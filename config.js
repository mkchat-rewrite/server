module.exports = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || "0.0.0.0",
    PROXY_URL: "https://proxy.mkchat.app",
    BOT_TOKEN: "NjMzMTA1NTM5MDU5OTQxMzc2.XaPHuQ.M96YqKWL-uhEQYxPRqjexZEry84",
    BOT_PREFIX: "m?",
    JOIN_WEBHOOK_URL: "https://discord.com/api/webhooks/835669251528196119/vKlakXl4BHSyutAJfzs-sKLrI_TRSumSmIrRf1lkmn-yKpZisonuL4xy2hR5iFiSBUhj",
    ACTION_WEBHOOK_URL: "https://discord.com/api/webhooks/952632241614389328/pk72IH7eAsxfkCxh6zQYuj4NkqZWxxr5hlCE5MlMBZDUP9yo6zJmXnchUfeUTQy5dLEv",
    MODERATION_PASSWORD: "eviternity2callithumpian8l0llygag7",
    ROOMS: {
        "575106582593929236": "main",
        "698007321829179453": "main2",
        "698007976148992140": "chill",
        "697031279107112980": "mks-room",
        "698049799454457877": "gaming",
        "698050362275397643": "rp"
    },
    CHANNELS: {
        "main": "575106582593929236",
        "main2": "698007321829179453",
        "chill": "698007976148992140",
        "mks-room": "697031279107112980",
        "gaming": "698049799454457877",
        "rp": "698050362275397643"
    },
    MOD_IDS: [
        "908900960791834674",
        "198439918647771136",
        "562424110089764914",
        "644811269123211272",
        "555892702844157972",
        "172664698091601920"
    ],
    EMBED_COLORS: {
        INFO: 0x449cf8,
        SUCCESS: 0x00C059,
        ERROR: 0xFF3333
    },
    EMBED_COLOR_STRINGS: {
        INFO: "#449cf8",
        SUCCESS: "#00C059",
        ERROR: "#FF3333"
    },
    DATABASE: {
        URL: "https://oyzzthycfrqozzbmcjry.supabase.co",
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95enp0aHljZnJxb3p6Ym1janJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDYxNzIzNTEsImV4cCI6MTk2MTc0ODM1MX0.uQ8FBwH0EKZ7RyMgOQs7vAVJhXL0txDBoLe4IZTcIRo",
        TABLE: "bans"
    }
};
