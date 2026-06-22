#!/usr/bin/env bash
# Configura el repo remoto, el secret de Google Chat y lanza el primer run del workflow.
# Uso: GOOGLE_CHAT_WEBHOOK='https://chat.googleapis.com/...' ./scripts/setup-github.sh

set -euo pipefail

REPO_NAME="${REPO_NAME:-e2e-checkout-themopbookstore}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instala GitHub CLI: brew install gh && gh auth login"
  exit 1
fi

gh auth status >/dev/null

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
else
  git push -u origin main
fi

if [[ -z "${GOOGLE_CHAT_WEBHOOK:-}" ]]; then
  echo "Define GOOGLE_CHAT_WEBHOOK con la URL del webhook de Google Chat."
  exit 1
fi

gh secret set GOOGLE_CHAT_WEBHOOK --body "$GOOGLE_CHAT_WEBHOOK"
gh workflow run e2e.yml

echo "Listo. Sigue el run en: $(gh repo view --json url -q .url)/actions"
