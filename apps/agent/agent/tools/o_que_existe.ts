import { defineTool } from "eve/tools";
import { z } from "zod";
import { inventario } from "#lib/coleta/inventario.ts";
import { COMUM, MAQUINA } from "#lib/maquina.gerada.ts";

export default defineTool({
  description:
    "Olha AGORA o que existe neste computador: serviços do launchd (rodando ou parados, e os caseiros que não deveriam existir), portas abertas e de quem são, MCPs configurados em cada IA e projetos que usam MCP, containers, pastas na raiz e projetos. Só leitura. Use o filtro de tipo para respostas curtas.",
  inputSchema: z.object({
    tipo: z.enum(["service", "porta", "mcp", "container", "pasta", "projeto", "machine"]).optional().describe("Só um tipo de coisa"),
    so_problemas: z.boolean().optional().describe("Só o que não deveria existir"),
  }),
  async execute({ tipo, so_problemas }) {
    const agora = new Date().toISOString();
    const itens = await inventario({
      maquina: MAQUINA.maquina,
      registryDoAgente: MAQUINA.registry,
      rotuloDoAgente: COMUM.rotulo_do_agente,
      home: process.env.HOME ?? "/",
      agora,
    });
    const filtrados = itens.filter((i) => (!tipo || i.tipo === tipo) && (!so_problemas || i.proibido));
    return { maquina: MAQUINA.maquina, vistoEm: agora, total: filtrados.length, itens: filtrados.map(({ vistoEm: _v, maquina: _m, ...resto }) => resto) };
  },
});
