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

export function createRouter(): HttpRouter {
    return { routes: [ {} as Route ] } as HttpRouter;
};

export { handleRoutes } from "./methods/handleRoutes.ts";
export { register } from "./methods/register.ts";