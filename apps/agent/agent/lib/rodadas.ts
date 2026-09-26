// As duas rodadas do observador. Cada uma coleta, manda e nunca derruba o agente:
// se algo falhar, fica registrado no log e a próxima rodada tenta de novo.
import type { Sinal } from "@powerfarm/contract";
import { COMUM, MAQUINA, VERSAO } from "#lib/maquina.gerada.ts";
import { enviarEventos, enviarInventario, enviarSinais, lerRegistry } from "#lib/supabase.ts";
import { enviarFila } from "#lib/fila.ts";
import {
  sinalDaCarga,
  sinalDaInternet,
  sinalDaMemoria,
  sinalDoAgente,
  sinalDoDisco,
  sinalDoEndereco,
  sinalDoManhattan,
  sinalDoTunel,
  type Ambiente,
  type Endereco,
} from "#lib/coleta/sinais.ts";
import { inventario } from "#lib/coleta/inventario.ts";

const home = () => process.env.HOME ?? "/";
const ambiente = (): Ambiente => ({ maquina: MAQUINA.maquina, papel: MAQUINA.papel, home: home(), agora: () => new Date() });
const cuidaDaNuvem = () => (MAQUINA.lugares as readonly string[]).includes("apps");

async function sinalDoSupabase(a: Ambiente): Promise<Sinal> {
  const q = a.agora();
  const t0 = performance.now();
  try {
    const reg = await lerRegistry();
    return { lugar: "supabase", alvo: "kernal", aspecto: "alcance", estado: "ok", valor: { ms: Math.round(performance.now() - t0), entidades: reg.length }, observado_em: q.toISOString() };
  } catch (e) {
    return { lugar: "supabase", alvo: "kernal", aspecto: "alcance", estado: "olhar", valor: { erro: e instanceof Error ? e.message : String(e) }, observado_em: q.toISOString() };
  }
}

export async function coletarSinais(): Promise<Sinal[]> {
  const a = ambiente();
  const locais = await Promise.all([sinalDaMemoria(a), sinalDaInternet(a), sinalDoTunel(a), sinalDoManhattan(a)]);
  const sinais: Sinal[] = [sinalDoAgente(a, { ...VERSAO, eve: "0.67.0" }), sinalDoDisco(a), sinalDaCarga(a), ...locais];
  if (cuidaDaNuvem()) {
    sinais.push(await sinalDoSupabase(a));
    sinais.push(...(await Promise.all((COMUM.enderecos as readonly Endereco[]).map((e) => sinalDoEndereco(a, e)))));
  }
  return sinais;
}

export async function rodadaDeSinais(): Promise<void> {
  try {
    const sinais = await coletarSinais();
    await enviarSinais(sinais);
  } catch (e) {
    console.warn(`[powerfarm] sinais não enviados: ${e instanceof Error ? e.message : String(e)}`);
  }
  await enviarFila(enviarEventos);
}

export async function rodadaDeInventario(): Promise<void> {
  try {
    const agora = new Date().toISOString();
    const itens = await inventario({
      maquina: MAQUINA.maquina,
      registryDoAgente: MAQUINA.registry,
      rotuloDoAgente: COMUM.rotulo_do_agente,
      home: home(),
      agora,
    });
    await enviarInventario(itens, agora);
  } catch (e) {
    console.warn(`[powerfarm] inventário não enviado: ${e instanceof Error ? e.message : String(e)}`);
  }
}
