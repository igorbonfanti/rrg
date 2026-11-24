"""Preset di Rea per il «Drop giornaliero cumulato» (calo ≤ −7%, somma su 5 sedute) contro le varianti al −5% e −10%,
sull'S&P 500 con i membri di ogni data (sonda dal 1996). Conteggio grezzo come Rea e % dei membri; segnale = sopra il
99° percentile delle sedute precedenti (almeno 5 anni di storia), episodi distanti almeno 10 sedute; rendimenti ^GSPC
contro una seduta qualsiasi dello stesso periodo.
Uso: PYTHONPATH=<scratchpad>/data-probe/pylib python3 capitolazione_preset.py <scratchpad>"""
import sys
import numpy as np
import pandas as pd

S = sys.argv[1]
D, QR = f'{S}/data-probe/jb', f'{S}/qr'
spx = pd.read_csv(f'{QR}/spx.csv', parse_dates=['date']).set_index('date')['close']
px = pd.read_parquet(f'{D}/prices.parquet', columns=['date', 'ticker', 'close', 'adj_close'])
px = px[px.date >= '1995-06-01']
C = px.pivot(index='date', columns='ticker', values='close').astype('float32')
A = px.pivot(index='date', columns='ticker', values='adj_close').astype('float32')
del px
dates = spx.index[(spx.index >= C.index.min()) & (spx.index <= C.index.max())]
C, A = C.reindex(dates), A.reindex(dates)
rc, ra = C / C.shift(1) - 1, A / A.shift(1) - 1
R = rc.where(~((rc - ra).abs() > 0.05), ra)          # spin-off e simili: rendimento rettificato

mem = pd.read_parquet(f'{D}/members.parquet')
mem['v'] = 1.0
snap = mem.pivot_table(index='date', columns='ticker', values='v', aggfunc='max', fill_value=0.0)
today = snap.columns[snap.iloc[-1] > 0]
snap = snap.reindex(columns=C.columns, fill_value=0.0)
PIT = snap.reindex(snap.index.union(dates)).ffill().reindex(dates).fillna(0) > 0.5
CUR = pd.DataFrame(False, index=dates, columns=C.columns)
CUR.loc[:, [t for t in today if t in C.columns]] = True
start = pd.Timestamp('1996-01-02')

FWD = pd.DataFrame({h: spx.shift(-h) / spx - 1 for h in (21, 63, 252)}) * 100
ser = {}
for name, M in (('storici', PIT), ('oggi', CUR)):
    ok = M & R.notna()
    n = ok.sum(axis=1)
    for thr in (5, 7, 10):
        cnt = ((R <= -thr / 100) & ok).sum(axis=1)
        ser[(name, thr, 'conteggio')] = cnt.rolling(5).sum()
        ser[(name, thr, '%')] = (100 * cnt / n.replace(0, np.nan)).rolling(5).sum()
ser = pd.DataFrame(ser)
full = ser.index[PIT.sum(axis=1) >= 450]
ser = ser.loc[start:full.max()]

print('Picchi (somma su 5 sedute), conteggio grezzo con i membri di oggi come Rea | con i membri storici | % storici')
for a, b, lab in (('2008-09-01', '2009-04-30', '2008'), ('2011-07-25', '2011-10-31', '2011'),
                  ('2020-02-20', '2020-04-30', '2020'), ('2025-03-25', '2025-04-30', '2025'), ('2022-01-01', '2022-12-31', '2022')):
    w = ser.loc[a:b]
    print(lab, ' | '.join(f"−{t}%: {w[('oggi', t, 'conteggio')].max():.0f} / {w[('storici', t, 'conteggio')].max():.0f} / "
                          f"{w[('storici', t, '%')].max():.1f}%" for t in (5, 7, 10)))

def episodes(sig, gap=10):
    d = sig[sig].index
    pos = np.searchsorted(ser.index, d)
    return d[np.r_[True, np.diff(pos) >= gap]] if len(d) else d

rng = np.random.default_rng(1)
print('\nSegnale: sopra il 99° percentile delle sedute precedenti; episodi; ^GSPC dopo il primo giorno contro una seduta qualsiasi 1996+')
base = FWD.loc[start:ser.index.max()]
for name in ('storici', 'oggi'):
    for thr in (5, 7, 10):
        for kind in ('%', 'conteggio'):
            x = ser[(name, thr, kind)]
            p99 = x.expanding(min_periods=1260).quantile(0.99).shift(1)
            ev = episodes((x > p99) & p99.notna())
            f = FWD.reindex(ev)
            row = []
            for h in (63, 252):
                e = f[h].dropna()
                b = base[h].dropna()
                p = (rng.choice(b.values, (20000, len(e))).mean(1) >= e.mean()).mean() if len(e) > 1 else np.nan
                row.append(f'{h}g {e.mean():+.1f} (base {b.mean():+.1f}, p {p:.2f}, positivi {100 * (e > 0).mean():.0f}%)')
            print(f'{name:8} −{thr}% {kind:9} episodi {len(ev):2d} ({", ".join(d.strftime("%Y-%m") for d in ev)}) | ' + ' | '.join(row))
