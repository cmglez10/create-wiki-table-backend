import Koa from "koa";
import Router from "koa-router";
import cors from "@koa/cors";
import { Scrap } from "./src/scrap";

const app: Koa = new Koa();
const router = new Router();
app.use(cors());
const scrap = new Scrap();

router
  .get("/league/:leagueId", async (ctx: Koa.Context) => {
    const leagueId: string = ctx.params.leagueId;
    const res = await scrap.fetchLeague(leagueId);
    ctx.body = res;
  })
  .get("/playoff/:playoffId", async (ctx: Koa.Context) => {
    const playoffId: string = ctx.params.playoffId;
    const res = await scrap.fetchPlayoff(playoffId);
    ctx.body = res;
  });

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
