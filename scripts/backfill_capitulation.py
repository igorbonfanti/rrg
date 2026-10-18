#!/usr/bin/env python3
"""
backfill_capitulation.py — ricostruzione una tantum di data/capitulation.json (cali forti cumulati, formato e
metodo in js/capitulation.js). Poi lo aggiornano ogni sera scripts/fetch_breadth.js (S&P 500 e settori) e
scripts/fetch_indices.js (indici).

Per ogni seduta e serie: membri con il rendimento della seduta (n) e quanti hanno perso almeno il 5%, il 7% e il
10% (x5, x7, x10). Rendimento = chiusura del giorno su quella della seduta prima del titolo, al massimo 7 giorni di
calendario prima, rettificata per gli split. Si scarta un calo che la seduta dopo si riprende quasi tutto in una
giornata tranquilla per gli altri membri (mediana entro ±2%) e un crollo oltre il 60% in una giornata normale.
  - S&P 500 e settori: composizione di ogni data e prezzi della release Johnbrick123/sp500-data (--jb), settori
    come in backfill_breadth.py (--repo, storia di datasets/s-and-p-500-companies), sulle sedute di
    data/breadth.json; dove la chiusura rettificata per i dividendi si discosta di oltre 5 punti (spin-off e
    altri eventi straordinari) vale quella. Le sedute dopo la fine della release si completano con i membri di
    oggi (data/sp500_members.json) scaricati da Yahoo.
  - Indici: cache dei prezzi di backfill_indices.py (--cache, comando prices), composizione come in quello
    script, sulle sedute di data/indices.json e data/indices_more.json dalla prima con la breadth (b0).
    Gli indici con "noCap" in config/indices.json restano fuori.

Uso: python3 scripts/backfill_capitulation.py --jb DIR --repo DIR --cache DIR
Richiede Python 3.10+, duckdb e pandas.
"""
import argparse, datetime as dt, json, os, sys, urllib.parse

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import backfill_indices as bi  # noqa: E402
import backfill_breadth as bb  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
THRESHOLDS = (5, 7, 10)
EPS = 1e-9  # come in js/capitulation.js: un −10% esatto conta come −10%
GICS = bb.SECTORS  # nome GICS → XL*


# ---------- formato (come js/capitulation.js e js/indexdata.js) ----------

def encode_counts(a):
    s = []
    for v in a:
        if v is None:
            s.append('-')
        elif v < 35:
            s.append(np.base_repr(v, 36).lower())
        else:
            s.append('z' + np.base_repr(min(v, 46655), 36).lower().rjust(3, '0'))
    return ''.join(s)


