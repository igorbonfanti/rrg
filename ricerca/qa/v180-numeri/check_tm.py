import json, sys, math, os, datetime as dt
sys.path.insert(0, '.')
import ref
from common import *
R = json.load(open('out/tm.json'))
DAY = 86400000
def ms(d): return (dt.date.fromisoformat(d) - dt.date(1970, 1, 1)).days * DAY
def msdate(t): return (dt.datetime(1970, 1, 1) + dt.timedelta(milliseconds=t)).date().isoformat()
EMC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../config/emerging.json')))['indices']
def frames(dump): return [r for r in dump['rects'] if r['cls'] == 'frame']
def ticks_check(scen, dump, t0, t1):
    fr = frames(dump)[0]; L, PW = fr['x'], fr['w']
    yb = max(t['y'] for t in dump['texts'] if t['cls'] == 'axt' and t['anchor'] == 'middle')
    tk = sorted([(t['x'], t['t']) for t in dump['texts'] if t['cls'] == 'axt' and t['anchor'] == 'middle' and t['y'] == yb])
    bad = []
    for x, lab in tk:
        t = t0 + (x - L) / PW * (t1 - t0); d = msdate(round(t / DAY) * DAY)
        if re.fullmatch(r'\d\d/\d\d', lab): ok = lab == f'{d[8:10]}/{d[5:7]}'
        elif re.fullmatch(r'\d{4}', lab): ok = d == f'{lab}-01-01'
        else:
            m = re.fullmatch(r'([a-z]{3})(?: (\d\d))?', lab); ok = bool(m) and d[8:10] == '01' and MESI.index(m.group(1)) + 1 == int(d[5:7])
        if not ok: bad.append((lab, d))
    xs = [x for x, _ in tk]
    wk0 = [l for _, l in tk if re.fullmatch(r'\d\d/\d\d', l) and dt.date(int(msdate(t0)[:4]), int(l[3:5]), int(l[:2])).weekday() >= 5]
    wk = wk0
    rec(scen, f'asse del tempo: {len(tk)} etichette, in ordine e alla data giusta', len(tk) >= 2 and not bad and not wk and xs == sorted(xs) and all(L <= x <= L + PW for x in xs), f'{[l for _, l in tk]} sbagliate {bad}' + (f' · giorni di fine settimana: {wk}' if wk else ''))
