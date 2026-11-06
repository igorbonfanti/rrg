import sys, json, numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
B = json.load(open('/home/user/rrg/data/breadth.json')); BD = B['dates']; L = len(BD)
def rl(r, n):
    out = [None] * n
    for j, (i0, v) in enumerate(r):
        i1 = r[j + 1][0] if j + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
s = B['series']['XLU']; n = rl(s['n'], L)
y = series('XLU', 'p2004'); yd = dict(zip(y['dates'], y['adj']))
S = json.load(open('/home/user/rrg/data/sectors.json')); SD = S['dates']
v = np.array([yd.get(d, np.nan) for d in SD])
dd = np.array([(v[i] / np.nanmax(v[max(0, i - 251):i + 1]) - 1) * 100 for i in range(len(v))])
for d in ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28', '2026-10-08', '2026-10-09', '2026-10-12']:
    i = BD.index(d); j = SD.index(d)
    prev = dd[:j][~np.isnan(dd[:j])]
    pct = 100 * np.mean(prev > dd[j])
    p20 = [100 * s['a20'][k] / n[k] for k in range(i - 14, i + 1)]
    print(d, f"a200 {s['a200'][i]}/{n[i]} = {100*s['a200'][i]/n[i]:.1f}%  pct20 {100*s['a20'][i]/n[i]:.1f} (min15 {min(p20):.1f})  dd own {dd[j]:.2f} pct own {pct:.1f}")
