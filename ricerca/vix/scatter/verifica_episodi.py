# Ricalcolo indipendente (senza js/vix.js) degli episodi della vista VIX: per le soglie 20, 25, 30, 40 e 50, primo giorno
# con il VIX sopra la soglia dopo 63 sedute sotto, VIX quel giorno, VIX massimo dell'episodio e ultimo giorno sopra.
# VIX: FRED VIXCLS (cache di ricerca/vix/struttura/dati/cache/ o scaricato), solo nelle sedute dell'S&P 500 elencate in
# un file di testo (una data per riga). Confronta con un JSON degli episodi dell'app ({soglia: [[data, vix, max, fine]]}).
# Uso: python3 -I ricerca/vix/scatter/verifica_episodi.py <sedute.txt> <episodi_app.json> [VIXCLS.csv]
import csv, json, sys
ses = [l.strip() for l in open(sys.argv[1]) if l.strip()]
app = json.load(open(sys.argv[2]))
src = sys.argv[3] if len(sys.argv) > 3 else 'ricerca/vix/struttura/dati/cache/fred_VIXCLS.csv'
fred = {}
for r in list(csv.reader(open(src)))[1:]:
    try: fred[r[0]] = float(r[1])
    except ValueError: pass
vals = [(d, fred[d]) for d in ses if d in fred]
tot = 0
for X in sorted(app, key=int):
    x = int(X); eps = [j for j in range(63, len(vals)) if vals[j][1] >= x and all(v < x for _, v in vals[j - 63:j])]
    rows = []
    for k, j in enumerate(eps):
        stop = eps[k + 1] if k + 1 < len(eps) else len(vals)
        seg = [(d, v) for d, v in vals[j:stop] if v >= x]
        rows.append([vals[j][0], vals[j][1], max(v for _, v in seg), seg[-1][0]])
    a = app[X]
    diff = [(r, b) for r, b in zip(rows, a) if r[0] != b[0] or abs(r[1] - b[1]) > 0.005 or abs(r[2] - b[2]) > 0.005 or r[3] != b[3]]
    diff += [('mancante', r) for r in rows[len(a):]] + [('in più', b) for b in a[len(rows):]]
    tot += len(diff)
    print(f'soglia {X}: episodi ricalcolati {len(rows)}, app {len(a)}, diversi {len(diff)}', diff[:3])
print('TOTALE DIFFERENZE', tot)
