# runs of equal consecutive closes in the app price files where Yahoo's bar has volume 0 (placeholder bars)
import sys, json, datetime
from collections import defaultdict
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import fetch
for f in ['prices_global', 'prices', 'prices_macro']:
    P = json.load(open('/home/user/rrg/data/%s.json' % f)); D = P['dates']; runs = defaultdict(list)
    for s, t in P['tickers'].items():
        if s in ('CPI', 'DXY_INV'): continue
        j = fetch(s, '5y')['chart']['result'][0]; q = j['indicators']['quote'][0]; off = j['meta']['gmtoffset']
        vol = {datetime.datetime.utcfromtimestamp(tt + off).strftime('%Y-%m-%d'): q['volume'][i] for i, tt in enumerate(j['timestamp'])}
        c = t['close']; i = 1
        while i < len(c):
            if c[i] is not None and c[i] == c[i - 1]:
                k = i
                while k + 1 < len(c) and c[k + 1] == c[i]: k += 1
                if all(vol.get(D[x]) == 0 or D[x] not in vol for x in range(i, k + 1)): runs[(D[i], D[k])].append(s)
                i = k + 1
            else: i += 1
    print(f)
    for (a, b), ss in sorted(runs.items()):
        if len(ss) > 2 or (datetime.date.fromisoformat(b) - datetime.date.fromisoformat(a)).days >= 2: print('  ', a, '->', b, len(ss), ss)
