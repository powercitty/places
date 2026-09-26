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
