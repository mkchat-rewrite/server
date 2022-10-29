import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";
import { HttpRouter } from "../index.ts";

export async function handleRoutes(req: Request, router: HttpRouter): Promise<Response> {
    const path = `/${req.url.split("/").filter((_v, i) => i > 2).join("/")}`;

    for (const route of router.routes) {
        const pattern = pathToRegexp(route.route);
        const match = pattern.exec(path);

        if (match && req.method === route.method) {
            const res = await route.handler(req);
            res.headers.set("Access-Control-Allow-Origin", "*");
            res.headers.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            return res;
        };
    };

    return new Response("Not Found", { status: 404 });
};