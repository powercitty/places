import assert from "node:assert/strict";
import test from "node:test";
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
  lerTuneis,
  projetoEhMcp,
} from "../agent/lib/coleta/leitura.ts";

// Linhas no formato real dos LABs (LAB 8GB e LAB 256, setembro de 2026).

test("ps: pega pid, usuário e o caminho do programa, mesmo com espaço no nome", () => {
  const ps = lerPs("  961 ubl-ops  /Applications/Google Drive.app/Contents/MacOS/Google Drive\n  905 ubl-ops  /usr/local/project-manhattan/bin/manhattan-agent\n");
  assert.deepEqual(ps, [
    { pid: 961, usuario: "ubl-ops", programa: "/Applications/Google Drive.app/Contents/MacOS/Google Drive" },
    { pid: 905, usuario: "ubl-ops", programa: "/usr/local/project-manhattan/bin/manhattan-agent" },
  ]);
});

test("túneis: só o nome do arquivo de configuração — token nunca sai", () => {
  const t = lerTuneis(
    [
      "/opt/homebrew/bin/cloudflared tunnel --config /etc/cloudflared/lab-8gb-inference.yml --no-autoupdate run",
      "/opt/homebrew/bin/cloudflared tunnel --config /Users/danvoulez/.cloudflared/ssh8gb.yml run",
      "cloudflared tunnel run --token eyJhIjoiU0VHUkVETyJ9",
      "/usr/bin/grep cloudflared",
      "cloudflared access ssh --hostname ssh8gb.minilab.work",
    ].join("\n"),
  );
  assert.deepEqual(t, ["(túnel por token)", "lab-8gb-inference.yml", "ssh8gb.yml"]);
  assert.ok(!JSON.stringify(t).includes("eyJ"));
});

test("netstat: uma entrada por porta+processo, e diz se é aberta para a rede", () => {
  const saida = [
    "Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)          rxbytes      txbytes  rhiwat  shiwat          process:pid    state  options           gencnt    flags   flags1 usecnt rtncnt fltrs",
    "tcp4       0      0  192.168.0.156.56986    172.217.119.4.443      ESTABLISHED        14142         9986  131072  131600     Google Drive:961    00102 00000008 0000000000023820 00000081 04000900      2      0 000000",
    "tcp4       0      0  127.0.0.1.3977         *.*                    LISTEN                 0            0  131072  131072             node:38731  00100 00000106 00000000000113b2 00000001 00000800      1      0 000000",
    "tcp4       0      0  *.8088                 *.*                    LISTEN                 0            0  131072  131072           Python:299    00080 00000006 000000000000170e 00000000 00000800      1      0 000000",
    "tcp6       0      0  ::1.7679               *.*                    LISTEN                 0            0  131072  131072     Google Drive:961    00100 00000006 000000000000142f 00000001 00000800      1      0 000000",
    "tcp46      0      0  *.49232                *.*                    LISTEN                 0            0  131072  131072   Remote for Mac:910    00100 00000006 00000000000013a3 00000000 00000800      1      0 000000",
    "tcp4       0      0  *.49232                *.*                    LISTEN                 0            0  131072  131072   Remote for Mac:910    00100 00000006 00000000000013a2 00000000 00000800      1      0 000000",
  ].join("\n");
  assert.deepEqual(lerNetstat(saida), [
    { porta: 3977, alcance: "local", processo: "node", pid: 38731 },
    { porta: 7679, alcance: "local", processo: "Google Drive", pid: 961 },
    { porta: 8088, alcance: "todos", processo: "Python", pid: 299 },
    { porta: 49232, alcance: "todos", processo: "Remote for Mac", pid: 910 },
  ]);
});

test("launchctl list: rótulo → pid, parado = null", () => {
  const m = lerLaunchctlList("PID\tStatus\tLabel\n905\t0\tcom.project-manhattan.agent\n-\t0\tai.kimi.cu.service\n");
  assert.equal(m.get("com.project-manhattan.agent"), 905);
  assert.equal(m.get("ai.kimi.cu.service"), null);
});

test("plist: programa, e o script quando é intérprete", () => {
  const p = lerPlist(JSON.stringify({ Label: "work.minilab.mistral-bus-bridge", ProgramArguments: ["/usr/bin/python3", "-u", "/Users/danvoulez/lab/bridge.py"] }), "x.plist");
  assert.deepEqual(p, { rotulo: "work.minilab.mistral-bus-bridge", programa: "/usr/bin/python3", script: "/Users/danvoulez/lab/bridge.py" });
  assert.equal(lerPlist("não é json", "x.plist"), null);
  assert.equal(lerPlist(JSON.stringify({ Program: "/opt/homebrew/bin/cloudflared" }), "com.minilab.cloudflared-ssh.plist")?.rotulo, "com.minilab.cloudflared-ssh");
});

test("caseiro: script, intérprete ou programa na pasta do usuário; aplicativo instalado não", () => {
  assert.equal(ehCaseiro({ programa: "/Users/danvoulez/lab/antenna/bin/antenna", script: null }), true);
  assert.equal(ehCaseiro({ programa: "/usr/bin/python3", script: "/Users/danvoulez/lab/bridge.py" }), true);
  assert.equal(ehCaseiro({ programa: "/Library/Application Support/CICLO/auto-update.sh", script: null }), true);
  assert.equal(ehCaseiro({ programa: "/opt/homebrew/bin/cloudflared", script: null }), false);
  assert.equal(ehCaseiro({ programa: "/usr/local/project-manhattan/bin/manhattan-agent", script: null }), false);
  assert.equal(ehCaseiro({ programa: "/Applications/TeamViewer.app/Contents/MacOS/TeamViewer", script: null }), false);
  assert.equal(ehCaseiro({ programa: null, script: null }), false);
});

