#!/usr/bin/env python3
"""Verifica indipendente delle sezioni 22-34 del fascicolo "Quant Rea".

Input (cartella QR, default = scratchpad): spx.csv, ndx.csv, vix.csv (Yahoo, solo prezzi).
Output: QR/out2/*.csv + QR/out2/risultati.txt (log numerico usato per verifica_parte2.md).

Uso: python3 verifica_parte2.py [QR_DIR]
"""
import sys, os, warnings
import numpy as np
import pandas as pd
import statsmodels.api as sm

warnings.filterwarnings("ignore")
QR = sys.argv[1] if len(sys.argv) > 1 else \
    "/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qr"
OUT = os.path.join(QR, "out2")
os.makedirs(OUT, exist_ok=True)
END = "2026-07-16"          # data di riferimento del fascicolo (Sez. 29)
LOG = open(os.path.join(OUT, "risultati.txt"), "w")
pd.set_option("display.width", 200, "display.max_columns", 30, "display.max_rows", 500)


def p(*a):
    s = " ".join(str(x) for x in a)
    print(s)
    LOG.write(s + "\n")


def H(t):
    p("\n" + "=" * 100 + "\n" + t + "\n" + "=" * 100)


def load(name):
    d = pd.read_csv(os.path.join(QR, f"{name}.csv"), parse_dates=["date"]).set_index("date")
    return d.loc[:END].astype(float)


spx, ndx, vix = load("spx"), load("ndx"), load("vix")
# prima del 1962 Yahoo ha high=low=close: per misure intraday si usa close (documentato)
p("SPX", spx.index[0].date(), "->", spx.index[-1].date(), len(spx), "barre;",
  "barre giornaliere dal 1950:", len(spx.loc["1950":]))
p("NDX", ndx.index[0].date(), "->", ndx.index[-1].date(), len(ndx))
p("VIX", vix.index[0].date(), "->", vix.index[-1].date(), len(vix))


# ---------------------------------------------------------------- helper
def ath_episodes(close, thr, low=None, high=None):
    """Episodi de-duplicati: un episodio per ogni drawdown da massimo storico che supera thr.
    peak = ATH precedente, trough = minimo fino al recupero dell'ATH, recovery = primo close>=peak."""
    c = close.values
    lo = c if low is None else low.reindex(close.index).values
    hi = c if high is None else high.reindex(close.index).values
    idx = close.index
    res, pk, pki, i, n = [], hi[0], 0, 1, len(c)
    while i < n:
        if hi[i] >= pk:
            pk, pki = hi[i], i
            i += 1
            continue
        if lo[i] / pk - 1 <= thr:                       # trigger
            trig = i
            j = i
            while j < n and hi[j] < pk:                 # fino a nuovo massimo
                j += 1
            seg = lo[pki:j] if j > pki else lo[pki:pki + 1]
            ti = pki + int(np.argmin(seg))
            res.append(dict(peak=idx[pki].date(), trigger=idx[trig].date(), trough=idx[ti].date(),
                            recovery=idx[j].date() if j < n else None,
                            depth=lo[ti] / pk - 1, d_peak_trough=ti - pki,
                            d_trough_rec=(j - ti) if j < n else np.nan,
                            d_peak_rec=(j - pki) if j < n else np.nan,
                            peak_i=pki, trough_i=ti, rec_i=j if j < n else None, trig_i=trig))
            if j >= n:
                break
            pk, pki, i = hi[j], j, j + 1
            continue
        i += 1
    return pd.DataFrame(res)


def deepening(depths, levels=(20, 25, 30, 35, 40, 50, 60, 70, 80)):
    d = -np.asarray(depths) * 100
    rows = []
    for x in levels:
        nx = (d >= x).sum()
        row = {"da": f"-{x}%", "n": nx}
        for y in levels:
            if y > x:
                row[f"-{y}%"] = f"{100 * (d >= y).sum() / nx:.0f}% ({(d >= y).sum()})" if nx else ""
        rows.append(row)
    return pd.DataFrame(rows).set_index("da")


def fwd(c, h):
    return c.shift(-h) / c - 1


# ================================================================ 22
H("SEZ 22 - Max drawdown intra-anno vs rendimento annuale, SPX 1950-2026")
s = spx.loc["1950":].copy()
rows = []
prev_close = spx.close.loc[:"1949-12-31"].iloc[-1]
for y, g in s.groupby(s.index.year):
    mdd = (g.low / g.high.cummax() - 1).min()
    mdd_c = (g.close / g.close.cummax() - 1).min()
    r_first = g.close.iloc[-1] / g.close.iloc[0] - 1         # metodo fascicolo
    r_prev = g.close.iloc[-1] / prev_close - 1                # metodo corretto (close anno prec.)
    prev_close = g.close.iloc[-1]
    rows.append(dict(anno=y, mdd_intraday=mdd, mdd_close=mdd_c, ret_first_last=r_first, ret_vs_prevclose=r_prev))
t22 = pd.DataFrame(rows).set_index("anno")
t22.to_csv(os.path.join(OUT, "s22_anni.csv"))
n = len(t22)
for col in ["ret_first_last", "ret_vs_prevclose"]:
    p(f"{col}: anni={n}, positivi={(t22[col] > 0).sum()} ({100 * (t22[col] > 0).mean():.1f}%)")
