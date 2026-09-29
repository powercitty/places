// Inventário (a cada 15 minutos): tudo o que EXISTE neste computador e interessa à casa.
// Aparece porque existe — ninguém precisa cadastrar. A etiqueta (registrado ou não) vem depois, do Registry.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { Observado } from "@powerfarm/contract";
import { rodar } from "./comandos.ts";
import {
  ehCaseiro,
  lerLaunchctlList,
  lerLaunchctlPrint,
  lerMcpsClaudeCode,
  lerMcpsCodex,
  lerMcpsJson,
  lerNetstat,
  lerPlist,
  lerPs,
  projetoEhMcp,
  type Mcp,
  type Plist,
} from "./leitura.ts";
import { idDaPasta, idDaPorta, idDoContainer, idDoMcp, idDoProjeto, idDoServico, servicoConhecido } from "./identidade.ts";

export interface Contexto {
  maquina: "lab-256" | "lab-512" | "lab-8gb";
  registryDoAgente: string;
  rotuloDoAgente: string;
  home: string;
  agora: string;
}

type Item = Observado;

function item(c: Contexto, id: string, tipo: string, nome: string, detalhe?: string, proibido?: string): Item {
  const o: Item = { id, tipo, maquina: c.maquina, nome, vistoEm: c.agora };
  if (detalhe) o.detalhe = detalhe;
  if (proibido) {
    o.proibido = true;
    o.motivo = proibido;
  }
  return o;
}

const lerTexto = (p: string): string | null => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};

const pastasDe = (p: string): string[] => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name);
  } catch {
    return [];
  }
};

// ─── serviços do launchd ─────────────────────────────────────────────────────

export interface Servicos {
  itens: Item[];
  /** pid → rótulo do launchd, para dizer de quem é cada porta. */
  donos: Map<number, string>;
}

export async function servicos(c: Contexto): Promise<Servicos> {
  const uid = process.getuid?.() ?? 501;
  const dirs: [string, string][] = [
    [join(c.home, "Library/LaunchAgents"), `gui/${uid}`],
    ["/Library/LaunchAgents", `gui/${uid}`],
    ["/Library/LaunchDaemons", "system"],
  ];
  const plists: (Plist & { onde: string; dominio: string })[] = [];
  for (const [d, dominio] of dirs) {
    let nomes: string[] = [];
    try {
      nomes = readdirSync(d).filter((n) => n.endsWith(".plist"));
    } catch {
      continue;
    }
    for (const n of nomes) {
      const json = await rodar("/usr/bin/plutil", ["-convert", "json", "-o", "-", join(d, n)], 5000);
      const p = json ? lerPlist(json, n) : { rotulo: basename(n, ".plist"), programa: null, script: null };
      if (p) plists.push({ ...p, onde: d.startsWith(c.home) ? "~/Library/LaunchAgents" : d, dominio });
    }
  }
  const carregados = lerLaunchctlList((await rodar("/bin/launchctl", ["list"], 5000)) ?? "");

  const itens: Item[] = [];
  const donos = new Map<number, string>();
  const vistos = new Set<string>();
  for (const p of plists) {
    vistos.add(p.rotulo);
    const noLaunchd = lerLaunchctlPrint(await rodar("/bin/launchctl", ["print", `${p.dominio}/${p.rotulo}`], 5000));
    const pid = noLaunchd?.pid ?? null;
    if (pid) donos.set(pid, p.rotulo);
    const situacao = !noLaunchd ? "não carregado" : noLaunchd.rodando ? `rodando (pid ${pid})` : "parado";
    const partes = [p.onde, situacao, p.programa ?? "sem programa"];
    if (p.programa && !existsSync(p.programa)) partes.push("PROGRAMA NÃO EXISTE");
    const caseiroFora = ehCaseiro(p) && !servicoConhecido(p.rotulo, c.rotuloDoAgente);
    itens.push(
      item(c, idDoServico(p.rotulo, c.maquina, c.rotuloDoAgente, c.registryDoAgente), "service", p.rotulo, partes.join(" · "),
        caseiroFora ? "serviço caseiro criado fora do agente (regra 7)" : undefined),
    );
  }
  // Carregados no launchd sem plist nas pastas de sempre (vêm de dentro de aplicativos).
  for (const [rotulo, pid] of carregados) {
    if (vistos.has(rotulo) || rotulo.startsWith("com.apple.") || rotulo.startsWith("application.") || rotulo.startsWith("0x")) continue;
    if (pid) donos.set(pid, rotulo);
    itens.push(item(c, idDoServico(rotulo, c.maquina, c.rotuloDoAgente, c.registryDoAgente), "service", rotulo, `sem plist (vem de um aplicativo) · ${pid ? `rodando (pid ${pid})` : "parado"}`));
  }
  return { itens, donos };
}

