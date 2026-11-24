#!/usr/bin/env python3
"""
Controllo indipendente 1.11.0 (numeri): ricalcolo del profilo dei volumi degli ultimi 12 mesi dalle risposte grezze di
Yahoo salvate da `ATH_RAW_DIR=<dir> node scripts/fetch_ath.js` (formato {fetched, res}), senza usare il codice di
scripts/lib/volprofile.js né di ricerca/poc/profilo/analisi.mjs: solo il metodo dichiarato in ricerca/poc/profilo/sintesi.md
e nella guida.

Uso: python3 -I ricalcolo.py <raw_dir> <config/ath.json> <ath_history.json da confrontare> [<ath_history.json> ...]
Esce con 1 se un campo diverso (oltre l'arrotondamento dichiarato: bp interi, lo/hi a 8 cifre significative) è trovato.
"""
import json, math, sys, os, statistics
from datetime import datetime, timedelta, timezone, date
from zoneinfo import ZoneInfo


def load(raw_dir, kind, sym):
    fn = os.path.join(raw_dir, f"{kind}_{''.join(ch if (ch.isalnum() or ch in '.-') else '_' for ch in sym)}.json")
    with open(fn) as f:
        j = json.load(f)
    return j["res"], datetime.fromisoformat(j["fetched"].replace("Z", "+00:00"))


def daily_bars(res, fetched):
    """Barre giornaliere chiuse: data nel fuso della borsa; scarta chiusura nulla e la seduta ancora aperta (o chiusa da meno
    di un'ora) secondo currentTradingPeriod; date doppie: l'ultima. high >= close >= low."""
    m = res["meta"]
    tz = ZoneInfo(m.get("exchangeTimezoneName") or "UTC")
    q = res["indicators"]["quote"][0]
    reg = (m.get("currentTradingPeriod") or {}).get("regular")
    now = fetched.timestamp()
    out = {}
    order = []
    for i, t in enumerate(res["timestamp"]):
        c = q["close"][i] if q.get("close") else None
        if reg and t >= reg["start"] and now < reg["end"] + 3600:
            continue
        if c is None:
            continue
        d = datetime.fromtimestamp(t, tz).date().isoformat()
        h = q["high"][i] if q.get("high") else None
        l = q["low"][i] if q.get("low") else None
        v = q["volume"][i] if q.get("volume") else None
        b = dict(d=d, c=c, h=max(h, c) if h is not None else c, l=min(l, c) if l is not None else c, v=v)
        if d not in out:
            order.append(d)
        out[d] = b
    return [out[d] for d in order]


def hourly_bars(res):
    m = res["meta"]
    tz = ZoneInfo(m.get("exchangeTimezoneName") or "UTC")
    fut = m.get("instrumentType") == "FUTURE"
    q = res["indicators"]["quote"][0]
    out = []
    for i, t in enumerate(res["timestamp"]):
        c = q["close"][i]
        if c is None:
            continue
        lt = datetime.fromtimestamp(t, tz)
        d = lt.date()
        if fut and lt.hour >= 18:
            d = d + timedelta(days=1)
        h, l, v = q["high"][i], q["low"][i], q["volume"][i]
        out.append(dict(d=d.isoformat(), c=c, h=max(h, c) if h is not None else c, l=min(l, c) if l is not None else c, v=v or 0))
    return out


def year_before(d):
    y, mo, da = map(int, d.split("-"))
    try:
        return date(y - 1, mo, da).isoformat()
    except ValueError:  # 29 febbraio
        return date(y - 1, mo, 28).isoformat()


