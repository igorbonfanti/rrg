#!/usr/bin/env python3
"""ricontrollo.py — ricalcolo indipendente dei numeri chiave di dati.mjs (stessi file grezzi di cache/, codice diverso).

Differenze di metodo rispetto a dati.mjs, volute:
 - sedute dell'S&P 500: decodifica di data/vix.json scritta qui (d0 + intervalli in base 36), non vxSeries di js/vix.js;
   ultima seduta da Yahoo ^GSPC con zoneinfo, non con parse() di scripts/lib/yahoo.js;
 - scadenze dei futures: dai file stessi (archivio: data dell'ultima riga; CDN: nome del file, controllato contro
   l'ultima riga per i contratti già scaduti), non dall'elenco ufficiale product/list/VX; poi si controlla che coincidano;
 - roll trovato come cambio di VX1 tra due sedute del calendario comune (bisect sulle scadenze);
 - correlazioni con statistics.correlation (Python 3.10+), non con una funzione scritta a mano;
 - peso: codifica compatta riscritta in Python (json.dumps senza spazi), solo byte senza gzip.
Uso: python3 -I ricerca/vix/struttura/dati/ricontrollo.py  (scrive ricontrollo.json accanto)
"""
import bisect, csv, json, math, os, statistics
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

H = os.path.dirname(os.path.abspath(__file__))
C = os.path.join(H, 'cache')
ROOT = os.path.abspath(os.path.join(H, '..', '..', '..', '..'))
OUT = {}

def fred(i):
    out = {}
    with open(os.path.join(C, f'fred_{i}.csv')) as f:
        for row in list(csv.reader(f))[1:]:
            if len(row) == 2 and row[1] not in ('', '.'):
                out[row[0]] = float(row[1])
    return out

def cboe(n):
    out = {}
    with open(os.path.join(C, f'cboe_{n}.csv')) as f:
        for row in list(csv.reader(f))[1:]:
            m, d, y = row[0].split('/')
            out[f'{y}-{int(m):02d}-{int(d):02d}'] = float(row[4])
    return out

def yahoo(n, adj=False):
    j = json.load(open(os.path.join(C, f'yahoo_{n}_1d.json')))['chart']['result'][0]
    tz = ZoneInfo(j['meta']['exchangeTimezoneName'])
    vals = j['indicators']['adjclose'][0]['adjclose'] if adj else j['indicators']['quote'][0]['close']
    out = {}
    for t, c in zip(j['timestamp'], vals):
        if c is not None:
            out[datetime.fromtimestamp(t, tz).strftime('%Y-%m-%d')] = c
    return out

# --- sedute
vj = json.load(open(os.path.join(ROOT, 'data', 'vix.json')))
s = vj['series']['SPX']
d = date.fromisoformat(s['d0']); sess = [d.isoformat()]
for ch in s['gaps']:
    d += timedelta(days=int(ch, 36)); sess.append(d.isoformat())
gs = yahoo('GSPC')
sess += sorted(x for x in gs if x > sess[-1])
S = set(sess); LAST = sess[-1]
OUT['ultima_seduta'] = LAST

# --- VIX3M
f3, c3, fv = fred('VXVCLS'), cboe('VIX3M'), fred('VIXCLS')
com = sorted(set(f3) & set(c3))
OUT['vix3m'] = {
    'fred_valori': len(f3), 'fred_primo': min(f3), 'cboe_primo': min(c3),
    'comuni': len(com), 'uguali_centesimo': sum(round(f3[x], 2) == round(c3[x], 2) for x in com),
    'fred_sedute_mancanti': [x for x in sess if x >= min(f3) and x not in f3],
    'fred_fuori_seduta': len([x for x in f3 if x not in S]),
    'vixcls_fuori_seduta_dal_2007_12_04': len([x for x in fv if x >= '2007-12-04' and x <= LAST and x not in S]),
}
y3 = yahoo('VIX3M')
lastc = max(c3); since = (date.fromisoformat(lastc) - timedelta(days=60)).isoformat()
r60 = [x for x in y3 if since <= x <= lastc and x in c3]
alld = [x for x in y3 if x in c3]
diff = [(abs(y3[x] - c3[x]), x) for x in alld if round(y3[x], 2) != round(c3[x], 2)]
OUT['yahoo_vix3m'] = {'60g_comuni': len(r60), '60g_uguali': sum(round(y3[x], 2) == round(c3[x], 2) for x in r60),
                      'storia_diversi': len(diff), 'max': max(diff) if diff else None}

