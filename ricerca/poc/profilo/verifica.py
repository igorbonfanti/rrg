#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (Python, solo libreria standard, nessun import dagli script Node) dei profili dei
volumi degli ultimi 12 mesi e del criterio di ricerca/poc/profilo/sintesi.md.

Legge le stesse risposte grezze di Yahoo in ricerca/poc/cache/ e le interpreta con codice proprio: ultima seduta chiusa,
seduta di ogni barra oraria, scala del grafico, barre giornaliere costruite dalle orarie (SI=F, HG=F), volumi ricopiati,
profili spalmati su fasce logaritmiche, value area del 70%, sovrapposizioni, prova da un giorno all'altro, file dell'app.
Confronta tutto con risultati.json e profilo_app.json (scritti da analisi.mjs) e scrive verifica.json.

Uso: python3 -I ricerca/poc/profilo/verifica.py
"""
import json
import math
import os
import statistics
from datetime import datetime, timedelta, timezone, date
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', 'cache')


def fname(kind, sym):
    safe = ''.join(ch if (ch.isalnum() or ch in '.-') else '_' for ch in sym)
    return os.path.join(CACHE, f'{kind}_{safe}.json')


_raw = {}


def load(kind, sym):
    key = (kind, sym)
    if key not in _raw:
        with open(fname(kind, sym), encoding='utf-8') as f:
            j = json.load(f)
        fetched = datetime.fromisoformat(j['fetched'].replace('Z', '+00:00')).timestamp()
        _raw[key] = (j['res'], fetched)
    return _raw[key]


def closed_daily_dates(sym):
    """date delle barre giornaliere chiuse (stessa regola dell'app, riscritta: la barra in corso si salta)"""
    res, now = load('d', sym)
    meta = res['meta']
    off = meta.get('gmtoffset') or 0
    reg = (meta.get('currentTradingPeriod') or {}).get('regular')
    q = res['indicators']['quote'][0]
    adj = (res['indicators'].get('adjclose') or [{}])[0].get('adjclose') or q['close']
    out = []
    tz = ZoneInfo(meta['exchangeTimezoneName'])  # data nel fuso della borsa con l'ora legale di quel giorno
    for i, t in enumerate(res['timestamp']):
        d = datetime.fromtimestamp(t, tz).date().isoformat()
        if reg:
            is_open = t >= reg['start'] and now < reg['end'] + 3600
        else:
            is_open = d == datetime.fromtimestamp(now + off, timezone.utc).date().isoformat() and now < t + 8.5 * 3600 + 3600
        if is_open:
            continue
        if q['close'][i] is None or adj[i] is None:
            continue
        if out and out[-1] == d:
            continue
        out.append(d)
    return out


_bars = {}


def bars(kind, sym):
    key = (kind, sym)
    if key in _bars:
        return _bars[key]
    res, _ = load(kind, sym)
    meta = res['meta']
    tz = ZoneInfo(meta['exchangeTimezoneName'])
    fut = meta.get('instrumentType') == 'FUTURE'
    hourly = meta.get('dataGranularity') != '1d'
    q = res['indicators']['quote'][0]
    out = []
    for i, t in enumerate(res['timestamp']):
        c = q['close'][i]
        if c is None:
            continue
        lt = datetime.fromtimestamp(t, tz)
        s = lt.date()
        if fut and hourly and lt.hour >= 18:
            s = s + timedelta(days=1)
        h = q['high'][i]
        lo = q['low'][i]
        h = c if h is None else max(h, c)
        lo = c if lo is None else min(lo, c)
        out.append({'s': s.isoformat(), 'h': h, 'l': lo, 'c': c, 'v': q['volume'][i] or 0})
    _bars[key] = out
    return out


def year_before(d):
    y, m, dd = map(int, d.split('-'))
    try:
        return date(y - 1, m, dd).isoformat()
    except ValueError:  # 29/02
        return date(y - 1, m, 28).isoformat()


def build(chart, vol, frm, to, scale=None, contract=None, hourly_too=True):
    vd = bars('d', vol)
    vh = bars('h', vol)
    tgt = {x['s']: x['c'] for x in (bars('c', contract) if scale == 'contract' else bars('d', chart))}
    vclose = {x['s']: x['c'] for x in vd}

    def fac(s):
        if s in tgt and s in vclose:
            return tgt[s] / vclose[s]
        return None

    hs = {}
    for x in vh:
        if frm <= x['s'] <= to:
            hs[x['s']] = hs.get(x['s'], 0) + x['v']
    din = [x for x in vd if frm <= x['s'] <= to]
    rat = [x['v'] / hs[x['s']] for x in din if hs.get(x['s'], 0) > 0]
    from_h = bool(rat) and statistics.median(rat) < 0.5
    daily, dv, stale = [], {}, set()
    if from_h:
        agg = {}
        for x in vh:
            if not (frm <= x['s'] <= to):
                continue
            a = agg.get(x['s'])
            if a is None:
                agg[x['s']] = dict(x)
            else:
                a['h'] = max(a['h'], x['h']); a['l'] = min(a['l'], x['l']); a['c'] = x['c']; a['v'] += x['v']
        for s in sorted(agg):
            f = fac(s)
            if f is None:
                continue
            a = agg[s]
            daily.append({'s': s, 'h': a['h'] * f, 'l': a['l'] * f, 'c': a['c'] * f, 'v': a['v']})
            dv[s] = a['v']
    else:
        prev = {}
        for i, x in enumerate(vd):
            prev[x['s']] = vd[i - 1]['v'] if i else None
        for x in din:
            f = fac(x['s'])
            if f is None:
                continue
            v = x['v']
            if v > 0 and prev.get(x['s']) == v:
                stale.add(x['s']); v = 0
            daily.append({'s': x['s'], 'h': x['h'] * f, 'l': x['l'] * f, 'c': x['c'] * f, 'v': v})
            dv[x['s']] = v
    hourly = []
    if hourly_too:
        for x in vh:
            if not (frm <= x['s'] <= to):
                continue
            f = fac(x['s'])
            if f is None:
                continue
            if from_h or x['s'] in stale:
                k = 1
            else:
                k = dv[x['s']] / hs[x['s']] if hs.get(x['s'], 0) > 0 and x['s'] in dv else 0
            hourly.append({'s': x['s'], 'h': x['h'] * f, 'l': x['l'] * f, 'c': x['c'] * f, 'v': x['v'] * k})
    return daily, hourly, sorted(stale)


def edges(lo, hi, n):
    a, b = math.log(lo), math.log(hi)
    return [math.exp(a + (b - a) * i / n) for i in range(n + 1)]


def which(e, p):
    if p <= e[0]:
        return 0
    if p >= e[-1]:
        return len(e) - 2
    # ricerca lineare a partire dal logaritmo (fasce logaritmiche uguali), poi correzione
    n = len(e) - 1
    i = int((math.log(p) - math.log(e[0])) / (math.log(e[-1]) - math.log(e[0])) * n)
    i = max(0, min(n - 1, i))
    while i > 0 and p < e[i]:
        i -= 1
    while i < n - 1 and p >= e[i + 1]:
        i += 1
    return i


def prof(items, e, at_close=False):
    v = [0.0] * (len(e) - 1)
    for x in items:
        if not x['v'] > 0:
            continue
        if at_close or x['h'] <= x['l']:
            v[which(e, x['c'])] += x['v']
            continue
        lh, ll = math.log(x['h']), math.log(x['l'])
        for i in range(which(e, x['l']), which(e, x['h']) + 1):
            part = math.log(min(x['h'], e[i + 1])) - math.log(max(x['l'], e[i]))
            v[i] += x['v'] * part / (lh - ll)
    return v


def norm(v):
    t = sum(v)
    return [x / t for x in v]


def va70(v, e):
    p = max(range(len(v)), key=lambda i: (v[i], -i))
    tot = sum(v)
    lo = hi = p
    s = v[p]
    while s < 0.7 * tot:
        up = v[hi + 1] if hi + 1 < len(v) else -1
        dn = v[lo - 1] if lo > 0 else -1
        if up < 0 and dn < 0:
            break
        if up >= dn:
            hi += 1; s += up
        else:
            lo -= 1; s += dn
    return e[lo], e[hi + 1]


def ovl(p, q):
    n = min(len(p), len(q))

    def agg(x):
        if len(x) == n:
            return x
        k = len(x) // n
        return [sum(x[i * k:(i + 1) * k]) for i in range(n)]
    a, b = agg(p), agg(q)
    return sum(min(a[i], b[i]) for i in range(n))


def rng(items):
    return min(x['l'] for x in items), max(x['h'] for x in items)


MARKETS = [
    ('BTC', 'BTC-USD', 'BTC-USD', None, []),
    ('GOLD', 'GC=F', 'GC=F', 'GCZ26.CMX', [('GC=F', 'contract')]),
    ('SILVER', 'SI=F', 'SI=F', 'SIZ26.CMX', [('SI=F', 'contract')]),
    ('COPPER', 'HG=F', 'HG=F', 'HGZ26.CMX', [('HG=F', 'contract')]),
    ('WTI', 'CL=F', 'CL=F', 'CLZ26.NYM', [('CL=F', 'contract')]),
    ('NDX', '^NDX', 'QQQ', None, [('NQ=F', None)]),
    ('SPX', '^GSPC', 'SPY', None, [('ES=F', None), ('^GSPC', None)]),
    ('SOXX', 'SOXX', 'SOXX', None, []),
    ('KOSPI', '^KS11', '069500.KS', None, [('EWY', None), ('^KS11', None)]),
]
SET = ['b50', 'b100', 'b200', 'c250', 'c2100', 'c2200']

with open(os.path.join(HERE, 'risultati.json'), encoding='utf-8') as f:
    R = {m['id']: m for m in json.load(f)['markets']}
with open(os.path.join(HERE, 'profilo_app.json'), encoding='utf-8') as f:
    APP = json.load(f)['profiles']

out = {'markets': {}, 'differences': {}}
maxdiff = {'vaRel': 0.0, 'overlap': 0.0, 'day2day': 0.0, 'appBp': 0, 'profileMain': 0.0}
same_tests = True
for mid, chart, vol, contract, alts in MARKETS:
    dates = closed_daily_dates(chart)
    to = dates[-1]
    frm = year_before(to)
    daily, hourly, stale = build(chart, vol, frm, to, contract=contract)
    lo, hi = rng(daily + hourly)
    P, VA = {}, {}
    for key, items, n in [('b50', daily, 50), ('b100', daily, 100), ('b200', daily, 200), ('c250', hourly, 50), ('c2100', hourly, 100), ('c2200', hourly, 200)]:
        e = edges(lo, hi, n)
        v = prof(items, e)
        P[key] = norm(v)
        VA[key] = va70(v, e)
    vals = [VA[k][0] for k in SET]
    vahs = [VA[k][1] for k in SET]
    val_sp = max(vals) / min(vals) - 1
    vah_sp = max(vahs) / min(vahs) - 1
    ov = {k: ovl(P['b100'], P[k]) for k in SET if k != 'b100'}
    ta = val_sp <= 0.02 and vah_sp <= 0.02
    tb = min(ov.values()) >= 0.85
    # (c) ultime 60 sedute
    ends = dates[-61:]
    ds = [build(chart, vol, year_before(t), t, contract=contract, hourly_too=False)[0] for t in ends]
    pairs = []
    for i in range(1, len(ds)):
        l0, h0 = rng(ds[i - 1] + ds[i])
        e = edges(l0, h0, 100)
        pairs.append(ovl(norm(prof(ds[i - 1], e)), norm(prof(ds[i], e))))
    tc = min(pairs) >= 0.9
    # informativi
    alt = []
    for av, sc in alts:
        da, _, _ = build(chart, av, frm, to, scale=sc, contract=contract, hourly_too=False)
        l1, h1 = rng(daily + da)
        e = edges(l1, h1, 100)
        alt.append(ovl(norm(prof(daily, e)), norm(prof(da, e))))
    e100 = edges(lo, hi, 100)
    at_close = ovl(P['b100'], norm(prof(hourly, e100, at_close=True)))
    # file dell'app: solo barre giornaliere
    la, ha = rng(daily)
    ea = edges(la, ha, 100)
    bp = [round(x * 10000) for x in norm(prof(daily, ea))]
    row = {'from': frm, 'to': to, 'sessions': len(daily), 'stale': stale, 'va': {k: [round(VA[k][0], 6), round(VA[k][1], 6)] for k in SET},
           'valSpreadPct': round(val_sp * 100, 4), 'vahSpreadPct': round(vah_sp * 100, 4), 'overlaps': {k: round(x, 4) for k, x in ov.items()},
           'day2dayMin': round(min(pairs), 4), 'day2dayMedian': round(statistics.median(pairs), 4), 'day2dayBelow090': sum(1 for x in pairs if x < 0.9),
           'day2dayList': [[ends[i + 1], round(x, 4)] for i, x in enumerate(pairs)],
           'testA': ta, 'testB': tb, 'testC': tc, 'pass': ta and tb and tc, 'altOverlaps': [round(x, 4) for x in alt], 'hourlyAtClose': round(at_close, 4)}
    out['markets'][mid] = row
    # confronto con analisi.mjs
    r = R[mid]
    d = {}
    d['window'] = (r['from'], r['to']) == (frm, to) and r['data']['sessions'] == len(daily) and r['data']['staleDaily'] == stale
    dv = max(max(abs(r['va'][k]['val'] / VA[k][0] - 1), abs(r['va'][k]['vah'] / VA[k][1] - 1)) for k in SET)
    do = max(abs(r['overlaps'][k] - ov[k]) for k in ov)
    dd = max(abs(r['day2day']['list'][i]['overlap'] - pairs[i]) for i in range(len(pairs)))
    da = max(abs(a - b) for a, b in zip(APP[mid]['bp'], bp))
    dp = max(abs(a - b) for a, b in zip(r['profileMain'], P['b100']))
    dalt = max([abs(a['overlapWithMain'] - b) for a, b in zip(r['info']['alternatives'], alt)] + [0])
    d.update({'vaRel': dv, 'overlap': max(do, dalt, abs(r['info']['hourlyAtClose'] - at_close)), 'day2day': dd, 'appBp': da, 'profileMain': dp,
              'appRange': abs(APP[mid]['lo'] / la - 1) < 1e-5 and abs(APP[mid]['hi'] / ha - 1) < 1e-5,
              'tests': [r['testA'], r['testB'], r['testC'], r['pass']] == [ta, tb, tc, ta and tb and tc]})
    same_tests = same_tests and d['tests'] and d['window'] and d['appRange']
    for k in maxdiff:
        maxdiff[k] = max(maxdiff[k], d[k])
    out['differences'][mid] = d
    print(f"{mid:7} {frm}→{to} sedute {len(daily)} | VAL ±{val_sp*100:.2f}% VAH ±{vah_sp*100:.2f}% {'a✓' if ta else 'a✗'} | min sovr. {min(ov.values()):.4f} {'b✓' if tb else 'b✗'} | giorno/giorno min {min(pairs):.4f} {'c✓' if tc else 'c✗'} | {'MOSTRABILE' if ta and tb and tc else 'no'} | uguale a Node: {d['tests'] and d['window'] and d['appRange']}")

out['maxDifference'] = maxdiff
out['allTestsEqual'] = same_tests
with open(os.path.join(HERE, 'verifica.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write('\n')
print('scarti massimi rispetto ad analisi.mjs:', json.dumps(maxdiff), '| prove e finestre uguali:', same_tests)
