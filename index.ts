import Koa from "koa";
import Router from "koa-router";
import cors from "@koa/cors";
import { Scrap } from "./src/scrap";

const app: Koa = new Koa();
const router = new Router();
app.use(cors());
const scrap = new Scrap();

router
  .get("/health", async (ctx: Koa.Context) => {
    ctx.body = "<h1>Healthy</hh1>"
  })
  .get("/league/:leagueId/section/:section", async (ctx: Koa.Context) => {
    const leagueId: string = ctx.params.leagueId;
    const section: string = ctx.params.section;
    const res = await scrap.fetchLeague(leagueId, section);
    ctx.body = res;
  })
  .get("/playoff/:playoffId", async (ctx: Koa.Context) => {
    const playoffId: string = ctx.params.playoffId;
    const res = await scrap.fetchPlayoff(playoffId);
    ctx.body = res;
  })
  .get("/results/:federation/:group/:year/:section", async (ctx: Koa.Context) => {
    const section = ctx.params.section !== "m" ? ctx.params.section : "";
    const res = await scrap.fetchResults(ctx.params.federation, ctx.params.group, ctx.params.year, section);
    ctx.body = res;  
  });

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
