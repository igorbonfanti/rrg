#!/usr/bin/env python3
"""
Verifica indipendente delle sezioni 11, 14, 30, 31 del fascicolo "Quant Rea" (breadth / drawdown).

Dati: membership point-in-time S&P 500 (snapshot alle date di variazione, forward-fill),
prezzi giornalieri (close split-adjusted; adj_close total-return), ^GSPC e ^NDX da CSV.

Uscite: tabelle markdown + CSV in OUT (vedi sotto). Esecuzione:
  PYTHONPATH=<scratchpad>/data-probe/pylib python3 verifica_breadth.py
"""
import os
import sys
import numpy as np
import pandas as pd

S = os.environ.get(
    "QR_SCRATCH",
    "/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad",
)
D = f"{S}/data-probe/jb"
QR = f"{S}/qr"
OUT = f"{QR}/out3"
os.makedirs(OUT, exist_ok=True)

START = pd.Timestamp("1996-01-02")
H = [5, 21, 42, 63, 126, 189, 252]
GAP = 10          # sessioni minime tra episodi
NBOOT = 20000
RNG = np.random.default_rng(42)

md = []           # righe markdown delle tabelle


def P(*a):
    print(*a, flush=True)


def mdtable(df, fmt="{:.2f}", index=True):
    d = df.copy()
    if index:
        d = d.reset_index()
    cols = [str(c) for c in d.columns]
    out = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    for _, row in d.iterrows():
        cells = []
        for v in row.values:
            if isinstance(v, (float, np.floating)):
                cells.append("" if np.isnan(v) else fmt.format(v))
            elif isinstance(v, pd.Timestamp):
                cells.append(v.strftime("%Y-%m-%d"))
            else:
                cells.append(str(v))
        out.append("| " + " | ".join(cells) + " |")
    return "\n".join(out)


def H2(t):
    md.append(f"\n## {t}\n")


def H3(t):
    md.append(f"\n### {t}\n")


def T(df, fmt="{:.2f}", index=True, note=None):
    md.append(mdtable(df, fmt, index))
    if note:
        md.append(f"\n_{note}_\n")
    md.append("")


# ----------------------------------------------------------------------------- indici
def load_idx(name):
    df = pd.read_csv(f"{QR}/{name}.csv", parse_dates=["date"])
    return df.set_index("date")["close"].astype("float64").sort_index()


spx = load_idx("spx")
ndx = load_idx("ndx")
FWD = pd.DataFrame({h: spx.shift(-h) / spx - 1 for h in H}) * 100      # % forward ^GSPC
FWD_NDX = pd.DataFrame({h: ndx.shift(-h) / ndx - 1 for h in H}) * 100

# ----------------------------------------------------------------------------- prezzi
P("carico prezzi ...")
px = pd.read_parquet(f"{D}/prices.parquet", columns=["date", "ticker", "close", "adj_close"])
px = px[px.date >= "1995-01-01"]
px["close"] = px["close"].astype("float32")
px["adj_close"] = px["adj_close"].astype("float32")
C = px.pivot(index="date", columns="ticker", values="close")
A = px.pivot(index="date", columns="ticker", values="adj_close")
del px
last_px = C.index.max()
dates = spx.index[(spx.index >= C.index.min()) & (spx.index <= last_px)]
C = C.reindex(dates)
A = A.reindex(dates)
tick = C.columns
P("prezzi", C.shape, dates.min().date(), dates.max().date())

rc = C / C.shift(1) - 1
ra = A / A.shift(1) - 1
# rendimento di prezzo; nei giorni di corporate action non riflessa nel close (spin-off ecc.)
# |rc-ra|>5pp si usa il rendimento adjusted
ca_mask = (rc - ra).abs() > 0.05
R1 = rc.where(~ca_mask, ra).astype("float32")
n_ca = int(ca_mask.values.sum())
PI = (1 + R1.fillna(0)).cumprod()        # indice di prezzo per titolo (gap interni = 0)
PI = PI.where(C.notna())

ri = spx.reindex(dates)
RI = {k: (ri / ri.shift(k) - 1) for k in (1, 21, 63)}
RK = {1: R1}
for k in (21, 63):
    RK[k] = (PI / PI.shift(k) - 1).astype("float32")

# ----------------------------------------------------------------------------- membership
P("membership ...")
mem = pd.read_parquet(f"{D}/members.parquet")
mi = pd.read_parquet(f"{D}/membership_intervals.parquet")
mem["v"] = 1.0
snap = mem.pivot_table(index="date", columns="ticker", values="v", aggfunc="max", fill_value=0.0)
cur_list = sorted(snap.columns[snap.iloc[-1] > 0])
cur_date = snap.index[-1]
all_members = sorted(set(mi.ticker))
no_px = sorted(set(all_members) - set(tick))
snapx = snap.reindex(columns=tick, fill_value=0.0)
MEM = snapx.reindex(snapx.index.union(dates)).ffill().reindex(dates).fillna(0.0) > 0.5
MEM.loc[dates < START, :] = False
CURM = pd.DataFrame(False, index=dates, columns=tick)
cur_in = [t for t in cur_list if t in tick]
CURM.loc[dates >= START, cur_in] = True
P("membri attuali", len(cur_list), "con prezzi", len(cur_in), "| ticker membri senza prezzi", len(no_px))

