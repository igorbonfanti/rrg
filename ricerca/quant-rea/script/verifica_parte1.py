#!/usr/bin/env python3
"""
Verifica indipendente delle Sezioni 1-21 del fascicolo "Quant Rea" (TVC:SPX).

Dati: S&P 500 ^GSPC giornaliero (indice di prezzo, no dividendi) dal 1927-12-30,
Nasdaq-100 dal 1985-10-01. Prima del 1962 open/high/low = close (Yahoo).
Data di riferimento del fascicolo: 2026-07-08 (DOSSIER_DATE).

Uso:  python3 verifica_parte1.py [DIR_DATI] [DIR_OUTPUT]
Output: risultati.json + tabelle CSV in DIR_OUTPUT; riepilogo su stdout.
"""
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.stattools import adfuller

warnings.filterwarnings("ignore")

DEF_DATA = "/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qr"
DATA = Path(sys.argv[1] if len(sys.argv) > 1 else DEF_DATA)
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else DATA / "out1")
OUT.mkdir(parents=True, exist_ok=True)
DOSSIER_DATE = pd.Timestamp("2026-07-08")
RNG = np.random.default_rng(12345)
R = {}  # risultati


def load(name):
    df = pd.read_csv(DATA / f"{name}.csv", parse_dates=["date"]).set_index("date").sort_index()
    return df


SPX_ALL = load("spx")
SPX = SPX_ALL.loc[:DOSSIER_DATE].copy()
NDX_ALL = load("ndx")
C = SPX.close
RET = C.pct_change()


def rnd(x, k=4):
    if isinstance(x, (float, np.floating)):
        return None if not np.isfinite(x) else round(float(x), k)
    if isinstance(x, dict):
        return {str(a): rnd(b, k) for a, b in x.items()}
    if isinstance(x, (list, tuple)):
        return [rnd(v, k) for v in x]
    if isinstance(x, (np.integer,)):
        return int(x)
    return x


def nw_tstat(y, x=None, lags=0):
    """OLS con errori Newey-West; ritorna (coef, t, p) della pendenza (o media)."""
    y = np.asarray(y, float)
    if x is None:
        X = np.ones((len(y), 1))
    else:
        X = sm.add_constant(np.asarray(x, float))
    m = sm.OLS(y, X, missing="drop").fit(cov_type="HAC", cov_kwds={"maxlags": int(lags)})
    j = 0 if x is None else 1
    return float(m.params[j]), float(m.tvalues[j]), float(m.pvalues[j])


def fwd(series, h):
    return series.shift(-h) / series - 1


# ----------------------------------------------------------------------------
# helper anni
# ----------------------------------------------------------------------------
YE = C.groupby(C.index.year).last()           # chiusura di fine anno
YF = C.groupby(C.index.year).first()          # prima chiusura dell'anno


def annual_returns(c=C):
    ye = c.groupby(c.index.year).last()
    return ye.pct_change().dropna()


def year_paths(c=C):
    """dict anno -> array cum. return YTD (vs chiusura anno precedente), per giorno di borsa"""
    ye = c.groupby(c.index.year).last()
    out = {}
    for y, s in c.groupby(c.index.year):
        if y - 1 not in ye.index:
            continue
        out[y] = s.values / ye.loc[y - 1] - 1
    return out


# ============================================================================
# SEZ 1-3: mediana / bande / stagionalita' 10y
# ============================================================================
def sec1_3():
    paths = year_paths(C)
    K = len(C.loc["2026-01-01":DOSSIER_DATE])
    hist = {y: p for y, p in paths.items() if 1950 <= y <= 2025}
    atK = np.array([p[K - 1] for p in hist.values()])
    q = np.percentile(atK, [10, 25, 50, 75, 90])
    ytd = paths[2026][K - 1]
    fy = np.array([p[-1] for p in hist.values()])
    qfy = np.percentile(fy, [10, 25, 50, 75, 90])
    p26 = paths[2026][:K]
    imin = int(np.argmin(p26))
    # stagionalita' 10 anni (2016-2025) al giorno K
    ten = np.array([paths[y][K - 1] for y in range(2016, 2026)])
    R["sec1_3"] = {
        "K_giorni_2026": K,
        "ytd_2026_al_2026-07-08": ytd,
        "percentile_2026_tra_anni_1950_2025": stats.percentileofscore(atK, ytd),
        "bande_giornoK_P10_P25_P50_P75_P90": list(q),
        "bande_fine_anno_P10..P90": list(qfy),
        "ampiezza_10_90_fine_anno_pp": (qfy[4] - qfy[0]) * 100,
        "minimo_2026": p26[imin], "giorno_minimo_2026": imin + 1,
        "data_minimo_2026": str(C.loc["2026"].index[imin].date()),
        "stag10y_media_giornoK": ten.mean(), "stag10y_sd_giornoK": ten.std(ddof=1),
        "ytd_2026_al_2026-10-16_fuori_campione": float(SPX_ALL.close.iloc[-1] / YE.loc[2025] - 1),
    }


# ============================================================================
# SEZ 2 / 8: statistiche annue e mensili
# ============================================================================
def sec2_8():
    ar = annual_returns(C)
    out = {}
    for a, b in [(1928, 2025), (1950, 2025), (1950, 2026)]:
        r = ar.loc[a:b]
        n_y = b - a + 1
        start = YE.loc[a - 1] if a - 1 in YE.index else C.iloc[0]
        end = YE.loc[b] if b < 2026 else C.iloc[-1]
        yrs = n_y if b < 2026 else (b - a) + K_FRAC
        out[f"{a}-{b}"] = {
            "N": len(r), "media_aritm": r.mean(), "mediana": r.median(), "sd": r.std(ddof=1),
            "CAGR": (end / start) ** (1 / yrs) - 1, "hit_ratio": (r > 0).mean(),
            "media-1sd": r.mean() - r.std(ddof=1), "media+1sd": r.mean() + r.std(ddof=1),
        }
    # rendimento annuo "alla Rea": prima->ultima chiusura dell'anno
    ar_first = (YE / YF - 1).loc[1950:2025]
    out["1950-2025_prima_vs_ultima_chiusura"] = {"media": ar_first.mean(), "sd": ar_first.std(ddof=1)}
    # mensili
    me = C.resample("ME").last()
    mr = me.pct_change().dropna()
    mr = mr[mr.index <= pd.Timestamp("2026-06-30")]
    df = pd.DataFrame({"r": mr, "y": mr.index.year, "m": mr.index.month})
    for a, b in [(1928, 2025), (1950, 2025)]:
        s = df[(df.y >= a) & (df.y <= b)]
        piv = s.pivot(index="y", columns="m", values="r")
        out[f"mesi_{a}-{b}"] = {
            "P_pos": {int(k): v for k, v in (piv > 0).mean().items()},
            "media": {int(k): v for k, v in piv.mean().items()},
            "mediana": {int(k): v for k, v in piv.median().items()},
        }
        jul = piv[7]
        yr = ar.loc[a:b]
        aug_dec = (YE / me[me.index.month == 7].groupby(me[me.index.month == 7].index.year).last() - 1).loc[a:b]
        jan_jun = (me[me.index.month == 6].groupby(me[me.index.month == 6].index.year).last() / YE.shift(1) - 1).loc[a:b]
        out[f"luglio_{a}-{b}"] = {
            "media": jul.mean(), "sd": jul.std(ddof=1), "media-1sd": jul.mean() - jul.std(ddof=1),
            "media+1sd": jul.mean() + jul.std(ddof=1),
            "corr_luglio_anno": stats.pearsonr(jul, yr.loc[jul.index])[0],
            "p_luglio_anno": stats.pearsonr(jul, yr.loc[jul.index])[1],
            "corr_luglio_agodic": stats.pearsonr(jul, aug_dec.loc[jul.index])[0],
            "p_luglio_agodic": stats.pearsonr(jul, aug_dec.loc[jul.index])[1],
            "corr_genngiu_lugdic": stats.pearsonr(jan_jun.loc[a:b], (YE / me[me.index.month == 6].groupby(me[me.index.month == 6].index.year).last() - 1).loc[a:b])[0],
        }
    # correlazione meccanica attesa: luglio e' 1/12 della varianza annua circa
    out["corr_meccanica_attesa_sqrt(1/12)"] = float(np.sqrt(1 / 12))
    R["sec2_8"] = out


