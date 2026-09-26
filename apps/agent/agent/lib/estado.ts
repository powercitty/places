// Estado deste computador, só leitura. Sem dependências além do Node.
import { hostname, uptime, totalmem, freemem } from "node:os";
import { readdirSync, statfsSync } from "node:fs";
import { join } from "node:path";

export const PASTAS = ["Projetos", "Zipfiles", "Markdowns", "Arquivos soltos"] as const;

export interface Estado {
  host: string;
  ligadoHaHoras: number;
  memoriaLivreGb: number;
  memoriaTotalGb: number;
  discoLivreGb: number | null;
  pastas: Record<string, number | null>;
  vistoEm: string;
}

const gb = (b: number) => Math.round((b / 1e9) * 10) / 10;

export function contarItens(caminho: string): number | null {
  try {
    return readdirSync(caminho).filter((n) => n !== ".DS_Store").length;
  } catch {
    return null;
  }
}

export function lerEstado(home = process.env.HOME ?? "/"): Estado {
  let discoLivreGb: number | null = null;
  try {
    const s = statfsSync(home);
    discoLivreGb = gb(s.bavail * s.bsize);
  } catch {
    discoLivreGb = null;
  }
  return {
    host: hostname(),
    ligadoHaHoras: Math.round(uptime() / 360) / 10,
    memoriaLivreGb: gb(freemem()),
    memoriaTotalGb: gb(totalmem()),
    discoLivreGb,
    pastas: Object.fromEntries(PASTAS.map((p) => [p, contarItens(join(home, p))])),
    vistoEm: new Date().toISOString(),
  };
}
