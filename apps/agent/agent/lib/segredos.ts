// Segredos do agente. Nunca ficam no git nem no arquivo do serviço.
// Ordem: variável de ambiente (só testes e CI) → Keychain deste LAB (serviço "powerfarm",
// conta = nome do segredo) → arquivo segredos.json na pasta de dados do agente, que só vale
// se ninguém além do dono puder ler (permissão 600). O arquivo existe para LAB sem ninguém na
// frente, onde o Keychain fica trancado para o serviço.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pastaDeDados } from "#lib/dados.ts";

export type NomeDoSegredo =
  | "PF_AGENTE_SEGREDO" //    o agente se identifica no Supabase (só o sha256 fica lá)
  | "PF_PLACES_JWT_SECRET" // a tela assina o token do chat com isto
  | "AI_GATEWAY_API_KEY"; //  inteligência pelo Vercel AI Gateway

export const SERVICO_NO_KEYCHAIN = "powerfarm";

export type LeitorDeKeychain = (nome: string) => string | undefined;

export const lerDoKeychain: LeitorDeKeychain = (nome) => {
  try {
    const v = execFileSync("/usr/bin/security", ["find-generic-password", "-s", SERVICO_NO_KEYCHAIN, "-a", nome, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return v || undefined;
  } catch {
    return undefined;
  }
};

export const arquivoDeSegredos = () => join(pastaDeDados(), "segredos.json");

/** Lê do arquivo só se ele for do dono e fechado para os outros. */
export function lerDoArquivo(caminho = arquivoDeSegredos()): LeitorDeKeychain {
  return (nome) => {
    try {
      const st = statSync(caminho);
      if ((st.mode & 0o077) !== 0 || (process.getuid && st.uid !== process.getuid())) {
        console.warn(`[powerfarm] ${caminho} está aberto para outros usuários: não uso`);
        return undefined;
      }
      const v = (JSON.parse(readFileSync(caminho, "utf8")) as Record<string, unknown>)[nome];
      return typeof v === "string" && v ? v : undefined;
    } catch {
      return undefined;
    }
  };
}

const lerDoKeychainOuArquivo: LeitorDeKeychain = (nome) => lerDoKeychain(nome) ?? lerDoArquivo()(nome);

const lidos = new Map<NomeDoSegredo, string>();

/** Devolve o segredo ou undefined (nunca lança). Guarda na memória depois da primeira leitura. */
export function segredo(nome: NomeDoSegredo, ler: LeitorDeKeychain = lerDoKeychainOuArquivo): string | undefined {
  const doAmbiente = process.env[nome];
  if (doAmbiente) return doAmbiente;
  const guardado = lidos.get(nome);
  if (guardado) return guardado;
  const v = ler(nome);
  if (v) lidos.set(nome, v);
  return v;
}

/** Para bibliotecas que só leem process.env (o AI Gateway): copia do Keychain para o ambiente do processo. */
export function carregarNoAmbiente(nomes: NomeDoSegredo[], ler: LeitorDeKeychain = lerDoKeychainOuArquivo): NomeDoSegredo[] {
  const faltando: NomeDoSegredo[] = [];
  for (const nome of nomes) {
    const v = segredo(nome, ler);
    if (v) process.env[nome] = v;
    else faltando.push(nome);
  }
  return faltando;
}

/** Só para testes. */
export function esquecerSegredos(): void {
  lidos.clear();
}
