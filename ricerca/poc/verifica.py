#!/usr/bin/env python3
"""
verifica.py — ricalcolo indipendente (Python, solo libreria standard) dei numeri principali di ricerca/poc/analisi.mjs.

Non importa niente dallo script Node: legge le stesse risposte GREZZE di Yahoo in ricerca/poc/cache/ e rifà con codice
proprio la lettura delle barre (fuso della borsa, barre ancora aperte escluse, seduta delle ore serali dei future), le
scale, i volumi e i profili. Confronta poi con ricerca/poc/risultati.json:
  - POC dei metodi a, b, c con le 5 fasce (50, 100, 200 fasce; passo 0,5% e 1%) per tutte le varianti dei 9 mercati,
    scarto massimo e giudizio «robusto»; value area 70% (b, 100 fasce);
  - parte A: distanza dal massimo dei 3 anni, data del massimo, calo più profondo di GLD, SLV, GC=F, SI=F;
  - volume di ^GSPC e ^NDX uguale a quello di ^NYA e ^IXIC nei 12 mesi.
Scrive ricerca/poc/verifica.json ed esce con codice 1 se qualcosa non torna.

Uso: python3 -I ricerca/poc/verifica.py
"""
import bisect
import datetime as dt
import json
import os
import sys
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')


def fname(kind, sym):
    safe = ''.join(c if (c.isalnum() or c in '.-') else '_' for c in sym)
    return os.path.join(CACHE, f'{kind}_{safe}.json')


def load(kind, sym):
    p = fname(kind, sym)
    if not os.path.exists(p):
        return None
    with open(p) as f:
        j = json.load(f)
    if 'error' in j['res']:
        return None
    return j


def bars(kind, sym):
    """Barre con data locale, seduta, OHLCV; salta le chiusure nulle."""
    j = load(kind, sym)
    if j is None:
        return None
    r = j['res']
    tz = ZoneInfo(r['meta']['exchangeTimezoneName'])
    fut = r['meta'].get('instrumentType') == 'FUTURE'
    hourly = r['meta'].get('dataGranularity') != '1d'
    q = r['indicators']['quote'][0]
    out = []
    for i, t in enumerate(r['timestamp']):
        c = q['close'][i]
        if c is None:
            continue
        loc = dt.datetime.fromtimestamp(t, tz)
        d = loc.date()
        s = d + dt.timedelta(days=1) if (fut and hourly and loc.hour >= 18) else d
        h = q['high'][i]
        lo = q['low'][i]
        h = max(h, c) if h is not None else c
        lo = min(lo, c) if lo is not None else c
        out.append({'t': t, 'd': d.isoformat(), 'hr': loc.hour, 's': s.isoformat(), 'h': h, 'l': lo, 'c': c, 'v': q['volume'][i] or 0})
    return out


def closed_daily(sym, kind='d'):
    """Barre giornaliere chiuse, come le legge l'app: niente barra della seduta in corso al momento del download
    (dentro l'orario regolare e meno di un'ora dopo la chiusura), una barra per data (l'ultima)."""
    j = load(kind, sym)
    r = j['res']
    now = dt.datetime.fromisoformat(j['fetched'].replace('Z', '+00:00')).timestamp()
    reg = r['meta'].get('currentTradingPeriod', {}).get('regular')
    tz = ZoneInfo(r['meta']['exchangeTimezoneName'])
    q = r['indicators']['quote'][0]
    adj = (r['indicators'].get('adjclose') or [{}])[0].get('adjclose') or q['close']
    dates, close, high = [], [], []
    for i, t in enumerate(r['timestamp']):
        c = q['close'][i]
        if reg and t >= reg['start'] and now < reg['end'] + 3600:
            continue
        if c is None or adj[i] is None:
            continue
        d = dt.datetime.fromtimestamp(t, tz).date().isoformat()
        h = q['high'][i]
        h = h if (h is not None and h > c) else c
        if dates and dates[-1] == d:
            close[-1], high[-1] = c, h
            continue
        dates.append(d); close.append(c); high.append(h)
    return dates, close, high