test("MCPs em JSON: nome, tipo e alvo — nunca env, args, headers ou query", () => {
  const texto = JSON.stringify({
    mcpServers: {
      "desktop-commander": { command: "/opt/homebrew/bin/npx", args: ["-y", "x", "--api-key=SEGREDO"], env: { KEY: "sk-ant-api03-SEGREDO" } },
      "expedition-mcp": { url: "https://mcp.exemplo.dev/sse?token=SEGREDO_NA_URL", headers: { Authorization: "Bearer SEGREDO" } },
    },
  });
  const m = lerMcpsJson(texto, "cursor");
  assert.deepEqual(m, [
    { nome: "desktop-commander", fonte: "cursor", tipo: "stdio", alvo: "npx" },
    { nome: "expedition-mcp", fonte: "cursor", tipo: "http", alvo: "mcp.exemplo.dev" },
  ]);
  assert.ok(!JSON.stringify(m).includes("SEGREDO"));
  assert.deepEqual(lerMcpsJson(JSON.stringify({ servers: { gh: { type: "http", url: "https://api.githubcopilot.com/mcp/" } } }), "vscode"), [
    { nome: "gh", fonte: "vscode", tipo: "http", alvo: "api.githubcopilot.com" },
  ]);
  assert.deepEqual(lerMcpsJson("{quebrado", "x"), []);
});

test("MCPs do Claude Code: globais e por projeto", () => {
  const m = lerMcpsClaudeCode(JSON.stringify({ mcpServers: { "kimi-cu": { command: "kimi-cu" } }, projects: { "/Users/x/Projetos/abc": { mcpServers: { db: { type: "http", url: "https://db.local:8443/mcp" } } }, "/Users/x/y": {} } }));
  assert.deepEqual(m, [
    { nome: "kimi-cu", fonte: "claude-code", tipo: "stdio", alvo: "kimi-cu" },
    { nome: "db", fonte: "claude-code:abc", tipo: "http", alvo: "db.local:8443" },
  ]);
});

test("MCPs do Codex (TOML): ignora subtabelas de env e o resto do arquivo", () => {
  const toml = [
    'model = "gpt-6"',
    "[mcp_servers.linear]",
    'url = "https://mcp.linear.app/mcp"',
    "[mcp_servers.playwright]",
    'command = "npx"',
    'args = ["@playwright/mcp"]',
    "[mcp_servers.playwright.env]",
    'TOKEN = "SEGREDO"',
    '[mcp_servers."marketing-room-eve"]',
    'url = "https://marketing.exemplo.dev/eve/v1/mcp"',
    "[profiles.rapido]",
    'command = "nao-e-mcp"',
  ].join("\n");
  const m = lerMcpsCodex(toml);
  assert.deepEqual(m, [
    { nome: "linear", fonte: "codex", tipo: "http", alvo: "mcp.linear.app" },
    { nome: "playwright", fonte: "codex", tipo: "stdio", alvo: "npx" },
    { nome: "marketing-room-eve", fonte: "codex", tipo: "http", alvo: "marketing.exemplo.dev" },
  ]);
  assert.ok(!JSON.stringify(m).includes("SEGREDO"));
});

test("projeto que É servidor MCP, pelas dependências (Node, Python, Rust)", () => {
  assert.equal(projetoEhMcp([{ nome: "package.json", texto: JSON.stringify({ dependencies: { "@modelcontextprotocol/sdk": "^2.0.0" } }) }]), true);
  assert.equal(projetoEhMcp([{ nome: "pyproject.toml", texto: 'dependencies = ["httpx>=0.28", "mcp[cli]>=1.9"]' }]), true);
  assert.equal(projetoEhMcp([{ nome: "requirements.txt", texto: "httpx\nfastmcp==2.3\n" }]), true);
  assert.equal(projetoEhMcp([{ nome: "Cargo.toml", texto: '[dependencies]\nrmcp = { version = "0.9" }' }]), true);
  assert.equal(projetoEhMcp([{ nome: "package.json", texto: JSON.stringify({ dependencies: { next: "16" } }) }]), false);
  assert.equal(projetoEhMcp([{ nome: "pyproject.toml", texto: 'dependencies = ["mcpx-tools>=1", "requests"]' }]), false);
});

test("launchctl print: rodando com pid, parado, ou não carregado", () => {
  assert.deepEqual(lerLaunchctlPrint("system/x = {\n\tactive count = 1\n\tstate = running\n\tpid = 299\n\tendpoints = {\n\t\tstate = active\n\t}\n}"), { rodando: true, pid: 299 });
  assert.deepEqual(lerLaunchctlPrint("x = {\n\tstate = not running\n}"), { rodando: false, pid: null });
  assert.equal(lerLaunchctlPrint('Bad request.\nCould not find service "x" in domain for system'), null);
  assert.equal(lerLaunchctlPrint(null), null);
});
