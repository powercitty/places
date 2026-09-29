-- Registry com três coisas e mais nada: ENTIDADES, OBJETOS e CONTRATOS (decisão do dono, 2026-09-29).
-- Artefato, documento, arquivo, código: tudo é objeto. Relação entre coisas é contrato.
--
-- A migração inteira é uma transação: ou tudo muda, ou nada muda.
--   1. confere que o banco está como foi visto (sem contracts nem grants; todo artifact com versão);
--   2. cria entidades, objetos e contratos, com as regras que o banco cobra:
--        nada se apaga (aposenta-se) · versão de objeto e de contrato nunca muda · contrato só com
--        partes e objetos que existem;
--   3. copia o que existia (entities → entidades; artifacts + artifact_versions → objetos);
--   4. liga nas tabelas novas quem lia as antigas, devolvendo EXATAMENTE o mesmo formato:
--        pf_agente_registry (agentes), pf_places_estado (Coloured Places),
--        minivault_list / minivault_get e a leitura de arquivos do Minivault no storage;
--   5. apaga as tabelas antigas (cópia de segurança fora do banco: registry-backup-2026-09-29.json);
--   6. cria pf_agente_fundar: a única porta de escrita do Registry. Quem chama é o DMG da fundação,
--      com o "sim" do dono (o duplo clique).

-- ─── 1. o banco está como foi visto ────────────────────────────────────────────
do $$
begin
  if exists (select 1 from powerfarm_registry.contracts) or exists (select 1 from powerfarm_registry.grants) then
    raise exception 'há linhas em contracts ou grants: esta migração foi escrita para quando estão vazias';
  end if;
  if exists (select 1 from powerfarm_registry.artifacts a
             where not exists (select 1 from powerfarm_registry.artifact_versions v where v.artifact_id = a.id)) then
    raise exception 'há artifact sem versão: não vira objeto sem perder informação';
  end if;
end $$;