def encode_dates(dates):
    g = []
    for a, b in zip(dates, dates[1:]):
        k = (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days
        if not 1 <= k <= 35:
            raise ValueError(f'intervallo di {k} giorni tra {a} e {b}')
        g.append(np.base_repr(k, 36).lower())
    return {'d0': dates[0], 'gaps': ''.join(g)}


def pack(dates, rows):
    """rows: per seduta (n, x5, x7, x10) o None"""
    out = encode_dates(dates)
    out['n'] = bi.rle([r[0] if r else None for r in rows])
    for k, t in enumerate(THRESHOLDS):
        out[f'x{t}'] = encode_counts([r[k + 1] if r else None for r in rows])
    return out


# ---------- conteggi (come dayCounts in js/capitulation.js) ----------

def counts(R, valid):
    """R: DataFrame sedute × titoli dei rendimenti (NaN = senza); valid: maschera dei membri. Righe (n, x5, x7, x10)."""
    R = R.where(valid)
    nxt = R.shift(-1)
    med = R.median(axis=1, skipna=True)
    calm = med.abs() < 0.02
    rec = nxt >= (1 / (1 + R) - 1) * 0.9
    bad = (R <= -0.05 + EPS) & rec & calm.values[:, None]
    bad |= (R <= -0.6) & (med > -0.05).values[:, None]
    good = R.where(~bad)
    n = R.notna().sum(axis=1)
    out = []
    xs = [(good <= -t / 100 + EPS).sum(axis=1) for t in THRESHOLDS]
    for i in range(len(R)):
        out.append(None if n.iloc[i] == 0 else (int(n.iloc[i]), *(int(x.iloc[i]) for x in xs)))
    return out


def returns_on(cal, dates, close):
    """Rendimenti di un titolo sulle sedute `cal` (la sua seduta stessa, la precedente entro 7 giorni)."""
    s = pd.Series(close, index=pd.to_datetime(dates))
    r = s.pct_change()
    r[s.index.to_series().diff().dt.days > 7] = np.nan
    return r.reindex(cal)


# ---------- S&P 500 e settori ----------

def sp500(jb, repo, cache):
    import duckdb
    con = duckdb.connect()
    sector_of = bb.sector_map(con, jb, repo)
    breadth = bi.load(os.path.join(DATA, 'breadth.json'))
    cal = pd.to_datetime(breadth['dates'])
    px = pd.read_parquet(f'{jb}/prices.parquet', columns=['date', 'ticker', 'close', 'adj_close'])
    px = px[px.date >= cal[0] - pd.Timedelta(days=30)]
    C = px.pivot(index='date', columns='ticker', values='close')
    A = px.pivot(index='date', columns='ticker', values='adj_close')
    del px
    rc, ra = C.pct_change(fill_method=None), A.pct_change(fill_method=None)
    gapd = C.index.to_series().diff().dt.days
    R = rc.where(~((rc - ra).abs() > 0.05), ra)
    R[gapd > 7] = np.nan
    R = R.reindex(cal)
    mi = pd.read_parquet(f'{jb}/membership_intervals.parquet')
    M = pd.DataFrame(False, index=cal, columns=R.columns)
    for t, s, e in mi[['ticker', 'start', 'end']].itertuples(index=False):
        if t not in M.columns:
            continue
        m = cal >= s
        if not pd.isna(e):
            m &= cal < e
        M.loc[m, t] = True
    # ultima seduta con i prezzi di quasi tutti i membri della release
    cov = (M & R.notna()).sum(axis=1) / M.sum(axis=1).replace(0, np.nan)
    jb_end = cov[cov >= 0.95].index.max()
    print(f'S&P 500: release fino al {jb_end.date()}, breadth fino al {cal[-1].date()}')
    series = {}
    keys = {'SPX': None, **{v: k for k, v in GICS.items()}}
    rows = {}
    for key, gics in keys.items():
        cols = [t for t in R.columns if gics is None or sector_of.get(t) == gics]
        rows[key] = counts(R[cols].loc[:jb_end], M[cols].loc[:jb_end])
    # sedute dopo la release: membri di oggi da Yahoo
    tail = cal[cal > jb_end]
    if len(tail):
        mem = bi.load(os.path.join(DATA, 'sp500_members.json'))['members']
        os.makedirs(cache, exist_ok=True)
        from concurrent.futures import ThreadPoolExecutor
        syms = [m['s'] for m in mem]
        with ThreadPoolExecutor(4) as ex:
            list(ex.map(lambda s: bi.fetch(s, cache), syms))
        Rt = {}
        for m in mem:
            x = bi.load(bi.cache_path(cache, m['s']))
            if x.get('dates'):
                d, cl, _ = bi.clean(x['dates'], x['close'])
                Rt[m['s']] = returns_on(tail, d, cl)
        Rt = pd.DataFrame(Rt, index=tail)
        for key in keys:
            cols = [m['s'] for m in mem if (key == 'SPX' or m['sector'] == key) and m['s'] in Rt.columns]
            rows[key] += counts(Rt[cols], Rt[cols].notna())
        print(f'  completate {len(tail)} sedute con {Rt.shape[1]} membri di oggi')
    for key in keys:
        series[key] = pack(breadth['dates'], rows[key])
    return series


# ---------- indici ----------

def indices(cache):
    cfg, comp = bi.compositions()
    data = {**bi.load(os.path.join(DATA, 'indices_more.json'))['series'], **bi.load(os.path.join(DATA, 'indices.json'))['series']}
    out = {}
    for k in cfg:
        if k == 'SPX' or cfg[k].get('noCap') or k not in data:
            continue
        x = data[k]
        dates = [x['d0']]
        for ch in x['gaps']:
            dates.append((dt.date.fromisoformat(dates[-1]) + dt.timedelta(days=int(ch, 36))).isoformat())
        dates = dates[x['b0']:]
        cal = pd.to_datetime(dates)
        c = comp[k]
        members = c['pit'] if 'pit' in c else {t: [[dates[0], None]] for t in c['current']}
        R, M = {}, {}
        for sym, ivs in members.items():
            if sym.startswith('!'):
                continue
            mask = np.zeros(len(cal), bool)
            for a, b in ivs:
                mask |= (cal >= pd.Timestamp(a)) & ((cal < pd.Timestamp(b)) if b else True)
            p = bi.cache_path(cache, sym)
            if not mask.any() or not os.path.exists(p):
                continue
            y = bi.load(p)
            if not y.get('dates'):
                continue
            d, cl, _ = bi.clean(y['dates'], y['close'])
            R[sym] = returns_on(cal, d, cl).values
            M[sym] = mask
        R, M = pd.DataFrame(R, index=cal), pd.DataFrame(M, index=cal)
        out[k] = pack(dates, counts(R, M))
        print(f'{k}: {len(dates)} sedute dal {dates[0]}, {R.shape[1]} titoli')
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jb', required=True)
    ap.add_argument('--repo', required=True)
    ap.add_argument('--cache', required=True, help='cache dei prezzi di backfill_indices.py (prices)')
    args = ap.parse_args()
    series = sp500(args.jb.rstrip('/'), args.repo, os.path.join(args.cache, 'sp500_tail'))
    series.update(indices(args.cache))
    last = lambda x: (dt.date.fromisoformat(x['d0']) + dt.timedelta(days=sum(int(ch, 36) for ch in x['gaps']))).isoformat()
    out = {
        'generated': dt.date.today().isoformat(), 'asOf': last(series['SPX']),
        'method': 'membri con rendimento giornaliero ≤ −5/−7/−10% (chiusure rettificate per gli split); esclusi gli errori di stampa (ripresa quasi completa il giorno dopo con la mediana dei membri entro ±2%) e i crolli oltre il 60% in giornate normali; S&P 500 e settori con la composizione di ogni data, indici come in data/indices.json',
        'thresholds': list(THRESHOLDS), 'series': series,
    }
    with open(os.path.join(DATA, 'capitulation.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'data/capitulation.json: {len(series)} serie, al {out["asOf"]}, {os.path.getsize(os.path.join(DATA, "capitulation.json")) // 1024} KB')


if __name__ == '__main__':
    main()
