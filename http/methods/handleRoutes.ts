import { HttpRouter } from "../index.ts";

export function handleRoutes(req: Request, router: HttpRouter): Response {
    return new Response("Not Found", { status: 404 });
};