import re
for scen, r in R.items():
    if not r.get('chip'): rec(scen, 'zoom applicato', False, 'nessuno zoom (tratto sotto i 5 px nel periodo scelto)'); continue
    z0, z1 = r['z']; t0, t1 = ms(z0), ms(z1)
    if scen.startswith('D'):
        k = {'D1': 'NIFTY50', 'D2': 'NIFTY50', 'D3': 'KOSPI200', 'D4': 'EEM'}[scen[:2]]
        S = ref.index(k); D = S['dates']; cfg = EMC[k]
        fxd, fxv = ref.generic('emerging.json', cfg['fx']) if cfg.get('fx') else ([], [])
        fx = dict(zip(fxd, fxv)); dld, dlv = ref.generic('emerging.json', 'DTWEXEMEGS'); dl = dict(zip(dld, dlv))
        inwin = [i for i, d in enumerate(D) if z0 <= d <= z1]; i0 = inwin[0]
        rec(scen, f'{k}: etichetta = sedute dell\'indice', D[inwin[0]] == z0 and D[inwin[-1]] == z1 and r['edgeL'][0][0] == dIT(z0) and r['edgeR'][0][0] == dIT(z1), f"{r['chip']} · bordi {r['edgeL'][0][0]} – {r['edgeR'][0][0]}")
        usdraw = [S['close'][i] / fx[D[i]] if cfg.get('fx') and S['close'][i] is not None and fx.get(D[i]) else None for i in range(len(D))] if cfg.get('fx') else None
        jb = next(i for i in range(i0, len(D)) if S['close'][i] is not None and (usdraw is None or usdraw[i] is not None))
        loc = [S['close'][i] / S['close'][jb] * 100 if i >= i0 and S['close'][i] is not None else None for i in range(len(D))]
        usd = [usdraw[i] / usdraw[jb] * 100 if i >= i0 and usdraw[i] is not None else None for i in range(len(D))] if usdraw else None
        # riquadri
        bad = []
        for d, rows in r['tips'] + r.get('mid', []):
            i = D.index(d); t = tipmap(rows) if rows else {}
            c = S['close'][i]; pd = 0 if c >= 1000 else 3 if c < 10 else 2
            chk = [('Prezzo', c, pd), ('Sopra media 200', S['p200'][i], 1), ('Dollaro vs emergenti', dl.get(d), 2)]
            if usd: chk.append(('In dollari (base 100)', usd[i], 1))
            if cfg.get('fx'): chk.append((f"{cfg['ccy']} per dollaro", fx.get(d), 4 if (fx.get(d) or 99) < 10 else 2))
            for lab, v, dec in chk:
                if not rows or iso(rows[0][0]) != d or not close_enough(num(t.get(lab)), v, dec): bad.append((d, lab, t.get(lab) if rows else None, v))
        rec(scen, f'{k}: riquadro = calcolo dal file (prezzo, breadth, cambio, dollaro, in dollari base 100) in {len(r["tips"])} sedute + {len(r.get("mid", []))} punti a metà tra due sedute (seduta più vicina)', not bad, str(bad[:3]))
        tb = {d: t for d, t in r['tipsBefore']}
        diff = []
        for d, t in r['tips']:
            if d in tb and tb[d] and t:
                a = {x[0]: x[1] for x in tb[d][1:] if len(x) > 1 and 'base 100' not in x[0]}; b = {x[0]: x[1] for x in t[1:] if len(x) > 1 and 'base 100' not in x[0]}
                if a != b or tb[d][0] != t[0]: diff.append((d, tb[d], t))
        rec(scen, f'{k}: riquadro identico con e senza zoom (serie non ribasate, {len(tb)} sedute)', not diff, str(diff[:1]))
        meta = r.get('meta', '')
        rec(scen, f'{k}: nota «base 100 al …»', f'base 100 al {dIT(D[jb])}, ' + ('inizio dello zoom' if jb == i0 else 'primo giorno dello zoom con tutti i dati') in meta, f'«{meta}» (primo giorno del tratto {z0}, base {D[jb]})')
        # scala del prezzo
        fr = frames(r['dump']); P0 = fr[0]; L, PW = P0['x'], P0['w']
        def scale(vals):
            v = [x for x in vals if x is not None]; lo, hi = min(v), max(v); m = (hi - lo) * 0.06 or 1; return lo - m, hi + m
        vis = [loc[i] for i in inwin] + ([usd[i] for i in inwin] if usd else [])
        allv = loc[i0:] + (usd[i0:] if usd else [])
        pts = [x for x in r['dump']['paths'] if x['cls'] == 'emloc'][0]['pts']
        def err(lohi):
            lo, hi = lohi; sy = lambda v: P0['y'] + (hi - v) / (hi - lo) * P0['h']
            w = [i for i in inwin if loc[i] is not None]
            return max(abs(p[2] - sy(loc[i])) for p, i in zip(pts, w))
        e_vis, e_all = err(scale(vis)), err(scale(allv))
        atEnd = z1 == D[-1]
        rec(scen, f'{k}: scala del prezzo base 100 sui valori visibili', e_vis < 0.06, f'scarto con la scala sui visibili {e_vis:.2f} px; con la scala su tutte le sedute dal primo giorno del tratto in poi {e_all:.2f} px; visibili {min(x for x in vis if x is not None):.1f}–{max(x for x in vis if x is not None):.1f}, dopo il tratto fino a {max(x for x in allv if x is not None):.1f}')
        y_in = [p for x in r['dump']['paths'] for p in x['pts'] if x['cls'] in ('emloc', 'emusd', 'br', 'emfx', 'ma', 'emdl')]
        out = [p for p in y_in if not (L - 0.1 <= p[1] <= L + PW + 0.1 and any(f['y'] - 0.1 <= p[2] <= f['y'] + f['h'] + 0.1 for f in fr))]
        rec(scen, f'{k}: nessun punto fuori dai riquadri', not out, str(out[:3]))
        # trigger dentro il tratto = quelli senza zoom
        def trig_dates(dump, a, b):
            f = frames(dump)[0]; return sorted(msdate(round((a + (x['pts'][0][1] - f['x']) / f['w'] * (b - a)) / DAY) * DAY) for x in dump['paths'] if x['cls'] == 'trigmark')
        tz = trig_dates(r['dump'], t0, t1); tbf = [d for d in trig_dates(r['dumpBefore'], r['t0'], r['t1']) if z0 <= d <= z1]
        rec(scen, f'{k}: triangoli dei trigger = quelli senza zoom nel tratto', tz == tbf, f'{tz} / {tbf}')
        ticks_check(scen, r['dump'], t0, t1)
    else:
        VX = ref.J('vix.json')['series']
        sd, sc = ref.generic('vix.json', 'SPX'); vd, vv = ref.generic('vix.json', 'VIX'); vm = dict(zip(vd, vv))
        vix = [vm.get(d) for d in sd]
        rv = [None] * len(sc)
        for t in range(21, len(sc)):
            rs = [math.log(sc[k] / sc[k - 1]) for k in range(t - 20, t + 1)]
            m = sum(rs) / 21; rv[t] = math.sqrt(max(0, (sum(x * x for x in rs) - 21 * m * m) / 20)) * math.sqrt(252) * 100
        inwin = [i for i, d in enumerate(sd) if z0 <= d <= z1]
        rec(scen, 'VIX: etichetta = sedute dell\'S&P 500, bordi', sd[inwin[0]] == z0 and sd[inwin[-1]] == z1 and r['edgeL'][0][0] == dIT(z0) and r['edgeR'][0][0] == dIT(z1), f"{r['chip']} · bordi {r['edgeL'][0][0]} – {r['edgeR'][0][0]}")
        bad = []
        for d, rows in r['tips'] + r.get('mid', []):
            i = sd.index(d); t = tipmap(rows) if rows else {}
            pr = vix[i] - rv[i] if vix[i] is not None and rv[i] is not None else None
            hdr = num(rows[0][1].split(' ')[-1].replace('.', '')) if rows else None
            for lab, v, dec in [('VIX', vix[i], 2), ('Realizzata S&P 500, 21 sedute', rv[i], 1), ('Premio per la paura (S&P 500)', pr, 1)]:
                if not rows or iso(rows[0][0]) != d or not close_enough(num(t.get(lab)), v, dec): bad.append((d, lab, t.get(lab) if rows else None, v))
        rec(scen, f'VIX: riquadro = calcolo dal file (VIX, realizzata, premio) in {len(r["tips"])} sedute + {len(r.get("mid", []))} punti a metà tra due sedute (seduta più vicina)', not bad, str(bad[:3]))
        tb = {d: t for d, t in r['tipsBefore']}
        diff = [(d, tb[d], t) for d, t in r['tips'] if d in tb and tb[d] != t]
        rec(scen, f'VIX: riquadro identico con e senza zoom ({len(tb)} sedute)', not diff, str(diff[:1]))
        fr = frames(r['dump']); P0 = fr[0]; L, PW = P0['x'], P0['w']
        hi0 = max([vix[i] for i in inwin if vix[i] is not None] + [rv[i] for i in inwin if rv[i] is not None]) * 1.04
        sy = lambda v: P0['y'] + (hi0 - v) / hi0 * P0['h']
        pts = [x for x in r['dump']['paths'] if x['cls'] == 'vxvix'][0]['pts']; w = [i for i in inwin if vix[i] is not None]
        e = max(abs(p[2] - sy(vix[i])) for p, i in zip(pts, w))
        xs = max(abs(p[1] - (L + (ms(sd[i]) - t0) / (t1 - t0) * PW)) for p, i in zip(pts, w))
        rec(scen, 'VIX: scala del VIX sui valori visibili e x per data', e < 0.06 and xs < 0.06 and len(pts) == len(w), f'scarto y {e:.3f}, x {xs:.3f}, punti {len(pts)}/{len(w)}, fondo scala {hi0:.2f}')
        out = [(x['cls'], p) for x in r['dump']['paths'] for p in x['pts'] if x['cls'].startswith('vx') and not (L - 0.1 <= p[1] <= L + PW + 0.1 and any(f['y'] - 0.1 <= p[2] <= f['y'] + f['h'] + 0.1 for f in fr))]
        outr = [(x['cls'], x['x'], x['w']) for x in r['dump']['rects'] if x['cls'].startswith('vx') and not (L - 0.1 <= x['x'] and x['x'] + x['w'] <= L + PW + 0.1)]
        rec(scen, 'VIX: nessun punto né fascia fuori dai riquadri', not out and not outr, f'{out[:3]} {outr[:3]}')
        dots = [c for c in r['dump']['circles'] if c['cls'].startswith('vxrdot')]
        rec(scen, 'VIX: pallino dell\'ultimo VIX/VIX3M solo se l\'ultima seduta è nel tratto', (len(dots) == 1) == (z1 == sd[-1]), f'{len(dots)} pallini, fine del tratto {z1}')
        ticks_check(scen, r['dump'], t0, t1)
        if r.get('ndxChip') is not None: rec(scen, 'VIX: lo zoom resta passando a NDX', r['ndxChip'] == r['chip'], r['ndxChip'])
