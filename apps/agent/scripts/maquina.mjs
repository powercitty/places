#!/usr/bin/env node
// Grava o perfil da máquina (machines/<id>.json) dentro do agente, para o build daquela máquina.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..", "..");
const PAPEIS = new Set(["principal", "reserva", "bancada"]);
const LUGARES = new Set(["supabase", "labs", "apps", "engines", "drive"]);
const ID = /^pf(\.[a-z0-9][a-z0-9-]*)+$/;

export function validar(p) {
  const erros = [];
  if (!/^lab-(256|512|8gb)$/.test(p.maquina ?? "")) erros.push(`máquina desconhecida: ${p.maquina}`);
  if (!ID.test(p.registry ?? "")) erros.push(`registry fora do formato pf.*: ${p.registry}`);
  if (!PAPEIS.has(p.papel)) erros.push(`papel inválido: ${p.papel}`);
  if (!Array.isArray(p.lugares) || !p.lugares.length || p.lugares.some((l) => !LUGARES.has(l))) erros.push(`lugares inválidos: ${p.lugares}`);
  if (!/^[a-z0-9-]+\/[a-z0-9.-]+$/.test(p.modelo ?? "")) erros.push(`modelo fora do formato do AI Gateway: ${p.modelo}`);
  return erros;
}

export function lerPerfil(id) {
  return JSON.parse(readFileSync(join(raiz, "machines", `${id}.json`), "utf8"));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (!id) { console.error("uso: node scripts/maquina.mjs <lab-256|lab-512|lab-8gb>"); process.exit(2); }
  const perfil = lerPerfil(id);
  const erros = validar(perfil);
  if (erros.length) { console.error(`perfil ${id} inválido:\n  ${erros.join("\n  ")}`); process.exit(1); }
  const destino = join(aqui, "..", "agent", "lib", "maquina.gerada.ts");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `// Gerado por scripts/maquina.mjs a partir de machines/${id}.json — não edite à mão.\nexport const MAQUINA = ${JSON.stringify(perfil, null, 2)} as const;\n`);
  console.log(`agente configurado para ${id} (${perfil.papel})`);
}
