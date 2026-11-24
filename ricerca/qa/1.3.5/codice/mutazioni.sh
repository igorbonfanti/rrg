#!/usr/bin/env bash
# mutazioni.sh — i test della 1.3.5 riconoscono un barDate sbagliato? Per ogni mutazione di scripts/lib/yahoo.js si lancia
# npm test in una copia del repository (git archive, senza ricerca/) e si conta quanti test falliscono.
# Uso: bash mutazioni.sh <copia del repository> <yahoo.js originale>
set -u
W=$1; ORIG=$2
Y=$W/scripts/lib/yahoo.js
run() {
  local name=$1
  local r; r=$(cd "$W" && npm test 2>&1 | grep -E "^# fail" | awk '{print $3}')
  local which; which=$(cd "$W" && npm test 2>&1 | grep -E "^not ok" | sed 's/^not ok [0-9]* - //' | tr '\n' '|')
  echo "$name: test falliti $r ${which:+($which)}"
  cp "$ORIG" "$Y"
}
cp "$ORIG" "$Y"; run "0 nessuna mutazione"
# 1 cache unica per tutti i fusi (chiave solo timestamp)
sed -i 's/let d = c.seen.get(ts);/let d = (globalThis.__S ||= new Map()).get(ts);/; s/c.seen.set(ts, d);/globalThis.__S.set(ts, d);/' "$Y"; run "1 cache non per fuso"
# 2 niente ripiego per un fuso sconosciuto (il RangeError esce)
sed -i 's/} catch { \/\* fuso sconosciuto: si usa il gmtoffset \*\/ }/} finally {}/' "$Y"; run "2 senza try\/catch"
# 3 barra aperta senza orario: torna al gmtoffset
sed -i "s/barDate(ts\[i\], meta) === barDate(nowSec, meta)/barDate(ts[i], { gmtoffset: meta.gmtoffset }) === barDate(nowSec, { gmtoffset: meta.gmtoffset })/" "$Y"; run "3 barra aperta con il gmtoffset"
# 4 fillLast: regularMarketTime datato con il gmtoffset
sed -i "s/barDate(meta.regularMarketTime, meta) === d/barDate(meta.regularMarketTime, { gmtoffset: meta.gmtoffset }) === d/" "$Y"; run "4 fillLast con il gmtoffset"
# 5 fuso ignorato sempre (codice di prima)
sed -i "s/const tz = meta \&\& meta.exchangeTimezoneName;/const tz = null;/" "$Y"; run "5 fuso ignorato"
# 6 data in UTC quando manca il fuso (gmtoffset ignorato)
sed -i "s/return new Date((ts + ((meta \&\& meta.gmtoffset) || 0)) \* 1000)/return new Date(ts * 1000)/" "$Y"; run "6 ripiego in UTC"
# 7 giorno e mese invertiti (formato en-US letto male)
sed -i 's/d = `${p.year}-${p.month}-${p.day}`;/d = `${p.year}-${p.day}-${p.month}`;/' "$Y"; run "7 giorno e mese invertiti"
