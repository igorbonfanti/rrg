# Independent Yahoo fetcher with on-disk cache. usage: python3 yf.py RANGE SYM...
import json, os, sys, time, urllib.request, urllib.parse
OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/yahoo'
UA = 'Mozilla/5.0 (sector-monitor backfill)'
def path(sym, rng): return os.path.join(OUT, urllib.parse.quote(sym, safe='') + '__' + rng + '.json')
def fetch(sym, rng='5y', force=False):
    p = path(sym, rng)
    if os.path.exists(p) and not force:
        return json.load(open(p))
    q = (f'period1=1072915200&period2={int(time.time())}' if rng == 'p2004' else (f'period1=631152000&period2={int(time.time())}' if rng == 'p1990' else f'range={rng}'))
    url = f'https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?{q}&interval=1d&includeAdjustedClose=true&events=div,split'
    for a in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            j = json.load(urllib.request.urlopen(req, timeout=30))
            json.dump(j, open(p, 'w'))
            time.sleep(0.4)
            return j
        except Exception as e:
            print('retry', sym, e, file=sys.stderr); time.sleep(2 * (a + 1))
    raise RuntimeError(sym)
def series(sym, rng='5y'):
    """dates (exchange-local), close, adjclose, high; drops null closes. Returns dict."""
    import datetime
    j = fetch(sym, rng)['chart']['result'][0]
    m = j['meta']; off = m.get('gmtoffset', 0)
    q = j['indicators']['quote'][0]; adj = j['indicators'].get('adjclose', [{}])[0].get('adjclose') or q['close']
    out = {'dates': [], 'close': [], 'adj': [], 'high': [], 'meta': m, 'events': j.get('events', {})}
    for i, t in enumerate(j['timestamp']):
        c = q['close'][i]
        if c is None: continue
        d = datetime.datetime.utcfromtimestamp(t + off).strftime('%Y-%m-%d')
        if out['dates'] and out['dates'][-1] == d:
            out['close'][-1] = c; out['adj'][-1] = adj[i]; out['high'][-1] = q['high'][i]; continue
        out['dates'].append(d); out['close'].append(c); out['adj'].append(adj[i]); out['high'].append(q['high'][i])
    return out
if __name__ == '__main__':
    rng = sys.argv[1]
    for s in sys.argv[2:]:
        try:
            x = series(s, rng); print(s, len(x['dates']), x['dates'][-1], x['close'][-1], x['meta'].get('currency'))
        except Exception as e: print('FAIL', s, e)
