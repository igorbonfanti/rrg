"""Ricalcolo indipendente (Python, nessun codice dell'app) dei valori disegnati nella vista 8 VIX.
Uso: python3 -I riferimento.py <data/vix.json> <out.json>
Decodifica: date = d0 + giorni in base 36 (gaps); valori = somma cumulata delle differenze 'cd' / ps (dopo null si riparte).
"""
import json, sys, math, datetime as dt, bisect
src, out = sys.argv[1], sys.argv[2]
D = json.load(open(src))
def dec(x):
    t = dt.date.fromisoformat(x['d0']); ds = [t.isoformat()]
    for ch in x['gaps']:
        t = t + dt.timedelta(days=int(ch, 36)); ds.append(t.isoformat())
    ps = x.get('ps', 1); vals = []; p = None
    for r in x['cd']:
        if r is None: p = None; vals.append(None); continue
        p = r if p is None else p + r; vals.append(p / ps)
    assert len(ds) == len(vals), (len(ds), len(vals))
    return ds, vals
vd, vv = dec(D['series']['VIX']); vm = dict(zip(vd, vv))
res = {}
for k in ['SPX', 'NDX']:
    ds, cl = dec(D['series'][k])
    vix = [vm.get(d) for d in ds]
    n = len(ds)
    # episodi a 30 (63 sedute con VIX < 30 prima, contate sulle sedute con VIX)
    pos = [i for i, v in enumerate(vix) if v is not None]
    starts = []
    for j in range(63, len(pos)):
        if vix[pos[j]] < 30: continue
        if all(vix[pos[k2]] < 30 for k2 in range(j-63, j)): starts.append(pos[j])
    pts = []
    for p, v in enumerate(vix):
        if v is None or v < 30: continue
        if p + 1 + 252 >= n: continue
        ep = max([s for s in starts if s <= p], default=None)
        pts.append({'date': ds[p], 'vix': v, 'ret': (cl[p+253]/cl[p+1]-1)*100, 'ep': ds[ep] if ep is not None else None, 'start': ep == p})
    openn = sum(1 for p, v in enumerate(vix) if v is not None and v >= 30 and p + 253 >= n)
    res[k] = {'pts': pts, 'eps': [ds[s] for s in starts], 'open': openn}
    if k == 'SPX':
        rv = [None]*n
        for t in range(21, n):
            rs = [math.log(cl[q]/cl[q-1]) for q in range(t-20, t+1)]
            m = sum(rs)/21; var = sum((r-m)**2 for r in rs)/20
            rv[t] = math.sqrt(var)*math.sqrt(252)*100
        prem = [ (vix[i]-rv[i]) if vix[i] is not None and rv[i] is not None else None for i in range(n)]
        seen = []; pp = [None]*n
        for i, x in enumerate(prem):
            if x is None: continue
            bisect.insort(seen, x); pp[i] = 100*bisect.bisect_right(seen, x)/len(seen)
        res['chart'] = {'dates': ds, 'close': cl, 'vix': vix, 'rv': rv, 'prem': prem, 'pp': pp}
json.dump(res, open(out, 'w'))
c = res['chart']
print('SPX pts', len(res['SPX']['pts']), 'eps', len(res['SPX']['eps']), 'open', res['SPX']['open'], 'NDX pts', len(res['NDX']['pts']))
print('ultimo', c['dates'][-1], c['vix'][-1], round(c['rv'][-1],2), round(c['prem'][-1],2), round(c['pp'][-1],1))
print('ep null', sum(1 for p in res['SPX']['pts'] if p['ep'] is None))
for k in ['SPX','NDX']:
    P=res[k]['pts']; print(k,'vix range',min(p['vix'] for p in P),max(p['vix'] for p in P),'ret range',round(min(p['ret'] for p in P),2),round(max(p['ret'] for p in P),2))
prem=[x for x in c['prem'] if x is not None]; print('prem range MAX', round(min(prem),2), round(max(prem),2))

# ---- tabelle: episodi per soglia e statistiche (stesse definizioni scritte in js/vix.js, ricalcolate qui) ----
def q7(a, q):
    v = sorted(x for x in a if x is not None)
    if not v: return None
    h = (len(v)-1)*q; lo = math.floor(h)
    return v[lo] + (h-lo)*(v[lo+1]-v[lo]) if lo+1 < len(v) else v[lo]
HS = [21, 63, 126, 252]
tab = {}
for k in ['SPX', 'NDX']:
    ds, cl = dec(D['series'][k]); n = len(ds)
    vix = [vm.get(d) for d in ds]
    pos = [i for i, v in enumerate(vix) if v is not None]; vv2 = [vix[i] for i in pos]
    def outc(p):
        e = p+1; o = {'ret': {h: ((cl[e+h]/cl[e]-1)*100 if e+h < n else None) for h in HS}, 'partial': e+252 >= n}
        if e >= n: o['dd'] = None; o['toMin'] = None; return o
        end = min(n-1, e+252); mn = cl[e]; at = e
        for q in range(e+1, end+1):
            if cl[q] < mn: mn = cl[q]; at = q
        o['dd'] = min(0, (mn/cl[e]-1)*100); o['toMin'] = at-e; return o
    T = {}
    frm = ds[pos[0]]
    psx = [i for i in range(n) if ds[i] >= frm]
    base = {}
    for h in HS:
        r = [(cl[p+1+h]/cl[p+1]-1)*100 for p in psx if p+1+h < n]
        base[h] = {'pos': 100*sum(1 for x in r if x > 0)/len(r), 'median': q7(r, .5)}
    base['dd'] = q7([outc(p)['dd'] for p in psx if p+253 < n], .5)
    for X in [20, 25, 30, 40, 50]:
        st = [j for j in range(63, len(vv2)) if vv2[j] >= X and all(vv2[q] < X for q in range(j-63, j))]
        eps = []
        for e_, j in enumerate(st):
            stop = st[e_+1] if e_+1 < len(st) else len(vv2)
            mx = max(vv2[q] for q in range(j, stop) if vv2[q] >= X)
            p = pos[j]; o = outc(p)
            eps.append({'date': ds[p], 'vix': vv2[j], 'vixMax': mx, **o})
        full = [e for e in eps if not e['partial']]
        stats = {h: {'n': sum(1 for e in eps if e['ret'][h] is not None), 'posN': sum(1 for e in eps if e['ret'][h] is not None and e['ret'][h] > 0), 'median': q7([e['ret'][h] for e in eps], .5)} for h in HS}
        stats['dd'] = q7([e['dd'] for e in full], .5); stats['toMin'] = q7([e['toMin'] for e in full], .5)
        T[X] = {'eps': eps, 'stats': stats}
    tab[k] = {'base': base, 'thr': T, 'from': frm}
res['tab'] = tab
json.dump(res, open(out, 'w'))
print('tabelle', {k: {X: len(tab[k]['thr'][X]['eps']) for X in tab[k]['thr']} for k in tab})