U = {"PIT": MEM, "CUR": CURM}
# ----------------------------------------------------------------------------- serie breadth
P("breadth ...")
B = {}
for u, M in U.items():
    v1 = M & R1.notna()
    n1 = v1.sum(axis=1)
    B[(u, "N")] = n1
    B[(u, "adv")] = ((R1 > 0) & v1).sum(axis=1) / n1 * 100
    B[(u, "drop5_n")] = ((R1 <= -0.05) & v1).sum(axis=1)
    B[(u, "drop5")] = B[(u, "drop5_n")] / n1 * 100
    for k in (1, 21, 63):
        vk = M & RK[k].notna()
        nk = vk.sum(axis=1)
        cnt = (RK[k].gt(RI[k], axis=0) & vk).sum(axis=1)
        B[(u, f"out{k}_n")] = cnt
        B[(u, f"out{k}")] = cnt / nk * 100
    B[(u, "drop5_r5")] = B[(u, "drop5_n")].rolling(5).sum()
    B[(u, "drop5p_r5")] = B[(u, "drop5")].rolling(5).sum()
BR = pd.DataFrame(B)
BR = BR[BR.index >= START]
# scarta le code con aggiornamento parziale dei prezzi (es. ultimo giorno con poche decine di titoli)
full = BR.index[BR[("PIT", "N")] >= 0.9 * BR[("PIT", "N")].rolling(20, min_periods=1).median().shift(1).fillna(0)]
BR = BR.loc[:full.max()]
BR.columns = [f"{a}_{b}" for a, b in BR.columns]
BR.to_csv(f"{OUT}/breadth_daily.csv", float_format="%.3f")
idx = BR.index

# overlap & copertura
ov = (MEM & CURM & R1.notna()).sum(axis=1).reindex(idx)
cov = pd.DataFrame({
    "membri PIT (snapshot, tutti)": snap.reindex(snap.index.union(idx)).ffill().reindex(idx).sum(axis=1),
    "membri PIT con serie prezzi": MEM.sum(axis=1).reindex(idx),
    "PIT con prezzo": BR["PIT_N"],
    "CUR con prezzo": BR["CUR_N"],
    "PIT∩CUR": ov,
})
cov_y = cov.groupby(idx.year).mean()

md.append("# Verifica breadth (sez. 11, 14, 30, 31) — tabelle generate da verifica_breadth.py\n")
md.append(f"Prezzi fino al {last_px.date()}; membri attuali = snapshot {cur_date.date()} ({len(cur_list)} ticker, {len(cur_in)} con prezzi). "
          f"Ticker mai membri dal 1996: {len(all_members)}; senza alcun prezzo: {len(no_px)}. "
          f"Giorni-titolo con corporate action corretta (|r_close − r_adj| > 5pp): {n_ca}.\n")
H2("0. Copertura universi (media annua del numero di titoli con rendimento valido)")
T(cov_y.iloc[::2], "{:.0f}", note="PIT = membri dell'indice in quella data con prezzo; CUR = membri di oggi (survivorship). Righe ad anni alterni.")

# ----------------------------------------------------------------------------- A. survivorship
P("A ...")
H2("A. Survivorship: PIT vs membri attuali")
meas = ["adv", "out1", "out21", "out63", "drop5"]
rowsA = []
for per, lo in (("1996+", "1996"), ("2010+", "2010"), ("1996-2009", None)):
    sl = BR.loc[lo:] if lo else BR.loc["1996":"2009"]
    for m in meas:
        a, b = sl[f"PIT_{m}"], sl[f"CUR_{m}"]
        g = b - a
        rowsA.append({"periodo": per, "misura": m, "media PIT": a.mean(), "media CUR": b.mean(),
                      "gap medio CUR−PIT": g.mean(), "|gap| medio": g.abs().mean(),
                      "corr livelli": a.corr(b), "corr Δ giornaliere": a.diff().corr(b.diff())})
TA = pd.DataFrame(rowsA).set_index(["periodo", "misura"])
T(TA, note="Valori in punti percentuali (adv = % in rialzo; outK = % che batte ^GSPC su K sedute; drop5 = % con r ≤ −5%).")

gy = pd.DataFrame({m: (BR[f"CUR_{m}"] - BR[f"PIT_{m}"]).groupby(idx.year).mean() for m in meas})
H3("Gap medio annuo CUR − PIT (pp)")
gy.index = gy.index.astype(str)
T(gy, "{:+.2f}")
H3("Anni peggiori per gap su out63 e out21")
T(gy.reindex(gy["out63"].abs().sort_values(ascending=False).index[:6])[["out21", "out63"]], "{:+.2f}")

