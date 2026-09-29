#!/usr/bin/env node
// Fundação: entrega o contrato social ao Registry pela única porta de escrita (powerfarm_fundar).
// É o último passo do DMG, depois que o agente deste computador está no ar. Nunca mostra segredos.
//
//   node deploy/fundar.mjs <lab-256|lab-512|lab-8gb>            funda (ou só confere, se já estiver fundada)
//   node deploy/fundar.mjs <lab-256|lab-512|lab-8gb> --ensaio   confere arquivo, senha e Supabase sem escrever nada
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.PF_NAO_CARREGAR_SEGREDOS = "1"; // só quero as funções de leitura, sem o efeito de carregar
const { doKeychain, doArquivo } = await import("../apps/agent/scripts/carregar-segredos.mjs");

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const [maquina, modo] = process.argv.slice(2);
const falha = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
if (!["lab-256", "lab-512", "lab-8gb"].includes(maquina)) falha(`máquina desconhecida: ${maquina ?? "(nenhuma)"}`);

const comum = JSON.parse(readFileSync(join(raiz, "machines/comum.json"), "utf8"));
const bytes = readFileSync(join(raiz, "fundacao/contrato-social.json"));
const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const contrato = JSON.parse(bytes.toString("utf8"));
console.log(
  `contrato social v${contrato.versao}: ${contrato.entidades.length} entidades, ${contrato.objetos.length} objetos, ` +
    `${contrato.contratos.length} contratos (${hash.slice(0, 19)}…)`,
);

// a senha do agente, no mesmo lugar em que o instalador guarda: Keychain, senão o arquivo 600 do agente
const arquivo = join(homedir(), "Projetos/powerfarm-agente/apps/agent/.eve/powerfarm/segredos.json");
const segredo = process.env.PF_AGENTE_SEGREDO || doKeychain("PF_AGENTE_SEGREDO") || doArquivo("PF_AGENTE_SEGREDO", arquivo);
if (!segredo) falha("este computador ainda não tem a senha do agente (o passo de segredos do instalador cria)");

async function chamar(funcao, args) {
  let r;
  try {
    r = await fetch(`${comum.supabase_url}/rest/v1/rpc/${funcao}`, {
      method: "POST",
      headers: { apikey: comum.supabase_chave_publica, "content-type": "application/json" },
      body: JSON.stringify({ p_maquina: maquina, p_segredo: segredo, ...args }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    falha(`sem conexão com o Supabase (${e.message})`);
  }
  const texto = await r.text();
  if (!r.ok) {
    let msg = texto;
    try {
      msg = JSON.parse(texto).message ?? texto;
    } catch {}
    falha(`${funcao}: ${msg}`);
  }
  return texto ? JSON.parse(texto) : null;
}

if (modo === "--ensaio") {
  const reg = await chamar("pf_agente_registry", {});
  console.log(`✓ ensaio: o Supabase reconhece este agente e o Registry responde (${reg.length} entidades hoje). Nada foi escrito.`);
  process.exit(0);
}

const r = await chamar("powerfarm_fundar", { p_contrato_social: contrato, p_hash: hash });
const como = r.mudancas > 0 ? "fundada" : "já estava fundada, nada mudou";
console.log(`✓ Powerfarm ${como}: ${r.entidades} entidades, ${r.objetos} objetos, ${r.contratos} contratos`);
