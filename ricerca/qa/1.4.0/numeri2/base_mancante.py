"""Quante sedute «3 mesi in $» sarebbe «—» perché manca il cambio 63 sedute prima (festa negli Stati Uniti: la Fed non pubblica),
con il cambio del giorno presente. Ricalcolo con lib2 (nessun modulo dell'app). Uso: python3 -I base_mancante.py <sito>"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib2
lib2.init(sys.argv[1]); M = lib2.model()
for k in ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI']:
    X = M['ix'][k]; d, c = X['dates'], X['close']; f = M['fx'][k]; fm = dict(zip(f['dates'], f['val']))
    u = [c[i] / fm[x] if c[i] is not None and x in fm else None for i, x in enumerate(d)]
    tot = miss = 0; ex = []
    for t in range(len(d)):
        if d[t] < '2023-11-01' or u[t] is None: continue
        tot += 1
        if u[t - 63] is None: miss += 1; ex.append(f'{d[t]} (base {d[t-63]})')
    print(f'{k}: {miss} sedute su {tot} dal 01/11/2023 con «3 mesi in $» = «—» pur con il cambio di oggi; es. {ex[:4]}')