// ─── portas abertas ──────────────────────────────────────────────────────────

export async function portas(c: Contexto, donos = new Map<number, string>()): Promise<Item[]> {
  const saida = await rodar("/usr/sbin/netstat", ["-anv", "-p", "tcp"], 10_000);
  if (!saida) return [];
  const programas = new Map<number, string>();
  for (const p of lerPs((await rodar("/bin/ps", ["-axo", "pid=,user=,comm="], 5000)) ?? "")) programas.set(p.pid, p.programa);
  const porPorta = new Map<number, { alcance: string; quem: Set<string> }>();
  for (const p of lerNetstat(saida)) {
    const dono = donos.get(p.pid);
    const quem = `${programas.get(p.pid) ?? p.processo}${dono ? ` [${dono}]` : ""}`;
    const atual = porPorta.get(p.porta) ?? { alcance: p.alcance, quem: new Set<string>() };
    if (p.alcance === "todos") atual.alcance = "todos";
    atual.quem.add(`${quem} (pid ${p.pid})`);
    porPorta.set(p.porta, atual);
  }
  return [...porPorta].map(([porta, v]) =>
    item(c, idDaPorta(c.maquina, porta), "porta", `porta ${porta}`, `${v.alcance === "todos" ? "aberta para a rede" : "só neste computador"} · ${[...v.quem].join(", ")}`),
  );
}

// ─── MCPs ────────────────────────────────────────────────────────────────────

const CONFIGS_JSON: [string, string][] = [
  ["claude-desktop", "Library/Application Support/Claude/claude_desktop_config.json"],
  ["cursor", ".cursor/mcp.json"],
  ["gemini", ".gemini/settings.json"],
  ["antigravity", ".gemini/antigravity/mcp_config.json"],
  ["kimi-code", ".kimi-code/mcp.json"],
  ["vscode", "Library/Application Support/Code/User/mcp.json"],
  ["windsurf", ".codeium/windsurf/mcp_config.json"],
];

const ARQUIVOS_DE_DEPENDENCIA = ["package.json", "pyproject.toml", "requirements.txt", "Cargo.toml"];
const NAO_ENTRAR = new Set(["node_modules", ".git", "target", ".venv", "venv", "dist", ".next", "build", "__pycache__"]);

/** Arquivos de dependência do projeto e de até 2 níveis abaixo (monorepos). */
function dependenciasDoProjeto(raiz: string): { nome: string; texto: string }[] {
  const out: { nome: string; texto: string }[] = [];
  const visitar = (dir: string, nivel: number) => {
    for (const n of ARQUIVOS_DE_DEPENDENCIA) {
      const t = lerTexto(join(dir, n));
      if (t) out.push({ nome: n, texto: t });
    }
    if (nivel >= 2 || out.length > 200) return;
    for (const sub of pastasDe(dir)) if (!NAO_ENTRAR.has(sub)) visitar(join(dir, sub), nivel + 1);
  };
  visitar(raiz, 0);
  return out;
}

export function mcpsConfigurados(c: Contexto): Mcp[] {
  const mcps: Mcp[] = [];
  for (const [fonte, rel] of CONFIGS_JSON) {
    const t = lerTexto(join(c.home, rel));
    if (t) mcps.push(...lerMcpsJson(t, fonte));
  }
  const claude = lerTexto(join(c.home, ".claude.json"));
  if (claude) mcps.push(...lerMcpsClaudeCode(claude));
  const codex = lerTexto(join(c.home, ".codex/config.toml"));
  if (codex) mcps.push(...lerMcpsCodex(codex));
  for (const p of pastasDe(join(c.home, "Projetos"))) {
    const t = lerTexto(join(c.home, "Projetos", p, ".mcp.json"));
    if (t) mcps.push(...lerMcpsJson(t, `projeto:${p}`));
  }
  return mcps;
}

