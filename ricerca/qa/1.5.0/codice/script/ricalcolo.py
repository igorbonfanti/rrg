# Ricalcolo indipendente (Python, scritto dalle definizioni, non dal codice JS) di regimi, scatter, realizzata, percentili
import json, sys, math, datetime as dt
src = json.load(open(sys.argv[1]))
def ser(x):
    d = dt.date.fromisoformat(x['d0']); ds = [d.isoformat()]
    for ch in x['gaps']:
        d = d + dt.timedelta(days=int(ch, 36)); ds.append(d.isoformat())
    vals = []; p = None
    for r in x['cd']:
        p = r if p is None else p + r; vals.append(p / x.get('ps', 1))
    assert len(ds) == len(vals)
    return ds, vals
vd, vv = ser(src['series']['VIX']); vm = dict(zip(vd, vv))
def q7(a, q):
    a = sorted(a)
    if not a: return None
    h = (len(a) - 1) * q; lo = math.floor(h)
    return a[lo] + (h - lo) * (a[lo + 1] - a[lo]) if lo + 1 < len(a) else a[lo]
out = {}
for k in ['SPX', 'NDX']:
    D, C = ser(src['series'][k]); n = len(C)
    V = [vm.get(d) for d in D]
    def oc(p):
        e = p + 1; r = {h: (C[e+h]/C[e]-1)*100 if e+h < n else None for h in (21,63,126,252)}
        if e >= n: return r, None, None, True
        end = min(n-1, e+252); w = C[e:end+1]; mn = min(w); at = w.index(mn)
        return r, min(0, (mn/C[e]-1)*100), at, e+252 >= n
    pos = [i for i, v in enumerate(V) if v is not None]
    res = {}
    for X in (20,25,30,40,50):
        starts = [j for j in range(63, len(pos)) if V[pos[j]] >= X and all(V[pos[i]] < X for i in range(j-63, j))]
        eps = []; det = []
        for z, j in enumerate(starts):
            r, dd, tm, part = oc(pos[j]); eps.append((D[pos[j]], r, dd, tm, part))
            stop = starts[z+1] if z+1 < len(starts) else len(pos)
            inn = [i for i in range(j, stop) if V[pos[i]] >= X]
            det.append([D[pos[j]], V[pos[j]], max(V[pos[i]] for i in inn), D[pos[inn[-1]]], dd, tm, part, [r[h] for h in (21,63,126,252)]])
        st = {'n_eps': len(eps)}
        for h in (21,63,126,252):
            a = [e[1][h] for e in eps if e[1][h] is not None]
            st[h] = [len(a), sum(1 for x in a if x > 0), q7(a, .5), q7(a, .1)]
        full = [e for e in eps if not e[4]]
        st['dd'] = [len(full), q7([e[2] for e in full], .5), min([e[2] for e in full]) if full else None]
        st['toMin'] = q7([e[3] for e in full], .5)
        st['dates'] = [e[0] for e in eps]; st['det'] = det
        res[X] = st
    f = next(i for i, v in enumerate(V) if v is not None)
    base = {}
    for h in (21,63,126,252):
        a = [(C[p+1+h]/C[p+1]-1)*100 for p in range(f, n) if p+1+h < n]
        base[h] = [len(a), sum(1 for x in a if x > 0), q7(a, .5), q7(a, .1)]
    base['dd'] = q7([oc(p)[1] for p in range(f, n) if p+1+252 < n], .5)
    pts = [(D[p], (C[p+253]/C[p+1]-1)*100) for p in range(n) if V[p] is not None and V[p] >= 30 and p+253 < n]
    opn = sum(1 for p in range(n) if V[p] is not None and V[p] >= 30 and p+253 >= n)
    # realizzata e percentili
    lr = [None] + [math.log(C[i]/C[i-1]) for i in range(1, n)]
    rv = [None]*n
    for t in range(21, n):
        w = lr[t-20:t+1]; m = sum(w)/21; rv[t] = math.sqrt(sum((x-m)**2 for x in w)/20)*math.sqrt(252)*100
    prem = [V[i]-rv[i] if V[i] is not None and rv[i] is not None else None for i in range(n)]
    import bisect
    def epct(a):
        s = []; o = [None]*len(a)
        for i, x in enumerate(a):
            if x is None: continue
            bisect.insort(s, x); o[i] = 100*bisect.bisect_right(s, x)/len(s)
        return o
    vp, pp = epct(V), epct(prem)
    t = max(i for i, v in enumerate(V) if v is not None)
    out[k] = {'thr': res, 'base': base, 'scatter': [len(pts), sum(1 for p in pts if p[1] > 0), opn],
              'today': [D[t], V[t], vp[t], rv[t], prem[t], pp[t]],
              'rv_samples': {d: rv[D.index(d)] for d in ['2020-03-16', '2008-10-24', D[-1]] if d in D},
              'vp_samples': {d: vp[D.index(d)] for d in ['2020-03-16', '2008-10-24'] if d in D},
              'pp_samples': {d: pp[D.index(d)] for d in ['2020-03-16', '2008-10-24'] if d in D}}
json.dump(out, open(sys.argv[2], 'w'))
print('ok')