# --- futures
def rows(path, old):
    lines = open(path).read().strip().splitlines()
    h = next(i for i, l in enumerate(lines) if l.startswith('Trade Date'))
    out = []
    for r in csv.reader(lines[h + 1:]):
        if not r or not r[0]:
            continue
        if old:
            m, dd_, y = r[0].split('/'); dt = f'{y}-{int(m):02d}-{int(dd_):02d}'
        else:
            dt = r[0]
        v = float(r[6])
        if dt < '2007-03-26':
            v /= 10
        out.append((dt, v))
    out.sort()
    return out

old = {}
for fn in os.listdir(os.path.join(C, 'vx_old')):
    rr = rows(os.path.join(C, 'vx_old', fn), True)
    old[rr[-1][0]] = dict(rr)
lst = json.load(open(os.path.join(C, 'vx_product_list.json')))
offm = sorted(r['expire_date'] for y in lst.values() for r in y if r['duration_type'] == 'M')
# archivio: scadenza = data dell'ultima riga. CDN: per i contratti non ancora scaduti l'ultima riga è l'ultima seduta, quindi
# la scadenza si prende dal nome del file e si controlla che per gli scaduti coincida con l'ultima riga
cdn2 = {}
for fn in os.listdir(os.path.join(C, 'vx')):
    e = fn[3:13]
    cdn2[e] = dict(rows(os.path.join(C, 'vx', fn), False))
EXP = sorted(set(cdn2) | set(old))
OUT['futures'] = {'scadenze': len(EXP), 'cdn_ultima_riga_uguale_al_nome_per_scaduti': sum(1 for e, v in cdn2.items() if e <= LAST and max(v) == e),
                  'cdn_scaduti': sum(1 for e in cdn2 if e <= LAST), 'elenco_uguale_ai_file': sorted(cdn2) == offm}

def settle(e, dt):
    a = cdn2.get(e, {}).get(dt)
    if a and a > 0:
        return a
    b = old.get(e, {}).get(dt)
    return b if b and b > 0 else None

RI = {x: fv[x] / f3[x] for x in sess if x in fv and x in f3 and fv[x] > 0 and f3[x] > 0}
RF, E1 = {}, {}
for x in sess:
    if x < '2007-12-04':
        continue
    i = bisect.bisect_right(EXP, x)
    if i + 1 >= len(EXP):
        continue
    a, b = settle(EXP[i], x), settle(EXP[i + 1], x)
    if a and b:
        RF[x] = a / b; E1[x] = EXP[i]
cal = [x for x in sess if x in RI and x in RF]
si = [RI[x] > 1 for x in cal]; sf = [RF[x] > 1 for x in cal]
ag = sum(a == b for a, b in zip(si, sf))
pos = {x: i for i, x in enumerate(sess)}
di, df = [], []
for k in range(1, len(cal)):
    if pos[cal[k]] - pos[cal[k - 1]] == 1:
        di.append(RI[cal[k]] - RI[cal[k - 1]]); df.append(RF[cal[k]] - RF[cal[k - 1]])

def ent(s_, mb=1):
    return [i for i in range(mb, len(s_)) if s_[i] and not any(s_[i - mb:i])]

def match(a, b):
    return sum(1 for i in a if any(abs(j - i) <= 2 for j in b))

ei, ef = ent(si), ent(sf)
runs, k = [], 0
while k < len(cal):
    if si[k] != sf[k]:
        j = k
        while j < len(cal) and si[j] != sf[j]:
            j += 1
        runs.append(j - k); k = j
    else:
        k += 1
rolls = [x for k_, x in enumerate(cal) if k_ and E1[x] != E1[cal[k_ - 1]]]
rj = []
for x in rolls:
    p = cal[cal.index(x) - 1]
    a, b = settle(E1[x], p), settle(E1[p], p)
    if a and b:
        rj.append(abs(a - b))
