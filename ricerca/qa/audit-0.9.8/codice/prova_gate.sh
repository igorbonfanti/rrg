#!/usr/bin/env bash
# need_update.js legge i dati prima di guardare il cron: un indices.json leggibile come JSON ma con una serie rotta
# fa fallire il gate anche per la corsa principale delle 22:40, che non avrebbe bisogno di leggerlo.
# Uso: bash prova_gate.sh [cartella di lavoro]
set -u
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
W="${1:-$(mktemp -d)}"; rm -rf "$W"; mkdir -p "$W/scripts" "$W/js" "$W/data"
cp "$ROOT/scripts/need_update.js" "$W/scripts/"; cp "$ROOT"/js/calendar.js "$ROOT"/js/indexdata.js "$ROOT"/js/signals.js "$ROOT"/js/metrics.js "$W/js/"
echo '{"type":"module"}' > "$W/package.json"
cp "$ROOT/data/prices.json" "$ROOT/data/breadth.json" "$W/data/"
# serie SPX senza i conteggi (a200): JSON valido, quindi passa anche il controllo «JSON valido» del workflow
node -e "const f=require('$ROOT/data/indices.json'); delete f.series.SPX.d200; require('fs').writeFileSync('$W/data/indices.json', JSON.stringify(f))"
for S in '40 22 * * 1-5' '10 1-6 * * 2-6'; do
  OUT="$W/out.txt"; : > "$OUT"
  GITHUB_OUTPUT="$OUT" SCHEDULE="$S" node "$W/scripts/need_update.js" > "$W/log.txt" 2>&1; code=$?
  echo "cron «$S»: uscita $code, GITHUB_OUTPUT=«$(cat "$OUT" | tr -d '\n')», $(grep -m1 -E 'Error|Aggiorno|Salto' "$W/log.txt")"
done
echo "Con uscita ≠ 0 il job gate fallisce e il job update (needs: gate) non parte: anche la corsa delle 22:40 salta."
