import sys, json
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from spark import get
R = '/home/user/rrg/data/'
M = json.load(open(R + 'sp500_members.json'))['members']
BL = {m['s']: m for m in json.load(open(R + 'breadth_latest.json'))['members']}
syms = [m['s'].replace('.', '-') for m in M]
px = get(syms)
D = '2026-10-16'
acc = {}; diffs = []; missing = []
for m in M:
    s = m['s'].replace('.', '-'); d, c = px.get(s, ([], []))
    has = bool(d) and d[-1] == D
    if not has: missing.append((s, d[-1] if d else None))
    i = len(c) - 1
    f = [has and len(c) >= N and c[i] > sum(c[i - N + 1:i + 1]) / N for N in (20, 50, 200)]
    for k in ('SPX', m['sector']):
        a = acc.setdefault(k, [0, 0, 0, 0, 0]); a[0] += 1; a[1] += has; a[2] += f[0]; a[3] += f[1]; a[4] += f[2]
    b = BL.get(m['s'])
    if b and has:
        sma200 = sum(c[-200:]) / 200; sma50 = sum(c[-50:]) / 50; sma20 = sum(c[-20:]) / 20
        hi = max(c[-252:])
        own = dict(close=c[-1], d20=(c[-1] / sma20 - 1) * 100, d50=(c[-1] / sma50 - 1) * 100, d200=(c[-1] / sma200 - 1) * 100, dd=(c[-1] / hi - 1) * 100)
        e = {k: abs((b[k] or 0) - own[k]) for k in own if b.get(k) is not None}
        diffs.append((m['s'], b, own, e, b['up200'] != f[2]))
B = json.load(open(R + 'breadth.json'))
def last_rle(r): return r[-1][1]
print('missing bar on', D, missing)
for k in ['SPX', 'XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU']:
    s = B['series'][k]; n = last_rle(s['n']); o = acc[k]
    print(f"{k:5} app a20/a50/a200 {s['a20'][-1]:3}/{s['a50'][-1]:3}/{s['a200'][-1]:3} n={n} mem={last_rle(s['members'])} | own {o[2]:3}/{o[3]:3}/{o[4]:3} n={o[1]} mem={o[0]}")
for key in ('close', 'd20', 'd50', 'd200', 'dd'):
    big = sorted([(x[3].get(key, 0), x[0], x[1].get(key), round(x[2][key], 3)) for x in diffs], reverse=True)[:5]
    print(key, 'max abs diff', big)
print('up200 flag mismatches', [x[0] for x in diffs if x[4]])
print('breadth_latest members', len(BL), 'vs members list', len(M), set(BL) ^ {m['s'] for m in M})