OUT['struttura'] = {'sedute': len(cal), 'dal': cal[0], 'al': cal[-1], 'uguali': ag, 'quota': round(ag / len(cal), 4),
                    'entrambi': sum(a and b for a, b in zip(si, sf)), 'solo_indici': sum(a and not b for a, b in zip(si, sf)), 'solo_futures': sum(b and not a for a, b in zip(si, sf)),
                    'corr_livelli': round(statistics.correlation([RI[x] for x in cal], [RF[x] for x in cal]), 4),
                    'corr_variazioni': round(statistics.correlation(di, df), 4), 'coppie': len(di),
                    'ingressi_indici': [len(ei), match(ei, ef)], 'ingressi_futures': [len(ef), match(ef, ei)],
                    'ingressi_filtrati_10': [len(ent(si, 10)), match(ent(si, 10), ent(sf, 10)), len(ent(sf, 10)), match(ent(sf, 10), ent(si, 10))],
                    'altro_in_backwardation_entro_2': [sum(1 for i in L_ if any(0 <= i + k < len(o_) and o_[i + k] for k in range(-2, 3))) for L_, o_ in ((ei, sf), (ef, si), (ent(si, 10), sf), (ent(sf, 10), si))],
                    'periodi_disaccordo': len(runs), 'almeno_5': sum(r >= 5 for r in runs), 'almeno_10': sum(r >= 10 for r in runs),
                    'scadenze': len(rolls), 'salto_roll_mediano': statistics.median(rj), 'salto_roll_max': max(rj)}

# --- credito
hy, baa, aaa = fred('BAMLH0A0HYM2'), fred('BAA10Y'), fred('AAA10Y')
hyg, ief = yahoo('HYG', True), yahoo('IEF', True)
hi = {x: -100 * math.log(hyg[x] / ief[x]) for x in hyg if x in ief}
W = [x for x in sess if x >= min(hy)]

def corr_k(a, b, cal_, k):
    xs, ys = [], []
    for i in range(k, len(cal_)):
        p, q = cal_[i - k], cal_[i]
        if p in a and q in a and p in b and q in b:
            xs.append(a[q] - a[p]); ys.append(b[q] - b[p])
    return round(statistics.correlation(xs, ys), 4), len(xs)

def corr_lv(a, b, cal_):
    c = [x for x in cal_ if x in a and x in b]
    return round(statistics.correlation([a[x] for x in c], [b[x] for x in c]), 4), len(c)

OUT['credito'] = {}
for name, m in [('BAA10Y', baa), ('AAA10Y', aaa), ('IG', fred('BAMLC0A0CM')), ('HYG/IEF', hi), ('Baa-Aaa', {x: baa[x] - aaa[x] for x in baa if x in aaa})]:
    OUT['credito'][name] = {'livelli': corr_lv(hy, m, W), 'v5': corr_k(hy, m, W, 5), 'v21': corr_k(hy, m, W, 21)}
L = [x for x in sess if x >= min(hi)]
OUT['credito']['BAA10Y_contro_HYG_IEF_dal_2007_v21'] = corr_k(hi, baa, L, 21)
for name, m in [('HY', hy), ('BAA10Y', baa)]:
    w = {x: v for x, v in m.items() if '2025-04-03' <= x <= '2025-05-30'}
    pk = max(w, key=w.get)
    OUT['credito'][f'aprile_2025_{name}'] = [m['2025-04-02'], w[pk], pk]
OUT['credito']['baa10y_sedute_mancanti_dal_1990'] = len([x for x in sess if '1990-01-02' <= x <= max(baa) and x not in baa])

# --- peso (codifica compatta rifatta qui)
def packpy(dates, val, ps):
    g = ''.join(
        '0123456789abcdefghijklmnopqrstuvwxyz'[(date.fromisoformat(dates[i]) - date.fromisoformat(dates[i - 1])).days]
        for i in range(1, len(dates)))
    cd, p = [], None
    for v in val:
        x = round(v * ps); cd.append(x if p is None else x - p); p = x
    return {'d0': dates[0], 'gaps': g, 'cd': cd, 'ps': ps, 'last': dates[-1]}

def kb(o):
    return round((len(json.dumps(o, separators=(',', ':'))) + 5) / 1024, 2)

v3 = [x for x in sess if x in f3]
b9 = [x for x in sess if x >= '1990-01-01' and x in baa]
OUT['peso_kb'] = {'VIX3M_ps10000': kb(packpy(v3, [f3[x] for x in v3], 10000)), 'VIX3M_ps100': kb(packpy(v3, [f3[x] for x in v3], 100)),
                  'BAA10Y_ps10000': kb(packpy(b9, [baa[x] for x in b9], 10000)), 'BAA10Y_ps100': kb(packpy(b9, [baa[x] for x in b9], 100))}

json.dump(OUT, open(os.path.join(H, 'ricontrollo.json'), 'w'), indent=1)
print(json.dumps(OUT, indent=1))