# date-segnale diverse
H3("Concordanza date-segnale PIT vs CUR")
rows = []
for lab, m, thr, below in (("adv<10%", "adv", 10, True), ("adv<15%", "adv", 15, True),
                           ("out63<35%", "out63", 35, True), ("out63>65%", "out63", 65, False),
                           ("out21<30%", "out21", 30, True), ("out21>70%", "out21", 70, False)):
    for per in ("1996", "2010"):
        sl = BR.loc[per:]
        a = sl[f"PIT_{m}"] < thr if below else sl[f"PIT_{m}"] > thr
        b = sl[f"CUR_{m}"] < thr if below else sl[f"CUR_{m}"] > thr
        rows.append({"segnale": lab, "dal": per, "giorni PIT": int(a.sum()), "giorni CUR": int(b.sum()),
                     "comuni": int((a & b).sum()), "Jaccard": (a & b).sum() / max((a | b).sum(), 1)})
T(pd.DataFrame(rows).set_index(["segnale", "dal"]), "{:.2f}")

# ----------------------------------------------------------------------------- utilità eventi
def episodes(sig, gap=GAP):
    """sig: Series bool sull'indice di trading. Ritorna date di inizio episodio."""
    d = sig[sig].index
    if len(d) == 0:
        return d
    pos = np.searchsorted(idx, d)
    keep = np.r_[True, np.diff(pos) >= gap]
    return d[keep]


def fwd_stats(ev_dates, lo, hi, fwd=FWD, boot=True):
    """media forward sugli eventi vs baseline incondizionata sullo stesso periodo."""
    base_days = fwd.loc[lo:hi]
    ev = fwd.reindex(ev_dates)
    res = {}
    for h in H:
        bh = base_days[h].dropna()
        eh = ev[h].dropna()
        n = len(eh)
        r = {"n": n, "media": eh.mean() if n else np.nan, "mediana": eh.median() if n else np.nan,
             "hit%": (eh > 0).mean() * 100 if n else np.nan, "base": bh.mean(), "base hit%": (bh > 0).mean() * 100}
        r["eccesso"] = r["media"] - r["base"]
        if boot and n >= 2:
            sims = RNG.choice(bh.values, size=(NBOOT, n), replace=True).mean(1)
            r["p(boot)"] = (sims >= r["media"]).mean()
        else:
            r["p(boot)"] = np.nan
        res[h] = r
    return pd.DataFrame(res).T


def summarize(label, ev, lo, hi, hs=(5, 21, 63, 126, 252), fwd=FWD):
    st = fwd_stats(ev, lo, hi, fwd)
    row = {"evento": label, "n": int(st.loc[hs[-1], "n"]) if len(ev) else 0}
    for h in hs:
        row[f"{h}g"] = st.loc[h, "media"]
        row[f"ecc{h}"] = st.loc[h, "eccesso"]
    row["p252"] = st.loc[252, "p(boot)"]
    row["p63"] = st.loc[63, "p(boot)"]
    row["hit252"] = st.loc[252, "hit%"]
    return row


def base_row(lo, hi, hs=(5, 21, 63, 126, 252), fwd=FWD):
    b = fwd.loc[lo:hi]
    row = {"evento": "BASELINE (tutti i giorni)", "n": int(b[252].notna().sum())}
    for h in hs:
        row[f"{h}g"] = b[h].mean()
        row[f"ecc{h}"] = 0.0
    row["hit252"] = (b[252].dropna() > 0).mean() * 100
    return row


DD252 = (spx / spx.rolling(252, min_periods=1).max() - 1) * 100


def base_dd_row(lo, hi, thr, hs=(5, 21, 63, 126, 252)):
    """baseline condizionata: tutti i giorni con ^GSPC in drawdown ≤ thr% dal massimo a 252 sedute."""
    sel = DD252.loc[lo:hi] <= thr
    b = FWD.loc[lo:hi][sel.reindex(FWD.loc[lo:hi].index, fill_value=False)]
    row = {"evento": f"BASELINE condiz.: giorni con SPX DD52s ≤ {thr}%", "n": int(b[252].notna().sum())}
    base = FWD.loc[lo:hi]
    for h in hs:
        row[f"{h}g"] = b[h].mean()
        row[f"ecc{h}"] = b[h].mean() - base[h].mean()
    row["hit252"] = (b[252].dropna() > 0).mean() * 100
    return row


# ----------------------------------------------------------------------------- B. sez 11 su SPX
P("B ...")
H2("B. Logica sez. 11 sull'S&P 500 (advancing% PIT, segnale = adv% < soglia)")
adv = BR["PIT_adv"]
ri1 = RI[1].reindex(idx) * 100
H3("Frequenza dei segnali")
rows = []
for thr in (2, 5, 10, 15):
    s = adv < thr
    for per in ("1996", "2010"):
        ss = s.loc[per:]
        rows.append({"soglia": f"<{thr}%", "dal": per, "giorni segnale": int(ss.sum()),
                     "episodi (gap≥10)": len(episodes(ss.reindex(idx, fill_value=False).loc[per:]))})