def profile(cfg, raw_dir):
    p = cfg["profile"]
    chart_raw, fetched = load(raw_dir, "d", cfg["symbol"])
    chart = daily_bars(chart_raw, fetched)
    to = chart[-1]["d"]
    frm = year_before(to)
    cmap = {b["d"]: b["c"] for b in chart}
    if p["vol"] == cfg["symbol"]:
        vol = chart
    else:
        vr, vf = load(raw_dir, "d", p["vol"])
        vol = daily_bars(vr, vf)
    vmap = {b["d"]: b["c"] for b in vol}
    info = dict(skipped=0, stale=[], cand=0)
    bars = []
    use_hourly = False
    if p.get("hourly"):
        hr, _ = load(raw_dir, "h", p["vol"])
        hb = [x for x in hourly_bars(hr) if frm <= x["d"] <= to]
        hsum = {}
        for x in hb:
            hsum[x["d"]] = hsum.get(x["d"], 0) + x["v"]
        ratios = [(b["v"] or 0) / hsum[b["d"]] for b in vol if frm <= b["d"] <= to and hsum.get(b["d"], 0) > 0]
        info["ratio"] = statistics.median(ratios) if ratios else None
        info["first_hourly"] = hb[0]["d"] if hb else None
        use_hourly = info["ratio"] is not None and info["ratio"] < 0.5
        if use_hourly:
            days = {}
            for x in hb:
                a = days.setdefault(x["d"], dict(d=x["d"], h=x["h"], l=x["l"], c=x["c"], v=0))
                a["h"] = max(a["h"], x["h"]); a["l"] = min(a["l"], x["l"]); a["c"] = x["c"]; a["v"] += x["v"]
            for d in sorted(days):
                info["cand"] += 1
                if d not in cmap or d not in vmap:
                    info["skipped"] += 1
                    continue
                k = cmap[d] / vmap[d]
                a = days[d]
                bars.append(dict(d=d, h=a["h"] * k, l=a["l"] * k, c=a["c"] * k, v=a["v"]))
    if not use_hourly:
        prev_v = None
        for b in vol:
            v = b["v"] or 0
            if frm <= b["d"] <= to:
                info["cand"] += 1
                if b["d"] not in cmap:
                    info["skipped"] += 1
                else:
                    k = cmap[b["d"]] / b["c"]
                    vv = v
                    if v > 0 and prev_v == v:
                        info["stale"].append(b["d"]); vv = 0
                    bars.append(dict(d=b["d"], h=b["h"] * k, l=b["l"] * k, c=b["c"] * k, v=vv))
            prev_v = v
    lo = min(b["l"] for b in bars); hi = max(b["h"] for b in bars)
    L0, L1, n = math.log(lo), math.log(hi), 100
    w = (L1 - L0) / n
    vols = [0.0] * n
    for b in bars:
        if not b["v"]:
            continue
        a, z = math.log(b["l"]), math.log(b["h"])
        if z <= a:
            j = min(n - 1, max(0, int((math.log(b["c"]) - L0) / w)))
            vols[j] += b["v"]; continue
        j0 = min(n - 1, max(0, int((a - L0) / w))); j1 = min(n - 1, max(0, int((z - L0) / w)))
        for j in range(j0, j1 + 1):
            ov = min(z, L0 + (j + 1) * w) - max(a, L0 + j * w)
            if ov > 0:
                vols[j] += b["v"] * ov / (z - a)
    tot = sum(vols)
    exact = [x / tot * 10000 for x in vols]
    return dict(frm=frm, to=to, sessions=len(bars), source="orarie" if use_hourly else "giornaliere", lo=lo, hi=hi,
                bp=[round(x) for x in exact], exact=exact, info=info, novol=sum(1 for b in bars if not b["v"]))


def sig8(x):
    return float(f"{x:.8g}")


def main():
    raw_dir, cfg_path, files = sys.argv[1], sys.argv[2], sys.argv[3:]
    cfg = json.load(open(cfg_path))["markets"]
    ref = [json.load(open(f))["profiles"] for f in files]
    bad = 0
    for c in cfg:
        if "profile" not in c:
            continue
        r = profile(c, raw_dir)
        i = r["info"]
        print(f"{c['id']:7} {r['frm']}..{r['to']} sedute {r['sessions']} {r['source']} lo {sig8(r['lo'])} hi {sig8(r['hi'])} "
              f"somma bp {sum(r['bp'])} senza chiusura comune {i['skipped']}/{i['cand']} ricopiati {i['stale']} senza volume {r['novol']}"
              + (f" giorn/orario {i['ratio']:.4f} prima oraria {i['first_hourly']}" if 'ratio' in i else ""))
        for f, P in zip(files, ref):
            p = P.get(c["id"])
            if p is None:
                print(f"   {os.path.basename(f)}: profilo null"); bad += 1; continue
            diffs = []
            for k, mine in (("from", r["frm"]), ("to", r["to"]), ("sessions", r["sessions"]), ("source", r["source"])):
                if p[k] != mine:
                    diffs.append(f"{k} {p[k]} contro {mine}")
            for k, mine in (("lo", r["lo"]), ("hi", r["hi"])):
                if abs(p[k] - mine) / mine > 1e-7:
                    diffs.append(f"{k} {p[k]} contro {mine}")
            if p["n"] != 100 or p["scale"] != "log" or len(p["bp"]) != 100:
                diffs.append("n/scale/len")
            nd = [(j, p["bp"][j], r["bp"][j], round(r["exact"][j], 4)) for j in range(100) if p["bp"][j] != r["bp"][j]]
            # differenza ammessa: solo bp a cavallo di x,5 (arrotondamento), al massimo 1
            real = [x for x in nd if abs(x[1] - x[2]) > 1 or abs(abs(x[3] - math.floor(x[3])) - 0.5) > 1e-3]
            tag = "uguale" if not diffs and not nd else ("solo arrotondamento" if not diffs and not real else "DIVERSO")
            if tag == "DIVERSO":
                bad += 1
            print(f"   {os.path.basename(os.path.dirname(f)) or '.'}/{os.path.basename(f)}: {tag}" + (f" {diffs}" if diffs else "")
                  + (f" bp diversi {nd[:6]}" if nd else "") + f"; max |bp-esatto| {max(abs(a - b) for a, b in zip(p['bp'], r['exact'])):.3f}")
    print("DIFFERENZE" if bad else "TUTTO UGUALE")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
