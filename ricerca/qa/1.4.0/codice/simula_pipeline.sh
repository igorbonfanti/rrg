#!/bin/bash
# Corse simulate di fetch_emerging.js + keep_unchanged.js + check_fresh.js in una copia del commit (guasti con finto_fetch.mjs).
# Uso: bash simula_pipeline.sh <worktree> <cartella di lavoro>
WT="$1"; SIM="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$SIM"; git -C "$WT" worktree add -f --detach "$SIM" HEAD >/dev/null 2>&1 || cp -r "$WT" "$SIM"
cd "$SIM"
run() { # nome, variabili d'ambiente
  local name="$1"; shift
  local t0=$(date +%s)
  env "$@" node --import "$HERE/finto_fetch.mjs" scripts/fetch_emerging.js > /tmp/sim.out 2>&1; local ec=$?
  echo "== $name: uscita $ec in $(( $(date +%s) - t0 )) s"
  grep -E "Arrivate|Scritto|tenuta|mancante|Errori" /tmp/sim.out | head -8 | sed 's/^/   /'
  [ -f data/emerging.json ] && node "$HERE/info_file.mjs"
  [ -f data/emerging.json ] || echo "   file: assente"
  node scripts/check_fresh.js | sed 's/^/   check_fresh: /'; echo "   check_fresh uscita ${PIPESTATUS[0]}"
}
git checkout -q -- data/emerging.json
rm -f data/emerging.json
run "S1 prima corsa, file assente, tutto arriva"
rm -f data/emerging.json
run "S2 prima corsa, file assente, 3 cambi non arrivano (12/15)" 'FAIL=KRW=X|TWD=X|BRL=X'
rm -f data/emerging.json
run "S3 prima corsa, file assente, 4 serie non arrivano (11/15)" 'FAIL=KRW=X|TWD=X|BRL=X|EWZ'
git checkout -q -- data/emerging.json
run "S4 file pubblicato, FRED non risponde" 'FAIL=fredgraph'
git checkout -q -- data/emerging.json
run "S5 file pubblicato, Yahoo restituisce serie più vecchie di 2 sedute" 'OLD=.'
node scripts/keep_unchanged.js | sed 's/^/   keep_unchanged: /'; git status --short data/emerging.json | sed 's/^/   git: /'
git checkout -q -- data/emerging.json
run "S6 file pubblicato, KRW=X con solo 300 sedute" 'SHORT=KRW'
git checkout -q -- data/emerging.json
run "S7 file pubblicato, KRW=X con un buco di 50 giorni nel 2024" 'GAP=KRW'
git checkout -q -- data/emerging.json
run "S8 file pubblicato, Yahoo non risponde affatto" 'FAIL=finance/chart'
git checkout -q -- data/emerging.json
