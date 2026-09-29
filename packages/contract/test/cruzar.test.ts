import assert from "node:assert/strict";
import test from "node:test";
import { cruzar, idPara, idValido, MCP_PROTOCOL_VERSION, slug, type Observado, type Registrado } from "../src/index.ts";

const agora = "2026-09-26T12:00:00Z";
const obs = (id: string, extra: Partial<Observado> = {}): Observado => ({
  id, tipo: "service", maquina: "lab-8gb", nome: id, vistoEm: agora, ...extra,
});
const reg = (id: string, kind = "service", retired_at: string | null = null): Registrado => ({ id, kind, title: id, retired_at });

test("as 4 situações", () => {
  const linhas = cruzar(
    [obs("powerfarm.process.manhattan"), obs("powerfarm.servico.lab-8gb.mcp-novo"), obs("powerfarm.search"), obs("powerfarm.servico.lab-8gb.plist-solto", { proibido: true })],
    [reg("powerfarm.process.manhattan", "process"), reg("powerfarm.antenna"), reg("powerfarm.search", "service", "2026-09-01T00:00:00Z"), reg("powerfarm.person.director", "person")],
  );
  const por = Object.fromEntries(linhas.map((l) => [l.id, l.situacao]));
  assert.equal(por["powerfarm.process.manhattan"], "registrado");
  assert.equal(por["powerfarm.antenna"], "faltando");
  assert.equal(por["powerfarm.servico.lab-8gb.mcp-novo"], "nao-registrado");
  assert.equal(por["powerfarm.search"], "nao-deveria");
  assert.equal(por["powerfarm.servico.lab-8gb.plist-solto"], "nao-deveria");
  assert.equal(por["powerfarm.person.director"], undefined, "pessoa não é observável, não aparece como faltando");
});

test("o que é problema aparece primeiro", () => {
  const linhas = cruzar([obs("powerfarm.a"), obs("powerfarm.b", { proibido: true })], [reg("powerfarm.a"), reg("powerfarm.z")]);
  assert.deepEqual(linhas.map((l) => l.situacao), ["nao-deveria", "faltando", "registrado"]);
});

test("ids gerados valem no Registry, com acento e símbolo", () => {
  assert.equal(slug("Constituição do Híbrido!"), "constituicao-do-hibrido");
  const id = idPara("mcp", "lab-256", "Claude Code", "coloured_places.MCP");
  assert.equal(id, "powerfarm.mcp.lab-256.claude-code.coloured-places-mcp");
  assert.ok(idValido(id));
  assert.ok(!idValido("powerfarm.Maiúscula"));
  assert.ok(!idValido("pf.lab-256"), "o nome é powerfarm.*, não pf.*");
});

test("versão do MCP travada", () => {
  assert.equal(MCP_PROTOCOL_VERSION, "2026-07-28");
});
