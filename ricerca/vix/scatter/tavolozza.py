# Sceglie i 16 colori delle crisi dello scatter (vista VIX, 1.6.1): per ogni tema, tra molti candidati con contrasto almeno
# 3:1 sullo sfondo, scelta golosa «max-min» della distanza CIEDE2000, contando anche la visione con deuteranopia e
# protanopia simulate (Machado 2009). Funzioni di colore da ricerca/qa/1.6.1/grafici/colori.py.
# Uso: python3 ricerca/vix/scatter/tavolozza.py  → stampa le due tavolozze e la distanza minima
import os, colorsys, itertools
D = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(D, '../../qa/1.6.1/grafici/colori.py')).read()
lines = src.split('\n'); i0 = next(i for i, l in enumerate(lines) if l.startswith('def lin')); i1 = next(i for i, l in enumerate(lines) if l.startswith('W = json'))
ns = {}; exec('import math\n' + '\n'.join(lines[i0:i1]), ns)
lab, de, sim, M, h2r, contrast = ns['lab'], ns['de2000'], ns['sim'], ns['M'], ns['h2r'], ns['contrast']
def cands(bg):
    out = []
    for h in range(0, 360, 6):
        for l in (0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78):
            for s in (0.55, 0.75, 0.95):
                r, g, b = colorsys.hls_to_rgb(h / 360, l, s); rgb = (r * 255, g * 255, b * 255)
                if contrast(rgb, bg) >= 3: out.append(rgb)
    return out
def dist(a, b):
    v = [de(lab(a), lab(b))] + [1.3 * de(lab(sim(a, M[k])), lab(sim(b, M[k]))) for k in ('deuter', 'protan')]
    return min(v)
for name, bg, seed in (('scuro', (0, 0, 0), '#e69f00'), ('chiaro', (255, 255, 255), '#a86f00')):
    C = cands(bg); pick = [h2r(seed)]
    while len(pick) < 16:
        best = max(C, key=lambda c: min(dist(c, p) for p in pick)); pick.append(best)
    # ordine: colori consecutivi (crisi vicine nel tempo) il più lontani possibile, scelta golosa
    order = [pick[0]]; rest = pick[1:]
    while rest: n = max(rest, key=lambda c: min(dist(c, o) for o in order[-3:])); order.append(n); rest.remove(n)
    hx = ['#%02x%02x%02x' % tuple(round(x) for x in c) for c in order]
    m = min(dist(a, b) for a, b in itertools.combinations(order, 2))
    print(name, 'distanza minima', round(m, 1)); print(' '.join(f'--g{i}: {h};' for i, h in enumerate(hx)))
