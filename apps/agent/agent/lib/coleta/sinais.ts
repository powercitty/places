// Sinais vitais (a cada minuto): pequenos, rápidos, sempre com o que foi visto de fato.
// Não saber é "desconhecido" — nunca "fora do ar".
import { cpus, freemem, loadavg, totalmem, uptime } from "node:os";
import { statfsSync } from "node:fs";
import type { Sinal, EstadoDoSinal, LugarDoSinal } from "@powerfarm/contract";
import { rodar } from "./comandos.ts";
import { lerLaunchctlPrint, lerTuneis } from "./leitura.ts";

const gb = (b: number) => Math.round((b / 1e9) * 10) / 10;

export interface Ambiente {
  maquina: string;
  papel: string;
  home: string;
  agora: () => Date;
}

function sinal(lugar: LugarDoSinal, alvo: string, aspecto: string, estado: EstadoDoSinal, valor: Record<string, unknown>, quando: Date): Sinal {
  return { lugar, alvo, aspecto, estado, valor, observado_em: quando.toISOString() };
}

export function sinalDoDisco(a: Ambiente): Sinal {
  const q = a.agora();
  try {
    const s = statfsSync(a.home);
    const livre = s.bavail * s.bsize;
    const total = s.blocks * s.bsize;
    const usadoPct = Math.round((1 - livre / total) * 100);
    const estado = livre < 15e9 || usadoPct > 95 ? "olhar" : "ok";
    return sinal("labs", a.maquina, "disco", estado, { livreGb: gb(livre), totalGb: gb(total), usadoPct }, q);
  } catch (e) {
    return sinal("labs", a.maquina, "disco", "desconhecido", { erro: String(e) }, q);
  }
}

/** macOS: kern.memorystatus_level = % de memória disponível (o mesmo número do "pressão de memória"). */
export async function sinalDaMemoria(a: Ambiente): Promise<Sinal> {
  const q = a.agora();
  const nivel = await rodar("/usr/sbin/sysctl", ["-n", "kern.memorystatus_level"], 3000);
  const livrePct = nivel && /^\d+$/.test(nivel.trim()) ? Number(nivel.trim()) : Math.round((freemem() / totalmem()) * 100);
  return sinal("labs", a.maquina, "memoria", livrePct < 10 ? "olhar" : "ok", { livrePct, totalGb: gb(totalmem()) }, q);
}

export function sinalDaCarga(a: Ambiente): Sinal {
  const [um, cinco] = loadavg();
  const n = cpus().length;
  return sinal("labs", a.maquina, "carga", um > n * 2 ? "olhar" : "ok", { um: +um.toFixed(2), cinco: +cinco.toFixed(2), cpus: n, ligadoHaHoras: Math.round(uptime() / 360) / 10 }, a.agora());
}

export async function sinalDaInternet(a: Ambiente, f: typeof fetch = fetch): Promise<Sinal> {
  const q = a.agora();
  const t0 = performance.now();
  try {
    const r = await f("https://1.1.1.1/cdn-cgi/trace", { signal: AbortSignal.timeout(8000) });
    await r.text();
    return sinal("labs", a.maquina, "internet", r.ok ? "ok" : "olhar", { ms: Math.round(performance.now() - t0), http: r.status }, q);
  } catch (e) {
    return sinal("labs", a.maquina, "internet", "olhar", { erro: e instanceof Error ? e.message : String(e) }, q);
  }
}

/** Túneis do cloudflared rodando. Na bancada não é esperado haver túnel. */
export async function sinalDoTunel(a: Ambiente): Promise<Sinal> {
  const q = a.agora();
  const args = await rodar("/bin/ps", ["-axo", "args="], 5000);
  if (args === null) return sinal("labs", a.maquina, "tunel", "desconhecido", { erro: "ps falhou" }, q);
  const tuneis = lerTuneis(args);
  const esperado = a.papel !== "bancada";
  return sinal("labs", a.maquina, "tunel", tuneis.length || !esperado ? "ok" : "olhar", { tuneis, esperado }, q);
}

/** Manhattan é protegido: o agente (sessão do usuário) e o daemon (sistema) têm que estar rodando. */
export async function sinalDoManhattan(a: Ambiente): Promise<Sinal> {
  const q = a.agora();
  const uid = process.getuid?.() ?? 501;
  const partes: Record<string, string> = {};
  for (const [nome, alvo] of [["agent", `gui/${uid}/com.project-manhattan.agent`], ["daemon", "system/com.project-manhattan.daemon"]]) {
    const r = lerLaunchctlPrint(await rodar("/bin/launchctl", ["print", alvo], 5000));
    partes[nome] = !r ? "não carregado" : r.rodando ? `rodando (pid ${r.pid})` : "parado";
  }
  const tudoRodando = Object.values(partes).every((v) => v.startsWith("rodando"));
  return sinal("labs", "manhattan", "rodando", tudoRodando ? "ok" : "olhar", { ...partes, maquina: a.maquina }, q);
}

export interface Endereco {
  lugar: "supabase" | "labs" | "apps" | "engines" | "drive";
  alvo: string;
  url: string;
  registry?: string;
}

/** Um endereço da nuvem responde? 5xx e 530 (túnel sem origem) = olhar; login/redirect conta como no ar. */
export async function sinalDoEndereco(a: Ambiente, e: Endereco, f: typeof fetch = fetch): Promise<Sinal> {
  const q = a.agora();
  const t0 = performance.now();
  try {
    const r = await f(e.url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    await r.body?.cancel();
    const valor = { http: r.status, ms: Math.round(performance.now() - t0), url: e.url, registry: e.registry ?? null, visto_de: a.maquina };
    return sinal(e.lugar, e.alvo, "http", r.status >= 500 ? "olhar" : "ok", valor, q);
  } catch (err) {
    return sinal(e.lugar, e.alvo, "http", "olhar", { erro: err instanceof Error ? err.message : String(err), url: e.url, visto_de: a.maquina }, q);
  }
}

export function sinalDoAgente(a: Ambiente, versao: Record<string, unknown>): Sinal {
  return sinal("agentes", a.maquina, "vivo", "ok", { ...versao, papel: a.papel, pid: process.pid, processoHaMin: Math.round(process.uptime() / 60) }, a.agora());
}