full = t22.loc[:2025]
p(f"solo anni completi 1950-2025: n={len(full)} positivi={(full.ret_vs_prevclose > 0).sum()} "
  f"({100 * (full.ret_vs_prevclose > 0).mean():.1f}%)")
p("anni con segno diverso tra i due metodi:",
  list(t22.index[np.sign(t22.ret_first_last) != np.sign(t22.ret_vs_prevclose)]))
for th in [-0.10, -0.15, -0.20]:
    sub = full[full.mdd_intraday <= th]
    p(f"condizionato MDD<={th:.0%}: n={len(sub)} positivi={(sub.ret_vs_prevclose > 0).sum()} "
      f"({100 * (sub.ret_vs_prevclose > 0).mean():.0f}%)")
p("mediana MDD intra-anno (intraday):", f"{100 * full.mdd_intraday.median():.1f}%",
  " corr(MDD, ret):", round(full.mdd_intraday.corr(full.ret_vs_prevclose), 2))
p("peggiori 5 rendimenti:", full.ret_vs_prevclose.nsmallest(5).round(3).to_dict())

# ================================================================ 23
H("SEZ 23 - Correzioni NDX soglia -20% (close)")
c = ndx.close
dd = c / c.cummax() - 1
below = dd <= -0.20
cross = below & ~below.shift(1, fill_value=False)
ci = np.where(cross.values)[0]
p("(A) attraversamenti 'ingenui' di -20% dal massimo storico (ogni ri-attraversamento = nuova correzione):",
  len(ci))
# ricostruzione dell'algoritmo del fascicolo: trigger ingenuo + minimo entro 250 sedute dal trigger;
# profondità dell'episodio-padre (stesso picco) = minimo dell'unione delle finestre dei suoi trigger
rows = []
for e in ci:
    pki = int(np.argmax(c.values[:e + 1]))
    pkv = c.values[pki]
    seg = c.values[e:e + 250]
    ti = e + int(np.argmin(seg))
    rec = np.where(c.values[ti:] >= pkv)[0]
    rows.append(dict(peak=c.index[pki].date(), trigger=c.index[e].date(), trough_w250=c.index[ti].date(),
                     dd_w250=c.values[ti] / pkv - 1, d_peak_min=ti - pki,
                     d_peak_rec=(ti - pki + rec[0]) if len(rec) else np.nan,
                     r250_from_trigger=c.values[min(e + 250, len(c) - 1)] / c.values[e] - 1,
                     r250_from_peak=c.values[min(pki + 250, len(c) - 1)] / pkv - 1))
nv = pd.DataFrame(rows)
nv["dd_parent"] = nv.groupby("peak").dd_w250.transform("min")
nv["d_parent_min"] = nv.groupby("peak").d_peak_min.transform("max")
nv.to_csv(os.path.join(OUT, "s23_ndx_trigger_ingenui.csv"), index=False)
p(nv[["peak", "trigger", "trough_w250", "dd_w250", "dd_parent", "d_peak_min", "d_peak_rec",
      "r250_from_trigger", "r250_from_peak"]].round(4).to_string())
p(f"ricostruzione: n={len(nv)}  DD medio (padre)={100 * nv.dd_parent.mean():.1f}%  mediana={100 * nv.dd_parent.median():.1f}% "
  f" peggiore={100 * nv.dd_parent.min():.2f}%  episodi<=-50%: {(nv.dd_parent <= -0.5).sum()}")
p(f"   gg al minimo medi (finestra)={nv.d_peak_min.mean():.0f}  (padre)={nv.d_parent_min.mean():.0f};"
  f"  gg recovery medi (da picco)={nv.d_peak_rec.mean():.0f};  r250 medio da trigger={100 * nv.r250_from_trigger.mean():.1f}%"
  f"  da picco={100 * nv.r250_from_peak.mean():.1f}%")
p("Tabella condizionata ricostruita (40 trigger, profondita' padre):")
p(deepening(nv.dd_parent, (20, 25, 30, 35, 40, 50)).to_string())

ep = ath_episodes(c, -0.20)
ep["r250_trig"] = [c.values[min(r.trig_i + 250, len(c) - 1)] / c.values[r.trig_i] - 1 for r in ep.itertuples()]
p("\n(B) episodi DE-DUPLICATI (un episodio per drawdown da ATH):")
p(ep[["peak", "trigger", "trough", "recovery", "depth", "d_peak_trough", "d_trough_rec", "d_peak_rec", "r250_trig"]]
  .round(4).to_string())
ep.drop(columns=["peak_i", "trough_i", "rec_i", "trig_i"]).to_csv(os.path.join(OUT, "s23_ndx_episodi.csv"), index=False)
p(f"n={len(ep)} DD medio={100 * ep.depth.mean():.1f}% mediana={100 * ep.depth.median():.1f}% "
  f"gg picco->minimo medi={ep.d_peak_trough.mean():.0f} gg picco->recovery medi={ep.d_peak_rec.mean():.0f} "
  f"mediana={ep.d_peak_rec.median():.0f}")
lo2 = c.loc["2000":"2003"]
p(f"minimo reale 2000-2002 (close): {lo2.idxmin().date()} {100 * (lo2.min() / c.loc[:'2000-12-31'].max() - 1):.2f}%;"
  f" intraday low/high: {ndx.low.loc['2000':'2003'].idxmin().date()} "
  f"{100 * (ndx.low.loc['2000':'2003'].min() / ndx.high.loc[:'2000-12-31'].max() - 1):.2f}%")
