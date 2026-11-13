"""Quanto è letterale «Sopra X dal»: per ogni episodio (dati di data/vix.json, regole come ricalcolo_episodi.py) quante sedute
tra l'inizio e l'ultima chiusura >= X hanno il VIX sotto X, dove cade il massimo e in quale crisi (CRISES copiate a mano da js/vix.js);
per i punti dello scatter, quanti dicono «VIX sopra 30 dal D» con il VIX sceso sotto 30 tra D e quel giorno.
Uso: python3 -I continuita.py <data/vix.json>"""
import json, sys, datetime
sys.path.insert(0, '.')
D = json.load(open(sys.argv[1]))['series']
def dec(x):
    t = datetime.date.fromisoformat(x['d0']); ds = [x['d0']]
    for ch in x['gaps']: t += datetime.timedelta(days=int(ch, 36)); ds.append(t.isoformat())
    p = None; vs = []
    for r in x['cd']:
        if r is None: p = None; vs.append(None); continue
        p = r if p is None else p + r; vs.append(p / x.get('ps', 1))
    return ds, vs
CR = [('1990 Golfo','1990-07-01','1991-03-31'),('1997 Asia','1997-10-01','1997-12-31'),('1998 Russia/LTCM','1998-08-01','1998-12-31'),('2000-03 bolla internet','2000-03-01','2003-04-30'),('2007-09 crisi finanziaria','2007-07-01','2009-06-30'),('2010 euro/flash crash','2010-05-01','2010-09-30'),('2011-12 debito USA/euro','2011-07-01','2012-06-30'),('2014 ottobre','2014-10-01','2014-12-31'),('2015-16 Cina/petrolio','2015-08-01','2016-03-31'),('2018 volatilità/Fed','2018-02-01','2018-12-31'),('2020 Covid','2020-02-01','2020-12-31'),('2022 inflazione/tassi','2022-01-01','2022-12-31'),('2024 carry yen','2024-07-15','2024-09-30'),('2025 dazi','2025-03-01','2025-05-31')]
cr = lambda d: next((n for n, a, b in CR if a <= d <= b), None)
vd, vv = dec(D['VIX']); VM = {d: v for d, v in zip(vd, vv) if v is not None}
sd, sc = dec(D['SPX']); vix = [VM.get(d) for d in sd]
pos = [i for i, v in enumerate(vix) if v is not None]; v = [vix[i] for i in pos]; n = len(sc)
for X in [20, 25, 30, 40, 50]:
    starts = [j for j in range(63, len(v)) if v[j] >= X and all(v[k] < X for k in range(j - 63, j))]
    print(f'--- soglia {X}: {len(starts)} episodi')
    for e, j in enumerate(starts):
        stop = starts[e + 1] if e + 1 < len(starts) else len(v)
        ab = [k for k in range(j, stop) if v[k] >= X]; last = ab[-1]; below = (last - j + 1) - len(ab)
        km = max(ab, key=lambda k: v[k]); d0, dm = sd[pos[j]], sd[pos[km]]
        flag = ' <-- massimo in altra crisi' if cr(dm) != cr(d0) else ''
        if below or flag: print(f'  {d0} ({cr(d0)}): fino al {sd[pos[last]]}, {len(ab)} sedute >= {X}, {below} sotto; max {v[km]:.2f} il {dm} ({cr(dm)}){flag}')
# punti dello scatter
starts = [j for j in range(63, len(v)) if v[j] >= 30 and all(v[k] < 30 for k in range(j - 63, j))]
tot = brk = 0
for jj, i in enumerate(pos):
    if v[jj] < 30 or i + 253 >= n: continue
    tot += 1; s = max(j for j in starts if j <= jj)
    if any(v[k] < 30 for k in range(s, jj)): brk += 1
print(f'scatter: {tot} punti, {brk} con il VIX sceso sotto 30 tra «VIX sopra 30 dal» e quel giorno')
