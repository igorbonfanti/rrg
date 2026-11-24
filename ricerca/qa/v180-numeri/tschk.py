import json, sys, math
sys.path.insert(0, '.')
import ref
from common import *
D = ref.J('sectors.json')['dates']
L0, PW0 = 8, None
def panes_ts(): 
    y = 20; out = []
    for h in (220, 100, 150): out.append((y, y + h, h)); y += h + 26
    return out
P = panes_ts()
def frames(dump): return [r for r in dump['rects'] if r['cls'] == 'frame']
def path(dump, cls): 
    ps = [x for x in dump['paths'] if x['cls'] == cls]
    return ps[0]['pts'] if ps else []
def sess_of_x(x, L, PW, n): return (x - L) / PW * (n - 1)

def check_ts(scen, sym, win, dump, tips, d1chk=True, label='', S=None):
    S = S or ref.sector(sym); pos = {d: i for i, d in enumerate(S['dates'])}
    n = len(win); fr = frames(dump); L, PW = fr[0]['x'], fr[0]['w']
    idx = [pos[d] for d in win]
    c = [S['close'][i] for i in idx]; m = [S['ma'][i] for i in idx]; dd = [S['dd'][i] for i in idx]; b = [S['p200'][i] for i in idx]
    tag = label
    # 1. punti del prezzo: uno per seduta con chiusura, x = L + i/(n-1)·PW
    px = path(dump, 'px'); want = [i for i in range(n) if c[i] is not None]
    xs_ok = len(px) == len(want) and all(abs(p[1] - (L + i / (n - 1) * PW)) < 0.06 for p, i in zip(px, want))
    rec(scen, f'{tag}sedute disegnate (prezzo)', xs_ok, f'{len(px)} punti, attese {len(want)}; prima {win[0]} ultima {win[-1]}')
    # 2. scala del prezzo sui valori visibili (lineare sotto i 4 anni)
    pv = [v for v in c + m if v is not None]; lo, hi = min(pv), max(pv)
    log = n / 252 > 4
    if log:
        lo, hi = lo * 0.94, hi * 1.06; sy = lambda v: P[0][1] - (math.log(v) - math.log(lo)) / (math.log(hi) - math.log(lo)) * 220
    else:
        pad = (hi - lo) * 0.06; lo -= pad; hi += pad; sy = lambda v: P[0][1] - (v - lo) / (hi - lo) * 220
    err = max([abs(p[2] - sy(c[i])) for p, i in zip(px, want)] or [0])
    mpts = path(dump, 'ma'); mw = [i for i in range(n) if m[i] is not None]
    errm = max([abs(p[2] - sy(m[i])) for p, i in zip(mpts, mw)] or [0])
    rec(scen, f'{tag}scala del prezzo sui valori visibili ({"log" if log else "lineare"})', err < 0.06 and errm < 0.06 and len(mpts) == len(mw), f'scarto max prezzo {err:.3f}, media 200 {errm:.3f} (punti media {len(mpts)}/{len(mw)})')
    title = [t['t'] for t in dump['texts'] if t['cls'] == 'pane-t'][0]
    rec(scen, f'{tag}titolo del prezzo coerente con la scala', ('LOG' in title) == log, title)
    # 3. drawdown e breadth
    dv = [v for v in dd if v is not None]; lo1 = min(-5, math.floor(min(dv) / 5) * 5)
    sy1 = lambda v: P[1][1] - (v - lo1) / (0 - lo1) * 100
    ddp = path(dump, 'ddl'); dw = [i for i in range(n) if dd[i] is not None]
    errd = max(abs(p[2] - sy1(dd[i])) for p, i in zip(ddp[:len(dw)], dw))
    rec(scen, f'{tag}drawdown: punti e scala', errd < 0.06, f'scarto max {errd:.3f}, minimo {min(dv):.2f} → fondo scala {lo1}')
    brp = path(dump, 'br'); bw = [i for i in range(n) if b[i] is not None]
    errb = max([abs(p[2] - (P[2][1] - b[i] / 100 * 150)) for p, i in zip(brp, bw)] or [0])
    rec(scen, f'{tag}breadth: punti', len(brp) == len(bw) and errb < 0.06, f'{len(brp)}/{len(bw)} punti, scarto {errb:.3f}')
    # 4. nessun punto fuori dal suo pannello
    out = []
    for pth in dump['paths']:
        k = {'px': 0, 'ma': 0, 'ddl': 1, 'br': 2, 'br50': 2, 'brfill': 2, 'brappr': 2}.get(pth['cls'])
        if k is None: continue
        for p in pth['pts']:
            if not (L - 0.1 <= p[1] <= L + PW + 0.1 and P[k][0] - 0.1 <= p[2] <= P[k][1] + 0.1): out.append((pth['cls'], p))
    for pth in dump['paths']:
        if pth['cls'] == 'trigmark':
            for p in pth['pts']:
                if not (L - 5.1 <= p[1] <= L + PW + 5.1 and P[0][0] <= p[2] <= P[0][1] + 0.1): out.append(('trigmark', p))
    rec(scen, f'{tag}nessun punto fuori dal pannello', not out, str(out[:4]))
    # 5. riquadri: valori di ogni seduta contro il calcolo dal file
    bad = []
    for d, rows in tips:
        if rows is None: bad.append((d, 'riquadro chiuso')); continue
        i = pos[d]; t = tipmap(rows)
        if iso(rows[0][0]) != d: bad.append((d, 'data ' + rows[0][0])); continue
        chk = [('Prezzo', S['close'][i], pxdec(S['close'][i])), ('Media 200', S['ma'][i], pxdec(S['ma'][i])), ('Drawdown 52s', S['dd'][i], 1), ('Sopra media 200', S['p200'][i], 1), ('Sopra media 50', S['p50'][i], 1)]
        for k, v, dec in chk:
            if not close_enough(num(t.get(k)), v, dec): bad.append((d, k, t.get(k), v))
    rec(scen, f'{tag}riquadro = calcolo dal file in ogni seduta ({len(tips)})', not bad, str(bad[:4]))
    return dict(c=c, dd=dd, b=b, n=n, L=L, PW=PW)

def bands_dates(dump, cls, win, L, PW):
    n = len(win); out = set()
    for r in dump['rects']:
        if r['cls'] != cls or abs(r['y'] - 20) > 0.01: continue
        a = round((r['x'] + 1 - L) / PW * (n - 1)); e = round((r['x'] + r['w'] - 1 - L) / PW * (n - 1))
        if r['w'] <= 2.0001: e = a
        out.update(win[max(0, a):e + 1])
    return out
def marks(dump, win, L, PW):
    n = len(win); s = set()
    for pth in dump['paths']:
        if pth['cls'] == 'trigmark': s.add(win[round((pth['pts'][0][1] - L) / PW * (n - 1))])
    return s
def circles(dump, win, L, PW):
    n = len(win); return sorted(win[round((c['x'] - L) / PW * (n - 1))] for c in dump['circles'] if c['cls'] == 'apprin')

