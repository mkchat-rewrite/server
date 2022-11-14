import { serve } from "https://deno.land/std@0.164.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v2.5.1/mod.ts";
import { createSocketHandler, broadcast, publish, subscribe, unsubscribe, Connection, SocketHandler } from "./modules/websocket/index.ts";
import { requestHandler } from "./methods/requestHandler.ts";

dotenv({ export: true });

const serv = new Hono();
const wss = createSocketHandler({
    uniqueIdLength: 16,
    events: {}
});

serv.get("/", ctx => ctx.text("(???) development server online."));

serv.post("/oauth/account/register", async ctx => {
    
});

serve(async (req: Request) => {
    return await requestHandler(req, serv.fetch, wss);
}, { port: Number(Deno.env.get("PORT")) ?? 3000 });

// note: all incoming post bodies MUST be json format, form data with not be accepted