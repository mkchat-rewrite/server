import { Route } from "../index.ts";

interface RouteOptions extends Route {
    router: HttpRouter,
    method: HttpMethod,
    route: string,
    handler: RequestHandler
};

export function register(opts: RouteOptions) {

};