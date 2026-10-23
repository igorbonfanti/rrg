"""Quanto sposta la % di titoli sopra la media a 50/200 sedute usare i membri di oggi invece dei membri di ogni data.
Dati: sonda S&P 500 con membri storici dal 1996 (scratchpad/data-probe/jb). Uso: python3 sopravvivenza_medie.py <cartella jb>"""
import sys
import numpy as np
import pandas as pd

jb = sys.argv[1]
px = pd.read_parquet(f'{jb}/prices.parquet', columns=['date', 'ticker', 'close'])
px = px.pivot_table(index='date', columns='ticker', values='close').astype('float32')
mem = pd.read_parquet(f'{jb}/members.parquet')
cnt = mem.groupby('date').size()
last = cnt[cnt > 450].index.max()                     # ultimo giorno con la lista completa
mem = mem[mem.date <= last]
px = px.loc[:last]
today = set(mem[mem.date == last].ticker)
pit = pd.crosstab(mem.date, mem.ticker).reindex(index=px.index, columns=px.columns, fill_value=0).astype(bool)
cur = pd.DataFrame(False, index=px.index, columns=px.columns)
cur.loc[:, [t for t in px.columns if t in today]] = True

out = {}
for n in (50, 200):
    sma = px.rolling(n, min_periods=n).mean()
    ok = sma.notna() & px.notna()
    above = (px > sma) & ok
    for name, m in (('storici', pit), ('oggi', cur)):
        out[f'{n}_{name}'] = 100 * (above & m).sum(axis=1) / (ok & m).sum(axis=1).replace(0, np.nan)
df = pd.DataFrame(out).dropna()
df = df[df.index >= '1997-01-01']
for n in (50, 200):
    d = df[f'{n}_oggi'] - df[f'{n}_storici']
    print(f'MA{n}: scarto medio (oggi - storici) {d.mean():+.1f} punti; dal 2010 {d[d.index >= "2010"].mean():+.1f}; '
          f'massimo {d.max():+.1f} il {d.idxmax().date()}')
print('\nAi minimi (valore più basso nella finestra):')
for a, b in [('2002-07-01', '2002-10-31'), ('2008-10-01', '2009-03-31'), ('2011-08-01', '2011-10-31'),
             ('2015-08-01', '2016-02-29'), ('2018-12-01', '2018-12-31'), ('2020-03-01', '2020-04-30'),
             ('2022-06-01', '2022-10-31'), ('2025-04-01', '2025-04-30')]:
    w = df.loc[a:b]
    print(f'{a[:7]}: MA200 storici {w["200_storici"].min():5.1f}  oggi {w["200_oggi"].min():5.1f} | '
          f'MA50 storici {w["50_storici"].min():5.1f}  oggi {w["50_oggi"].min():5.1f}')
# quanto spesso si è sotto il 13% (livello blu SPX di Rea sulla MA200) con le due liste
for lv in (10, 13, 15):
    print(f'giorni con MA200 < {lv}%: storici {(df["200_storici"] < lv).sum()}, oggi {(df["200_oggi"] < lv).sum()}')
