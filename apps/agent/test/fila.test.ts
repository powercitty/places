import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deveGuardar, enviarFila, guardar, limitar } from "../agent/lib/fila.ts";
import type { EventoGuardado } from "../agent/lib/supabase.ts";

const ev = (n: number, dados: unknown = { n }): EventoGuardado => ({
  id: `evt_01KYJBZA88B4M9XN3RTC5F${String(n).padStart(4, "0")}`,
  sessao: "wrun_A",
  tipo: "message.completed",
  dados,
  emitido_em: "2026-09-26T12:00:00.000Z",
});

test("não guarda os pedaços de texto (a versão final vem no *.completed)", () => {
  assert.equal(deveGuardar("message.appended"), false);
  assert.equal(deveGuardar("reasoning.appended"), false);
  assert.equal(deveGuardar("action.input.appended"), false);
  assert.equal(deveGuardar("action.partial"), false);
  for (const t of ["message.completed", "actions.requested", "action.result", "input.requested", "input.resolved", "step.completed", "turn.failed"]) {
    assert.equal(deveGuardar(t), true, t);
  }
});

test("evento gigante vai só com o tamanho", () => {
  const e = limitar(ev(1, { texto: "x".repeat(70_000) }));
  assert.deepEqual(e.dados, { truncado: true, bytes: 70_012 });
  assert.deepEqual(limitar(ev(2)).dados, { n: 2 });
});

test("sem internet os eventos esperam no disco; quando volta, vão todos e o disco fica limpo", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "pf-fila-"));
  for (let i = 0; i < 3; i++) guardar(ev(i), pasta);

  const falha = async () => {
    throw new Error("sem internet");
  };
  assert.equal(await enviarFila(falha, pasta), 0);
  assert.equal(readdirSync(pasta).filter((n) => n.startsWith("enviando-")).length, 1);

  guardar(ev(3), pasta); // chegou mais um enquanto estava fora

  const recebidos: EventoGuardado[] = [];
  const ok = async (lote: EventoGuardado[]) => {
    recebidos.push(...lote);
  };
  assert.equal(await enviarFila(ok, pasta), 4);
  assert.deepEqual(recebidos.map((e) => (e.dados as { n: number }).n).sort(), [0, 1, 2, 3]);
  assert.deepEqual(readdirSync(pasta), []);
  assert.equal(await enviarFila(ok, pasta), 0);
});

test("dois envios ao mesmo tempo não mandam duas vezes", async () => {
  const pasta = mkdtempSync(join(tmpdir(), "pf-fila-"));
  for (let i = 0; i < 1200; i++) guardar(ev(i), pasta);
  const lotes: number[] = [];
  const devagar = async (lote: EventoGuardado[]) => {
    await new Promise((r) => setTimeout(r, 5));
    lotes.push(lote.length);
  };
  const [a, b] = await Promise.all([enviarFila(devagar, pasta), enviarFila(devagar, pasta)]);
  assert.equal(a, 1200);
  assert.equal(b, 1200); // a mesma rodada
  assert.deepEqual(lotes, [500, 500, 200]);
  assert.equal(existsSync(join(pasta, "fila.ndjson")), false);
});
