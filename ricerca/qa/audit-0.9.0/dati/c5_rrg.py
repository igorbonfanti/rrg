import sys, json, math, subprocess
import pandas as pd, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
def yser(s):
    y = series(s); return pd.Series(y['adj'], index=pd.to_datetime(y['dates']))
def ema_pd(x, n):  # adjust=False recursive EMA seeded with first value
    return x.ewm(span=n, adjust=False).mean()
def rrg_new(p, b):
    lr = np.log(p / b)
    r = lr.diff()
    lam = 0.5 ** (1 / 26)
    v2 = np.nan; sig = []; cnt = 0
    for x in r.values:
        if np.isnan(x): sig.append(np.nan); continue
        v2 = x * x if np.isnan(v2) else lam * v2 + (1 - lam) * x * x
        cnt += 1; sig.append(math.sqrt(v2) if cnt >= 26 else np.nan)
    sig = pd.Series(sig, index=lr.index)
    X = (ema_pd(lr, 10) - ema_pd(lr, 30)) / (sig * math.sqrt(10))
    X[np.arange(len(X)) < 30] = np.nan
    eX = X.dropna().ewm(span=8, adjust=False).mean().reindex(X.index)
    return 100 + 2.5 * X, 100 + 2.5 * math.sqrt(8) * (X - eX)
def rrg_simple(p, b):
    rs = p / b; ratio = 100 * rs.rolling(10).mean() / rs.rolling(30).mean()
    return ratio, 100 * ratio / ratio.rolling(9).mean()
spy = yser('SPY')
P = json.load(open('/home/user/rrg/data/prices.json'))
appdates = pd.to_datetime(P['dates'])
out = {}
for tf in ['weekly', 'daily']:
    for t in ['XLK', 'XLE', 'XLU', 'NVDA']:
        bench = 'QQQ' if t == 'NVDA' else 'SPY'
        p = yser(t).reindex(appdates); b = yser(bench).reindex(appdates)
        if tf == 'weekly':
            df = pd.DataFrame({'p': p, 'b': b}); wk = df.groupby(df.index.to_period('W-SAT')).tail(1)
            p, b = wk['p'], wk['b']
        for f, fn in [('nuova', rrg_new), ('semplice', rrg_simple)]:
            x, y = fn(p, b)
            out[f'{tf}|{t}|{f}'] = dict(dates=[d.strftime('%Y-%m-%d') for d in x.index[-3:]], x=list(x.values[-3:]), y=list(y.values[-3:]))
# app values via node (app engine on app data)
js = """
import fs from 'node:fs'; import {build} from '/home/user/rrg/js/engine.js';
const P=JSON.parse(fs.readFileSync('/home/user/rrg/data/prices.json')); const o={};
for (const tf of ['weekly','daily']) for (const f of ['nuova','semplice']) {
  const r1=build(P,{symbols:['XLK','XLE','XLU'],benchmark:'SPY',timeframe:tf,formula:f});
  const r2=build(P,{symbols:['NVDA'],benchmark:'QQQ',timeframe:tf,formula:f});
  for (const [r,ts] of [[r1,['XLK','XLE','XLU']],[r2,['NVDA']]]) for (const t of ts) o[tf+'|'+t+'|'+f]={dates:r.dates.slice(-3),x:r.series[t].x.slice(-3),y:r.series[t].y.slice(-3)};
}
console.log(JSON.stringify(o));"""
app = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True).stdout)
res = []
for k in out:
    a, o = app[k], out[k]
    for i in range(3):
        res.append((k, a['dates'][i], o['dates'][i], a['x'][i], o['x'][i], a['y'][i], o['y'][i]))
        print(f"{k:22} {a['dates'][i]} x app {a['x'][i]:9.4f} own {o['x'][i]:9.4f}  y app {a['y'][i]:9.4f} own {o['y'][i]:9.4f}  Δx {a['x'][i]-o['x'][i]:+.4f} Δy {a['y'][i]-o['y'][i]:+.4f}")
json.dump(res, open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/c5_rrg.json', 'w'))
