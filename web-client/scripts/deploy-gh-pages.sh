#!/usr/bin/env bash
# Compila la app en modo producción y publica dist/sportlink/browser en la rama
# `gh-pages` del repo remoto (GitHub Pages), sin depender de paquetes npm externos
# (usa git directo vía HTTPS/443, que es lo único que atraviesa firewalls estrictos).
#
# Uso: npm run deploy   (desde web-client/), o ejecutar este script directamente.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$WEB_CLIENT_DIR/.." && pwd)"
DIST_DIR="$WEB_CLIENT_DIR/dist/sportlink/browser"
BASE_HREF="${GH_PAGES_BASE_HREF:-/sportlink/}"

REMOTE_URL="$(git -C "$REPO_ROOT" remote get-url origin)"

echo "==> Compilando en modo producción (base-href: $BASE_HREF)"
cd "$WEB_CLIENT_DIR"
npx ng build --configuration production --base-href "$BASE_HREF"

echo "==> Agregando fallback SPA (404.html) para GitHub Pages"
cp "$DIST_DIR/index.html" "$DIST_DIR/404.html"

echo "==> Publicando en la rama gh-pages de $REMOTE_URL"
cd "$DIST_DIR"
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email="deploy@local" -c user.name="Deploy Bot" commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git remote add origin "$REMOTE_URL"
git push -f origin gh-pages

echo "==> Listo. El sitio se actualizará en unos minutos en GitHub Pages."
