/*
* TODO: move most of the auth handling stuff to server
*/

const params = Object.fromEntries((new URLSearchParams(window.location.search)).entries());
if (params?.code) {
    const accessToken = await authenticate(params.code);
    const userId = await fetchUserId(accessToken);

    alert(`Your user id is ${userId}`);
};

async function authenticate(authorizationCode) {
    const client = { id: "991058964592615494", secret: "zA7cJPlBh61kcNenFLzMKGDg9hofG-9T" };
    const credentials = btoa(`${client.id}:${client.secret}`);

    const res = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${credentials}`
        },
        body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=https://mkchat.app/moderation`
    });
    const { access_token } = await res.json();

    return access_token;
};

async function fetchUserId(token) {
    const res = await fetch("https://discord.com/api/users/@me", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    const { id } = await res.json();

    return BigInt(id);
};

document.getElementById("btn-login").onclick = () => {
    window.location.replace("https://discord.com/api/oauth2/authorize?client_id=991058964592615494&redirect_uri=https%3A%2F%2Fmkchat.app%2Fmoderation&response_type=code&scope=identify");
};