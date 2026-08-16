#!/usr/bin/env bash
# Copy game web assets into Capacitor webDir (www/)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p www/js www/assets/run
cp -f index.html styles.css www/
cp -f js/*.js www/js/
# assets: images only, skip smoke screenshots
find assets -maxdepth 1 -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.webp' -o -name '*.mp4' \) \
  ! -name 'smoke*.png' -exec cp -f {} www/assets/ \;
if [[ -d assets/run ]]; then
  cp -f assets/run/*.png www/assets/run/ 2>/dev/null || true
fi
if [[ -f apple-touch-icon.png ]]; then
  cp -f apple-touch-icon.png www/apple-touch-icon.png
elif [[ -f resources/icon.png ]]; then
  cp -f resources/icon.png www/apple-touch-icon.png
fi

echo "www/ prepared from source"
