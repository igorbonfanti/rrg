"""Ricalcolo indipendente (non importa i moduli dell'app) dei valori della vista 8 Emergenti.
Uso: python3 -I ricerca/qa/1.4.0/vista2/ricalcolo.py <cartella del sito> > atteso.json
Decodifica data/emerging.json, data/indices*.json e calcola, per ogni indice: ultima seduta, breadth, variazioni a 63 sedute
(locale e in dollari), stato della valuta (z, F), dollaro emergente (media 200, variazione 63, D), forza relativa (rrgNew settimanale).
Scrive anche, per date campione, i valori che il riquadro del grafico deve mostrare."""
import json, math, sys, datetime as dt
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
J = lambda p: json.load(open(f'{ROOT}/{p}'))
EM, CFG = J('data/emerging.json'), J('config/emerging.json')
IX = {**J('data/indices.json')['series'], **J('data/indices_more.json')['series']}
D = lambda s: dt.date.fromisoformat(s)

def dates_of(d0, gaps):
    out = [d0]; t = D(d0)
    for ch in gaps: t += dt.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out
def ddec(a, sc):
    p, out = None, []
    for r in a:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r; out.append(p / sc)
    return out
def rle(r, n):
    out = [None] * n
    for k, (i0, v) in enumerate(r):
        i1 = r[k + 1][0] if k + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
def index(k):
    x = IX[k]; ds = dates_of(x['d0'], x['gaps']); cl = ddec(x['cd'], x.get('ps', 100))
    a200 = ddec(x['d200'], 1); n = rle(x['n'], len(a200)); pct = [None] * len(ds)
    for i in range(len(a200)):
        j = x['b0'] + i
        if j < len(ds) and a200[i] is not None and n[i]: pct[j] = 100 * a200[i] / n[i]
    return ds, cl, pct
def ser(sym):
    s = EM['series'][sym]; return dates_of(s['d0'], s['gaps']), ddec(s['cd'], s.get('ps', 1)), s.get('fred')
def brk(ds):
    b = [0]
    for i in range(1, len(ds)): b.append(b[-1] + (1 if (D(ds[i]) - D(ds[i - 1])).days > 10 else 0))
    return b
def clean(sym, ds, v, fred):
    tight = sym.startswith(('CNY', 'HKD')); thr = .01 if tight else .03; back = .003 if tight else .01; bad = set()
    for i in range(1, len(v) - 1):
        if fred and ds[i] <= fred: continue
        r1, r2 = math.log(v[i] / v[i - 1]), math.log(v[i + 1] / v[i]); m = min(abs(r1), abs(r2))
        if abs(r1) > thr and abs(r2) > thr and (r1 > 0) != (r2 > 0) and (abs(r1 + r2) < back or (m > 5 * thr and abs(r1 + r2) < .25 * m)): bad.add(i)
    keep = [i for i in range(len(v)) if i not in bad]
    return [ds[i] for i in keep], [v[i] for i in keep], [ds[i] for i in sorted(bad)]
def fxsig(ds, v, w=63, look=126, N=756):
    n = len(v); b = brk(ds); ok = lambda i, k: i - k >= 0 and b[i] == b[i - k]
    lr = [math.log(v[i] / v[i - w]) if ok(i, w) else None for i in range(n)]
    sd = [None] * n; z = [None] * n; F = [None] * n
    for i in range(n):
        win = [lr[j] for j in range(max(0, i - N + 1), i + 1) if lr[j] is not None]
        if len(win) >= .9 * N and (D(ds[i]) - D(ds[max(0, i - N + 1)])).days <= 1278:
            m = sum(win) / len(win); sd[i] = math.sqrt(max(0, sum((x - m) ** 2 for x in win) / (len(win) - 1)))
        if sd[i] and lr[i] is not None: z[i] = lr[i] / sd[i]
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not ok(i, w - 1): continue
        zz = [z[k] for k in range(i - look + 1, i + 1) if z[k] is not None]
        if len(zz) < .9 * look: continue
        mx = max(v[i - w + 1:i + 1]); F[i] = 1 if any(q >= 1 for q in zz) and math.log(mx / v[i]) >= .5 * sd[i] else 0
    return z, F
