"""Controllo 1.11.0: seconda fonte (Nasdaq, api.nasdaq.com historical) per SPY, QQQ e SOXX. Confronta massimo, minimo,
chiusura e volume giornalieri con Yahoo (risposte di ATH_RAW_DIR) e rifà il profilo con le barre di Nasdaq (stesso metodo di
ricalcolo.py, scala del grafico da Yahoo) contro quello pubblicato.
Uso: python3 -I seconda_fonte.py <raw_dir> <dir con spy_nasdaq.json ...> <ath_history.json>"""
import json, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ricalcolo as R
raw, src, pub = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))["profiles"]
num = lambda s: float(s.replace(",", "").replace("$", ""))
for mid, sym, chart_sym in (("SPX", "SPY", "^GSPC"), ("NDX", "QQQ", "^NDX"), ("SOXX", "SOXX", "SOXX")):
    rows = json.load(open(os.path.join(src, f"{sym.lower()}_nasdaq.json")))["data"]["tradesTable"]["rows"]
    nq = {}
    for r in rows:
        if "N/A" in (r["high"], r["low"], r["close"], r["volume"]): continue
        m, d, y = r["date"].split("/"); nq[f"{y}-{m}-{d}"] = dict(h=num(r["high"]), l=num(r["low"]), c=num(r["close"]), v=num(r["volume"]))
    cr, f = R.load(raw, "d", chart_sym); chart = R.daily_bars(cr, f)
    vr, vf = R.load(raw, "d", sym); yv = {b["d"]: b for b in R.daily_bars(vr, vf)}
    to = chart[-1]["d"]; fr = R.year_before(to); cm = {b["d"]: b["c"] for b in chart}
    days = sorted(d for d in cm if fr <= d <= to)
    miss = [d for d in days if d not in nq]
    dv = [abs(nq[d]["v"] / yv[d]["v"] - 1) for d in days if d in nq and yv[d]["v"]]
    dh = max(abs(nq[d]["h"] / yv[d]["h"] - 1) for d in days if d in nq)
    dl = max(abs(nq[d]["l"] / yv[d]["l"] - 1) for d in days if d in nq)
    dc = max(abs(nq[d]["c"] / yv[d]["c"] - 1) for d in days if d in nq)
    big = sorted(((abs(nq[d]["v"] / yv[d]["v"] - 1), d) for d in days if d in nq and yv[d]["v"]), reverse=True)[:3]
    # profilo con le barre di Nasdaq
    bars = []
    for d in days:
        if d not in nq: continue
        b = nq[d]; k = cm[d] / b["c"]; h, l = max(b["h"], b["c"]) * k, min(b["l"], b["c"]) * k
        bars.append(dict(h=h, l=l, c=b["c"] * k, v=b["v"]))
    p = pub[mid]; L0, L1 = math.log(p["lo"]), math.log(p["hi"]); w = (L1 - L0) / 100; vol = [0.0] * 100
    for b in bars:  # stesse fasce del pubblicato (lo/hi di Yahoo), per confrontare fascia per fascia
        a, z = math.log(max(b["l"], p["lo"])), math.log(min(b["h"], p["hi"]))
        if z <= a: vol[min(99, max(0, int((math.log(b["c"]) - L0) / w)))] += b["v"]; continue
        for j in range(max(0, int((a - L0) / w)), min(99, int((z - L0) / w)) + 1):
            ov = min(z, L0 + (j + 1) * w) - max(a, L0 + j * w)
            if ov > 0: vol[j] += b["v"] * ov / (z - a)
    t = sum(vol); q = [x / t * 10000 for x in vol]; bp = p["bp"]
    sad = sum(abs(x - y) for x, y in zip(q, bp)) / 2 / 100  # punti percentuali di volume spostati
    top = lambda a: sorted(range(100), key=lambda i: -a[i])[:3]
    print(f"{mid:5} {sym}: sedute {len(days)}, mancanti in Nasdaq {len(miss)}; |Δ| max massimo {dh:.4%} minimo {dl:.4%} chiusura {dc:.4%}; "
          f"volume |Δ| mediana {sorted(dv)[len(dv)//2]:.2%} max {big[0][0]:.1%} ({big[0][1]}); profilo: {sad:.2f}% del volume in fasce diverse, "
          f"3 fasce più alte Yahoo {top(bp)} Nasdaq {top(q)}")
