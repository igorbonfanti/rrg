# C1. Prezzi e rendimenti dei tre file prezzi contro Yahoo chart (scaricato ora, indipendente dalla pipeline).
# Per ogni ticker: storia punto per punto (chiusura rettificata), sedute senza barra Yahoo (ricopiate) contro il campo
# `copied`, barre segnaposto di Yahoo (volume 0, O=H=L=C=chiusura precedente), ultimo prezzo e rendimenti
# 1G/1S/1M/3M/YTD (formula dell'app riscritta: priceMetrics in js/metrics.js) contro gli stessi rendimenti calcolati
# sulle sedute vere del ticker; max52 («Solo prezzo»): chiusura più alta non rettificata, data, ultima, massimo intraday,
# cedole nel periodo e dopo il massimo.
# uso: python3 -I c1_prices.py [prices|prices_global|prices_macro ...]
import sys, os, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, dump

FILES = sys.argv[1:] or ['prices', 'prices_global', 'prices_macro']


def app_metrics(D, c):
    L = len(c) - 1
    ch = lambda k: None if L - k < 0 or not c[L - k] else (c[L] / c[L - k] - 1) * 100
    y0 = next(i for i, d in enumerate(D) if d >= D[L][:4] + '-01-01') - 1
    return dict(last=c[L], d1=ch(1), w1=ch(5), m1=ch(21), m3=ch(63), ytd=(c[L] / c[y0] - 1) * 100 if y0 >= 0 and c[y0] else None)


def own_metrics(dates, vals, asof):
    i = dates.index(asof)
    r = lambda k: (vals[i] / vals[i - k] - 1) * 100 if i - k >= 0 else None
    y = max(j for j, d in enumerate(dates) if d < asof[:4] + '-01-01')
    return dict(last=vals[i], d1=r(1), w1=r(5), m1=r(21), m3=r(63), ytd=(vals[i] / vals[y] - 1) * 100, ytd_base=dates[y])


def placeholder(y, i):
    return (i > 0 and y['vol'][i] == 0 and y['open'][i] == y['close'][i] and y['high'][i] == y['close'][i]
            and y['low'][i] == y['close'][i] and y['close'][i - 1] == y['close'][i])


