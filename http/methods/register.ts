import { Route, HttpRouter } from "../index.ts";

interface RouteOptions extends Route {
    router: HttpRouter
};

export function register({ router, method, route, handler }: RouteOptions) {
    router.routes.push({ method, route, handler });
};