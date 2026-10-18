"""Prova della capitolazione («Drop giornaliero cumulato» di Rea) sui 22 indici della vista 6.

Misura: per ogni seduta, quota dei membri con un calo giornaliero di almeno il 7% (anche 5% e 10%), sommata sulle
ultime 5 sedute. Segnale: somma sopra il 99° percentile delle sedute precedenti (almeno 3 anni di storia) e almeno
5 cali nella somma; episodi distanti almeno 10 sedute, si entra il primo giorno. Rendimenti dell'indice (solo prezzo)
dopo l'episodio contro una seduta qualsiasi dello stesso periodo, e contro il solo prezzo (5 sedute peggiori
dell'indice, 1° percentile delle precedenti), per vedere se i titoli aggiungono qualcosa.

Dati: cache dei prezzi di scripts/backfill_indices.py (comando prices) per 21 indici; per l'S&P 500 la sonda con i
membri di ogni data dal 1996 (scratchpad/data-probe/jb). Composizione come in config/indices.json: di epoca per Dow
e Nasdaq-100, di oggi per gli altri.

Uso: python3 capitolazione_indici.py <cache> <cartella jb o -> <cartella di uscita>
"""
import bisect
import datetime as dt
import json
import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import backfill_indices as bi  # noqa: E402

CACHE, JB, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
THRS = (5, 7, 10)
WIN, GAP, MINCNT, WARM = 5, 10, 5, 756   # 3 anni di storia prima del primo segnale
H = (21, 63, 252)
RNG = np.random.default_rng(7)
START = '2000-01-01'


def load_px(sym):
    p = bi.cache_path(CACHE, sym)
    if not os.path.exists(p):
        return None
    x = bi.load(p)
    if not x.get('dates'):
        return None
    d, c, _ = bi.clean(x['dates'], x['close'])
    return pd.Series(c, index=pd.to_datetime(d), dtype='float64')


def member_matrix(k, c, cal):
    """Rendimenti giornalieri dei membri sul calendario dell'indice e maschera di appartenenza."""
    members = c['pit'] if 'pit' in c else {t: [[START, None]] for t in c['current']}
    calv = cal.values
    R, M, nodata = {}, {}, 0
    for sym, ivs in members.items():
        mask = np.zeros(len(cal), bool)
        for a, b in ivs:
            lo = np.searchsorted(calv, np.datetime64(a))
            hi = len(cal) if b is None else np.searchsorted(calv, np.datetime64(b))
            mask[lo:hi] = True
        if not mask.any():
            continue
        s = None if sym.startswith('!') else load_px(sym)
        M[sym] = mask
        if s is None or len(s) < 3:
            nodata += 1
            continue
        s = s[s.index >= pd.Timestamp('1998-01-01')]
        r = s.pct_change()
        gapd = s.index.to_series().diff().dt.days
        r[gapd > 7] = np.nan                                   # rendimento su più di una settimana: non è un giorno
        # seduta del titolo → seduta dell'indice (la stessa o la prima dopo, entro 3 giorni)
        pos = np.searchsorted(calv, s.index.values)
        ok = pos < len(cal)
        pos, rv, idxd = pos[ok], r.values[ok], s.index.values[ok]
        near = (calv[pos] - idxd) <= np.timedelta64(3, 'D')
        v = np.full(len(cal), np.nan)
        v[pos[near]] = rv[near]
        R[sym] = v
    R = pd.DataFrame(R, index=cal)
    M = pd.DataFrame(M, index=cal).reindex(columns=sorted(set(M)), fill_value=False)
    return R, M, nodata