def year_before(d, years=1):
    y, m, dd = map(int, d.split('-'))
    try:
        return dt.date(y - years, m, dd).isoformat()
    except ValueError:  # 29 febbraio
        return dt.date(y - years, m, 28).isoformat()


def med(a):
    a = sorted(x for x in a if x is not None)
    n = len(a)
    if not n:
        return None
    return a[n // 2] if n % 2 else (a[n // 2 - 1] + a[n // 2]) / 2


# ---------------------------------------------------------------- profili
def make_edges(g, lo, hi):
    if g[0] == 'n':
        n = g[1]
        return [lo + (hi - lo) * i / n for i in range(n + 1)]
    e = [lo]
    while e[-1] < hi:
        e.append(e[-1] * (1 + g[1]))
    return e


def bin_of(e, p):
    if p <= e[0]:
        return 0
    if p >= e[-1]:
        return len(e) - 2
    return bisect.bisect_right(e, p) - 1


def prof(items, mode, e):
    v = [0.0] * (len(e) - 1)
    for x in items:
        if not x['v'] > 0:
            continue
        if mode == 'close' or x['h'] <= x['l']:
            v[bin_of(e, x['c'])] += x['v']
            continue
        i0, i1, w = bin_of(e, x['l']), bin_of(e, x['h']), x['h'] - x['l']
        for i in range(i0, i1 + 1):
            v[i] += x['v'] * (min(x['h'], e[i + 1]) - max(x['l'], e[i])) / w
    return v


def read(v, e, g):
    p = max(range(len(v)), key=lambda i: (v[i], -i))
    cen = (lambda i: (e[i] + e[i + 1]) / 2) if g[0] == 'n' else (lambda i: (e[i] * e[i + 1]) ** 0.5)
    tot = sum(v)
    lo = hi = p
    s = v[p]
    while s < 0.7 * tot:
        up = v[hi + 1] if hi + 1 < len(v) else -1
        dn = v[lo - 1] if lo - 1 >= 0 else -1
        if up < 0 and dn < 0:
            break
        if up >= dn:
            hi += 1; s += up
        else:
            lo -= 1; s += dn
    return cen(p), e[lo], e[hi + 1]


GRIDS = [('n', 50, 'n50'), ('n', 100, 'n100'), ('n', 200, 'n200'), ('p', 0.005, 'p0.5'), ('p', 0.01, 'p1')]


def mapped(vol, chart, scale, contract, frm, to):
    cd = {x['d']: x['c'] for x in bars('d', chart)}
    vb = bars('d', vol)
    vm = {x['d']: x['c'] for x in vb}
    target = {x['d']: x['c'] for x in bars('c', contract)} if scale == 'contract' else cd
    fac = lambda s: target[s] / vm[s] if (s in target and s in vm) else None
    vh = bars('h', vol)
    hsum = {}
    for x in vh:
        if frm <= x['s'] <= to:
            hsum[x['s']] = hsum.get(x['s'], 0) + x['v']
    din = [x for x in vb if frm <= x['d'] <= to]
    ratio = med([x['v'] / hsum[x['d']] for x in din if hsum.get(x['d'], 0) > 0])
    use_h = ratio is not None and ratio < 0.5
    prev = {x['d']: (vb[i - 1]['v'] if i else None) for i, x in enumerate(vb)}
    daily = []
    for x in din:
        f = fac(x['d'])
        if f is None:
            continue
        stale = (not use_h) and x['v'] > 0 and prev[x['d']] == x['v'] and hsum.get(x['d'], 0) > 0
        v = hsum.get(x['d'], 0) if (use_h or stale) else x['v']
        daily.append({'s': x['d'], 'c': x['c'] * f, 'h': x['h'] * f, 'l': x['l'] * f, 'v': v})
    dv = {x['s']: x['v'] for x in daily}
    hourly = []
    for x in vh:
        if not (frm <= x['s'] <= to):
            continue
        f = fac(x['s'])
        if f is None:
            continue
        if use_h:
            k = 1
        else:
            k = dv[x['s']] / hsum[x['s']] if (hsum.get(x['s'], 0) > 0 and x['s'] in dv) else 0
        hourly.append({'c': x['c'] * f, 'h': x['h'] * f, 'l': x['l'] * f, 'v': x['v'] * k})
    return daily, hourly


def poc_set(daily, hourly):
    allb = daily + hourly
    lo, hi = min(x['l'] for x in allb), max(x['h'] for x in allb)
    res = {}
    for k, items, mode in (('a', daily, 'close'), ('b', daily, 'spread'), ('c', hourly, 'close')):
        res[k] = {}
        for g in GRIDS:
            e = make_edges(g, lo, hi)
            p, val, vah = read(prof(items, mode, e), e, g)
            res[k][g[2]] = {'poc': p, 'val': val, 'vah': vah}
    vals = [res[k][g[2]]['poc'] for k in 'abc' for g in GRIDS]
    return res, min(vals), max(vals)


MARKETS = [
    ('BTC', 'BTC-USD', None, [('BTC-USD', 'chart')]),
    ('GOLD', 'GC=F', 'GCZ26.CMX', [('GC=F', 'chart'), ('GC=F', 'contract'), ('GLD', 'chart'), ('GLD', 'contract')]),
    ('SILVER', 'SI=F', 'SIZ26.CMX', [('SI=F', 'chart'), ('SI=F', 'contract'), ('SLV', 'chart'), ('SLV', 'contract')]),
    ('COPPER', 'HG=F', 'HGZ26.CMX', [('HG=F', 'chart'), ('HG=F', 'contract')]),
    ('WTI', 'CL=F', 'CLZ26.NYM', [('CL=F', 'chart'), ('CL=F', 'contract')]),
    ('NDX', '^NDX', None, [('NQ=F', 'chart'), ('QQQ', 'chart'), ('^NDX', 'chart')]),
    ('SPX', '^GSPC', None, [('ES=F', 'chart'), ('SPY', 'chart'), ('^GSPC', 'chart')]),
    ('SOXX', 'SOXX', None, [('SOXX', 'chart')]),
    ('KOSPI', '^KS11', None, [('069500.KS', 'chart'), ('EWY', 'chart'), ('^KS11', 'chart')]),
]


def ath(dates, close, high, years=3):
    """Massimo di chiusura degli ultimi 3 anni, distanza, minimo dopo il massimo (riscritto, non js/ath.js)."""
    last_i = len(close) - 1
    frm = year_before(dates[last_i], years)
    idx = [i for i in range(last_i + 1) if dates[i] >= frm]
    ref = idx[0]
    for i in idx:
        if close[i] > close[ref]:
            ref = i
    after = list(range(ref + 1, last_i + 1))
    low = min(after, key=lambda i: (close[i], i)) if after else None
    r = lambda x: round(x * 100, 2)
    return {'refDate': dates[ref], 'ref': close[ref], 'distPct': r(close[last_i] / close[ref] - 1),
            'cycleLowDate': dates[low] if low is not None else None,
            'cycleLowPct': r(close[low] / close[ref] - 1) if low is not None else None}


def main():
    with open(os.path.join(HERE, 'risultati.json')) as f:
        R = json.load(f)
    bad, out = [], {'B': {}, 'A': {}, 'indexVolume': {}}
    rel = lambda a, b: abs(a / b - 1) if b else abs(a)
    for mid, chart, contract, variants in MARKETS:
        dates, _, _ = closed_daily(chart)
        to = dates[-1]
        frm = year_before(to)
        js = R['B'][mid]
        if js['to'] != to or js['from'] != frm:
            bad.append(f'{mid}: finestra {frm}–{to} contro {js["from"]}–{js["to"]}')
        out['B'][mid] = []
        for k, (vol, scale) in enumerate(variants):
            daily, hourly = mapped(vol, chart, scale, contract, frm, to)
            res, mn, mx = poc_set(daily, hourly)
            jv = js['variants'][k]
            worst = 0.0
            for m in 'abc':
                for g in GRIDS:
                    a, b = res[m][g[2]]['poc'], jv['methods'][m][g[2]]['poc']
                    worst = max(worst, rel(a, b))
            va = (res['b']['n100']['val'], res['b']['n100']['vah'])
            jva = (jv['methods']['b']['n100']['val'], jv['methods']['b']['n100']['vah'])
            worst_va = max(rel(va[0], jva[0]), rel(va[1], jva[1]))
            spread = round((mx / mn - 1) * 100, 2)
            robust = mx / mn - 1 <= 0.02
            ok = worst < 1e-4 and worst_va < 1e-4 and abs(spread - jv['spreadPct']) <= 0.011 and robust == jv['robust']
            out['B'][mid].append({'vol': vol, 'scale': scale, 'pocB100': round(res['b']['n100']['poc'], 4), 'spreadPct': spread, 'robust': robust,
                                  'maxRelDiffPoc': worst, 'maxRelDiffVa': worst_va, 'ok': ok})
            if not ok:
                bad.append(f'{mid} {vol} {scale}: scarto POC {worst:.2e}, VA {worst_va:.2e}, spread {spread} contro {jv["spreadPct"]}, robusto {robust} contro {jv["robust"]}')
    # parte A
    for sym in ['GLD', 'SLV', 'GC=F', 'SI=F']:
        d, c, h = closed_daily(sym)
        a = ath(d, c, h)
        j = R['A']['stats'][sym]
        ok = a['refDate'] == j['refDate'] and a['distPct'] == j['distPct'] and a['cycleLowDate'] == j['cycleLowDate'] and a['cycleLowPct'] == j['cycleLowPct']
        out['A'][sym] = {**a, 'ok': ok}
        if not ok:
            bad.append(f'A {sym}: {a} contro {j}')
    # volume degli indici
    for idx, comp in (('^GSPC', '^NYA'), ('^NDX', '^IXIC')):
        a = bars('d', idx)
        b = {x['d']: x['v'] for x in bars('d', comp)}
        to = a[-1]['d']
        w = [x for x in a if x['d'] >= year_before(to)]
        eq = sum(1 for x in w if b.get(x['d']) == x['v'])
        out['indexVolume'][idx] = {'sessions': len(w), 'equal': eq}
        j = R['indexVolume'][idx]
        if eq != j['equalToComposite'] or len(w) != j['sessions']:
            bad.append(f'volume {idx}: {eq}/{len(w)} contro {j["equalToComposite"]}/{j["sessions"]}')
    out['problems'] = bad
    with open(os.path.join(HERE, 'verifica.json'), 'w') as f:
        json.dump(out, f, indent=1)
    n = sum(len(v) for v in out['B'].values())
    print(f'POC: {n} varianti ricalcolate, {sum(1 for v in out["B"].values() for x in v if x["ok"])} uguali a risultati.json')
    for mid, v in out['B'].items():
        for x in v:
            print(f"  {mid:7} {x['vol']:10} {x['scale']:8} POC b/100 {x['pocB100']:>12} scarto {x['spreadPct']:>6}% {'robusto' if x['robust'] else 'non robusto':12} diff max {x['maxRelDiffPoc']:.1e}")
    print('A:', {k: (v['refDate'], v['distPct'], v['cycleLowPct'], v['ok']) for k, v in out['A'].items()})
    print('volume indici:', out['indexVolume'])
    if bad:
        print('NON TORNA:\n  ' + '\n  '.join(bad))
        sys.exit(1)
    print('Tutto coincide.')


if __name__ == '__main__':
    main()
