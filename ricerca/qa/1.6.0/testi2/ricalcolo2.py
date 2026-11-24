#!/usr/bin/env python3
"""
Controllo testi 1.6.0, secondo giro (agente indipendente). Ricalcola senza il codice dell'app:
- calo più profondo di HYG/IEF dal massimo di 252 sedute nel 2008-2009 e nel 2020 (guida: −41% e −29%; README: 11/12/2008 e 23/03/2020);
- episodi del VIX >= 30 (prima chiusura >= 30 dopo almeno 63 chiusure sotto) dal 04/12/2007, e quanti hanno VIX/VIX3M >= 1
  la sera del segnale (testi: «13 su 13», «tutti … in backwardation il giorno del segnale»);
- sedute con VIX/VIX3M >= 1 e > 1 dal 04/12/2007 al 05/11/2026 sui dati dell'app (guida: 478);
- FRED VIXCLS contro Cboe VIX_History.csv (cache di ricerca/vix/struttura/dati): date comuni, differenze, date comuni
  che non sono sedute dell'S&P 500 (README: «0 differenze su 9.309 date»).
Uso: python3 -I ricerca/qa/1.6.0/testi2/ricalcolo2.py  → ricalcolo2.json
"""
import json, datetime, pathlib, csv

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
spx = sorted(d for d, v in S['SPX'].items() if v is not None)
vix, v3, cr = S['VIX'], S['VIX3M'], S['HYGIEF']
out = {'asOf': D['asOf']}

# 1. credito
cd = [d for d in spx if cr.get(d) is not None]
dd = {}
for i, d in enumerate(cd):
    if i + 1 < 252: continue
    dd[d] = (cr[d] / max(cr[x] for x in cd[i - 251:i + 1]) - 1) * 100
for k, a, b in (('2008-2009', '2008-01-01', '2009-12-31'), ('2020', '2020-01-01', '2020-12-31')):
    m = min((d for d in dd if a <= d <= b), key=lambda d: dd[d])
    out['credito_min_' + k] = {'data': m, 'calo': round(dd[m], 2)}
out['credito_min_tutta_la_storia'] = (lambda m: {'data': m, 'calo': round(dd[m], 2)})(min(dd, key=dd.get))
out['credito_prima_distanza'] = min(dd)

# 2. episodi del VIX >= 30
vd = [d for d in spx if vix.get(d) is not None]
eps = []
for i, d in enumerate(vd):
    if i >= 63 and vix[d] >= 30 and all(vix[x] < 30 for x in vd[i - 63:i]):
        eps.append(d)
ep08 = [d for d in eps if d >= '2007-12-04']
rows = [{'data': d, 'vix': vix[d], 'vix3m': v3.get(d), 'R': round(vix[d] / v3[d], 4) if v3.get(d) else None} for d in ep08]
out['episodi_vix30_dal_2007_12_04'] = rows
out['episodi_n'] = len(rows)
out['episodi_in_backwardation_al_segnale'] = sum(1 for r in rows if r['R'] is not None and r['R'] >= 1)

# 3. sedute in backwardation sui dati dell'app
R = {d: vix[d] / v3[d] for d in spx if vix.get(d) is not None and v3.get(d)}
per = [d for d in R if '2007-12-04' <= d <= '2026-11-05']
out['sedute_R_dal_2007_12_04_al_2026_11_05'] = len(per)
out['sedute_R_ge_1'] = sum(1 for d in per if R[d] >= 1)
out['sedute_R_gt_1'] = sum(1 for d in per if R[d] > 1)
out['sedute_R_uguale_1'] = [d for d in per if abs(R[d] - 1) < 1e-12]

# 4. FRED contro Cboe (file in cache)
C = ROOT / 'ricerca/vix/struttura/dati/cache'
fred = {}
for r in csv.DictReader(open(C / 'fred_VIXCLS.csv')):
    try: fred[r['observation_date']] = float(r['VIXCLS'])
    except ValueError: pass
cboe = {}
for r in csv.DictReader(open(C / 'cboe_VIX.csv')):
    m, dday, y = r['DATE'].split('/')
    cboe[f'{y}-{m}-{dday}'] = float(r['CLOSE'])
com = sorted(set(fred) & set(cboe))
sset = set(spx)
out['fred_cboe'] = {
    'comuni': len(com), 'dal': com[0], 'al': com[-1],
    'diverse_0005': sum(1 for d in com if abs(fred[d] - cboe[d]) > 0.005),
    'comuni_non_sedute_spx': len([d for d in com if d not in sset and d <= spx[-1]]),
    'comuni_fino_al_2026_11_05': len([d for d in com if d <= '2026-11-05']),
}
# 5. salto più grande del VIX tra due sedute (commento di fetch_vix.js: ×2,16 il 05/02/2018)
ratios = [(vix[vd[i]] / vix[vd[i - 1]], vd[i]) for i in range(1, len(vd))]
up = max(ratios); dn = min(ratios)
out['salto_su_max'] = {'x': round(up[0], 3), 'data': up[1]}
out['salto_giu_max'] = {'x': round(dn[0], 3), 'data': dn[1]}
(pathlib.Path(__file__).with_name('ricalcolo2.json')).write_text(json.dumps(out, indent=1, ensure_ascii=False))
print(json.dumps(out, indent=1, ensure_ascii=False))
