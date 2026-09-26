-- Agentes não têm login no Supabase: chamam como anon e se provam pela senha dentro da função.
-- Quem está logado (operador) não precisa das funções de escrita dos agentes.
revoke execute on function public.pf_agente_sinais(text, text, jsonb) from authenticated;
revoke execute on function public.pf_agente_inventario(text, text, jsonb, timestamptz) from authenticated;
revoke execute on function public.pf_agente_eventos(text, text, jsonb) from authenticated;
revoke execute on function public.pf_agente_registry(text, text) from authenticated;
