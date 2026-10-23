import json, sys
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
R = '/home/user/rrg/data/'
res = []
def own_metrics(dates, vals, asof):
    # own implementation: index of asof in ticker's own sessions
    i = dates.index(asof)
    r = lambda k: (vals[i]/vals[i-k]-1)*100 if i-k >= 0 else None
    y = max(j for j, d in enumerate(dates) if d < asof[:4]+'-01-01')
    return dict(last=vals[i], d1=r(1), w1=r(5), m1=r(21), m3=r(63), ytd=(vals[i]/vals[y]-1)*100)
def app_metrics(dates, c):
    L = len(c)-1
    r = lambda k: (c[L]/c[L-k]-1)*100
    y0 = next(i for i, d in enumerate(dates) if d >= dates[L][:4]+'-01-01') - 1
    return dict(last=c[L], d1=r(1), w1=r(5), m1=r(21), m3=r(63), ytd=(c[L]/c[y0]-1)*100)
for f in ['prices', 'prices_global', 'prices_macro']:
    P = json.load(open(R+f+'.json')); D = P['dates']; asof = P['asOf']
    for sym, t in P['tickers'].items():
        if sym in ('CPI', 'DXY_INV'): continue
        y = series(sym)
        yd = dict(zip(y['dates'], y['adj']))
        c = t['close']
        # point-by-point comparison on common dates (relative scale on last date, dividends rescale history)
        mism = 0; filled = 0; maxrel = 0; worst = None; fills = []
        for i, d in enumerate(D):
            if c[i] is None: continue
            if d not in yd:
                filled += 1; fills.append(d); continue
            rel = abs(c[i]/yd[d]-1)
            if rel > maxrel: maxrel, worst = rel, d
            if rel > 5e-4: mism += 1
        am = app_metrics(D, c)
        crypto = sym.startswith('BTC')
        # own metrics on ticker's own calendar restricted to app calendar for crypto
        if crypto:
            od = [d for d in D if d in yd]; ov = [yd[d] for d in od]
        else:
            od, ov = y['dates'], y['adj']
        om = own_metrics(od, ov, asof) if asof in od else None
        res.append(dict(file=f, sym=sym, appLast=am['last'], yLast=yd.get(asof), last_in_yahoo=asof in yd,
                        app=am, own=om, mism=mism, maxrel=maxrel, worst=worst, filled=filled, fills=fills[-8:], ylastdate=y['dates'][-1]))
json.dump(res, open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/c1_prices.json', 'w'), indent=1, default=str)
f2 = lambda v: '—' if v is None else f'{v:.2f}'
print(f"{'file':14}{'sym':10}{'appLast':>11}{'yLast':>11} {'d1 a/o':>13} {'m1 a/o':>13} {'ytd a/o':>13} mism maxrel%  filled lastfills")
for r in res:
    a, o = r['app'], r['own'] or {}
    print(f"{r['file']:14}{r['sym']:10}{f2(r['appLast']):>11}{f2(r['yLast']):>11} {f2(a['d1'])+'/'+f2(o.get('d1')):>13} {f2(a['m1'])+'/'+f2(o.get('m1')):>13} {f2(a['ytd'])+'/'+f2(o.get('ytd')):>13} {r['mism']:4} {r['maxrel']*100:6.3f} {r['worst']} {r['filled']:4} {r['fills'][-4:]}")