T(pd.DataFrame(rows).set_index(["soglia", "dal"]), "{:.0f}")
md.append(f"Giorni con adv% PIT < 2%: {', '.join(d.strftime('%Y-%m-%d') for d in adv[adv < 2].index)}\n")
md.append(f"Minimo storico adv% PIT: {adv.min():.2f}% il {adv.idxmin().date()}.\n")

hs = (5, 21, 63, 126, 252)
for per, lo, hi in (("1996+", "1996-01-01", "2026-12-31"), ("2010+", "2010-01-01", "2026-12-31")):
    H3(f"Rendimenti forward ^GSPC (%), periodo {per}")
    rows = [base_row(lo, hi), base_dd_row(lo, hi, -10), base_dd_row(lo, hi, -20)]
    for thr in (2, 5, 10, 15):
        s = (adv < thr).loc[lo:hi]
        sd = s[s].index
        if len(sd) == 0:
            continue
        rows.append(summarize(f"adv<{thr}% tutti i giorni", sd, lo, hi))
        ep = episodes(s)
        rows.append(summarize(f"adv<{thr}% episodi", ep, lo, hi))
        # analogo solo-prezzo: stesso numero di giorni, peggiori rendimenti giornalieri SPX
        r_per = ri1.loc[lo:hi]
        q = r_per.nsmallest(len(sd)).max()
        sp = r_per <= q
        rows.append(summarize(f"  analogo prezzo: SPX r1 ≤ {q:.2f}% episodi", episodes(sp), lo, hi))
    T(pd.DataFrame(rows).set_index("evento"), "{:.2f}",
      note="eccH = media evento − baseline incondizionata dello stesso periodo; p = bootstrap (estrazione casuale di n giorni dal periodo, 20.000 rep.), P(media casuale ≥ osservata). 'analogo prezzo' = stesso numero di giorni scelti solo sul rendimento giornaliero dell'indice.")

H3("NDX: rendimento forward 252g incondizionato 2010–2025 (confronto con '+11% dopo i segnali')")
nd = FWD_NDX.loc["2010-01-01":"2025-12-31", 252].dropna()
sp_ = FWD.loc["2010-01-01":"2025-12-31", 252].dropna()
rows = [{"serie": "NDX tutti i giorni 2010–2025", "n": len(nd), "media 252g": nd.mean(), "mediana": nd.median(),
         "hit%": (nd > 0).mean() * 100, "min": nd.min(), "max": nd.max()},
        {"serie": "SPX tutti i giorni 2010–2025", "n": len(sp_), "media 252g": sp_.mean(), "mediana": sp_.median(),
         "hit%": (sp_ > 0).mean() * 100, "min": sp_.min(), "max": sp_.max()}]
for thr in (5, 10, 15):
    ep = episodes((adv < thr).loc["2010":"2025"])
    e = FWD_NDX.reindex(ep)[252].dropna()
    rows.append({"serie": f"NDX dopo episodi SPX adv<{thr}%", "n": len(e), "media 252g": e.mean(), "mediana": e.median(),
                 "hit%": (e > 0).mean() * 100, "min": e.min(), "max": e.max()})
T(pd.DataFrame(rows).set_index("serie"))
ndx_cagr = (ndx.loc[:"2025-12-31"].iloc[-1] / ndx.loc["2010-01-01":].iloc[0]) ** (1 / 16) - 1
md.append(f"CAGR NDX (prezzo) 2010-01 → 2025-12: {ndx_cagr*100:.2f}%/anno.\n")

# ----------------------------------------------------------------------------- C. sez 14 soglia dinamica
P("C ...")
H2("C. Sez. 14: conteggio sovraperformanti e 'soglia dinamica = media dei massimi mobili'")
WIN = {"G": 105, "S": 52, "M": 12}


def resample(s, f):
    if f == "G":
        return s
    rule = "W-FRI" if f == "S" else "ME"
    return s.resample(rule).last().dropna()


def dyn_thr(s, w):
    rmax = s.rolling(w).max()
    return {"A_rollmean": rmax.rolling(w).mean(), "B_expmean": rmax.expanding().mean(), "rmax": rmax}


