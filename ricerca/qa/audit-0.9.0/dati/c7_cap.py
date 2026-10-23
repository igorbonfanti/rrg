import sys, json, datetime as dt, bisect
import pandas as pd, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from ixload import px as ixpx, R
JB = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/data-probe/jb/'
C = json.load(open(R + 'data/capitulation.json'))['series']
def app_counts(k, d):
    x = C[k]; dates = [x['d0']]
    for ch in x['gaps']: dates.append((dt.date.fromisoformat(dates[-1]) + dt.timedelta(days=int(ch, 36))).isoformat())
    def dec(s):
        out = []; i = 0
        while i < len(s):
            ch = s[i]
            if ch == '-': out.append(None)
            elif ch == 'z': out.append(int(s[i + 1:i + 4], 36)); i += 3
            else: out.append(int(ch, 36))
            i += 1
        return out
    i = dates.index(d)
    nn = None
    for i0, v in x['n']:
        if i0 <= i: nn = v
    return dict(n=nn, x5=dec(x['x5'])[i], x7=dec(x['x7'])[i], x10=dec(x['x10'])[i])
def tally(rets, nexts):
    v = [r for r in rets if r is not None]
    med = float(np.median(v)); calm = abs(med) < 0.02
    raw = {t: sum(1 for r in v if r <= -t / 100 + 1e-9) for t in (5, 7, 10)}
    out = {5: 0, 7: 0, 10: 0}
    for r, nx in zip(rets, nexts):
        if r is None or r > -0.05 + 1e-9: continue
        if calm and nx is not None and nx >= (1 / (1 + r) - 1) * 0.9: continue
        if r <= -0.6 and med > -0.05: continue
        for t in (5, 7, 10):
            if r <= -t / 100 + 1e-9: out[t] += 1
    return dict(n=len(v), x5=out[5], x7=out[7], x10=out[10], raw=raw, med=round(med * 100, 2))
res = []
# SPX from jb
iv = pd.read_parquet(JB + 'membership_intervals.parquet')
P = pd.read_parquet(JB + 'prices.parquet', columns=['date', 'ticker', 'close', 'adj_close'])
for D in ['2008-10-10', '2020-03-16', '2025-04-04', '2008-10-15', '2020-03-12']:
    d = pd.Timestamp(D)
    mem = iv[(iv.start <= d) & (iv.end.isna() | (iv.end > d))].ticker.unique()
    sub = P[P.ticker.isin(mem) & (P.date <= d + pd.Timedelta(days=10)) & (P.date >= d - pd.Timedelta(days=15))].sort_values(['ticker', 'date'])
    rets, nexts = [], []
    for t, g in sub.groupby('ticker'):
        g = g.reset_index(drop=True); w = g.index[g.date == d]
        if not len(w) or w[0] == 0: continue
        i = w[0]
        if (g.date[i] - g.date[i - 1]).days > 7: continue
        rc = g.close[i] / g.close[i - 1] - 1; ra = g.adj_close[i] / g.adj_close[i - 1] - 1
        r = ra if abs(rc - ra) > 0.05 else rc
        nx = None
        if i + 1 < len(g) and (g.date[i + 1] - g.date[i]).days <= 7:
            e = iv[iv.ticker == t]; dn = g.date[i + 1]
            if ((e.start <= dn) & (e.end.isna() | (e.end > dn))).any():
                rn = g.close[i + 1] / g.close[i] - 1; ran = g.adj_close[i + 1] / g.adj_close[i] - 1
                nx = ran if abs(rn - ran) > 0.05 else rn
        rets.append(r); nexts.append(nx)
    o = tally(rets, nexts); a = app_counts('SPX', D)
    res.append(dict(k='SPX', d=D, app=a, own=o)); print('SPX', D, 'app', a, 'own', o)
# indices from ixcache, current members, own previous bar within 7 days, index calendar
def idx_dates(k):
    for f in ('indices.json', 'indices_more.json'):
        s = json.load(open(R + 'data/' + f))['series']
        if k in s:
            x = s[k]; ds = [x['d0']]
            for ch in x['gaps']: ds.append((dt.date.fromisoformat(ds[-1]) + dt.timedelta(days=int(ch, 36))).isoformat())
            return ds
for k, ds in [('DAX', ['2020-03-12', '2025-04-07', '2008-10-06']), ('N225', ['2025-04-07', '2020-03-13', '2024-08-05']), ('CAC', ['2020-03-12']), ('FTSEMIB', ['2020-03-12'])]:
    cal = idx_dates(k); mem = json.load(open(R + f'data/index_members/{k}.json'))['tickers']
    for D in ds:
        j = cal.index(D); Dn = cal[j + 1]
        def ret_on(dates, close, day):
            i = bisect.bisect_left(dates, day)
            if i >= len(dates) or dates[i] != day or i == 0: return None
            if (dt.date.fromisoformat(dates[i]) - dt.date.fromisoformat(dates[i - 1])).days > 7: return None
            return close[i] / close[i - 1] - 1
        rets, nexts = [], []
        for s in mem:
            p = ixpx(s)
            if not p or not p[0]: continue
            r = ret_on(p[0], p[1], D)
            if r is None: continue
            rets.append(r); nexts.append(ret_on(p[0], p[1], Dn))
        o = tally(rets, nexts); a = app_counts(k, D)
        res.append(dict(k=k, d=D, app=a, own=o)); print(k, D, 'app', a, 'own', o)
json.dump(res, open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/c7_cap.json', 'w'), indent=1, default=int)
