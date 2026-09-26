import { defineSchedule } from "eve/schedules";
import { rodadaDeInventario } from "#lib/rodadas.ts";

// A cada 15 minutos: tudo o que existe neste LAB (serviços, portas, MCPs, projetos, pastas). Sem modelo.
export default defineSchedule({
  cron: "*/15 * * * *",
  run({ waitUntil }) {
    waitUntil(rodadaDeInventario());
  },
});
