"""Verifica indipendente del backtest «Emergenti» (Python, senza importare i moduli dell'app né backtest.mjs).

Rifà da capo, leggendo direttamente i file:
  1. decodifica di data/indices*.json (date, chiusure, conteggi della breadth), percentuale sopra la media 200;
  2. drawdown dal massimo a 252 sedute e suo percentile storico (solo sedute precedenti);
  3. macchina a stati (zona blu, trigger, fallito, cooldown, riarmo) scritta di nuovo dalla descrizione in docs/sviluppo.md
     e in testa a js/signals.js, con i parametri di config/thresholds.json e i livelli di config/indices.json;
  4. F (stop della valuta), D (dollaro emergente, ultimo valore pubblicato da FRED), punteggio e rendimento a 126 sedute
     dalla seduta dopo il segnale;
  5. mediane di H3 (dal 2016, cinque indici con F + D);
  6. controllo della fonte dei cambi: Yahoo contro FRED H.10 nelle stesse date (solo a schermo).
Poi confronta con ricerca/emergenti/backtest/risultati.json: date dei trigger e degli ingressi in zona blu, falliti,
punteggio, F, D, rendimenti, e le mediane di H3. Esce con codice 1 se qualcosa non coincide.

Uso: python3 -I ricerca/emergenti/backtest/script/verifica.py
"""
import json, math, os, sys, datetime as dt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
def J(p): return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
TH = J('config/thresholds.json')['params']; CFG = J('config/indices.json')['indices']
SER = {**J('data/indices_more.json')['series'], **J('data/indices.json')['series']}
RES = J('ricerca/emergenti/backtest/risultati.json')
IDX = ['CSI300', 'NIFTY50', 'IBOV', 'KOSPI200', 'TWN', 'HSI', 'EEM']
# dalla 1.4.0 i cambi sono quelli della Federal Reserve (FRED H.10, dal 2000), senza pulizia
CCY = {'CSI300': 'DEXCHUS', 'NIFTY50': 'DEXINUS', 'IBOV': 'DEXBZUS', 'KOSPI200': 'DEXKOUS', 'TWN': 'DEXTAUS'}
USDS = dict(CCY, HSI='DEXHKUS')

# ---------- 1. decodifica ----------
def undelta(a, scale):
    out, p = [], None
    for r in a:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r
        out.append(p / scale)
    return out
def rle(r, n):
    out = [None] * n
    for k, (i0, v) in enumerate(r):
        i1 = r[k + 1][0] if k + 1 < len(r) else n
        for i in range(i0, min(i1, n)): out[i] = v
    return out
def series(x):
    d = dt.date.fromisoformat(x['d0']); dates = [d.isoformat()]
    for ch in x['gaps']: d += dt.timedelta(days=int(ch, 36)); dates.append(d.isoformat())
    close = undelta(x['cd'], x.get('ps', 100)) if 'cd' in x else x['close']
    a20, a50, a200 = (undelta(x[k], 1) for k in ('d20', 'd50', 'd200')) if 'cd' in x else (x['a20'], x['a50'], x['a200'])
    m = len(a200); n_ = rle(x['n'], m); L = len(dates)
    p200, p50, p20, nn = [None] * L, [None] * L, [None] * L, [None] * L
    for i in range(m):
        j = x['b0'] + i
        if j >= L or a200[i] is None: continue
        nn[j] = n_[i]
        if n_[i]: p200[j] = 100 * a200[i] / n_[i]; p50[j] = 100 * a50[i] / n_[i]; p20[j] = 100 * a20[i] / n_[i]
    return dates, close, p200, p50, p20, nn

# ---------- 2. drawdown e percentile ----------
def jsround(v): return math.floor(v + 0.5)
def dd252(c):
    out = []
    for i in range(len(c)):
        mx = max(v for v in c[max(0, i - 251):i + 1] if v is not None)
        out.append((c[i] / mx - 1) * 100)
    return out
def depth(dd):
    out, cnt, tot = [], [0] * 1001, 0
    for v in dd:
        b = min(1000, max(0, jsround(-v * 10)))
        out.append(jsround(100 * sum(cnt[:b]) / tot) if tot >= 252 else None)
        cnt[b] += 1; tot += 1
    return out

