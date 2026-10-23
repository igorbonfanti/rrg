import sys, json, csv
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
R = '/home/user/rrg/data/'
F = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/fred/'
# 1 CPI vs FRED
M = json.load(open(R + 'prices_macro.json')); D = M['dates']
fr = {r['observation_date'][:7]: float(r['CPIAUCSL']) for r in csv.DictReader(open(F + 'CPIAUCSL.csv')) if r['CPIAUCSL'] not in ('', '.')}
mm = M['cpi']['months']; bad = [(k, v, fr.get(k)) for k, v in mm.items() if fr.get(k) is None or abs(fr[k] - v) > 1e-6]
print('CPI months mismatch vs FRED:', bad, '| FRED has 2025-10?', '2025-10' in fr, '| FRED months not in app since 2019:', [k for k in fr if k >= '2019-01' and k not in mm])
# CPI step series: value on date d = latest month whose release <= d
rel = M['cpi']['releases']; cpi = M['tickers']['CPI']['close']
errs = []
for i, d in enumerate(D):
    ms = [m for m in mm if rel.get(m) and rel[m] <= d]
    exp = mm[max(ms)] if ms else None
    if cpi[i] is not None and exp is not None and abs(cpi[i] - exp) > 1e-6: errs.append((d, cpi[i], exp))
    if cpi[i] is None and exp is not None: errs.append((d, None, exp))
print('CPI step errors:', len(errs), errs[:5], '| first CPI value date', next(d for d, v in zip(D, cpi) if v is not None), 'value', next(v for v in cpi if v is not None))
# 2 DXY_INV
y = series('DX-Y.NYB'); yd = list(zip(y['dates'], y['close']))
inv = M['tickers']['DXY_INV']['close']; e2 = []; import bisect
yds = [a for a, _ in yd]
for i, d in enumerate(D):
    j = bisect.bisect_right(yds, d) - 1
    exp = 10000 / yd[j][1]
    if inv[i] is None or abs(inv[i] / exp - 1) > 2e-5: e2.append((d, inv[i], round(exp, 4), yd[j][0]))
print('DXY_INV mismatches:', len(e2), e2[:5])
# 3 repeated consecutive closes (possible stale) in price files
for f in ['prices', 'prices_global', 'prices_macro']:
    P = json.load(open(R + f + '.json'))
    rep = {}
    for s, t in P['tickers'].items():
        if s in ('CPI',): continue
        c = t['close']; runs = 0
        for i in range(1, len(c)):
            if c[i] is not None and c[i] == c[i - 1]: runs += 1
        if runs: rep[s] = runs
    print(f, 'tickers with equal consecutive closes:', dict(sorted(rep.items(), key=lambda x: -x[1])[:12]))
# 4 breadth dates vs NYSE sessions (sectors.json dates from SPY)
B = json.load(open(R + 'breadth.json')); S = json.load(open(R + 'sectors.json'))
sd = [d for d in S['dates'] if d >= B['dates'][0]]
print('sessions without breadth:', sorted(set(sd) - set(B['dates']))[:20], '| breadth dates not in ETF calendar:', sorted(set(B['dates']) - set(sd))[:10])
# coverage n/members and zero n
def rl(r, n):
    out = [None] * n
    for j, (i0, v) in enumerate(r):
        i1 = r[j + 1][0] if j + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
L = len(B['dates'])
for k, s in B['series'].items():
    n = rl(s['n'], L); m = rl(s['members'], L)
    z = [B['dates'][i] for i in range(L) if not n[i]]
    low = [(B['dates'][i], n[i], m[i]) for i in range(L) if m[i] and n[i] / m[i] < 0.6]
    if z or low: print('breadth', k, 'n=0 dates', z[:5], len(z), 'coverage<60%', low[:3], len(low))
# 5 sectors.json repeated values
for t, a in S['adjclose'].items():
    r = sum(1 for i in range(1, len(a)) if a[i] is not None and a[i] == a[i - 1])
    if r > 20: print('sectors.json', t, 'equal consecutive', r)
