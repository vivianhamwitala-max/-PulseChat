#!/usr/bin/env bash
set -euo pipefail

# Render supplies PULSECHAT_FIREBASE_CONFIG at build time.
# Never commit the actual Firebase config to GitHub.
if [ -n "${PULSECHAT_FIREBASE_CONFIG:-}" ]; then
  printf '%s\n' "window.PULSECHAT_FIREBASE_CONFIG = ${PULSECHAT_FIREBASE_CONFIG};" > web/config.js
else
  printf '%s\n' 'window.PULSECHAT_FIREBASE_CONFIG = null;' > web/config.js
fi

test -f web/index.html
test -f web/app.js
test -f web/styles.css
test -f web/config.js
