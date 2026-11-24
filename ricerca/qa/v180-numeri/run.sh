#!/bin/sh
# Controllo indipendente dei numeri e dei grafici dello zoom (1.8.0): rapporto in ../v180-numeri.md.
# Serve il sito su un server locale (per esempio: node ricerca/qa/server/gzserve.mjs . 8791) e Playwright installato globalmente.
# Uso: sh ricerca/qa/v180-numeri/run.sh   (dalla radice del repository; BASE=http://127.0.0.1:8791/ di default)
# I dati letti dal browser finiscono in out/ (non nel repository); i valori attesi sono calcolati da ref.py
# direttamente dai JSON di data/, senza funzioni dell'app.
set -e
cd "$(dirname "$0")"; mkdir -p out
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
node ticks2.mjs
for s in tm sec sec2 sec3 ix perf perflate; do node $s.cjs > out/$s.log 2>&1; done
for c in check_tm check_sec check_sec2 check_sec3 check_ix check_perf check_perflate; do python3 -I $c.py > out/$c.txt 2>&1 || true; echo "$c: $(grep -c '^OK' out/$c.txt) OK, $(grep -c '^FAIL' out/$c.txt) FAIL"; done
