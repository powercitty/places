-- O Supabase dá execução a anon em toda função nova do public (privilégio padrão).
-- As leituras do Places são só para quem entrou (authenticated) e é operador.
revoke execute on function public.pf_places_estado() from anon;
revoke execute on function public.pf_places_eventos(text, text, integer) from anon;
