window.onload = async () => {
    const pass = localStorage.getItem("password");
    await login(pass);
};

let viewingUsers = false;

const toggle = document.getElementById("toggle");
toggle.onclick = async () => {
    const pass = localStorage.getItem("password");

    if (viewingUsers) {
        await loadBans(pass);
        toggle.innerText = "View Users";
    } else {
        await loadUsers(pass);
        toggle.innerText = "View Bans";
    };
};

const loginEl = document.getElementById("login");

loginEl.onsubmit = async e => {
    e.preventDefault();

    const pass = document.getElementById("password").value;

    const valid = await login(pass);
    if (!valid) window.location.replace("/");
};

async function login(password) {
    const res = await fetch(`/modlogin?password=${password}`);

    if (res.status === 204) {
        localStorage.setItem("password", password);
        loginEl.style.display = "none";

        const users = await loadUsers(password);
        return true;
    } else {
        localStorage.removeItem("password");
        return false;
    };
};

async function loadUsers(password) {
    const res = await fetch(`/users?password=${password}`);
    const users = await res.json();

    const data = document.getElementById("data");
    data.innerText = "";

    const userlist = document.createElement("table");
    data.appendChild(userlist);

    const headerRow = document.createElement("tr");
    userlist.appendChild(headerRow);

    const ipTitle = document.createElement("th");
    headerRow.appendChild(ipTitle);
    ipTitle.innerText = "IP";

    const usernameTitle = document.createElement("th");
    headerRow.appendChild(usernameTitle);
    usernameTitle.innerText = "Username";

    const idTitle = document.createElement("th");
    headerRow.appendChild(idTitle);
    idTitle.innerText = "ID";

    for (const user of users) {
        const tr = document.createElement("tr");
        userlist.appendChild(tr);
        tr.onclick = () => {
            openBanModal(user.username, user.ip);
        };
            
        const ip = document.createElement("td");
        tr.appendChild(ip);
        ip.classList.add("user-entry");
        ip.innerText = user.ip;

        const username = document.createElement("td");
        tr.appendChild(username);
        username.classList.add("user-entry");
        username.innerText = user.username;

        const id = document.createElement("td");
        tr.appendChild(id);
        id.classList.add("user-entry");
        id.innerText = user.id;
    };

    viewingUsers = true;
};

async function loadBans(password) {
    const res = await fetch(`/bans?password=${password}`);
    const bans = await res.json();

    const data = document.getElementById("data");
    data.innerText = "";

    const banlist = document.createElement("table");
    data.appendChild(banlist);

    const headerRow = document.createElement("tr");
    banlist.appendChild(headerRow);

    const ipTitle = document.createElement("th");
    headerRow.appendChild(ipTitle);
    ipTitle.innerText = "IP";

    const usernameTitle = document.createElement("th");
    headerRow.appendChild(usernameTitle);
    usernameTitle.innerText = "Username";

    const reasonTitle = document.createElement("th");
    headerRow.appendChild(reasonTitle);
    reasonTitle.innerText = "Reason";

    const lengthTitle = document.createElement("th");
    headerRow.appendChild(lengthTitle);
    lengthTitle.innerText = "Length";

    const dateTitle = document.createElement("th");
    headerRow.appendChild(dateTitle);
    dateTitle.innerText = "Ban Date";

    for (const ban of bans) {
        const tr = document.createElement("tr");
        banlist.appendChild(tr);
        tr.onclick = () => {
            openUnbanModal(ban.ip);
        };

        const ip = document.createElement("td");
        tr.appendChild(ip);
        ip.classList.add("ban-entry");
        ip.innerText = ban.ip;
    
        const username = document.createElement("td");
        tr.appendChild(username);
        username.classList.add("ban-entry");
        username.innerText = ban.username;

        const reason = document.createElement("td");
        tr.appendChild(reason);
        reason.classList.add("ban-entry");
        reason.innerText = ban.reason;
    
        const length = document.createElement("td");
        tr.appendChild(length);
        length.classList.add("ban-entry");
        length.innerText = ban.length;

        const date = document.createElement("td");
        tr.appendChild(date);
        date.classList.add("ban-entry");
        date.innerText = ban.date;
    };

    viewingUsers = false;
};

async function openBanModal(username, ip) {
    //document.getElementById("ban-modal").classList.remove("invisible");

    //todo: use local time of moderator to make ban date more accurate

    const res = await fetch(`/doban?password=e&username=${username}&ip=${ip}&reason=generic&length=forever`);
    if (res.status != 204) return tata.error("Failed", `Cannot ban ${ip} due to reason: ${await res.text()}`);

    tata.success("Success", `Successfully banned: ${ip}!`);
};

async function openUnbanModal(ip) {
    //document.getElementById("unban-modal").classList.remove("invisible");

    const res = await fetch(`/unban?password=e&ip=${ip}`);
    if (res.status != 204) return tata.error("Failed", `Cannot unban ${ip} due to reason: ${await res.text()}`);

    tata.success("Success", `Successfully unbanned: ${ip}!`);
};

const closeBtns = document.getElementsByClassName("close");
for (const btn of closeBtns) {
    btn.addEventListener("click", event =>  {
        event.target.parentNode.parentNode.parentNode.classList.add("invisible");
    });
};