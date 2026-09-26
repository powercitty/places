// Segredos do agente. Nunca ficam em arquivo: vêm do Keychain deste LAB
// (serviço "powerfarm", conta = nome do segredo). Variável de ambiente com o mesmo nome
// tem prioridade — só para testes e CI.
import { execFileSync } from "node:child_process";

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

const lidos = new Map<NomeDoSegredo, string>();

/** Devolve o segredo ou undefined (nunca lança). Guarda na memória depois da primeira leitura. */
export function segredo(nome: NomeDoSegredo, ler: LeitorDeKeychain = lerDoKeychain): string | undefined {
  const doAmbiente = process.env[nome];
  if (doAmbiente) return doAmbiente;
  const guardado = lidos.get(nome);
  if (guardado) return guardado;
  const v = ler(nome);
  if (v) lidos.set(nome, v);
  return v;
}

/** Para bibliotecas que só leem process.env (o AI Gateway): copia do Keychain para o ambiente do processo. */
export function carregarNoAmbiente(nomes: NomeDoSegredo[], ler: LeitorDeKeychain = lerDoKeychain): NomeDoSegredo[] {
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
