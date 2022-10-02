// TODO: use a Set instead of an array to store registered routes

export interface RouterOptions {

};

type HttpMethod = "get" | "head" | "post" | "put" | "delete" | "options" | "patch";
type RequestHandler = (req: Request) => Response;

export interface Route {
    method: HttpMethod,
    route: string,
    handler: RequestHandler
};

export interface HttpRouter {
    routes: Set<Route>
};

export function createRouter(opts: RouterOptions): HttpRouter {
    const routes = new Set<Route>();
    return { routes } as HttpRouter;
};

export { handleRoutes } from "./methods/handleRoutes.ts";
export { register } from "./methods/register.ts";