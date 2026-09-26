-- Powerfarm · observação: sinais vitais, inventário (o que existe) e eventos dos agentes.
--
-- Regras desta base:
--   * Tudo fica no esquema privado powerfarm_observacao, com RLS ligado e SEM políticas:
--     ninguém lê nem escreve direto nas tabelas.
--   * Agentes escrevem só por funções public.pf_agente_*, com a senha própria de cada um
--     (guardada aqui só como sha256) e só em nome da própria máquina. Nunca apagam nem editam.
--   * O Places lê só por funções public.pf_places_*, com o login de um operador cadastrado.
--   * O Registry (powerfarm_registry) NÃO é alterado; é lido pelas funções.

create schema if not exists powerfarm_observacao;
revoke all on schema powerfarm_observacao from public;

-- ─── Tabelas ─────────────────────────────────────────────────────────────────

create table powerfarm_observacao.agentes (
  maquina         text primary key check (maquina in ('lab-256', 'lab-512', 'lab-8gb')),
  entidade        text not null check (entidade ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'),
  segredo_sha256  text not null check (segredo_sha256 ~ '^[0-9a-f]{64}$'),
  criado_em       timestamptz not null default now(),
  desativado_em   timestamptz
);

create table powerfarm_observacao.operadores (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  entidade   text not null references powerfarm_registry.entities (id),
  criado_em  timestamptz not null default now()
);

create table powerfarm_observacao.sinais_atuais (
  maquina       text not null references powerfarm_observacao.agentes (maquina),
  lugar         text not null check (lugar in ('labs', 'supabase', 'apps', 'engines', 'drive', 'agentes')),
  alvo          text not null check (length(alvo) between 1 and 200),
  aspecto       text not null check (aspecto ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  estado        text not null check (estado in ('ok', 'olhar', 'desconhecido')),
  valor         jsonb not null default '{}'::jsonb,
  observado_em  timestamptz not null,
  recebido_em   timestamptz not null default now(),
  primary key (maquina, lugar, alvo, aspecto),
  check (observado_em <= recebido_em + interval '5 minutes')
);

create table powerfarm_observacao.sinais_historico (
  id            bigint generated always as identity primary key,
  maquina       text not null references powerfarm_observacao.agentes (maquina),
  lugar         text not null check (lugar in ('labs', 'supabase', 'apps', 'engines', 'drive', 'agentes')),
  alvo          text not null check (length(alvo) between 1 and 200),
  aspecto       text not null check (aspecto ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  estado        text not null check (estado in ('ok', 'olhar', 'desconhecido')),
  valor         jsonb not null default '{}'::jsonb,
  observado_em  timestamptz not null,
  recebido_em   timestamptz not null default now(),
  check (observado_em <= recebido_em + interval '5 minutes')
);
create index sinais_historico_tempo on powerfarm_observacao.sinais_historico (maquina, observado_em desc);

create table powerfarm_observacao.inventarios (
  id            bigint generated always as identity primary key,
  maquina       text not null references powerfarm_observacao.agentes (maquina),
  itens         jsonb not null check (jsonb_typeof(itens) = 'array'),
  observado_em  timestamptz not null,
  recebido_em   timestamptz not null default now(),
  check (observado_em <= recebido_em + interval '5 minutes')
);
create index inventarios_ultimo on powerfarm_observacao.inventarios (maquina, observado_em desc);

create table powerfarm_observacao.eventos (
  id          text primary key check (id ~ '^evt_[0-9A-Za-z]{10,40}$'),
  maquina     text not null references powerfarm_observacao.agentes (maquina),
  sessao      text not null check (length(sessao) between 1 and 200),
  tipo        text not null check (tipo ~ '^[a-z][a-z0-9_.]{0,63}$'),
  dados       jsonb not null default '{}'::jsonb,
  emitido_em  timestamptz not null,
  recebido_em timestamptz not null default now()
);
create index eventos_por_maquina on powerfarm_observacao.eventos (maquina, emitido_em desc);
create index eventos_por_sessao on powerfarm_observacao.eventos (sessao, emitido_em);

alter table powerfarm_observacao.agentes          enable row level security;
alter table powerfarm_observacao.operadores       enable row level security;
alter table powerfarm_observacao.sinais_atuais    enable row level security;
alter table powerfarm_observacao.sinais_historico enable row level security;
alter table powerfarm_observacao.inventarios      enable row level security;
alter table powerfarm_observacao.eventos          enable row level security;
revoke all on all tables in schema powerfarm_observacao from public, anon, authenticated;

-- ─── Quem é quem ─────────────────────────────────────────────────────────────

create function powerfarm_observacao.agente_autorizado(p_maquina text, p_segredo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from powerfarm_observacao.agentes a
    where a.maquina = p_maquina
      and a.desativado_em is null
      and a.segredo_sha256 = encode(extensions.digest(coalesce(p_segredo, ''), 'sha256'), 'hex')
  );
$$;

create function powerfarm_observacao.eh_operador()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from powerfarm_observacao.operadores o where o.user_id = auth.uid());
$$;

create function powerfarm_observacao.exigir_agente(p_maquina text, p_segredo text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not powerfarm_observacao.agente_autorizado(p_maquina, p_segredo) then
    raise exception 'agente não autorizado' using errcode = '28000';
  end if;
end $$;

-- ─── Escrita dos agentes ─────────────────────────────────────────────────────

create function public.pf_agente_sinais(p_maquina text, p_segredo text, p_sinais jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);
  if jsonb_typeof(p_sinais) is distinct from 'array' or jsonb_array_length(p_sinais) > 500 then
    raise exception 'sinais: esperado um array de até 500 itens' using errcode = '22023';
  end if;

  insert into powerfarm_observacao.sinais_historico (maquina, lugar, alvo, aspecto, estado, valor, observado_em)
  select p_maquina, s.lugar, s.alvo, s.aspecto, s.estado, coalesce(s.valor, '{}'::jsonb), s.observado_em
  from jsonb_to_recordset(p_sinais) as s(lugar text, alvo text, aspecto text, estado text, valor jsonb, observado_em timestamptz);
  get diagnostics n = row_count;

  insert into powerfarm_observacao.sinais_atuais as a (maquina, lugar, alvo, aspecto, estado, valor, observado_em)
  select distinct on (s.lugar, s.alvo, s.aspecto)
         p_maquina, s.lugar, s.alvo, s.aspecto, s.estado, coalesce(s.valor, '{}'::jsonb), s.observado_em
  from jsonb_to_recordset(p_sinais) as s(lugar text, alvo text, aspecto text, estado text, valor jsonb, observado_em timestamptz)
  order by s.lugar, s.alvo, s.aspecto, s.observado_em desc
  on conflict (maquina, lugar, alvo, aspecto) do update
    set estado = excluded.estado, valor = excluded.valor, observado_em = excluded.observado_em, recebido_em = now()
    where excluded.observado_em >= a.observado_em;

  return n;
end $$;

create function public.pf_agente_inventario(p_maquina text, p_segredo text, p_itens jsonb, p_observado_em timestamptz)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  novo bigint;
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) > 5000 then
    raise exception 'inventário: esperado um array de até 5000 itens' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
    where jsonb_typeof(e) <> 'object' or coalesce(e ->> 'id', '') !~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'
  ) then
    raise exception 'inventário: todo item precisa de um id no formato pf.*' using errcode = '22023';
  end if;
  insert into powerfarm_observacao.inventarios (maquina, itens, observado_em)
  values (p_maquina, p_itens, p_observado_em)
  returning id into novo;
  return novo;
end $$;

create function public.pf_agente_eventos(p_maquina text, p_segredo text, p_eventos jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);
  if jsonb_typeof(p_eventos) is distinct from 'array' or jsonb_array_length(p_eventos) > 1000 then
    raise exception 'eventos: esperado um array de até 1000 itens' using errcode = '22023';
  end if;
  insert into powerfarm_observacao.eventos (id, maquina, sessao, tipo, dados, emitido_em)
  select e.id, p_maquina, e.sessao, e.tipo, coalesce(e.dados, '{}'::jsonb), e.emitido_em
  from jsonb_to_recordset(p_eventos) as e(id text, sessao text, tipo text, dados jsonb, emitido_em timestamptz)
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create function public.pf_agente_registry(p_maquina text, p_segredo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'title', e.title, 'summary', e.summary) order by e.id), '[]'::jsonb)
    from powerfarm_registry.entities e
    where e.retired_at is null
  );
