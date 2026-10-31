# Confronto tra quello che l'app mostra nel browser (b1_app.json, commit 9a81dd8) e i ricalcoli indipendenti:
# Monitor (breadth e conteggi da c2_breadth, drawdown e solo prezzo da c3_dd, ultimo/1G/1M da Yahoo), tabella Prezzi
# della rotazione (ultimo, 1G, 1S, 1M, 3M, YTD, drawdown, solo prezzo, vs media 200 da Yahoo), tabellone degli indici
# (breadth da c2_indices, drawdown da c3_dd, ultimo/1G/1M da Yahoo, cali forti da c6_cap).
# Tolleranza: mezza unità dell'ultima cifra mostrata (più 0,001 per gli arrotondamenti a metà).
# uso: python3 -I b2_compare.py   (dopo b1_app.cjs, c1, c2, c2_indices, c3, c6)
import sys, os, json, re, datetime as dt
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, W

B = json.load(open(W + 'b1_app.json'))
J = lambda f: json.load(open(W + f))


def num(s):
    s = s.replace('−', '-').replace('.', '').replace(',', '.').replace('%', '').replace('+', '').strip()
    m = re.match(r'^-?\d+(\.\d+)?', s)
    return (float(m.group(0)), len(m.group(1)) - 1 if m.group(1) else 0) if m else (None, None)


def close_enough(shown, val):
    v, dec = num(shown)
    if v is None or val is None:
        return v is None and val is None, v
    return abs(v - val) <= 0.5 * 10 ** -dec + 1e-3, v


def own_series(sym, asof):
    y = series(sym, '5y')
    d, a, c = list(y['dates']), list(y['adj']), list(y['close'])
    mt = y['meta'].get('regularMarketTime'); off = y['meta'].get('gmtoffset', 0) or 0
    if asof not in d and mt and dt.datetime.utcfromtimestamp(mt + off).strftime('%Y-%m-%d') == asof and y['meta'].get('instrumentType') != 'CRYPTOCURRENCY':
        d.append(asof); a.append(y['meta']['regularMarketPrice']); c.append(y['meta']['regularMarketPrice'])
    k = [i for i, x in enumerate(d) if x <= asof]
    return [d[i] for i in k], [a[i] for i in k], [c[i] for i in k]


bad, n = [], 0


def check(where, label, shown, val):
    global n
    n += 1
    ok, v = close_enough(shown, val)
    if not ok:
        bad.append((where, label, shown, None if val is None else round(val, 3)))


# ---------- Monitor ----------
c2 = {(r['date'], r['key']): r['own'] for r in J('c2_breadth.json')}
c3 = {r['t']: r for r in J('c3_dd.json')}
c1 = {(r['file'], r['sym']): r for r in J('c1_prices.json')}
for theme in ('dark', 'light'):
    for row in B[theme]['monitor']:
        sym = next(x for x in ('XLRE', 'XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLU', 'SPX', 'SPY') if row[0].startswith(x))
        key = 'SPX' if sym in ('SPX', 'SPY') else sym
        o = c2[('2026-10-19', key)]
        m = re.match(r'([\d,]+)%(?: (\d+)/(\d+))?', row[2])
        check('Monitor', sym + ' breadth', m.group(1) + '%', 100 * o['a200'] / o['n'])
        if m.group(2) and (int(m.group(2)), int(m.group(3))) != (o['a200'], o['n']):
            bad.append(('Monitor', sym + ' conteggio', row[2], (o['a200'], o['n'])))
        t = 'SPY' if key == 'SPX' else sym
        check('Monitor', sym + ' drawdown', row[4], c3[t]['dd_yahoo'])
        check('Monitor', sym + ' solo prezzo', row[5], c3[t]['pdd_own'])
        own = c1[('prices', t)]['own']
        check('Monitor', sym + ' ultimo', row[7], own['last']); check('Monitor', sym + ' 1G', row[8], own['d1']); check('Monitor', sym + ' 1M', row[9], own['m1'])

