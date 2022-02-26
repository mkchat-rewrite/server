(async () => {
    const res = await fetch("//motd.mkchat.app/");
    const data = await res.text();
    document.getElementById("motd").innerHTML = data;
})();

const searchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(searchParams.entries());
document.getElementById("room").value = params.defaultroom || "main";