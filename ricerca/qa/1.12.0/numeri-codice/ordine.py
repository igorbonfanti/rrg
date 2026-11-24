"""Ordine tipico (ranghi medi) ricalcolato da zero sulle chiusure Yahoo con tutta la storia (serve il 1999 per il calo del 2000).
Confronto con ORDER di js/peaks.js (letto come testo) e con risultati.json order.SPX15. Uso: python3 -I ordine.py"""
import json, os, re, sys, urllib.request, urllib.parse, statistics, datetime as dt
from zoneinfo import ZoneInfo
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import ricalcolo as r
ROOT = r.ROOT
C = os.path.join(HERE, 'cache-yahoo-max'); os.makedirs(C, exist_ok=True)
S = {}
for k, s in r.SYM.items():
    f = os.path.join(C, k + '.json')
    if not os.path.exists(f):
        u = 'https://query1.finance.yahoo.com/v8/finance/chart/' + urllib.parse.quote(s) + '?period1=-1325583000&period2=1800000000&interval=1d'
        open(f, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read())
    j = json.load(open(f))['chart']['result'][0]; tz = ZoneInfo(j['meta']['exchangeTimezoneName'])
    rows = {dt.datetime.fromtimestamp(t, tz).date(): c for t, c in zip(j['timestamp'], j['indicators']['quote'][0]['close']) if c is not None}
    S[k] = sorted((d, c) for d, c in rows.items() if d <= dt.date(2026, 11, 20))
H = {k: r.highs52(S[k]) for k in r.IDS}
C20 = {k: r.cycle(S[k], 20, H[k]) for k in r.IDS}
eps = [p for p in r.cycle(S['SPX'], 15, H['SPX']) if p['date'] >= dt.date(2000, 1, 1) and not p['ongoing']]
print('cali >= 15% S&P 500 dal 2000:', [(p['date'].isoformat(), p['dd']) for p in eps])
off = {k: [] for k in r.IDS}; rk = {k: [] for k in r.IDS}; cnt = {k: dict(withPeak=0, none=0, nodata=0, before=0, together=0, after=0) for k in r.IDS}
for ep in eps:
    P = ep['date']; o = {}
    for k in r.IDS:
        if k == 'SPX': o[k] = 0; continue
        if S[k][0][0] + dt.timedelta(days=365) > P - dt.timedelta(days=365): cnt[k]['nodata'] += 1; continue
        c = [q for q in C20[k] if P - dt.timedelta(days=365) <= q['date'] <= P + dt.timedelta(days=365)]
        if not c: cnt[k]['none'] += 1; continue
        o[k] = (max(c, key=lambda q: q['close'])['date'] - P).days
    cnt['SPX']['withPeak'] += 0
    vals = sorted(o.values())
    for k, v in o.items():
        cnt[k]['withPeak'] += 1; off[k].append(v)
        cnt[k]['before' if v < -31 else 'after' if v > 31 else 'together'] += 1
        pos = [i for i, x in enumerate(vals) if x == v]; rank = sum(pos) / len(pos)
        rk[k].append(rank / (len(vals) - 1))
mine = {k: dict(meanRankNorm=round(sum(rk[k]) / len(rk[k]), 4), medianOffset=statistics.median(off[k]), **cnt[k]) for k in r.IDS}
src = open(os.path.join(ROOT, 'js', 'peaks.js')).read()
app = {m.group(1): {a: float(b) for a, b in re.findall(r'(\w+): (-?[\d.]+)', m.group(2))} for m in re.finditer(r'(\w+): \{ (meanRankNorm[^}]*)\}', src)}
res = json.load(open(os.path.join(ROOT, 'ricerca', 'rotazione-bolle', 'risultati.json')))['order']['SPX15']
nd = 0
for k in r.IDS:
    for f in ['meanRankNorm', 'withPeak', 'none', 'nodata', 'before', 'together', 'after', 'medianOffset']:
        a, b, c = mine[k][f], app[k][f], res[k][f]
        if not (abs(a - b) < 1e-9 and abs(a - c) < 1e-9): nd += 1; print('DIFF', k, f, 'mio', a, 'app', b, 'ricerca', c)
print('ordine (mio):', ' · '.join(f"{k} {mine[k]['meanRankNorm']:.4f}" for k in sorted(r.IDS, key=lambda k: mine[k]['meanRankNorm'])))
print(f'campi confrontati: {9*8}, differenze: {nd}')
