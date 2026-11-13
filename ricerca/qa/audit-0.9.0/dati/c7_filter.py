# how many real >=5/7% drops does the "misprint" filter remove in SPX history (jb, pit)
import pandas as pd, numpy as np, json
JB = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/data-probe/jb/'
px = pd.read_parquet(JB + 'prices.parquet', columns=['date', 'ticker', 'close', 'adj_close'])
px = px[px.date >= '2004-12-01']
Cc = px.pivot(index='date', columns='ticker', values='close'); A = px.pivot(index='date', columns='ticker', values='adj_close')
rc, ra = Cc.pct_change(fill_method=None), A.pct_change(fill_method=None)
Rr = rc.where(~((rc - ra).abs() > 0.05), ra)
B = json.load(open('/home/user/rrg/data/breadth.json')); cal = pd.to_datetime(B['dates'])
cal = cal[cal <= '2026-09-18']
Rr = Rr.reindex(cal)
iv = pd.read_parquet(JB + 'membership_intervals.parquet')
M = pd.DataFrame(False, index=cal, columns=Rr.columns)
for t, s, e in iv[['ticker', 'start', 'end']].itertuples(index=False):
    if t in M.columns:
        m = cal >= s
        if not pd.isna(e): m &= cal < e
        M.loc[m, t] = True
R = Rr.where(M); nxt = R.shift(-1); med = R.median(axis=1)
calm = med.abs() < 0.02
for thr in (5, 7):
    drop = R <= -thr / 100 + 1e-9
    rec = nxt >= (1 / (1 + R) - 1) * 0.9
    removed = (drop & rec & calm.values[:, None]).sum(axis=1)
    tot = drop.sum(axis=1)
    top = removed.sort_values(ascending=False).head(12)
    print(f'-{thr}%: sessions with >=3 removed: {(removed >= 3).sum()}, >=10: {(removed >= 10).sum()}, total removed {removed.sum()} of {tot.sum()} drops')
    print('   ', [(d.strftime('%Y-%m-%d'), int(removed[d]), int(tot[d]), round(med[d] * 100, 2)) for d in top.index])
