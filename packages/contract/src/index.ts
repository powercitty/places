// Contrato entre a tela (coloured-places) e o agente local, e o modelo das 4 situações.
// Mudanças aqui quebram a tela ou o agente — o CI roda os testes de contrato nos dois lados.

/** Versão do MCP que os agentes falam (sem estado). */
export const MCP_PROTOCOL_VERSION = "2026-07-28";

export type Maquina = "lab-256" | "lab-512" | "lab-8gb";
export type Papel = "principal" | "reserva" | "bancada";
export type Lugar = "supabase" | "labs" | "apps" | "engines" | "drive";

// ─── Conversa tela → agente (canal Eve) ─────────────────────────────────────
// O chat NÃO é MCP. A tela fala com o canal Eve do agente (/eve/v1/...) passando por um
// proxy no servidor da tela. O proxy assina um token curto (HS256) com a identidade do
// operador; o agente confere emissor, audiência e prazo antes de aceitar.

/** Quem assina o token do chat. */
export const EMISSOR_DO_CHAT = "places.minilab.work";
/** Validade do token do chat, em segundos. */
export const VALIDADE_DO_TOKEN_S = 300;
/** Audiência do token: cada agente só aceita token feito para ele. */
export function audienciaDoAgente(maquina: Maquina): string {
  return `pf-agente-${maquina}`;
}
/** Caminho do proxy na tela: /eve/<maquina>/v1/** → agente /eve/v1/** */
export function caminhoNoProxy(maquina: Maquina, resto: string): string {
  return `/eve/${maquina}/v1/${resto.replace(/^\/+/, "")}`;
}

// ─── O que o agente manda para o Supabase ────────────────────────────────────

/** Onde um sinal vital foi medido. "agentes" = o próprio agente. */
export type LugarDoSinal = Lugar | "agentes";
export type EstadoDoSinal = "ok" | "olhar" | "desconhecido";

/** Um sinal vital: pequeno, frequente (a cada minuto). */
export interface Sinal {
  lugar: LugarDoSinal;
  /** O que foi medido (ex.: "lab-256", "manhattan", "kernal"). */
  alvo: string;
  /** Qual aspecto (ex.: "disco", "memoria", "internet", "tunel"). */
  aspecto: string;
  estado: EstadoDoSinal;
  valor: Record<string, unknown>;
  /** ISO 8601 */
  observado_em: string;
}

// ─── O que existe × o que está registrado ────────────────────────────────────

/** Algo que o observador encontrou de fato numa máquina ou lugar. */
export interface Observado {
  /** Nome estável no formato do Registry: powerfarm.<...> */
  id: string;
  tipo: string;
  maquina: Maquina | null;
  nome: string;
  detalhe?: string;
  /** ISO 8601 */
  vistoEm: string;
  /** Pela política da casa, isto não deveria existir (ex.: serviço criado fora do agente). */
  proibido?: boolean;
  /** Por que é proibido, em português simples. */
  motivo?: string;
}

/** Entidade do Registry (powerfarm_registry.entidades), no formato que a tela recebe. */
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

const ID_DO_REGISTRY = /^powerfarm(\.[a-z0-9][a-z0-9-]*)+$/;

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

/** Monta o id estável de algo observado: powerfarm.<partes...> */
export function idPara(...partes: string[]): string {
  return ["powerfarm", ...partes.map(slug)].join(".");
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