p("Tabella condizionata NDX de-duplicata:")
p(deepening(ep.depth, (20, 25, 30, 35, 40, 50, 60)).to_string())
for lab, ser in [("SPX 1928+", spx.close), ("SPX 1950+", spx.close.loc["1950":])]:
    e2 = ath_episodes(ser, -0.20)
    p(f"\n{lab}: episodi de-dup -20% n={len(e2)}")
    p(e2[["peak", "trough", "recovery", "depth", "d_peak_trough", "d_trough_rec"]].round(4).to_string())
    p(deepening(e2.depth, (20, 25, 30, 35, 40, 50)).to_string())
    e2.drop(columns=["peak_i", "trough_i", "rec_i", "trig_i"]).to_csv(
        os.path.join(OUT, f"s23_{lab.replace(' ', '_').replace('+', 'p')}_episodi.csv"), index=False)
# anche condizionata su soglia -10% (più episodi, più robusta)
for lab, ser in [("NDX", c), ("SPX 1950+", spx.close.loc["1950":])]:
    e10 = ath_episodes(ser, -0.10)
    p(f"\n{lab}: episodi de-dup -10% n={len(e10)} -> condizionata")
    p(deepening(e10.depth, (10, 15, 20, 25, 30, 35, 40, 50)).to_string())

# ================================================================ 24
H("SEZ 24 - Giorni in bear (DD<-20% da ATH) NDX")
bear = (dd <= -0.20)
p(f"giorni totali={len(bear)}  giorni bear={bear.sum()} ({100 * bear.mean():.1f}%)")
runs = (bear != bear.shift()).cumsum()[bear]
lens = runs.value_counts().sort_index()
starts = [runs.index[runs == k][0].date() for k in lens.index]
ph = pd.DataFrame(dict(inizio=starts, durata=lens.values))
p(f"fasi bear (run contigui) = {len(ph)}; durata max={ph.durata.max()} (inizio {ph.loc[ph.durata.idxmax(), 'inizio']});"
  f" fasi<=5 gg: {(ph.durata <= 5).sum()}; fasi<=20 gg: {(ph.durata <= 20).sum()}")
longest = runs.index[runs == lens.idxmax()]
p("fase più lunga:", longest[0].date(), "->", longest[-1].date())
# scomposizione discesa (picco->minimo) vs recupero (minimo->ATH) dentro il bear
fall = rec = 0
for r in ep.itertuples():
    sl = slice(r.peak_i, r.rec_i if r.rec_i is not None else len(c))
    b = bear.iloc[sl].values
    k = np.arange(sl.start, sl.start + len(b))
    fall += b[k <= r.trough_i].sum()
    rec += b[k > r.trough_i].sum()
p(f"dei giorni 'bear': in discesa (prima del minimo) {fall} ({100 * fall / bear.sum():.0f}%), "
  f"in risalita (dopo il minimo, ancora < -20%) {rec} ({100 * rec / bear.sum():.0f}%)")
p(f"escludendo 2000-2015: quota bear = {100 * bear.drop(bear.loc['2000-03-27':'2015-03-02'].index).mean():.1f}%")
yr = bear.groupby(bear.index.year).sum()
yr.to_csv(os.path.join(OUT, "s24_ndx_giorni_bear_anno.csv"))
p("giorni bear per anno (>0):", yr[yr > 0].to_dict())
ph.to_csv(os.path.join(OUT, "s24_ndx_fasi.csv"), index=False)
for lab, ser in [("SPX 1950+", spx.close.loc["1950":]), ("SPX 1928+", spx.close)]:
    d_ = ser / ser.cummax() - 1
    p(f"{lab}: quota giorni DD<=-20% = {100 * (d_ <= -0.2).mean():.1f}%")

# ================================================================ 25
H("SEZ 25 - 'Ergodicità' SPX 1950+ (rolling 252 - expanding mean dei log-rendimenti)")
s = spx.close.loc["1950":]
lr = np.log(s).diff().dropna()
roll = lr.rolling(252).mean()
expd = lr.expanding().mean()
diff = (roll - expd).dropna()
for thr in [0.0011]:
    ne = diff.abs() > thr
    p(f"soglia {thr}: giorni non ergodici = {100 * ne.mean():.2f}% (n={ne.sum()} su {len(ne)}) "
      f"[sopra: {100 * (diff > thr).mean():.2f}%, sotto: {100 * (diff < -thr).mean():.2f}%]; stato al {diff.index[-1].date()}: "
      f"{'NON ergodico' if ne.iloc[-1] else 'ergodico'} (diff={diff.iloc[-1]:.5f})")
q = diff.abs().quantile([0.9, 0.939, 0.95])
p("quantili |diff|:", q.round(5).to_dict(), " std diff:", round(diff.std(), 5),
  " -> 0.0011 ~ ", round(0.0011 / diff.std(), 2), "sigma")
r12 = np.log(s).diff(252)                  # log-rendimento 12 mesi
ident = (roll * 252 - r12).abs().max()
p(f"identità: 252*rolling_mean == log-rendimento a 12 mesi (max scarto {ident:.2e}). "
  f"Soglia ±0.0011 al giorno = ±{252 * 0.0011 * 100:.1f}% log annuo attorno alla media espansiva "
  f"(media espansiva finale = {252 * expd.iloc[-1] * 100:.1f}% annuo).")
