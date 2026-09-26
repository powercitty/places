// Onde o agente guarda o que é só dele neste LAB (fila de eventos, log, segredos sem Keychain).
// Fica dentro da pasta do agente, nunca no git (.eve/ é ignorado).
import { join } from "node:path";

export const pastaDeDados = () => process.env.PF_AGENTE_DADOS ?? join(process.cwd(), ".eve", "powerfarm");
