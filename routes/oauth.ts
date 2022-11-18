import { Hono } from "https://deno.land/x/hono@v2.5.1/mod.ts";

const router = new Hono();

router.post("/oauth/account/register", async ctx => {
    
});

export { router as oauthRouter };