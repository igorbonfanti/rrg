#!/bin/bash
# Due corse di fetch_emerging.js a pochi secondi di distanza, senza sedute nuove: i file coincidono? keep_unchanged li riporta indietro?
# Uso: bash rumore_adjclose.sh <copia del commit (worktree git)>
SIM="$1"; HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$SIM" || exit 1
git checkout -q -- data/emerging.json
node scripts/fetch_emerging.js > /dev/null 2>&1; cp data/emerging.json $SIM/../rumore_1.json
node scripts/fetch_emerging.js > /dev/null 2>&1; cp data/emerging.json $SIM/../rumore_2.json
echo "== corsa 1 contro corsa 2 (stesse sedute)"; node "$HERE/confronta_file.mjs" "$SIM" $SIM/../rumore_1.json $SIM/../rumore_2.json
echo "== keep_unchanged dopo la corsa 2 (rispetto al file del commit)"; node scripts/keep_unchanged.js; git status --short data/emerging.json
git checkout -q -- data/emerging.json
