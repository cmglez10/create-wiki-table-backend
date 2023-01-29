import Cheerio from "cheerio";
import axios from "axios";

const BASE_URL = "https://www.futbol-regional.es/competicion.php?"

export class Scrap {
  $: cheerio.Root;

  async fetch(competition: string) {
    const html = await axios(BASE_URL + competition);
    this.$ = Cheerio.load(await html.data);
    // this.getTeams();
    return html.data;
  }

  getTeams() {
    const teams = this.$('.tablagen .filanth-child(3)')
    console.log('getTeams', teams)
  }
}