K_FRAC = 128 / 252


# ============================================================================
# SEZ 4-7: anni analoghi, replica 2026 e test out-of-sample
# ============================================================================
def corr_fn(method):
    if method == "pearson":
        return lambda a, b: np.corrcoef(a, b)[0, 1]
    if method == "spearman":
        return lambda a, b: stats.spearmanr(a, b)[0]
    return lambda a, b: stats.kendalltau(a, b)[0]


def sec4_7():
    paths = year_paths(C)
    K = 128
    full_first = (YE / YF - 1)  # "alla Rea"
    out = {"replica_2026": {}}
    target = paths[2026][:K]
    pool = [y for y in range(1950, 2026)]
    for meth in ["pearson", "spearman", "kendall"]:
        f = corr_fn(meth)
        cs = sorted(((f(target, paths[y][:K]), y) for y in pool), reverse=True)[:5]
        yrs = [y for _, y in cs]
        out["replica_2026"][meth] = {
            "top5": yrs, "corr": [c for c, _ in cs],
            "FY_prima_chiusura_%": [full_first.loc[y] * 100 for y in yrs],
            "media_FY_analoghi": float(np.mean([full_first.loc[y] for y in yrs])),
            "media_resto_anno_analoghi": float(np.mean([paths[y][-1] - 0 for y in yrs]) if False else
                                               np.mean([(1 + paths[y][-1]) / (1 + paths[y][K - 1]) - 1 for y in yrs])),
        }
    # anni citati da Rea: rendimento FY (prima chiusura) per verifica
    fsp = corr_fn("spearman")
    allsp = sorted(((fsp(target, paths[y][:K]), y) for y in pool), reverse=True)
    out["spearman_rank_top8"] = [(y, c) for c, y in allsp[:8]]
    out["FY_prima_chiusura_anni_Rea"] = {y: full_first.loc[y] for y in [2007, 1968, 1978, 1957, 1989, 2009, 2003]}
    out["FY_vera_anni_Rea"] = {y: annual_returns().loc[y] for y in [2007, 1968, 1978, 1957, 1989, 2009, 2003]}
    out["ytd_2026_K"] = target[-1]

    # --- test out-of-sample -------------------------------------------------
    rows = []
    for Y in range(1960, 2026):
        cand = [y for y in range(1950, Y)]
        tgt = paths[Y][:K]
        act_roy = (1 + paths[Y][-1]) / (1 + paths[Y][K - 1]) - 1
        roy = {y: (1 + paths[y][-1]) / (1 + paths[y][K - 1]) - 1 for y in cand}
        naive = np.mean(list(roy.values()))
        rec = {"Y": Y, "actual_roy": act_roy, "naive": naive, "ytd": paths[Y][K - 1],
               "actual_fy": paths[Y][-1]}
        for meth in ["pearson", "spearman", "kendall"]:
            f = corr_fn(meth)
            cs = sorted(((f(tgt, paths[y][:K]), y) for y in cand), reverse=True)
            for k in (5, 10):
                top = [y for _, y in cs[:k]]
                rec[f"{meth}_k{k}"] = np.mean([roy[y] for y in top])
                if k == 5:
                    # forecast "alla Rea": media FY analoghi come previsione dell'anno intero
                    rec[f"{meth}_reaFY"] = np.mean([paths[y][-1] for y in top])
        # analoghi su rendimenti giornalieri (non cumulati)
        dr = np.diff(np.r_[0, tgt])
        cs = sorted(((np.corrcoef(dr, np.diff(np.r_[0, paths[y][:K]]))[0, 1], y) for y in cand), reverse=True)
        rec["pearson_daily_k5"] = np.mean([roy[y] for _, y in cs[:5]])
        # analoghi casuali (benchmark): 5 anni a caso
        rec["random_k5"] = np.mean([roy[y] for y in RNG.choice(cand, 5, replace=False)])
        rows.append(rec)
    df = pd.DataFrame(rows).set_index("Y")
    df.to_csv(OUT / "sec4_7_oos_analoghi.csv")
    ev = {}
    a = df.actual_roy
    mae_naive = (a - df.naive).abs().mean()
    mse_naive = ((a - df.naive) ** 2).mean()
    for col in [c for c in df.columns if c.endswith(("_k5", "_k10"))] + ["naive"]:
        f = df[col]
        r, p = stats.pearsonr(f, a) if f.std() > 0 else (np.nan, np.nan)
        ev[col] = {
            "corr_prev_eff": r, "p": p, "MAE": (a - f).abs().mean(), "MAE/MAE_naive": (a - f).abs().mean() / mae_naive,
            "R2_oos_vs_naive": 1 - ((a - f) ** 2).mean() / mse_naive,
            "hit_segno": float((np.sign(f) == np.sign(a)).mean()),
        }
    # forecast FY alla Rea vs forecast FY corretto (YTD noto + naive ROY)
    fy_correct = (1 + df.ytd) * (1 + df.naive) - 1
    for meth in ["pearson", "spearman", "kendall"]:
        e = df[f"{meth}_reaFY"]
        ev[f"{meth}_reaFY_vs_FY"] = {
            "MAE_reaFY": (df.actual_fy - e).abs().mean(),
            "MAE_YTD+naiveROY": (df.actual_fy - fy_correct).abs().mean(),
            "corr_reaFY_FY": stats.pearsonr(e, df.actual_fy)[0],
        }
    ev["quota_ROY_positivi"] = float((a > 0).mean())
    ev["N_anni_test"] = len(df)
    out["oos"] = ev
    R["sec4_7"] = out


