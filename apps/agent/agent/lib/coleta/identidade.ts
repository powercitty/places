// Como algo visto neste computador vira um id no formato do Registry.
// Quando a casa já conhece a coisa, usa o id oficial; senão, um id local desta máquina.
import { idPara } from "@powerfarm/contract";

/** Serviços que a casa conhece pelo nome no launchd. */
const CONHECIDOS: [RegExp, string][] = [
  [/^com\.project-manhattan\./, "powerfarm.process.manhattan"],
  [/^work\.minilab\.antenna$/, "powerfarm.antenna"],
];

export function idDoServico(rotulo: string, maquina: string, rotuloDoAgente: string, registryDoAgente: string): string {
  if (rotulo === rotuloDoAgente) return registryDoAgente;
  for (const [re, id] of CONHECIDOS) if (re.test(rotulo)) return id;
  return idPara(maquina, "servico", rotulo);
}

/** Serviço reconhecido pela casa (não conta como "caseiro fora do agente"). */
export function servicoConhecido(rotulo: string, rotuloDoAgente: string): boolean {
  return rotulo === rotuloDoAgente || CONHECIDOS.some(([re]) => re.test(rotulo));
}

export const idDoMcp = (nome: string) => idPara("mcp", nome);
export const idDaPorta = (maquina: string, porta: number) => idPara(maquina, "porta", String(porta));
export const idDoProjeto = (maquina: string, nome: string) => idPara(maquina, "projeto", nome);
export const idDaPasta = (maquina: string, nome: string) => idPara(maquina, "pasta", nome);
export const idDoContainer = (maquina: string, nome: string) => idPara(maquina, "container", nome);
