import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.PF_NAO_CARREGAR_SEGREDOS = "1";
const { carregar } = await import("../scripts/carregar-segredos.mjs");

test("ambiente vence; depois Keychain; depois arquivo 600; e diz o que falta", () => {
  const dir = mkdtempSync(join(tmpdir(), "pf-seg-"));
  const arquivo = join(dir, "segredos.json");
  writeFileSync(arquivo, JSON.stringify({ AI_GATEWAY_API_KEY: "do-arquivo" }));
  chmodSync(arquivo, 0o600);

  const env1 = { AI_GATEWAY_API_KEY: "do-ambiente" };
  assert.deepEqual(carregar(env1, { keychain: () => "do-keychain", arquivo }), { AI_GATEWAY_API_KEY: "ambiente" });
  assert.equal(env1.AI_GATEWAY_API_KEY, "do-ambiente");

  const env2 = {};
  assert.deepEqual(carregar(env2, { keychain: () => "do-keychain", arquivo }), { AI_GATEWAY_API_KEY: "keychain" });
  assert.equal(env2.AI_GATEWAY_API_KEY, "do-keychain");

  const env3 = {};
  assert.deepEqual(carregar(env3, { keychain: () => undefined, arquivo }), { AI_GATEWAY_API_KEY: "arquivo" });
  assert.equal(env3.AI_GATEWAY_API_KEY, "do-arquivo");

  chmodSync(arquivo, 0o644);
  const env4 = {};
  assert.deepEqual(carregar(env4, { keychain: () => undefined, arquivo }), { AI_GATEWAY_API_KEY: "falta" });
  assert.equal(env4.AI_GATEWAY_API_KEY, undefined);
});