def state(F, z): return None if F is None or z is None else 'ferma' if F else 'calo' if z >= 1 else 'normale'
def dollar(ds, v, ma=200, w=63):
    b = brk(ds); ok = lambda i, k: i - k >= 0 and b[i] == b[i - k]; n = len(v)
    sma = [sum(v[i - ma + 1:i + 1]) / ma if ok(i, ma - 1) else None for i in range(n)]
    ch = [(v[i] / v[i - w] - 1) * 100 if ok(i, w) else None for i in range(n)]
    Dd = [(1 if v[i] < sma[i] and v[i] < v[i - w] else 0) if ok(i, max(ma - 1, w)) else None for i in range(n)]
    return sma, ch, Dd
def ema(a, n):
    k = 2 / (n + 1); p = None; out = []
    for x in a:
        if x is None: out.append(None); continue
        p = x if p is None else p + k * (x - p); out.append(p)
    return out
def rrg(s, bm, short=10, long=30, mom=8, hl=26, sc=2.5):
    lr = [math.log(a / b) for a, b in zip(s, bm)]; lam = .5 ** (1 / hl); sig = [None] * len(lr); v2 = None; cnt = 0
    for i in range(1, len(lr)):
        r = lr[i] - lr[i - 1]; v2 = r * r if v2 is None else lam * v2 + (1 - lam) * r * r; cnt += 1
        if cnt >= hl: sig[i] = math.sqrt(v2)
    es, el = ema(lr, short), ema(lr, long); kk = math.sqrt((long - short) / 2)
    X = [None if i < long or not sig[i] else (es[i] - el[i]) / (sig[i] * kk) for i in range(len(lr))]
    eX = ema(X, mom)
    return [None if x is None else 100 + sc * x for x in X], [None if x is None or eX[i] is None else 100 + sc * math.sqrt(mom) * (x - eX[i]) for i, x in enumerate(X)]