# ---------- 3. macchina a stati ----------
def machine(c, p200, p50, p20, nn, L):
    P = TH; dd = dd252(c); dp = depth(dd)
    def sma(t, w):
        if t < w - 1: return None
        s = c[t - w + 1:t + 1]
        return None if any(v is None for v in s) else sum(s) / w
    def avgr(t, w=20):
        xs = [abs(c[i] - c[i - 1]) for i in range(max(1, t - w + 1), t + 1)]
        return sum(xs) / len(xs) if xs else 0
    def minover(a, t, w):
        xs = [v for v in a[max(0, t - w + 1):t + 1] if v is not None]
        return min(xs) if xs else math.inf
    st, armed, S, trig, below = 'normal', True, None, None, 0
    trigs, setups = [], []  # trigs: [t, fallito]; setups: [t, fails]
    for t in range(len(c)):
        b = p200[t]
        if b is None or dp[t] is None or not nn[t]: continue
        stock = 100 / nn[t]; h = max(P['minRecoveryPoints'], P['minRecoveryStocks'] * stock)
        reset = max(P['resetFloor'], L + P['resetAbove'])
        below = below + 1 if b <= L else 0
        if not armed and b >= reset: armed = True
        if trig is not None and (st in ('trig', 'cool') or not armed):
            if c[t] < S['pmin'] - avgr(t) and (t - trig <= P['failWindow'] or b <= L):
                trigs[-1][1] = True; S['fails'] += 1; S['strict'] = True; trig = None; st = 'setup'
                if c[t] < S['pmin']: S['pmin'] = c[t]; S['tp'] = t
                if b < S['bmin']: S['bmin'] = b; S['tb'] = t
                continue
        if st in ('trig', 'cool'):
            since = t - trig
            if since >= P['cooldown']: st = 'normal'
            elif since > P['failWindow']: st = 'cool'
        if st == 'setup':
            if b < S['bmin']: S['bmin'] = b; S['tb'] = t
            if c[t] < S['pmin']: S['pmin'] = c[t]; S['tp'] = t
            t20 = p20[t] is not None and p20[t] >= 70 and minover(p20, t, 15) <= 15
            t50 = (not t20) and p50[t] is not None and p50[t] >= 50 and minover(p50, t, 20) <= 10
            m20, m20p = sma(t, 20), sma(t - 5, 20)
            ma = m20 is not None and m20p is not None and c[t] > m20 and m20 > m20p
            div = S['tp'] > S['tb'] + 5 and p200[S['tp']] is not None and p200[S['tp']] >= S['bmin'] + stock
            v = b >= reset
            nconf = (1 if (t20 or t50) else 0) + (1 if ma else 0) + (1 if div else 0) + (1 if v else 0)
            need = 2 if (S['strict'] or t - S['t'] > P['slowSetupSessions']) else 1
            if b >= max(L + h, S['bmin'] + P['minRecoveryStocks'] * stock) and (nconf >= need or v):
                st = 'trig'; armed = False; trig = t; trigs.append([t, False])
        if st in ('normal', 'watch'):
            if armed and below >= P['setupCloses'] and dp[t] >= P['ddSetup']:
                st = 'setup'; S = {'t': t, 'bmin': b, 'tb': t, 'pmin': c[t], 'tp': t, 'strict': False, 'fails': 0}; setups.append(S)
            else:
                st = 'watch' if (b <= L + P['watchBand'] or dp[t] >= P['ddWatch']) else 'normal'
    return trigs, [(s['t'], s['fails'] > 0) for s in setups]