def spx_matrix(cal):
    px = pd.read_parquet(f'{JB}/prices.parquet', columns=['date', 'ticker', 'close', 'adj_close'])
    px = px[px.date >= '1998-01-01']
    C = px.pivot(index='date', columns='ticker', values='close').reindex(cal)
    A = px.pivot(index='date', columns='ticker', values='adj_close').reindex(cal)
    rc, ra = C / C.shift(1) - 1, A / A.shift(1) - 1
    R = rc.where(~((rc - ra).abs() > 0.05), ra)
    mem = pd.read_parquet(f'{JB}/members.parquet')
    mem['v'] = 1.0
    snap = mem.pivot_table(index='date', columns='ticker', values='v', aggfunc='max', fill_value=0.0)
    snap = snap.reindex(columns=R.columns, fill_value=0.0)
    M = snap.reindex(snap.index.union(cal)).ffill().reindex(cal).fillna(0) > 0.5
    M.loc[cal < pd.Timestamp('1996-01-02'), :] = False
    last = mem.date.max()
    R, M = R[cal <= last], M[cal <= last]
    return R, M, 0


def episodes(sig):
    i = np.flatnonzero(sig.values)
    if not len(i):
        return []
    keep = np.r_[True, np.diff(i) >= GAP]
    return list(sig.index[i[keep]])


def stats(ev, fwd, base):
    out = {}
    for h in H:
        e = fwd[h].reindex(ev).dropna()
        b = base[h].dropna()
        p = (RNG.choice(b.values, (20000, len(e))).mean(1) >= e.mean()).mean() if len(e) > 1 else np.nan
        out[h] = dict(n=len(e), m=e.mean() if len(e) else np.nan, base=b.mean(), p=p,
                      pos=100 * (e > 0).mean() if len(e) else np.nan)
    return out


cfg, comp = bi.compositions()
ONLY = os.environ.get('ONLY')            # per prove: ONLY=SPX,DAX
if ONLY:
    cfg = {k: v for k, v in cfg.items() if k in ONLY.split(',')}
