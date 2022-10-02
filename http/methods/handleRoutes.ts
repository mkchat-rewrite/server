import { pathToRegexp } from "https://deno.land/x/path_to_regexp@v6.2.1/index.ts";
import { HttpRouter } from "../index.ts";

export function handleRoutes(req: Request, router: HttpRouter): Response {
    const path = `/${req.url.split("/").filter((_v, i) => i > 2).join("/")}`;

    for (const route of router.routes) {
        const pattern = pathToRegexp(route.route);
        const match = pattern.exec(path);

        if (match) {
            return route.handler(req);
        };
    };

    return new Response("Not Found", { status: 404 });
};