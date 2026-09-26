import { defineTool } from "eve/tools";
import { z } from "zod";
import { coletarSinais } from "#lib/rodadas.ts";

export default defineTool({
  description:
    "Mede AGORA os sinais vitais: disco, memória, carga, internet, túneis, Manhattan e, no principal e na reserva, o Supabase e os apps na nuvem. Cada sinal diz ok, olhar ou desconhecido e o que foi medido. Só leitura.",
  inputSchema: z.object({}),
  async execute() {
    return { sinais: await coletarSinais() };
  },
});
