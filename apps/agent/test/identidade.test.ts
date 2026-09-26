import assert from "node:assert/strict";
import test from "node:test";
import { idValido } from "@powerfarm/contract";
import { idDaPorta, idDoMcp, idDoProjeto, idDoServico, servicoConhecido } from "../agent/lib/coleta/identidade.ts";

const AGENTE = "app.powerfarm.agente";

test("serviços que a casa conhece viram o id oficial do Registry", () => {
  assert.equal(idDoServico("com.project-manhattan.daemon", "lab-8gb", AGENTE, "pf.host-runner.lab-8gb"), "pf.process.manhattan");
  assert.equal(idDoServico("work.minilab.antenna", "lab-8gb", AGENTE, "pf.host-runner.lab-8gb"), "pf.antenna");
  assert.equal(idDoServico(AGENTE, "lab-8gb", AGENTE, "pf.host-runner.lab-8gb"), "pf.host-runner.lab-8gb");
  assert.equal(servicoConhecido("com.project-manhattan.agent", AGENTE), true);
  assert.equal(servicoConhecido("work.minilab.mistral-bus-bridge", AGENTE), false);
});

test("o resto vira um id local da máquina, sempre no formato do Registry", () => {
  const ids = [
    idDoServico("work.minilab.mistral-bus-bridge", "lab-8gb", AGENTE, "x"),
    idDoServico("CMIOExtension.com.emeet.studio.next.mac-camera-extension", "lab-256", AGENTE, "x"),
    idDoServico("0x600003.anonymous.Café", "lab-256", AGENTE, "x"),
    idDaPorta("lab-256", 8088),
    idDoMcp("MCP_DOCKER"),
    idDoMcp("---"),
    idDoProjeto("lab-512", "Coloured Places (cópia) 2"),
  ];
  assert.equal(ids[0], "pf.lab-8gb.servico.work-minilab-mistral-bus-bridge");
  assert.equal(ids[3], "pf.lab-256.porta.8088");
  assert.equal(ids[4], "pf.mcp.mcp-docker");
  for (const id of ids) assert.ok(idValido(id), id);
});
