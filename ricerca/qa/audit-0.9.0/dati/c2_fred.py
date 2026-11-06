import sys, csv
sys.path.insert(0, '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/scripts')
from ixload import app_index
F = '/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/fred/'
for k, fid in [('SPX', 'SP500'), ('DJI', 'DJIA')]:
    A = app_index(k); ad = dict(zip(A['dates'], A['close']))
    fr = {r['observation_date']: float(r[fid]) for r in csv.DictReader(open(F + fid + '.csv')) if r[fid] not in ('', '.')}
    com = [d for d in fr if d in ad]
    diffs = sorted(((abs(ad[d] / fr[d] - 1) * 100, d, ad[d], fr[d]) for d in com), reverse=True)
    onlyF = [d for d in fr if d not in ad and d >= A['dates'][0]]
    onlyA = [d for d in ad if d not in fr and d >= min(fr)]
    print(k, 'common', len(com), 'max diff %', diffs[0], '>0.01%:', sum(1 for x in diffs if x[0] > 0.01), 'only FRED', onlyF[:5], 'only app', onlyA[:8], len(onlyA))
    print('  last app', A['dates'][-1], ad[A['dates'][-1]], 'FRED', fr.get(A['dates'][-1]))