# ============================================================================
# SEZ 9: nuovi massimi YTD
# ============================================================================
def sec9():
    rows = []
    for y, s in C.groupby(C.index.year):
        if y < 1929 or y > 2025:
            continue
        cm = s.cummax()
        nh = (s > cm.shift(1)).astype(int)  # primo giorno escluso
        nh.iloc[0] = 0
        h1 = s[s.index.month <= 6]
        nh_h1 = nh[s.index.month <= 6].sum()
        rows.append({"y": y, "nh": nh.sum(), "nh_h1": nh_h1, "ret": s.iloc[-1] / YE.loc[y - 1] - 1,
                     "ret_h1": h1.iloc[-1] / YE.loc[y - 1] - 1, "ret_h2": s.iloc[-1] / h1.iloc[-1] - 1})
    df_all = pd.DataFrame(rows).set_index("y")
    df_all.to_csv(OUT / "sec9_nuovi_massimi.csv")
    d28 = df_all
    df = df_all.loc[1950:]
    R["sec9_1929+"] = {"corr_nh_ret": stats.pearsonr(d28.nh, d28.ret)[0],
                       "corr_nhH1_retH2": stats.pearsonr(d28.nh_h1, d28.ret_h2)[0],
                       "p_nhH1_retH2": stats.pearsonr(d28.nh_h1, d28.ret_h2)[1],
                       "spearman_nhH1_retH2": stats.spearmanr(d28.nh_h1, d28.ret_h2)[0],
                       "spearman_p": stats.spearmanr(d28.nh_h1, d28.ret_h2)[1]}
    m = sm.OLS(df.ret_h2, sm.add_constant(df[["ret_h1"]])).fit()
    m2 = sm.OLS(df.ret_h2, sm.add_constant(df[["nh_h1", "ret_h1"]])).fit()
    R["sec9"] = {
        "corr_nh_ret": stats.pearsonr(df.nh, df.ret)[0],
        "spearman_nh_ret": stats.spearmanr(df.nh, df.ret)[0],
        "max_nh": int(df.nh.max()), "anno_max": int(df.nh.idxmax()), "nh_1995": int(df.nh.loc[1995]),
        "corr_nhH1_retH2": stats.pearsonr(df.nh_h1, df.ret_h2)[0],
        "p_nhH1_retH2": stats.pearsonr(df.nh_h1, df.ret_h2)[1],
        "corr_retH1_retH2": stats.pearsonr(df.ret_h1, df.ret_h2)[0],
        "p_retH1_retH2": stats.pearsonr(df.ret_h1, df.ret_h2)[1],
        "regr_H2_su_nhH1_e_retH1_p": {"nh_h1": m2.pvalues["nh_h1"], "ret_h1": m2.pvalues["ret_h1"]},
        "R2_H2_su_retH1": m.rsquared,
        "H2_medio_se_nhH1>=mediana": df.ret_h2[df.nh_h1 >= df.nh_h1.median()].mean(),
        "H2_medio_se_nhH1<mediana": df.ret_h2[df.nh_h1 < df.nh_h1.median()].mean(),
        "corr_nhH1_retH1_(stesso_periodo)": stats.pearsonr(df.nh_h1, df.ret_h1)[0],
    }


# ============================================================================
# SEZ 10: bottom dei bear market
# ============================================================================
REA_TROUGHS = ["1957-10-22", "1962-06-26", "1966-10-07", "1970-05-26", "1974-10-03", "1982-08-12",
               "1987-12-04", "1990-10-11", "1998-10-08", "2002-10-09", "2009-03-09", "2020-03-23",
               "2022-10-12", "2025-04-08"]


REA_1Y = {"2025-04-08": 36.81, "2022-10-12": 20.99, "2020-03-23": 74.78, "2009-03-09": 68.57, "2002-10-09": 33.72,
          "1998-10-08": 39.25, "1990-10-11": 27.53, "1987-12-04": 21.41, "1982-08-12": 58.23, "1974-10-03": 34.59,
          "1970-05-26": 44.51, "1966-10-07": 33.21, "1962-06-26": 32.66, "1957-10-22": 31.53}


def ath_episodes(peak_s, trough_s, close, thr=0.20, start="1950-01-01", after_cross=False):
    """Episodi dal massimo storico (peak_s cummax, includendo il pre-1950) al recupero.
    Bear se min(trough_s)/peak <= 1-thr. Trough datato al minimo della CHIUSURA."""
    pk = peak_s.cummax()
    newath = peak_s >= pk  # giorni di massimo storico
    ep_id = newath.cumsum()
    res = []
    for k, idx in close.groupby(ep_id).groups.items():
        seg = close.loc[idx]
        if seg.index[-1] < pd.Timestamp(start):
            continue
        peak = pk.loc[idx[0]]
        mn = trough_s.loc[idx].min()
        dd = mn / peak - 1
        if dd <= -thr:
            # primo giorno in cui la soglia e' superata
            cross = trough_s.loc[idx][trough_s.loc[idx] / peak - 1 <= -thr].index[0]
            # trough = minima CHIUSURA dal giorno di superamento soglia in poi
            tdate = seg.loc[cross:].idxmin() if after_cross else seg.idxmin()
            if tdate >= pd.Timestamp(start):
                res.append({"peak_date": idx[0], "peak": peak, "trough_date": tdate,
                            "trough_close": seg.min(), "dd_rule": dd, "dd_close": seg.min() / close.loc[:idx[0]].max() - 1,
                            "cross_date": cross})
    return pd.DataFrame(res)


def fwd_cal(c, d0, years):
    t = d0 + pd.DateOffset(years=years)
    if t > c.index[-1]:
        return c.iloc[-1] / c.loc[d0] - 1, True
    return c.loc[:t].iloc[-1] / c.loc[d0] - 1, False


