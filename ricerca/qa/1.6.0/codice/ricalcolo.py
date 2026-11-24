# Ricalcolo indipendente (senza i moduli dell'app) di R, percentile di R, distanza dal massimo di 252 osservazioni,
# variazione a 21 osservazioni e percentile del calo, su un data/vix.json; confronto con context() di js/vix.js.
# Uso: python3 -I ricalcolo.py <vix.json> <confronto.json prodotto da ricalcolo_app.mjs>
import json, sys, bisect, datetime
d = json.load(open(sys.argv[1])); app = json.load(open(sys.argv[2]))
def dates_of(x):
    # decodeDates: gaps è una stringa di cifre/lettere, ognuna il salto in giorni dalla data precedente (decodifica qui sotto)
    out = [x['d0']]; t = datetime.date.fromisoformat(x['d0'])
    for ch in x['gaps']:
        t = t + datetime.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out
def vals_of(x):
    s = 0; out = []
    for c in x['cd']: s += c; out.append(s / x.get('ps', 1))
    return out
S = {k: dict(zip(dates_of(v), vals_of(v))) for k, v in d['series'].items()}
spx = sorted(S['SPX']); vix = S['VIX']; v3 = S.get('VIX3M', {}); cr = S.get('HYGIEF', {})
R = [vix[t] / v3[t] if t in vix and t in v3 and v3[t] > 0 else None for t in spx]
C = [cr.get(t) for t in spx]
def expanding(a, minN=252):
    seen = []; out = []
    for x in a:
        if x is None: out.append(None); continue
        bisect.insort(seen, x); k = bisect.bisect_right(seen, x)
        out.append(100 * k / len(seen) if len(seen) >= minN else None)
    return out
valid = [(i, x) for i, x in enumerate(C) if x is not None]
dd = [None] * len(C); ch = [None] * len(C)
for j, (i, x) in enumerate(valid):
    if j >= 251: dd[i] = (x / max(v for _, v in valid[j - 251:j + 1]) - 1) * 100
    if j >= 21: ch[i] = (x / valid[j - 21][1] - 1) * 100
rp = expanding(R); dp = expanding([None if x is None else -x for x in dd])
bad = 0; n = 0
for k, mine in [('r', R), ('rPct', rp), ('dd', dd), ('ch', ch), ('ddPct', dp)]:
    a = app[k]
    for i in range(len(spx)):
        n += 1
        if (mine[i] is None) != (a[i] is None) or (mine[i] is not None and abs(mine[i] - a[i]) > 1e-9):
            bad += 1
            if bad < 6: print('diverso', k, spx[i], mine[i], a[i])
print(f'confronti {n}, differenze {bad}; oggi R {R[-1]} rPct {rp[-1]} dd {dd[-1]} ch {ch[-1]} ddPct {dp[-1]}')
