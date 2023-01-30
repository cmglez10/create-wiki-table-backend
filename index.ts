import Koa from "koa";
import Router from "koa-router";
import cors from "@koa/cors";
import { Scrap } from "./src/scrap";

const app: Koa = new Koa();
const router = new Router();
app.use(cors());
const scrap = new Scrap();

router.get("/analyze/:url", async (ctx: Koa.Context) => {
  const url: string = ctx.params.url;

  const res = await scrap.fetch(url);

  ctx.body = res;
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
