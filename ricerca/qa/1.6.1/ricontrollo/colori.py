# Ricontrollo 1.6.1: tavolozza delle crisi dello scatter (vista VIX), nuova (571a400) contro vecchia (4d75669).
# Distanze CIEDE2000 tra i colori dei gruppi con punti (visione normale, deuteranopia, protanopia, tritanopia simulate,
# Machado 2009 gravità 1) e contrasto WCAG sul fondo del pannello (#000 scuro, #fff chiaro), anche con l'opacità .75
# dei punti piccoli. Le funzioni di colore sono riscritte qui (non importate dagli script che hanno scelto la tavolozza)
# e provate sui valori di riferimento di Sharma (2005) per CIEDE2000.
# Uso: python3 ricerca/qa/1.6.1/ricontrollo/colori.py   (dopo gruppi.mjs; legge atteso.json e css/style.css; la vecchia
#      tavolozza con git show 4d75669:css/style.css)
import re, json, math, os, itertools, subprocess
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(D, '../../../..'))
def pal_of(css):
    dk = dict(re.findall(r'--g(\d+): (#[0-9a-f]{6})', re.search(r':root \{ --g0.*?\}', css).group(0)))
    lt = dict(re.findall(r'--g(\d+): (#[0-9a-f]{6})', re.search(r':root\[data-theme="light"\] \{ --g0.*?\}', css).group(0)))
    return {'scuro': dk, 'chiaro': lt}
NEW = pal_of(open(os.path.join(ROOT, 'css/style.css')).read())
OLD = pal_of(subprocess.run(['git', '-C', ROOT, 'show', '4d75669:css/style.css'], capture_output=True, text=True).stdout)
BG = {'scuro': (0, 0, 0), 'chiaro': (255, 255, 255)}
def s2l(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def l2s(c): c = min(1, max(0, c)); return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
MAC = {'deuteranopia': ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
       'protanopia': ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
       'tritanopia': ((1.255528, -0.076749, -0.178779), (-0.078411, 0.930809, 0.147602), (0.004733, 0.691367, 0.303900))}
def simulate(rgb, m):
    l = [s2l(x) for x in rgb]; return tuple(255 * l2s(sum(m[i][j] * l[j] for j in range(3))) for i in range(3))
def to_lab(rgb):
    r, g, b = (s2l(x) for x in rgb)
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > (6 / 29) ** 3 else t / (3 * (6 / 29) ** 2) + 4 / 29
    return (116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z)))
def ciede2000(c1, c2):
    L1, a1, b1 = c1; L2, a2, b2 = c2
    Cb = (math.hypot(a1, b1) + math.hypot(a2, b2)) / 2
    G = 0.5 * (1 - math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
    ap1, ap2 = (1 + G) * a1, (1 + G) * a2
    Cp1, Cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)
    hp1 = math.degrees(math.atan2(b1, ap1)) % 360 if Cp1 else 0
    hp2 = math.degrees(math.atan2(b2, ap2)) % 360 if Cp2 else 0
    dLp, dCp = L2 - L1, Cp2 - Cp1
    if Cp1 * Cp2 == 0: dhp = 0
    elif abs(hp2 - hp1) <= 180: dhp = hp2 - hp1
    elif hp2 - hp1 > 180: dhp = hp2 - hp1 - 360
    else: dhp = hp2 - hp1 + 360
    dHp = 2 * math.sqrt(Cp1 * Cp2) * math.sin(math.radians(dhp) / 2)
    Lbp, Cbp = (L1 + L2) / 2, (Cp1 + Cp2) / 2
    if Cp1 * Cp2 == 0: hbp = hp1 + hp2
    elif abs(hp1 - hp2) <= 180: hbp = (hp1 + hp2) / 2
    elif hp1 + hp2 < 360: hbp = (hp1 + hp2 + 360) / 2
    else: hbp = (hp1 + hp2 - 360) / 2
    T = 1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp)) + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63))
    dth = 30 * math.exp(-(((hbp - 275) / 25) ** 2)); Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    SL = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2); SC = 1 + 0.045 * Cbp; SH = 1 + 0.015 * Cbp * T
    RT = -math.sin(math.radians(2 * dth)) * Rc
    return math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH))
# prova sui valori di Sharma, Wu, Dalal (2005)
for a, b, want in (((50, 2.6772, -79.7751), (50, 0, -82.7485), 2.0425), ((50, -1.3802, -84.2814), (50, 0, -82.7485), 1.0000),
                   ((50, 2.5, 0), (73, 25, -18), 27.1492), ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
                   ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630)):
    assert abs(ciede2000(a, b) - want) < 1e-4, (a, b, ciede2000(a, b))
def lum(c): r, g, b = (s2l(x) for x in c); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contrast(c, bg): a, z = lum(c) + 0.05, lum(bg) + 0.05; return max(a, z) / min(a, z)
def over(c, bg, a): return tuple(a * x + (1 - a) * y for x, y in zip(c, bg))
W = json.load(open(os.path.join(D, 'atteso.json')))
groups = W['SPX']['groups']
assert [g['c'] for g in groups] == list(range(len(groups)))
print('gruppi con punti:', len(groups), '·', ', '.join(g['label'] for g in groups))
for theme in ('scuro', 'chiaro'):
    for tag, P in (('NUOVA', NEW), ('vecchia', OLD)):
        pal = {g['c']: hx(P[theme][str(g['c'])]) for g in groups}
        print(f'\n=== {theme} · tavolozza {tag}')
        if tag == 'NUOVA':
            for g in groups:
                c = pal[g['c']]; print(f"  g{g['c']:<2} {P[theme][str(g['c'])]}  contrasto {contrast(c, BG[theme]):5.2f}  punto piccolo (opacità .75) {contrast(over(c, BG[theme], .75), BG[theme]):5.2f}  {g['label']} ({g['npts']})")
        for mode in (None, 'deuteranopia', 'protanopia', 'tritanopia'):
            cols = {k: (simulate(v, MAC[mode]) if mode else v) for k, v in pal.items()}; L = {k: to_lab(v) for k, v in cols.items()}
            pairs = sorted((ciede2000(L[a['c']], L[b['c']]), a['label'], b['label']) for a, b in itertools.combinations(groups, 2))
            print(f"  [{mode or 'normale':12}] minimo {pairs[0][0]:5.1f}; coppie <10: {sum(p[0] < 10 for p in pairs):2}; <5: {sum(p[0] < 5 for p in pairs):2}; le 3 più vicine: " + '; '.join(f'{d:.1f} {x} ~ {y}' for d, x, y in pairs[:3]))
        L = {g['c']: to_lab(pal[g['c']]) for g in groups}
        near = sorted((ciede2000(L[a['c']], L[b['c']]), a['label'], b['label']) for i, a in enumerate(groups) for b in groups[i + 1:i + 3])
        print('  crisi vicine nel tempo (1-2 posti), le 3 più simili: ' + '; '.join(f'{d:.1f} {x} ~ {y}' for d, x, y in near[:3]))