rows, glob, detail = [], {}, {}
for k in cfg:
    ps = load_px(cfg[k]['price']) if k != 'SPX' else pd.read_csv(
        os.path.join(os.path.dirname(CACHE), 'qr', 'spx.csv'), parse_dates=['date']).set_index('date')['close']
    if ps is None:
        print(k, 'senza prezzo dell\'indice')
        continue
    ps = ps[ps.index >= START]
    cal = ps.index
    if k == 'SPX':
        if JB == '-':
            continue
        R, M, nodata = spx_matrix(cal)
        ps = ps.reindex(R.index)
        cal = R.index
    else:
        R, M, nodata = member_matrix(k, comp[k], cal)
        R = R.reindex(columns=M.columns)
    idx_r = ps.pct_change()
    valid = M & R.notna()
    n = valid.sum(axis=1)
    members = M.sum(axis=1)
    cover = n / members.replace(0, np.nan)
    # errori di stampa: forte calo che il giorno dopo si riprende quasi tutto mentre l'indice era tranquillo
    nxt = R.shift(-1)
    rec = nxt >= (1 / (1 + R) - 1) * 0.9
    wide = lambda b: pd.DataFrame(np.repeat(b.values[:, None], R.shape[1], 1), index=R.index, columns=R.columns)
    glitch = valid & (R <= -0.05) & rec & wide(idx_r.abs() < 0.02)
    glitch |= valid & (R <= -0.6) & wide(idx_r > -0.05)
    good = valid & ~glitch
    ok = (cover >= 0.6) & (n >= 15)
    first_ok = ok[ok].index.min() if ok.any() else None
    fwd = pd.DataFrame({h: ps.shift(-h) / ps - 1 for h in H}) * 100
    res = {'indice': k, 'nome': cfg[k]['name'], 'composizione': cfg[k]['composition'],
           'membri mediani': float(members[cal >= '2010'].median()), 'con prezzi mediani': float(n[cal >= '2010'].median()),
           'copertura dal 2010': float(cover[cal >= '2010'].median()), 'dal': str(first_ok.date()) if first_ok is not None else '—',
           'senza dati': nodata}
    drops7 = int(((R <= -0.07) & valid).values.sum())
    res['errori tolti (% dei cali ≥7%)'] = 100 * int((glitch & (R <= -0.07)).values.sum()) / max(drops7, 1)
    for thr in THRS:
        cnt = ((R <= -thr / 100) & good).sum(axis=1)
        pct = 100 * cnt / n.replace(0, np.nan)
        s5c, s5p = cnt.rolling(WIN).sum(), pct.rolling(WIN).sum()
        s5p[~ok] = np.nan
        p99 = s5p.expanding(min_periods=WARM).quantile(0.99).shift(1)
        sig = (s5p > p99) & (s5c >= MINCNT) & p99.notna()
        ev = episodes(sig)
        eligible = p99.dropna().index
        if not len(eligible):
            continue
        base = fwd.loc[eligible.min():]
        st = stats(ev, fwd, base)
        res[f'ep{thr}'] = len(ev)
        for h in H:
            res[f'{thr}_{h}'] = st[h]['m']
            res[f'{thr}_{h}_base'] = st[h]['base']
            res[f'{thr}_{h}_p'] = st[h]['p']
            res[f'{thr}_{h}_pos'] = st[h]['pos']
        if thr == 7:
            res['episodi 7%'] = ', '.join(d.strftime('%Y-%m') for d in ev)
            res['valutato dal'] = str(eligible.min().date())
            glob[k] = sig.reindex(pd.date_range('2000-01-01', '2026-12-31', freq='B'), fill_value=False)
            for lab, a, b in (('2008', '2008-09-01', '2009-04-30'), ('2011', '2011-07-25', '2011-10-31'),
                              ('2020', '2020-02-20', '2020-04-30'), ('2022', '2022-01-01', '2022-12-31'),
                              ('2025', '2025-03-25', '2025-04-30')):
                w = s5p.loc[a:b]
                res[f'picco {lab}'] = float(w.max()) if len(w) and w.notna().any() else np.nan
            res['oggi'] = float(s5p.dropna().iloc[-1]) if s5p.notna().any() else np.nan
            res['oggi pct'] = float((s5p.dropna() <= res['oggi']).mean() * 100) if s5p.notna().any() else np.nan
            res['p99 oggi'] = float(p99.dropna().iloc[-1]) if p99.notna().any() else np.nan
            detail[k] = pd.DataFrame({'pct5': s5p, 'cnt5': s5c, 'p99': p99, 'n': n})
    # solo prezzo: le 5 sedute peggiori dell'indice
    r5 = ps / ps.shift(WIN) - 1
    r5[~ok] = np.nan
    q01 = r5.expanding(min_periods=WARM).quantile(0.01).shift(1)
    evp = episodes((r5 < q01) & q01.notna())
    if q01.notna().any():
        stp = stats(evp, fwd, fwd.loc[q01.dropna().index.min():])
        res['ep prezzo'] = len(evp)
        for h in H:
            res[f'prezzo_{h}'] = stp[h]['m']
            res[f'prezzo_{h}_p'] = stp[h]['p']
    rows.append(res)
    print(k, res.get('ep7'), res.get('episodi 7%'), flush=True)

T = pd.DataFrame(rows).set_index('indice')
T.to_csv(f'{OUT}/capitolazione_indici.csv', float_format='%.2f')
for k, d in detail.items():
    d.to_csv(f'{OUT}/serie_{k}.csv', float_format='%.3f')
G = pd.DataFrame(glob)
act = G.rolling(5, min_periods=1).max().fillna(0).astype(bool)   # segnale attivo negli ultimi 5 giorni
cnt = act.sum(axis=1)
cnt[cnt > 0].to_csv(f'{OUT}/capitolazione_globale.csv')
print('\nGiorni con più indici in capitolazione (segnale negli ultimi 5 giorni):')
top = cnt.groupby(cnt.index.to_period('M')).max().sort_values(ascending=False)
print(top[top >= 4].to_string())