def sec10():
    full = SPX_ALL  # serve storia completa per forward
    c = full.close
    hi = full.high.where(full.index >= "1962-01-01", full.close)
    lo = full.low.where(full.index >= "1962-01-01", full.close)
    cD = c.loc[:DOSSIER_DATE]
    rules = {
        "close/close": (cD, cD),
        "high/low": (hi.loc[:DOSSIER_DATE], lo.loc[:DOSSIER_DATE]),
        "close/low": (cD, lo.loc[:DOSSIER_DATE]),
        "high/close": (hi.loc[:DOSSIER_DATE], cD),
    }
    out = {"regole": {}}
    rea = set(pd.to_datetime(REA_TROUGHS))
    for name0, (pk, tr) in rules.items():
      for ac in (False, True):
        name = name0 + (" | trough=min close dopo soglia" if ac else " | trough=min close episodio")
        ep = ath_episodes(pk, tr, cD, after_cross=ac)
        got = set(ep.trough_date)
        out["regole"][name] = {
            "N": len(ep), "coincide_con_Rea": got == rea,
            "mancanti_vs_Rea": sorted(str(x.date()) for x in rea - got),
            "extra_vs_Rea": sorted(str(x.date()) for x in got - rea),
        }
        if name0 == "close/low" and ac:
            ep_main = ep
    # profondita' close-to-close e intraday dei casi borderline
    border = {}
    for a, b in [("1990-07-01", "1990-12-31"), ("1998-07-01", "1998-12-31"), ("2025-02-01", "2025-05-31"),
                 ("2018-09-01", "2018-12-31"), ("2011-04-01", "2011-12-31"), ("1987-08-01", "1987-12-31")]:
        s = cD.loc[a:b]
        h = hi.loc[a:b]
        l = lo.loc[a:b]
        pkd = s.idxmax()
        border[a[:4]] = {
            "close_peak->min_close": s.loc[pkd:].min() / s.max() - 1,
            "high_peak->min_low": l.loc[h.idxmax():].min() / h.max() - 1,
            "close_peak->min_low": l.loc[pkd:].min() / s.max() - 1,
            "data_min_close": str(s.loc[pkd:].idxmin().date()), "data_min_low": str(l.loc[pkd:].idxmin().date()),
            "era_ATH_al_picco": bool(s.max() >= cD.loc[:a].max()),
        }
    out["borderline"] = border
    # 2011: drawdown dal picco locale di aprile (non ATH)
    # forward returns
    H = [1, 2, 3, 5, 10]
    rows = []
    for _, e in ep_main.iterrows():
        rec = {"trough": str(e.trough_date.date()), "cross": str(e.cross_date.date())}
        for h in H:
            v, inc = fwd_cal(c.loc[:DOSSIER_DATE], e.trough_date, h)
            rec[f"T_{h}y"] = v
            rec[f"T_{h}y_incompleto"] = inc
            v2, _ = fwd_cal(c.loc[:DOSSIER_DATE], e.cross_date, h)
            rec[f"X_{h}y"] = v2
        # ingresso dopo rimbalzo +X% dal minimo corrente post-soglia
        for X in (0.10, 0.20):
            seg = c.loc[e.cross_date:DOSSIER_DATE]
            rm = seg.cummax() * 0 + seg.cummin()
            hit = seg[seg >= rm * (1 + X)]
            if len(hit):
                d0 = hit.index[0]
                rec[f"R{int(X*100)}_date"] = str(d0.date())
                for h in H:
                    rec[f"R{int(X*100)}_{h}y"] = fwd_cal(c.loc[:DOSSIER_DATE], d0, h)[0]
        rows.append(rec)
    df = pd.DataFrame(rows)
    # confronto con la tabella Rea (1Y): calendario vs 252 barre
    cc_ = c.loc[:DOSSIER_DATE]
    df["Rea_1y"] = [REA_1Y.get(t, np.nan) for t in df.trough]
    df["T_1y_252barre"] = [cc_.iloc[min(cc_.index.get_loc(pd.Timestamp(t)) + 252, len(cc_) - 1)] / cc_.loc[t] - 1 for t in df.trough]
    df.to_csv(OUT / "sec10_troughs.csv", index=False)
    out["match_1y_calendario_entro_0.1pp"] = int((np.abs(df.T_1y * 100 - df.Rea_1y) < 0.1).sum())
    out["match_1y_252barre_entro_0.1pp"] = int((np.abs(df.T_1y_252barre * 100 - df.Rea_1y) < 0.1).sum())
    # baseline incondizionata: tutti i giorni 1950+ con orizzonte completo
    cc = c.loc["1950":DOSSIER_DATE]
    base = {}
    for h in H:
        vals = []
        idx = cc.index
        tgt = idx + pd.DateOffset(years=h)
        pos = cc.index.searchsorted(tgt, side="right") - 1
        ok = tgt <= cc.index[-1]
        v = cc.values[pos[ok]] / cc.values[ok] - 1
        base[f"{h}y"] = {"media": v.mean(), "mediana": np.median(v), "win": (v > 0).mean(), "N_giorni": int(ok.sum())}
    summ = {}
    for pref, lab in [("T", "trough"), ("X", "soglia_-20%"), ("R10", "rimbalzo+10%"), ("R20", "rimbalzo+20%")]:
        summ[lab] = {}
        for h in H:
            col = f"{pref}_{h}y"
            if col not in df:
                continue
            m = ~df["T_%dy_incompleto" % h]
            v = df.loc[m, col].dropna()
            summ[lab][f"{h}y"] = {"media": v.mean(), "mediana": v.median(), "win": (v > 0).mean(), "N": len(v)}
    out["forward_summary"] = summ
    out["baseline_tutti_i_giorni_1950+"] = base
    R["sec10"] = out


# ============================================================================
# SEZ 12: shuffle a blocchi PAC
# ============================================================================
def pac_irr(rets_matrix):
    """rets_matrix: (S, T) rendimenti mensili; versamento 1 a inizio di ogni mese.
    IRR mensile via bisezione vettoriale, ritorna IRR annuo."""
    S, T = rets_matrix.shape
    growth = np.cumprod((1 + rets_matrix)[:, ::-1], axis=1)[:, ::-1]  # crescita da t a fine
    V = growth.sum(axis=1)
    lo = np.full(S, -0.05)
    hi = np.full(S, 0.05)
    for _ in range(60):
        mid = (lo + hi) / 2
        mid = np.where(np.abs(mid) < 1e-12, 1e-12, mid)
        fv = (1 + mid) * ((1 + mid) ** T - 1) / mid  # somma geometrica sum_{k=1..T}(1+m)^k
        big = fv > V
        hi = np.where(big, mid, hi)
        lo = np.where(big, lo, mid)
    return (1 + (lo + hi) / 2) ** 12 - 1


def sec12(nshuf=2000):
    me = C.resample("ME").last()
    mr = me.pct_change().dropna().loc["1950-01-01":"2026-06-30"]
    years = sorted(set(mr.index.year))
    blocks = {y: mr[mr.index.year == y].values for y in years}
    rows = []
    for s in range(1950, 2022):
        ys = [y for y in years if y >= s]
        real = np.concatenate([blocks[y] for y in ys])
        sims = []
        for _ in range(nshuf):
            perm = RNG.permutation(ys)
            sims.append(np.concatenate([blocks[y] for y in perm]))
        sims = np.array([x for x in sims if len(x) == len(real)])
        irr_real = pac_irr(real[None, :])[0]
        irr_sim = pac_irr(sims)
        # stima con solo 60 shuffle: variabilita' del P10/P90
        p10_60 = [np.percentile(RNG.choice(irr_sim, 60, replace=False), 10) for _ in range(200)]
        last5 = np.prod(1 + real[-66:]) - 1
        rows.append({"start": s, "irr_real": irr_real, "irr_med": np.median(irr_sim),
                     "p10": np.percentile(irr_sim, 10), "p90": np.percentile(irr_sim, 90),
                     "pct_real": (irr_sim < irr_real).mean(), "sd_P10_con_60": np.std(p10_60),
                     "lump_sum_identico": True, "ret_ultimi_66m": last5})
    df = pd.DataFrame(rows).set_index("start")
    df.to_csv(OUT / "sec12_shuffle.csv")
    # effetto punto finale: stessa analisi ma con fine al minimo 2009-02 o 2002-09
    endfx = {}
    for end in ("2002-09-30", "2009-02-28"):
        mr2 = mr.loc[:end]
        pcts = {}
        for s in range(1950, int(end[:4]) - 9, 5):
            seg = mr2.loc[f"{s}-01-01":]
            yy = sorted(set(seg.index.year))
            bl = {y: seg[seg.index.year == y].values for y in yy}
            real = seg.values
            sims = np.array([np.concatenate([bl[y] for y in RNG.permutation(yy)]) for _ in range(1000)])
            pcts[s] = float((pac_irr(sims) < pac_irr(real[None, :])[0]).mean())
        endfx[end] = pcts
    endfx["2026-06-30"] = {int(s): float(df.loc[s].pct_real) for s in range(1950, 2022, 5)}
    # correlazione tra percentile del reale e posizione cronologica dei rendimenti alti
    R["sec12"] = {
        "quota_start_con_reale_sopra_P90": float((df.irr_real > df.p90).mean()),
        "quota_start_2000+_reale_sopra_P90": float((df.loc[2000:].irr_real > df.loc[2000:].p90).mean()),
        "percentile_medio_reale_2000+": float(df.loc[2000:].pct_real.mean()),
        "percentile_medio_reale_1950-1999": float(df.loc[:1999].pct_real.mean()),
        "sd_tipica_P10_con_60_shuffle_pp": float(df.sd_P10_con_60.median() * 100),
        "esempi": df.loc[[1950, 1970, 1990, 2000, 2008, 2015]].to_dict(orient="index"),
        "percentile_reale_per_data_fine": endfx,
    }