-- ─── 2. as três tabelas ────────────────────────────────────────────────────────
create table powerfarm_registry.entidades (
  id          text primary key check (id ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'),
  tipo        text not null check (length(btrim(tipo)) > 0),
  nome        text not null check (length(btrim(nome)) > 0),
  descricao   text,
  criada_em   timestamptz not null default now(),
  retirada_em timestamptz,
  check (retirada_em is null or retirada_em >= criada_em)
);

create table powerfarm_registry.objetos (
  id          text not null check (id ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$'),
  versao      integer not null check (versao >= 1),
  tipo        text not null check (length(btrim(tipo)) > 0),
  nome        text not null check (length(btrim(nome)) > 0),
  descricao   text,
  onde        text,                                   -- url, bucket/caminho ou repositório@commit:caminho
  hash        text check (hash is null or hash ~ '^sha256:[0-9a-f]{64}$'),
  detalhes    jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now(),
  retirado_em timestamptz,
  primary key (id, versao)
);

create table powerfarm_registry.contratos (
  id          text not null check (id ~ '^pf\.contrato(\.[a-z0-9][a-z0-9-]*)+$'),
  versao      integer not null check (versao >= 1),
  nome        text not null check (length(btrim(nome)) > 0),
  partes      text[] not null check (cardinality(partes) >= 1),   -- entidades
  objetos     text[] not null default '{}',                      -- objetos (qualquer versão)
  termos      jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now(),
  retirado_em timestamptz,
  primary key (id, versao)
);

alter table powerfarm_registry.entidades enable row level security;
alter table powerfarm_registry.objetos enable row level security;
alter table powerfarm_registry.contratos enable row level security;

-- nada se apaga: aposenta-se (PLANO, princípio 5)
create function powerfarm_registry.nada_se_apaga()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'no Registry nada se apaga (%): aposente', tg_table_name using errcode = '42501';
end $$;

create trigger nada_se_apaga before delete on powerfarm_registry.entidades
  for each row execute function powerfarm_registry.nada_se_apaga();
create trigger nada_se_apaga before delete on powerfarm_registry.objetos
  for each row execute function powerfarm_registry.nada_se_apaga();
create trigger nada_se_apaga before delete on powerfarm_registry.contratos
  for each row execute function powerfarm_registry.nada_se_apaga();
create trigger nada_se_apaga_tudo before truncate on powerfarm_registry.entidades
  for each statement execute function powerfarm_registry.nada_se_apaga();
create trigger nada_se_apaga_tudo before truncate on powerfarm_registry.objetos
  for each statement execute function powerfarm_registry.nada_se_apaga();
create trigger nada_se_apaga_tudo before truncate on powerfarm_registry.contratos
  for each statement execute function powerfarm_registry.nada_se_apaga();

-- a identidade de uma entidade não muda (nome e descrição podem mudar)
create function powerfarm_registry.id_nao_muda()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id then
    raise exception 'o id de uma entidade não muda (%): crie outra e aposente esta', old.id using errcode = '42501';
  end if;
  return new;
end $$;

create trigger id_nao_muda before update on powerfarm_registry.entidades
  for each row execute function powerfarm_registry.id_nao_muda();

-- uma versão nunca muda: só pode ser aposentada (ou voltar da aposentadoria)
create function powerfarm_registry.versao_nao_muda()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'retirado_em') is distinct from (to_jsonb(old) - 'retirado_em') then
    raise exception '% versão % não muda: crie a versão %', old.id, old.versao, old.versao + 1 using errcode = '42501';
  end if;
  return new;
end $$;

create trigger versao_nao_muda before update on powerfarm_registry.objetos
  for each row execute function powerfarm_registry.versao_nao_muda();
create trigger versao_nao_muda before update on powerfarm_registry.contratos
  for each row execute function powerfarm_registry.versao_nao_muda();

-- contrato só com partes e objetos que existem no Registry
create function powerfarm_registry.conferir_contrato()
returns trigger language plpgsql set search_path = '' as $$
declare
  falta text;
begin
  select string_agg(p, ', ') into falta from unnest(new.partes) p
  where not exists (select 1 from powerfarm_registry.entidades e where e.id = p);
  if falta is not null then
    raise exception 'contrato %: parte que não existe no Registry: %', new.id, falta using errcode = '23503';
  end if;
  select string_agg(o, ', ') into falta from unnest(new.objetos) o
  where not exists (select 1 from powerfarm_registry.objetos x where x.id = o);
  if falta is not null then
    raise exception 'contrato %: objeto que não existe no Registry: %', new.id, falta using errcode = '23503';
  end if;
  return new;
end $$;

create trigger conferir_contrato before insert on powerfarm_registry.contratos
  for each row execute function powerfarm_registry.conferir_contrato();

-- ─── 3. copia o que existia ────────────────────────────────────────────────────
insert into powerfarm_registry.entidades (id, tipo, nome, descricao, criada_em, retirada_em)
select id, kind, title, summary, created_at, retired_at
from powerfarm_registry.entities;

-- cada versão de artifact vira uma versão de objeto (1, 2, … na ordem em que foram reconhecidas);
-- o nome original da versão e os metadados ficam em detalhes, para o Minivault mostrar igual
insert into powerfarm_registry.objetos (id, versao, tipo, nome, descricao, onde, hash, detalhes, criado_em, retirado_em)
select a.id,
       row_number() over (partition by a.id order by av.recognized_at, av.version)::int,
       a.kind, a.title, a.summary,
       case
         when av.metadata ? 'storage_bucket' and av.metadata ? 'storage_object'
           then (av.metadata ->> 'storage_bucket') || '/' || (av.metadata ->> 'storage_object')
         when av.source_repo is not null
           then av.source_repo || '@' || coalesce(av.source_revision, '') || coalesce(':' || av.source_path, '')
       end,
       av.content_digest,
       av.metadata || jsonb_strip_nulls(jsonb_build_object(
         'versao_original', av.version,
         'media_type', av.media_type,
         'size_bytes', av.size_bytes,
         'source_repo', av.source_repo,
         'source_revision', av.source_revision,
         'source_path', av.source_path,
         'reconhecido_por', av.recognized_by,
         'publicado_por', a.publisher_entity)),
       av.recognized_at,
       coalesce(av.retired_at, a.retired_at)
from powerfarm_registry.artifacts a
join powerfarm_registry.artifact_versions av on av.artifact_id = a.id;

-- ─── 4. quem lia as tabelas antigas passa a ler as novas (mesmo formato) ──────────
create or replace function public.pf_agente_registry(p_maquina text, p_segredo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.tipo, 'title', e.nome, 'summary', e.descricao) order by e.id), '[]'::jsonb)
    from powerfarm_registry.entidades e
    where e.retirada_em is null
  );
end $$;

