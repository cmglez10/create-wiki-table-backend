import Koa from "koa";
import Router from "koa-router";
import Cheerio from "cheerio";
import axios from "axios";

const app: Koa = new Koa();
const router = new Router();

router.get("/analyze/:url", async (ctx: Koa.Context) => {
  const url: string = ctx.params.url;
  const html: Response = await axios(url);
  const $ = Cheerio.load(await html.text());
  // Analizar el html con Cheerio
});

app.use(router.routes());
app.use(router.allowedMethods());
