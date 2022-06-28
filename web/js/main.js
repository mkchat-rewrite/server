(async () => {
    let motd;
    try {
        const res = await fetch("//motd.mkchat.app/");
        motd = await res.text();
    } catch {
        motd = "<3";
    };
    document.getElementById("motd").innerHTML = motd;
})();

const searchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(searchParams.entries());
document.getElementById("room").value = params.defaultroom || "main";