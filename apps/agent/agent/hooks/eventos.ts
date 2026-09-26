import { defineHook } from "eve/hooks";
import { agendarEnvio, deveGuardar, guardar } from "#lib/fila.ts";
import { enviarEventos } from "#lib/supabase.ts";

// Cópia de cada evento do agente (conversa, ferramentas, aprovações, uso) para o Supabase.
// Um hook que lança derruba a conversa — por isso aqui nada lança.
export default defineHook({
  events: {
    "*"(event, ctx) {
      try {
        if (!event.meta?.id || !deveGuardar(event.type)) return;
        const quem = ctx.session.auth.current;
        guardar({
          id: event.meta.id,
          sessao: ctx.session.id,
          tipo: event.type,
          dados: {
            data: "data" in event ? event.data : null,
            quem: quem ? { id: quem.principalId, tipo: quem.principalType, via: quem.authenticator } : null,
            canal: ctx.channel.kind ?? null,
          },
          emitido_em: event.meta.at,
        });
        agendarEnvio(enviarEventos);
      } catch (e) {
        console.warn(`[powerfarm] evento não guardado: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  },
});
