import { defineAgent } from "eve";
import { MAQUINA } from "#lib/maquina.gerada.ts";

// O nome do agente vem do package.json; o que muda por máquina é o perfil (machines/<id>.json).
export default defineAgent({
  model: MAQUINA.modelo,
});
