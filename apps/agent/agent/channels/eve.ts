import { eveChannel } from "eve/channels/eve";
import { jwtHmac, localDev, type AuthFn } from "eve/channels/auth";
import { EMISSOR_DO_CHAT, audienciaDoAgente } from "@powerfarm/contract";
import { MAQUINA } from "#lib/maquina.gerada.ts";
import { segredo } from "#lib/segredos.ts";

// O chat da tela chega aqui (via proxy da tela + túnel). Só entra com token curto assinado
// pela tela com a identidade do operador. Sem o segredo no Keychain, ninguém entra.
let verificador: AuthFn<Request> | null = null;

const tokenDaTela: AuthFn<Request> = (request) => {
  const s = segredo("PF_PLACES_JWT_SECRET");
  if (!s) return null;
  verificador ??= jwtHmac({
    algorithm: "HS256",
    issuer: EMISSOR_DO_CHAT,
    audiences: [audienciaDoAgente(MAQUINA.maquina)],
    secret: s,
    clockSkewSeconds: 30,
  });
  return verificador(request);
};

export default eveChannel({ auth: [tokenDaTela, localDev()] });
