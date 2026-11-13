#!/usr/bin/env python3
"""
verifica_nasdaq.py — seconda fonte per il prezzo del SOXX: chiusure dall'API storica pubblica di nasdaq.com (la stessa
famiglia di API che l'app usa per la lista del Nasdaq-100) confrontate con la chiusura di Yahoo (rettificata per gli
split, non per i dividendi) in cache. L'API restituisce gli ultimi 10 anni.

Uso (l'API rifiuta urllib di Python con 403, risponde a curl):
  curl -sS -A 'Mozilla/5.0' -H 'Accept: application/json' -H 'Origin: https://www.nasdaq.com' -H 'Referer: https://www.nasdaq.com/' \
    -o NQ.json 'https://api.nasdaq.com/api/quote/SOXX/historical?assetclass=etf&fromdate=2001-01-01&todate=2030-12-31&limit=9999'
  python3 -I ricerca/soxx/dati/script/verifica_nasdaq.py CACHE_DIR NQ.json
"""
import datetime as dt, json, os, statistics, sys

cache, nqfile = sys.argv[1], sys.argv[2]
rows = json.load(open(nqfile, encoding='utf-8'))['data']['tradesTable']['rows']
nq = {dt.datetime.strptime(r['date'], '%m/%d/%Y').strftime('%Y-%m-%d'): float(r['close'].replace('$', '').replace(',', '')) for r in rows}
y = json.load(open(os.path.join(cache, 'SOXX.json'), encoding='utf-8'))
ym = dict(zip(y['dates'], y['close']))
common = sorted(set(nq) & set(ym))
d = [abs(nq[x] / ym[x] - 1) for x in common]
print(f'Nasdaq {len(nq)} sedute ({min(nq)} → {max(nq)}), in comune con Yahoo {len(common)}; '
      f'solo Nasdaq {len(set(nq) - set(ym))}, solo Yahoo nello stesso periodo {len([x for x in ym if min(nq) <= x <= max(nq) and x not in nq])}')
print(f'scarto relativo: mediano {statistics.median(d):.2e}, massimo {max(d):.2e}; sedute con scarto > 0,5%: {sum(x > 0.005 for x in d)}')
