# Audit 0.9.8: copia di ricerca/qa/audit-0.9.0/dati/c6_capeq.py (vista 7 Titoli: indici cap ed equal-weight simulati con
# la composizione d'epoca, contro data/sector_members.json e contro gli ETF SPDR XL* e Invesco RSP*), con i prezzi
# dall'endpoint chart (cache di common.py) al posto di spark. uso: python3 c9_capeq.py
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import series, W
R = os.environ.get('RRG', '/home/user/rrg') + '/data/'
def get(syms):
    out = {}
    for s in syms:
        y = series(s, '2y')
        if y and y['dates']:
            k = [i for i, d in enumerate(y['dates']) if d <= cal[-1]]
            out[s] = ([y['dates'][i] for i in k], [y['close'][i] for i in k])
    return out
SM = json.load(open(R + 'sector_members.json')); H = json.load(open(R + 'sp500_history.json'))
B = json.load(open(R + 'breadth.json')); cal = B['dates'][-300:]
cur = {m['s']: m for m in json.load(open(R + 'sp500_members.json'))['members']}
q = {x['s']: x['q'] for x in SM['stocks']}
# membership spans from change table (own parse): entry/exit dates within window
entry = {}; exitd = {}
for c in H['changes']:
    if c['add']: entry.setdefault(c['add'], c['date'])
    if c['rem']: exitd.setdefault(c['rem'], c['date'])
sec = {s: m['sector'] for s, m in cur.items()}
for s, f in H['former'].items(): sec.setdefault(s, f['sector'])
names = sorted(set(cur) | {s for s in exitd if s in H['former']})
px_raw = get([s.replace('.', '-') for s in names])
def align(s):
    d, c = px_raw.get(s.replace('.', '-'), ([], []))
    m = dict(zip(d, c)); out = []; v = None
    last = d[-1] if d else ''
    for x in cal:
        if x in m: v = m[x]
        out.append(None if (x > last or not d) else v)
    return out
PX = {s: align(s) for s in names}
def member(s, d):
    if s in cur:
        e = entry.get(s); return e is None or d >= e or (s in exitd and exitd[s] > e)
    e = exitd.get(s); a = entry.get(s)
    return e is not None and d < e and (a is None or a > e or d >= a)
# reset days
import datetime as dt
def third_fri(y, m):
    d = dt.date(y, m, 15); return d + dt.timedelta((4 - d.weekday()) % 7)
resets = {}
for y in (2025, 2026):
    for m in (3, 6, 9, 12):
        f = third_fri(y, m)
        if f.isoformat() < cal[10] or f.isoformat() > cal[-1]: continue
        eff = max(x for x in cal if x <= f.isoformat()); ref = max(x for x in cal if x <= (f - dt.timedelta(9)).isoformat())
        resets[eff] = ref
def sim(keys, t0, t1, exited_mode='app'):
    i0, i1 = cal.index(t0), cal.index(t1)
    # small weight rule for missing qty (to replicate) or exclusion
    lastp = lambda s: next(v for v in reversed(PX[s]) if v is not None)
    vals = sorted(q[s] * lastp(s) for s in keys if s in q and any(v is not None for v in PX[s]))
    small = 0.7 * vals[int(len(vals) * 0.2)]
    sh = {s: (q[s] if s in q else small / lastp(s)) for s in keys if any(v is not None for v in PX[s])}
    if exited_mode == 'exclude': sh = {s: v for s, v in sh.items() if s in q}
    # start EW at last reset before t0
    rs = max(r for r in resets if r < t0); ir = cal.index(rs)
    cw = {}; ew = {}; V = 1.0; C = 1.0; h = None
    for t in range(ir + 1, i1 + 1):
        d = cal[t]
        act = [s for s in sh if member(s, d) and PX[s][t - 1] is not None and PX[s][t] is not None]
        a = sum(sh[s] * PX[s][t] for s in act); b = sum(sh[s] * PX[s][t - 1] for s in act)
        C = C * a / b
        if h is None or cal[t - 1] == rs and t == ir + 1:
            k = cal.index(resets[rs]); inv = {s: 1 / (PX[s][k] or PX[s][t - 1]) for s in act}
            val = sum(inv[s] * PX[s][t - 1] for s in act); h = {s: inv[s] * V / val for s in act}
        elif cal[t - 1] in resets:
            k = cal.index(resets[cal[t - 1]]); inv = {s: 1 / (PX[s][k] or PX[s][t - 1]) for s in act}
            val = sum(inv[s] * PX[s][t - 1] for s in act); h = {s: inv[s] * V / val for s in act}
        elif set(act) != set(h):
            keep = [s for s in act if s in h]; new = [s for s in act if s not in h]
            wn = V / len(act); vk = sum(h[s] * PX[s][t - 1] for s in keep)
            sc = (V - len(new) * wn) / vk; h = {**{s: h[s] * sc for s in keep}, **{s: wn / PX[s][t - 1] for s in new}}
        V = sum(h[s] * PX[s][t] for s in h)
        cw[d] = C; ew[d] = V
    base = cal[i0]
    return 100 * (cw[t1] / cw[base] - 1), 100 * (ew[t1] / ew[base] - 1)
EQ = {'XLK': 'RSPT', 'XLC': 'RSPC', 'XLY': 'RSPD', 'XLP': 'RSPS', 'XLE': 'RSPG', 'XLF': 'RSPF', 'XLV': 'RSPH', 'XLI': 'RSPN', 'XLB': 'RSPM', 'XLRE': 'RSPR', 'XLU': 'RSPU', 'SPX': 'RSP'}
def etf_ret(sym, a, b, key='close'):
    y = series(sym, '2y'); m = dict(zip(y['dates'], y[key])); return 100 * (m[b] / m[a] - 1)
rows = []
for P, off in [('3M', 0), ('1M', 0), ('3M', 2)]:
    t1 = SM['dates'][off]; t0 = SM['starts'][P][off]
    print(f'== {P} {t0} -> {t1}')
    for k in list(EQ):
        keys = [s for s in names if k == 'SPX' or sec.get(s) == k]
        c, e = sim(keys, t0, t1); cx, ex = sim(keys, t0, t1, 'exclude')
        ac, ae = SM['sectors'][k][P][off]
        capetf = etf_ret('SPY' if k == 'SPX' else k, t0, t1); eqetf = etf_ret(EQ[k], t0, t1)
        rows.append(dict(P=P, t0=t0, t1=t1, k=k, app_cap=ac, own_cap=c, own_cap_excl=cx, app_eq=ae, own_eq=e, own_eq_excl=ex, etf_cap=capetf, etf_eq=eqetf))
        print(f"  {k:5} cap app {ac:6.1f} own {c:6.2f} (senza usciti {cx:6.2f}) ETF {capetf:6.2f} | eq app {ae:6.1f} own {e:6.2f} (senza usciti {ex:6.2f}) {EQ[k]} {eqetf:6.2f}")
json.dump(rows, open(W + 'c9_capeq.json', 'w'), indent=1)
