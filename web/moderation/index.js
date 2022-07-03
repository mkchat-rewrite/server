/*
* TODO: move most of the auth handling stuff to server
*/

const SERVER_URL = "mkchat.app";
const ws = new WebSocket(`wss://${SERVER_URL}/moderation`);
const params = Object.fromEntries((new URLSearchParams(window.location.search)).entries());

if (params?.code) {
    window.sessionStorage.setItem("discordAuthorizationCode", params.code);
    window.location.replace(location.pathname);
};

ws.onmessage = async msg => {
    const message = JSON.parse(msg.data);

    switch (message.type) {
        case "connect":
            const pass = localStorage.getItem("password");
            await loadUsers(pass);
            break;
        case "success":
            break;
        case "error":
            break;
        default:
            break;
    };

    console.log(message);
};

async function loadUsers(password) {
    const res = await fetch(`https://${SERVER_URL}/users?password=${password}`);
    const users = await res.json();

    const data = document.getElementById("data");
    data.innerText = "";

    for (const user of users) {
        const entry = document.createElement("div");
        data.appendChild(entry);
        entry.classList.add("entry");

        const entryData = document.createElement("div");
        entry.appendChild(entryData);
        entryData.classList.add("entry-data");

        /* -- ip -- */

        const ipField = document.createElement("div");
        entryData.appendChild(ipField);
        ipField.classList.add("field-value");

        const ipLabel = document.createElement("span");
        ipField.appendChild(ipLabel);
        ipLabel.classList.add("field");
        ipLabel.innerText = "IP: ";

        const ipValue = document.createElement("span");
        ipField.appendChild(ipValue);
        ipValue.classList.add("value");
        ipValue.classList.add("ip-addr");
        ipValue.tabIndex = -1;
        ipValue.innerText = user.ip;

        /* -- name -- */

        const nameField = document.createElement("div");
        entryData.appendChild(nameField);
        nameField.classList.add("field-value");

        const nameLabel = document.createElement("span");
        nameField.appendChild(nameLabel);
        nameLabel.classList.add("field");
        nameLabel.innerText = "Username: ";

        const nameValue = document.createElement("span");
        nameField.appendChild(nameValue);
        nameValue.classList.add("value");
        nameValue.innerText = user.username;

        /* -- id -- */

        const idField = document.createElement("div");
        entryData.appendChild(idField);
        idField.classList.add("field-value");

        const idLabel = document.createElement("span");
        idField.appendChild(idLabel);
        idLabel.classList.add("field");
        idLabel.innerText = "ID: ";

        const idValue = document.createElement("span");
        idField.appendChild(idValue);
        idValue.classList.add("value");
        idValue.innerText = user.id;

        /* -------- */

        const banBtn = document.createElement("button");
        banBtn.classList.add("btn");
        banBtn.classList.add("btn-primary");
        banBtn.innerText = "Ban";

        if (user?.isDisconnected) {
            entry.appendChild(banBtn);
        } else {
            const btnGroup = document.createElement("div");
            entry.appendChild(btnGroup);
            btnGroup.classList.add("btn-group");
    
            const kickBtn = document.createElement("button");
            btnGroup.appendChild(kickBtn);
            kickBtn.classList.add("btn");
            kickBtn.classList.add("btn-primary");
            kickBtn.innerText = "Kick";
            kickBtn.onclick = () => ws.send(JSON.stringify({
                type: "kick",
                userId: user.id
            }));

            btnGroup.appendChild(banBtn);
        };
    };
};

// const params = Object.fromEntries((new URLSearchParams(window.location.search)).entries());
// if (params?.code) {
//     const accessToken = await authenticate(params.code);
//     const userId = await fetchUserId(accessToken);

//     alert(`Your user id is ${userId}`);
// };

// async function authenticate(authorizationCode) {
//     const client = { id: "991058964592615494", secret: "zA7cJPlBh61kcNenFLzMKGDg9hofG-9T" };
//     const credentials = btoa(`${client.id}:${client.secret}`);

//     const res = await fetch("https://discord.com/api/oauth2/token", {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/x-www-form-urlencoded",
//             "Authorization": `Basic ${credentials}`
//         },
//         body: `grant_type=authorization_code&code=${authorizationCode}&redirect_uri=https://mkchat.app/moderation`
//     });
//     const { access_token } = await res.json();

//     return access_token;
// };

// async function fetchUserId(token) {
//     const res = await fetch("https://discord.com/api/users/@me", {
//         headers: {
//             "Authorization": `Bearer ${token}`
//         }
//     });
//     const { id } = await res.json();

//     return BigInt(id);
// };

// document.getElementById("btn-login").onclick = () => {
//     window.location.replace("https://discord.com/api/oauth2/authorize?client_id=991058964592615494&redirect_uri=https%3A%2F%2Fmkchat.app%2Fmoderation&response_type=code&scope=identify");
// };