# ---------- 4. cambi, F, D ----------
def fx(name):
    rows = J(f'ricerca/emergenti/cache/{name}.json')['rows']
    if name.startswith('DEX'):
        rows = [r for r in rows if r[0] >= '2000-01-01' and r[1] > 0]
    tight = name in ('CNY_X', 'HKD_X'); thr, back = (0.01, 0.003) if tight else (0.03, 0.01)
    bad = set()
    for i in range(1, len(rows) - 1):
        if name.startswith('DEX'): break
        a = math.log(rows[i][1] / rows[i - 1][1]); b = math.log(rows[i + 1][1] / rows[i][1])
        if abs(a) > thr and abs(b) > thr and (a > 0) != (b > 0) and (abs(a + b) < back or (min(abs(a), abs(b)) > 5 * thr and abs(a + b) < 0.25 * min(abs(a), abs(b)))): bad.add(i)  # 1.4.0: anche i salti enormi che rientrano per 3/4
    rows = [r for i, r in enumerate(rows) if i not in bad]
    d = [r[0] for r in rows]; v = [r[1] for r in rows]
    gap = [0] * len(d)
    for i in range(1, len(d)):
        gap[i] = gap[i - 1] + (1 if (dt.date.fromisoformat(d[i]) - dt.date.fromisoformat(d[i - 1])).days > 10 else 0)
    return d, v, gap
def F_of(d, v, gap, w=63, z=1.0, look=126, N=756):
    n = len(v); ok = lambda i, k: i - k >= 0 and gap[i] == gap[i - k]
    lr = [math.log(v[i] / v[i - w]) if ok(i, w) else None for i in range(n)]
    sd = [None] * n
    for i in range(n):
        xs = [x for x in lr[max(0, i - N + 1):i + 1] if x is not None]
        span = (dt.date.fromisoformat(d[i]) - dt.date.fromisoformat(d[max(0, i - N + 1)])).days
        if len(xs) >= 0.9 * N and span <= 1278:
            m = sum(xs) / len(xs); sd[i] = math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    zz = [lr[i] / sd[i] if sd[i] and lr[i] is not None else None for i in range(n)]
    out = {}
    for i in range(n):
        if sd[i] is None or i - look + 1 < 0 or not ok(i, w - 1): continue
        zs = [x for x in zz[i - look + 1:i + 1] if x is not None]
        if len(zs) < 0.9 * look: continue
        hit = any(x >= z for x in zs)
        out[d[i]] = 1 if hit and math.log(max(v[i - w + 1:i + 1]) / v[i]) >= 0.5 * sd[i] else 0
    return out
def D_pub():
    d, v, gap = fx('DTWEXEMEGS')
    vals = []
    for i in range(len(v)):
        if i < 199: vals.append(None); continue
        vals.append(1 if v[i] < sum(v[i - 199:i + 1]) / 200 and v[i] < v[i - 63] else 0)
    avail = []
    for s in d:
        x = dt.date.fromisoformat(s); k = (7 - x.weekday()) % 7 or 7  # lunedì successivo
        avail.append((x + dt.timedelta(days=k + 1)).isoformat())
    def at(dates):
        out, j = [], -1
        for s in dates:
            while j + 1 < len(avail) and avail[j + 1] <= s: j += 1
            ok = j >= 0 and (dt.date.fromisoformat(s) - dt.date.fromisoformat(d[j])).days <= 21
            out.append(vals[j] if ok else None)
        return out
    return at

def fwd(a, t, h):
    if t + 1 + h >= len(a) or a[t + 1] is None or a[t + 1 + h] is None: return None
    return (a[t + 1 + h] / a[t + 1] - 1) * 100
