# C2. Breadth dei settori e dell'S&P 500 (data/breadth.json), fotografia titolo per titolo (breadth_latest.json) e cali
# forti SPX/settori (capitulation.json) ricalcolati dai prezzi dei membri scaricati ora da Yahoo chart.
# Regole riscritte da zero dal README: chiusure rettificate per gli split (close di Yahoo), media semplice sulle sedute
# del titolo, sopra = chiusura > media; membri della data (lista di oggi meno i cambi successivi, data/sp500_members.json);
# per le ultime 5 sedute la pipeline usa la lista di oggi.
# Cali forti: rendimento chiusura su chiusura (seduta prima al massimo 7 giorni prima; rettificato per i dividendi se
# le due misure differiscono di oltre 5 punti), filtro errori di stampa e crolli > 60% come descritto nel README.
# uso: python3 -I c2_breadth.py [date ...]
import sys, os, datetime as dt, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, app_breadth, app_cap, dump

DATES = sys.argv[1:] or ['2026-09-24', '2026-09-25', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19']
M = load('sp500_members.json'); H = load('sp500_history.json')
today = {m['s']: m['sector'] for m in M['members']}
sector_of = dict(today)
for s, f in H['former'].items():
    sector_of.setdefault(s, f.get('sector'))
# PSKY (Paramount Skydance) è uscito dalla lista il 09/10 insieme all'ingresso di SKYD, ma non ha un settore in
# sp500_history.json (former): stesso settore di SKYD nella lista di oggi
if sector_of.get('PSKY') is None:
    sector_of['PSKY'] = today.get('SKYD')
BD, APP = app_breadth()
recompute_from = BD[-5]


def members_at(d):
    # la pipeline ricalcola ogni sera le ultime 5 sedute: i valori di una seduta d vengono dalla corsa della seduta
    # d+4, con la lista dei membri di quel giorno (cambi registrati in sp500_members.json con la data della corsa)
    i = BD.index(d); eff = BD[min(i + 4, len(BD) - 1)]
    cur = dict(today)
    for ch in sorted(M['changes'], key=lambda c: c['date'], reverse=True):
        if ch['date'] <= eff:
            break
        for s in ch['added']:
            cur.pop(s, None)
        for s in ch['removed']:
            cur[s] = sector_of.get(s)
    return cur


allsyms = sorted(set(today) | {s for ch in M['changes'] for s in ch['removed'] + ch['added']})
PX = {}
for k, s in enumerate(allsyms):
    y = series(s, '2y')
    if y and y['dates']:
        cut = [i for i, d in enumerate(y['dates']) if d <= '2026-10-19']
        PX[s] = {kk: [y[kk][i] for i in cut] for kk in ('dates', 'close', 'adj')}
        PX[s]['idx'] = {d: i for i, d in enumerate(PX[s]['dates'])}
print('titoli con prezzi:', len(PX), 'su', len(allsyms), '| senza:', [s for s in allsyms if s not in PX])


def above(c, i, w):
    if i < w - 1:
        return False
    return c[i] > sum(c[i - w + 1:i + 1]) / w


rows = []
for d in DATES:
    mem = members_at(d)
    cnt = {}
    for s, sec in mem.items():
        for k in (sec, 'SPX'):
            r = cnt.setdefault(k, dict(members=0, n=0, a20=0, a50=0, a200=0))
            r['members'] += 1
            p = PX.get(s)
            if not p or d not in p['idx']:
                continue
            i = p['idx'][d]; r['n'] += 1
            for w in (20, 50, 200):
                r['a%d' % w] += above(p['close'], i, w)
    for k in sorted(cnt):
        a = APP[k].get(d)
        o = cnt[k]
        diff = None if a is None else {f: a[f] - o[f] for f in ('members', 'n', 'a20', 'a50', 'a200') if a[f] != o[f]}
        rows.append(dict(date=d, key=k, app=a, own=o, diff=diff))
dump('c2_breadth.json', rows)
nd = [r for r in rows if r['diff']]
print(f'Breadth: {len(rows)} confronti (serie × date), {len(nd)} con differenze')
for r in rows:
    if r['key'] in ('SPX', 'XLU') or r['diff']:
        a, o = r['app'], r['own']
        print(f"  {r['date']} {r['key']:5} app {a and (a['a20'], a['a50'], a['a200'], a['n'], a['members'])}  ricalcolo {(o['a20'], o['a50'], o['a200'], o['n'], o['members'])}  {'DIFF ' + str(r['diff']) if r['diff'] else 'OK'}")

# breadth_latest.json
L = load('breadth_latest.json'); d = L['asOf']; bad = []
for x in L['members']:
    p = PX.get(x['s'])
    if not p or d not in p['idx']:
        if 'close' in x:
            bad.append((x['s'], 'ricalcolo senza prezzo'))
        continue
    c = p['close']; i = p['idx'][d]
    dist = lambda w: None if i < w - 1 else round((c[i] / (sum(c[i - w + 1:i + 1]) / w) - 1) * 1000) / 10
    hi = max(c[max(0, i - 251):i + 1])
    own = dict(close=round(c[i] * 100) / 100, d20=dist(20), d50=dist(50), d200=dist(200), up200=above(c, i, 200), dd=round((c[i] / hi - 1) * 1000) / 10)
    dif = {k: (x.get(k), v) for k, v in own.items() if (x.get(k) != v) and not (isinstance(v, float) and x.get(k) is not None and abs(x[k] - v) <= 0.1 + 1e-9)}
    if dif:
        bad.append((x['s'], dif))
print(f'breadth_latest.json ({d}): {len(L["members"])} titoli, differenze oltre l\'arrotondamento: {len(bad)}', bad[:10])


# cali forti SPX e settori
def ret(p, j):
    if j < 1 or j >= len(p['close']):
        return None
    if (dt.date.fromisoformat(p['dates'][j]) - dt.date.fromisoformat(p['dates'][j - 1])).days > 7:
        return None
    rc = p['close'][j] / p['close'][j - 1] - 1
    ra = p['adj'][j] / p['adj'][j - 1] - 1
    return ra if abs(rc - ra) > 0.05 else rc


def counts(syms, d):
    r, nx = [], []
    for s in syms:
        p = PX.get(s); j = p['idx'].get(d) if p else None
        r.append(None if j is None else ret(p, j)); nx.append(None if j is None else ret(p, j + 1))
    v = [x for x in r if x is not None]
    out = dict(n=len(v), x5=0, x7=0, x10=0, filtered=0)
    if not v:
        return out
    med = statistics.median(v); nv = [x for x in nx if x is not None]
    calm = abs(med) < 0.02 and nv and abs(statistics.median(nv)) < 0.02
    for x, y in zip(r, nx):
        if x is None or x > -0.05 + 1e-9:
            continue
        if calm and y is not None and y >= (1 / (1 + x) - 1) * 0.9:
            out['filtered'] += 1; continue
        if x <= -0.6 and med > -0.05:
            out['filtered'] += 1; continue
        for t in (5, 7, 10):
            if x <= -t / 100 + 1e-9:
                out['x%d' % t] += 1
    return out


capd = []
for k in ['SPX', 'XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU']:
    S = app_cap(k); pos = {dd: i for i, dd in enumerate(S['dates'])}
    for d in DATES:
        mem = members_at(d)
        syms = [s for s, sec in mem.items() if k == 'SPX' or sec == k]
        o = counts(syms, d); i = pos.get(d)
        a = None if i is None else dict(n=S['n'][i], x5=S['x5'][i], x7=S['x7'][i], x10=S['x10'][i])
        dif = None if a is None else {f: (a[f], o[f]) for f in ('n', 'x5', 'x7', 'x10') if a[f] != o[f]}
        capd.append(dict(key=k, date=d, app=a, own=o, diff=dif))
dump('c2_cap.json', capd)
print(f"Cali forti SPX e settori: {len(capd)} confronti, {sum(1 for x in capd if x['diff'])} con differenze")
for x in capd:
    if x['key'] == 'SPX' or x['diff']:
        print(f"  {x['date']} {x['key']:5} app {x['app']}  ricalcolo {x['own']}  {'DIFF ' + str(x['diff']) if x['diff'] else 'OK'}")
