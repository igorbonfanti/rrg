import json, os, sys, time, urllib.request, urllib.parse, datetime
OUT = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/spark/'
os.makedirs(OUT, exist_ok=True)
UA = 'Mozilla/5.0 (sector-monitor backfill)'
def get(syms, rng='2y'):
    """returns {sym: (dates, closes)} with cache per symbol"""
    out, need = {}, []
    for s in syms:
        p = OUT + urllib.parse.quote(s, safe='') + '_' + rng + '.json'
        if os.path.exists(p): out[s] = tuple(json.load(open(p)))
        else: need.append(s)
    for k in range(0, len(need), 20):
        chunk = need[k:k + 20]
        url = 'https://query2.finance.yahoo.com/v7/finance/spark?symbols=' + urllib.parse.quote(','.join(chunk)) + f'&range={rng}&interval=1d'
        j = None
        for a in range(2):
            try:
                j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40)); break
            except Exception as e:
                print('retry', chunk[:3], e, file=sys.stderr); time.sleep(2 * (a + 1))
        if j is None:
            if len(chunk) > 1:
                for s1 in chunk: out.update(get([s1], rng))
            else:
                json.dump([[], []], open(OUT + urllib.parse.quote(chunk[0], safe='') + '_' + rng + '.json', 'w'))
            continue
        for r in j['spark']['result']:
            s = r['symbol']; resp = r['response'][0]
            off = resp['meta'].get('gmtoffset', 0)
            ts = resp.get('timestamp') or []; cl = resp['indicators']['quote'][0].get('close') or []
            d, c = [], []
            for t, x in zip(ts, cl):
                if x is None: continue
                dd = datetime.datetime.utcfromtimestamp(t + off).strftime('%Y-%m-%d')
                if d and d[-1] == dd: c[-1] = x; continue
                d.append(dd); c.append(x)
            out[s] = (d, c)
            json.dump([d, c], open(OUT + urllib.parse.quote(s, safe='') + '_' + rng + '.json', 'w'))
        time.sleep(1.0)
    return out
