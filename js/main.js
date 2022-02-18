(async () => {
    const res = await fetch("//mkmotd.glitch.me/");
    const data = await res.text();
    document.getElementById("motd").innerHTML = data;
})();

const searchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(searchParams.entries());
document.getElementById("room").value = params.defaultroom || "main";