import { defineSchedule } from "eve/schedules";
import { rodadaDeSinais } from "#lib/rodadas.ts";

// A cada minuto: sinais vitais deste LAB (e da nuvem, no principal e na reserva). Sem modelo, sem custo.
export default defineSchedule({
  cron: "* * * * *",
  run({ waitUntil }) {
    waitUntil(rodadaDeSinais());
  },
});
