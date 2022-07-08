export default Object.freeze({
    TOKEN: "OTkxMDU4OTY0NTkyNjE1NDk0.GTU5lJ.u8lCnPz2cjCA8_e3ztKKj-AaHZ3thEGrxop3rA",
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || "0.0.0.0",
    PROXY_URL: "https://rail-proxy.mkchat.app",
    BOT_PREFIX: "m?",
    JOIN_WEBHOOK_URL: "https://discord.com/api/webhooks/991068364648628234/kSUVEGyGaRr8oytbbtEFJNAq8ISdaF-f8M_YKaqMvV32LZ-ivwGWv2ATobOBK0-3MrQO",
    ACTION_WEBHOOK_URL: "https://discord.com/api/webhooks/991068566021341185/Xv4alF0JL6vK8ayyU09LAZY8gi2gZjWI5JqXgcYi-ApCye7Yj7_4cQQKZvNJ0wLG13RO",
    MODERATION_PASSWORD: "wrinse4riboli<meatablesg{droidn)lopes",
    ROOMS: {
        "991040161141895238": "main",
        "991040184638394418": "main2",
        "991040217899233402": "chill",
        "991040263591964682": "gaming",
        "991040289730867250": "rp"
    },
    CHANNELS: {
        "main": "991040161141895238",
        "main2": "991040184638394418",
        "chill": "991040217899233402",
        "gaming": "991040263591964682",
        "rp": "991040289730867250"
    },
    MOD_IDS: [
        908900960791834674n,
        198439918647771136n,
        644811269123211272n
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
    ROLE_IDS: {
        MODERATION: 991042137799921707n,
        CHAT_USER: 991068852026753054n,
        CHAT_BAN: 991069045283508274n,
        CHAT_PING: 966149524202594335n
    },
    ROLE_REACTIONS: [
        {
            messageId: 991183011120939031n,
            emojiId: 991180598079143957n, // mkchat access ig
            roleId: 991068852026753054n
        },
        {
            messageId: 991183047972102174n,
            emojiId: 991180573261447258n, // mkchat announcements
            roleId: 991181784308002846n
        }
    ],
    DATABASE: {
        URL: "https://crhqywhiclgkpiblerkf.supabase.co",
        KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyaHF5d2hpY2xna3BpYmxlcmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTY1MjczMTgsImV4cCI6MTk3MjEwMzMxOH0.p8_SEs-jFbxXmr55o9sN9fc1x8GWjsrxMo7NhQK7QGI",
        TABLE: "bans"
    }
});
