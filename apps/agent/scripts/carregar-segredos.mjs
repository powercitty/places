// Carregado ANTES do Eve (node --import) pelo serviço app.powerfarm.agente.
// Põe no ambiente do processo os segredos que bibliotecas só leem de process.env
// (o AI Gateway lê AI_GATEWAY_API_KEY a cada chamada). O processo do servidor herda.
// Mesma ordem de segredos.ts: ambiente → Keychain (serviço "powerfarm") → segredos.json 600.
// Nunca imprime valores.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const NOMES = ["AI_GATEWAY_API_KEY"];

export function doKeychain(nome) {
  try {
    const v = execFileSync("/usr/bin/security", ["find-generic-password", "-s", "powerfarm", "-a", nome, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

export function doArquivo(nome, arquivo) {
  try {
    const st = statSync(arquivo);
    if ((st.mode & 0o077) !== 0 || (process.getuid && st.uid !== process.getuid())) return undefined;
    const v = JSON.parse(readFileSync(arquivo, "utf8"))[nome];
    return typeof v === "string" && v ? v : undefined;
  } catch {
    return undefined;
  }
}

export function carregar(env = process.env, { keychain = doKeychain, arquivo = join(env.PF_AGENTE_DADOS ?? join(process.cwd(), ".eve", "powerfarm"), "segredos.json") } = {}) {
  const origem = {};
  for (const nome of NOMES) {
    if (env[nome]) {
      origem[nome] = "ambiente";
      continue;
    }
    const k = keychain(nome);
    const v = k ?? doArquivo(nome, arquivo);
    if (v) {
      env[nome] = v;
      origem[nome] = k ? "keychain" : "arquivo";
    } else origem[nome] = "falta";
  }
  return origem;
}

if (!process.env.PF_NAO_CARREGAR_SEGREDOS) {
  const o = carregar();
  console.log(`[powerfarm] segredos: ${Object.entries(o).map(([n, de]) => `${n}=${de}`).join(" ")}`);
}
