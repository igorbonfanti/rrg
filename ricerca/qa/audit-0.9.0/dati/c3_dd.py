import sys, json, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
from ixload import app_index
S = json.load(open('/home/user/rrg/data/sectors.json'))
D = S['dates']; at = S['max52At']; iA = D.index(at)
def own_dd(vals):
    v = np.array([np.nan if x is None else x for x in vals], float)
    dd = np.full(len(v), np.nan)
    for i in range(len(v)):
        if np.isnan(v[i]): continue
        w = v[max(0, i - 251):i + 1]; dd[i] = (v[i] / np.nanmax(w) - 1) * 100
    return dd
def own_pct(dd, i, minh=252):
    prev = dd[:i]; prev = prev[~np.isnan(prev)]
    if len(prev) < minh: return None
    return 100 * np.mean(prev > dd[i] + 1e-12)
rows = []
print(f"{'ETF':5} {'dd app':>8} {'dd own':>8} {'pct app':>7} {'pct own':>7} | prezzo: hi app/own  c app/own  dd app/own | adj mism | ffill")
from js_metrics import app_dd_pct
for t in S['adjclose']:
    a = S['adjclose'][t]
    y = series(t, 'p2004'); yd = dict(zip(y['dates'], y['adj'])); yc = dict(zip(y['dates'], y['close']))
    mism = sum(1 for d, x in zip(D, a) if x is not None and d in yd and abs(x - round(yd[d], 2)) > 0.011)
    ff = [d for d, x in zip(D, a) if x is not None and d not in yd]
    # own dd at max52At from Yahoo adj, on app calendar
    vals = [yd.get(d) for d in D[:iA + 1]]
    dd = own_dd(vals); pct = own_pct(dd, iA)
    add, apct = app_dd_pct(a[:iA + 1])
    m = S['max52'][t]
    win = D[iA - 251:iA + 1]
    cl = [(yc[d], d) for d in win if d in yc]; hi, hid = max(cl)
    own_pdd = (yc[at] / hi - 1) * 100; app_pdd = (m['c'] / m['hi'] - 1) * 100
    rows.append(dict(t=t, dd_app=add, dd_own=dd[iA], pct_app=apct, pct_own=pct, hi_app=m['hi'], hi_own=hi, hid_app=m['d'], hid_own=hid, c_app=m['c'], c_own=yc[at], pdd_app=app_pdd, pdd_own=own_pdd, mism=mism, ff=ff))
    print(f"{t:5} {add:8.2f} {dd[iA]:8.2f} {apct:7} {pct:7.1f} | {m['hi']:.2f}/{hi:.2f} {m['d']}/{hid} {m['c']:.2f}/{yc[at]:.2f} {app_pdd:6.2f}/{own_pdd:6.2f} | {mism} | {len(ff)} {ff[:3]}")
json.dump(rows, open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/c3_dd_sectors.json', 'w'), indent=1, default=float)
# indices: price-only close; dd & pct from 2000
print('\nIndici: dd52 e percentile (storia dal 2000)')
cfg = json.load(open('/home/user/rrg/config/indices.json'))['indices']
from ixload import px
for k in cfg:
    A = app_index(k)
    add, apct = app_dd_pct(A['close'])
    raw = px(A['symbol']); rd = dict(zip(*raw))
    vals = [rd.get(d) for d in A['dates']]
    miss = sum(v is None for v in vals)
    dd = own_dd([v if v is not None else c for v, c in zip(vals, A['close'])]); pct = own_pct(dd, len(dd) - 1)
    print(f"{k:9} {A['dates'][-1]} dd app {add:7.2f} own {dd[-1]:7.2f}  pct app {apct} own {pct:5.1f}  close app {A['close'][-1]} raw {round(vals[-1],2) if vals[-1] else None} missing-in-raw {miss}")