# ============================================================================
# SEZ 13: giorni migliori/peggiori dal 1980
# ============================================================================
def sec13():
    r = RET.loc["1980-01-01":DOSSIER_DATE].dropna()
    best = r.nlargest(100)
    worst = r.nsmallest(100)
    g = lambda x: float(np.prod(1 + x))
    rb = r.copy(); rb[best.index] = 0
    rw = r.copy(); rw[worst.index] = 0
    rbw = r.copy(); rbw[best.index] = 0; rbw[worst.index] = 0
    yrs = (r.index[-1] - r.index[0]).days / 365.25
    ends = {"buy_hold": g(r), "senza_best100": g(rb), "senza_worst100": g(rw), "senza_entrambi": g(rbw)}
    cagr = {k: v ** (1 / yrs) - 1 for k, v in ends.items()}
    # 'senza best' sotto il capitale iniziale?
    path_b = (1 + rb).cumprod()
    frac_below1 = float((path_b < 1).mean())
    # distanze
    bi = best.index.sort_values()
    wi = worst.index.sort_values()

    def nearest(src, dst):
        res = []
        for d in src:
            diff = (dst - d).days.values.astype(float)
            j = np.argmin(np.abs(diff))
            res.append(diff[j])
        return np.array(res)

    db = nearest(bi, wi)  # >0: peggiore dopo il migliore
    dw = nearest(wi, bi)
    tab = {}
    for th in (3, 10, 30, 100, 365):
        tab[th] = {
            "B->W dopo": f"{(db[(db > 0)] <= th).sum()}/{(db > 0).sum()}",
            "W->B dopo": f"{(dw[(dw > 0)] <= th).sum()}/{(dw > 0).sum()}",
            "B->W prima": f"{(-db[(db < 0)] <= th).sum()}/{(db < 0).sum()}",
            "W->B prima": f"{(-dw[(dw < 0)] <= th).sum()}/{(dw < 0).sum()}",
            "B: |dist|<=th": f"{(np.abs(db) <= th).sum()}/100", "W: |dist|<=th": f"{(np.abs(dw) <= th).sum()}/100",
        }
    nb_after = int((db > 0).sum()); nw_after = int((dw > 0).sum())
    # episodi indipendenti: raggruppa giorni estremi a meno di 30 gg
    allx = np.sort(np.r_[bi.values, wi.values]).astype("datetime64[D]")
    gaps = np.diff(allx).astype(int)
    n_clusters = int(1 + (gaps > 30).sum())
    # benchmark di permutazione: stessa sequenza di date estreme, etichette casuali best/worst
    dates = pd.DatetimeIndex(np.r_[bi.values, wi.values])
    lab = np.r_[np.ones(100), np.zeros(100)]
    perm_med = []
    for _ in range(2000):
        L = RNG.permutation(lab)
        b = dates[L == 1].sort_values(); w = dates[L == 0].sort_values()
        perm_med.append(np.median(np.abs(nearest(b, w))))
    nxt = r.shift(-1)
    R["sec13"] = {
        "periodo": [str(r.index[0].date()), str(r.index[-1].date())],
        "multipli_finali": ends, "CAGR": cagr, "frac_giorni_senza_best_sotto_capitale_iniziale": frac_below1,
        "best_mu_sd": [best.mean(), best.std(ddof=1)], "worst_mu_sd": [worst.mean(), worst.std(ddof=1)],
        "soglia_best100": best.min(), "soglia_worst100": worst.max(),
        "next_dopo_best_mu_sd": [nxt[best.index].mean(), nxt[best.index].std(ddof=1)],
        "next_dopo_worst_mu_sd": [nxt[worst.index].mean(), nxt[worst.index].std(ddof=1)],
        "next_incond_mu_sd": [r.mean(), r.std(ddof=1)],
        "tabella_soglie": tab,
        "best_con_worst_piu_vicino_DOPO": nb_after, "worst_con_best_piu_vicino_DOPO": nw_after,
        "binom_p_best_after": stats.binomtest(nb_after, 100, 0.5).pvalue,
        "binom_p_worst_after": stats.binomtest(nw_after, 100, 0.5).pvalue,
        "mediana_|dist|_best_gg": float(np.median(np.abs(db))), "mediana_|dist|_worst_gg": float(np.median(np.abs(dw))),
        "mediana_|dist|_permutazione_etichette": float(np.median(perm_med)),
        "cluster_indipendenti_(gap>30gg)": n_clusters,
        "anni_con_piu_estremi": pd.Series(np.r_[bi.year, wi.year]).value_counts().head(6).to_dict(),
    }


# ============================================================================
# SEZ 16: escursione YTD high-low al 10 luglio + ARMA
# ============================================================================
def sec16():
    rows = {}
    for y, s in C.groupby(C.index.year):
        if y < 1945:
            continue
        cut = pd.Timestamp(f"{y}-07-10")
        ss = s.loc[:cut]
        if y >= 1962:
            hh = SPX.high.loc[ss.index].max(); ll = SPX.low.loc[ss.index].min()
        else:
            hh, ll = ss.max(), ss.min()
        rows[y] = {"spread_close": ss.max() / ss.min() - 1, "spread_hl": hh / ll - 1,
                   "(H-L)/first": (hh - ll) / ss.iloc[0], "(H-L)/H": (hh - ll) / hh}
    df = pd.DataFrame(rows).T
    x = df.spread_hl.loc[:2025] * 100
    best = None
    for p in range(3):
        for q in range(3):
            try:
                m = ARIMA(x.values, order=(p, 0, q)).fit()
                if best is None or m.aic < best[0]:
                    best = (m.aic, (p, q), m)
            except Exception:
                pass
    lb = acorr_ljungbox(x.values, lags=[10], return_df=True)
    tr = stats.linregress(np.arange(len(x)), x.values)
    m0 = ARIMA(x.values, order=(0, 0, 0)).fit()
    R["sec16"] = {
        "N_anni": len(x), "media": x.mean(), "mediana": x.median(),
        "2026_hl": df.spread_hl.loc[2026] * 100,
        "pct_2026": stats.percentileofscore(x.values, df.spread_hl.loc[2026] * 100),
        "max": [int(x.idxmax()), x.max()], "min": [int(x.idxmin()), x.min()],
        "spread_1949_close": df.spread_close.loc[1949] * 100,
        "ARMA_best_AIC_(p,q)": best[1], "AIC_best": best[0], "AIC_white_noise": m0.aic,
        "ljungbox_p_lag10_serie": float(lb.lb_pvalue.iloc[0]),
        "trend_slope_pp_anno": tr.slope, "trend_p": tr.pvalue,
        "ADF_p": adfuller(x.values)[1],
        "acf1": float(pd.Series(x.values).autocorr(1)),
        "definizioni_alternative": {k: {"media": df[k].loc[:2025].mean() * 100, "mediana": df[k].loc[:2025].median() * 100,
                                        "2026": df[k].loc[2026] * 100, "max": [int(df[k].loc[:2025].idxmax()), df[k].loc[:2025].max() * 100],
                                        "1975": df[k].loc[1975] * 100, "2020": df[k].loc[2020] * 100}
                                    for k in ["spread_close", "spread_hl", "(H-L)/first", "(H-L)/H"]},
    }


