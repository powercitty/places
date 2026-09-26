// Leitores puros: recebem o texto que o sistema devolveu e tiram só o que importa.
// Nada aqui roda programa nem toca em disco — por isso dá para testar com exemplos reais.
import { basename } from "node:path";

// ─── ps ──────────────────────────────────────────────────────────────────────

export interface Processo {
  pid: number;
  usuario: string;
  /** Caminho do executável (sem argumentos: argumento pode ter segredo). */
  programa: string;
}

/** Saída de `ps -axo pid=,user=,comm=`. */
export function lerPs(saida: string): Processo[] {
  const out: Processo[] = [];
  for (const linha of saida.split("\n")) {
    const m = /^\s*(\d+)\s+(\S+)\s+(.+?)\s*$/.exec(linha);
    if (m) out.push({ pid: Number(m[1]), usuario: m[2], programa: m[3] });
  }
  return out;
}

/**
 * Túneis do cloudflared a partir de `ps -axo args=`. Só devolve o NOME do arquivo de
 * configuração de cada túnel — nunca o resto da linha (pode ter token).
 */
export function lerTuneis(saidaArgs: string): string[] {
  const tuneis: string[] = [];
  for (const linha of saidaArgs.split("\n")) {
    const l = linha.trim();
    if (!/(^|\/)cloudflared\s/.test(l) || !/\stunnel\b/.test(l)) continue;
    const cfg = /--config[ =](\S+)/.exec(l)?.[1];
    tuneis.push(cfg ? basename(cfg) : /--token/.test(l) ? "(túnel por token)" : "(túnel sem --config)");
  }
  return tuneis.sort();
}

// ─── netstat ─────────────────────────────────────────────────────────────────

export interface Porta {
  porta: number;
  /** "todos" = aberta para a rede; "local" = só este computador. */
  alcance: "todos" | "local";
  processo: string;
  pid: number;
}

/** Saída de `netstat -anv -p tcp` (macOS): as portas em LISTEN, uma por porta+processo. */
export function lerNetstat(saida: string): Porta[] {
  const vistas = new Map<string, Porta>();
  for (const linha of saida.split("\n")) {
    if (!/\sLISTEN\s/.test(linha)) continue;
    const m = /^tcp\S*\s+\d+\s+\d+\s+(\S+)\s+\S+\s+LISTEN\s+(?:\d+\s+){4}(.+?):(\d+)\s+[0-9a-f]{5}\s/.exec(linha);
    if (!m) continue;
    const [, local, processo, pid] = m;
    const porta = Number(local.slice(local.lastIndexOf(".") + 1));
    if (!Number.isInteger(porta)) continue;
    const endereco = local.slice(0, local.lastIndexOf("."));
    const alcance = /^(127\.|::1$|localhost)/.test(endereco) ? "local" : "todos";
    const chave = `${porta}:${pid}`;
    const ja = vistas.get(chave);
    if (!ja) vistas.set(chave, { porta, alcance, processo: processo.trim(), pid: Number(pid) });
    else if (alcance === "todos") ja.alcance = "todos";
  }
  return [...vistas.values()].sort((a, b) => a.porta - b.porta || a.pid - b.pid);
}

// ─── launchd ─────────────────────────────────────────────────────────────────

/** Saída de `launchctl list`: rótulo → pid (null = carregado mas parado). */
export function lerLaunchctlList(saida: string): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const linha of saida.split("\n").slice(1)) {
    const [pid, , rotulo] = linha.split("\t");
    if (!rotulo) continue;
    m.set(rotulo.trim(), /^\d+$/.test(pid) ? Number(pid) : null);
  }
  return m;
}

/** Saída de `launchctl print <domínio>/<rótulo>`: está rodando e com qual pid. null = não carregado. */
export function lerLaunchctlPrint(saida: string | null): { rodando: boolean; pid: number | null } | null {
  if (!saida) return null;
  const estado = /^\tstate = (.+)$/m.exec(saida)?.[1]?.trim();
  if (!estado) return null;
  const pid = /^\tpid = (\d+)$/m.exec(saida)?.[1];
  return { rodando: estado === "running", pid: pid ? Number(pid) : null };
}

export interface Plist {
  rotulo: string;
  programa: string | null;
  /** Para intérpretes (python3, node, bash…): o script que eles rodam. */
  script: string | null;
}

const INTERPRETES = /^(python[0-9.]*|node|bash|sh|zsh|ruby|perl|deno|bun|uv|uvx|npx|pnpm|npm|osascript)$/;

/** JSON de `plutil -convert json -o - arquivo.plist`. */
export function lerPlist(json: string, arquivo: string): Plist | null {
  let p: { Label?: unknown; Program?: unknown; ProgramArguments?: unknown };
  try {
    p = JSON.parse(json);
  } catch {
    return null;
  }
  const rotulo = typeof p.Label === "string" ? p.Label : basename(arquivo, ".plist");
  const args = Array.isArray(p.ProgramArguments) ? p.ProgramArguments.filter((a): a is string => typeof a === "string") : [];
  const programa = typeof p.Program === "string" ? p.Program : (args[0] ?? null);
  let script: string | null = null;
  if (programa && INTERPRETES.test(basename(programa))) {
    script = args.slice(1).find((a) => a.startsWith("/") || a.startsWith("~")) ?? null;
  }
  return { rotulo, programa, script };
}