p("=> 'non ergodico' ⇔ rendimento 12m fuori da [media storica ± 27.7%]; corr(diff, r12) =",
  round(diff.corr(r12.reindex(diff.index)), 4))
# capacità predittiva: rendimento forward 63/252 dopo segnali
fr = pd.DataFrame({"f63": fwd(s, 63), "f252": fwd(s, 252)}).reindex(diff.index)
for lab, m in [("tutti", diff.abs() >= 0), ("diff>+thr", diff > 0.0011), ("diff<-thr", diff < -0.0011),
               ("dentro banda", diff.abs() <= 0.0011)]:
    p(f"  {lab:12s} n={m.sum():6d}  fwd63 medio={100 * fr.f63[m].mean():5.2f}%  fwd252 medio={100 * fr.f252[m].mean():5.2f}%")

# ================================================================ 26
H("SEZ 26 - Bear (-20%) e secondo drawdown (-10% dal massimo del rimbalzo, prima di tornare all'ATH pre-bear)")


def second_dd(close, ep_df, thr2=-0.10, low=None, high=None):
    cv = close.values
    lo = cv if low is None else low.reindex(close.index).values
    hi = cv if high is None else high.reindex(close.index).values
    out = []
    for r in ep_df.itertuples():
        end = r.rec_i if r.rec_i is not None else len(cv)
        rh, rhi, found = -np.inf, None, None
        for k in range(r.trough_i + 1, end):
            if hi[k] > rh:
                rh, rhi = hi[k], k
            if lo[k] / rh - 1 <= thr2:
                # minimo della seconda gamba fino a recupero del massimo del rimbalzo o fine finestra
                kk = k
                while kk < end and hi[kk] < rh:
                    kk += 1
                seg = lo[k:kk] if kk > k else lo[k:k + 1]
                mi = k + int(np.argmin(seg))
                found = (close.index[rhi].date(), close.index[mi].date(), lo[mi] / rh - 1, rhi - r.peak_i)
                break
        out.append(dict(peak=r.peak, trough=r.trough, recovery=r.recovery, bear_dd=r.depth,
                        dd2_start=found[0] if found else None, dd2_end=found[1] if found else None,
                        dd2=found[2] if found else np.nan, gg_peak_to_dd2=found[3] if found else np.nan))
    return pd.DataFrame(out)


for lab, ser, use_hl in [("SPX 1928+ close", spx.close, False), ("SPX 1950+ close", spx.close.loc["1950":], False),
                         ("SPX 1962+ intraday(high/low)", spx.close.loc["1962":], True)]:
    if use_hl:
        sub = spx.loc["1962":]
        e = ath_episodes(sub.close, -0.20, low=sub.low, high=sub.high)
        t = second_dd(sub.close, e, low=sub.low, high=sub.high)
    else:
        e = ath_episodes(ser, -0.20)
        t = second_dd(ser, e)
    p(f"\n{lab}: bear={len(t)} con secondo DD={t.dd2.notna().sum()}")
    p(t.round(4).to_string())
    t.to_csv(os.path.join(OUT, f"s26_{lab.split()[0]}_{lab.split()[1].replace('+', 'p')}_{'hl' if use_hl else 'c'}.csv"),
             index=False)
p("Nota 1987 su close: minimo 1987-12-04 (223.92); su intraday il minimo è il 1987-10-20 (216.46) ->"
  " il 'secondo DD' 10-21→10-26 del fascicolo è la stessa settimana del crash.")

# ================================================================ 27
H("SEZ 27 - Drawdown >= X% dal massimo YTD (reset a nuovo massimo YTD), SPX 1950+")
s = spx.loc["1950":].copy()
cl = s.close
F = {h: fwd(spx.close, h).reindex(s.index) for h in (5, 21, 63)}
events = {}
counts = {}
for thr in [0.01, 0.03, 0.05, 0.10, 0.15, 0.20]:
    ev = []
    for y, g in s.groupby(s.index.year):
        ytd = -np.inf
        armed = True
        for dt, hi, lo in zip(g.index, g.high.values, g.low.values):
            if hi > ytd:
                ytd = hi
                armed = True
            if armed and lo <= ytd * (1 - thr):
                ev.append(dt)
                armed = False
    events[thr] = pd.DatetimeIndex(ev)
    counts[thr] = pd.Series(1, index=events[thr]).groupby(events[thr].year).sum().reindex(range(1950, 2027), fill_value=0)
cnt = pd.DataFrame({f"{int(k * 100)}%": v for k, v in counts.items()})
cnt.to_csv(os.path.join(OUT, "s27_conteggi_anno.csv"))
p("conteggi 1950-1964 (confronto con estratto fascicolo):")
p(cnt.loc[1950:1964].T.to_string())
p("max conteggio annuo @5%:", cnt["5%"].max(), "anno", cnt["5%"].idxmax())
rows = []
rng = np.random.default_rng(0)
N = len(s)
for thr, ev in events.items():
    if thr == 0.20:
        continue
    pos = s.index.get_indexer(ev)
    for h in (5, 21, 63):
        x = F[h].iloc[pos].dropna()
        base = F[h].dropna()
        # test a shift circolare: preserva il clustering degli eventi
        fh = F[h].values
        sims = []
        for _ in range(2000):
            sh = (pos + rng.integers(0, N)) % N
            v = fh[sh]
            sims.append(np.nanmean(v))
        sims = np.array(sims)
        pv = (np.sum(sims >= x.mean()) + 1) / (len(sims) + 1)
        rows.append(dict(soglia=f"{int(thr * 100)}%", h=h, n=len(x), media=100 * x.mean(), mediana=100 * x.median(),
                         win=100 * (x > 0).mean(), base_media=100 * base.mean(), base_win=100 * (base > 0).mean(),
                         excess=100 * (x.mean() - base.mean()), p_shift=pv))
