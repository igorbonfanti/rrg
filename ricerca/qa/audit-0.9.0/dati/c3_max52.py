import sys, json
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from yf import series
bad = []
for f in ['prices', 'prices_global', 'prices_macro']:
    P = json.load(open(f'/home/user/rrg/data/{f}.json')); D = P['dates']; win = D[-252:]
    for s, t in P['tickers'].items():
        m = t.get('max52')
        if not m: continue
        y = series(s); yc = dict(zip(y['dates'], y['close'])); yh = dict(zip(y['dates'], y['high']))
        if m.get('all'):
            ds = [d for d in y['dates'] if win[0] <= d <= win[-1]]
        else:
            ds = [d for d in win if d in yc]
        if s == 'DBMFE.PA': pass
        hi, hid = max((yc[d], d) for d in ds)
        c = yc[ds[-1]]
        ih, iid = max((max(yc[d], yh[d] or 0), d) for d in ds)
        divs = sorted(y['events'].get('dividends', {}).values(), key=lambda x: x['date'])
        import datetime
        exd = [datetime.datetime.utcfromtimestamp(x['date'] + y['meta'].get('gmtoffset', 0)).strftime('%Y-%m-%d') for x in divs]
        dv = sum(1 for d in exd if win[0] < d <= win[-1])
        ok = abs(hi - m['hi']) / hi < 2e-4 and hid == m['d'] and abs(c - m['c']) / c < 2e-4
        line = f"{f:13} {s:9} hi {m['hi']}/{hi:.4f} {m['d']}/{hid} c {m['c']}/{c:.4f} pdd {100*(m['c']/m['hi']-1):6.2f}/{100*(c/hi-1):6.2f} ih {m.get('ih')}/{ih:.2f} {m.get('id')}/{iid} dv {m.get('dv')}/{dv}"
        if not ok or abs((m.get('ih') or 0) - ih) / ih > 2e-4 or m.get('dv') != dv: bad.append(line)
print('\n'.join(bad) if bad else 'all max52 OK'); print(len(bad), 'flagged')