def rs(etf, bench='ACWI'):
    de, ve, _ = ser(etf); db, vb, _ = ser(bench); m = dict(zip(db, vb))
    ds = [d for d in de if d in m]; a = [v for d, v in zip(de, ve) if d in m]; b = [m[d] for d in ds]
    wk = {}
    for i, d in enumerate(ds): wk[(D(d) - dt.date(1970, 1, 1)).days // 7 if False else ((D(d) - dt.date(1970, 1, 1)).days + 4) // 7] = i
    wi = sorted(wk.values()); x, y = rrg([a[i] for i in wi], [b[i] for i in wi])
    q = lambda X, Y: ('Leading' if Y >= 100 else 'Weakening') if X >= 100 else ('Improving' if Y >= 100 else 'Lagging')
    return {'last': ds[wi[-1]], 'ratio': x[-1], 'mom': y[-1], 'quad': q(x[-1], y[-1]), 'trail': [[x[k], y[k], ds[wi[k]]] for k in range(len(wi) - 10, len(wi))]}
def chg(a, h, t=None):
    t = len(a) - 1 if t is None else t
    while t >= 0 and a[t] is None: t -= 1
    return (a[t] / a[t - h] - 1) * 100 if t - h >= 0 and a[t] is not None and a[t - h] is not None else None

out = {'asOf': EM['asOf'], 'indici': {}}
dd, dv, _ = ser(CFG['fred']); sma, ch, Dd = dollar(dd, dv)
out['dollaro'] = {'data': dd[-1], 'valore': dv[-1], 'sma': sma[-1], 'ch63': ch[-1], 'D': Dd[-1]}
DL = dict(zip(dd, zip(dv, sma, Dd)))
for k in CFG['order']:
    c = CFG['indices'][k]; ds, cl, pct = index(k); o = {'ultima': ds[-1], 'close': cl[-1], 'b': pct[-1], 'ch63': chg(cl, 63)}
    fxm = None
    if c['fx']:
        fd, fv, fred = ser(c['fx']); cd, cv, removed = clean(c['fx'], fd, fv, fred); z, F = fxsig(cd, cv)
        o['fx'] = {'fred': fred, 'ultima': cd[-1], 'valore': cv[-1], 'z': z[-1], 'F': F[-1], 'stato': state(F[-1], z[-1]), 'tolte': removed}
        fxm = {d: (cv[i], z[i], F[i]) for i, d in enumerate(cd)}
        usd = [cl[i] / fxm[d][0] if cl[i] is not None and d in fxm else None for i, d in enumerate(ds)]
        t = len(cl) - 1; tl = t
        while t >= 0 and usd[t] is None: t -= 1
        o['ch63u'] = {'v': chg(usd, 63, t), 'data': ds[t], 'lag': t < tl}
        # bande del cambio nel periodo 3A: primi e ultimi giorni di ogni tratto
        o['fx']['tratti_ferma'] = []; o['fx']['tratti_calo'] = []
        for nm, test in (('tratti_ferma', lambda i: F[i] == 1), ('tratti_calo', lambda i: z[i] is not None and z[i] >= 1 and F[i] == 0)):
            s = None
            for i, d in enumerate(cd):
                if test(i):
                    if s is None: s = d
                    p = d
                elif s is not None: o['fx'][nm].append([s, p]); s = None
            if s is not None: o['fx'][nm].append([s, p])
    else:
        o['ch63u'] = {'v': o['ch63'], 'data': ds[-1], 'lag': False}
    o['rs'] = rs(c['etf'])
    # valori del riquadro per alcune date: l'ultima seduta, la seduta 63 prima, e 4 date sparse nel periodo 3A
    samp = {}
    for i in sorted(set([len(ds) - 1, len(ds) - 2, len(ds) - 4, len(ds) - 64, len(ds) - 300, len(ds) - 600])):
        d = ds[i]; f = fxm.get(d) if fxm else None; dl = DL.get(d)
        samp[d] = {'prezzo': cl[i], 'pct200': pct[i], 'fx': f[0] if f else None, 'fxStato': state(f[2], f[1]) if f else None, 'dl': dl[0] if dl else None}
    o['campioni'] = samp
    out['indici'][k] = o
print(json.dumps(out, indent=1, default=str))

# con un secondo argomento: serie complete sul calendario dell'indice (per i controlli del grafico nel browser)
if len(sys.argv) > 2:
    full = {}
    for k in CFG['order']:
        c = CFG['indices'][k]; ds, cl, pct = index(k); fxv = fxs = None; fxd = None
        if c['fx']:
            fd, fv, fred = ser(c['fx']); cd, cv, _ = clean(c['fx'], fd, fv, fred); z, F = fxsig(cd, cv); m = {d: i for i, d in enumerate(cd)}
            fxv = [cv[m[d]] if d in m else None for d in ds]; fxs = [state(F[m[d]], z[m[d]]) if d in m else None for d in ds]
            fxd = {'dates': cd, 'calo': [1 if z[i] is not None and z[i] >= 1 and F[i] == 0 else 0 for i in range(len(cd))], 'ferma': [1 if F[i] == 1 else 0 for i in range(len(cd))], 'val': cv, 'fred': fred}
        full[k] = {'dates': ds, 'close': cl, 'pct200': pct, 'fx': fxv, 'fxState': fxs, 'dl': [DL[d][0] if d in DL else None for d in ds], 'fxSeries': fxd}
    full['_dollar'] = {'dates': dd, 'val': dv, 'sma': sma, 'D': Dd}
    json.dump(full, open(sys.argv[2], 'w'))
