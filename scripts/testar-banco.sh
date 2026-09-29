#!/usr/bin/env bash
# Testa as migrações do Supabase num Postgres descartável (imitação mínima do Supabase).
set -euo pipefail
export LC_ALL=C LANG=C   # o Postgres no macOS recusa subir sem locale definido
cd "$(dirname "$0")/.."
PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || echo /opt/homebrew/opt/postgresql@16/bin)}"
D="$(mktemp -d /tmp/pfdb.XXXX)"   # caminho curto: o socket do Postgres tem limite de ~100 caracteres
trap '"$PGBIN/pg_ctl" -D "$D/dados" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$D"' EXIT
LC_ALL=C "$PGBIN/initdb" -D "$D/dados" -U postgres -A trust --locale=C -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$D/dados" -o "-k $D -c listen_addresses=''" -l "$D/log" -w start >/dev/null || { cat "$D/log"; exit 1; }
P=("$PGBIN/psql" -h "$D" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)
"${P[@]}" -f supabase/tests/stub_supabase.sql
for m in supabase/migrations/*.sql; do
  case "$m" in *retencao*) continue ;; esac   # pg_cron só existe no Supabase
  "${P[@]}" -f "$m"
done
for t in observacao registry; do   # nessa ordem: o registry usa os agentes criados pela observação
  "${P[@]}" -t -f "supabase/tests/$t.test.sql" | sed '/^\s*$/d'
done