end $$;

-- ─── Leitura do Places (login de operador) ───────────────────────────────────

create function public.pf_places_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not powerfarm_observacao.eh_operador() then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'agora', now(),
    'registry', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.kind, 'title', e.title, 'summary', e.summary, 'retired_at', e.retired_at) order by e.id), '[]'::jsonb)
      from powerfarm_registry.entities e),
    'agentes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'maquina', a.maquina, 'entidade', a.entidade, 'ativo', a.desativado_em is null,
        'ultimo_sinal', (select max(s.recebido_em) from powerfarm_observacao.sinais_atuais s where s.maquina = a.maquina)
      ) order by a.maquina), '[]'::jsonb)
      from powerfarm_observacao.agentes a),
    'sinais', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'maquina', s.maquina, 'lugar', s.lugar, 'alvo', s.alvo, 'aspecto', s.aspecto, 'estado', s.estado,
        'valor', s.valor, 'observado_em', s.observado_em, 'recebido_em', s.recebido_em
      ) order by s.lugar, s.alvo, s.aspecto, s.maquina), '[]'::jsonb)
      from powerfarm_observacao.sinais_atuais s),
    'inventarios', (
      select coalesce(jsonb_agg(jsonb_build_object('maquina', i.maquina, 'observado_em', i.observado_em, 'itens', i.itens) order by i.maquina), '[]'::jsonb)
      from (select distinct on (maquina) maquina, observado_em, itens
            from powerfarm_observacao.inventarios order by maquina, observado_em desc) i)
  );