/**
 * Serviço "caseiro": feito à mão (ou por LLM) em vez de vir instalado por um aplicativo.
 * É o que virou a floresta de plists: script, intérprete ou programa dentro da pasta do usuário.
 */
export function ehCaseiro(p: Pick<Plist, "programa" | "script">): boolean {
  const alvos = [p.programa, p.script].filter((x): x is string => !!x);
  if (!alvos.length) return false;
  return alvos.some(
    (a) => a.startsWith("/Users/") || a.startsWith("~") || /\.(sh|py|js|mjs|cjs|ts|rb|pl)$/.test(a) || INTERPRETES.test(basename(a)),
  );
}

// ─── MCPs configurados nas IAs ───────────────────────────────────────────────

export interface Mcp {
  nome: string;
  /** De qual IA ou projeto veio. */
  fonte: string;
  tipo: "stdio" | "http";
  /** Nome do programa (stdio) ou o host (http) — nunca argumentos, env ou headers. */
  alvo: string;
}

function umMcp(nome: string, v: unknown, fonte: string): Mcp {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const url = [o.url, o.serverUrl, o.httpUrl].find((x): x is string => typeof x === "string");
  if (url || /^(http|sse|streamable-http)$/.test(String(o.type ?? ""))) {
    let host = "";
    try {
      host = url ? new URL(url).host : "";
    } catch {
      host = "";
    }
    return { nome, fonte, tipo: "http", alvo: host };
  }
  return { nome, fonte, tipo: "stdio", alvo: typeof o.command === "string" ? basename(o.command) : "" };
}

/** JSON no formato { mcpServers: {...} } (Claude Desktop, Cursor, Gemini, Antigravity, Kimi, Windsurf, .mcp.json) ou { servers: {...} } (VS Code). */
export function lerMcpsJson(texto: string, fonte: string): Mcp[] {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(texto);
  } catch {
    return [];
  }
  const grupo = (d.mcpServers ?? d.servers ?? {}) as Record<string, unknown>;
  return Object.entries(grupo).map(([nome, v]) => umMcp(nome, v, fonte));
}

/** ~/.claude.json: MCPs globais e os de cada projeto. */
export function lerMcpsClaudeCode(texto: string): Mcp[] {
  let d: { mcpServers?: Record<string, unknown>; projects?: Record<string, { mcpServers?: Record<string, unknown> }> };
  try {
    d = JSON.parse(texto);
  } catch {
    return [];
  }
  const out = Object.entries(d.mcpServers ?? {}).map(([n, v]) => umMcp(n, v, "claude-code"));
  for (const [caminho, p] of Object.entries(d.projects ?? {})) {
    for (const [n, v] of Object.entries(p?.mcpServers ?? {})) out.push(umMcp(n, v, `claude-code:${basename(caminho)}`));
  }
  return out;
}

/** ~/.codex/config.toml: seções [mcp_servers.<nome>]. Leitor mínimo, só o que precisamos. */
export function lerMcpsCodex(texto: string): Mcp[] {
  const servidores = new Map<string, Record<string, string>>();
  let atual: Record<string, string> | null = null;
  for (const bruta of texto.split("\n")) {
    const linha = bruta.trim();
    if (linha.startsWith("[")) {
      const m = /^\[mcp_servers\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]$/.exec(linha);
      atual = m ? { } : null;
      if (m) servidores.set(m[1] ?? m[2], atual!);
      continue;
    }
    const kv = /^(command|url|type)\s*=\s*"([^"]*)"/.exec(linha);
    if (atual && kv) atual[kv[1]] = kv[2];
  }
  return [...servidores].map(([nome, v]) => umMcp(nome, v, "codex"));
}

/** Um projeto cujo código É um servidor MCP (pelas dependências). */
export function projetoEhMcp(arquivos: { nome: string; texto: string }[]): boolean {
  for (const { nome, texto } of arquivos) {
    if (nome === "package.json") {
      try {
        const p = JSON.parse(texto) as Record<string, Record<string, string> | undefined>;
        const deps = { ...p.dependencies, ...p.devDependencies, ...p.peerDependencies };
        if (Object.keys(deps).some((d) => d === "@modelcontextprotocol/sdk" || d === "mcp-handler" || d === "@vercel/mcp-adapter" || d === "fastmcp" || d === "xmcp")) return true;
      } catch {
        /* package.json quebrado: não é prova de nada */
      }
    } else if (nome === "pyproject.toml") {
      if (/["'](mcp|fastmcp)(\[[^\]]*\])?\s*([<>=~!;][^"']*)?["']/.test(texto)) return true;
    } else if (nome === "requirements.txt") {
      if (/^\s*(mcp|fastmcp)(\[[^\]]*\])?\s*([<>=~!;]|$)/m.test(texto)) return true;
    } else if (nome === "Cargo.toml") {
      if (/^\s*rmcp\s*=/m.test(texto)) return true;
    }
  }
  return false;
}
