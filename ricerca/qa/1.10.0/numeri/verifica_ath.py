#!/usr/bin/env python3
"""
Controllo indipendente della 1.10.0 (pannello «Distanza dal massimo degli ultimi 3 anni», vista 8 VIX).

Non importa nulla dell'app: scarica da Yahoo (richieste proprie, urllib), data le barre nel fuso della borsa con zoneinfo,
scarta la seduta in corso, ricalcola tutte le statistiche e le confronta con data/ath.json; decodifica data/ath_history.json
(date compatte in base 36 e differenze intere / ps) e lo confronta con le chiusure scaricate dal 2000-01-01.
Seconda fonte: FRED (SP500, NASDAQ100, DCOILWTICO, CBBTCUSD) per l'ultima chiusura e il massimo dei 3 anni.

Uso:  python3 -I ricerca/qa/1.10.0/numeri/verifica_ath.py [--cache] [--root DIR]   (--cache: riusa i download in cache/; --root: altra copia del repository)
"""
import datetime as dt, json, os, sys, time, urllib.request, csv, io
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = sys.argv[sys.argv.index('--root') + 1] if '--root' in sys.argv else os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
CACHE = os.path.join(HERE, 'cache')
USE_CACHE = '--cache' in sys.argv
NOW = time.time()

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (qa check)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8')

def yahoo(sym):
    f = os.path.join(CACHE, 'Y_' + sym.replace('^', '_').replace('=', '_') + '.json')
    if USE_CACHE and os.path.exists(f):
        return json.load(open(f))
    url = f'https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?period1=-2208988800&period2={int(NOW)}&interval=1d'
    j = json.loads(get(url))
    json.dump(j, open(f, 'w'))
    return j

def bars(j):
    res = j['chart']['result'][0]
    meta = res['meta']; tz = ZoneInfo(meta['exchangeTimezoneName'])
    q = res['indicators']['quote'][0]
    reg = meta.get('currentTradingPeriod', {}).get('regular', {})
    out = []
    for i, t in enumerate(res['timestamp']):
        c = q['close'][i]; h = q['high'][i]
        if c is None:
            continue
        # seduta in corso: inizia dentro l'orario regolare di oggi e non è passata un'ora dalla chiusura
        if reg and t >= reg['start'] and NOW < reg['end'] + 3600:
            continue
        d = dt.datetime.fromtimestamp(t, tz).date().isoformat()
        hi = h if (h is not None and h > c) else c
        if out and out[-1][0] == d:
            out[-1] = (d, c, hi); continue
        out.append((d, c, hi))
    return out, meta

def wstart(last):
    y, m, d = map(int, last.split('-'))
    try:
        return dt.date(y - 3, m, d).isoformat()
    except ValueError:  # 29/02
        return dt.date(y - 3, m, 28).isoformat()

r2 = lambda x: None if x is None else round(x * 100) / 100
r4 = lambda x: None if x is None else round(x * 10000) / 10000

def stats(b):
    dates = [x[0] for x in b]; close = [x[1] for x in b]; high = [x[2] for x in b]
    n = len(b); last = close[-1]; lastDate = dates[-1]; frm = wstart(lastDate)
    win = [i for i in range(n) if dates[i] >= frm]
    ref = max(close[i] for i in win); iRef = next(i for i in win if close[i] == ref)
    after = list(range(iRef + 1, n))
    below = next((dates[i] for i in after if close[i] <= 0), None)
    if after and below is None:
        lo = min(close[i] for i in after); iLo = next(i for i in after if close[i] == lo)
    else:
        lo = iLo = None
    ath = max(close); iAth = close.index(ath)
    hi = max(high[i] for i in win); iHi = next(i for i in win if high[i] == hi)
    days = (dt.date.fromisoformat(lastDate) - dt.date.fromisoformat(dates[iRef])).days
    pct = lambda v, r: r2((v / r - 1) * 100)
    return {
        'start': dates[0], 'from': frm, 'last': r4(last), 'lastDate': lastDate,
        'ref': r4(ref), 'refDate': dates[iRef], 'distPct': pct(last, ref), 'days': days,
        'cycleLow': r4(lo), 'cycleLowDate': dates[iLo] if iLo is not None else None,
        'cycleLowPct': pct(lo, ref) if lo is not None else None, 'fromLowPct': pct(last, lo) if lo is not None else None,
        'belowZero': below, 'intradayRef': r4(hi), 'intradayRefDate': dates[iHi],
        'ath': r4(ath), 'athDate': dates[iAth], 'athDistPct': pct(last, ath),
    }

