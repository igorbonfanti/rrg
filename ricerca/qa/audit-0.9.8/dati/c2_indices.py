# C2 bis. Breadth e cali forti degli indici (indices.json, indices_more.json, capitulation.json) ricalcolati dai prezzi
# dei membri di oggi (data/index_members/) scaricati ora da Yahoo chart, e chiusure degli indici contro Yahoo chart.
# Regole dal README: medie sulle sedute del titolo, un titolo conta con la sua ultima seduta se è al massimo 5 giorni
# prima; chiusure rettificate per gli split (close di Yahoo). Si controllano le ultime 6 sedute con breadth di ogni
# indice (le ultime 5 la pipeline le ricalcola con la lista di oggi).
# uso: python3 -I c2_indices.py [INDICE ...]
import sys, os, datetime as dt, statistics, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, app_index, app_cap, dump, R

SEL = sys.argv[1:] or ['DJI', 'NDX', 'DAX', 'CAC', 'SMI', 'FTSEMIB', 'SX5E', 'IBEX', 'UKX', 'N225', 'HSI', 'TSX60', 'NIFTY50', 'TWN', 'ASX200', 'IBOV']
CFG = json.load(open(R + 'config/indices.json'))['indices']
day = lambda a, b: (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days


def clean(dates, close):
    # stessa pulizia degli errori di scala di Yahoo della pipeline (clean in fetch_indices.js), riscritta
    d, c = [], []
    for i in range(len(close)):
        if 0 < i < len(close) - 1:
            a, b, n = close[i - 1], close[i], close[i + 1]
            if (b > 3 * a and b > 3 * n) or (3 * b < a and 3 * b < n):
                continue
        d.append(dates[i]); c.append(close[i])
    return d, c


def px_of(s, upto):
    y = series(s, '2y')
    if not y or not y['dates']:
        return None
    k = [i for i, d in enumerate(y['dates']) if d <= upto]
    d, c = clean([y['dates'][i] for i in k], [y['close'][i] for i in k])
    return {'dates': d, 'close': c, 'idx': {x: i for i, x in enumerate(d)}}


def count_day(mem, PX, d):
    r = dict(members=len(mem), n=0, fresh=0, a20=0, a50=0, a200=0)
    for s in mem:
        p = PX.get(s)
        if not p:
            continue
        j = max((i for i, x in enumerate(p['dates']) if x <= d), default=-1)
        if j < 0 or day(p['dates'][j], d) > 5:
            continue
        r['n'] += 1; r['fresh'] += p['dates'][j] == d
        for w in (20, 50, 200):
            if j >= w - 1 and p['close'][j] > sum(p['close'][j - w + 1:j + 1]) / w:
                r['a%d' % w] += 1
    return r


def cap_day(mem, PX, d):
    def ret(p, j):
        if j < 1 or j >= len(p['close']) or day(p['dates'][j - 1], p['dates'][j]) > 7:
            return None
        return p['close'][j] / p['close'][j - 1] - 1
    r, nx = [], []
    for s in mem:
        p = PX.get(s); j = p['idx'].get(d) if p else None
        r.append(None if j is None else ret(p, j)); nx.append(None if j is None else ret(p, j + 1))
    v = [x for x in r if x is not None]; out = dict(n=len(v), x5=0, x7=0, x10=0)
    if not v:
        return out
    med = statistics.median(v); nv = [x for x in nx if x is not None]
    calm = abs(med) < 0.02 and nv and abs(statistics.median(nv)) < 0.02
    for x, y in zip(r, nx):
        if x is None or x > -0.05 + 1e-9:
            continue
        if calm and y is not None and y >= (1 / (1 + x) - 1) * 0.9:
            continue
        if x <= -0.6 and med > -0.05:
            continue
        for t in (5, 7, 10):
            if x <= -t / 100 + 1e-9:
                out['x%d' % t] += 1
    return out


res = []
for k in SEL:
    A = app_index(k)
    bd = sorted(A['br'])[-6:]
    mem = load(f'index_members/{k}.json')['tickers']
    PX = {s: px_of(s, bd[-1]) for s in mem}
    PX = {s: p for s, p in PX.items() if p}
    capS = None
    if not CFG[k].get('noCap'):
        capS = app_cap(k); cpos = {d: i for i, d in enumerate(capS['dates'])}
    for d in bd:
        a = A['br'][d]; o = count_day(mem, PX, d)
        dif = {f: (a[f], o[f]) for f in ('members', 'n', 'a20', 'a50', 'a200') if a[f] != o[f]}
        row = dict(index=k, date=d, app=a, own=o, diff=dif)
        if capS is not None:
            i = cpos.get(d); ca = None if i is None else dict(n=capS['n'][i], x5=capS['x5'][i], x7=capS['x7'][i], x10=capS['x10'][i])
            co = cap_day(mem, PX, d)
            row.update(cap_app=ca, cap_own=co, cap_diff=None if ca is None else {f: (ca[f], co[f]) for f in ca if ca[f] != co[f]})
        res.append(row)
    # chiusure dell'indice: ultime 260 sedute del file contro Yahoo chart
    y = series(A['symbol'], '2y'); yc = dict(zip(y['dates'], y['close']))
    sc = 10000 if CFG[k]['price'] == '510300.SS' or (A['close'][-1] or 0) < 100 else 100
    cmp_ = [(d, c, yc.get(d)) for d, c in zip(A['dates'][-260:], A['close'][-260:])]
    miss = [d for d, c, v in cmp_ if v is None]
    worst = max(((abs(c - v), d, c, v) for d, c, v in cmp_ if v is not None and c is not None), default=None)
    over = [(d, c, round(v, 4)) for d, c, v in cmp_ if v is not None and c is not None and abs(c - round(v * sc) / sc) > 1.5 / sc]
    ownd = [d for d in y['dates'] if A['dates'][-260] <= d <= A['dates'][-1] and d not in set(A['dates'])]
    res.append(dict(index=k, prices=dict(compared=len(cmp_), missing_in_yahoo=miss, extra_in_yahoo=ownd, max_abs=worst, beyond_rounding=over[:5], n_beyond=len(over), scale=sc)))
    print(k, 'fatto', flush=True)

dump('c2_indices.json', res)
print('\nBreadth indici: indice data | app (a20,a50,a200,n,membri) | ricalcolo | esito')
for r in res:
    if 'date' in r:
        a, o = r['app'], r['own']
        cap = ''
        if 'cap_own' in r:
            cap = f" | cali forti app {r['cap_app'] and (r['cap_app']['x5'], r['cap_app']['x7'], r['cap_app']['x10'], r['cap_app']['n'])} ricalcolo {(r['cap_own']['x5'], r['cap_own']['x7'], r['cap_own']['x10'], r['cap_own']['n'])}{' DIFF' if r['cap_diff'] else ''}"
        print(f"  {r['index']:8} {r['date']} | {(a['a20'], a['a50'], a['a200'], a['n'], a['members'])} | {(o['a20'], o['a50'], o['a200'], o['n'], o['members'])} fresh {o['fresh']} | {'DIFF ' + str(r['diff']) if r['diff'] else 'OK'}{cap}")
    else:
        p = r['prices']
        print(f"  {r['index']:8} chiusure: {p['compared']} sedute, assenti su Yahoo {p['missing_in_yahoo']}, sedute Yahoo assenti nel file {p['extra_in_yahoo']}, oltre l'arrotondamento {p['n_beyond']} {p['beyond_rounding']}")
