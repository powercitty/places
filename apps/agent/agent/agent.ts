import { defineAgent } from "eve";
import { MAQUINA } from "#lib/maquina.gerada.ts";

// A chave do AI Gateway entra no ambiente antes do Eve subir: o serviço roda
// `node --import scripts/carregar-segredos.mjs` (este arquivo só é lido no build).
// O nome do agente vem do package.json; o que muda por máquina é o perfil (machines/<id>.json).
export default defineAgent({
  model: MAQUINA.modelo,
});
