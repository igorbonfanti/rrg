# C5. Rotazione: RS-Ratio e RS-Momentum, formula nuova e a medie semplici, settimanale e giornaliero.
# Ricalcolo indipendente (pandas, formule del README) sui prezzi di Yahoo (USA, asset reali) o del file (ETF europei, già
# confrontati con Yahoo in c1_prices.py), contro js/engine.js build() sui file dell'app. Ultime 4 barre.
# uso: python3 -I c5_rrg.py
import sys, os, json, math, subprocess
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, dump, R

CASES = [  # file, simboli, benchmark
    ('prices', ['XLK', 'XLE', 'XLU', 'XLRE'], 'SPY'),
    ('prices', ['NVDA', 'TSLA'], 'QQQ'),
    ('prices_macro', ['GLD', 'BTC-USD'], 'SPY'),
    ('prices_global', ['SGLD.MI', 'EIMI.MI', 'DBMFE.PA'], 'SWDA.MI'),
]


def ema(x, n):
    return x.ewm(span=n, adjust=False).mean()


def rrg_new(p, b):
    lr = np.log(p / b); r = lr.diff(); lam = 0.5 ** (1 / 26)
    v2, sig, cnt = None, [], 0
    for x in r.values:
        if np.isnan(x):
            sig.append(np.nan); continue
        v2 = x * x if v2 is None else lam * v2 + (1 - lam) * x * x
        cnt += 1; sig.append(math.sqrt(v2) if cnt >= 26 else np.nan)
    sig = pd.Series(sig, index=lr.index)
    first = lr.first_valid_index(); pos = list(lr.index).index(first)
    X = (ema(lr.dropna(), 10) - ema(lr.dropna(), 30)).reindex(lr.index) / (sig * math.sqrt(10))
    X[np.arange(len(X)) < pos + 30] = np.nan
    eX = ema(X.dropna(), 8).reindex(X.index)
    return 100 + 2.5 * X, 100 + 2.5 * math.sqrt(8) * (X - eX)


def rrg_simple(p, b):
    rs = p / b; ratio = 100 * rs.rolling(10).mean() / rs.rolling(30).mean()
    return ratio, 100 * ratio / ratio.rolling(9).mean()


own = {}
for f, syms, bench in CASES:
    P = load(f + '.json'); idx = pd.to_datetime(P['dates'])
    def ser(s):
        if f == 'prices_global':
            return pd.Series(P['tickers'][s]['close'], index=idx, dtype=float)
        y = series(s, '5y'); v = pd.Series(y['adj'], index=pd.to_datetime(y['dates']))
        return v.reindex(v.index.union(idx)).ffill().reindex(idx)  # bitcoin: ultimo prezzo a ogni seduta NYSE
    b0 = ser(bench)
    for s in syms:
        p0 = ser(s)
        for tf in ('weekly', 'daily'):
            p, b = p0, b0
            if tf == 'weekly':
                df = pd.DataFrame({'p': p, 'b': b}); wk = df.groupby(df.index.to_period('W-SAT')).tail(1); p, b = wk['p'], wk['b']
            for name, fn in (('nuova', rrg_new), ('semplice', rrg_simple)):
                x, y = fn(p, b)
                own[f'{f}|{tf}|{s}|{name}'] = dict(dates=[d.strftime('%Y-%m-%d') for d in x.index[-4:]], x=[float(v) for v in x.values[-4:]], y=[float(v) for v in y.values[-4:]])
js = """
import fs from 'node:fs'; import {build} from '%s/js/engine.js'; import {MILAN} from '%s/js/calendar.js';
const cases = %s, o = {};
for (const [f, syms, bench] of cases) { const P = JSON.parse(fs.readFileSync('%s/data/' + f + '.json'));
  for (const tf of ['weekly','daily']) for (const fo of ['nuova','semplice']) {
    const r = build(P, {symbols: syms, benchmark: bench, timeframe: tf, formula: fo, ...(f === 'prices_global' ? {weekHasMoreSessions: MILAN.weekHasMoreSessions} : {})});
    for (const s of syms) o[f+'|'+tf+'|'+s+'|'+fo] = {dates: r.dates.slice(-4), x: r.series[s].x.slice(-4), y: r.series[s].y.slice(-4), prov: r.provisional};
  } }
console.log(JSON.stringify(o));""" % (R.rstrip('/'), R.rstrip('/'), json.dumps(CASES), R.rstrip('/'))
app = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
rows, worst = [], 0
for k, o in own.items():
    a = app[k]
    for i in range(4):
        dx, dy = a['x'][i] - o['x'][i], a['y'][i] - o['y'][i]
        worst = max(worst, abs(dx), abs(dy))
        rows.append(dict(k=k, date_app=a['dates'][i], date_own=o['dates'][i], x_app=a['x'][i], x_own=o['x'][i], y_app=a['y'][i], y_own=o['y'][i], prov=a['prov']))
    print(f"{k:42} {a['dates'][-1]}/{o['dates'][-1]} x app {a['x'][-1]:9.4f} ric. {o['x'][-1]:9.4f}  y app {a['y'][-1]:9.4f} ric. {o['y'][-1]:9.4f}  max|Δ| 4 barre {max(max(abs(a['x'][i]-o['x'][i]), abs(a['y'][i]-o['y'][i])) for i in range(4)):.5f}{'  (settimana provvisoria)' if a['prov'] else ''}")
dump('c5_rrg.json', rows)
print('confronti', len(rows), 'scarto massimo', worst)