t27 = pd.DataFrame(rows)
t27.to_csv(os.path.join(OUT, "s27_forward.csv"), index=False)
p(t27.round(2).to_string())
# sovrapposizione eventi
for thr in [0.05, 0.10]:
    pos = s.index.get_indexer(events[thr])
    gaps = np.diff(pos)
    p(f"soglia {thr:.0%}: eventi con evento successivo entro 63 sedute: {100 * (gaps < 63).mean():.0f}%")
p("nota: soglia 1% nel 1963-64 sul fascicolo = 59/61 eventi; confronto nostro:", cnt.loc[[1963, 1964], "1%"].to_dict())

# ================================================================ 28
H("SEZ 28 - Mese del massimo annuale, SPX 1950-2025 (+2026 parziale)")
s = spx.loc["1950":]
hi = s.high.where(s.index >= "1962-01-01", s.close)
mrows = []
for y, g in hi.groupby(hi.index.year):
    mrows.append(dict(anno=y, data=g.idxmax().date(), mese=g.idxmax().month))
mh = pd.DataFrame(mrows).set_index("anno")
mh.to_csv(os.path.join(OUT, "s28_massimi_annuali.csv"))
for lab, sub in [("1950-2026 (77 anni, 2026 parziale)", mh), ("1950-2025 (76 anni completi)", mh.loc[:2025])]:
    m = sub.mese.value_counts().reindex(range(1, 13), fill_value=0)
    ahead = [100 * (sub.mese > k).mean() for k in range(1, 13)]
    p(f"{lab}: per mese {m.to_dict()}")
    p("   P(massimo ancora avanti) a fine mese:", dict(zip(range(1, 13), np.round(ahead, 0))))
# simulazioni
full = s.loc[:"2025-12-31"]
lr = np.log(full.close).diff().dropna()
mu, sd = lr.mean(), lr.std()
p(f"drift giornaliero {mu:.5f}, vol {sd:.4f} (Sharpe annuo ~{mu / sd * np.sqrt(252):.2f})")
rng = np.random.default_rng(42)
dec_share = []
jan_share = []
B = 2000
yrs = [g.values for _, g in lr.groupby(lr.index.year)]
mon = [g.index.month.values for _, g in lr.groupby(lr.index.year)]
for b in range(B):
    dc = jc = 0
    for v, mm in zip(yrs, mon):
        pv = np.cumsum(rng.permutation(v))
        k = int(np.argmax(np.concatenate([[0], pv])))  # 0 = primo giorno (prezzo iniziale)
        mo = mm[max(k - 1, 0)]
        dc += mo == 12
        jc += mo == 1
    dec_share.append(dc / len(yrs))
    jan_share.append(jc / len(yrs))
p(f"shuffle intra-anno dei rendimenti (preserva rendimento annuo, distrugge stagionalità): dicembre medio "
  f"{100 * np.mean(dec_share):.1f}% [5-95%: {100 * np.percentile(dec_share, 5):.1f}-{100 * np.percentile(dec_share, 95):.1f}%],"
  f" gennaio {100 * np.mean(jan_share):.1f}%")
