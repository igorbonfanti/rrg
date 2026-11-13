"""Controllo 1.11.0: la percentuale del riquadro (fasce unite a gruppi di k, una cifra decimale, da bp arrotondati e
normalizzati sulla loro somma come in js/vix-view.js) contro la quota esatta ricalcolata da ricalcolo.py.
Uso: python3 -I riquadro.py <raw_dir> <config/ath.json>"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ricalcolo as R
from decimal import Decimal, ROUND_HALF_UP
def r1(x):  # toLocaleString/Intl a una cifra: arrotondamento a metà verso l'alto
    return Decimal(repr(x)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
raw, cfg = sys.argv[1], json.load(open(sys.argv[2]))["markets"]
tot_g = tot_bad = 0
for c in cfg:
    if "profile" not in c: continue
    p = R.profile(c, raw); bp, ex = p["bp"], p["exact"]; s = sum(bp)
    line = []
    for k in [1, 2, 4, 5, 10, 20, 25, 50]:
        bad = []; maxd = 0
        for g in range(100 // k):
            a = sum(bp[g*k:(g+1)*k]) / s * 100; b = sum(ex[g*k:(g+1)*k]) / 100
            maxd = max(maxd, abs(a - b))
            if r1(a) != r1(b): bad.append((g, str(r1(a)), str(r1(b))))
        tot_g += 100 // k; tot_bad += len(bad)
        line.append(f"k={k}: {len(bad)} su {100//k} (max {maxd:.3f} punti)")
    print(f"{c['id']:7} " + "; ".join(line))
print(f"in tutto {tot_bad} percentuali diverse alla prima cifra decimale su {tot_g}")
