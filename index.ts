import { bodyParser } from "@koa/bodyparser";
import cors from "@koa/cors";
import Koa from "koa";
import Router from "koa-router";
import { Scrap } from "./src/scrap";

const app: Koa = new Koa();
app.use(cors());

const router = new Router();
app.use(bodyParser());
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
  .get("/playoff/:playoffId/section/:section", async (ctx: Koa.Context) => {
    const playoffId: string = ctx.params.playoffId;
    const section: string = ctx.params.section;
    const res = await scrap.fetchPlayoff(playoffId, section);
    ctx.body = res;
  })
  .get("/results/:groupId/section/:section", async (ctx: Koa.Context) => {
    const res = await scrap.fetchResults(ctx.params.groupId, ctx.params.section);
    ctx.body = res;  
  })
  .post("/records/section/:section", async (ctx: Koa.Context) => {
    const body = ctx.request.body;
    const section: string = ctx.params.section;
    const res = await scrap.fetchRecordsFromManyGroups(body.groupIds, section);
    ctx.body = res;
  })
  .post("/participants/section/:section", async (ctx: Koa.Context) => {
    const body = ctx.request.body;
    const section: string = ctx.params.section;
    const res = await scrap.fetchParticipantsFromManyGroups(body.groupIds, section);
    ctx.body = res;
  });

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3003);
