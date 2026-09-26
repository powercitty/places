import assert from "node:assert/strict";
import test from "node:test";
import { carregarNoAmbiente, esquecerSegredos, segredo } from "../agent/lib/segredos.ts";

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

test("o que falta é dito, não inventado", () => {
  esquecerSegredos();
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.PF_PLACES_JWT_SECRET;
  const faltando = carregarNoAmbiente(["AI_GATEWAY_API_KEY", "PF_PLACES_JWT_SECRET"], (n) => (n === "PF_PLACES_JWT_SECRET" ? "s" : undefined));
  assert.deepEqual(faltando, ["AI_GATEWAY_API_KEY"]);
  assert.equal(process.env.PF_PLACES_JWT_SECRET, "s");
  assert.equal(process.env.AI_GATEWAY_API_KEY, undefined);
  delete process.env.PF_PLACES_JWT_SECRET;
});
