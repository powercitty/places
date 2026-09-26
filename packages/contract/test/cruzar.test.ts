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
    [obs("pf.process.manhattan"), obs("pf.servico.lab-8gb.mcp-novo"), obs("pf.search"), obs("pf.servico.lab-8gb.plist-solto", { proibido: true })],
    [reg("pf.process.manhattan", "process"), reg("pf.antenna"), reg("pf.search", "service", "2026-09-01T00:00:00Z"), reg("pf.person.director", "person")],
  );
  const por = Object.fromEntries(linhas.map((l) => [l.id, l.situacao]));
  assert.equal(por["pf.process.manhattan"], "registrado");
  assert.equal(por["pf.antenna"], "faltando");
  assert.equal(por["pf.servico.lab-8gb.mcp-novo"], "nao-registrado");
  assert.equal(por["pf.search"], "nao-deveria");
  assert.equal(por["pf.servico.lab-8gb.plist-solto"], "nao-deveria");
  assert.equal(por["pf.person.director"], undefined, "pessoa não é observável, não aparece como faltando");
});

test("o que é problema aparece primeiro", () => {
  const linhas = cruzar([obs("pf.a"), obs("pf.b", { proibido: true })], [reg("pf.a"), reg("pf.z")]);
  assert.deepEqual(linhas.map((l) => l.situacao), ["nao-deveria", "faltando", "registrado"]);
});

test("ids gerados valem no Registry, com acento e símbolo", () => {
  assert.equal(slug("Constituição do Híbrido!"), "constituicao-do-hibrido");
  const id = idPara("mcp", "lab-256", "Claude Code", "coloured_places.MCP");
  assert.equal(id, "pf.mcp.lab-256.claude-code.coloured-places-mcp");
  assert.ok(idValido(id));
  assert.ok(!idValido("pf.Maiúscula"));
});

test("versão do MCP travada", () => {
  assert.equal(MCP_PROTOCOL_VERSION, "2026-07-28");
});
