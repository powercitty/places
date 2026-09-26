#!/usr/bin/env bash
# Instala ou atualiza o agente Powerfarm NESTE computador — o único serviço de launchd permitido (regra 7).
#
#   bash deploy/instalar-agente.sh <lab-256|lab-512|lab-8gb> [commit]
#
# O que faz, em ordem:
#   1. confere que este computador é mesmo a máquina pedida;
#   2. põe o código numa pasta só dele (~/Projetos/powerfarm-agente), fixo num commit;
#   3. instala as dependências e constrói o agente para esta máquina;
#   4. confere os segredos no Keychain (cria a senha do agente se faltar; nunca mostra o valor);
#   5. escreve o serviço app.powerfarm.agente (sem nenhum segredo dentro) e liga;
#   6. espera o agente responder. Se a versão nova não responder, volta para a anterior.
set -euo pipefail

MAQUINA=${1:?"uso: bash deploy/instalar-agente.sh <lab-256|lab-512|lab-8gb> [commit]"}
ALVO=${2:-}
ORIGEM=${PF_ORIGEM:-$HOME/Projetos/powerfarm-places}
DESTINO=$HOME/Projetos/powerfarm-agente
ROTULO=app.powerfarm.agente
PORTA=4410
PLIST=$HOME/Library/LaunchAgents/$ROTULO.plist
DOMINIO=gui/$(id -u)
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

diz() { printf '\n== %s\n' "$*"; }
falha() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

case "$MAQUINA" in lab-256|lab-512|lab-8gb) ;; *) falha "máquina desconhecida: $MAQUINA" ;; esac
[ "$(hostname -s)" = "$MAQUINA" ] || falha "este computador é $(hostname -s), não $MAQUINA"
command -v mise >/dev/null || falha "falta o mise neste computador (brew install mise)"

diz "1/6 código"
if [ ! -d "$DESTINO/.git" ]; then
  git clone --quiet "$ORIGEM" "$DESTINO"
else
  git -C "$DESTINO" remote set-url origin "$ORIGEM"
fi
git -C "$DESTINO" fetch --quiet --prune origin
ANTERIOR=$(git -C "$DESTINO" rev-parse --verify --quiet HEAD || true)
git -C "$DESTINO" checkout --quiet --detach "${ALVO:-origin/main}"
COMMIT=$(git -C "$DESTINO" rev-parse --short=12 HEAD)
echo "commit $COMMIT (antes: ${ANTERIOR:0:12})"

construir() {
  diz "2/6 dependências e build para $MAQUINA"
  cd "$DESTINO"
  mise trust --quiet "$DESTINO/mise.toml" >/dev/null
  mise install --quiet
  mise exec -- pnpm install --frozen-lockfile --silent
  MAQUINA=$MAQUINA mise exec -- pnpm --filter @powerfarm/agent run build >/dev/null
  grep -q "\"maquina\": \"$MAQUINA\"" apps/agent/agent/lib/maquina.gerada.ts || falha "o build não saiu para $MAQUINA"
}
construir

