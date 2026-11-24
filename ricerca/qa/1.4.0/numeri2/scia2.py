"""Scia della forza relativa (10 settimane) dal DOM contro il ricalcolo lib2. Uso: python3 -I scia2.py <sito> <dom2.json>"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib2
lib2.init(sys.argv[1]); M = lib2.model(); D = json.load(open(sys.argv[2])); W = D['rsW']
cl = lambda v: max(96, min(104, v)); n = bad = 0
for k, det in D['detail'].items():
    pts = [tuple(map(float, p)) for p in re.findall(r'[ML]([-\d.]+) ([-\d.]+)', det['trail'] or '')]
    tr = M['rs'][k]['trail']
    exp = [(round((cl(x) - 96) / 8 * W, 1), round(W - (cl(y) - 96) / 8 * W, 1)) for x, y, _ in tr]
    for a, b in zip(pts, exp):
        n += 1
        if abs(a[0] - b[0]) > 0.051 or abs(a[1] - b[1]) > 0.051: bad += 1; print('DIVERSO', k, a, b)
    if len(pts) != len(exp): bad += 1; print('LUNGHEZZA', k, len(pts), len(exp))
    print(k, 'settimane', [d for _, _, d in tr][0], '…', tr[-1][2], 'meta', det['rsMeta'])
print(f'punti della scia controllati {n}, diversi {bad}')