create or replace function public.pf_places_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not powerfarm_observacao.eh_operador() then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'agora', now(),
    'registry', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'kind', e.tipo, 'title', e.nome, 'summary', e.descricao, 'retired_at', e.retirada_em) order by e.id), '[]'::jsonb)
      from powerfarm_registry.entidades e),
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

-- Minivault: um objeto aparece enquanto tiver alguma versão não aposentada; a versão atual é a
-- mais nova não aposentada; as mais velhas aparecem como "superseded".
create or replace function public.minivault_list()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'kind', u.tipo,
      'title', u.nome,
      'summary', u.descricao,
      'created_at', (select min(x.criado_em) from powerfarm_registry.objetos x where x.id = u.id),
      'current_version', jsonb_build_object(
        'version', coalesce(u.detalhes ->> 'versao_original', u.versao::text),
        'status', 'recognized',
        'source_repo', u.detalhes ->> 'source_repo',
        'source_revision', u.detalhes ->> 'source_revision',
        'source_path', u.detalhes ->> 'source_path',
        'content_digest', u.hash,
        'media_type', u.detalhes ->> 'media_type',
        'size_bytes', (u.detalhes ->> 'size_bytes')::bigint,
        'recognized_at', u.criado_em,
        'storage',
          case when u.detalhes ? 'storage_bucket' and u.detalhes ? 'storage_object'
               then jsonb_build_object('bucket', u.detalhes ->> 'storage_bucket', 'object', u.detalhes ->> 'storage_object')
          end)
    ) order by u.id), '[]'::jsonb)
  from (select distinct on (o.id) o.*
        from powerfarm_registry.objetos o
        where o.retirado_em is null
        order by o.id, o.versao desc) u;
$$;

create or replace function public.minivault_get(p_artifact_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id,
    'kind', u.tipo,
    'title', u.nome,
    'summary', u.descricao,
    'created_at', (select min(x.criado_em) from powerfarm_registry.objetos x where x.id = u.id),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
          'version', coalesce(v.detalhes ->> 'versao_original', v.versao::text),
          'status',
            case
              when v.retirado_em is not null then 'retired'
              when exists (select 1 from powerfarm_registry.objetos n
                           where n.id = v.id and n.versao > v.versao and n.retirado_em is null) then 'superseded'
              else 'recognized'
            end,
          'source_repo', v.detalhes ->> 'source_repo',
          'source_revision', v.detalhes ->> 'source_revision',
          'source_path', v.detalhes ->> 'source_path',
          'content_digest', v.hash,
          'media_type', v.detalhes ->> 'media_type',
          'size_bytes', (v.detalhes ->> 'size_bytes')::bigint,
          'recognized_at', v.criado_em,
          'recognized_by', v.detalhes ->> 'reconhecido_por',
          'storage',
            case when v.detalhes ? 'storage_bucket' and v.detalhes ? 'storage_object'
                 then jsonb_build_object('bucket', v.detalhes ->> 'storage_bucket', 'object', v.detalhes ->> 'storage_object')
            end)
        order by v.criado_em desc, v.versao desc)
      from powerfarm_registry.objetos v
      where v.id = u.id), '[]'::jsonb))
  from (select distinct on (o.id) o.*
        from powerfarm_registry.objetos o
        where o.id = p_artifact_id and o.retirado_em is null
        order by o.id, o.versao desc) u;
$$;

-- arquivos do Minivault: quem entrou lê só o que é objeto reconhecido (não aposentado)
drop policy "authenticated recognized minivault read" on storage.objects;
create policy "authenticated recognized minivault read" on storage.objects
  for select to authenticated
  using (bucket_id = 'powerfarm-minivault' and exists (
    select 1 from powerfarm_registry.objetos o
    where o.detalhes ->> 'storage_bucket' = objects.bucket_id
      and o.detalhes ->> 'storage_object' = objects.name
      and o.retirado_em is null));

-- ─── 5. sai o resto (sem cascade: se algo inesperado depender, a migração inteira para) ──
-- o operador do Places aponta para a entidade dele: passa a apontar para entidades
alter table powerfarm_observacao.operadores drop constraint operadores_entidade_fkey;
alter table powerfarm_observacao.operadores add constraint operadores_entidade_fkey
  foreign key (entidade) references powerfarm_registry.entidades (id);

