import assert from "node:assert/strict";
import test from "node:test";
import { esquecerSegredos, segredo } from "../agent/lib/segredos.ts";

test("ambiente tem prioridade; senão Keychain, lido uma vez só", () => {
  esquecerSegredos();
  let leituras = 0;
  const keychain = (n: string) => {
    leituras++;
    return n === "PF_AGENTE_SEGREDO" ? "do-keychain" : undefined;
  };
  delete process.env.PF_AGENTE_SEGREDO;
  assert.equal(segredo("PF_AGENTE_SEGREDO", keychain), "do-keychain");
  assert.equal(segredo("PF_AGENTE_SEGREDO", keychain), "do-keychain");
  assert.equal(leituras, 1);
  process.env.PF_AGENTE_SEGREDO = "do-ambiente";
  assert.equal(segredo("PF_AGENTE_SEGREDO", keychain), "do-ambiente");
  delete process.env.PF_AGENTE_SEGREDO;
});

test("arquivo de segredos só vale se for fechado para os outros (600)", async () => {
  const { chmodSync, mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { lerDoArquivo } = await import("../agent/lib/segredos.ts");
  const arq = join(mkdtempSync(join(tmpdir(), "pf-seg-")), "segredos.json");
  writeFileSync(arq, JSON.stringify({ PF_AGENTE_SEGREDO: "abc" }));
  chmodSync(arq, 0o644);
  assert.equal(lerDoArquivo(arq)("PF_AGENTE_SEGREDO"), undefined);
  chmodSync(arq, 0o600);
  assert.equal(lerDoArquivo(arq)("PF_AGENTE_SEGREDO"), "abc");
  assert.equal(lerDoArquivo(arq)("AI_GATEWAY_API_KEY"), undefined);
  assert.equal(lerDoArquivo(arq + ".nao-existe")("PF_AGENTE_SEGREDO"), undefined);
});
