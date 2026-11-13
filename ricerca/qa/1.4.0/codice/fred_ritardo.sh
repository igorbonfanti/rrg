#!/bin/bash
# Per ogni giorno: l'ultima data di DTWEXEMEGS pubblicata in quel giorno (ALFRED, vintage_date) e l'età in giorni.
# Uso: bash fred_ritardo.sh 2025-12-10 2026-01-20
d="$1"; end="$2"
while [[ "$d" < "$end" ]]; do
  last=$(curl -sS -m 30 "https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=DTWEXEMEGS&vintage_date=$d&cosd=$(date -u -d "$d -40 days" +%F)" | tail -1 | cut -d, -f1)
  age=$(( ( $(date -u -d "$d" +%s) - $(date -u -d "$last" +%s) ) / 86400 ))
  echo "$d $(date -u -d "$d" +%a) $last $age"
  d=$(date -u -d "$d +1 day" +%F)
done