# ---------- Prezzi della rotazione ----------
files = {'Settori S&P 500': 'prices', 'MAG7': 'prices', '5 · Asset reali': 'prices_macro'}
for theme in ('dark', 'light'):
    for uni, v in B[theme]['prices'].items():
        name = uni.split('=')[0]
        f = files.get(name, 'prices_global'); P = load(f + '.json')
        grp = P['groups'].get(name, {}).get('tickers', list(P['tickers']))
        grp = grp + [g['defaultBenchmark'] for g in [P['groups'].get(name, {})] if g.get('defaultBenchmark') in P['tickers']] + list(P['groups'].get(name, {}).get('benchmarks', []))
        for row in v['rows']:
            lab = row[0].replace(' · benchmark', '')
            if lab.startswith('Portafoglio'):
                continue  # portafoglio sintetico: calcolato nell'app (verificato nella 0.9.0, codice invariato)
            cand = [s for s in grp if s in P['tickers'] and (lab.startswith(s) or lab.endswith(s) or lab.endswith(s.split('.')[0]))]
            cand = sorted(cand, key=len, reverse=True)
            if not cand:
                bad.append(('Prezzi', name, 'riga senza ticker', row[0])); continue
            s = cand[0]; r = c1.get((f, s))
            if not r or not r['own']:
                continue
            o = r['own']
            d, a, c = own_series(s, P['asOf'])
            dd = (a[-1] / max(a[-252:]) - 1) * 100
            vs200 = (a[-1] / (sum(a[-200:]) / 200) - 1) * 100
            x = r['max52_own']; pdd = (x['c'] / x['hi'] - 1) * 100 if x else None
            for lab, i, val in (('ultimo', 1, o['last']), ('1G', 2, o['d1']), ('1S', 3, o['w1']), ('1M', 4, o['m1']), ('3M', 5, o['m3']), ('YTD', 6, o['ytd']),
                                ('drawdown', 7, dd), ('solo prezzo', 8, pdd), ('vs media 200', 9, vs200)):
                if s.startswith('BTC') and lab in ('drawdown', 'solo prezzo', 'vs media 200'):
                    continue  # bitcoin: calendario di tutti i giorni per il massimo, sedute della borsa per le medie (vedi c1)
                check('Prezzi ' + name, f'{s} {lab}', row[i], val)

# ---------- Indici ----------
c2i = J('c2_indices.json'); c6 = {r['series']: r for r in J('c6_cap.json') if r['preset'] == {'thr': 7, 'win': 5, 'mode': 'count'}}
last_br = {}
for r in c2i:
    if 'date' in r:
        last_br[r['index']] = r
CFG = json.load(open(os.environ.get('RRG', '/home/user/rrg') + '/config/indices.json'))['indices']
for theme in ('dark', 'light'):
    for row in B[theme]['indices']:
        k = next(x for x in sorted(CFG, key=len, reverse=True) if row[0].startswith(x))
        m = re.match(r'([\d,]+)% (\d+)/(\d+)', row[2])
        if k in last_br:
            o = last_br[k]['own']
            check('Indici', k + ' breadth', m.group(1) + '%', 100 * o['a200'] / o['n'])
            if (int(m.group(2)), int(m.group(3))) != (o['a200'], o['n']):
                bad.append(('Indici', k + ' conteggio', row[2], (o['a200'], o['n'])))
        check('Indici', k + ' drawdown', row[4], c3[k]['dd_yahoo'])
        y = series(CFG[k]['price'], 'p2000'); yd = [d for d in y['dates']]
        app_last = load('indices.json' if CFG[k].get('main') else 'indices_more.json')['series'][k]
        from common import app_index
        A = app_index(k); D = A['dates']; yc = dict(zip(y['dates'], y['close']))
        L = len(D) - 1
        check('Indici', k + ' ultimo', row[7], yc.get(D[L]))
        check('Indici', k + ' 1G', row[8], (yc[D[L]] / yc[D[L - 1]] - 1) * 100 if D[L] in yc and D[L - 1] in yc else None)
        check('Indici', k + ' 1M', row[9], (yc[D[L]] / yc[D[L - 21]] - 1) * 100 if D[L] in yc and D[L - 21] in yc else None)
        cap = row[6]
        if k in c6:
            u = c6[k]['today']
            exp = 'ALLERTA' if u['on'] else (f"{u['recent']} SED." if u['recent'] else f"{round(u['pct'])}°")
            n += 1
            if cap.upper().replace(' ', '') != exp.replace(' ', '') and not (cap == '—' and u['pct'] is None):
                bad.append(('Indici', k + ' cali forti', cap, exp))
print(f'Valori confrontati: {n}; diversi oltre l\'arrotondamento: {len(bad)}')
for b in bad:
    print('  ', b)
json.dump(bad, open(W + 'b2_compare.json', 'w'), indent=1, ensure_ascii=False)
