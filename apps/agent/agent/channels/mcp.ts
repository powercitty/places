import { localDev } from "eve/channels/auth";
import { mcpChannel } from "eve/channels/mcp";

// v0: só aceita chamadas em desenvolvimento local. A autenticação de produção
// (atrás do túnel de cada LAB) entra na fase 2, antes de qualquer LAB publicar este canal.
export default mcpChannel({
  auth: localDev(),
});
