import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lerEstado } from "../agent/lib/estado.ts";

test("conta os itens das 4 pastas e diz 'desconhecido' (null) para pasta que não existe", () => {
  const home = mkdtempSync(join(tmpdir(), "pf-estado-"));
  mkdirSync(join(home, "Projetos"));
  mkdirSync(join(home, "Projetos", "a"));
  writeFileSync(join(home, "Projetos", ".DS_Store"), "");
  mkdirSync(join(home, "Markdowns"));
  writeFileSync(join(home, "Markdowns", "x.md"), "# x");
  const e = lerEstado(home);
  assert.equal(e.pastas["Projetos"], 1);
  assert.equal(e.pastas["Markdowns"], 1);
  assert.equal(e.pastas["Zipfiles"], null);
  assert.ok(e.discoLivreGb === null || e.discoLivreGb > 0);
  assert.ok(Date.parse(e.vistoEm) > 0);
});
