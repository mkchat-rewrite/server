export function tryParseJson(str: string) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    };
};