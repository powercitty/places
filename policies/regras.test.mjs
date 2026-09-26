import assert from "node:assert/strict";
import test from "node:test";
import { conferirVersoes, violacoesDeConteudo, violacoesDeNome } from "./regras.mjs";

test("barra travas que não são do pnpm, .env e serviços soltos", () => {
  assert.ok(violacoesDeNome("apps/x/package-lock.json").length);
  assert.ok(violacoesDeNome("yarn.lock").length);
  assert.ok(violacoesDeNome("apps/agent/.env.local").length);
  assert.ok(violacoesDeNome("infra/com.minilab.algo.plist").length);
  assert.ok(violacoesDeNome("apps/x/node_modules/a/index.js").length);
  assert.ok(violacoesDeNome("modelos/qwen.gguf").length);
});

test("deixa passar o que é permitido", () => {
  assert.deepEqual(violacoesDeNome("apps/agent/.env.example"), []);
  assert.deepEqual(violacoesDeNome("pnpm-lock.yaml"), []);
  assert.deepEqual(violacoesDeNome("apps/coloured-places/app/page.tsx"), []);
});

test("acha segredo no conteúdo", () => {
  const falso = "chave = sk-ant-" + "a".repeat(40);
  assert.match(violacoesDeConteudo("x.ts", falso)[0], /Anthropic/);
  assert.deepEqual(violacoesDeConteudo("x.ts", "const url = process.env.SUPABASE_URL"), []);
});

test("código criando serviço fora do agente é barrado; no porteiro é permitido", () => {
  const cod = 'exec("launchctl bootstrap gui/501 x.plist")';
  assert.ok(violacoesDeConteudo("apps/agent/agent/tools/x.ts", cod).length);
  assert.deepEqual(violacoesDeConteudo("apps/agent/agent/lib/porteiro/fichas.ts", cod), []);
});

test("versões têm que bater com a política", () => {
  const politica = { node: "24", pnpm: "12.6.0" };
  const certo = { packageManager: "pnpm@12.6.0", engines: { node: ">=24 <25" } };
  assert.deepEqual(conferirVersoes('node = "24"\npnpm = "12.6.0"', politica, certo), []);
  assert.equal(conferirVersoes('node = "26"\npnpm = "12.6.0"', politica, certo).length, 1);
});
