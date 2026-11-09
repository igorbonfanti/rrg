# Distanza tra i colori delle crisi (CIEDE2000), normale e con daltonismo simulato (Machado 2009, gravità 1).
# Uso: python3 ricerca/qa/1.6.1/grafici/colori.py   (legge le tavolozze da css/style.css e i gruppi da atteso.json)
import re, json, math, os, itertools
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, '../../../..'))
css = open(os.path.join(ROOT, 'css/style.css')).read()
dark = dict(re.findall(r'--g(\d+): (#[0-9a-f]{6})', re.search(r':root \{ --g0.*?\}', css).group(0)))
light = dict(re.findall(r'--g(\d+): (#[0-9a-f]{6})', re.search(r':root\[data-theme="light"\] \{ --g0.*?\}', css).group(0)))
bg = {'scuro': (0, 0, 0), 'chiaro': (255, 255, 255)}
def lin(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def gam(c): c = min(1, max(0, c)); return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def h2r(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
M = {'deuter': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
     'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
     'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]}
def sim(rgb, m):
    l = [lin(x) for x in rgb]; o = [sum(m[i][j] * l[j] for j in range(3)) for i in range(3)]; return tuple(gam(x) * 255 for x in o)
def lab(rgb):
    r, g, b = [lin(x) for x in rgb]
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047; Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))
def de2000(a, b):
    L1, a1, b1 = a; L2, a2, b2 = b
    C1 = math.hypot(a1, b1); C2 = math.hypot(a2, b2); Cm = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
    a1p, a2p = a1 * (1 + G), a2 * (1 + G); C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360; h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dL = L2 - L1; dC = C2p - C1p
    dh = 0 if C1p * C2p == 0 else (h2p - h1p if abs(h2p - h1p) <= 180 else h2p - h1p - 360 if h2p > h1p else h2p - h1p + 360)
    dH = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dh / 2))
    Lm = (L1 + L2) / 2; Cmp = (C1p + C2p) / 2
    hm = h1p + h2p if C1p * C2p == 0 else ((h1p + h2p) / 2 if abs(h1p - h2p) <= 180 else (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2)
    T = 1 - 0.17 * math.cos(math.radians(hm - 30)) + 0.24 * math.cos(math.radians(2 * hm)) + 0.32 * math.cos(math.radians(3 * hm + 6)) - 0.20 * math.cos(math.radians(4 * hm - 63))
    Sl = 1 + 0.015 * (Lm - 50) ** 2 / math.sqrt(20 + (Lm - 50) ** 2); Sc = 1 + 0.045 * Cmp; Sh = 1 + 0.015 * Cmp * T
    Rt = -2 * math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * math.sin(math.radians(60 * math.exp(-((hm - 275) / 25) ** 2)))
    return math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))
def contrast(c, b):
    L = lambda x: 0.2126 * lin(x[0]) + 0.7152 * lin(x[1]) + 0.0722 * lin(x[2]); a, z = L(c) + 0.05, L(b) + 0.05; return max(a, z) / min(a, z)
W = json.load(open(os.path.join(D, 'atteso.json')))
groups = [g for g in W['SPX']['groups'] if g['npts'] > 0]
for name, pal in (('scuro', dark), ('chiaro', light)):
    print(f'\n=== tema {name}: contrasto col fondo (WCAG) e coppie più vicine (ΔE2000; <10 difficile da distinguere in punti piccoli, <5 quasi uguali)')
    for g in groups: print(f"  g{g['c']:<2} {pal[str(g['c'])]} contrasto {contrast(h2r(pal[str(g['c'])]), bg[name]):4.1f}  {g['label']} ({g['npts']} punti)")
    for mode in (None, 'deuter', 'protan', 'tritan'):
        cols = {g['c']: h2r(pal[str(g['c'])]) for g in groups}
        if mode: cols = {k: sim(v, M[mode]) for k, v in cols.items()}
        L = {k: lab(v) for k, v in cols.items()}
        pairs = sorted(((de2000(L[a['c']], L[b['c']]), a, b) for a, b in itertools.combinations(groups, 2)), key=lambda x: x[0])
        lab_ = mode or 'visione normale'
        print(f'  [{lab_}] coppie con ΔE<10: {sum(1 for p in pairs if p[0] < 10)}; le 8 più vicine:')
        for d, a, b in pairs[:8]: print(f"     {d:5.1f}  {a['label']} ({a['npts']}) ~ {b['label']} ({b['npts']})")
