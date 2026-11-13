"""Controllo 1.11.0: sedute del grafico nella finestra che lo strumento dei volumi non ha (non contate da `skipped`).
Uso: python3 -I copertura.py <raw_dir> <config/ath.json>"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ricalcolo as R
raw, cfg = sys.argv[1], json.load(open(sys.argv[2]))["markets"]
for c in cfg:
    p = c.get("profile")
    if not p: continue
    cr, f = R.load(raw, "d", c["symbol"]); ch = R.daily_bars(cr, f)
    to = ch[-1]["d"]; fr = R.year_before(to)
    cd = {b["d"] for b in ch if fr <= b["d"] <= to}
    if p.get("hourly"):
        hr, _ = R.load(raw, "h", p["vol"]); vd = {x["d"] for x in R.hourly_bars(hr) if fr <= x["d"] <= to}
    elif p["vol"] != c["symbol"]:
        vr, vf = R.load(raw, "d", p["vol"]); vd = {b["d"] for b in R.daily_bars(vr, vf) if fr <= b["d"] <= to}
    else:
        vd = cd
    print(f"{c['id']:7} grafico {len(cd)} sedute; strumento {len(vd)}; solo nel grafico {sorted(cd - vd)}; solo nello strumento {sorted(vd - cd)}")