# random walk gaussiana con drift/vol storiche, 252 giorni
sim = rng.normal(mu, sd, size=(50000, 252)).cumsum(1)
k = np.argmax(np.concatenate([np.zeros((50000, 1)), sim], 1), 1)
month_of = np.minimum((np.maximum(k - 1, 0) // 21) + 1, 12)
p("random walk (drift+vol SPX): quota massimi per mese:",
  {m: round(100 * (month_of == m).mean(), 1) for m in range(1, 13)})
sim0 = rng.normal(0, sd, size=(50000, 252)).cumsum(1)
k0 = np.argmax(np.concatenate([np.zeros((50000, 1)), sim0], 1), 1)
mo0 = np.minimum((np.maximum(k0 - 1, 0) // 21) + 1, 12)
p("random walk senza drift: dicembre", round(100 * (mo0 == 12).mean(), 1), "% gennaio", round(100 * (mo0 == 1).mean(), 1), "%")
# condizionamento su segno dell'anno
yr_ret = full.close.groupby(full.index.year).last() / full.close.groupby(full.index.year).last().shift(1) - 1
mm = mh.loc[1951:2025]
p("anni positivi: quota massimo a dicembre", round(100 * (mm.mese[yr_ret.loc[1951:2025] > 0] == 12).mean(), 0),
  "% ; anni negativi:", round(100 * (mm.mese[yr_ret.loc[1951:2025] <= 0] == 12).mean(), 0), "%")

# ================================================================ 29
H("SEZ 29 - Datazione bull/bear ±20% (min bull 5 mesi), SPX 1950+")


def bull_bear(close, thr=0.20, min_bull_days=105, high=None, low=None):
    """Regola simmetrica alla Lunde-Timmermann (lambda1=lambda2=thr) con censura dei bull troppo brevi.
    Ritorna lista di punti di svolta [(tipo, i)] tipo='P' (picco) o 'T' (minimo)."""
    cv = close.values
    hv = cv if high is None else high.values
    lv = cv if low is None else low.values
    state = "bull"
    ext_i = 0
    ext = hv[0]
    tps = [("T", 0)]
    for i in range(1, len(cv)):
        if state == "bull":
            if hv[i] > ext:
                ext, ext_i = hv[i], i
            elif lv[i] <= ext * (1 - thr):
                tps.append(("P", ext_i))
                state, ext, ext_i = "bear", lv[i], i
        else:
            if lv[i] < ext:
                ext, ext_i = lv[i], i
            elif hv[i] >= ext * (1 + thr):
                tps.append(("T", ext_i))
                state, ext, ext_i = "bull", hv[i], i
    tps.append(("P" if state == "bull" else "T", len(cv) - 1))   # fase in corso (censurata a destra)
    # censura: bull T->P più breve di min_bull_days (non il primo/ultimo) -> rimuovi T e P (fondi i bear)
    changed = True
    while changed:
        changed = False
        for j in range(1, len(tps) - 2):
            if tps[j][0] == "T" and tps[j + 1][0] == "P" and tps[j + 1][1] - tps[j][1] < min_bull_days:
                # tieni il minimo più basso tra T_j e il T successivo
                nxt = j + 2
                if nxt < len(tps) and tps[nxt][0] == "T":
                    keep = tps[j] if lv[tps[j][1]] < lv[tps[nxt][1]] else tps[nxt]
                    tps = tps[:j] + [keep] + tps[nxt + 1:]
                else:
                    tps = tps[:j] + tps[j + 2:]
                changed = True
                break
    return tps


def phases(close, tps, high=None, low=None):
    cv = close.values
    hv = cv if high is None else high.values
    lv = cv if low is None else low.values
    lr_ = np.log(close).diff()
    rows = []
    for (t0, i0), (t1, i1) in zip(tps[:-1], tps[1:]):
        kind = "bull" if t0 == "T" else "bear"
        a = lv[i0] if t0 == "T" else hv[i0]
        b = hv[i1] if t1 == "P" else lv[i1]
        if i0 == 0:
            a = cv[0]
        yrs = (close.index[i1] - close.index[i0]).days / 365.25
        ret = b / a - 1
        vol = lr_.iloc[i0 + 1:i1 + 1].std() * np.sqrt(252)
        rec = np.nan
        if kind == "bear":
            later = np.where(cv[i1:] >= hv[i0])[0]
            rec = (close.index[i1 + later[0]] - close.index[i1]).days / 30.44 if len(later) else np.nan
        rows.append(dict(tipo=kind, inizio=close.index[i0].date(), fine=close.index[i1].date(), anni=yrs,
                         mesi=yrs * 12, ret=ret, ret_ann=(1 + ret) ** (1 / yrs) - 1 if yrs > 0 else np.nan,
                         vol=vol, recupero_mesi=rec, in_corso=(i1 == len(cv) - 1)))
    return pd.DataFrame(rows)


s = spx.loc["1950":]
for lab, h_, l_ in [("close", None, None), ("intraday high/low (close prima del 1962)",
                                            s.high.where(s.index >= "1962", s.close),
                                            s.low.where(s.index >= "1962", s.close))]:
    tps = bull_bear(s.close, high=h_, low=l_)
    ph = phases(s.close, tps, high=h_, low=l_)
    ph.to_csv(os.path.join(OUT, f"s29_fasi_{'close' if h_ is None else 'hl'}.csv"), index=False)
    comp = ph[~ph.in_corso & (ph.inizio > pd.Timestamp('1950-01-03').date())]
    p(f"\nVariante {lab}: fasi totali={len(ph)} (bull {(ph.tipo == 'bull').sum()}, bear {(ph.tipo == 'bear').sum()})")
    p(ph.round(3).to_string())
    for k in ["bull", "bear"]:
        z = comp[comp.tipo == k]
        p(f"  {k} completi (esclusa la prima fase troncata al 1950 e quella in corso): n={len(z)} durata media={z.anni.mean():.2f} anni "
          f"(mediana {z.mesi.median():.0f} mesi) ret medio={100 * z.ret.mean():.1f}% mediana={100 * z.ret.median():.1f}% "
          f"ann. medio={100 * z.ret_ann.mean():.1f}% vol media={100 * z.vol.mean():.1f}%"
          + (f" recupero medio={z.recupero_mesi.mean():.0f} mesi" if k == "bear" else ""))
        z = ph[ph.tipo == k]
        p(f"  {k} TUTTE (come la dashboard, incl. prima troncata e in corso): n={len(z)} durata media={z.anni.mean():.2f} anni"
          f" ret medio={100 * z.ret.mean():.1f}% ann. medio={100 * z.ret_ann.mean():.1f}% vol media={100 * z.vol.mean():.1f}%"
          f" P10 ret={100 * z.ret.quantile(.1):.1f}% P90 durata={z.anni.quantile(.9):.2f} anni")
# verifica bull 1990-1998
a = spx.close.loc["1990-10-11"]; b = spx.close.loc["1998-07-17"]
yrs = (pd.Timestamp("1998-07-17") - pd.Timestamp("1990-10-11")).days / 365.25
p(f"bull 1990-10-11→1998-07-17: {100 * (b / a - 1):.1f}% in {yrs:.2f} anni = {100 * ((b / a) ** (1 / yrs) - 1):.1f}% annuo (non '>65%')")

# ================================================================ 33
H("SEZ 33 - GARCH(1,1) OOS vs VIX vs volatilità realizzata (split 2000-01-01)")
from arch import arch_model

def garch_study(train_start, tag):
    r = 100 * np.log(spx.close.loc[train_start:]).diff().dropna()
    train = r.loc[:"1999-12-31"]
    am = arch_model(train, mean="Constant", vol="GARCH", p=1, q=1, dist="normal")
    fit = am.fit(disp="off")
    p(f"[{tag}] training {train_start}-1999:", fit.params.round(5).to_dict(), " persistenza a+b =", round(fit.params["alpha[1]"] + fit.params["beta[1]"], 4))
    om, al, be, muc = fit.params["omega"], fit.params["alpha[1]"], fit.params["beta[1]"], fit.params["mu"]
    # filtro con parametri fissi su tutta la serie
    eps = (r - muc).values
    s2 = np.empty(len(r) + 1)
    s2[0] = eps[:2500].var()
    for t in range(len(r)):
        s2[t + 1] = om + al * eps[t] ** 2 + be * s2[t]
    # s2[t] = varianza condizionata per il giorno t (info fino a t-1); s2[t+1] = previsione fatta alla chiusura di t
    sig_t = pd.Series(np.sqrt(s2[:-1]), index=r.index)          # "1-step" per il giorno t (come nel fascicolo, probabilmente)
    f1_next = pd.Series(np.sqrt(s2[1:]), index=r.index)         # previsione per t+1 fatta al close t
    ubar = om / (1 - al - be)
    H_ = 21
    pers = al + be
    wts = np.array([pers ** (h - 1) for h in range(1, H_ + 1)])
    avgvar21 = ubar + (s2[1:] - ubar) * wts.mean()               # media varianze t+1..t+21
    f21 = pd.Series(np.sqrt(avgvar21), index=r.index)
    ann = np.sqrt(252)
    df = pd.DataFrame({
        "garch_t": sig_t * ann, "garch_1next": f1_next * ann, "garch_21": f21 * ann,
        "vix": vix.close.reindex(r.index),
    })
    rr = r / 100
    df["rv30_trail"] = rr.rolling(30).std() * ann * 100
    df["rv21_trail"] = rr.rolling(21).std() * ann * 100
    df["rv21_fwd"] = np.sqrt((rr ** 2).rolling(21).mean().shift(-21)) * ann * 100      # t+1..t+21 (RMS)
    df["rv21_fwd_std"] = rr.rolling(21).std().shift(-21) * ann * 100
    df["rv30_fwd"] = np.sqrt((rr ** 2).rolling(30).mean().shift(-30)) * ann * 100
    # VIX scalato con premio al rischio stimato SOLO 1990-1999 (nessun look-ahead)
    pre = df.loc["1990":"1999"].dropna(subset=["vix", "rv21_fwd"])
    k_var = np.sqrt((pre.rv21_fwd ** 2).mean() / (pre.vix ** 2).mean())
    k_diff = (pre.vix - pre.rv21_fwd).mean()
    df["vix_scaled"] = df.vix * k_var
    df["vix_minus_vrp"] = df.vix - k_diff
    p(f"VRP stimato 1990-99: fattore varianza k={k_var:.3f} ; differenza media VIX-RVfwd = {k_diff:.2f} punti")
    oos = df.loc["2000-01-01":]
    p("osservazioni OOS con VIX:", oos.vix.notna().sum())


    def metrics(y, x):
        m = pd.concat([y, x], axis=1).dropna()
        yv, xv = m.iloc[:, 0], m.iloc[:, 1]
        e = yv - xv
        X = sm.add_constant(xv.values)
        mz = sm.OLS(yv.values, X).fit(cov_type="HAC", cov_kwds={"maxlags": 21})
        ql = (yv ** 2 / xv ** 2 - np.log(yv ** 2 / xv ** 2) - 1).mean()
        smape = 100 * (np.abs(e) / ((np.abs(yv) + np.abs(xv)) / 2)).mean()
        return dict(n=len(m), MAE=np.abs(e).mean(), RMSE=np.sqrt((e ** 2).mean()), Corr=yv.corr(xv),
                    R2=yv.corr(xv) ** 2, a=mz.params[0], b=mz.params[1], b_se=mz.bse[1],
                    bias=e.mean(), sMAPE=smape, QLIKE=ql)


    res = []
    for tgt in ["rv30_trail", "rv21_trail", "rv21_fwd", "rv30_fwd"]:
        for fc in ["garch_t", "garch_1next", "garch_21", "vix", "vix_scaled", "vix_minus_vrp"]:
            mm_ = metrics(oos[tgt], oos[fc].where(oos.vix.notna()))
            res.append(dict(target=tgt, forecast=fc, **mm_))
    t33 = pd.DataFrame(res)
    t33.to_csv(os.path.join(OUT, f"s33_metriche_{tag}.csv"), index=False)
    p(t33.round(3).to_string())
    # Diebold-Mariano (MSE) garch_21 vs vix e vs vix_scaled su target forward
    for tgt in ["rv21_fwd"]:
        for a_, b_ in [("garch_21", "vix"), ("garch_21", "vix_scaled"), ("garch_21", "vix_minus_vrp")]:
            m = oos[[tgt, a_, b_]].dropna()
            dloss = (m[tgt] - m[a_]) ** 2 - (m[tgt] - m[b_]) ** 2
            ols = sm.OLS(dloss.values, np.ones(len(dloss))).fit(cov_type="HAC", cov_kwds={"maxlags": 21})
            p(f"DM MSE {a_} - {b_} su {tgt}: diff media={dloss.mean():.2f}, t_HAC={ols.tvalues[0]:.2f} (negativo = {a_} migliore)")
    # encompassing: rv_fwd = a + b1 garch21 + b2 vix
    m = oos[["rv21_fwd", "garch_21", "vix"]].dropna()
    enc = sm.OLS(m.rv21_fwd, sm.add_constant(m[["garch_21", "vix"]])).fit(cov_type="HAC", cov_kwds={"maxlags": 21})
    p("encompassing rv21_fwd = a + b1*garch21 + b2*vix:", enc.params.round(3).to_dict(), "t:", enc.tvalues.round(2).to_dict(),
      "R2", round(enc.rsquared, 3))
    # quanto è "meccanico" il legame GARCH-realizzata trailing: corr realizzata trailing vs sua stessa versione ritardata
    p("benchmark naive: RV30 trailing di ieri come previsione di RV30 trailing di oggi:",
      {k: round(v, 3) for k, v in metrics(oos.rv30_trail, oos.rv30_trail.shift(1).where(oos.vix.notna())).items()
       if k in ("MAE", "Corr")})
    p("benchmark random walk corretto: RV21 trailing (al close t) come previsione di RV21 forward:",
      {k: round(v, 3) for k, v in metrics(oos.rv21_fwd, oos.rv21_trail.where(oos.vix.notna())).items()
       if k in ("MAE", "RMSE", "Corr", "QLIKE")})


    return t33


t33_main = garch_study("1990", "train1990")
p("\n--- robustezza: GARCH stimato 1950-1999 ---")
t33_alt = garch_study("1950", "train1950")

# ================================================================ 34
H("SEZ 34 - SPX dopo giorni con VIX>30 (1990+)")
cl = spx.close
fw = pd.DataFrame({f"{m}m": fwd(cl, h) for m, h in [(1, 21), (3, 63), (6, 126), (12, 252)]})
v = vix.close.reindex(cl.index).dropna()
sel = v[v > 30].index
X = fw.reindex(sel)
base = fw.loc["1990-01-02":]
rows = []
for col in fw.columns:
    x = X[col].dropna()
    b = base[col].dropna()
    rows.append(dict(orizzonte=col, n_giorni=len(x), media=100 * x.mean(), sd=100 * x.std(), mediana=100 * x.median(),
                     win=100 * (x > 0).mean(), base_media=100 * b.mean(), base_sd=100 * b.std(), base_win=100 * (b > 0).mean()))
t34 = pd.DataFrame(rows)
p(f"giorni VIX>30 (close): {len(sel)} su {len(v)} ({100 * len(sel) / len(v):.1f}%)")
p(t34.round(2).to_string())
t34.to_csv(os.path.join(OUT, "s34_giorni.csv"), index=False)
for gap in [21, 63]:
    pos = v.index.get_indexer(sel)
    eid = np.concatenate([[0], np.cumsum(np.diff(pos) >= gap)])
    p(f"episodi distinti (giorni VIX>30 separati da >= {gap} sedute): {eid.max() + 1}")
pos = v.index.get_indexer(sel)
eid = np.concatenate([[0], np.cumsum(np.diff(pos) >= 63)])
erows = []
for k in range(eid.max() + 1):
    d_ = sel[eid == k]
    first = d_[0]
    peak = v.loc[d_[0]:d_[-1]].idxmax()
    erows.append(dict(episodio=k + 1, primo=first.date(), ultimo=d_[-1].date(), giorni=len(d_),
                      vix_primo=v[first], picco=peak.date(), vix_picco=v[peak],
                      **{f"primo_{c_}": 100 * fw.loc[first, c_] for c_ in fw.columns},
                      **{f"picco_{c_}": 100 * fw.loc[peak, c_] for c_ in fw.columns},
                      peso_giorni=len(d_) / len(sel)))
te = pd.DataFrame(erows)
te.to_csv(os.path.join(OUT, "s34_episodi.csv"), index=False)
p(te.round(1).to_string())
for pre in ["primo", "picco"]:
    p(f"media per episodio ({pre} giorno):",
      {c_: round(te[f"{pre}_{c_}"].mean(), 2) for c_ in fw.columns},
      " win:", {c_: round(100 * (te[f"{pre}_{c_}"] > 0).sum() / te[f"{pre}_{c_}"].notna().sum(), 0) for c_ in fw.columns},
      " mediana:", {c_: round(te[f"{pre}_{c_}"].median(), 2) for c_ in fw.columns})
p("episodi con 12m negativo dal primo giorno:", list(te.loc[te["primo_12m"] < 0, "primo"]))
p("quota dei giorni VIX>30 dovuta a 2008-09:", round(100 * te.loc[te.primo.astype(str).str[:4].isin(['2008']), 'peso_giorni'].sum(), 1), "%")
# giorni con 12m negativo per anno
neg = X["12m"].dropna()
p("giorni VIX>30 con 12m<0 per anno:", neg[neg < 0].groupby(neg[neg < 0].index.year).size().to_dict())
p("sensibilità: media 12m giorni VIX>30 escluso 2008-2009:", round(100 * X["12m"].drop(X.loc['2008':'2009'].index).mean(), 2))
LOG.close()
