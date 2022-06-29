(async () => {
    let motd;
    try {
        const res = await fetch("//motd.mkchat.app/");
        if (res.status <= 400) throw("");
    } catch {
        motd = "<a href='https://discord.gg/GbWngkTSZg'>Join Our Discord! <3</a>";
    };
    document.getElementById("motd").innerHTML = motd;
})();

const searchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(searchParams.entries());
document.getElementById("room").value = params.defaultroom || "main";