end $$;

create function public.pf_places_eventos(p_maquina text default null, p_sessao text default null, p_limite integer default 200)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not powerfarm_observacao.eh_operador() then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', v.id, 'maquina', v.maquina, 'sessao', v.sessao, 'tipo', v.tipo, 'dados', v.dados, 'emitido_em', v.emitido_em
    ) order by v.emitido_em desc), '[]'::jsonb)
    from (
      select * from powerfarm_observacao.eventos e
      where (p_maquina is null or e.maquina = p_maquina)
        and (p_sessao is null or e.sessao = p_sessao)
      order by e.emitido_em desc
      limit least(greatest(coalesce(p_limite, 200), 1), 1000)
    ) v
  );
end $$;

-- ─── Permissões ──────────────────────────────────────────────────────────────

revoke all on function powerfarm_observacao.agente_autorizado(text, text) from public;
revoke all on function powerfarm_observacao.eh_operador() from public;
revoke all on function powerfarm_observacao.exigir_agente(text, text) from public;

revoke all on function public.pf_agente_sinais(text, text, jsonb) from public;
revoke all on function public.pf_agente_inventario(text, text, jsonb, timestamptz) from public;
revoke all on function public.pf_agente_eventos(text, text, jsonb) from public;
revoke all on function public.pf_agente_registry(text, text) from public;
revoke all on function public.pf_places_estado() from public;
revoke all on function public.pf_places_eventos(text, text, integer) from public;

grant execute on function public.pf_agente_sinais(text, text, jsonb) to anon, authenticated;
grant execute on function public.pf_agente_inventario(text, text, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.pf_agente_eventos(text, text, jsonb) to anon, authenticated;
grant execute on function public.pf_agente_registry(text, text) to anon, authenticated;
grant execute on function public.pf_places_estado() to authenticated;
grant execute on function public.pf_places_eventos(text, text, integer) to authenticated;
