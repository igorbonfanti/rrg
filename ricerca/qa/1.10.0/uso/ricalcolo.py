# Ricalcolo indipendente (Python, non il modulo JS) delle statistiche di data/ath.json a partire da data/ath_history.json.
# Uso: python3 -I ricerca/qa/1.10.0/uso/ricalcolo.py  (dalla radice del repository)
import json, datetime as dt, sys
A = json.load(open('data/ath.json')); H = json.load(open('data/ath_history.json'))
def dates(d0, gaps):
    t = dt.date.fromisoformat(d0); out = [t.isoformat()]
    for ch in gaps: t += dt.timedelta(days=int(ch, 36)); out.append(t.isoformat())
    return out
def dec(cd, ps):
    p = None; out = []
    for r in cd:
        if r is None: p = None; out.append(None); continue
        p = r if p is None else p + r; out.append(p / ps)
    return out
def wstart(last):
    y, m, d = map(int, last.split('-'))
    try: return dt.date(y - 3, m, d).isoformat()
    except ValueError: return dt.date(y - 3, m, 28).isoformat()
bad = 0; n = 0
for m in A['markets']:
    s = m['stats']; h = H['series'][m['id']]
    D = dates(h['d0'], h['gaps']); C = dec(h['cd'], h['ps'])
    assert len(D) == len(C), m['id']
    il = max(i for i, c in enumerate(C) if c is not None)
    fr = wstart(D[il])
    ir = None
    for i in range(il + 1):
        if C[i] is None or D[i] < fr: continue
        if ir is None or C[i] > C[ir]: ir = i
    lo = None; below = None
    for i in range(ir + 1, il + 1):
        if C[i] is None: continue
        if C[i] <= 0 and below is None: below = D[i]
        if lo is None or C[i] < C[lo]: lo = i
    neg = [(D[i], C[i]) for i in range(len(C)) if C[i] is not None and C[i] <= 0]
    calc = dict(lastDate=D[il], last=C[il], **{'from': fr}, refDate=D[ir], ref=C[ir], distPct=round((C[il]/C[ir]-1)*100, 2),
                days=(dt.date.fromisoformat(D[il]) - dt.date.fromisoformat(D[ir])).days,
                cycleLowDate=D[lo] if lo is not None else None, cycleLow=C[lo] if lo is not None else None,
                cycleLowPct=round((C[lo]/C[ir]-1)*100, 2) if lo is not None else None,
                fromLowPct=round((C[il]/C[lo]-1)*100, 2) if lo is not None else None)
    diffs = []
    for k, v in calc.items():
        n += 1
        a = s.get(k)
        ok = (abs(a - v) <= max(1e-3, abs(v) * 2e-5)) if isinstance(v, float) and a is not None else a == v
        if not ok: diffs.append((k, a, v))
    bad += len(diffs)
    print(m['id'], 'serie dal', D[0], 'chiusure<=0:', neg[:3], 'diff:' if diffs else 'OK', diffs or '')
print(f'{n} confronti, {bad} differenze')
sys.exit(1 if bad else 0)
