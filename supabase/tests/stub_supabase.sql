-- Imitação mínima do Supabase para testar as migrações num Postgres descartável.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
-- Como o Supabase: toda função nova do public vem executável por anon e authenticated.
alter default privileges in schema public grant execute on functions to anon, authenticated;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create schema powerfarm_registry;
create table powerfarm_registry.entities (
  id text primary key, kind text not null, title text not null, summary text,
  created_at timestamptz not null default now(), created_by text, retired_at timestamptz
);
insert into powerfarm_registry.entities (id, kind, title) values
  ('pf.person.director', 'person', 'Director'),
  ('pf.lab-8gb', 'machine', 'LAB 8GB'),
  ('pf.antenna', 'service', 'Antenna'),
  ('pf.search', 'service', 'Search');
update powerfarm_registry.entities set retired_at = now() where id = 'pf.search';

-- O resto do Registry como estava no powerfarm.kernal antes de 2026-09-29 (só o que as migrações tocam).
create function powerfarm_registry.is_entity_id(value text) returns boolean language sql immutable set search_path = '' as $$
  select value ~ '^pf(\.[a-z0-9][a-z0-9-]*)+$' $$;
create function powerfarm_registry.is_contract_id(value text) returns boolean language sql immutable set search_path = '' as $$
  select value ~ '^pf\.contract(\.[a-z0-9][a-z0-9-]*)+$' $$;
create function powerfarm_registry.is_sha256_digest(value text) returns boolean language sql immutable set search_path = '' as $$
  select value ~ '^sha256:[0-9a-f]{64}$' $$;
create function powerfarm_registry.protect_artifact_version_identity() returns trigger language plpgsql as $$ begin return new; end $$;
create function powerfarm_registry.protect_contract_generation_identity() returns trigger language plpgsql as $$ begin return new; end $$;
create table powerfarm_registry.artifacts (
  id text primary key check (powerfarm_registry.is_entity_id(id)), kind text not null, title text not null, summary text,
  publisher_entity text references powerfarm_registry.entities(id), created_at timestamptz not null default now(),
  created_by text references powerfarm_registry.entities(id), retired_at timestamptz
);
create table powerfarm_registry.artifact_versions (
  artifact_id text not null references powerfarm_registry.artifacts(id), version text not null,
  source_repo text, source_revision text, source_path text,
  content_digest text check (content_digest is null or powerfarm_registry.is_sha256_digest(content_digest)),
  media_type text, size_bytes bigint, metadata jsonb not null default '{}'::jsonb,
  recognized_at timestamptz not null default now(), recognized_by text references powerfarm_registry.entities(id),
  superseded_at timestamptz, superseded_by_version text, retired_at timestamptz,
  primary key (artifact_id, version)
);
create trigger artifact_versions_identity_immutable before update on powerfarm_registry.artifact_versions
  for each row execute function powerfarm_registry.protect_artifact_version_identity();
create table powerfarm_registry.contracts (
  id text not null check (powerfarm_registry.is_contract_id(id)), generation integer not null, kind text not null,
  subject_entity text not null references powerfarm_registry.entities(id), document_digest text not null,
  recognized_at timestamptz not null default now(), superseded_at timestamptz, retired_at timestamptz,
  primary key (id, generation)
);
create trigger contracts_generation_identity_immutable before update on powerfarm_registry.contracts
  for each row execute function powerfarm_registry.protect_contract_generation_identity();
create table powerfarm_registry.grants (
  id uuid primary key default gen_random_uuid(), subject_entity text not null references powerfarm_registry.entities(id),
  action text not null, granted_by text not null references powerfarm_registry.entities(id)
);
create view powerfarm_registry.current_contracts as
  select * from powerfarm_registry.contracts where superseded_at is null and retired_at is null;
create view powerfarm_registry.current_artifact_versions as
  select * from powerfarm_registry.artifact_versions where superseded_at is null and retired_at is null;
insert into powerfarm_registry.artifacts (id, kind, title, summary, publisher_entity, created_at, created_by) values
  ('pf.artifact.legacy-airtable-registry-export', 'migration-evidence', 'Legacy Airtable Registry frozen export',
   'Exact frozen evidence boundary', 'pf.person.director', '2026-09-24T16:18:21Z', 'pf.person.director');
insert into powerfarm_registry.artifact_versions
  (artifact_id, version, content_digest, media_type, size_bytes, metadata, recognized_at, recognized_by, superseded_at, superseded_by_version) values
  ('pf.artifact.legacy-airtable-registry-export', '2026-09-23',
   'sha256:0ea09c53bc59512118c69f60f7572d19ae2e48c0cbf23bf183c033bd2863e9ec', 'application/json', null,
   '{"role":"frozen-migration-evidence","record_count":347}', '2026-09-24T16:18:21Z', 'pf.person.director',
   '2026-09-24T16:33:16Z', '2026-09-24-pre-retirement'),
  ('pf.artifact.legacy-airtable-registry-export', '2026-09-24-pre-retirement',
   'sha256:35214d1dae9c79fc05256da00a797f3b0d4c0eca5e00921108502c070b8a36d2', 'application/x-ndjson', 537688,
   '{"role":"pre-retirement-custody","record_count":347,"storage_bucket":"powerfarm-minivault","storage_object":"migration/airtable/2026-09-24/airtable-full-export.ndjson"}',
   '2026-09-24T16:33:16Z', 'pf.person.director', null, null);

-- storage do Supabase: só a tabela de arquivos e a leitura do Minivault
create schema storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create policy "authenticated recognized minivault read" on storage.objects for select to authenticated
  using (bucket_id = 'powerfarm-minivault' and exists (
    select 1 from powerfarm_registry.artifact_versions av
    where av.metadata ->> 'storage_bucket' = objects.bucket_id and av.metadata ->> 'storage_object' = objects.name
      and av.retired_at is null));