def decode(s):
    t = dt.date.fromisoformat(s['d0']); dates = [s['d0']]
    for ch in s['gaps']:
        t += dt.timedelta(days=int(ch, 36)); dates.append(t.isoformat())
    ps = s.get('ps', 1); p = None; vals = []
    for r in s['cd']:
        if r is None: p = None; vals.append(None); continue
        p = r if p is None else p + r; vals.append(p / ps)
    return dates, vals, ps

def fred(sid):
    f = os.path.join(CACHE, 'F_' + sid + '.csv')
    if USE_CACHE and os.path.exists(f):
        txt = open(f).read()
    else:
        txt = get(f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}'); open(f, 'w').write(txt)
    rows = list(csv.reader(io.StringIO(txt)))[1:]
    return [(d, float(v)) for d, v in rows if v not in ('.', '')]

def nasdaq(sym, ac):
    f = os.path.join(CACHE, 'N_' + sym + '.json')
    if not (USE_CACHE and os.path.exists(f)):
        raise RuntimeError('scaricare prima con curl --http1.1 (vedi rapporto.md)')
    j = json.load(open(f))
    num = lambda x: float(x.replace(',', '').replace('$', ''))
    out = []
    for r in j['data']['tradesTable']['rows']:
        m, d, y = r['date'].split('/')
        out.append((f'{y}-{m}-{d}', num(r['close']), num(r['high'])))
    return sorted(out)

