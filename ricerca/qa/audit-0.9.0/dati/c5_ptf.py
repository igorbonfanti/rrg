import sys, json, subprocess
import pandas as pd, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
W = {'SWDA.MI': 40, 'EIMI.MI': 10, 'EM13.MI': 10, 'EM710.MI': 10, 'EM15.MI': 10, 'SGLD.MI': 10, 'IWDP.MI': 5, 'CMOD.MI': 3, 'BTC-EUR': 2}
P = json.load(open('/home/user/rrg/data/prices_global.json')); D = pd.to_datetime(P['dates'])
px = {}
for s in W:
    y = series(s); px[s] = pd.Series(y['adj'], index=pd.to_datetime(y['dates'])).reindex(D.union(pd.to_datetime(y['dates']))).ffill().reindex(D)
df = pd.DataFrame(px).dropna()
# own: monthly rebalance to targets at last session of each month (close), buy-and-hold in between
val = 100.0; units = {s: val * W[s] / 100 / df[s].iloc[0] for s in W}; idx = [val]
months = df.index.to_period('M')
for i in range(1, len(df)):
    val = sum(units[s] * df[s].iloc[i] for s in W); idx.append(val)
    if i + 1 < len(df) and months[i + 1] != months[i]:
        units = {s: val * W[s] / 100 / df[s].iloc[i] for s in W}
own = pd.Series(idx, index=df.index)
nowW = {s: 100 * units[s] * df[s].iloc[-1] / own.iloc[-1] for s in W}
js = """import fs from 'node:fs'; import {portfolioIndex} from '/home/user/rrg/js/portfolio.js';
const P=JSON.parse(fs.readFileSync('/home/user/rrg/data/prices_global.json'));
const W=%s; const c={}; for (const s of Object.keys(W)) c[s]=P.tickers[s].close;
const r=portfolioIndex(P.dates,c,W); console.log(JSON.stringify({first:P.dates[r.index.findIndex(v=>v!=null)], last:r.index.at(-1), now:r.now, rb:r.rebalanced, y:r.index[P.dates.indexOf('2025-12-30')]}));""" % json.dumps(W)
app = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True).stdout)
print('start own', own.index[0].date(), 'app', app['first'])
print('index last own %.4f app %.4f  diff %.4f%%' % (own.iloc[-1], app['last'], 100 * (app['last'] / own.iloc[-1] - 1)))
print('YTD own %.3f%%  app %.3f%%' % (100 * (own.iloc[-1] / own.loc['2025-12-30'] - 1), 100 * (app['last'] / app['y'] - 1)))
print('rebalanced app', app['rb'])
for s in W: print(f'  {s:9} target {W[s]:3}  now own {nowW[s]:6.2f}  app {app["now"][s]:6.2f}')