rows = []
yrows = {}
for u in ("PIT", "CUR"):
    for f, w in WIN.items():
        cnt = resample(BR[f"{u}_out1_n"].astype(float), f)
        th = dyn_thr(cnt, w)
        thA = th["A_rollmean"]
        rm = cnt.rolling(w).mean()
        rs = cnt.rolling(w).std()
        nN = resample(BR[f"{u}_N"].astype(float), f).rolling(w).mean()
        ok = thA.notna() & rm.notna()
        X = np.column_stack([np.ones(ok.sum()), rm[ok], rs[ok]])
        beta, *_ = np.linalg.lstsq(X, thA[ok].values, rcond=None)
        pred = X @ beta
        r2 = 1 - ((thA[ok] - pred) ** 2).sum() / ((thA[ok] - thA[ok].mean()) ** 2).sum()
        rows.append({"universo": u, "freq": f, "w": w,
                     "% periodi sotto soglia A": (cnt[ok] < thA[ok]).mean() * 100,
                     "% sotto soglia B": (cnt[ok] < th["B_expmean"][ok]).mean() * 100,
                     "soglia A − media mobile": (thA[ok] - rm[ok]).mean(),
                     "corr(soglia A, media mobile)": thA[ok].corr(rm[ok]),
                     "corr(soglia A, N titoli)": thA[ok].corr(nN[ok]),
                     "R² soglia~media+std": r2})
        if f == "G":
            yrows[u] = pd.DataFrame({"N medio": BR[f"{u}_N"].groupby(idx.year).mean(),
                                     "conteggio medio": cnt.groupby(cnt.index.year).mean(),
                                     "soglia A media": thA.groupby(thA.index.year).mean(),
                                     "soglia A in % di N": (thA / BR[f"{u}_N"]).groupby(idx.year).mean() * 100})
T(pd.DataFrame(rows).set_index(["universo", "freq"]), "{:.2f}",
  note="Soglia A = media mobile (w) del massimo mobile (w); soglia B = media espansiva del massimo mobile. Conteggio = n. titoli con r1 > r1(^GSPC).")
H3("Andamento annuo (giornaliero, w=105): il livello della soglia segue il numero di titoli disponibili")
yy = pd.concat(yrows, axis=1)
yy.columns = [f"{a} {b}" for a, b in yy.columns]
sd_y = BR["PIT_out1_n"].groupby(idx.year).std()
p99_y = BR["PIT_out1_n"].groupby(idx.year).quantile(0.99)
yy["PIT dev.std conteggio"] = sd_y
yy["PIT p99 conteggio"] = p99_y
yy = yy.loc[[y for y in yy.index if y % 2 == 0 or y >= 2024]]
yy.index = yy.index.astype(str)
T(yy, "{:.1f}")
last = BR.index[-1]
md.append(f"Ultimo dato ({last.date()}): sovraperformanti giornalieri PIT {int(BR['PIT_out1_n'].iloc[-1])}/{int(BR['PIT_N'].iloc[-1])}, "
          f"CUR {int(BR['CUR_out1_n'].iloc[-1])}/{int(BR['CUR_N'].iloc[-1])}. Ultimi 10 giorni PIT: "
          f"{', '.join(str(int(x)) for x in BR['PIT_out1_n'].iloc[-10:])}.\n")
md.append(f"Distribuzione giornaliera PIT out1 (conteggio, 2010+): p1={BR.loc['2010':,'PIT_out1_n'].quantile(.01):.0f}, "
          f"p5={BR.loc['2010':,'PIT_out1_n'].quantile(.05):.0f}, mediana={BR.loc['2010':,'PIT_out1_n'].median():.0f}, "
          f"p95={BR.loc['2010':,'PIT_out1_n'].quantile(.95):.0f}, p99={BR.loc['2010':,'PIT_out1_n'].quantile(.99):.0f}.\n")

H3("Forward ^GSPC: conteggio sotto vs sopra la soglia dinamica (PIT, soglia A)")
rows = []
for f, w in WIN.items():
    cnt = resample(BR["PIT_out1_n"].astype(float), f)
    thA = dyn_thr(cnt, w)["A_rollmean"]
    ok = thA.notna()
    for lab, sel in (("sotto soglia", cnt < thA), ("sopra soglia", cnt >= thA), ("< 0.6×soglia", cnt < 0.6 * thA)):
        d = cnt[ok & sel].index
        # mappa le date settimanali/mensili all'ultimo giorno di trading ≤ data
        d = idx[np.searchsorted(idx, d, side="right") - 1]
        for per in ("1996", "2010"):
            dd = d[d >= pd.Timestamp(per)]
            base = FWD.loc[per:]
            e = FWD.reindex(dd)
            rows.append({"freq": f, "condizione": lab, "dal": per, "n": len(dd),
                         "% del tempo": len(dd) / ok[ok.index >= pd.Timestamp(per)].sum() * 100,
                         "21g": e[21].mean(), "ecc21": e[21].mean() - base[21].mean(),
                         "63g": e[63].mean(), "ecc63": e[63].mean() - base[63].mean(),
                         "252g": e[252].mean(), "ecc252": e[252].mean() - base[252].mean()})
T(pd.DataFrame(rows).set_index(["freq", "condizione", "dal"]), "{:.2f}")

