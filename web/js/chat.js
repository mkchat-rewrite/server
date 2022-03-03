const SERVER_URL = window.location.host;
const ws = new WebSocket(`ws://${SERVER_URL}`);

ws.onopen = () => {
    logger.info("Websocket Connection Opened");
};

const searchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(searchParams.entries());

if (!params.name || !params.room) window.location.replace("/");

ws.onmessage = msg => {
    const message = JSON.parse(msg.data);
    switch (message.type) {
        case "connect":
            const id = message.id;

            fetch(`http://${SERVER_URL}/join/${id}?name=${params.name}&room=${params.room}`).then(res => res.text()).then(data => {
                if (data != "ok") return disconnect(data);

                ws.send(JSON.stringify({ type: "join" }));
                tata.success("Joined", `You have successfully joined room ${params.room}!`);
            });
            setInterval(() => ws.send(JSON.stringify({ type: "ping" })), 5000);
            break;
        case "message":
            console.log("new chat message recieved: ", message);
            appendMessage(message);
            autoScroll();
            break;
        case "updateusers":
            const userlist = document.getElementById("userlist");
            userlist.innerText = "";

            for (const user of message.users) {
                const el = document.createElement("div");
                userlist.appendChild(el);
                el.classList.add("user");
                el.innerText = user;
            };
            break;
        default:
            break;
    };
};

ws.onclose = e => {
    logger.error("Websocket Connection Closed");
    
    switch(e.reason) {
        case "banned":
            disconnect(e.reason, false);
            break;
        default:
            disconnect(null, true);
            break;
    };
};

function disconnect(reason, rejoin) {
    tata.error(`Disconnected!`, reason ? `With reason: ${reason}` : "You will automatically reload in 5 seconds.");
    setTimeout(() => {
        if (rejoin) return window.location.reload(true);

        window.location.replace("/");
    }, 5000);
};

const messagelist = document.getElementById("messagelist");

function appendMessage(message) {
    const messageEl = document.createElement("div");
    messagelist.appendChild(messageEl);
    messageEl.classList.add("message");

    const avatar = document.createElement("img");
    messageEl.appendChild(avatar);
    avatar.classList.add("avatar");
    avatar.src = message.avatar || getAvatar(message.author);
            
    const author = document.createElement("div");
    messageEl.appendChild(author);
    author.classList.add("author");
    author.style.color = getColor(message.author);
    author.innerText = message.author;
            
    const badge = document.createElement("span");
    if (message.badge) author.appendChild(badge);
    badge.classList.add("badge");
    badge.innerText = message.badge;

    const time = new Date(message.date).toLocaleTimeString("en-US", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).replace(/:[0-9]{2} /g, " ");
    
    const timestamp = document.createElement("span");
    author.appendChild(timestamp);
    timestamp.classList.add("timestamp");
    timestamp.innerText = time;
            
    const content = document.createElement("div");
    messageEl.appendChild(content);
    content.classList.add("content");
            
    const text = document.createElement("p");
    content.appendChild(text);
    text.classList.add("text");
    text.innerHTML = message.text;

    if (!message.sticker) return;

    if (message.sticker.type === 1) {
        const sticker = document.createElement("img");
        content.appendChild(sticker);
        sticker.classList.add("sticker");
        sticker.src = message.sticker.url;
    } else {
        const sticker = document.createElement("lottie-player");
        content.appendChild(sticker);
        sticker.classList.add("sticker");
        sticker.src = message.sticker.url;
        sticker.background = "transparent";
        sticker.speed = "1";
        sticker.autoplay = true;
        sticker.loop = true;
    };
};

document.getElementById("msgbox").onsubmit = e => {
    e.preventDefault();

    const send = document.getElementById("send");
    const msg = document.getElementById("msg");

    send.disabled = true;
    setTimeout(() => send.disabled = false, 3000);

    if (!msg.value) return;

    ws.send(JSON.stringify({
        type: "message",
        text: msg.value
    }));

    msg.value = "";
};

function autoScroll() {
    messagelist.scrollTo(0, messagelist.scrollHeight);
};

function getColor(user) {
    const colors = [
        "#e21400", "#91580f", "#f8a700", "#f78b00",
        "#58dc00", "#287b00", "#a8f07a", "#4ae8c4",
        "#8b008b", "#00ffff", "#ff00ff", "#9370db",
        "#184cff", "#dd7b00", "#18f07a", "#fae8c4",
        "#d100cd", "#d10049", "#6800d1", "#0080d1",
        "#7382c6", "#cc0170", "#3fc7ce", "#5be24a",
        "#3b88eb", "#3824aa", "#a700ff", "#d300e7",
        "#f34b14", "#e53709", "#4cff81", "#eec9ef",
        "#ff0000", "#e489f4", "#88929a", "#ffffff",
        "#8a036c", "#fc82e1", "#b2ea41", "#01c94a",
        "#80feae", "#000fff", "#afb2cf", "#5328be",
        "#0521f5", "#2a75c0", "#20cb3f", "#30f0f3",
        "#28c1dc", "#8b52ff", "#d51034", "#dce779",
        "#ba91d4", "#ed4321", "#39acfe", "#02f206",
        "#ffe706", "#00ff00", "#0000ff", "#deaded"
    ];
    
    let hash = user.length;
    for (let i = 0; i < user.length; i++) {
       hash = user.charCodeAt(i) + (hash << 5) - hash;
    };

    const index = Math.abs(hash % colors.length);
    return colors[index];
};

function getAvatar(user) {
    const color = getColor(user);

    return `https://proxy.mkchat.app/genericavatars/${user}.svg?b=${color.replace("#", "%23")}`;
    // 🎲🐻
};

function toggleModal() {
    document.querySelector(".modal").classList.toggle("invisible");
};

const closeBtns = document.getElementsByClassName("close");
for (const btn of closeBtns) {
    btn.addEventListener("click", event =>  {
        event.target.parentNode.parentNode.parentNode.classList.add("invisible");
    });
};

const navBtns = document.getElementsByClassName("btn-modal-nav");
for (const btn of navBtns) {
    btn.addEventListener("click", event =>  {
        for (const btnAgain of navBtns) {
            btnAgain.classList.remove("btn-active");
        };
        
        btn.classList.add("btn-active");
    });
};

function joinVideo() {
    window.open(`/vc/#${params.room}`, "_blank");
};