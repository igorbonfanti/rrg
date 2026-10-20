# Audit 0.9.8 (dati): funzioni comuni. Scaricatore Yahoo indipendente con cache su disco, lettura dei file dell'app.
# La cache sta fuori dal repository: QA98 (default: cartella di lavoro della sessione), sottocartelle yahoo/ fred/.
import json, os, sys, time, datetime as dt, urllib.request, urllib.parse

R = os.environ.get('RRG', '/home/user/rrg') + '/'
W = os.environ.get('QA98', '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa98') + '/'
os.makedirs(W + 'yahoo', exist_ok=True); os.makedirs(W + 'fred', exist_ok=True)
UA = 'Mozilla/5.0 (sector-monitor qa)'
PAUSE = float(os.environ.get('YPAUSE', '0.35'))


def ypath(sym, rng):
    return W + 'yahoo/' + urllib.parse.quote(sym, safe='') + '__' + rng + '.json'


def yfetch(sym, rng='5y', force=False):
    """Risposta grezza dell'endpoint chart di Yahoo (cache). rng: 5y, 2y, 1y, max o pAAAA (period1 = 1/1 dell'anno)."""
    p = ypath(sym, rng)
    if os.path.exists(p) and not force:
        return json.load(open(p))
    if rng.startswith('p'):
        q = f'period1={int(dt.datetime(int(rng[1:]), 1, 1).timestamp())}&period2={int(time.time())}'
    else:
        q = f'range={rng}'
    last = None
    for a in range(5):
        host = ('query1', 'query2')[a % 2]
        url = f'https://{host}.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?{q}&interval=1d&includeAdjustedClose=true&events=div,split'
        try:
            j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
            json.dump(j, open(p, 'w'))
            time.sleep(PAUSE)
            return j
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 404:
                json.dump({'error': 404}, open(p, 'w'))
                return {'error': 404}
            time.sleep(2 * (a + 1))
        except Exception as e:
            last = e; time.sleep(2 * (a + 1))
    raise RuntimeError(f'{sym}: {last}')


def series(sym, rng='5y', keep_open=False, now=None):
    """Barre giornaliere nel fuso della borsa: dates, close (solo split), adj (anche dividendi), open/high/low/vol.
    Scarta le chiusure nulle e, se keep_open è falso, la barra della seduta non ancora finita."""
    j = yfetch(sym, rng)
    if 'chart' not in j or not j['chart']['result']:
        return None
    j = j['chart']['result'][0]
    m = j['meta']; off = m.get('gmtoffset', 0) or 0
    if 'timestamp' not in j:
        return None
    q = j['indicators']['quote'][0]
    adj = (j['indicators'].get('adjclose') or [{}])[0].get('adjclose') or q['close']
    reg = (m.get('currentTradingPeriod') or {}).get('regular')
    out = {'dates': [], 'close': [], 'adj': [], 'open': [], 'high': [], 'low': [], 'vol': [], 'meta': m, 'events': j.get('events', {})}
    for i, t in enumerate(j['timestamp']):
        c = q['close'][i]
        if c is None or adj[i] is None:
            continue
        d = dt.datetime.utcfromtimestamp(t + off).strftime('%Y-%m-%d')
        if out['dates'] and out['dates'][-1] == d:
            for k, v in (('close', c), ('adj', adj[i]), ('open', q['open'][i]), ('high', q['high'][i]), ('low', q['low'][i]), ('vol', q['volume'][i])):
                out[k][-1] = v
            continue
        out['dates'].append(d); out['close'].append(c); out['adj'].append(adj[i]); out['open'].append(q['open'][i])
        out['high'].append(q['high'][i]); out['low'].append(q['low'][i]); out['vol'].append(q['volume'][i])
    return out


def load(name):
    return json.load(open(R + 'data/' + name))


def decode_dates(d0, gaps):
    d = dt.date.fromisoformat(d0); out = [d0]
    for ch in gaps:
        d += dt.timedelta(days=int(ch, 36)); out.append(d.isoformat())
    return out


def delta_decode(a, sc=1):
    out, p = [], None
    for r in a:
        if r is None:
            out.append(None); p = None; continue
        p = r if p is None else p + r; out.append(p / sc)
    return out


def rle(r, m):
    out = [None] * m
    for j, (i0, v) in enumerate(r):
        i1 = r[j + 1][0] if j + 1 < len(r) else m
        for i in range(i0, min(i1, m)):
            out[i] = v
    return out


def app_index(k):
    """Serie di un indice dai file dell'app (decodifica scritta da zero, non js/indexdata.js)."""
    for f in ('indices.json', 'indices_more.json'):
        s = load(f)['series']
        if k in s:
            x = s[k]; break
    dates = decode_dates(x['d0'], x['gaps'])
    close = delta_decode(x['cd'], x.get('ps', 100))
    a20, a50, a200 = delta_decode(x['d20']), delta_decode(x['d50']), delta_decode(x['d200'])
    m = len(a200); n, mem = rle(x['n'], m), rle(x['members'], m)
    br = {}
    for i in range(m):
        if x['b0'] + i < len(dates):
            br[dates[x['b0'] + i]] = dict(n=n[i], members=mem[i], a20=a20[i], a50=a50[i], a200=a200[i])
    return dict(dates=dates, close=close, br=br, symbol=x['symbol'])


def app_breadth():
    """breadth.json: {serie: {data: {n, members, a20, a50, a200}}}"""
    B = load('breadth.json'); D = B['dates']; out = {}
    for k, s in B['series'].items():
        n, mem = rle(s['n'], len(D)), rle(s['members'], len(D))
        out[k] = {d: dict(n=n[i], members=mem[i], a20=s['a20'][i], a50=s['a50'][i], a200=s['a200'][i]) for i, d in enumerate(D)}
    return D, out


def decode_counts(s):
    out, i = [], 0
    while i < len(s):
        ch = s[i]
        if ch == '-':
            out.append(None)
        elif ch == 'z':
            out.append(int(s[i + 1:i + 4], 36)); i += 3
        else:
            out.append(int(ch, 36))
        i += 1
    return out


def app_cap(k):
    x = load('capitulation.json')['series'][k]
    dates = decode_dates(x['d0'], x['gaps']); L = len(dates)
    out = {'dates': dates, 'n': rle(x['n'], L)}
    for t in (5, 7, 10):
        c = decode_counts(x.get('x%d' % t, ''))
        out['x%d' % t] = [c[i] if i < len(c) else None for i in range(L)]
    return out


def pct(a, b):
    return None if a is None or b in (None, 0) else (a / b - 1) * 100


def dump(name, obj):
    json.dump(obj, open(W + name, 'w'), indent=1, default=str)