def main():
    cfg = json.load(open(os.path.join(ROOT, 'config/ath.json')))['markets']
    A = json.load(open(os.path.join(ROOT, 'data/ath.json')))
    H = json.load(open(os.path.join(ROOT, 'data/ath_history.json')))
    pub = {m['id']: m for m in A['markets']}
    fails = 0; checks = 0; mine = {}
    print(f"data/ath.json generato {A['generated']}, asOf {A['asOf']}, missing {A['missing']}")
    for c in cfg:
        b, meta = bars(yahoo(c['symbol']))
        s = stats(b); mine[c['id']] = (b, s)
        p = pub[c['id']]['stats']
        diffs = []
        for k, v in s.items():
            checks += 1
            pv = p.get(k)
            if isinstance(v, float) and isinstance(pv, (int, float)):
                tol = 0.0101 if k.endswith('Pct') else 0.00011
                if abs(v - pv) > tol: diffs.append(f'{k}: app {pv} / mio {v}')
            elif v != pv:
                diffs.append(f'{k}: app {pv} / mio {v}')
        extra = set(p) - set(s)
        status = 'OK' if not diffs else 'DIFF'
        fails += bool(diffs)
        print(f"\n[{status}] {c['id']} {c['symbol']} ({meta['exchangeTimezoneName']}) ultima {s['lastDate']} {s['last']}  ref {s['ref']} {s['refDate']}  dist {s['distPct']}%  giorni {s['days']}  low {s['cycleLow']} {s['cycleLowDate']} ({s['cycleLowPct']}%)  da low {s['fromLowPct']}%  ath {s['ath']} {s['athDate']}  intraday {s['intradayRef']} {s['intradayRefDate']}")
        for d in diffs: print('    ', d)
        if extra: print('     campi in più nel file:', extra)
        # storico compatto
        hs = H['series'].get(c['id'])
        if not hs:
            print('     ath_history: SERIE ASSENTE'); fails += 1; continue
        hd, hv, ps = decode(hs)
        ref2000 = [(d, cl) for d, cl, _ in b if d >= '2000-01-01']
        md = [d for d, _ in ref2000]
        hdiff = 0; maxerr = 0.0
        if hd != md:
            print(f'     ath_history: DATE DIVERSE ({len(hd)} contro {len(md)}; prima diversa:', next(((x, y) for x, y in zip(hd, md) if x != y), None), ')'); fails += 1
        for (d, cl), v in zip(ref2000, hv):
            e = abs(round(cl * 10000) / 10000 - v)
            maxerr = max(maxerr, e)
            if e > 0.5 / ps + 1e-9: hdiff += 1
        checks += len(hv)
        # valori della tabella presenti nello storico
        hmap = dict(zip(hd, hv))
        lastok = abs(hmap.get(p['lastDate'], float('nan')) - p['last']) <= 0.5 / ps + 1e-9
        refok = abs(hmap.get(p['refDate'], float('nan')) - p['ref']) <= 0.5 / ps + 1e-9
        win = [v for d, v in zip(hd, hv) if d >= p['from'] and v is not None]
        maxwin_ok = abs(max(win) - p['ref']) <= 0.5 / ps + 1e-9 and hd[[i for i, d in enumerate(hd) if d >= p['from']][0] + win.index(max(win))] == p['refDate']
        lowok = p['cycleLow'] is None or abs(hmap.get(p['cycleLowDate'], float('nan')) - p['cycleLow']) <= 0.5 / ps + 1e-9
        print(f"     ath_history: {len(hv)} chiusure dal {hd[0]} al {hd[-1]}, ps {ps}, errore massimo {maxerr:.6f}, fuori arrotondamento {hdiff}; "
              f"ultima {'OK' if lastok else 'NO'}, massimo 3 anni {'OK' if refok and maxwin_ok else 'NO'}, minimo {'OK' if lowok else 'NO'}, ultima data {'OK' if hd[-1]==p['lastDate'] else 'NO ' + hd[-1]}")
        fails += hdiff > 0 or not (lastok and refok and maxwin_ok and lowok) or hd[-1] != p['lastDate']
    # seconda fonte
    print('\n--- Seconda fonte (FRED) ---')
    for sid, mid, note in [('SP500', 'SPX', 'stesso indice'), ('NASDAQ100', 'NDX', 'stesso indice'), ('DCOILWTICO', 'WTI', 'spot Cushing, non il future continuo'), ('CBBTCUSD', 'BTC', 'Coinbase, prezzo alle 00:00 UTC? (FRED: «daily»)')]:
        try:
            f = fred(sid)
        except Exception as e:
            print(f'{sid}: non scaricato ({e})'); continue
        p = pub[mid]['stats']
        fl = [x for x in f if x[0] <= p['lastDate']]
        last = fl[-1]; win = [x for x in fl if x[0] >= p['from']]
        mx = max(win, key=lambda x: x[1]); mxd = next(x for x in win if x[1] == mx[1])
        print(f"{sid:10s} ({note}): ultima {last[0]} {last[1]} (app {p['lastDate']} {p['last']}, diff {100*(last[1]/p['last']-1):+.3f}%);"
              f" massimo 3 anni {mxd[0]} {mx[1]} (app {p['refDate']} {p['ref']}, diff {100*(mx[1]/p['ref']-1):+.3f}%); distanza FRED {100*(last[1]/mx[1]-1):.2f}% (app {p['distPct']}%)")
    print('\n--- Seconda fonte (api.nasdaq.com, chiusure e massimi della seduta) ---')
    for sym, mid, ac in [('GLD', 'GOLD', 'etf'), ('SLV', 'SILVER', 'etf'), ('SOXX', 'SOXX', 'etf'), ('NDX', 'NDX', 'index')]:
        try:
            rows = nasdaq(sym, ac)
        except Exception as e:
            print(f'{sym}: non scaricato ({e})'); continue
        p = pub[mid]['stats']
        rows = [r for r in rows if r[0] <= p['lastDate']]
        win = [r for r in rows if r[0] >= p['from']]
        mx = max(r[1] for r in win); mxd = next(r[0] for r in win if r[1] == mx)
        hi = max(r[2] for r in win); hid = next(r[0] for r in win if r[2] == hi)
        after = [r for r in rows if r[0] > mxd]; lo = min(after, key=lambda r: r[1]) if after else None
        yb = dict((d, cl) for d, cl, _ in mine[mid][0])
        nd = sum(1 for r in win if r[0] not in yb); nv = sum(1 for r in win if r[0] in yb and abs(r[1] - yb[r[0]]) > 0.006 * (1 if r[1] < 1000 else 10))
        print(f"{sym:5s}: chiusure di tutta la finestra confrontate con Yahoo: {len(win)}, date assenti in Yahoo {nd}, valori diversi oltre l'arrotondamento {nv}")
        print(f"{sym:5s}: {len(win)} sedute nella finestra (dal {win[0][0]}); ultima {rows[-1][0]} {rows[-1][1]} (app {p['lastDate']} {p['last']}); massimo 3 anni {mxd} {mx} (app {p['refDate']} {p['ref']}, diff {100*(mx/p['ref']-1):+.3f}%);"
              f" distanza {100*(rows[-1][1]/mx-1):.2f}% (app {p['distPct']}%); minimo dopo {lo[0]} {lo[1]} (app {p['cycleLowDate']} {p['cycleLow']}); massimo seduta {hid} {hi} (app {p['intradayRefDate']} {p['intradayRef']})")
    print(f'\nControlli: {checks} confronti, mercati con differenze o storico non coerente: {fails}')
    json.dump({k: v[1] for k, v in mine.items()}, open(os.path.join(HERE, 'ricalcolo.json'), 'w'), indent=1)

if __name__ == '__main__':
    import urllib.parse
    main()
