const time = new Date().toLocaleTimeString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

const logger = {
    info: str => {
        console.log(`%c[${time}] [INF] ${str}`, "color: #ffffff; background: #45BEA4; padding: .5rem; border-radius: .3rem; font-family: 'Lucida Console', monospace;");
    },
    error: str => {
        console.log(`%c[${time}] [ERR] ${str}`, "color: #ffffff; background: #BE454F; padding: .5rem; border-radius: .3rem; font-family: 'Lucida Console', monospace;");
    }
};