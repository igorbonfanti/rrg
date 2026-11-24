#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (senza i moduli dell'app) dei numeri principali della ricerca SOXX.

Rifà da zero, dalle serie di Yahoo in cache:
  1. conteggi della breadth a 200 sedute con i membri di oggi (regola scritta qui: chiusura rettificata per gli split,
     titolo «sopra» se ha almeno 200 sedute e chiude sopra la media semplice delle ultime 200; n = titoli con l'ultima
     seduta entro 5 giorni di calendario; nessuna pulizia degli errori di scala) e li confronta con breadth_soxx.json;
  2. sedute con la breadth ≤ 3/5/10% dall'inizio della serie;
  3. rendimenti del SOXX (chiusura rettificata) a 21/63/126/252 sedute dalle date delle zone blu e dei trigger del livello
     3% scritte in risultati.json, e peggior calo nelle 252 sedute;
  4. drawdown del SOXX dal massimo di 252 sedute all'ultima seduta e sua quota tra le sedute precedenti;
  5. tocchi della breadth a 0 per anno (per il confronto qualitativo col grafico di Rea).

Uso: python3 -I ricerca/soxx/dati/script/verifica.py CACHE_DIR
"""
import bisect, datetime as dt, json, os, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
cache = sys.argv[1]
load = lambda s: json.load(open(os.path.join(cache, urllib.parse.quote(s, safe='') + '.json'), encoding='utf-8'))
mem = json.load(open(os.path.join(OUT, 'membri_oggi.json'), encoding='utf-8'))['tickers']
app = json.load(open(os.path.join(OUT, 'breadth_soxx.json'), encoding='utf-8'))
res = json.load(open(os.path.join(OUT, 'risultati.json'), encoding='utf-8'))
soxx = load('SOXX')
cal = soxx['dates']
od = lambda d: dt.date.fromisoformat(d).toordinal()

# 1. breadth
above = [0] * len(cal); n = [0] * len(cal)
for s in mem:
    j = load(s)
    d, c = j['dates'], j['close']
    if not d:
        continue
    o = [od(x) for x in d]
    pref = [0.0]
    for x in c:
        pref.append(pref[-1] + x)
    for i, day in enumerate(cal):
        k = bisect.bisect_right(d, day) - 1
        if k < 0 or od(day) - o[k] > 5:
            continue
        n[i] += 1
        if k >= 199 and c[k] > (pref[k + 1] - pref[k - 199]) / 200:
            above[i] += 1
start = cal.index(res['breadth']['inizioRegolaApp'])
diff = [(cal[i], above[i], app['a200'][i], n[i], app['n'][i]) for i in range(start, len(cal)) if above[i] != app['a200'][i] or n[i] != app['n'][i]]
print(f'1. breadth: {len(cal) - start} sedute dal {cal[start]}, diverse da quelle dello script con le funzioni dell\'app: {len(diff)}')
for x in diff[:10]:
    print('   ', x)
pct = [100 * above[i] / n[i] if i >= start and n[i] else None for i in range(len(cal))]

# 2. sedute sotto i livelli
v = [x for x in pct if x is not None]
for L in (0, 3, 5, 10):
    print(f'2. sedute con breadth ≤ {L}%: {sum(x <= L for x in v)} su {len(v)} ({100 * sum(x <= L for x in v) / len(v):.2f}%)')

# 3. rendimenti dagli episodi del livello 3%
adj = soxx['adjclose']
pos = {d: i for i, d in enumerate(cal)}
fwd = lambda t, h: None if t + h >= len(adj) else round((adj[t + h] / adj[t] - 1) * 100, 1)
worst = lambda t, h: round((min(adj[t:min(len(adj), t + h + 1)]) / adj[t] - 1) * 100, 1)
m3 = next(m for m in res['macchina']['soxxRettificato'] if m['livello'] == 3)
bad = 0
for e in m3['episodi']:
    t = pos[e['zonaBlu']]
    mine = [fwd(t, h) for h in (21, 63, 126, 252)]
    theirs = [e['rendDaZonaBlu'][k] for k in ('1M', '3M', '6M', '12M')]
    tt = pos[e['trigger'][0]] if e['trigger'] else None
    mineT = [fwd(tt, h) for h in (21, 63, 126, 252)] if tt is not None else None
    theirsT = [e['rendDaPrimoTrigger'][k] for k in ('1M', '3M', '6M', '12M')] if tt is not None else None
    ok = mine == theirs and mineT == theirsT and worst(t, 252) == e['peggiorCalo252DaZonaBlu']
    bad += not ok
    print(f'3. {e["zonaBlu"]} zona blu {mine} peggior calo 252 {worst(t, 252)} | trigger {e["trigger"][:1]} {mineT} {"ok" if ok else "DIVERSO"}')
# base: tutte le sedute dalla prima con uno stato
first = pos[m3['primaSedutaConStato']]
for h, k in ((21, '1M'), (63, '3M'), (126, '6M'), (252, '12M')):
    a = sorted(x for x in (fwd(t, h) for t in range(first, len(adj))) if x is not None)
    med = a[len(a) // 2] if len(a) % 2 else (a[len(a) // 2 - 1] + a[len(a) // 2]) / 2
    print(f'3. base {k}: mediana {med:.1f} su {len(a)} sedute (script dell\'app: {next(c for c in m3["contesto"] if c["gruppo"] == "any")["mediane"][k]})')
print(f'3. episodi diversi: {bad}')

# 4. drawdown oggi
dd = []
for i in range(len(adj)):
    hi = max(adj[max(0, i - 251):i + 1])
    dd.append((adj[i] / hi - 1) * 100)
last = dd[-1]
prev = dd[:-1]
print(f'4. drawdown SOXX al {cal[-1]}: {last:.1f}% ; sedute precedenti con drawdown meno profondo: {100 * sum(x > last for x in prev) / len(prev):.1f}%')

# 5. tocchi a 0 per anno
years = {}
for i, x in enumerate(pct):
    if x is not None and x == 0:
        years[cal[i][:4]] = years.get(cal[i][:4], 0) + 1
print('5. sedute con breadth 0 per anno:', years)
