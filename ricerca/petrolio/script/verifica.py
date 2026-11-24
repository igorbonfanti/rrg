#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (pandas, codice scritto a parte) dei numeri chiave di backtest.mjs.

Rifà da zero, dalle stesse risposte grezze in ../cache, con un'altra implementazione:
 - la base (mesi dal 1950 seguiti da un calo >= 10% dell'S&P entro 12 mesi);
 - per 16 regole principali: segnali, segnali con esito, segnali seguiti da un calo >= 10%, vantaggio sulla base,
   e lo stesso nei due periodi 1950-1989 e 1990-oggi;
 - gli eventi di calo >= 20% (zigzag) e quanti sono preceduti da un segnale nei 12 mesi prima del massimo;
 - la situazione attuale (Brent e WTI dai massimi di ottobre 2026, S&P dal massimo del 2026).
Definizioni: le stesse scritte in testa a backtest.mjs (non il suo codice).
Confronta con ../risultati.json e scrive ../verifica.json.
Uso: python3 -I ricerca/petrolio/script/verifica.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / "cache"


def fred(sid):
    df = pd.read_csv(CACHE / f"fred_{sid}.csv", na_values=["."])
    df.columns = ["date", "v"]
    df["date"] = pd.to_datetime(df["date"])
    return df.dropna().set_index("date")["v"]


def yahoo(name):
    r = json.loads((CACHE / name).read_text())["chart"]["result"][0]
    s = pd.Series(r["indicators"]["quote"][0]["close"], index=pd.to_datetime(r["timestamp"], unit="s").normalize(), dtype=float)
    s = s.dropna()
    return s[~s.index.duplicated(keep="last")].sort_index()


def mser(s):  # serie mensile con indice Period
    s = s.copy()
    s.index = s.index.to_period("M")
    return s


wti, brent, cpi, rec = mser(fred("WTISPLC")), mser(fred("MCOILBRENTEU")), mser(fred("CPIAUCSL")), mser(fred("USREC"))
spx = yahoo("yahoo_GSPC_1d.json")
spx = spx[spx.index >= "1945-01-01"]
last_complete = min(wti.index.max(), spx.index.max().to_period("M") - 1)
months = pd.period_range("1946-01", last_complete, freq="M")

# CPI noto alla fine del mese t: l'ultimo con mese <= t-1
cpi_full = cpi.reindex(pd.period_range(cpi.index.min(), last_complete, freq="M"))
cpi_known = cpi_full.ffill(limit=2).shift(1)
cpi_ref = cpi[cpi.index <= last_complete].iloc[-1]
series = {"WTI": wti.reindex(months), "Brent": brent.reindex(months)}
for k in ["WTI", "Brent"]:
    series[k + "_real"] = series[k] * cpi_ref / cpi_known.reindex(months)

# esiti: ingresso alla chiusura dell'ultima seduta del mese
mclose = spx.groupby(spx.index.to_period("M")).last()
mlastdate = spx.groupby(spx.index.to_period("M")).apply(lambda x: x.index[-1])
min_after = {}
vals, idx = spx.values, spx.index
pos = {d: i for i, d in enumerate(idx)}
for m in months:
    if m not in mlastdate.index or m + 12 > last_complete:
        continue
    e = pos[mlastdate[m]]
    end = pos[mlastdate[m + 12]]
    min_after[m] = min(1.0, vals[e + 1:end + 1].min() / vals[e]) - 1
fall10 = pd.Series({m: v <= -0.10 for m, v in min_after.items()})


def cond(kind, ser, **p):
    P = series[ser]
    if kind == "R1":
        prevmax = pd.concat([P.shift(k) for k in range(1, p["L"] + 1)], axis=1)
        ok = prevmax.notna().all(axis=1) & P.notna()
        c = P > prevmax.max(axis=1) * (1 + p["X"] / 100)
    elif kind == "R2":
        ok = P.notna() & P.shift(12).notna()
        c = P / P.shift(12) - 1 >= p["Y"] / 100
    else:
        win = pd.concat([P.shift(k) for k in range(p["K"])], axis=1)
        ok = win.notna().all(axis=1)
        c = (win > p["S"]).all(axis=1)
    return c.where(ok)  # NaN dove non definita


def starts(c):
    out, run = [], 0
    for m, v in c.items():
        if pd.isna(v):
            run = 0
        elif v:
            if run >= 6:
                out.append(m)
            run = 0
        else:
            run += 1
    return [m for m in out if m >= pd.Period("1950-01", "M")]


def zig(x):
    s = spx[spx.index >= "1950-01-01"]
    v, d = s.values, s.index
    ev, up, pk, tr = [], True, 0, 0
    for i in range(1, len(v)):
        if up:
            if v[i] > v[pk]:
                pk = i
            elif v[i] <= v[pk] * (1 - x):
                up, tr = False, i
        else:
            if v[i] < v[tr]:
                tr = i
            elif v[i] >= v[tr] * (1 + x):
                ev.append((d[pk], d[tr], v[tr] / v[pk] - 1))
                up, pk = True, i
    if not up:
        ev.append((d[pk], d[tr], v[tr] / v[pk] - 1))
    return ev


PER = {"tutto": ("1950-01", str(last_complete)), "1950-1989": ("1950-01", "1989-12"), "1990-oggi": ("1990-01", str(last_complete))}


def share(ms):
    ms = [m for m in ms if m in fall10.index]
    return len(ms), int(fall10[ms].sum()) if ms else 0


base = {}
for k, (a, b) in PER.items():
    ms = [m for m in fall10.index if pd.Period(a, "M") <= m <= pd.Period(b, "M")]
    n, h = share(ms)
    base[k] = (n, h, round(100 * h / n, 1))

ev20 = zig(0.20)
RULES = {
    "R1_WTI_L12_X0": ("R1", "WTI", dict(L=12, X=0)), "R1_WTI_L36_X0": ("R1", "WTI", dict(L=36, X=0)),
    "R1_WTI_L12_X10": ("R1", "WTI", dict(L=12, X=10)), "R1_WTI_L12_X20": ("R1", "WTI", dict(L=12, X=20)),
    "R1_WTI_real_L36_X0": ("R1", "WTI_real", dict(L=36, X=0)), "R1_WTI_real_L12_X0": ("R1", "WTI_real", dict(L=12, X=0)),
    "R2_WTI_Y50": ("R2", "WTI", dict(Y=50)), "R2_WTI_Y100": ("R2", "WTI", dict(Y=100)), "R2_WTI_real_Y100": ("R2", "WTI_real", dict(Y=100)),
    "R3_WTI_S100_K2": ("R3", "WTI", dict(S=100, K=2)), "R3_WTI_real_S100_K2": ("R3", "WTI_real", dict(S=100, K=2)),
    "R3_WTI_real_S95_K3": ("R3", "WTI_real", dict(S=95, K=3)),
    "R3_Brent_S95_K2": ("R3", "Brent", dict(S=95, K=2)), "R3_Brent_S100_K2": ("R3", "Brent", dict(S=100, K=2)),
    "R3_Brent_S100_K3": ("R3", "Brent", dict(S=100, K=3)), "R3_Brent_real_S100_K2": ("R3", "Brent_real", dict(S=100, K=2)),
}
mine = {}
for rid, (kind, ser, p) in RULES.items():
    c = cond(kind, ser, **p)
    sig = starts(c)
    first = c.first_valid_index()
    row = {"segnali": [str(m) for m in sig]}
    for k, (a, b) in PER.items():
        ms = [m for m in sig if pd.Period(a, "M") <= m <= pd.Period(b, "M")]
        n, h = share(ms)
        row[k] = {"n": len(ms), "n_esito12": n, "calo10": h, "vantaggio": round(100 * h / n - base[k][2], 1) if n else None}
    # eventi >= 20%: finestra di 12 mesi prima del massimo coperta dalla regola (+6 mesi di avvio)
    elig = [e for e in ev20 if e[0].to_period("M") - 12 >= first + 6]
    det = 0
    for pk, _, _ in elig:
        if any(mlastdate[m] <= pk and m >= pk.to_period("M") - 12 for m in sig):
            det += 1
    row["eventi20"] = f"{det}/{len(elig)}"
    mine[rid] = row


def peak(s, start):
    s = s[s.index >= start]
    d = s.idxmax()
    after = s[s.index > d]
    return {"massimo": [str(d.date()), round(s[d], 2)], "ultimo": [str(s.index[-1].date()), round(s.iloc[-1], 2)],
            "calo_pct": round((s.iloc[-1] / s[d] - 1) * 100, 1), "calo_max_pct": round((after.min() / s[d] - 1) * 100, 1) if len(after) else None}


now = {
    "brent_Yahoo_BZF_da_ottobre": peak(yahoo("yahoo_BZF_1d.json"), "2026-10-01"),
    "wti_Yahoo_CLF_da_ottobre": peak(yahoo("yahoo_CLF_1d.json"), "2026-10-01"),
    "brent_giornaliero_FRED_da_ottobre": peak(fred("DCOILBRENTEU"), "2026-10-01"),
    "sp500_2026": peak(spx, "2026-01-01"),
}

# confronto con backtest.mjs
R = json.loads((HERE.parent / "risultati.json").read_text())
js = {r["id"]: r for r in R["regole"]}
diff = []
for k in PER:
    jb = R["base"][k]
    if (jb["n_esito12"], jb["calo10_12m"], jb["quota_calo10"]) != base[k]:
        diff.append(f"base {k}: js {jb['n_esito12']},{jb['calo10_12m']},{jb['quota_calo10']} py {base[k]}")
for rid, row in mine.items():
    j = js[rid]
    if j["segnali"] != row["segnali"]:
        diff.append(f"{rid} segnali js {j['segnali']} py {row['segnali']}")
    for k in PER:
        a, b = j["periodi"][k], row[k]
        if (a["n"], a["n_esito12"], a["calo10_12m"], a["vantaggio_calo10"]) != (b["n"], b["n_esito12"], b["calo10"], b["vantaggio"]):
            diff.append(f"{rid} {k}: js {a['n']},{a['n_esito12']},{a['calo10_12m']},{a['vantaggio_calo10']} py {b}")
    je = f"{j['eventi']['calo20']['avvisati']}/{j['eventi']['calo20']['eventi']}"
    if je != row["eventi20"]:
        diff.append(f"{rid} eventi20 js {je} py {row['eventi20']}")
if [(str(a.date()), round(c * 100, 1)) for a, _, c in ev20] != [(e["peak"], e["calo"]) for e in R["eventi"]["calo20"]]:
    diff.append("eventi >= 20% diversi")
for k, v in now.items():
    a = R["adesso"][k]
    if (a["massimo"], a["ultimo"], a["calo_pct"], a["calo_max_pct"]) != (v["massimo"], v["ultimo"], v["calo_pct"], v["calo_max_pct"]):
        diff.append(f"adesso {k}: js {a} py {v}")

out = {"ultimo_mese_completo": str(last_complete), "base": base, "regole": mine, "eventi20": len(ev20), "adesso": now, "differenze": diff}
(HERE.parent / "verifica.json").write_text(json.dumps(out, indent=1, ensure_ascii=False, default=str))
print("base", base)
for rid, row in mine.items():
    print(f"{rid:24s} {row['tutto']} | 50-89 {row['1950-1989']['calo10']}/{row['1950-1989']['n_esito12']} | 90- {row['1990-oggi']['calo10']}/{row['1990-oggi']['n_esito12']} | ev20 {row['eventi20']}")
print(now)
print("DIFFERENZE:", len(diff))
for d in diff:
    print(" ", d)
sys.exit(1 if diff else 0)
