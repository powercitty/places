import assert from "node:assert/strict";
import test from "node:test";
import { lerPerfil, validar, validarComum } from "../scripts/maquina.mjs";

const perfis = ["lab-256", "lab-512", "lab-8gb"].map(lerPerfil);

test("os 3 perfis de máquina são válidos", () => {
  for (const p of perfis) assert.deepEqual(validar(p), [], p.maquina);
});

test("exatamente um principal, e principal e reserva apontam um para o outro", () => {
  const principais = perfis.filter((p) => p.papel === "principal");
  assert.equal(principais.length, 1);
  const principal = principais[0];
  const reserva = perfis.find((p) => p.maquina === principal.reserva);
  assert.ok(reserva, "o principal tem reserva");
  assert.equal(reserva.papel, "reserva");
  assert.equal(reserva.reserva, principal.maquina);
});

test("a bancada não cuida de lugares da nuvem", () => {
  const bancada = perfis.find((p) => p.papel === "bancada");
  assert.deepEqual(bancada.lugares, ["labs"]);
});

test("a configuração comum é válida e só tem a chave pública do Supabase", () => {
  const comum = lerPerfil("comum");
  assert.deepEqual(validarComum(comum), []);
  assert.deepEqual(validarComum({ ...comum, supabase_chave_publica: "sb_secret_xxx" }).length, 1);
});
