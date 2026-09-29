#!/usr/bin/env bash
# Constrói o Powerfarm.dmg a partir do commit atual.
#
#   bash deploy/dmg/construir-dmg.sh [pasta-de-saída]        (padrão: ~/Desktop)
#
# O DMG é exatamente um commit: a árvore precisa estar limpa. Dentro do Powerfarm.app vão
# o código (git bundle), a coreografia (fundar-powerfarm.sh) e o instalador do mesmo commit.
# O DMG e o app são coisas que se refazem: nunca entram no git (regra 5).
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "✗ há mudanças sem commit: o DMG tem de ser exatamente um commit" >&2; exit 1; }
SAIDA=${1:-$HOME/Desktop}
COMMIT=$(git rev-parse HEAD)
RAMO=$(git rev-parse --abbrev-ref HEAD)
VERSAO="1.0.$(git rev-list --count HEAD)"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
APP="$T/dmg/Powerfarm.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$SAIDA"

echo "== app (commit ${COMMIT:0:12}, versão $VERSAO)"
xcrun swiftc -O -swift-version 5 -parse-as-library -target arm64-apple-macos14.0 \
  deploy/dmg/Powerfarm.swift -o "$APP/Contents/MacOS/Powerfarm"

echo "== ícone"
xcrun swift deploy/dmg/icone.swift "$T/icone.png"
mkdir -p "$T/Powerfarm.iconset"
for n in 16 32 128 256 512; do
  sips -z $n $n "$T/icone.png" --out "$T/Powerfarm.iconset/icon_${n}x${n}.png" >/dev/null
  sips -z $((n * 2)) $((n * 2)) "$T/icone.png" --out "$T/Powerfarm.iconset/icon_${n}x${n}@2x.png" >/dev/null
done
iconutil -c icns "$T/Powerfarm.iconset" -o "$APP/Contents/Resources/Powerfarm.icns"

cat > "$APP/Contents/Info.plist" <<INFO
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Powerfarm</string>
  <key>CFBundleDisplayName</key><string>Powerfarm</string>
  <key>CFBundleIdentifier</key><string>app.powerfarm.fundacao</string>
  <key>CFBundleExecutable</key><string>Powerfarm</string>
  <key>CFBundleIconFile</key><string>Powerfarm</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSAO</string>
  <key>CFBundleVersion</key><string>${COMMIT:0:12}</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
INFO
plutil -lint -s "$APP/Contents/Info.plist"

echo "== o que vai dentro"
REFS=(HEAD "$RAMO")
[ "$RAMO" = main ] || REFS+=(main)
git bundle create --quiet "$APP/Contents/Resources/places.bundle" "${REFS[@]}"
cp deploy/fundar-powerfarm.sh deploy/instalar-agente.sh machines/comum.json "$APP/Contents/Resources/"
echo "$COMMIT" > "$APP/Contents/Resources/COMMIT"
codesign --force --sign - "$APP" 2>/dev/null

echo "== dmg"
hdiutil create -quiet -volname "Powerfarm" -srcfolder "$T/dmg" -ov -format UDZO "$SAIDA/Powerfarm.dmg"
echo "✓ $SAIDA/Powerfarm.dmg — $(du -h "$SAIDA/Powerfarm.dmg" | cut -f1), commit ${COMMIT:0:12}"
