import { defineAgent } from "eve";
import { MAQUINA } from "#lib/maquina.gerada.ts";
import { carregarNoAmbiente } from "#lib/segredos.ts";

// A chave do AI Gateway vem do Keychain deste LAB (a biblioteca do modelo só lê process.env).
const faltando = carregarNoAmbiente(["AI_GATEWAY_API_KEY"]);
if (faltando.length) console.warn(`[powerfarm] sem ${faltando.join(", ")} no Keychain: o chat não vai conseguir pensar`);

// O nome do agente vem do package.json; o que muda por máquina é o perfil (machines/<id>.json).
export default defineAgent({
  model: MAQUINA.modelo,
});
