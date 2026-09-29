#!/usr/bin/env bash
# A coreografia do DMG: dois cliques e a Powerfarm surge neste computador.
#
#   bash deploy/fundar-powerfarm.sh <código.bundle> <commit> [--ensaio]
#
# Um passo depois do outro; se um falha, para ali e diz por quê (linha "✗ …").
# As linhas "== …" marcam o começo de cada passo — é assim que o app sabe qual acender.
#   0     este computador (tem de ser um dos 3 LABs)
#   1..6  instalar-agente.sh: código, dependências, segredos, serviço, ligando, conferindo
#   7     fundação: o contrato social entra no Registry (deploy/fundar.mjs)
# --ensaio: passa pelos mesmos passos só conferindo — não religa o agente e não escreve no Registry.
set -euo pipefail

BUNDLE=${1:?"uso: bash deploy/fundar-powerfarm.sh <código.bundle> <commit> [--ensaio]"}
COMMIT=${2:?"falta o commit"}
MODO=${3:-}
AQUI=$(cd "$(dirname "$0")" && pwd)
DESTINO=$HOME/Projetos/powerfarm-agente
SUPORTE="$HOME/Library/Application Support/Powerfarm"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

diz() { printf '\n== %s\n' "$*"; }
falha() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

diz "0 este computador"
MAQUINA=$(hostname -s)
case "$MAQUINA" in
  lab-256|lab-512|lab-8gb) echo "$MAQUINA" ;;
  *) falha "este computador ($MAQUINA) não é um dos LABs da Powerfarm" ;;
esac
command -v mise >/dev/null || falha "falta o mise neste computador (brew install mise)"
# antes de mexer em qualquer coisa: o Supabase já tem a porta da fundação?
# (chamada sem senha: é recusada lá dentro sem escrever nada; só importa se a função existe)
URL=$(sed -n 's/.*"supabase_url": *"\([^"]*\)".*/\1/p' "$AQUI/comum.json")
CHAVE=$(sed -n 's/.*"supabase_chave_publica": *"\([^"]*\)".*/\1/p' "$AQUI/comum.json")
RESPOSTA=$(curl -sS -m 20 -X POST "$URL/rest/v1/rpc/pf_agente_fundar" -H "apikey: $CHAVE" -H "content-type: application/json" \
  -d "{\"p_maquina\":\"$MAQUINA\",\"p_segredo\":\"\",\"p_contrato_social\":{},\"p_hash\":\"\"}" 2>&1 || true)
case "$RESPOSTA" in
  *PGRST202*) falha "o Supabase ainda não está pronto para a fundação (falta aplicar a migração do Registry). Nada foi mexido." ;;
  *'"code":"28000"'*) echo "Supabase pronto para a fundação" ;;   # recusou a senha vazia: a porta existe
  *) falha "não consegui falar com o Supabase: ${RESPOSTA:0:160}" ;;
esac
# o código vem de dentro do DMG; guardo uma cópia que continua existindo depois de ejetar
mkdir -p "$SUPORTE"
cp -f "$BUNDLE" "$SUPORTE/places.bundle"
ORIGEM="$SUPORTE/places.bundle"

if [ "$MODO" != "--ensaio" ]; then
  PF_ORIGEM="$ORIGEM" bash "$AQUI/instalar-agente.sh" "$MAQUINA" "$COMMIT"
  diz "fundação"
  cd "$DESTINO"
  mise exec -- node deploy/fundar.mjs "$MAQUINA"
  exit 0
fi

# ─── ensaio: os mesmos passos, só conferindo ───────────────────────────────────
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

diz "1/6 código"
git clone --quiet "$ORIGEM" "$T/places"
git -C "$T/places" checkout --quiet --detach "$COMMIT"
echo "commit $(git -C "$T/places" rev-parse --short=12 HEAD) (dentro do DMG)"

diz "2/6 dependências e build para $MAQUINA"
cd "$T/places"
mise trust --quiet "$T/places/mise.toml" >/dev/null
echo "node $(mise exec -- node --version) · pnpm $(mise exec -- pnpm --version)"
echo "ensaio: o build dos 3 LABs roda no CI; aqui não construo de novo"

diz "3/6 segredos"
if security find-generic-password -s powerfarm -a PF_AGENTE_SEGREDO >/dev/null 2>&1 \
   || [ -f "$DESTINO/apps/agent/.eve/powerfarm/segredos.json" ]; then
  echo "PF_AGENTE_SEGREDO: ok"
else
  falha "este computador ainda não tem a senha do agente"
fi

diz "4/6 serviço app.powerfarm.agente"
PLIST=$HOME/Library/LaunchAgents/app.powerfarm.agente.plist
[ -f "$PLIST" ] && plutil -lint -s "$PLIST" && echo "serviço escrito e válido" || echo "serviço ainda não existe: o instalador cria"

diz "5/6 ligando"
echo "ensaio: não religo o agente que está no ar"

diz "6/6 conferindo"
curl -fsS -m 3 "http://127.0.0.1:4410/eve/v1/health" >/dev/null && echo "✓ agente $MAQUINA no ar" || falha "o agente deste computador não respondeu"

diz "fundação"
mise exec -- node deploy/fundar.mjs "$MAQUINA" --ensaio
