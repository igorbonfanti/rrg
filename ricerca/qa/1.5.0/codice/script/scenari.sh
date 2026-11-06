#!/usr/bin/env bash
# Casi limite di scripts/fetch_vix.js con una rete finta (mock.mjs). Uso: scenari.sh <worktree> <cartella di lavoro>
# Nella cartella di lavoro: vix.committed.json (data/vix.json del commit) e rawcache/ (prima: REC=1 RAWCACHE=... node --import mock.mjs scripts/fetch_vix.js)
W=$1; Q=$2; S=$(cd "$(dirname "$0")" && pwd); cd "$W" || exit 1; export RAWCACHE=$Q/rawcache
run() { name=$1; prev=$2; mock=$3; if [ "$prev" = prev ]; then cp $Q/vix.committed.json data/vix.json; else rm -f data/vix.json; fi
  MOCK=$mock SCALE=${SCALE:-1} node --import $S/mock.mjs scripts/fetch_vix.js > $Q/sc_$name.log 2>&1; rc=$?
  if [ -f data/vix.json ]; then asof=$(node -p "JSON.stringify(require('$W/data/vix.json').asOf)"); same=$(node $S/same.mjs $W $Q/vix.committed.json data/vix.json); else asof="(nessun file)"; same=""; fi
  printf "%-3s %-5s %-22s rc=%s %s %s\n" $name $prev "$mock" $rc "$asof" "$same"; }
SCALE=100 run A prev fred503; SCALE=100 run B prev yahooNet; SCALE=100 run C prev fred503,yahooNet; run D prev fredOld; run E prev fredDot
run F prev vixEmpty; run G prev fredOld,vixOld; run H prev vixNullLast; SCALE=100 run I none spxFail; SCALE=100 run J none fred503
SCALE=100 run K none vixFail; run L prev spxShort; run M none spxShort; SCALE=100 run N prev ndxFail; run P none ""
SCALE=100 run Y1 prev yahooHang; SCALE=100 run Y2 prev fredHang; SCALE=100 run Y3 prev yahooHang,fredHang
cp $Q/vix.committed.json data/vix.json
