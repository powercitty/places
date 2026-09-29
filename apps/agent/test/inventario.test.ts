import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { idValido } from "@powerfarm/contract";
import { inventario, mcpsConfigurados, pastasEProjetos, type Contexto } from "../agent/lib/coleta/inventario.ts";

const ctx = (home: string): Contexto => ({
  maquina: "lab-256",
  registryDoAgente: "pf.host-runner.lab-256",
  rotuloDoAgente: "app.powerfarm.agente",
  home,
  agora: "2026-09-26T12:00:00.000Z",
});

function casaDeTeste() {
  const home = mkdtempSync(join(tmpdir(), "pf-inv-"));
  for (const p of ["Projetos", "Markdowns", "Arquivos soltos", "Zipfiles", "Library", "Downloads", "Manhattan", "lab"]) mkdirSync(join(home, p));
  writeFileSync(join(home, "solto-na-raiz.txt"), "x");
  writeFileSync(join(home, ".zshrc"), "");
  mkdirSync(join(home, "Projetos", "meu-mcp", "apps", "servidor"), { recursive: true });
  writeFileSync(join(home, "Projetos", "meu-mcp", "apps", "servidor", "package.json"), JSON.stringify({ dependencies: { "@modelcontextprotocol/sdk": "2.0.0" } }));
  mkdirSync(join(home, "Projetos", "site", "node_modules", "x"), { recursive: true });
  writeFileSync(join(home, "Projetos", "site", "node_modules", "x", "package.json"), JSON.stringify({ dependencies: { "@modelcontextprotocol/sdk": "1" } }));
  writeFileSync(join(home, "Projetos", "site", ".mcp.json"), JSON.stringify({ mcpServers: { banco: { command: "uvx", env: { K: "SEGREDO" } } } }));
  mkdirSync(join(home, ".cursor"));
  writeFileSync(join(home, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { "expedition-mcp": { url: "https://x.dev/sse?t=SEGREDO" } } }));
  return home;
}

test("pastas: as 4 contam itens, Manhattan é protegido, o resto na raiz é 'não deveria'", () => {
  const itens = pastasEProjetos(ctx(casaDeTeste()));
  const por = Object.fromEntries(itens.map((i) => [i.nome, i]));
  assert.equal(por["Projetos"].detalhe, "2 itens");
  assert.equal(por["Manhattan"].proibido, undefined);
  assert.equal(por["lab"].proibido, true);
  assert.equal(por["solto-na-raiz.txt"].motivo, "fora das 4 pastas da organização");
  assert.equal(por["Library"], undefined);
  assert.equal(por[".zshrc"], undefined);
});

test("projeto com código de servidor MCP aparece como MCP (sem olhar dentro de node_modules)", () => {
  const itens = pastasEProjetos(ctx(casaDeTeste()));
  const mcps = itens.filter((i) => i.tipo === "mcp");
  assert.deepEqual(mcps.map((i) => i.id), ["pf.mcp.meu-mcp"]);
});

test("MCPs configurados nas IAs e nos projetos, sem segredo", () => {
  const m = mcpsConfigurados(ctx(casaDeTeste()));
  assert.deepEqual(m.map((x) => `${x.fonte}/${x.nome}/${x.alvo}`).sort(), ["cursor/expedition-mcp/x.dev", "projeto:site/banco/uvx"]);
  assert.ok(!JSON.stringify(m).includes("SEGREDO"));
});

// Só num LAB de verdade: no CI não há computador para olhar (este teste quebrava o CI desde 2026-09-26).
const ESTE_LAB = hostname().split(".")[0];
const NUM_LAB = process.platform === "darwin" && ["lab-256", "lab-512", "lab-8gb"].includes(ESTE_LAB);

test("neste computador de verdade: todo item tem id válido e nada parece segredo", { skip: !NUM_LAB && "só roda num LAB" }, async () => {
  const itens = await inventario(ctx(homedir()));
  assert.ok(itens.length > 5);
  assert.equal(itens[0].id, "pf.lab-256"); // o contexto do teste é o do LAB 256
  for (const i of itens) assert.ok(idValido(i.id), i.id);
  const tudo = JSON.stringify(itens);
  for (const re of [/sk-ant-[A-Za-z0-9_-]{10}/, /\bsk-[A-Za-z0-9]{20}/, /eyJ[A-Za-z0-9_-]{20}/, /gh[pousr]_[A-Za-z0-9]{20}/, /sb_secret_/, /vck_[A-Za-z0-9]{10}/]) {
    assert.ok(!re.test(tudo), `parece segredo: ${re}`);
  }
});
