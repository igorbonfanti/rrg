# Independent SPX + sector breadth from jb probe at chosen dates
import sys, json, re, csv, io, subprocess
import pandas as pd, numpy as np
JB = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/data-probe/jb/'
REPO = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/sp500repo'
OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/'
DATES = sys.argv[1:] or ['2008-11-20', '2020-03-23', '2022-10-12', '2025-04-08', '2026-09-22']
SEC = {'Information Technology': 'XLK', 'Communication Services': 'XLC', 'Telecommunication Services': 'XLC', 'Consumer Discretionary': 'XLY',
       'Consumer Staples': 'XLP', 'Energy': 'XLE', 'Financials': 'XLF', 'Health Care': 'XLV', 'Industrials': 'XLI', 'Materials': 'XLB',
       'Real Estate': 'XLRE', 'Utilities': 'XLU'}
MEDIA = {'Advertising', 'Broadcasting', 'Cable & Satellite', 'Movies & Entertainment', 'Publishing', 'Interactive Media & Services', 'Interactive Home Entertainment'}
iv = pd.read_parquet(JB + 'membership_intervals.parquet')
cur = {m['s'].replace('.', '-'): m['sector'] for m in json.load(open('/home/user/rrg/data/sp500_members.json'))['members']}
# snapshots
log = subprocess.run(['git', '-C', REPO, 'log', '--format=%H %ad', '--date=short', '--', 'data/constituents.csv'], capture_output=True, text=True).stdout.split('\n')
snaps = []
for line in filter(None, log):
    sha, d = line.split()
    raw = subprocess.run(['git', '-C', REPO, 'show', f'{sha}:data/constituents.csv'], capture_output=True, text=True).stdout
    rows = {}
    for r in csv.DictReader(io.StringIO(raw)):
        s = (r.get('Symbol') or '').strip().replace('.', '-').upper()
        if s: rows[s] = (r.get('GICS Sector') or r.get('Sector') or '', r.get('GICS Sub-Industry') or r.get('GICS Sub Industry') or '')
    snaps.append((d, rows))
snaps.sort(key=lambda x: x[0])
ren = {}
for r in csv.DictReader(open(JB + 'renames.csv')): ren.setdefault(r['new'], []).append(r['old'])
def sector(t, end):
    base = re.sub(r'-\d{6}$', '', t)
    if pd.isna(end) and base in cur: return cur[base]
    lim = str(end)[:10] if not pd.isna(end) else '9999'
    for d, rows in reversed(snaps):
        if d > lim: continue
        for c in [base] + ren.get(base, []):
            if c in rows:
                sec, sub = rows[c]
                if sub in MEDIA: return 'XLC'
                if sec == 'Financials' and ('REIT' in sub or 'Real Estate' in sub): return 'XLRE'
                return SEC.get(sec)
    return None
secmap = {}
for t, e in iv.groupby('ticker')['end'].max().items():
    secmap[t] = sector(t, iv[iv.ticker == t]['end'].iloc[-1])
px = pd.read_parquet(JB + 'prices.parquet', columns=['date', 'ticker', 'close'])
px = px[px.close > 0].sort_values(['ticker', 'date'])
res = {}
for D in DATES:
    d = pd.Timestamp(D)
    m = iv[(iv.start <= d) & (iv.end.isna() | (iv.end > d))].ticker.unique()
    sub = px[px.ticker.isin(m) & (px.date <= d)]
    acc = {}
    for t, g in sub.groupby('ticker'):
        c = g.close.values; has = g.date.values[-1] == np.datetime64(d)
        k = ['SPX'] + ([secmap[t]] if secmap.get(t) else [])
        f = [has and len(c) >= N and c[-1] > c[-N:].mean() for N in (20, 50, 200)]
        for kk in k:
            a = acc.setdefault(kk, [0, 0, 0, 0, 0]); a[1] += int(has); a[2] += int(f[0]); a[3] += int(f[1]); a[4] += int(f[2])
    for t in m:
        k = ['SPX'] + ([secmap[t]] if secmap.get(t) else [])
        for kk in k: acc.setdefault(kk, [0, 0, 0, 0, 0])[0] += 1
    res[D] = acc
json.dump(res, open(OUT + 'c2_spx_own.json', 'w'), default=int)
B = json.load(open('/home/user/rrg/data/breadth.json'))
def rl(r, n):
    out = [None] * n
    for j, (i0, v) in enumerate(r):
        i1 = r[j + 1][0] if j + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
L = len(B['dates'])
for D in DATES:
    i = B['dates'].index(D)
    print('==', D)
    for k in ['SPX', 'XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU']:
        s = B['series'][k]; n = rl(s['n'], L)[i]; mem = rl(s['members'], L)[i]
        o = res[D].get(k, [0] * 5)
        pa = [100 * s[x][i] / n for x in ('a20', 'a50', 'a200')]; po = [100 * o[j] / o[1] if o[1] else 0 for j in (2, 3, 4)]
        print(f"  {k:5} app {s['a200'][i]:3}/{n:3}({mem}) 200:{pa[2]:5.1f} 50:{pa[1]:5.1f} 20:{pa[0]:5.1f} | own {o[4]:3}/{o[1]:3}({o[0]}) 200:{po[2]:5.1f} 50:{po[1]:5.1f} 20:{po[0]:5.1f} | Δ200 {pa[2]-po[2]:+.1f}")