H3("Forward ^GSPC per quintile di % sovraperformanti (PIT, quintili sul campione 1996+)")
rows = []
for m in ("out1", "out21", "out63"):
    x = BR[f"PIT_{m}"]
    q = pd.qcut(x, 5, labels=[1, 2, 3, 4, 5])
    for qq in (1, 2, 3, 4, 5):
        d = x.index[q == qq]
        e = FWD.reindex(d)
        rows.append({"misura": m, "quintile": qq, "range %": f"{x[q == qq].min():.0f}–{x[q == qq].max():.0f}",
                     "21g": e[21].mean(), "63g": e[63].mean(), "126g": e[126].mean(), "252g": e[252].mean()})
b = FWD.loc["1996":]
rows.append({"misura": "base", "quintile": "-", "range %": "-", "21g": b[21].mean(), "63g": b[63].mean(),
             "126g": b[126].mean(), "252g": b[252].mean()})
T(pd.DataFrame(rows).set_index(["misura", "quintile"]), "{:.2f}")

# correlazioni di rango
H3("Correlazione di rango (Spearman) tra livello della misura e forward ^GSPC — 1996+ / 2010+")
rows = []
for m in ("adv", "out1", "out21", "out63", "drop5", "drop5p_r5"):
    for per in ("1996", "2010"):
        x = BR.loc[per:, f"PIT_{m}"]
        r = {"misura": m, "dal": per}
        for h in (21, 63, 252):
            y = FWD[h].reindex(x.index)
            ok = y.notna() & x.notna()
            r[f"rho {h}g"] = x[ok].rank().corr(y[ok].rank())
        rows.append(r)
T(pd.DataFrame(rows).set_index(["misura", "dal"]), "{:+.3f}",
  note="Osservazioni giornaliere sovrapposte: i rho non vanno letti con errori standard iid (n effettivo molto più piccolo).")

# ----------------------------------------------------------------------------- D. sez 31
P("D ...")
H2("D. Sez. 31: titoli con calo giornaliero ≤ −5%, somma mobile 5 giorni")
H3("Picchi negli episodi noti")
rows = []
for lab, lo, hi in (("2000-02 dot-com", "2000-03-01", "2002-12-31"), ("2008-09 GFC", "2008-09-01", "2009-03-31"),
                    ("ago 2011", "2011-07-15", "2011-10-31"), ("mar 2020", "2020-02-15", "2020-04-30"),
                    ("2022", "2022-01-01", "2022-12-31"), ("apr 2025", "2025-03-15", "2025-05-15")):
    r = {"episodio": lab}
    for u in ("PIT", "CUR"):
        s = BR.loc[lo:hi, f"{u}_drop5_r5"]
        r[f"{u} max r5 (conteggio)"] = s.max()
        r[f"{u} data"] = s.idxmax().strftime("%Y-%m-%d")
        r[f"{u} max r5 (% somma)"] = BR.loc[lo:hi, f"{u}_drop5p_r5"].max()
        r[f"{u} max 1g %"] = BR.loc[lo:hi, f"{u}_drop5"].max()
    rows.append(r)
T(pd.DataFrame(rows).set_index("episodio"), "{:.0f}",
  note="r5 conteggio = somma 5 giorni del n. di titoli con r ≤ −5% (massimo teorico 5×N); '% somma' = somma 5g della % di titoli (massimo 500); 1g % = quota giornaliera massima.")

H3("Forward ^GSPC dopo picchi (ingresso al primo giorno sopra soglia, episodi gap≥10)")
for per, lo in (("1996+", "1996-01-01"), ("2010+", "2010-01-01")):
    rows = [base_row(lo, "2026-12-31"), base_dd_row(lo, "2026-12-31", -10), base_dd_row(lo, "2026-12-31", -20)]
    for m, lab in (("drop5_r5", "conteggio r5"), ("drop5p_r5", "% r5 (normalizzato)"), ("drop5", "% 1 giorno")):
        x = BR[f"PIT_{m}"]
        for q in (0.99, 0.995):
            thr_full = x.loc["1996":].quantile(q)
            ep = episodes((x > thr_full).loc[lo:])
            rows.append(summarize(f"{lab} > p{q*100:g} ({thr_full:.0f}) [soglia full-sample]", ep, lo, "2026-12-31"))
            thr_exp = x.expanding(min_periods=1260).quantile(q).shift(1)
            ep2 = episodes((x > thr_exp).loc[lo:])
            rows.append(summarize(f"{lab} > p{q*100:g} [soglia espansiva, no look-ahead]", ep2, lo, "2026-12-31"))
    # analogo solo prezzo: rendimento 5g SPX
    r5 = (ri / ri.shift(5) - 1).reindex(idx) * 100
    for q in (0.01, 0.005):
        thr = r5.loc["1996":].quantile(q)
        ep = episodes((r5 < thr).loc[lo:])
        rows.append(summarize(f"analogo prezzo: SPX r5 < p{q*100:g} ({thr:.1f}%)", ep, lo, "2026-12-31"))
    H3(f"Periodo {per}")
    T(pd.DataFrame(rows).set_index("evento"), "{:.2f}")

