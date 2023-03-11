/*
* TODO: move most of the auth handling stuff to server
*/

const SERVER_URL = window.location.host;
const ws = new WebSocket(`wss://${SERVER_URL}/moderation`);
const params = Object.fromEntries((new URLSearchParams(window.location.search)).entries());

if (params?.code) {
    window.sessionStorage.setItem("discordAuthorizationCode", params.code);
    window.location.replace(location.pathname);
};

ws.onopen = async () => {
    console.log("Connected to moderation dashboard websocket");

    ws.send(JSON.stringify({ type: "requestusersupdate" }));
    ws.send(JSON.stringify({ type: "requestbansupdate" }));
};

ws.onmessage = async msg => {
    const message = JSON.parse(msg.data);

    switch (message.type) {
        case "success":
            console.log(message.content);
            break;
        case "error":
            console.log(message.content);
            break;
        case "updateuserlist":
            await loadUsers(message.data);
            break;
        case "updatebanlist":
            await loadBans(message.data);
            break;
        default:
            break;
    };

    console.log("DEBUG: ", message);
};

ws.onclose = () => {
    console.log("Websocket connection closed");
};

const navBtns = document.querySelectorAll("#nav .btn");
const tabs = document.getElementsByClassName("tab");

console.log(tabs, navBtns);

for (let i = 0; i < navBtns.length; i++) {
    const btn = navBtns[i];

    btn.onclick = () => {
        for (let j = 0; j < navBtns.length; j++) {
            navBtns[j].classList.remove("active");
            if (tabs[j]) tabs[j].classList.add("invisible");
        };

        btn.classList.add("active");
        if (tabs[i]) tabs[i].classList.remove("invisible");
    };
};

async function loadUsers(users) {
    const data = document.getElementById("users");
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

async function loadBans(bans) {
    const data = document.getElementById("bans");
    data.innerText = "";

    for (const ban of bans) {
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
        ipValue.innerText = ban.ip;

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
        nameValue.innerText = ban.username;

        /* -- reason -- */

        const reasonField = document.createElement("div");
        entryData.appendChild(reasonField);
        reasonField.classList.add("field-value");

        const reasonLabel = document.createElement("span");
        reasonField.appendChild(reasonLabel);
        reasonLabel.classList.add("field");
        reasonLabel.innerText = "Reason: ";

        const reasonValue = document.createElement("span");
        reasonField.appendChild(reasonValue);
        reasonValue.classList.add("value");
        reasonValue.innerText = ban.reason;

        /* -- length -- */

        const lengthField = document.createElement("div");
        entryData.appendChild(lengthField);
        lengthField.classList.add("field-value");

        const lengthLabel = document.createElement("span");
        lengthField.appendChild(lengthLabel);
        lengthLabel.classList.add("field");
        lengthLabel.innerText = "Length: ";

        const lengthValue = document.createElement("span");
        lengthField.appendChild(lengthValue);
        lengthValue.classList.add("value");
        lengthValue.innerText = ban.length;

        /* -- ban date -- */

        const dateField = document.createElement("div");
        entryData.appendChild(dateField);
        dateField.classList.add("field-value");

        const dateLabel = document.createElement("span");
        dateField.appendChild(dateLabel);
        dateLabel.classList.add("field");
        dateLabel.innerText = "Ban Date: ";

        const dateValue = document.createElement("span");
        dateField.appendChild(dateValue);
        dateValue.classList.add("value");
        dateValue.innerText = ban.date;

        const unbanBtn = document.createElement("button");
        unbanBtn.classList.add("btn");
        unbanBtn.classList.add("btn-primary");
        unbanBtn.classList.add("btn-full");
        unbanBtn.innerText = "Revoke Ban";

        entry.appendChild(unbanBtn);
    };
};