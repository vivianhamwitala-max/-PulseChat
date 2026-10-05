#!/usr/bin/env bash
set -euo pipefail

if [ -n "${PULSECHAT_SUPABASE_URL:-}" ] && [ -n "${PULSECHAT_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  cat > web/config.js <<EOF
window.PULSECHAT_SUPABASE_CONFIG = {
  url: "${PULSECHAT_SUPABASE_URL}",
  publishableKey: "${PULSECHAT_SUPABASE_PUBLISHABLE_KEY}"
};
EOF
fi

test -f web/index.html
test -f web/app.js
test -f web/styles.css
test -f web/config.js
node --check web/app.js
