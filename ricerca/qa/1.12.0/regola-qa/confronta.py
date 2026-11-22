#!/usr/bin/env python3
"""Confronto taglio per taglio tra ricalcolo.py (py.json) e timeline() dell'app (app.json), più i controlli 2.
Uso: python3 -I confronta.py py.json app.json [data/ath_history.json]  -> stampa i risultati, esce con 1 se c'è almeno una differenza."""
import json, sys, datetime as dt

# chiusure dell'S&P 500 (stessa decodifica di ricalcolo.py) per controllare che un calo «in corso» non sia recuperato
H = json.load(open(sys.argv[3] if len(sys.argv) > 3 else 'data/ath_history.json'))['series']['SPX']
d = dt.date.fromisoformat(H['d0']); DATES = [d.isoformat()]
for ch in H['gaps']:
    d += dt.timedelta(days=int(ch, 36)); DATES.append(d.isoformat())
acc = 0; CLOSE = []
for v in H['cd']:
    acc += v; CLOSE.append(acc / H.get('ps', 100))
IDX = {x: i for i, x in enumerate(DATES)}

py = json.load(open(sys.argv[1])); app = json.load(open(sys.argv[2]))
diff = 0; chk = 0; miss = []
for c in sorted(py):
    P, A = py[c], app.get(c)
    if A is None:
        A = {'asOf': None, 'done': [], 'open': [], 'order': []}
    same = P['asOf'] == A['asOf'] or (not P['done'] and not P['open'])
    same = same and P['done'] == A['done'] and P['open'] == A['open']
    # ordine: conclusi prima, poi in corso
    same = same and A['order'] == [False] * len(A['done']) + [True] * len(A['open'])
    if not same:
        diff += 1
        print(f"DIFF {c}: py conclusi {P['done']} in corso {P['open']} | app conclusi {A['done']} in corso {A['open']} (asOf {A['asOf']})")
    # controlli 2 sull'uscita dell'app
    peaks = [d for d, _ in A['done']] + [d for d, _ in A['open']]
    if len(peaks) != len(set(peaks)):
        chk += 1; print(f"DOPPIO {c}: {peaks}")
    k = sum(1 for x in DATES if x <= c)
    for d, _ in A['open']:
        i = IDX[d]
        if any(CLOSE[t] > CLOSE[i] for t in range(i + 1, k)):
            chk += 1; print(f"RECUPERATO IN CORSO {c}: {d}")
    for d, _ in A['done']:
        i = IDX[d]
        if not any(CLOSE[t] > CLOSE[i] for t in range(i + 1, k)):
            chk += 1; print(f"CONCLUSO NON RECUPERATO {c}: {d}")
    opens = [x for x, _ in A['open']]
    for d, dd, is52 in P['unrecovered15']:
        if d in opens:
            continue
        # un record più basso dentro un calo in corso già mostrato (con massimo precedente e più alto) è coperto,
        # a meno che sia un massimo di 52 settimane: allora è un massimo di ciclo e deve avere il suo riquadro
        if not is52 and any(o < d for o in opens):
            continue
        miss.append((c, d, round(dd, 1), is52))
        if not is52:
            break  # i record successivi stanno dentro lo stesso calo: basta il primo (il più alto)
by = {}
for c, d, dd, is52 in miss:
    by.setdefault((d, is52), []).append(c)
for (d, is52), cs in sorted(by.items()):
    if is52: chk += 1
    print(f"{'MANCA' if is52 else 'NON MOSTRATO (non e un massimo di 52 settimane)'} (record mai superato con calo >= 15%): massimo {d} (massimo di 52 settimane: {is52}) in {len(cs)} tagli, da {cs[0]} a {cs[-1]}")
print(f"tagli {len(py)}, differenze {diff}, problemi dei controlli 2 {chk}")
sys.exit(1 if diff or chk else 0)