def med(xs):
    xs = sorted(x for x in xs if x is not None); n = len(xs)
    if not n: return None
    return xs[n // 2] if n % 2 else (xs[n // 2 - 1] + xs[n // 2]) / 2

# ---------- esecuzione e confronto ----------
errors = []
Dat = D_pub()
mine_trig, mine_setup, h3 = [], [], {0: [], 1: [], 2: [], 'base': []}
for k in IDX:
    dates, close, p200, p50, p20, nn = series(SER[k])
    trigs, setups = machine(close, p200, p50, p20, nn, CFG[k]['blue'])
    D = Dat(dates)
    if k in CCY:
        Fm = F_of(*fx(CCY[k])); F = [Fm.get(s) for s in dates]
    else: F = None
    score = [None if D[t] is None or (F is not None and F[t] is None) else D[t] + (F[t] if F else 0) for t in range(len(dates))]
    if k in USDS:
        fd, fv, _ = fx(USDS[k]); fm = dict(zip(fd, fv)); usd = [close[t] / fm[s] if s in fm else None for t, s in enumerate(dates)]
    else: usd = close
    for t, failed in trigs:
        mine_trig.append({'k': k, 'date': dates[t], 'failed': failed, 'score': score[t], 'F': F[t] if F else None, 'D': D[t],
                          'r126': fwd(close, t, 126), 'r126usd': fwd(usd, t, 126)})
    for t, failed in setups:
        mine_setup.append({'k': k, 'date': dates[t], 'failed': failed, 'score': score[t], 'r126': fwd(close, t, 126)})
    if k in CCY:
        for t, s in enumerate(dates):
            if s >= '2016-01-01' and score[t] is not None:
                r = fwd(close, t, 126); h3['base'].append(r); h3[score[t]].append(r)

def cmp(name, mine, theirs, keys):
    if len(mine) != len(theirs):
        errors.append(f'{name}: {len(mine)} contro {len(theirs)}')
    ta = {(x['k'], x['date']): x for x in theirs}
    for x in mine:
        y = ta.get((x['k'], x['date']))
        if y is None: errors.append(f"{name}: {x['k']} {x['date']} manca in risultati.json"); continue
        for key in keys:
            a, b = x[key], y[key]
            if isinstance(a, float) or isinstance(b, float):
                if (a is None) != (b is None) or (a is not None and abs(round(a, 1) - b) > 0.051): errors.append(f"{name} {x['k']} {x['date']} {key}: {a} contro {b}")
            elif a != b: errors.append(f"{name} {x['k']} {x['date']} {key}: {a} contro {b}")
    mk = {(x['k'], x['date']) for x in mine}
    for y in theirs:
        if (y['k'], y['date']) not in mk: errors.append(f"{name}: {y['k']} {y['date']} c'è solo in risultati.json")
cmp('trigger', mine_trig, RES['segnali'], ['failed', 'score', 'F', 'D', 'r126', 'r126usd'])
cmp('zona blu', mine_setup, RES['zonaBlu'], ['failed', 'score', 'r126'])
H3 = RES['H3']['dal2016']['cinqueIndici']
for key in ['base', 0, 1, 2]:
    a = med(h3[key]); b = H3[str(key)]['r126']
    if a is None or abs(round(a, 1) - b) > 0.051: errors.append(f'H3 dal 2016 punteggio {key}: {a} contro {b}')
print(f'trigger: {len(mine_trig)} (falliti {sum(x["failed"] for x in mine_trig)}), ingressi in zona blu: {len(mine_setup)}')
for k in IDX: print(f'  {k}: trigger {sum(1 for x in mine_trig if x["k"] == k)}, zona blu {sum(1 for x in mine_setup if x["k"] == k)}')
print('H3 dal 2016 (cinque indici), mediana a 126 sedute:', {k: round(med(v), 1) for k, v in h3.items()})
# controllo della fonte: cambi Yahoo (dopo la pulizia) contro FRED H.10 (mezzogiorno di New York) nelle stesse date
for y, f in [('CNY_X', 'DEXCHUS'), ('INR_X', 'DEXINUS'), ('BRL_X', 'DEXBZUS'), ('KRW_X', 'DEXKOUS'), ('TWD_X', 'DEXTAUS')]:
    yd, yv, _ = fx(y); fm = {r[0]: r[1] for r in J(f'ricerca/emergenti/cache/{f}.json')['rows']}
    diffs = sorted(abs(math.log(v / fm[d])) * 100 for d, v in zip(yd, yv) if d in fm)
    print(f'  {y} contro {f}: {len(diffs)} date in comune, scarto mediano {diffs[len(diffs) // 2]:.2f}%, 99° percentile {diffs[int(0.99 * len(diffs))]:.2f}%, oltre il 3%: {sum(1 for x in diffs if x > 3)}')
if errors:
    print('DIFFERENZE:'); [print('  ' + e) for e in errors[:50]]; sys.exit(1)
print('OK: tutto coincide con risultati.json')
