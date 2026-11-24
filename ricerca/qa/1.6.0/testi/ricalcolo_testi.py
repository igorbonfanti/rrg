#!/usr/bin/env python3
"""
Controllo testi 1.6.0 (agente indipendente): ricalcola da data/vix.json, senza il codice dell'app, i numeri citati
nei testi della vista 8 per la struttura a termine e il credito:
- data d'inizio del VIX3M (testi: 04/12/2007) e dell'HYG/IEF (testi: «dal 2007»);
- calo massimo di HYG/IEF dal massimo di 252 sedute nel 2008 e nel 2020 (testi: 2008 −41%, 2020 −29%);
- quota di sedute con il VIX >= 30 in backwardation e episodi del VIX >= 30 dal 2008 in backwardation al segnale;
- valori di oggi dei due riquadri (R, percentile, credito, variazione a 21 sedute, percentile del calo).
Uso: python3 -I ricerca/qa/1.6.0/testi/ricalcolo_testi.py
"""
import json, datetime, pathlib, bisect

ROOT = pathlib.Path(__file__).resolve().parents[4]
D = json.loads((ROOT / 'data/vix.json').read_text())


def series(x):
    t = datetime.date.fromisoformat(x['d0'])
    dates = [t]
    for ch in x['gaps']:
        t = t + datetime.timedelta(days=int(ch, 36))
        dates.append(t)
    ps = x.get('ps') or 1
    vals, p = [], None
    for r in x['cd']:
        if r is None:
            p = None; vals.append(None); continue
        p = r if p is None else p + r
        vals.append(p / ps)
    return dict(zip([d.isoformat() for d in dates], vals))


S = {k: series(v) for k, v in D['series'].items()}
spx = sorted(S['SPX'])
vix, v3, cr = S['VIX'], S['VIX3M'], S['HYGIEF']
out = {}
out['VIX3M_primo'] = min(v3)
out['HYGIEF_primo'] = min(cr)
out['HYGIEF_valori'] = len(cr)

# credito: distanza dal massimo delle ultime 252 osservazioni valide (oggi compreso), solo sulle sedute dell'S&P 500
cd = [d for d in spx if cr.get(d) is not None]
dd = {}
for i, d in enumerate(cd):
    if i + 1 < 252: continue
    win = [cr[x] for x in cd[i - 251:i + 1]]
    dd[d] = (cr[d] / max(win) - 1) * 100
for y in ('2008', '2009', '2011', '2015', '2016', '2018', '2020', '2022', '2025'):
    v = {d: x for d, x in dd.items() if d.startswith(y)}
    if v:
        m = min(v, key=v.get); out[f'dd_min_{y}'] = (m, round(v[m], 2))
m = min(dd, key=dd.get); out['dd_min_tutto'] = (m, round(dd[m], 2))
out['dd_primo'] = min(dd)

# oggi
last = cd[-1]
ch = (cr[last] / cr[cd[-1 - 21]] - 1) * 100
hist = sorted(-dd[d] for d in dd)  # profondità del calo, storia fino a oggi (oggi compreso)
pct_dd = bisect.bisect_right(hist, -dd[last]) / len(hist) * 100
out['credito_oggi'] = dict(data=last, dd=round(dd[last], 2), ch21=round(ch, 2), pct=round(pct_dd, 1), n=len(hist))

# struttura a termine
R = {d: vix[d] / v3[d] for d in spx if vix.get(d) is not None and v3.get(d) is not None}
rd = sorted(R)
lastR = rd[-1]
hr = sorted(R.values())
out['R_oggi'] = dict(data=lastR, vix=vix[lastR], v3=v3[lastR], r=round(R[lastR], 4),
                     pct=round(bisect.bisect_right(hr, R[lastR]) / len(hr) * 100, 1), n=len(hr))
out['R_sedute'] = len(R)
out['R_backw'] = sum(1 for x in R.values() if x >= 1)
out['R_max'] = max(R.items(), key=lambda kv: kv[1])
out['R_min'] = min(R.items(), key=lambda kv: kv[1])

# episodi del VIX >= 30 dal 2008 (prima chiusura >= 30 dopo almeno 63 sedute sotto), R al segnale
vd = [d for d in spx if vix.get(d) is not None]
ep, below = [], 10**9
for d in vd:
    if vix[d] >= 30:
        if below >= 63: ep.append(d)
        below = 0
    else:
        below += 1
ep08 = [d for d in ep if d >= '2008-01-01']
out['episodi_vix30_dal_2008'] = [(d, round(R.get(d, float('nan')), 3)) for d in ep08]
out['episodi_vix30_dal_2008_backw'] = f"{sum(1 for d in ep08 if R.get(d, 0) >= 1)} su {len(ep08)}"
s30 = [d for d in R if vix[d] >= 30]
out['sedute_vix30_backw'] = f"{sum(1 for d in s30 if R[d] >= 1)} su {len(s30)}"

for k, v in out.items():
    print(k, v)
(pathlib.Path(__file__).parent / 'ricalcolo_testi.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
