# Alertas do verificador de segurança do Supabase que são de propósito

Não "conserte" estes itens sem mudar o desenho (PR na constituição).

| Alerta | Onde | Por que é assim |
|---|---|---|
| RLS ligado sem política (0008) | `powerfarm_observacao.*`, `powerfarm_registry.*` | Ninguém lê nem escreve direto nas tabelas. Todo acesso é por função com regra. |
| Anon executa função SECURITY DEFINER (0028) | `public.pf_agente_*` | Os agentes não têm login no Supabase. Chamam como anon e se provam com a senha própria (só o sha256 fica no banco), conferida dentro da função. Senha de 256 bits. |
| Logado executa função SECURITY DEFINER (0029) | `public.pf_places_*` | É a leitura do Places. A função exige que `auth.uid()` esteja em `powerfarm_observacao.operadores`. |
