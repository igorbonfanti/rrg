# C4 (parte 2). Controllo indipendente degli alert di data/alerts.json: XLU zona blu il 25/09/2026 e trigger il 12/10/2026.
# Breadth di Utilities ricalcolata giorno per giorno dai prezzi Yahoo dei 31 membri (cache di c2_breadth.py), drawdown e
# percentile di XLU dai prezzi Yahoo dal 2004 (cache di c3_dd.py); regole del README (livello blu 5%, zona blu con 2
# chiusure ≤ livello e drawdown oltre il 70° percentile; trigger con breadth ≥ max(livello + max(5 punti, 2 titoli),
# minimo + 2 titoli) e almeno una conferma; fallito se il prezzo chiude sotto il minimo della zona blu meno l'escursione
# media di 20 sedute entro 20 sedute dal trigger).
# uso: python3 -I c4_alerts.py   (dopo c2_breadth.py e c3_dd.py)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series

L = 5
mem = [m['s'] for m in load('sp500_members.json')['members'] if m['sector'] == 'XLU']
PX = {s: series(s, '2y') for s in mem}
x = series('XLU', 'p2004'); XD = x['dates']; XA = x['adj']
D = [d for d in XD if '2026-07-01' <= d <= '2026-10-19']


def breadth(d, w):
    a = n = 0
    for s in mem:
        p = PX[s]
        if d not in p['dates']:
            continue
        i = p['dates'].index(d); c = p['close']; n += 1
        a += i >= w - 1 and c[i] > sum(c[i - w + 1:i + 1]) / w
    return 100 * a / n, n


dd = []
for i, v in enumerate(XA):
    dd.append((v / max(XA[max(0, i - 251):i + 1]) - 1) * 100)


def pct(i):
    prev = dd[:i]
    return 100 * sum(1 for v in prev if v > dd[i] + 1e-12) / len(prev)


rows = {}
for d in D:
    i = XD.index(d)
    b200, n = breadth(d, 200); b20, _ = breadth(d, 20); b50, _ = breadth(d, 50)
    rows[d] = dict(b200=b200, b20=b20, b50=b50, n=n, close=XA[i], dd=dd[i], dp=pct(i))
print('XLU, ricalcolo indipendente: data | % sopra 200 | % sopra 20 | % sopra 50 | n | chiusura rett. | drawdown | percentile')
for d in D:
    if d >= '2026-09-17':
        r = rows[d]
        print(f"  {d} {r['b200']:5.1f} {r['b20']:5.1f} {r['b50']:5.1f} {r['n']:3} {r['close']:8.3f} {r['dd']:7.2f} {r['dp']:5.1f}")
# zona blu: prima seduta con 2 chiusure di fila ≤ L e percentile ≥ 70 (dopo l'ultima uscita, macchina armata)
below, setup = 0, None
for d in D:
    r = rows[d]; below = below + 1 if r['b200'] <= L else 0
    if setup is None and below >= 2 and r['dp'] >= 70 and d >= '2026-09-01':
        setup = d
print('\nZona blu (ricalcolo):', setup, '| registro: 2026-09-25')
# trigger
k0 = D.index(setup); bmin = min(rows[d]['b200'] for d in D[k0:k0 + 1]); pmin = rows[setup]['close']; trig = None
stock = 100 / 31; h = max(5, 2 * stock)
for d in D[k0:]:
    r = rows[d]
    bmin = min(bmin, r['b200']); pmin = min(pmin, r['close'])
    j = D.index(d)
    thr = max(L + h, bmin + 2 * stock)
    thrust20 = r['b20'] >= 70 and min(rows[x]['b20'] for x in D[max(0, j - 14):j + 1]) <= 15
    ci = XD.index(d); m20 = sum(XA[ci - 19:ci + 1]) / 20; m20p = sum(XA[ci - 24:ci - 4]) / 20
    ma = XA[ci] > m20 and m20 > m20p
    if d > setup and r['b200'] >= thr and (thrust20 or ma or r['b200'] >= 40):
        trig = (d, round(r['b200'], 1), round(thr, 2), 'thrust20' if thrust20 else '', 'ma' if ma else '')
        break
print('Trigger (ricalcolo):', trig, '| registro: 2026-10-12 «breadth risale a 16,1% · spinta di breadth a 20 giorni»')
# fallito? prezzo sotto pmin − escursione media entro 20 sedute dal trigger
t0 = D.index(trig[0])
for d in D[t0 + 1:]:
    ci = XD.index(d)
    ar = sum(abs(XA[k] - XA[k - 1]) for k in range(ci - 19, ci + 1)) / 20
    if XA[ci] < pmin - ar:
        print('  segnale fallito il', d); break
else:
    print(f'  nessun segnale fallito fino al {D[-1]} (minimo della zona blu {pmin:.3f}, ultima chiusura {XA[XD.index(D[-1])]:.3f})')
print(f"Testi del registro: breadth al 25/09 {rows['2026-09-25']['b200']:.1f}% · drawdown {rows['2026-09-25']['dd']:.1f}% ({rows['2026-09-25']['dp']:.1f}° percentile)")