res = []
for f in FILES:
    P = load(f + '.json'); D = P['dates']; asof = P['asOf']
    for sym, t in P['tickers'].items():
        if t.get('synthetic'):
            continue
        y = series(sym, '5y')
        crypto = y['meta'].get('instrumentType') == 'CRYPTOCURRENCY'
        ph = {y['dates'][i] for i in range(len(y['dates'])) if placeholder(y, i)}
        yd = {d: a for d, a in zip(y['dates'], y['adj']) if d not in ph}
        # Yahoo mette la chiusura europea nella serie solo il giorno dopo: per l'ultima seduta vale il prezzo finale della
        # quotazione (regularMarketPrice), se la sua data locale è la seduta del file. Lo segno come 'rmp'.
        rmp = None
        mt = y['meta'].get('regularMarketTime'); off0 = y['meta'].get('gmtoffset', 0) or 0
        if not crypto and asof not in yd and mt and dt.datetime.utcfromtimestamp(mt + off0).strftime('%Y-%m-%d') == asof:
            rmp = y['meta']['regularMarketPrice']; yd[asof] = rmp
            y['dates'].append(asof); y['close'].append(rmp); y['adj'].append(rmp); y['high'].append(y['meta'].get('regularMarketDayHigh') or rmp)
            y['open'].append(None); y['low'].append(None); y['vol'].append(None)
        c = t['close']; copied = set(t.get('copied', []))
        sp_until = (t.get('spliced') or {}).get('until')
        mism, worst, maxrel, nofill, cop_ok, cop_bad, extra_cop, ph_used = 0, None, 0.0, [], 0, [], [], []
        for i, d in enumerate(D):
            if c[i] is None or (sp_until and d < sp_until):
                continue
            if d in yd:
                rel = abs(c[i] / yd[d] - 1)
                if rel > maxrel:
                    maxrel, worst = rel, d
                if rel > 5e-4:
                    mism += 1
                if i in copied:
                    extra_cop.append(d)
                if d in ph:
                    ph_used.append(d)
            else:
                # nessuna barra vera: l'app deve ricopiare il prezzo precedente e segnarlo
                if crypto:
                    continue
                if i > 0 and c[i] == c[i - 1] and i in copied:
                    cop_ok += 1
                elif i > 0 and c[i] == c[i - 1]:
                    cop_bad.append(d)  # ricopiato ma non segnato (forse tenuto dal file precedente)
                else:
                    nofill.append(d)  # valore diverso senza barra Yahoo oggi (keepPublished o barra sparita)
        am = app_metrics(D, c)
        if crypto:
            od = [d for d in D if d in yd]; ov = [yd[d] for d in od]
        else:
            od = [d for d in y['dates'] if d in yd and (f != 'prices_global' or d <= asof)]
            ov = [yd[d] for d in od]
        om = own_metrics(od, ov, asof) if asof in od else None
        # max52 indipendente: 252 sedute del file, chiusura non rettificata di Yahoo
        m = t.get('max52'); mx = None
        if m:
            win = D[-252:]
            yc = dict(zip(y['dates'], y['close'])); yh = dict(zip(y['dates'], y['high']))
            if crypto:
                ds = [d for d in y['dates'] if win[0] <= d <= win[-1]]
            else:
                ds = [d for d in win if d in yc and d not in ph]
            if sp_until:
                ds = [d for d in ds if d >= sp_until]
            if ds:
                hi, hid = max((yc[d], d) for d in reversed(ds))  # a pari merito la prima data
                hid = min(d for d in ds if yc[d] == hi)
                ih = max(max(yc[d], yh[d] or 0) for d in ds); iid = min(d for d in ds if max(yc[d], yh[d] or 0) == ih)
                off = y['meta'].get('gmtoffset', 0) or 0
                exd = sorted(dt.datetime.utcfromtimestamp(x['date'] + off).strftime('%Y-%m-%d') for x in y['events'].get('dividends', {}).values())
                dv = sum(1 for d in exd if win[0] < d <= win[-1]); da = sum(1 for d in exd if hid < d <= win[-1])
                mx = dict(hi=hi, d=hid, c=yc[ds[-1]], ih=ih, id=iid, dv=dv, da=da, cdate=ds[-1])
        res.append(dict(file=f, sym=sym, asof=asof, app=am, own=om, ylast=y['dates'][-1], mism=mism, maxrel=maxrel, worst=worst,
                        copied_ok=cop_ok, copied_unmarked=cop_bad, nobar_diff=nofill, marked_but_bar=extra_cop, placeholder_used=ph_used,
                        placeholders=len(ph), rmp=rmp, max52=m, max52_own=mx, spliced=sp_until))

dump('c1_prices.json', res)
f2 = lambda v: '—' if v is None else f'{v:.2f}'
bad = 0
print(f"{'file':14}{'sym':10}{'ultimo app':>11}{'yahoo':>11}  max|Δ| metriche  punti≠ maxrel%  ricop.ok  ricop.non segn.  senza barra≠  segn.ma barra  segnap.usati  max52")
for r in res:
    a, o = r['app'], r['own'] or {}
    dm = max((abs(a[k] - o[k]) for k in ('d1', 'w1', 'm1', 'm3', 'ytd') if a.get(k) is not None and o.get(k) is not None), default=None)
    m, x = r['max52'], r['max52_own']
    mok = '—'
    if m and x:
        mok = 'OK' if (abs(m['hi'] / x['hi'] - 1) < 2e-4 and m['d'] == x['d'] and abs(m['c'] / x['c'] - 1) < 2e-4 and abs(m['ih'] / x['ih'] - 1) < 2e-4
                       and m['dv'] == x['dv'] and m['da'] == x['da']) else f"DIFF app {m} / own {x}"
    flag = (dm is not None and dm > 0.011) or r['mism'] or r['copied_unmarked'] or r['nobar_diff'] or r['marked_but_bar'] or r['placeholder_used'] or mok.startswith('DIFF') or (r['own'] is None)
    bad += bool(flag)
    print(f"{r['file']:14}{r['sym']+('*' if r['rmp'] else ''):10}{f2(a['last']):>11}{f2(o.get('last')):>11}  {f2(dm):>8}  {r['mism']:5} {r['maxrel']*100:7.3f}  {r['copied_ok']:6}  {str(r['copied_unmarked'][:4]):>14}  {str(r['nobar_diff'][:3]):>12}  {str(r['marked_but_bar'][:3]):>12}  {str(r['placeholder_used'][:3]):>10}  {mok}{'  <<<' if flag else ''}")
print('ticker:', len(res), 'segnalati:', bad, '| * = ultima seduta confrontata con regularMarketPrice (barra non ancora nella serie)')
