import { defineTool } from "eve/tools";
import { z } from "zod";
import { lerEstado } from "#lib/estado.ts";
import { MAQUINA } from "#lib/maquina.gerada.ts";

export default defineTool({
  description:
    "Mostra o perfil deste agente (máquina, papel, lugares) e o estado atual do computador: disco, memória, há quanto tempo está ligado e quantos itens há em cada uma das 4 pastas. Só leitura.",
  inputSchema: z.object({}),
  async execute() {
    return { perfil: MAQUINA, estado: lerEstado() };
  },
});
