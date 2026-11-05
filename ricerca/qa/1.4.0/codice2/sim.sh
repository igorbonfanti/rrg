#!/usr/bin/env bash
# sim.sh — una corsa simulata di scripts/fetch_emerging.js in una copia dell'app (APP), con il file pubblicato PREV
# (o "none") e la modalità MOCK di mock_fetch.mjs. Stampa uscita, durata, riassunto del file e confronto con PREV.
# Uso: sim.sh <nome> <prev|none> <MOCK>   (APP, CACHE e OUTDIR dall'ambiente)
set -u
NAME=$1; PREV=$2; MOCKM=$3
HERE=$(cd "$(dirname "$0")" && pwd)
F=$APP/data/emerging.json
rm -f "$F"; [ "$PREV" != none ] && cp "$PREV" "$F"
T0=$(date +%s)
( cd "$APP" && MOCK="$MOCKM" MOCK_CACHE="$CACHE" timeout ${LIMIT:-600} node --import "$HERE/mock_fetch.mjs" scripts/fetch_emerging.js ) > "$OUTDIR/$NAME.log" 2>&1
RC=$?
T1=$(date +%s)
echo "== $NAME (prev=$(basename "$PREV"), MOCK=$MOCKM): uscita $RC, $((T1-T0)) s"
[ -f "$F" ] && cp "$F" "$OUTDIR/$NAME.json"
node "$HERE/summary.mjs" "$F" "$PREV"
grep -E '^(Note|Errori|Arrivate|Scritto)|tenuta|accorciata|mancante|Error' "$OUTDIR/$NAME.log" | head -30