H3("Date di episodio (conteggio r5 PIT > p99, soglia full-sample) e forward")
x = BR["PIT_drop5_r5"]
ep = episodes(x > x.loc["1996":].quantile(0.99))
e = FWD.reindex(ep)[[21, 63, 126, 252]].copy()
e.insert(0, "r5 al segnale", x.reindex(ep))
e.insert(1, "picco episodio", [x.loc[d: idx[min(np.searchsorted(idx, d) + 20, len(idx) - 1)]].max() for d in ep])
e.index = e.index.strftime("%Y-%m-%d")
T(e, "{:.1f}")

# ----------------------------------------------------------------------------- E. sez 30
P("E ...")
H2("E. Sez. 30: max drawdown, CAGR e recovery — membri attuali vs tutti i membri dal 1996")


def ticker_stats(s):
    s = s.dropna()
    s = s[s > 0]
    n = len(s)
    if n < 60:
        return None
    x = s.values.astype("float64")
    peak = np.maximum.accumulate(x)
    dd = x / peak - 1
    yrs = (s.index[-1] - s.index[0]).days / 365.25
    cagr = (x[-1] / x[0]) ** (1 / yrs) - 1 if yrs > 0 else np.nan
    # episodi: segmenti tra nuovi massimi
    newhigh = dd >= 0
    gid = np.cumsum(newhigh)
    df = pd.DataFrame({"g": gid, "dd": dd})
    g = df.groupby("g")["dd"].min()
    last_g = gid[-1]
    eps = pd.DataFrame({"depth": g.values, "recovered": g.index.values < last_g})
    eps = eps[eps.depth < 0]
    return {"n": n, "yrs": yrs, "maxdd": dd.min(), "cagr": cagr, "eps": eps,
            "first": s.index[0], "last": s.index[-1]}


Aall = A
recyc = set(pd.read_csv(f"{D}/recycled_tickers.csv").ticker)
# ticker riciclati: la serie prezzi è di un altro titolo -> esclusi, salvo che siano membri attuali (serie corretta)
ever = [t for t in all_members if t in tick and (t not in recyc or t in set(cur_in))]
stats = {}
for t in ever:
    r = ticker_stats(Aall[t])
    if r is not None:
        stats[t] = r
cur_set = set(cur_in)
groups = {"CUR (membri attuali)": [t for t in stats if t in cur_set],
          "EX (usciti dall'indice)": [t for t in stats if t not in cur_set],
          "ALL (tutti i membri dal 1996 con prezzi)": list(stats)}
rows = []
for gname, tl in groups.items():
    mdd = pd.Series({t: stats[t]["maxdd"] for t in tl}) * 100
    cg = pd.Series({t: stats[t]["cagr"] for t in tl}) * 100
    yrs = pd.Series({t: stats[t]["yrs"] for t in tl})
    cg3 = cg[yrs >= 3]
    eps = pd.concat([stats[t]["eps"].assign(t=t) for t in tl])
    r = {"gruppo": gname, "ticker": len(tl), "anni storia mediana": yrs.median(),
         "MaxDD mediano": mdd.median(), "MaxDD medio": mdd.mean(),
         "% MaxDD ≤ −50": (mdd <= -50).mean() * 100, "% MaxDD ≤ −80": (mdd <= -80).mean() * 100,
         "% MaxDD ≤ −95": (mdd <= -95).mean() * 100,
         "CAGR mediano (≥3a)": cg3.median(), "CAGR medio (≥3a)": cg3.mean(), "% CAGR<0 (≥3a)": (cg3 < 0).mean() * 100}
    for th in (50, 80):
        e = eps[eps.depth <= -th / 100]
        r[f"episodi ≤−{th}"] = len(e)
        r[f"% episodi ≤−{th} recuperati"] = e.recovered.mean() * 100 if len(e) else np.nan
        tt = e.groupby("t").recovered.all()
        r[f"% ticker ≤−{th} che hanno recuperato"] = tt.mean() * 100 if len(tt) else np.nan
    rows.append(r)
TE = pd.DataFrame(rows).set_index("gruppo").T
T(TE, "{:.1f}", note="adj_close (total return), storia disponibile nel dataset (dal 1995). Episodio = tratto tra due massimi storici; 'recuperato' = nuovo massimo raggiunto prima della fine della serie (per i titoli usciti/acquisiti la serie termina alla delisting).")

H3("Recovery per soglia (episodi) — CUR vs ALL")
rows = []
for th in (10, 20, 30, 40, 50, 60, 70, 80, 90):
    r = {"soglia": f"≤−{th}%"}
    for gname, tl in groups.items():
        eps = pd.concat([stats[t]["eps"] for t in tl])
        e = eps[eps.depth <= -th / 100]
        r[f"{gname.split()[0]} n"] = len(e)
        r[f"{gname.split()[0]} % rec"] = e.recovered.mean() * 100 if len(e) else np.nan
    rows.append(r)
