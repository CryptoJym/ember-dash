#!/usr/bin/env bash
# Build the separate Godot playtest. Never overwrites either existing game entry.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT_BIN:-/Applications/Godot.app/Contents/MacOS/Godot}"
OUT="${1:-$ROOT/forge}"
[[ -x "$GODOT" ]] || { echo "Set GODOT_BIN to the Godot 4.7.2 executable." >&2; exit 2; }
mkdir -p "$OUT" "$ROOT/docs/ironflame/evidence"
"$GODOT" --headless --editor --path "$ROOT/godot" --import
for suite in rules physics controller flow; do
  log="$ROOT/docs/ironflame/evidence/$suite.log"
  "$GODOT" --headless --fixed-fps 120 --path "$ROOT/godot" --script "res://tests/test_$suite.gd" > "$log" 2>&1
  if grep -E 'SCRIPT ERROR|^ERROR:|^FAIL ' "$log"; then exit 3; fi
  tail -1 "$log"
done
"$GODOT" --headless --path "$ROOT/godot" --export-release Web "$OUT/index.html"
python3 "$ROOT/scripts/brand_ironflame_export.py" "$OUT/index.html"
"$GODOT" --headless --script "$ROOT/scripts/godot_licenses.gd" -- "$OUT/ENGINE-LICENSES.txt"
cp "$ROOT/apple-touch-icon.png" "$OUT/index.icon.png"
cp "$ROOT/apple-touch-icon.png" "$OUT/index.apple-touch-icon.png"
echo "Built $OUT/index.html. Serve this directory over HTTP/HTTPS; do not open the HTML as a local file."
