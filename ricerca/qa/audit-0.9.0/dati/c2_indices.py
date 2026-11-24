import sys, json, bisect, datetime as dt
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from ixload import app_index, px, R
TARGETS = ['2008-11-20', '2020-03-23', '2022-10-12', '2025-04-08', '2026-10-16']
def own_flags(dates, close, d, stale=5):
    """for date d: last own bar <= d within stale days; above SMA(N) over own sessions with >=N sessions"""
    i = bisect.bisect_right(dates, d) - 1
    if i < 0: return None
    if (dt.date.fromisoformat(d) - dt.date.fromisoformat(dates[i])).days > stale: return None
    res = []
    for N in (20, 50, 200):
        if i + 1 < N: res.append(False); continue
        s = sum(close[i - N + 1:i + 1]) / N
        res.append(close[i] > s)
    return res
def members_at(k, d):
    if k == 'DJI':
        h = json.load(open(R + 'config/index_history.json'))['DJI']
        cur = set(h['initial'])
        for cd, add, rem in h['changes']:
            if cd > d: break
            cur -= set(rem); cur |= set(add)
        return sorted(cur)
    return json.load(open(R + f'data/index_members/{k}.json'))['tickers']
rows = []
for k in ['DJI', 'DAX', 'CAC', 'N225', 'FTSEMIB', 'UKX', 'SMI']:
    A = app_index(k)
    cal = A['dates']
    for t in TARGETS:
        d = cal[bisect.bisect_right(cal, t) - 1]
        ap = A['br'].get(d)
        mem = members_at(k, d)
        n = a20 = a50 = a200 = 0
        for s in mem:
            if s.startswith('!'): continue
            p = px(s)
            if not p or not p[0]: continue
            f = own_flags(p[0], p[1], d)
            if f is None: continue
            n += 1; a20 += f[0]; a50 += f[1]; a200 += f[2]
        # index close vs ixcache
        ip = px(A['symbol']); ic = dict(zip(*ip)).get(d)
        rows.append(dict(idx=k, date=d, app=ap, own=dict(members=len(mem), n=n, a20=a20, a50=a50, a200=a200),
                         close_app=A['close'][cal.index(d)], close_raw=ic))
for r in rows:
    a, o = r['app'] or {}, r['own']
    p = lambda x, n: f"{100*x/n:5.1f}" if n and x is not None else '  —'
    print(f"{r['idx']:8}{r['date']} app n={a.get('n')}/{a.get('members')} 200:{p(a.get('a200'),a.get('n'))} 50:{p(a.get('a50'),a.get('n'))} 20:{p(a.get('a20'),a.get('n'))} | own n={o['n']}/{o['members']} 200:{p(o['a200'],o['n'])} 50:{p(o['a50'],o['n'])} 20:{p(o['a20'],o['n'])} | close {r['close_app']} vs {r['close_raw'] and round(r['close_raw'],2)}")
json.dump(rows, open('/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/c2_indices.json', 'w'), indent=1)
