#!/usr/bin/env zsh
set -euo pipefail

PROJECT_DIR="${RIBBOT_HOME:-$(cd "$(dirname "$0")/.." && pwd)}"

export PATH="$HOME/.local/bin:$HOME/.nvm/versions/node/v22.17.1/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
export NODE_NO_WARNINGS="${NODE_NO_WARNINGS:-1}"

if [[ -f "$HOME/.secrets.env" ]]; then
  set +u
  set -a
  source "$HOME/.secrets.env"
  set +a
  set -u
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_BOT_TOKEN_RIBBOT:-}" ]]; then
  export TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN_RIBBOT"
fi

if [[ -z "${RIBBOT_FTX_API_TOKEN:-}" && -n "${FROGX_BOT_API_TOKEN:-}" ]]; then
  export RIBBOT_FTX_API_TOKEN="$FROGX_BOT_API_TOKEN"
fi

export TG_TRADER="${TG_TRADER:-true}"
export RIBBOT_TRADING_ENABLED="${RIBBOT_TRADING_ENABLED:-false}"
export RIBBOT_TRADING_DRY_RUN="${RIBBOT_TRADING_DRY_RUN:-true}"

cd "$PROJECT_DIR"

STANDALONE_ENTRY="$PROJECT_DIR/packages/client-telegram/dist-standalone/standalone.js"
if [[ ! -f "$STANDALONE_ENTRY" ]]; then
  print -u2 "Standalone Ribbot build is missing: $STANDALONE_ENTRY"
  print -u2 "Run the client-telegram standalone build before starting the service."
  exit 1
fi

exec node "$STANDALONE_ENTRY" "$@"