drop view powerfarm_registry.current_contracts;
drop view powerfarm_registry.current_artifact_versions;
drop table powerfarm_registry.grants;
drop table powerfarm_registry.contracts;
drop table powerfarm_registry.artifact_versions;
drop table powerfarm_registry.artifacts;
drop table powerfarm_registry.entities;
drop function powerfarm_registry.protect_artifact_version_identity();
drop function powerfarm_registry.protect_contract_generation_identity();
drop function powerfarm_registry.is_entity_id(text);
drop function powerfarm_registry.is_contract_id(text);
drop function powerfarm_registry.is_sha256_digest(text);

-- ─── 6. a única porta de escrita: a fundação ──────────────────────────────────────
-- Depois da fundação, o Registry é exatamente o que o contrato social diz:
--   entidades listadas ficam ativas, as outras são aposentadas;
--   objetos e contratos listados ficam (criados se faltarem), os outros são aposentados;
--   o próprio contrato social vira objeto: pf.objeto.contrato-social, versão = "versao" do arquivo.
-- Rodar de novo com o mesmo contrato social não muda nada. Nada é apagado.
create function public.pf_agente_fundar(p_maquina text, p_segredo text, p_contrato_social jsonb, p_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cs constant jsonb := p_contrato_social;
  versao_cs int;
  item jsonb;
  achado record;
  mantidas text[];
  partes_v text[];
  objetos_v text[];
  mudancas int := 0;
  n int;
begin
  perform powerfarm_observacao.exigir_agente(p_maquina, p_segredo);

  if jsonb_typeof(cs) is distinct from 'object'
     or jsonb_typeof(cs -> 'versao') is distinct from 'number'
     or jsonb_typeof(cs -> 'entidades') is distinct from 'array'
     or jsonb_typeof(cs -> 'objetos') is distinct from 'array'
     or jsonb_typeof(cs -> 'contratos') is distinct from 'array' then
    raise exception 'contrato social: esperado {versao, entidades[], objetos[], contratos[]}' using errcode = '22023';
  end if;
  versao_cs := (cs ->> 'versao')::int;
  if versao_cs < 1 then
    raise exception 'contrato social: a versão começa em 1' using errcode = '22023';
  end if;
  if p_hash is null or p_hash !~ '^sha256:[0-9a-f]{64}$' then
    raise exception 'contrato social: hash no formato sha256:<64 hex>' using errcode = '22023';
  end if;

  -- 1. entidades: ficam as do contrato social
  for item in select * from jsonb_array_elements(cs -> 'entidades') loop
    insert into powerfarm_registry.entidades as e (id, tipo, nome, descricao)
    values (item ->> 'id', item ->> 'tipo', item ->> 'nome', item ->> 'descricao')
    on conflict (id) do update
      set tipo = excluded.tipo, nome = excluded.nome, descricao = excluded.descricao, retirada_em = null
      where (e.tipo, e.nome, e.descricao, e.retirada_em)
            is distinct from (excluded.tipo, excluded.nome, excluded.descricao, null::timestamptz);
    get diagnostics n = row_count;
    mudancas := mudancas + n;
  end loop;
  select coalesce(array_agg(x ->> 'id'), '{}') into mantidas from jsonb_array_elements(cs -> 'entidades') x;
  update powerfarm_registry.entidades set retirada_em = now()
  where retirada_em is null and not (id = any (mantidas));
  get diagnostics n = row_count;
  mudancas := mudancas + n;

  -- 2. o próprio contrato social é um objeto (as versões antigas ficam como história)
  select * into achado from powerfarm_registry.objetos
  where id = 'pf.objeto.contrato-social' and versao = versao_cs;
  if not found then
    insert into powerfarm_registry.objetos (id, versao, tipo, nome, descricao, onde, hash, detalhes)
    values ('pf.objeto.contrato-social', versao_cs, 'documento', 'Contrato social da Powerfarm',
            'O que a Powerfarm é: as suas entidades, objetos e contratos.',
            'github.com/powerfarm/places:fundacao/contrato-social.json', p_hash,
            jsonb_build_object('conteudo', cs, 'fundado_por', p_maquina));
    mudancas := mudancas + 1;
  elsif achado.hash is distinct from p_hash then
    raise exception 'o contrato social versão % já foi fundado com outro conteúdo: suba a versão para %', versao_cs, versao_cs + 1
      using errcode = '23505';
  elsif achado.retirado_em is not null then
    update powerfarm_registry.objetos set retirado_em = null where id = achado.id and versao = achado.versao;
    mudancas := mudancas + 1;
  end if;

  -- 3. objetos listados (id + versao; os dados completos só são precisos para criar)
  mantidas := '{}';
  for item in select * from jsonb_array_elements(cs -> 'objetos') loop
    if jsonb_typeof(item -> 'versao') is distinct from 'number' then
      raise exception 'objeto %: falta a versão', item ->> 'id' using errcode = '22023';
    end if;
    select * into achado from powerfarm_registry.objetos
    where id = item ->> 'id' and versao = (item ->> 'versao')::int;
    if not found then
      insert into powerfarm_registry.objetos (id, versao, tipo, nome, descricao, onde, hash, detalhes)
      values (item ->> 'id', (item ->> 'versao')::int, item ->> 'tipo', item ->> 'nome', item ->> 'descricao',
              item ->> 'onde', item ->> 'hash', coalesce(item -> 'detalhes', '{}'::jsonb));
      mudancas := mudancas + 1;
    elsif item ? 'hash' and achado.hash is distinct from item ->> 'hash' then
      raise exception 'objeto % versão % já existe com outro conteúdo: crie a versão %',
        item ->> 'id', item ->> 'versao', (item ->> 'versao')::int + 1 using errcode = '23505';
    elsif achado.retirado_em is not null then
      update powerfarm_registry.objetos set retirado_em = null where id = achado.id and versao = achado.versao;
      mudancas := mudancas + 1;
    end if;
    mantidas := mantidas || ((item ->> 'id') || '@' || (item ->> 'versao'));
  end loop;
  update powerfarm_registry.objetos set retirado_em = now()
  where retirado_em is null and id <> 'pf.objeto.contrato-social' and not ((id || '@' || versao) = any (mantidas));
  get diagnostics n = row_count;
  mudancas := mudancas + n;

  -- 4. contratos listados (o banco confere que as partes e os objetos existem)
  mantidas := '{}';
  for item in select * from jsonb_array_elements(cs -> 'contratos') loop
    if jsonb_typeof(item -> 'versao') is distinct from 'number' then
      raise exception 'contrato %: falta a versão', item ->> 'id' using errcode = '22023';
    end if;
    partes_v := array(select jsonb_array_elements_text(coalesce(item -> 'partes', '[]'::jsonb)));
    objetos_v := array(select jsonb_array_elements_text(coalesce(item -> 'objetos', '[]'::jsonb)));
    select * into achado from powerfarm_registry.contratos
    where id = item ->> 'id' and versao = (item ->> 'versao')::int;
    if not found then
      insert into powerfarm_registry.contratos (id, versao, nome, partes, objetos, termos)
      values (item ->> 'id', (item ->> 'versao')::int, item ->> 'nome', partes_v, objetos_v,
              coalesce(item -> 'termos', '{}'::jsonb));
      mudancas := mudancas + 1;
    elsif (achado.nome, achado.partes, achado.objetos, achado.termos)
          is distinct from (item ->> 'nome', partes_v, objetos_v, coalesce(item -> 'termos', '{}'::jsonb)) then
      raise exception 'contrato % versão % já existe com outros termos: crie a versão %',
        item ->> 'id', item ->> 'versao', (item ->> 'versao')::int + 1 using errcode = '23505';
    elsif achado.retirado_em is not null then
      update powerfarm_registry.contratos set retirado_em = null where id = achado.id and versao = achado.versao;
      mudancas := mudancas + 1;
    end if;
    mantidas := mantidas || ((item ->> 'id') || '@' || (item ->> 'versao'));
  end loop;
  update powerfarm_registry.contratos set retirado_em = now()
  where retirado_em is null and not ((id || '@' || versao) = any (mantidas));
  get diagnostics n = row_count;
  mudancas := mudancas + n;

  return jsonb_build_object(
    'contrato_social', versao_cs,
    'hash', p_hash,
    'entidades', (select count(*) from powerfarm_registry.entidades where retirada_em is null),
    'objetos', (select count(distinct id) from powerfarm_registry.objetos where retirado_em is null),
    'contratos', (select count(distinct id) from powerfarm_registry.contratos where retirado_em is null),
    'mudancas', mudancas);
end $$;

-- como as outras funções dos agentes: só anon (o agente se prova pela senha dentro da função)
revoke all on function public.pf_agente_fundar(text, text, jsonb, text) from public;
revoke execute on function public.pf_agente_fundar(text, text, jsonb, text) from authenticated;
grant execute on function public.pf_agente_fundar(text, text, jsonb, text) to anon;
