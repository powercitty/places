// Fila local dos eventos do agente, antes de irem para o Supabase.
// Guardar é só acrescentar uma linha num arquivo (rápido, nunca falha a conversa).
// Enviar pega o arquivo inteiro, manda em lotes e só apaga depois que o Supabase aceitou.
// Se a internet cair, os eventos esperam no disco. Mandar duas vezes não duplica (id do evento).
import { appendFileSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { EventoGuardado } from "#lib/supabase.ts";

export const pastaDeDados = () => process.env.PF_AGENTE_DADOS ?? join(process.cwd(), ".eve", "powerfarm");

const LOTE = 500;
const MAX_BYTES_POR_EVENTO = 64 * 1024;
/** Pedaços de texto que chegam aos montes enquanto o modelo escreve: a versão final vem em *.completed. */
const SO_PEDACOS = /\.appended$|^action\.partial$/;

export function deveGuardar(tipo: string): boolean {
  return !SO_PEDACOS.test(tipo);
}

export function limitar(e: EventoGuardado): EventoGuardado {
  const bytes = Buffer.byteLength(JSON.stringify(e.dados ?? null));
  if (bytes <= MAX_BYTES_POR_EVENTO) return e;
  return { ...e, dados: { truncado: true, bytes } };
}

export function guardar(e: EventoGuardado, pasta = pastaDeDados()): void {
  mkdirSync(pasta, { recursive: true });
  appendFileSync(join(pasta, "fila.ndjson"), JSON.stringify(limitar(e)) + "\n");
}

export type Enviar = (lote: EventoGuardado[]) => Promise<unknown>;

let emAndamento: Promise<number> | null = null;

/** Manda tudo o que está na fila. Devolve quantos eventos o Supabase aceitou. Nunca lança. */
export function enviarFila(enviar: Enviar, pasta = pastaDeDados()): Promise<number> {
  if (emAndamento) return emAndamento;
  const p = mandar(enviar, pasta);
  emAndamento = p;
  void p.finally(() => {
    if (emAndamento === p) emAndamento = null;
  });
  return p;
}

async function mandar(enviar: Enviar, pasta: string): Promise<number> {
  let enviados = 0;
  try {
    try {
      renameSync(join(pasta, "fila.ndjson"), join(pasta, `enviando-${Date.now()}-${process.pid}.ndjson`));
    } catch {
      /* fila vazia */
    }
    let arquivos: string[] = [];
    try {
      arquivos = readdirSync(pasta).filter((n) => /^enviando-.*\.ndjson$/.test(n)).sort();
    } catch {
      return 0;
    }
    for (const nome of arquivos) {
      const caminho = join(pasta, nome);
      const eventos = readFileSync(caminho, "utf8")
        .split("\n")
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l) as EventoGuardado];
          } catch {
            return [];
          }
        });
      for (let i = 0; i < eventos.length; i += LOTE) await enviar(eventos.slice(i, i + LOTE));
      unlinkSync(caminho);
      enviados += eventos.length;
    }
  } catch (e) {
    console.warn(`[powerfarm] eventos esperando na fila: ${e instanceof Error ? e.message : String(e)}`);
  }
  return enviados;
}

let agendado: ReturnType<typeof setTimeout> | null = null;

/** Depois de um evento, espera um pouco (junta vários) e manda. */
export function agendarEnvio(enviar: Enviar, esperaMs = 2000): void {
  if (agendado) return;
  agendado = setTimeout(() => {
    agendado = null;
    void enviarFila(enviar);
  }, esperaMs);
  agendado.unref?.();
}
