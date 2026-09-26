// Roda programas do sistema só para LER (nunca por shell, sempre com prazo).
import { execFile } from "node:child_process";

// O launchd dá um PATH mínimo; estes são os lugares onde os LABs têm ferramentas.
const PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

/** Devolve a saída do programa, ou null se ele não existe, falhou ou passou do prazo. */
export function rodar(programa: string, args: string[], prazoMs = 10_000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      programa,
      args,
      { timeout: prazoMs, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PATH, LC_ALL: "C" }, encoding: "utf8" },
      (erro, saida) => resolve(erro ? null : saida),
    );
  });
}
