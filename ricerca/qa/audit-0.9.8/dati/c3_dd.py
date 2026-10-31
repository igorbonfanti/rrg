# C3. Drawdown dal massimo a 52 settimane (252 sedute), con dividendi e solo prezzo, e profondità storica (percentile).
# Settori, SPY e RSP (sectors.json, storia dal 2004) contro Yahoo adjclose/close; i 22 indici (storia dal 2000) contro
# Yahoo chart; la tabella Prezzi della rotazione (prices.json, 5 anni) per gli stessi ETF.
# Calcolo indipendente: massimo delle ultime 252 chiusure; percentile = quota delle sedute precedenti (almeno 252) con un
# drawdown meno profondo, senza le classi da 0,1 punti dell'app (quindi può differire di ±1).
# uso: python3 -I c3_dd.py
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, series, app_index, dump, R


def dd_series(v):
    out = [None] * len(v)
    for i, x in enumerate(v):
        if x is None:
            continue
        w = [y for y in v[max(0, i - 251):i + 1] if y is not None]
        out[i] = (x / max(w) - 1) * 100
    return out


def pctl(dd, i, minh=252):
    prev = [x for x in dd[:i] if x is not None]
    if len(prev) < minh:
        return None
    return 100 * sum(1 for x in prev if x > dd[i] + 1e-12) / len(prev)


def app_bins(dd, i, minh=252):
    # percentile come lo calcola l'app (classi da 0,1 punti, arrotondato): solo per spiegare gli scarti di 1
    b = lambda x: min(1000, max(0, round(-x * 10)))
    prev = [x for x in dd[:i] if x is not None]
    if len(prev) < minh:
        return None
    bi = b(dd[i])
    return round(100 * sum(1 for x in prev if b(x) < bi) / len(prev))


S = load('sectors.json'); D = S['dates']; at = S['max52At']; iA = D.index(at)
B = load('breadth.json'); now = max(i for i, d in enumerate(D) if d in set(B['dates']))
print(f'sectors.json: {len(D)} sedute, max52At {at}, ultima seduta con breadth {D[now]}')
rows = []
print(f"{'ETF':5} {'dd app':>8} {'dd ric.':>8} {'pct app':>7} {'pct ric.':>8} {'(classi)':>8} | solo prezzo: max app/ric  data app/ric  ultima app/ric  dd app/ric | storia: punti≠ ")
for t, a in S['adjclose'].items():
    y = series(t, 'p2004'); yd = dict(zip(y['dates'], y['adj'])); yc = dict(zip(y['dates'], y['close']))
    mism = [(d, x, round(yd[d], 2)) for d, x in zip(D, a) if x is not None and d in yd and abs(x - round(yd[d], 2)) > 0.0101]
    nobar = [d for d, x in zip(D, a) if x is not None and d not in yd]
    va = a[:now + 1]
    dda = dd_series(va)  # sulle chiusure del file (stesse dell'app)
    vo = [yd.get(d) for d in D[:now + 1]]
    ddo = dd_series(vo)  # sulle chiusure di Yahoo, non arrotondate
    m = S['max52'][t]
    win = D[iA - 251:iA + 1]
    cl = [(yc[d], d) for d in win if d in yc]; hi = max(c for c, _ in cl); hid = min(d for c, d in cl if c == hi)
    pdd_app = (m['c'] / m['hi'] - 1) * 100; pdd_own = (yc[at] / hi - 1) * 100
    r = dict(t=t, dd_file=dda[now], dd_yahoo=ddo[now], pct_own=pctl(ddo, now), pct_appbins=app_bins(dda, now), hi_app=m['hi'], hi_own=hi, d_app=m['d'], d_own=hid,
             c_app=m['c'], c_own=yc[at], pdd_app=pdd_app, pdd_own=pdd_own, mism=mism[:3], n_mism=len(mism), nobar=nobar[:3], n_nobar=len(nobar))
    rows.append(r)
    print(f"{t:5} {dda[now]:8.2f} {ddo[now]:8.2f} {r['pct_appbins']:7} {r['pct_own']:8.1f} | {m['hi']}/{hi:.2f} {m['d']}/{hid} {m['c']}/{yc[at]:.2f} {pdd_app:6.2f}/{pdd_own:6.2f} | {len(mism)} {mism[:2]} senza barra {len(nobar)}")

# tabella Prezzi della rotazione (prices.json, 5 anni): stesso ETF, percentile su 5 anni
P = load('prices.json')
print('\nTabella Prezzi (prices.json, 5 anni) contro Monitor (sectors.json, dal 2004): percentile del drawdown e barra rossa (≥80)')
for r in rows:
    if r['t'] not in P['tickers']:
        continue
    c = P['tickers'][r['t']]['close']; dd5 = dd_series(c); p5 = app_bins(dd5, len(c) - 1)
    r['pct_5y'] = p5
    flag = (p5 >= 80) != (r['pct_appbins'] >= 80)
    print(f"  {r['t']:5} dd {dd5[-1]:7.2f}  percentile 5 anni {p5:3}  dal 2004 {r['pct_appbins']:3}{'   <<< rosso in una vista sola' if flag else ''}")

# indici
print('\nIndici: drawdown e percentile (storia dal 2000) all\'ultima seduta del prezzo')
cfg = json.load(open(R + 'config/indices.json'))['indices']
for k in cfg:
    A = app_index(k)
    y = series(A['symbol'], 'p2000'); yc = dict(zip(y['dates'], y['close']))
    dda = dd_series(A['close']); L = len(A['close']) - 1
    vo = [yc.get(d, c) for d, c in zip(A['dates'], A['close'])]
    ddo = dd_series(vo)
    miss = sum(1 for d in A['dates'] if d not in yc)
    r = dict(t=k, date=A['dates'][-1], dd_file=dda[L], dd_yahoo=ddo[L], pct_appbins=app_bins(dda, L), pct_own=pctl(ddo, L), missing=miss)
    rows.append(r)
    print(f"  {k:9} {A['dates'][-1]} dd file {dda[L]:7.2f} Yahoo {ddo[L]:7.2f}  percentile app {r['pct_appbins']} ricalcolo {r['pct_own']:.1f}  sedute del file senza barra Yahoo {miss}")
dump('c3_dd.json', rows)
