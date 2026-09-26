#!/usr/bin/env bash
# O mesmo roteiro do CI do GitHub, para rodar em qualquer LAB antes de abrir PR: pnpm verificar
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== 1/6 regras da casa";          node policies/regras.mjs
echo "== 2/6 segredos (gitleaks)";      if command -v gitleaks >/dev/null; then gitleaks dir . --redact --no-banner; else echo "gitleaks não instalado aqui — o CI roda"; fi
echo "== 3/6 instalar (trava exata)";   pnpm install --frozen-lockfile
echo "== 4/6 tipos";                    pnpm typecheck
echo "== 5/6 testes";                   pnpm test
echo "   banco (migrações do Supabase)"; bash scripts/testar-banco.sh
echo "== 6/6 build dos 3 perfis + tela"
for m in lab-256 lab-512 lab-8gb; do (cd apps/agent && MAQUINA=$m pnpm build >/dev/null && echo "   agente $m: ok"); done
(cd apps/coloured-places && NEXT_TELEMETRY_DISABLED=1 pnpm build >/dev/null && echo "   coloured-places: ok")
echo "CI local: tudo passou"
