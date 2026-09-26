// Fala com o powerfarm.kernal só pelas funções pf_agente_* (o agente não enxerga tabela nenhuma).
// A chave pública só abre a porta da API; quem autoriza é o segredo deste agente.
import type { Sinal, Observado } from "@powerfarm/contract";
import { COMUM, MAQUINA } from "#lib/maquina.gerada.ts";
import { segredo } from "#lib/segredos.ts";

export class ErroDoSupabase extends Error {
  readonly funcao: string;
  readonly status: number;
  readonly corpo: string;
  constructor(funcao: string, status: number, corpo: string) {
    super(`${funcao}: HTTP ${status} ${corpo.slice(0, 200)}`);
    this.funcao = funcao;
    this.status = status;
    this.corpo = corpo;
  }
}

export interface Conexao {
  url: string;
  chavePublica: string;
  maquina: string;
  segredo: () => string | undefined;
  fetch: typeof fetch;
}

export const conexaoPadrao = (): Conexao => ({
  url: COMUM.supabase_url,
  chavePublica: COMUM.supabase_chave_publica,
  maquina: MAQUINA.maquina,
  segredo: () => segredo("PF_AGENTE_SEGREDO"),
  fetch: globalThis.fetch,
});

export async function chamar<T>(funcao: string, args: Record<string, unknown>, c: Conexao = conexaoPadrao()): Promise<T> {
  const s = c.segredo();
  if (!s) throw new ErroDoSupabase(funcao, 0, "este LAB ainda não tem PF_AGENTE_SEGREDO no Keychain");
  const r = await c.fetch(`${c.url}/rest/v1/rpc/${funcao}`, {
    method: "POST",
    headers: { apikey: c.chavePublica, "content-type": "application/json" },
    body: JSON.stringify({ p_maquina: c.maquina, p_segredo: s, ...args }),
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await r.text();
  if (!r.ok) throw new ErroDoSupabase(funcao, r.status, texto);
  return (texto ? JSON.parse(texto) : null) as T;
}

export const enviarSinais = (sinais: Sinal[], c?: Conexao) => chamar<number>("pf_agente_sinais", { p_sinais: sinais }, c);

export const enviarInventario = (itens: Observado[], observadoEm: string, c?: Conexao) =>
  chamar<number>("pf_agente_inventario", { p_itens: itens, p_observado_em: observadoEm }, c);

export interface EventoGuardado {
  id: string;
  sessao: string;
  tipo: string;
  dados: unknown;
  emitido_em: string;
}

export const enviarEventos = (eventos: EventoGuardado[], c?: Conexao) => chamar<number>("pf_agente_eventos", { p_eventos: eventos }, c);

export const lerRegistry = (c?: Conexao) =>
  chamar<{ id: string; kind: string; title: string; summary: string | null }[]>("pf_agente_registry", {}, c);