diz "3/6 segredos (Keychain; se estiver trancado, arquivo só do dono)"
DADOS=$DESTINO/apps/agent/.eve/powerfarm
ARQ_SEGREDOS=$DADOS/segredos.json
mkdir -p "$DADOS"
no_arquivo() { # lê um segredo do arquivo 600
  (cd "$DESTINO" && mise exec -- node -e 'try{const v=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))[process.argv[2]];if(v)process.stdout.write(v)}catch{}' "$ARQ_SEGREDOS" "$1")
}
ler_segredo() { # Keychain primeiro, depois o arquivo
  local v
  v=$(security find-generic-password -s powerfarm -a "$1" -w 2>/dev/null || true)
  if [ -n "$v" ]; then printf '%s' "$v"; else no_arquivo "$1"; fi
}
guardar_segredo() { # o valor chega pela entrada padrão, nunca na linha de comando do node
  local nome=$1 valor
  valor=$(cat)
  if security add-generic-password -s powerfarm -a "$nome" -l "Powerfarm · $nome" -w "$valor" 2>/dev/null; then
    echo "$nome: criado agora (Keychain)"
  else
    printf '%s' "$valor" | (umask 077; cd "$DESTINO" && mise exec -- node -e '
      const fs = require("fs"); const [arq, nome] = process.argv.slice(1);
      let o = {}; try { o = JSON.parse(fs.readFileSync(arq, "utf8")); } catch {}
      o[nome] = fs.readFileSync(0, "utf8");
      fs.writeFileSync(arq, JSON.stringify(o, null, 2) + "\n", { mode: 0o600 }); fs.chmodSync(arq, 0o600);' "$ARQ_SEGREDOS" "$nome")
    echo "$nome: criado agora (arquivo 600 — o Keychain deste LAB fica trancado para serviços)"
  fi
}
for nome in PF_AGENTE_SEGREDO PF_PLACES_JWT_SECRET; do
  if [ -n "$(ler_segredo "$nome")" ]; then echo "$nome: ok"; else openssl rand -hex 32 | tr -d '\n' | guardar_segredo "$nome"; fi
done
[ -f "$ARQ_SEGREDOS" ] && chmod 600 "$ARQ_SEGREDOS"
echo "sha256 da senha do agente (é o que vai para o Supabase): $(ler_segredo PF_AGENTE_SEGREDO | shasum -a 256 | cut -d' ' -f1)"
[ -n "$(ler_segredo AI_GATEWAY_API_KEY)" ] && echo "AI_GATEWAY_API_KEY: ok" || echo "AI_GATEWAY_API_KEY: FALTA — o chat não pensa sem ela (o observador funciona)"

diz "4/6 serviço $ROTULO"
NODE=$(cd "$DESTINO" && mise which node)
NODE=${NODE/\/node\/24.*\/bin\/node//node/24/bin/node}
LOGS=$DADOS
mkdir -p "$(dirname "$PLIST")"
cat > "$PLIST.novo" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ROTULO</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$DESTINO/apps/agent/node_modules/eve/bin/eve.js</string>
    <string>start</string>
    <string>--host</string><string>127.0.0.1</string>
    <string>--port</string><string>$PORTA</string>
  </array>
  <key>WorkingDirectory</key><string>$DESTINO/apps/agent</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>NODE_ENV</key><string>production</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>ProcessType</key><string>Standard</string>
  <key>StandardOutPath</key><string>$LOGS/agente.log</string>
  <key>StandardErrorPath</key><string>$LOGS/agente.log</string>
</dict>
</plist>
PLIST
plutil -lint -s "$PLIST.novo"
mv "$PLIST.novo" "$PLIST"
# log não cresce sem fim: guarda só o último pedaço
[ -f "$LOGS/agente.log" ] && [ "$(stat -f%z "$LOGS/agente.log")" -gt 5000000 ] && tail -c 1000000 "$LOGS/agente.log" > "$LOGS/agente.log.1" && mv "$LOGS/agente.log.1" "$LOGS/agente.log"

ligar() { # desliga a versão antiga, espera ela sair de verdade, liga a nova
  if launchctl print "$DOMINIO/$ROTULO" >/dev/null 2>&1; then
    launchctl bootout "$DOMINIO/$ROTULO" 2>/dev/null || true
    for _ in $(seq 1 30); do launchctl print "$DOMINIO/$ROTULO" >/dev/null 2>&1 || break; sleep 1; done
  fi
  local t
  for t in 1 2 3 4 5; do
    launchctl bootstrap "$DOMINIO" "$PLIST" 2>/dev/null && { launchctl kickstart "$DOMINIO/$ROTULO" 2>/dev/null || true; return 0; }
    sleep 3
  done
  echo "✗ o launchd não aceitou o serviço" >&2
  return 1
}
respondeu() {
  for _ in $(seq 1 45); do
    curl -fsS -m 2 "http://127.0.0.1:$PORTA/eve/v1/health" >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

diz "5/6 ligando"
ligar || true

diz "6/6 conferindo"
if respondeu; then
  echo "✓ agente $MAQUINA no ar em 127.0.0.1:$PORTA, commit $COMMIT"
  exit 0
fi
echo "✗ a versão $COMMIT não respondeu. Últimas linhas do log:" >&2
tail -20 "$LOGS/agente.log" >&2 || true
if [ -n "$ANTERIOR" ] && [ "$ANTERIOR" != "$(git -C "$DESTINO" rev-parse HEAD)" ]; then
  echo "voltando para ${ANTERIOR:0:12}…" >&2
  git -C "$DESTINO" checkout --quiet --detach "$ANTERIOR"
  construir
  ligar || true
  respondeu && falha "a versão nova falhou; o agente voltou para ${ANTERIOR:0:12} e está no ar" || falha "nem a versão anterior respondeu — olhar $LOGS/agente.log"
fi
falha "o agente não respondeu — olhar $LOGS/agente.log"
