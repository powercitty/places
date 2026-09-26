import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// Fixo, para o build ser igual em qualquer máquina e no CI (o padrão do Eve escolhe
// conforme o que está instalado). just-bash: shell em JavaScript, sem processo nativo.
// O v0 só olha; quando o agente precisar rodar coisas de verdade, isso muda por PR na constituição.
export const environment = JustBashSandbox.environment({ autoInstall: false });
export default defineSandbox(() => environment.open());
