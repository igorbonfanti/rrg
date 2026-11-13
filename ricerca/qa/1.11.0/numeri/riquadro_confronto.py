"""Controllo 1.11.0: riquadri letti nel browser (riquadro_browser.cjs) contro il ricalcolo indipendente (ricalcolo.py):
estremi della fascia unita (lo·(hi/lo)^(i/100)) e quota del volume, a una cifra decimale; legenda con date e strumento.
Uso: python3 -I riquadro_confronto.py <raw_dir> <config/ath.json> <tips.json> [...]"""
import json, sys, os, re, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ricalcolo as R
from decimal import Decimal, ROUND_HALF_UP
raw, cfg = sys.argv[1], {c["id"]: c for c in json.load(open(sys.argv[2]))["markets"]}
num = lambda s: float(s.replace(".", "").replace(",", "."))
dit = lambda d: f"{d[8:10]}/{d[5:7]}/{d[:4]}"
P = {k: R.profile(c, raw) for k, c in cfg.items() if "profile" in c}
bad = tot = 0
for f in sys.argv[3:]:
    T = json.load(open(f))
    for k, m in T["markets"].items():
        p, g = P[k], m["merge"]; nb = 100 // g
        n_eq = n_round = n_bad = n_lohi = 0
        if m["n"] != nb or len(m["tips"]) != nb: print(f"{f} {k}: barre {m['n']} attese {nb}"); bad += 1; continue
        leg = f"dal {dit(p['frm'])} al {dit(p['to'])} ({cfg[k]['profile']['text']})"
        if leg not in m["legend"]: print(f"{k}: legenda senza «{leg}»"); bad += 1
        for i, t in enumerate(m["tips"]):
            tot += 1
            mm = re.search(r"Prezzi da ([\d.,]+) a ([\d.,]+)</span><b>([\d,]+)%</b>", t or "")
            if not mm: print(f"{k} barra {i}: riquadro illeggibile {t!r}"); bad += 1; continue
            a, b, pct = num(mm.group(1)), num(mm.group(2)), num(mm.group(3))
            ea = p["lo"] * (p["hi"] / p["lo"]) ** (i * g / 100); eb = p["lo"] * (p["hi"] / p["lo"]) ** ((i + 1) * g / 100)
            dec = len(mm.group(1).split(",")[1]) if "," in mm.group(1) else 0
            ok_px = abs(a - ea) <= 0.51 * 10 ** -dec + 1e-9 and abs(b - eb) <= 0.51 * 10 ** -dec + 1e-9
            exact = sum(p["exact"][i * g:(i + 1) * g]) / 100
            r1 = float(Decimal(repr(exact)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
            if not ok_px:
                # stessi estremi con lo e hi a 8 cifre significative (come li scrive il file)?
                l8, h8 = float(f"{p['lo']:.8g}"), float(f"{p['hi']:.8g}")
                fa = l8 * (h8 / l8) ** (i * g / 100); fb = l8 * (h8 / l8) ** ((i + 1) * g / 100)
                if abs(a - fa) <= 0.51 * 10 ** -dec and abs(b - fb) <= 0.51 * 10 ** -dec: n_lohi += 1; print(f"   {k} barra {i}: mostrati {mm.group(1)}–{mm.group(2)}, esatti {ea:.4f}–{eb:.4f} (lo/hi a 8 cifre)")
                else: n_bad += 1; print(f"{k} barra {i}: prezzi {a}–{b} contro {ea:.6g}–{eb:.6g}")
            if abs(pct - r1) < 1e-9: n_eq += 1
            elif abs(pct - r1) <= 0.1 + 1e-9 and abs(pct - exact) <= 0.05 + 0.03: n_round += 1  # arrotondamento dei bp
            else: n_bad += 1; print(f"{k} barra {i}: quota {pct}% contro {exact:.4f}%")
        bad += n_bad
        print(f"{os.path.basename(f)} {k:7} fasce unite {g}: {nb} riquadri, quota uguale {n_eq}, ±0,1 per l'arrotondamento dei bp {n_round}, estremi con l'ultima cifra diversa per lo/hi a 8 cifre {n_lohi}, diversi {n_bad}")
print(f"{tot} riquadri controllati, {bad} problemi")
sys.exit(1 if bad else 0)
