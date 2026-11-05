#!/usr/bin/env python3
"""Controllo numeri 1.4.0 · seconda fonte per i cambi: FRED H.10 (DEX*) contro Yahoo in data/emerging.json.

- livelli: scarto Yahoo/FRED nelle date comuni;
- errori tolti da cleanFx: FRED conferma che erano errori? (FRED vicino ai giorni accanto e lontano dal valore tolto);
- errori non tolti: punti di Yahoo fuori dall'intervallo FRED dei giorni t-1, t, t+1 di oltre una tolleranza;
- effetto sugli stati: stati della valuta con Yahoo (come l'app), con Yahoo senza i punti sospetti, con FRED;
- DTWEXEMEGS del file contro FRED.
Uso: python3 -I ricerca/qa/1.4.0/numeri/fred_confronto.py <cartella del sito>
"""
import json, os, sys, csv, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rc', os.path.join(HERE, 'ricalcolo_lib.py'))
rc = importlib.util.module_from_spec(spec); spec.loader.exec_module(rc)
SITE = sys.argv[1]
rc.init(SITE)
FREDMAP = {'CNY=X': 'DEXCHUS', 'INR=X': 'DEXINUS', 'BRL=X': 'DEXBZUS', 'KRW=X': 'DEXKOUS', 'TWD=X': 'DEXTAUS', 'HKD=X': 'DEXHKUS'}

def fred(s):
    rows = list(csv.reader(open(os.path.join(HERE, 'fred', s + '.csv'))))[1:]
    return [(r[0], float(r[1])) for r in rows if r[1] not in ('', '.')]

rep = {}
for sym, fs in FREDMAP.items():
    d, v = rc.series(sym)
    F = fred(fs); fm = dict(F); fd = [x[0] for x in F]
    pos = {x: i for i, x in enumerate(fd)}
    tight = sym in ('CNY=X', 'HKD=X')
    tol = 0.005 if tight else 0.015
    common = [(x, y, fm[x]) for x, y in zip(d, v) if x in fm]
    diffs = sorted(abs(y / f - 1) for _, y, f in common)
    med = diffs[len(diffs) // 2]; p99 = diffs[int(len(diffs) * 0.99)]
    cd, cv, removed = rc.clean(sym, d, v)
    rem = []
    for (rd, rv, prev, nxt) in removed:
        f0 = fm.get(rd)
        verdict = 'FRED manca'
        if f0 is not None:
            # errore confermato se FRED quel giorno è più vicino ai giorni accanto di Yahoo che al valore tolto
            e_spike, e_nb = abs(rv / f0 - 1), min(abs(prev / f0 - 1), abs(nxt / f0 - 1))
            verdict = 'errore confermato' if e_spike > 2 * e_nb + 0.002 else 'NON confermato'
        rem.append({'date': rd, 'yahoo': rv, 'prev': prev, 'next': nxt, 'fred': f0, 'verdict': verdict})
    # sospetti non tolti: Yahoo fuori da [min, max] di FRED a t-1, t, t+1 (date FRED vicine) oltre la tolleranza
    sus = []
    rset = {r[0] for r in removed}
    for x, y in zip(d, v):
        if x in rset or x not in pos: continue
        i = pos[x]; nb = [F[k][1] for k in range(max(0, i - 1), min(len(F), i + 2))]
        lo, hi = min(nb), max(nb)
        if y < lo * (1 - tol) or y > hi * (1 + tol):
            sus.append({'date': x, 'yahoo': y, 'fred': fm[x], 'scarto_%': round((y / fm[x] - 1) * 100, 2)})
    # stati: Yahoo (app), Yahoo senza sospetti, FRED (stesso calcolo, nessuna pulizia)
    z, Fv, sd = rc.fx_signals(cd, cv)
    st_app = {x: rc.state(Fv[i], z[i]) for i, x in enumerate(cd)}
    sset = {s['date'] for s in sus}
    cd2 = [x for x in cd if x not in sset]; cv2 = [y for x, y in zip(cd, cv) if x not in sset]
    z2, F2, _ = rc.fx_signals(cd2, cv2)
    st_fix = {x: rc.state(F2[i], z2[i]) for i, x in enumerate(cd2)}
    zf, Ff, _ = rc.fx_signals(fd, [x[1] for x in F])
    st_fred = {x: rc.state(Ff[i], zf[i]) for i, x in enumerate(fd)}
    recent = [x for x in cd if x >= '2023-11-01']
    diff_fix = [(x, st_app[x], st_fix.get(x)) for x in recent if x in st_fix and st_app[x] != st_fix[x]]
    both = [x for x in recent if x in st_fred and st_app[x] is not None and st_fred[x] is not None]
    agree = sum(st_app[x] == st_fred[x] for x in both)
    lastF = fd[-1]
    rep[sym] = {
        'fred': fs, 'comuni': len(common), 'scarto_mediano_%': round(med * 100, 3), 'scarto_p99_%': round(p99 * 100, 3),
        'tolti': rem, 'tolti_confermati': sum(r['verdict'] == 'errore confermato' for r in rem), 'tolti_non_confermati': [r for r in rem if r['verdict'] == 'NON confermato'],
        'sospetti_non_tolti': sus, 'sospetti_dal_2023_11': [s for s in sus if s['date'] >= '2023-11-01'],
        'stati_cambiati_togliendo_sospetti_dal_2023_11': len(diff_fix), 'esempi_cambiati': diff_fix[:12],
        'accordo_stati_yahoo_fred_dal_2023_11': f'{agree}/{len(both)}',
        'stato_app_oggi': (cd[-1], st_app[cd[-1]]), 'stato_fred_ultimo': (lastF, st_fred[lastF]), 'stato_app_stessa_data_fred': st_app.get(lastF),
        'z_app_oggi': z[-1], 'z_fred_ultimo': zf[-1],
    }
# DTWEXEMEGS
d, v = rc.series('DTWEXEMEGS'); F = dict(fred('DTWEXEMEGS'))
mis = [(x, y, F.get(x)) for x, y in zip(d, v) if F.get(x) is None or abs(y - F[x]) > 0.00006]
extra = [x for x in F if x >= d[0] and x not in set(d)]
rep['DTWEXEMEGS'] = {'righe_file': len(d), 'righe_fred_dal_inizio': len([x for x in F if x >= d[0]]), 'diversi': mis[:20], 'n_diversi': len(mis), 'in_fred_non_nel_file': extra[:20], 'ultimo_file': d[-1], 'ultimo_fred': max(F)}
json.dump(rep, open(os.path.join(HERE, 'fred_confronto.json'), 'w'), indent=1)
for s, r in rep.items():
    if s == 'DTWEXEMEGS': print(s, {k: r[k] for k in r if k != 'diversi'}, r['diversi'][:5]); continue
    print(s, r['fred'], 'comuni', r['comuni'], 'scarto med', r['scarto_mediano_%'], 'p99', r['scarto_p99_%'], '| tolti', len(r['tolti']), 'confermati', r['tolti_confermati'],
          '| non confermati', [(x['date'], x['yahoo'], x['fred']) for x in r['tolti_non_confermati']],
          '| sospetti', len(r['sospetti_non_tolti']), 'dal 2023-11', len(r['sospetti_dal_2023_11']), '| stati cambiati', r['stati_cambiati_togliendo_sospetti_dal_2023_11'],
          '| accordo FRED', r['accordo_stati_yahoo_fred_dal_2023_11'], '| oggi app', r['stato_app_oggi'], 'FRED', r['stato_fred_ultimo'], 'app stessa data', r['stato_app_stessa_data_fred'])