# ============================================================================
# SEZ 17: comprare ai massimi storici
# ============================================================================
HOR = {"3m": 63, "6m": 126, "1y": 252, "2y": 504, "3y": 756, "5y": 1260, "10y": 2520, "15y": 3780,
       "20y": 5040, "30y": 7560}


def ath_vs_any(c, start, ath_ref=None):
    """c: serie (puo' essere ibrida), orizzonti in BARRE come fa un tool generico."""
    ref = c if ath_ref is None else ath_ref
    ath = ref >= ref.cummax()
    ath = ath.reindex(c.index).fillna(False)
    out = {}
    for k, h in HOR.items():
        f = c.shift(-h) / c - 1
        m = (c.index >= pd.Timestamp(start)) & f.notna().values
        a = f[m]
        b = f[m & ath.values]
        out[k] = {"any_mean": a.mean(), "ath_mean": b.mean(), "any_med": a.median(), "ath_med": b.median(),
                  "N_any": int(len(a)), "N_ath": int(len(b))}
    return out, int(ath[c.index >= pd.Timestamp(start)].sum())


def sec17():
    out = {}
    for st in ("1950-01-01", "1928-01-01"):
        res, n_ath = ath_vs_any(C, st, ath_ref=C)
        out[f"giornaliero_da_{st[:4]}"] = res
        out[f"N_ATH_da_{st[:4]}"] = n_ath
    # serie ibrida stile TradingView: mensile fino al 1949, giornaliera dal 1950
    mo = C.loc[:"1949-12-31"].resample("ME").last()
    hyb = pd.concat([mo, C.loc["1950-01-01":]])
    res, n_ath = ath_vs_any(hyb, "1928-01-01", ath_ref=hyb)
    out["ibrida_mensile<1950_giornaliera>=1950"] = res
    out["N_ATH_ibrida"] = n_ath
    # numero di barre ibride / verifica conteggi del fascicolo
    out["barre_giornaliere_1950-01..2026-07-08"] = int(len(C.loc["1950":]))
    R["sec17"] = out


# ============================================================================
# SEZ 18: distanza dalla SMA200
# ============================================================================
def sec18():
    c = C
    sma = c.rolling(200).mean()
    dist = c / sma - 1
    out = {}
    H = {"1w": 5, "1m": 21, "3m": 63}
    m = c.index >= pd.Timestamp("1950-01-01")
    m = m & dist.notna().values
    for k, h in H.items():
        f = fwd(c, h)
        ok = m & f.notna().values
        grp = {"tutti": ok, "sopra+5": ok & (dist >= 0.05).values, "sotto-5": ok & (dist <= -0.05).values,
               "|d|>=5": ok & (dist.abs() >= 0.05).values, "entro±5": ok & (dist.abs() < 0.05).values}
        out[k] = {}
        for g, mm in grp.items():
            v = f[mm]
            out[k][g] = {"media": v.mean(), "mediana": v.median(), "win": (v > 0).mean(), "N": int(mm.sum())}
        # differenza sotto-5 vs tutti con NW
        y = f[ok].values
        d = (dist[ok] <= -0.05).astype(float).values
        b, t, p = nw_tstat(y, d, lags=h)
        n_naive = sm.OLS(y, sm.add_constant(d)).fit()
        out[k]["diff_sotto_vs_resto"] = {"coef": b, "t_NW": t, "p_NW": p, "p_OLS_naive": float(n_naive.pvalues[1])}
        d2 = (dist[ok] >= 0.05).astype(float).values
        b, t, p = nw_tstat(y, d2, lags=h)
        out[k]["diff_sopra_vs_resto"] = {"coef": b, "t_NW": t, "p_NW": p}
    sel = (dist <= -0.05) & m
    ep = (sel & ~sel.shift(1, fill_value=False)).sum()
    sel2 = (dist >= 0.05) & m
    ep2 = (sel2 & ~sel2.shift(1, fill_value=False)).sum()
    out["episodi_indipendenti_sotto-5"] = int(ep)
    out["episodi_indipendenti_sopra+5"] = int(ep2)
    # vol condizionata
    out["vol_ann_fwd21_sotto-5"] = float(RET.rolling(21).std().shift(-21)[sel].mean() * np.sqrt(252))
    out["vol_ann_fwd21_tutti"] = float(RET.rolling(21).std().shift(-21)[m].mean() * np.sqrt(252))
    R["sec18"] = out


# ============================================================================
# SEZ 19: streak, NBBG, P(up|up)
# ============================================================================
def streak_stats(r):
    r = r.dropna()
    r = r[r != 0]
    up = (r > 0).astype(int)
    prev = up.shift(1)
    ok = prev.notna()
    puu = up[ok & (prev == 1)].mean()
    pud = up[ok & (prev == 0)].mean()
    s = np.where(up.values == 1, 1, -1)
    ac1 = np.corrcoef(s[:-1], s[1:])[0, 1]
    nxt = r.shift(-1)
    return {"N": int(len(r)), "P_up": up.mean(), "P(up|up)": puu, "P(up|down)": pud, "acf1_segno": ac1,
            "acf1_rend": float(r.autocorr(1)),
            "E[R+1|up]": nxt[up == 1].mean(), "E[R+1|down]": nxt[up == 0].mean(),
            "max_R+1|up": nxt[up == 1].max(), "min_R+1|down": nxt[up == 0].min(), "max_R": r.max(), "min_R": r.min()}


