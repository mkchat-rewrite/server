const defaultColor = { r: 68, g: 156, b: 248 };

if (!localStorage.getItem("accent")) localStorage.setItem("accent", JSON.stringify(defaultColor));

const color = JSON.parse(localStorage.getItem("accent"));
applyColor(color);

function applyColor(color) {
    document.documentElement.style.setProperty("--accent-r", color.r);
    document.documentElement.style.setProperty("--accent-g", color.g);
    document.documentElement.style.setProperty("--accent-b", color.b);
    localStorage.setItem("accent", JSON.stringify(color));
};

function hexToRgb(hex) {
    const color = hex.slice(1, 7).match(/.{1,2}/g);
    return {
        r: parseInt(color[0], 16),
        g: parseInt(color[1], 16),
        b: parseInt(color[2], 16)
    };
};

function rgbToHex(rgb) {
    const color = rgb.slice(4, rgb.length-1).split(", ");
    const hex = color.map(i => {
        i = parseInt(i).toString(16);
        return i.length === 1 ? `0${i}` : i;
    });
    return `#${hex.join("")}`;
};