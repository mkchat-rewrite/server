// TODO: use a Set instead of an array to store registered routes

export interface RouterOptions {

};

type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "options" | "patch";
type RequestHandler = (req: Request) => unknown;

export interface Route {
    method: HttpMethod,
    route: string,
    handler: RequestHandler
};

export interface HttpRouter {
    routes: Route[]
};

export function createRouter(opts: RouterOptions): HttpRouter {
    return { routes: [ {} as Route ] } as HttpRouter;
};

export { handleRoutes } from "./methods/handleRoutes.ts";
export { register } from "./methods/register.ts";