def sec19():
    out = {}
    r = RET.loc["1950-01-01":].dropna()
    out["giorn_1950+"] = streak_stats(r)
    out["giorn_1928-1949"] = streak_stats(RET.loc["1928-01-01":"1949-12-31"])
    out["giorn_1950-1979"] = streak_stats(RET.loc["1950":"1979"])
    out["giorn_1980-1999"] = streak_stats(RET.loc["1980":"1999"])
    out["giorn_2000+"] = streak_stats(RET.loc["2000":])
    me = C.resample("ME").last().pct_change()
    out["mensile_fine_mese_1928-1949"] = streak_stats(me.loc[:"1949"])
    out["mensile_fine_mese_1928+"] = streak_stats(me)
    mavg = C.resample("ME").mean().pct_change()
    out["mensile_MEDIA_mese_(stile_Shiller)_1928+"] = streak_stats(mavg)
    out["mensile_MEDIA_mese_1950+"] = streak_stats(mavg.loc["1950":])
    out["mensile_fine_mese_1950+"] = streak_stats(me.loc["1950":])
    # serie ibrida stile TVC:SPX: medie mensili (Shiller-like) fino al 1949 + giornaliero dal 1950
    hyb = pd.concat([C.loc[:"1949-12-31"].resample("ME").mean(), C.loc["1950-01-01":]])
    out["IBRIDA_media_mensile<1950+giornaliero"] = streak_stats(hyb.pct_change())
    # bootstrap CI per E[R+1|up/down] 1950+
    up = (r > 0)
    nx = r.shift(-1)
    a = nx[up].dropna().values; b = nx[~up].dropna().values
    bs = lambda v: np.percentile([RNG.choice(v, len(v)).mean() for _ in range(1000)], [2.5, 97.5])
    out["CI95_E[R+1|up]"] = list(bs(a)); out["CI95_E[R+1|down]"] = list(bs(b))
    # streak e NBBG
    upi = (r > 0).astype(int).values
    # streak up/down
    lens = []
    cur = 1
    for i in range(1, len(upi)):
        if upi[i] == upi[i - 1]:
            cur += 1
        else:
            lens.append((upi[i - 1], cur)); cur = 1
    lens.append((upi[-1], cur))
    L = pd.DataFrame(lens, columns=["up", "len"])
    out["streak_len1_up"] = int(((L.up == 1) & (L.len == 1)).sum())
    out["streak_len1_down"] = int(((L.up == 0) & (L.len == 1)).sum())
    out["max_up_streak"] = int(L[L.up == 1].len.max())
    out["max_down_streak"] = int(L[L.up == 0].len.max())
    # data fine max up streak
    run = pd.Series(upi, index=r.index)
    g = (run != run.shift()).cumsum()
    rl = run.groupby(g).transform("size")
    ups = rl[(run == 1)]
    out["data_fine_max_up_streak"] = str(ups[ups == ups.max()].index[-1].date())
    # NBBG
    dbl = (run == 1) & (run.shift(1) == 1)
    nb = []
    cnt = 0
    for v in dbl.values:
        cnt = 0 if v else cnt + 1
        nb.append(cnt)
    nb = pd.Series(nb, index=r.index)
    out["NBBG_max"] = int(nb.max()); out["NBBG_data_max"] = str(nb.idxmax().date())
    out["NBBG_zero_count"] = int((nb == 0).sum())
    # P(up domani | down streak = k)
    ds = []
    cnt = 0
    for v in upi:
        cnt = 0 if v == 1 else cnt + 1
        ds.append(cnt)
    ds = pd.Series(ds, index=r.index)
    nu = run.shift(-1)
    out["P(up|downstreak=k)"] = {int(k): float(nu[ds.clip(upper=5) == k].mean()) for k in range(6)}
    out["N(downstreak=k)"] = {int(k): int((ds.clip(upper=5) == k).sum()) for k in range(6)}
    # rolling 252
    prev = run.shift(1)
    uu = ((run == 1) & (prev == 1)).astype(float).rolling(252).sum() / (prev == 1).astype(float).rolling(252).sum()
    ud = ((run == 1) & (prev == 0)).astype(float).rolling(252).sum() / (prev == 0).astype(float).rolling(252).sum()
    dec = pd.DataFrame({"uu": uu, "ud": ud}).groupby((r.index.year // 10) * 10).mean()
    out["rolling252_media_per_decade"] = {int(k): {"P(up|up)": v.uu, "P(up|down)": v.ud} for k, v in dec.iterrows()}
    out["rolling252_quota_uu>ud"] = float((uu > ud).mean())
    # rolling 252 su barre MENSILI (= finestre di 21 anni) per media-mese
    rr = mavg.dropna(); u = (rr > 0).astype(int); p = u.shift(1)
    uum = ((u == 1) & (p == 1)).rolling(252).sum() / (p == 1).rolling(252).sum()
    udm = ((u == 1) & (p == 0)).rolling(252).sum() / (p == 0).rolling(252).sum()
    out["rolling252_barre_mensili_media_(21anni)"] = {"P(up|up)_range": [uum.min(), uum.max()],
                                                       "P(up|down)_range": [udm.min(), udm.max()]}
    # Working (1960): differenze di medie di un random walk -> acf1 = 0.25 (limite continuo)
    sim = RNG.standard_normal((2000, 21 * 120)).cumsum(axis=1)
    avg = sim.reshape(2000, 120, 21).mean(axis=2)
    dd = np.diff(avg, axis=1)
    out["Working_acf1_simulato_media_21gg"] = float(np.mean([np.corrcoef(x[:-1], x[1:])[0, 1] for x in dd]))
    R["sec19"] = out


# ============================================================================
# SEZ 20: Poisson eventi |r|>=2%
# ============================================================================
def sec20():
    r = RET.loc["1950-01-01":].dropna()
    ev = (r.abs() >= 0.02).astype(int)
    cnt = ev.resample("ME").sum()
    cnt = cnt.loc[:"2026-06-30"]
    lam = cnt.mean()
    var = cnt.var(ddof=1)
    p0_emp = (cnt == 0).mean()
    p0_pois = np.exp(-lam)
    roll12 = cnt.rolling(12).mean()
    # negativa binomiale (momenti)
    me = C.resample("ME").last().loc["1949-12-31":"2026-06-30"]
    out = {"lambda": lam, "var": var, "var/mean": var / lam, "P0_emp": p0_emp, "P0_Poisson": p0_pois,
           "P(>=4)_emp": (cnt >= 4).mean(), "P(>=4)_Poisson": 1 - stats.poisson.cdf(3, lam),
           "lambda_roll12_max": roll12.max(), "data_max": str(roll12.idxmax().date()),
           "acf1_conteggi": float(cnt.autocorr(1)), "acf12_conteggi": float(cnt.autocorr(12))}
    mret = me.pct_change().loc[cnt.index]
    fwdm = {h: (me.shift(-h) / me - 1).loc[cnt.index] for h in (1, 3, 6, 12)}
    rollmax = cnt.rolling(90, min_periods=90).max()
    variants = {
        "statica_lookahead(media_tutti_rollmax90)": pd.Series(rollmax.mean(), index=cnt.index),
        "espandente(media_rollmax90_fino_a_t)": rollmax.expanding().mean(),
    }
    out["varianti"] = {}
    for name, thr in variants.items():
        sig = (cnt > thr) & thr.notna()
        d = {"N_mesi_segnale": int(sig.sum()), "soglia_media": float(thr.dropna().mean())}
        # episodi: segnali separati da >12 mesi
        sd = cnt.index[sig]
        if len(sd):
            gaps = np.diff(sd.year * 12 + sd.month)
            d["episodi_(gap>12m)"] = int(1 + (gaps > 12).sum())
            d["date_segnali"] = [str(x.date())[:7] for x in sd]
        for h, f in fwdm.items():
            base = f.dropna().mean()
            s = f[sig].dropna()
            # p-value con NW sulla dummy
            ok = f.notna()
            b, t, p = nw_tstat(f[ok].values, sig[ok].astype(float).values, lags=h)
            # bootstrap di blocchi casuali: stesso numero di mesi a caso
            d[f"{h}m"] = {"media_segnali": s.mean(), "baseline": base, "lift": s.mean() - base,
                         "N": int(len(s)), "p_NW": p}
        # test a livello di episodio: primo mese di ogni episodio (gap>12m)
        if len(sd):
            firsts = [sd[0]] + [sd[i + 1] for i, g in enumerate(gaps) if g > 12]
            for h, f in fwdm.items():
                v = f.loc[firsts].dropna()
                base = f.dropna()
                d[f"{h}m_episodi"] = {"media": v.mean(), "N": len(v), "baseline": base.mean(),
                                      "p_ttest_vs_baseline": stats.ttest_1samp(v, base.mean()).pvalue if len(v) > 2 else None,
                                      "hit>baseline": float((v > base.mean()).mean())}
        out["varianti"][name] = d
    R["sec20"] = out


# ============================================================================
# SEZ 21: entropia
# ============================================================================
def shannon_window(x, bins=10, mode="adaptive", edges=None):
    if mode == "adaptive":
        h, _ = np.histogram(x, bins=bins)
    else:
        h, _ = np.histogram(np.clip(x, edges[0], edges[-1]), bins=edges)
    p = h[h > 0] / h.sum()
    return -(p * np.log2(p)).sum()


def perm_entropy_series(x, order, window):
    n = len(x)
    # codice dei pattern ordinali
    emb = np.lib.stride_tricks.sliding_window_view(x, order)
    ranks = np.argsort(np.argsort(emb, axis=1), axis=1)
    code = (ranks * (order ** np.arange(order))).sum(axis=1)
    uniq, inv = np.unique(code, return_inverse=True)
    onehot = np.zeros((len(code), len(uniq)))
    onehot[np.arange(len(code)), inv] = 1
    cs = np.cumsum(onehot, axis=0)
    w = window - order + 1
    cnt = cs[w - 1:] - np.r_[np.zeros((1, len(uniq))), cs[:-w]]
    p = cnt / cnt.sum(axis=1, keepdims=True)
    with np.errstate(divide="ignore", invalid="ignore"):
        H = -np.nansum(np.where(p > 0, p * np.log(p), 0), axis=1)
    import math
    H /= np.log(math.factorial(order))
    out = np.full(n, np.nan)
    out[window - 1:] = H
    return out


def sec21():
    r = RET.loc["1950-01-01":].dropna()
    c = C.loc[r.index]
    W = 63
    vals = r.values
    edges = np.percentile(vals, np.linspace(0, 100, 11))
    sh_ad = np.full(len(r), np.nan); sh_fx = np.full(len(r), np.nan)
    for i in range(W - 1, len(r)):
        x = vals[i - W + 1:i + 1]
        sh_ad[i] = shannon_window(x, 10, "adaptive")
        sh_fx[i] = shannon_window(x, 10, "fixed", edges)
    df = pd.DataFrame({"sh_ad": sh_ad, "sh_fx": sh_fx}, index=r.index)
    for order in (3, 4, 5):
        df[f"pe{order}"] = perm_entropy_series(vals, order, 252)
    df["vol63"] = r.rolling(W).std() * np.sqrt(252)
    df["kurt63"] = r.rolling(W).kurt()
    df["maxabs_z"] = r.abs().rolling(W).max() / r.rolling(W).std()
    df["dd"] = c / c.cummax() - 1
    out = {"P33_P67": {k: list(np.nanpercentile(df[k], [33, 67])) for k in ["pe3", "pe4", "pe5", "sh_ad", "sh_fx"]},
           "min_pe3": [float(np.nanmin(df.pe3)), str(df.pe3.idxmin().date())],
           "min_sh_ad": [float(np.nanmin(df.sh_ad)), str(df.sh_ad.idxmin().date())]}
    corr = {}
    for k in ["sh_ad", "sh_fx", "pe3"]:
        corr[k] = {z: float(df[[k, z]].dropna().corr().iloc[0, 1]) for z in ["vol63", "kurt63", "maxabs_z", "dd"]}
    out["corr_entropia_vs_regime"] = corr
    H = {"1m": 21, "3m": 63, "6m": 126, "12m": 252}
    reg = {}
    for k in ["sh_ad", "sh_fx", "pe3"]:
        reg[k] = {}
        terc = pd.qcut(df[k], 3, labels=["bassa", "media", "alta"])
        for hn, h in H.items():
            f = fwd(c, h)
            ok = df[k].notna() & f.notna()
            x = df.loc[ok, k].values; y = f[ok].values
            r_, p_ = stats.pearsonr(x, y)
            b, t, pnw = nw_tstat(y, x, lags=int(1.5 * h))
            neff = ok.sum() / h  # osservazioni non sovrapposte
            tt = r_ * np.sqrt((neff - 2) / (1 - r_ ** 2))
            p_eff = 2 * (1 - stats.t.cdf(abs(tt), neff - 2))
            # controllo per vol
            X = np.column_stack([x, df.loc[ok, "vol63"].values, df.loc[ok, "dd"].values])
            mm = sm.OLS(y, sm.add_constant(X)).fit(cov_type="HAC", cov_kwds={"maxlags": int(1.5 * h)})
            reg[k][hn] = {"r": r_, "p_naive": p_, "p_NW": pnw, "p_Neff": p_eff, "N": int(ok.sum()), "Neff": float(neff),
                          "medie_terzili": {str(a): float(v) for a, v in f[ok].groupby(terc[ok]).mean().items()},
                          "p_NW_entropia_con_controllo_vol_dd": float(mm.pvalues[1])}
    out["entropia_vs_forward"] = reg
    R["sec21"] = out


# ============================================================================
# SEZ 11/14: baseline NDX incondizionata 2010-2026
# ============================================================================
def sec11():
    n = NDX_ALL.close.loc[:DOSSIER_DATE]
    out = {}
    for h in (5, 21, 42, 63, 126, 189, 252):
        f = fwd(n, h).loc["2010-01-01":]
        f = f.dropna()
        out[f"{h}d"] = {"media": f.mean(), "mediana": f.median(), "win": (f > 0).mean(), "N": len(f)}
    # proxy di "giornate di ribasso generalizzato": NDX <= -3% (non abbiamo i componenti)
    r = n.pct_change()
    sel = (r <= -0.03) & (r.index >= "2010-01-01")
    out["proxy_giorni_NDX<=-3%_dal_2010"] = int(sel.sum())
    px = {}
    for h in (5, 21, 63, 126, 252):
        f = fwd(n, h)
        v = f[sel].dropna()
        px[f"{h}d"] = {"media": v.mean(), "N": len(v)}
    out["fwd_dopo_proxy"] = px
    R["sec11"] = out


def main():
    steps = [sec1_3, sec2_8, sec4_7, sec9, sec10, sec12, sec13, sec16, sec17, sec18, sec19, sec20, sec21, sec11]
    for f in steps:
        print(f"... {f.__name__}", flush=True)
        f()
    with open(OUT / "risultati.json", "w") as fh:
        json.dump(rnd(R, 5), fh, indent=1, default=str, ensure_ascii=False)
    print(json.dumps(rnd(R, 4), indent=1, default=str, ensure_ascii=False))


if __name__ == "__main__":
    main()
