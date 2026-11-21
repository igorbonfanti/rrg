#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente dei numeri chiave di ricerca/rotazione-bolle/backtest.md.

Altro linguaggio e altro codice rispetto a backtest.mjs: legge direttamente i file grezzi di Yahoo in
ricerca/rotazione-bolle/cache/Y_*.json (scaricati da backtest.mjs), li pulisce per conto suo e rifà con algoritmi
diversi (forza bruta invece di pile e code monotone):
  - massimi di ciclo (massimo di 52 settimane = chiusura più alta di tutte quelle dei 365 giorni prima, con almeno
    365 giorni di storia; poi calo >= X% prima di una chiusura più alta) alle soglie 10 (S&P 500), 15, 20, 30, 40;
  - finestre ±365 giorni dei cali >= 15% dell'S&P 500 e scarto del massimo più alto di ogni mercato;
  - criteri (a) e (b) dell'anticipatore per i singoli mercati, con le due basi di confronto;
  - scarto mediano e rango medio normalizzato (ordine tipico);
  - distanza dal massimo di chiusura degli ultimi 3 anni all'ultima seduta.
Alla fine confronta tutto con ricerca/rotazione-bolle/risultati.json e stampa le differenze.

Uso: python3 -I ricerca/rotazione-bolle/script/verifica.py   (dopo node ricerca/rotazione-bolle/script/backtest.mjs)
"""
import json, os, sys, statistics
from datetime import date, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(BASE))
CACHE = os.path.join(BASE, 'cache')
START = date(2000, 1, 1)
D = lambda s: date.fromisoformat(s)

cfg = json.load(open(os.path.join(ROOT, 'config', 'ath.json'), encoding='utf-8'))['markets']
IDS = [m['id'] for m in cfg]
series = {}
for m in cfg:
    fn = 'Y_' + ''.join(c if (c.isalnum() or c in '_.-') else '_' for c in m['symbol']) + '.json'
    y = json.load(open(os.path.join(CACHE, fn), encoding='utf-8'))
    rows = [(D(d), float(c)) for d, c in zip(y['dates'], y['close']) if c is not None]
    rows.sort()
    series[m['id']] = rows


def peaks(rows, X):
    """Forza bruta: per ogni seduta il massimo dei 365 giorni prima ricalcolato da zero."""
    dts = [r[0] for r in rows]; cl = [r[1] for r in rows]; n = len(cl)
    first_ok = dts[0] + timedelta(days=365)
    out = []
    lo = 0
    for i in range(n):
        if dts[i] < first_ok:
            continue
        while dts[lo] < dts[i] - timedelta(days=365):
            lo += 1
        prev = cl[lo:i]
        if not prev or cl[i] <= max(prev):
            continue
        conf = None
        j = i + 1
        while j < n and cl[j] <= cl[i]:
            if conf is None and cl[j] <= cl[i] * (1 - X / 100):
                conf = j
            j += 1
        if conf is not None:
            out.append([i, j, conf])
    res = []
    for t, (i, j, conf) in enumerate(out):
        later = [q[0] for q in out[t + 1:] if q[0] > conf]
        end = min(j, later[0]) if later else j
        seg = cl[i + 1:end]
        mn = min(seg); imn = i + 1 + seg.index(mn)
        res.append({'date': dts[i], 'close': cl[i], 'dd': round((mn / cl[i] - 1) * 100, 1), 'trough': dts[imn],
                    'confirm': dts[conf], 'ongoing': end >= n})
    return res


P = {i: {X: peaks(series[i], X) for X in (10, 15, 20, 30, 40)} for i in IDS}
elig = {i: series[i][0][0] + timedelta(days=365) for i in IDS}
has_data = lambda i, p0: elig[i] <= p0 - timedelta(days=365)
spx = series['SPX']; spx_d = [r[0] for r in spx]; spx_c = [r[1] for r in spx]
last_spx = spx_d[-1]


def fwd_dd(k):
    end = spx_d[k] + timedelta(days=365)
    if end > last_spx:
        return None
    seg = [c for d, c in zip(spx_d[k:k + 400], spx_c[k:k + 400]) if d <= end]
    best, worst = seg[0], 0.0
    for c in seg:
        best = max(best, c); worst = max(worst, 1 - c / best)
    return worst


import bisect
FWD = {}
for k, d in enumerate(spx_d):
    if d >= START:
        FWD[d] = fwd_dd(k)
fwd_at = lambda d: FWD.get(spx_d[bisect.bisect_left(spx_d, d)]) if bisect.bisect_left(spx_d, d) < len(spx_d) else None
period = lambda d: 'p1' if d < date(2013, 1, 1) else 'p2'

res = {'counts': {}, 'windows': {}, 'crit': {}, 'baseA': {}, 'order': {}, 'today': {}}
for i in IDS:
    res['counts'][i] = {str(X): len([p for p in P[i][X] if p['date'] >= START]) for X in (10, 15, 20, 30, 40)}

vals = [v for v in FWD.values() if v is not None]
res['baseB'] = round(100 * sum(v >= 0.10 for v in vals) / len(vals), 1)

anchors15 = [p for p in P['SPX'][15] if p['date'] >= START]
anchors20 = [p for p in P['SPX'][20] if p['date'] >= START]
offs = {i: [] for i in IDS}; ranks = {i: [] for i in IDS}
for a in anchors15:
    row = {}
    for i in IDS:
        if i == 'SPX':
            row[i] = 0; continue
        if not has_data(i, a['date']):
            row[i] = 'nodata'; continue
        c = [p for p in P[i][20] if abs((p['date'] - a['date']).days) <= 365]
        row[i] = (max(c, key=lambda p: p['close'])['date'] - a['date']).days if c else 'none'
    res['windows'][a['date'].isoformat()] = row
    pts = sorted([(v, i) for i, v in row.items() if isinstance(v, int)])
    k = len(pts)
    for v, i in pts:
        same = [t for t, (vv, _) in enumerate(pts) if vv == v]
        r = (same[0] + same[-1]) / 2 + 1
        offs[i].append(v)
        if k > 1:
            ranks[i].append((r - 1) / (k - 1))
for i in IDS:
    res['order'][i] = {'median': statistics.median(offs[i]) if offs[i] else None,
                       'rank': round(sum(ranks[i]) / len(ranks[i]), 4) if ranks[i] else None}

for i in IDS:
    if i == 'SPX':
        continue
    cases = [a for a in anchors20 if has_data(i, a['date']) and not (i == 'SPX')]
    hits = [a for a in cases if any(-365 <= (p['date'] - a['date']).days <= -30 for p in P[i][20])]
    al = [p for p in P[i][20] if p['date'] >= START]
    f = [fwd_at(p['date']) for p in al]
    done = [x for x in f if x is not None]
    false_ = sum(x < 0.10 for x in done)
    res['crit'][i] = {'cases': len(cases), 'hits': len(hits), 'alarms': len(done), 'false': false_}
    # base (a): sedute dell'S&P 500 dal 2000 in cui il mercato ha dati e un massimo di ciclo tra 365 e 30 giorni prima
    pk = sorted(p['date'] for p in P[i][20])
    n = h = 0
    for d in spx_d:
        if d < START or not has_data(i, d):
            continue
        n += 1
        lo, hi = d - timedelta(days=365), d - timedelta(days=30)
        j = bisect.bisect_left(pk, lo)
        if j < len(pk) and pk[j] <= hi:
            h += 1
    res['baseA'][i] = round(100 * h / n, 1) if n else None

for i in IDS:
    rows = series[i]
    ld, lc = rows[-1]
    try:
        frm = ld.replace(year=ld.year - 3)
    except ValueError:
        frm = ld.replace(year=ld.year - 3, day=28)
    win = [r for r in rows if r[0] >= frm]
    ref = max(win, key=lambda r: (r[1], -r[0].toordinal()))
    res['today'][i] = {'refDate': ref[0].isoformat(), 'distPct': round((lc / ref[1] - 1) * 100, 2)}

# conferme dei massimi arrivati prima (cali >= 15% conclusi)
closed = before = 0
bym = {}
for a in anchors15:
    for i in IDS:
        if i == 'SPX' or not has_data(i, a['date']):
            continue
        for p in P[i][20]:
            o = (p['date'] - a['date']).days
            if -365 <= o <= -30:
                closed += 1
                ok = (p['confirm'] - a['date']).days < 0
                before += ok
                b = bym.setdefault(i, [0, 0]); b[0] += ok; b[1] += 1
res['early'] = (before, closed)

# ------------------------------------------------------------- confronto
R = json.load(open(os.path.join(BASE, 'risultati.json'), encoding='utf-8'))
diff = []
def cmp(what, a, b):
    if a != b:
        diff.append(f'{what}: python={a} node={b}')
for i in IDS:
    for X, v in res['counts'][i].items():
        if X in R['counts'][i]:
            cmp(f'episodi {i} {X}%', v, R['counts'][i][X])
    for X in ('15', '20', '30'):
        pyl = [(p['date'].isoformat(), p['dd'], p['trough'].isoformat(), p['confirm'].isoformat(), p['ongoing']) for p in P[i][int(X)] if p['date'] >= START]
        nl = [(p['date'], p['ddPct'], p['troughDate'], p['confirmDate'], bool(p.get('ongoing'))) for p in R['episodes'][i][X]]
        cmp(f'elenco episodi {i} {X}%', pyl, nl)
cmp('elenco SPX 10%', [p['date'].isoformat() for p in P['SPX'][10] if p['date'] >= START], [p['date'] for p in R['episodes']['SPX']['10']])
cmp('conferme prima', res['early'], (R['earlyConfirm']['confirmedBefore'], R['earlyConfirm']['closed']))
for i, b in bym.items():
    cmp(f'conferme prima {i}', tuple(b), (R['earlyConfirm']['byMarket'][i]['confirmedBefore'], R['earlyConfirm']['byMarket'][i]['closed']))
cmp('base (b)', res['baseB'], R['baseB']['all']['pct'])
for w in R['windows']['SPX15']:
    for i in IDS:
        m = w['markets'][i]
        nv = m.get('offset') if m.get('offset') is not None else m['status']
        cmp(f'finestra {w["peak"]} {i}', res['windows'][w['peak']][i], nv)
for i in IDS:
    o = R['order']['SPX15'][i]
    cmp(f'scarto mediano {i}', res['order'][i]['median'], o['medianOffset'])
    cmp(f'rango medio {i}', res['order'][i]['rank'], o['meanRankNorm'])
for i, c in res['crit'].items():
    a = R['criteria'][i]['perPeriod']['all']
    cmp(f'criterio (a) {i}', (c['hits'], c['cases']), (a['hits'], a['cases']))
    cmp(f'criterio (b) {i}', (c['false'], c['alarms']), (a['falseAlarms'], a['alarms']))
    cmp(f'base (a) {i}', res['baseA'][i], R['criteria'][i]['baseA']['all']['pct'])
for i in IDS:
    t = R['today'][i]
    cmp(f'oggi {i}', (res['today'][i]['refDate'], res['today'][i]['distPct']), (t['ref3yDate'], t['distPct']))

# ------------------------------------------------------------- seconda fonte: FRED (S&P 500 dal 2016, Nasdaq-100 dal 1986)
# File scaricati il 12/11/2026 da ricerca/bolle-rotazione/dati.mjs (cache locale, esclusa da git); se mancano si salta.
fred_note = []
OTHER = os.path.join(ROOT, 'ricerca', 'bolle-rotazione', 'cache')
for i, fn in (('SPX', 'F_SP500.json'), ('NDX', 'F_NASDAQ100.json')):
    f = os.path.join(OTHER, fn)
    if not os.path.exists(f):
        fred_note.append(f'{i}: file FRED assente, confronto saltato'); continue
    y = json.load(open(f, encoding='utf-8'))
    rows = sorted((D(d), float(c)) for d, c in zip(y['dates'], y['close']) if c is not None)
    for X in (15, 20):
        fr = [(p['date'].isoformat(), p['dd']) for p in peaks(rows, X) if p['date'] >= max(START, rows[0][0] + timedelta(days=365)) and not p['ongoing']]
        lo = fr and min(d for d, _ in fr)
        ya = [(p['date'], p['ddPct']) for p in R['episodes'][i][str(X)] if not p.get('ongoing') and lo and p['date'] >= rows[0][0].isoformat() and D(p['date']) >= rows[0][0] + timedelta(days=365)]
        same = fr == ya
        fred_note.append(f'{i} >= {X}% FRED {rows[0][0]}..{rows[-1][0]}: {len(fr)} episodi conclusi, ' + ('uguali a Yahoo (date e cali)' if same else f'DIVERSI: FRED={fr} Yahoo={ya}'))
print('Seconda fonte:'); [print(' ', n) for n in fred_note]

checked = sum(1 for _ in IDS) * 4 + len(R['windows']['SPX15']) * len(IDS) + len(res['crit']) * 3 + len(IDS) * 3 + 2
print(f'Controlli: circa {checked} gruppi di valori; differenze: {len(diff)}')
for d in diff:
    print(' ', d)
sys.exit(1 if diff else 0)
