import sys, json, bisect, datetime as dt
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from ixload import app_index, px, R
h = json.load(open(R + 'config/index_history.json'))['NDX']
iv = {}
for t, ivs in h['intervals'].items():
    key = '!' + t if t in h['drop'] else h['alias'].get(t, t)
    iv.setdefault(key, []).extend(ivs)
late_ok = set(h.get('lateStartOk', []))
A = app_index('NDX'); cal = A['dates']
for T in ['2008-11-20', '2020-03-23', '2022-10-12', '2025-04-08', '2026-10-16']:
    d = cal[bisect.bisect_right(cal, T) - 1]
    mem = [s for s, ivs in iv.items() if any(a <= d and (b is None or d < b) for a, b in ivs)]
    n = a20 = a50 = a200 = 0; skipped = []
    for s in mem:
        if s.startswith('!'): continue
        p = px(s)
        if not p or not p[0]: continue
        dates, close = p
        # app drops tickers whose data start >10 days after membership start (recycled tickers), unless lateStartOk
        first = dates[0]
        if s not in late_ok and any(dt.date.fromisoformat(first) > dt.date.fromisoformat(max(a, '1990-01-01')) + dt.timedelta(days=10) and (b is None or b > first) for a, b in iv[s]):
            skipped.append(s); continue
        # app uses only last 2 years before the breadth start for SMA warmup (irrelevant for N<=200 after 2008)
        i = bisect.bisect_right(dates, d) - 1
        if i < 0 or (dt.date.fromisoformat(d) - dt.date.fromisoformat(dates[i])).days > 5: continue
        n += 1
        for N, k in ((20, 0), (50, 1), (200, 2)):
            if i + 1 >= N and close[i] > sum(close[i - N + 1:i + 1]) / N:
                if k == 0: a20 += 1
                elif k == 1: a50 += 1
                else: a200 += 1
    ap = A['br'][d]
    print(d, 'app', ap, '| own n', n, 'members', len(mem), 'a20/50/200', a20, a50, a200, 'skipped', len(skipped))
