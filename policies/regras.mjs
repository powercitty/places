#!/usr/bin/env node
// Regras da casa (constituição). Olha os arquivos que estão no git e barra o que viola AGENTS.md.
// Sem dependências: roda igual no CI e em qualquer LAB.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 5 * 1024 * 1024;

const ARQUIVOS_PROIBIDOS = [
  [/(^|\/)package-lock\.json$/, "trava do npm — só pnpm (regra 4)"],
  [/(^|\/)npm-shrinkwrap\.json$/, "trava do npm — só pnpm (regra 4)"],
  [/(^|\/)yarn\.lock$/, "trava do yarn — só pnpm (regra 4)"],
  [/(^|\/)bun\.lockb?$/, "trava do bun — só pnpm (regra 4)"],
  [/(^|\/)\.env(\.[^/]+)?$/, "arquivo de segredos — só .env.example (regra 6)"],
  [/\.plist$/, "serviço de launchd — serviço só pelo agente (regra 7)"],
  [/(^|\/)(crontab|.*\.cron)$/, "cron — serviço só pelo agente (regra 7)"],
  [/(^|\/)ecosystem\.config\.[cm]?js$/, "pm2 — serviço só pelo agente (regra 7)"],
  [/(^|\/)(node_modules|\.next|\.output|\.eve|\.nitro|target|\.venv|__pycache__)\//, "coisa que se refaz (regra 5)"],
  [/\.(gguf|safetensors|onnx|ckpt|dmg|pkg|iso|exe|msi|apk|ipa|whl|dylib|so|o|a)$/, "binário ou modelo (regra 5)"],
];
const ENV_EXEMPLO = /(^|\/)\.env\.example$/;

const SEGREDOS = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "chave privada"],
  [/\bsk-ant-[A-Za-z0-9_-]{20,}/, "chave da Anthropic"],
  [/\bsk-(proj-)?[A-Za-z0-9]{32,}/, "chave da OpenAI"],
  [/\bAKIA[0-9A-Z]{16}\b/, "chave da AWS"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}/, "token do GitHub"],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, "token do Slack"],
  [/\bvck_[A-Za-z0-9]{20,}/, "chave do Vercel AI Gateway"],
  [/SERVICE_ROLE[A-Z_]*\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{20,}/, "chave de serviço do Supabase"],
];
const SERVICO_NO_CODIGO = /\b(launchctl\s+(load|bootstrap|submit)|Library\/LaunchAgents|Library\/LaunchDaemons|crontab\s+-|pm2\s+(start|save|startup))\b/;
const CODIGO = /\.(m?[jt]sx?|cjs|sh|py|rs|go|swift)$/;
// Onde a regra 7 permite falar de launchd: nas próprias regras e no porteiro do agente (fase 3).
const PODE_FALAR_DE_SERVICO = [/^policies\//, /^apps\/agent\/agent\/lib\/porteiro\//];
const MAGICOS_BINARIO = ["cffaedfe", "cefaedfe", "feedfacf", "feedface", "cafebabe", "7f454c46"];

export function violacoesDeNome(caminho) {
  if (ENV_EXEMPLO.test(caminho)) return [];
  return ARQUIVOS_PROIBIDOS.filter(([re]) => re.test(caminho)).map(([, motivo]) => motivo);
}

export function violacoesDeConteudo(caminho, texto) {
  const v = SEGREDOS.filter(([re]) => re.test(texto)).map(([, o]) => `parece ${o} (regra 6)`);
  if (CODIGO.test(caminho) && !PODE_FALAR_DE_SERVICO.some((re) => re.test(caminho)) && SERVICO_NO_CODIGO.test(texto)) {
    v.push("código criando serviço fora do agente (regra 7)");
  }
  return v;
}

export function conferirVersoes(miseToml, versoes, pacoteRaiz) {
  const v = [];
  const node = /^\s*node\s*=\s*"([^"]+)"/m.exec(miseToml)?.[1];
  const pnpm = /^\s*pnpm\s*=\s*"([^"]+)"/m.exec(miseToml)?.[1];
  if (node !== versoes.node) v.push(`mise.toml diz node ${node}, a política diz ${versoes.node} (regra 3)`);
  if (pnpm !== versoes.pnpm) v.push(`mise.toml diz pnpm ${pnpm}, a política diz ${versoes.pnpm} (regra 3)`);
  if (pacoteRaiz.packageManager !== `pnpm@${versoes.pnpm}`) v.push(`package.json usa ${pacoteRaiz.packageManager}, a política diz pnpm@${versoes.pnpm} (regra 3)`);
  if (!String(pacoteRaiz.engines?.node ?? "").includes(`>=${versoes.node}`)) v.push(`package.json engines.node não trava o Node ${versoes.node} (regra 3)`);
  return v;
}

function binario(caminho) {
  try {
    const fd = openSync(caminho, "r");
    const b = Buffer.alloc(4);
    readSync(fd, b, 0, 4, 0);
    closeSync(fd);
    return MAGICOS_BINARIO.includes(b.toString("hex"));
  } catch {
    return false;
  }
}

function principal() {
  const arquivos = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
  const problemas = [];
  for (const f of arquivos) {
    for (const m of violacoesDeNome(f)) problemas.push([f, m]);
    let tam = 0;
    try { tam = statSync(f).size; } catch { continue; }
    if (tam > MAX_BYTES) problemas.push([f, `arquivo de ${(tam / 1e6).toFixed(1)} MB — limite 5 MB (regra 5)`]);
    if (binario(f)) problemas.push([f, "executável compilado (regra 5)"]);
    if (tam <= MAX_BYTES && !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i.test(f)) {
      for (const m of violacoesDeConteudo(f, readFileSync(f, "utf8"))) problemas.push([f, m]);
    }
  }
  const versoes = JSON.parse(readFileSync("policies/versoes.json", "utf8"));
  for (const m of conferirVersoes(readFileSync("mise.toml", "utf8"), versoes, JSON.parse(readFileSync("package.json", "utf8")))) {
    problemas.push(["versões", m]);
  }
  if (problemas.length) {
    console.error(`Regras da casa: ${problemas.length} problema(s)`);
    for (const [f, m] of problemas) console.error(`  ✗ ${f}: ${m}`);
    process.exit(1);
  }
  console.log(`Regras da casa: ok (${arquivos.length} arquivos conferidos)`);
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) principal();
