// Contrato entre a tela (coloured-places) e o agente local, e o modelo das 4 situações.
// Mudanças aqui quebram a tela ou o agente — o CI roda os testes de contrato nos dois lados.

/** Versão do MCP que os agentes falam (sem estado). */
export const MCP_PROTOCOL_VERSION = "2026-07-28";

export type Maquina = "lab-256" | "lab-512" | "lab-8gb";
export type Papel = "principal" | "reserva" | "bancada";
export type Lugar = "supabase" | "labs" | "apps" | "engines" | "drive";

// ─── Conversa tela → agente (o que coloured-places já envia e espera) ─────────

/** Corpo do POST /api/agent-runtime/places/{placeId}/messages */
export interface MensagemParaAgente {
  session_id: string | null;
  text: string;
  app_id?: string | null;
  policy_overrides?: Record<string, unknown> | null;
  files?: unknown[];
}

/** Resposta do agente (ControlPlaneSendOutcome na tela). */
export interface RespostaDoAgente {
  session_id: string;
  app_id?: string | null;
  run_id: string;
  output_kind: string;
  status: string;
  text: string;
  effective_policy?: Record<string, unknown> | null;
}

// ─── O que existe × o que está registrado ────────────────────────────────────

/** Algo que o observador encontrou de fato numa máquina ou lugar. */
export interface Observado {
  /** Nome estável no formato do Registry: pf.<...> */
  id: string;
  tipo: string;
  maquina: Maquina | null;
  nome: string;
  detalhe?: string;
  /** ISO 8601 */
  vistoEm: string;
  /** Pela política da casa, isto não deveria existir (ex.: serviço criado fora do agente). */
  proibido?: boolean;
}

/** Linha de powerfarm_registry.entities (só o que a tela precisa). */
export interface Registrado {
  id: string;
  kind: string;
  title: string;
  retired_at: string | null;
}

export type Situacao =
  | "registrado" //    existe e está registrado
  | "faltando" //      registrado, mas não está lá
  | "nao-registrado" // existe e não está registrado
  | "nao-deveria"; //  existe e não deveria (aposentado no Registry ou proibido pela política)

export interface Linha {
  id: string;
  situacao: Situacao;
  observado?: Observado;
  registrado?: Registrado;
}

/** Tipos do Registry que dá para observar (pessoa e setor não "rodam" em lugar nenhum). */
export const TIPOS_OBSERVAVEIS = new Set(["machine", "service", "process", "app", "engine", "mcp"]);

const ID_DO_REGISTRY = /^pf(\.[a-z0-9][a-z0-9-]*)+$/;

export function idValido(id: string): boolean {
  return ID_DO_REGISTRY.test(id);
}

/** Converte qualquer nome em um pedaço válido de id do Registry. */
export function slug(nome: string): string {
  const s = nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "sem-nome";
}

/** Monta o id estável de algo observado: pf.<partes...> */
export function idPara(...partes: string[]): string {
  return ["pf", ...partes.map(slug)].join(".");
}

/**
 * Cruza o que existe com o que está registrado.
 * Aparecer na lista vem de EXISTIR (ou de estar registrado e faltar); a etiqueta vem do Registry.
 */
export function cruzar(observados: Observado[], registrados: Registrado[]): Linha[] {
  const reg = new Map(registrados.map((r) => [r.id, r]));
  const vistos = new Set<string>();
  const linhas: Linha[] = [];
  for (const o of observados) {
    vistos.add(o.id);
    const r = reg.get(o.id);
    let situacao: Situacao;
    if (o.proibido || (r && r.retired_at)) situacao = "nao-deveria";
    else if (r) situacao = "registrado";
    else situacao = "nao-registrado";
    linhas.push({ id: o.id, situacao, observado: o, registrado: r });
  }
  for (const r of registrados) {
    if (!vistos.has(r.id) && !r.retired_at && TIPOS_OBSERVAVEIS.has(r.kind)) {
      linhas.push({ id: r.id, situacao: "faltando", registrado: r });
    }
  }
  const ordem: Record<Situacao, number> = { "nao-deveria": 0, faltando: 1, "nao-registrado": 2, registrado: 3 };
  return linhas.sort((a, b) => ordem[a.situacao] - ordem[b.situacao] || a.id.localeCompare(b.id));
}