// ─── pastas e projetos ───────────────────────────────────────────────────────

export const PASTAS_DA_ORGANIZACAO = ["Projetos", "Markdowns", "Arquivos soltos", "Zipfiles"];
const PASTAS_DO_MAC = new Set(["Applications", "Desktop", "Documents", "Downloads", "Library", "Movies", "Music", "Pictures", "Public", "Google Drive"]);

export function pastasEProjetos(c: Contexto): Item[] {
  const itens: Item[] = [];
  let raiz: { nome: string; pasta: boolean }[] = [];
  try {
    raiz = readdirSync(c.home, { withFileTypes: true })
      .filter((d) => !d.name.startsWith("."))
      .map((d) => ({ nome: d.name, pasta: d.isDirectory() || d.isSymbolicLink() }));
  } catch {
    return itens;
  }
  for (const { nome, pasta } of raiz) {
    if (PASTAS_DO_MAC.has(nome)) continue;
    if (PASTAS_DA_ORGANIZACAO.includes(nome)) {
      let n = 0;
      try {
        n = readdirSync(join(c.home, nome)).filter((x) => x !== ".DS_Store").length;
      } catch {
        n = 0;
      }
      itens.push(item(c, idDaPasta(c.maquina, nome), "pasta", nome, `${n} itens`));
    } else if (/^manhattan/i.test(nome)) {
      itens.push(item(c, idDaPasta(c.maquina, nome), "pasta", nome, "Manhattan (protegido)"));
    } else {
      itens.push(item(c, idDaPasta(c.maquina, nome), "pasta", nome, pasta ? "pasta na raiz" : "arquivo na raiz", "fora das 4 pastas da organização"));
    }
  }
  for (const nome of pastasDe(join(c.home, "Projetos"))) {
    const dir = join(c.home, "Projetos", nome);
    let mexido = "";
    try {
      mexido = statSync(dir).mtime.toISOString().slice(0, 10);
    } catch {
      mexido = "";
    }
    const git = existsSync(join(dir, ".git"));
    const ehMcp = projetoEhMcp(dependenciasDoProjeto(dir));
    itens.push(item(c, idDoProjeto(c.maquina, nome), "projeto", nome, [git ? "git" : "sem git", mexido && `mexido em ${mexido}`, ehMcp && "usa MCP"].filter(Boolean).join(" · ")));
    if (ehMcp) itens.push(item(c, idDoMcp(nome), "mcp", nome, `projeto que usa MCP (Projetos/${nome})`));
  }
  return itens;
}

// ─── containers ──────────────────────────────────────────────────────────────

export async function containers(c: Contexto): Promise<Item[]> {
  const saida = await rodar("docker", ["ps", "-a", "--format", "{{.Names}}\t{{.State}}\t{{.Image}}"], 10_000);
  if (!saida) return [];
  return saida
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [nome, estado, imagem] = l.split("\t");
      return item(c, idDoContainer(c.maquina, nome), "container", nome, `${estado} · ${imagem}`);
    });
}

// ─── tudo junto ──────────────────────────────────────────────────────────────

export async function inventario(c: Contexto): Promise<Item[]> {
  const [{ itens: s, donos }, k] = await Promise.all([servicos(c), containers(c)]);
  const p = await portas(c, donos);
  const mcps = mcpsConfigurados(c).map((m) => item(c, idDoMcp(m.nome), "mcp", m.nome, `${m.fonte} · ${m.tipo}${m.alvo ? ` · ${m.alvo}` : ""}`));
  const agentePeloLaunchd = s.some((i) => i.id === c.registryDoAgente);
  return [
    item(c, `powerfarm.${c.maquina}`, "machine", c.maquina, "este computador"),
    ...(agentePeloLaunchd ? [] : [item(c, c.registryDoAgente, "service", "agente Powerfarm", "o agente local (rodando fora do launchd)")]),
    ...s,
    ...p,
    ...k,
    ...mcps,
    ...pastasEProjetos(c),
  ];
}