T(pd.DataFrame(rows).set_index("soglia"), "{:.1f}")

H3("Coorte dei membri al 2010-01-04: chi è ancora nell'indice vs chi è uscito (CAGR total return dal 2010)")
# coorte: membri al 2010-01-04 con prezzo, e loro sorte fino ad oggi
d0 = idx[idx >= "2010-01-04"][0]
coh = [t for t in tick if MEM.loc[d0, t] and pd.notna(A.loc[d0, t])]
cohs = [t for t in coh if t in stats]
cg_c = pd.Series({t: (A[t].dropna().iloc[-1] / A.loc[d0, t]) ** (365.25 / max((A[t].dropna().index[-1] - d0).days, 1)) - 1 for t in cohs}) * 100
still = pd.Series({t: t in cur_set for t in cohs})
rows = [{"gruppo": "coorte membri 2010-01-04 (con prezzo)", "n": len(cohs), "CAGR mediano dal 2010": cg_c.median(),
         "% ancora membri oggi": still.mean() * 100},
        {"gruppo": "  di cui ancora membri", "n": int(still.sum()), "CAGR mediano dal 2010": cg_c[still].median(), "% ancora membri oggi": 100},
        {"gruppo": "  di cui usciti", "n": int((~still).sum()), "CAGR mediano dal 2010": cg_c[~still].median(), "% ancora membri oggi": 0}]
T(pd.DataFrame(rows).set_index("gruppo"), "{:.1f}",
  note=f"Coorte 2010: {int(snap.loc[:d0].iloc[-1].sum())} membri da snapshot, {len(coh)} con prezzo (gli altri {int(snap.loc[:d0].iloc[-1].sum())-len(coh)} mancano nel dataset prezzi: in gran parte usciti/acquisiti/falliti → bias residuo).")

# ----------------------------------------------------------------------------- F. ridondanza con %>MA
P("F ...")
H2("F. Ridondanza con le misure già usate dall'app (% membri PIT sopra la media mobile 20/50/200)")
MA = {}
for w in (20, 50, 200):
    ma = PI.rolling(w, min_periods=w).mean()
    v = MEM & ma.notna() & PI.notna()
    MA[w] = (((PI > ma) & v).sum(axis=1) / v.sum(axis=1) * 100).reindex(idx)
pma = pd.DataFrame({f"pct>MA{w}": MA[w] for w in MA})
pma.to_csv(f"{OUT}/pct_above_ma_pit.csv", float_format="%.2f")
rows = []
for per, lo in (("1996+", "1996-01-01"), ("2010+", "2010-01-01")):
    rows.append(base_row(lo, "2026-12-31"))
    for lab, sig in (("%>MA20 < 10", pma["pct>MA20"] < 10), ("%>MA50 < 10", pma["pct>MA50"] < 10),
                     ("%>MA200 < 15", pma["pct>MA200"] < 15),
                     ("drop5 % r5 > p99 (espansiva)", BR["PIT_drop5p_r5"] > BR["PIT_drop5p_r5"].expanding(min_periods=1260).quantile(0.99).shift(1)),
                     ("adv < 5%", BR["PIT_adv"] < 5)):
        r = summarize(f"{per} {lab}", episodes(sig.loc[lo:]), lo, "2026-12-31")
        rows.append(r)
T(pd.DataFrame(rows).set_index("evento"), "{:.2f}")
H3("Sovrapposizione temporale: episodi drop5/adv che cadono entro ±10 sedute da un episodio %>MA20<10")
e_ma = episodes(pma["pct>MA20"] < 10)
pos_ma = np.searchsorted(idx, e_ma)
sig_ma = (pma["pct>MA20"] < 10).values
rows = []
for lab, sig in (("drop5 % r5 > p99 (espansiva)", BR["PIT_drop5p_r5"] > BR["PIT_drop5p_r5"].expanding(min_periods=1260).quantile(0.99).shift(1)),
                 ("adv < 5%", BR["PIT_adv"] < 5), ("adv < 2%", BR["PIT_adv"] < 2)):
    e = episodes(sig)
    pe = np.searchsorted(idx, e)
    near = [sig_ma[max(0, p - 10): p + 11].any() for p in pe]
    rows.append({"segnale": lab, "episodi": len(e), "% con %>MA20<10 entro ±10 sedute": np.mean(near) * 100,
                 "%>MA20 mediano al segnale": pma["pct>MA20"].reindex(e).median(),
                 "%>MA50 mediano al segnale": pma["pct>MA50"].reindex(e).median()})
T(pd.DataFrame(rows).set_index("segnale"), "{:.1f}")

with open(f"{OUT}/tabelle_breadth.md", "w") as fh:
    fh.write("\n".join(md))
P("scritto", f"{OUT}/tabelle_breadth.md")
