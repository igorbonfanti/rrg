"""Ricalcolo indipendente dei numeri principali della ricerca «VIX: regimi» (S&P 500 con il VIX, soglie 30, 40, 50).

Scritto da zero in Python (solo libreria standard), senza riusare il codice di regimi.mjs:
- legge le cache ricerca/vix/cache/VIXCLS.json e _GSPC.json;
- episodio: si conta, per ogni seduta dell'S&P 500 con il VIX, la lunghezza della serie di chiusure < X subito prima;
  inizio = VIX >= X con almeno 63 chiusure consecutive < X prima (stessa definizione, altra implementazione);
- rendimenti dalla chiusura del segnale a +21/63/126/252 sedute, calo = min(0, minimo delle 252 chiusure dopo / prezzo
  del segnale - 1); base = tutte le sedute dal 1990-01-02; 10° percentile con statistics.quantiles(method='inclusive');
- giorni con VIX >= X (come lo scatter di Rea) a 252 sedute.
Confronta con ricerca/vix/regimi/risultati.json (tolleranza 0,01 punti) e stampa le differenze.

Uso: python3 -I ricerca/vix/regimi/script/verifica.py
"""
import json
import os
import statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', '..', 'cache')
RES = os.path.join(HERE, '..', 'risultati.json')


def rows(name):
    with open(os.path.join(CACHE, name + '.json')) as f:
        return json.load(f)['rows']


spx = rows('_GSPC')
vix = dict((d, v) for d, v in rows('VIXCLS'))
start = min(vix)
dates = [d for d, _ in spx]
close = [c for _, c in spx]
N = len(close)
H = [21, 63, 126, 252]


def ret(i, h):
    return (close[i + h] / close[i] - 1) * 100 if i + h < N else None


def summary(vals):
    v = [x for x in vals if x is not None]
    if not v:
        return dict(n=0)
    pos = sum(1 for x in v if x > 0)
    p10 = st.quantiles(v, n=10, method='inclusive')[0] if len(v) > 1 else v[0]
    return dict(n=len(v), median=st.median(v), posN=pos, pos=100 * pos / len(v), p10=p10)


# serie del VIX sul calendario dell'S&P 500 (dal primo VIX)
sess = [i for i, d in enumerate(dates) if d >= start and d in vix]


def episodes(X, Q=63):
    out = []  # run = chiusure consecutive < X prima della seduta corrente; seen = sedute con il VIX già viste
    run = 0
    seen = 0
    for i in sess:
        v = vix[dates[i]]
        if v >= X and seen >= Q and run >= Q:
            out.append(i)
        run = run + 1 if v < X else 0
        seen += 1
    return out


def dd(i):
    if i + 252 >= N:
        return None
    m = min(close[i + 1:i + 253])
    return min(0.0, (m / close[i] - 1) * 100)


res = json.load(open(RES))
main = res['main']['SPX_VIX']
bad = 0


def check(label, mine, theirs, tol=0.011):
    global bad
    ok = (mine is None and theirs is None) or (mine is not None and theirs is not None and abs(mine - theirs) <= tol)
    if not ok:
        bad += 1
    print(f"{'ok ' if ok else 'NO '} {label}: py {mine if mine is None else round(mine, 2)}  js {theirs}")


base_idx = [i for i, d in enumerate(dates) if d >= start]
for h in H:
    s = summary([ret(i, h) for i in base_idx])
    b = main['base'][str(h)]
    check(f'base {h} n', s['n'], b['n'])
    check(f'base {h} mediana', s['median'], b['median'])
    check(f'base {h} quota positivi', s['pos'], b['pos'])
    check(f'base {h} p10', s['p10'], b['p10'])
bdd = [dd(i) for i in base_idx]
check('base calo mediano', st.median([x for x in bdd if x is not None]), main['base']['dd']['median'])

for X in (30, 40, 50):
    t = main['thresholds'][str(X)]
    ep = episodes(X)
    mine_dates = [dates[i] for i in ep]
    js_dates = [e['date'] for e in t['episodes']]
    same = mine_dates == js_dates
    bad += 0 if same else 1
    print(f"{'ok ' if same else 'NO '} X={X} date degli episodi ({len(mine_dates)}): {', '.join(mine_dates)}")
    for h in H:
        s = summary([ret(i, h) for i in ep])
        j = t['stats'][str(h)]
        check(f'X={X} {h} n', s['n'], j['n'])
        check(f'X={X} {h} mediana', s.get('median'), j['median'])
        check(f'X={X} {h} positivi', s.get('posN'), j['posN'])
    dds = [dd(i) for i in ep if dd(i) is not None]
    check(f'X={X} calo mediano', st.median(dds), t['stats']['dd']['median'])
    check(f'X={X} calo peggiore', min(dds), t['stats']['dd']['worst'])
    days = [i for i in sess if vix[dates[i]] >= X]
    s = summary([ret(i, 252) for i in days])
    check(f'X={X} giorni', len(days), t['days']['days'])
    check(f'X={X} giorni 252 mediana', s['median'], t['days']['252']['median'])
    check(f'X={X} giorni 252 quota positivi', s['pos'], t['days']['252']['pos'])

print('\nDIFFERENZE:', bad)
