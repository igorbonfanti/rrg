import json, urllib.parse, datetime as dt, bisect
R = '/home/user/rrg/'
IXC = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/ixcache/'
def app_index(k):
    for f in ('indices.json', 'indices_more.json'):
        s = json.load(open(R + 'data/' + f))['series']
        if k in s: x = s[k]; break
    d = dt.date.fromisoformat(x['d0']); dates = [x['d0']]
    for ch in x['gaps']:
        d += dt.timedelta(days=int(ch, 36)); dates.append(d.isoformat())
    def dd(a, sc=1):
        out, p = [], None
        for r in a:
            if r is None: out.append(None); p = None; continue
            p = r if p is None else p + r; out.append(p / sc)
        return out
    close = dd(x['cd'], 100) if 'cd' in x else x['close']
    a20, a50, a200 = (dd(x['d20']), dd(x['d50']), dd(x['d200'])) if 'd20' in x else (x['a20'], x['a50'], x['a200'])
    m = len(a200)
    def rl(r):
        out = [None] * m
        for j, (i0, v) in enumerate(r):
            i1 = r[j + 1][0] if j + 1 < len(r) else m
            for i in range(i0, min(i1, m)): out[i] = v
        return out
    n, mem = rl(x['n']), rl(x['members'])
    out = {}
    for i in range(m):
        out[dates[x['b0'] + i]] = dict(n=n[i], members=mem[i], a20=a20[i], a50=a50[i], a200=a200[i])
    return dict(dates=dates, close=close, br=out, symbol=x['symbol'])
def px(sym):
    try: j = json.load(open(IXC + urllib.parse.quote(sym, safe='') + '.json'))
    except FileNotFoundError: return None
    return j['dates'], j['close']
