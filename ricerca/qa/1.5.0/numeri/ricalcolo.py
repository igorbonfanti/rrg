#!/usr/bin/env python3
"""
Controllo indipendente dei numeri della vista «8 VIX» (versione 1.5.0, commit a801454).

Non importa nulla dell'app (né js/vix.js né gli script di ricerca/vix/): rifà tutto dalle definizioni scritte
in testa a js/vix.js e nella ricerca, partendo dai dati grezzi scaricati a parte:
  RAW/vixcls.csv     FRED VIXCLS        https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS&cosd=1990-01-01
  RAW/cboe.csv       Cboe VIX_History   https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv
  RAW/y_%5EGSPC.json Yahoo chart v8 ^GSPC dal 1990 (idem ^NDX, ^VIX)
Uso: python3 -I ricalcolo.py RAW_DIR /home/user/rrg/data/vix.json OUT.json [ULTIMA_DATA_CHIUSA]
Scrive OUT.json con: confronto dei dati, riquadri, tabella per SPX e NDX, episodi, scatter, serie del grafico per
date scelte, statistiche dei testi (83%, 3,4 punti, 12 su 204) e il criterio «robusto».
"""
import csv, json, math, sys, statistics
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

RAW, VJ, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CUT = sys.argv[4] if len(sys.argv) > 4 else '2026-11-05'   # ultima seduta chiusa (la barra di oggi è aperta)
HS = [21, 63, 126, 252]
XS = [20, 25, 30, 40, 50]


# ------------------------------------------------------------------ dati grezzi
def fred():
    out = {}
    with open(f'{RAW}/vixcls.csv') as f:
        for r in csv.DictReader(f):
            v = r['VIXCLS']
            if v not in ('', '.'):
                out[r['observation_date']] = float(v)
    return out


def cboe():
    out = {}
    with open(f'{RAW}/cboe.csv') as f:
        for r in csv.DictReader(f):
            m, d, y = r['DATE'].split('/')
            out[f'{y}-{m}-{d}'] = float(r['CLOSE'])
    return out


def yahoo(sym):
    d = json.load(open(f'{RAW}/y_{sym}.json'))['chart']['result'][0]
    tz = ZoneInfo(d['meta']['exchangeTimezoneName'])
    out = {}
    for t, c in zip(d['timestamp'], d['indicators']['quote'][0]['close']):
        day = datetime.fromtimestamp(t, timezone.utc).astimezone(tz).strftime('%Y-%m-%d')
        if c is not None and c > 0 and '1990-01-01' <= day <= CUT:
            out[day] = c
    return out


# ------------------------------------------------------------------ data/vix.json, decodificato a mano
def decode(x):
    from datetime import date, timedelta
    d = date.fromisoformat(x['d0']); dates = [d.isoformat()]
    for ch in x['gaps']:
        d = d + timedelta(days=int(ch, 36)); dates.append(d.isoformat())
    ps = x.get('ps', 1); vals = []; p = None
    for r in x['cd']:
        if r is None:
            p = None; vals.append(None); continue
        p = r if p is None else p + r
        vals.append(p / ps)
    assert len(dates) == len(vals), (len(dates), len(vals))
    return dates, vals


# ------------------------------------------------------------------ statistiche
def q7(a, q):
    v = sorted(x for x in a if x is not None)
    if not v:
        return None
    h = (len(v) - 1) * q; lo = math.floor(h)
    return v[lo] + (h - lo) * (v[lo + 1] - v[lo]) if lo + 1 < len(v) else v[lo]


def dist(a):
    v = [x for x in a if x is not None]
    if not v:
        return {'n': 0, 'median': None, 'posN': 0, 'pos': None}
    k = sum(1 for x in v if x > 0)
    return {'n': len(v), 'median': q7(v, .5), 'posN': k, 'pos': 100 * k / len(v)}


def drawdown(close, e):
    """minimo entro 252 sedute dall'ingresso e (incluso), rispetto a close[e]; sedute al minimo"""
    end = min(len(close) - 1, e + 252)
    seg = close[e:end + 1]
    mn = min(seg); at = seg.index(mn)
    return min(0.0, (mn / close[e] - 1) * 100), at, e + 252 >= len(close)


def episodes(dates, close, vix, X, Q=63, entry=1):
    idx = [i for i, v in enumerate(vix) if v is not None]
    vv = [vix[i] for i in idx]
    st = [j for j in range(Q, len(vv)) if vv[j] >= X and all(x < X for x in vv[j - Q:j])]
    eps = []
    for k, j in enumerate(st):
        stop = st[k + 1] if k + 1 < len(st) else len(vv)
        above = [m for m in range(j, stop) if vv[m] >= X]
        p = idx[j]; e = p + entry
        ret = {h: ((close[e + h] / close[e] - 1) * 100 if e + h < len(close) else None) for h in HS}
        dd, tomin, partial = drawdown(close, e) if e < len(close) else (None, None, True)
        eps.append({'date': dates[p], 'p': p, 'vix': vv[j], 'vixMax': max(vv[m] for m in above), 'end': dates[idx[above[-1]]],
                    'ret': ret, 'dd': dd, 'toMin': tomin, 'partial': partial})
    return eps


def table(dates, close, vix, entry=1):
    first = next(i for i, v in enumerate(vix) if v is not None)
    n = len(close)
    base = {}
    for h in HS:
        base[h] = dist([(close[p + entry + h] / close[p + entry] - 1) * 100 for p in range(first, n) if p + entry + h < n])
    dds = [drawdown(close, p + entry)[0] for p in range(first, n) if p + entry + 252 < n]
    base['dd'] = {'n': len(dds), 'median': q7(dds, .5)}
    thr = {}
    for X in XS:
        eps = episodes(dates, close, vix, X, entry=entry)
        full = [e for e in eps if not e['partial']]
        s = {h: dist([e['ret'][h] for e in eps]) for h in HS}
        s['dd'] = {'n': len(full), 'median': q7([e['dd'] for e in full], .5), 'worst': min((e['dd'] for e in full), default=None)}
        s['toMin'] = q7([e['toMin'] for e in full], .5)
        thr[X] = {'episodes': eps, 'stats': s}
    return {'from': dates[first], 'to': dates[-1], 'base': base, 'thr': thr}


def realized(close, w=21):
    out = [None] * len(close)
    for t in range(w, len(close)):
        r = [math.log(close[k] / close[k - 1]) for k in range(t - w + 1, t + 1)]
        out[t] = statistics.stdev(r) * math.sqrt(252) * 100
    return out


def realized_fut(close, w=21):
    out = [None] * len(close)
    for t in range(len(close) - w):
        r = [math.log(close[k] / close[k - 1]) for k in range(t + 1, t + w + 1)]
        out[t] = statistics.stdev(r) * math.sqrt(252) * 100
    return out


def rank_pct_expanding(a):
    """quota (%) dei valori fino a t (inclusi) <= a[t]; ricalcolo diretto con bisect su una lista ordinata"""
    import bisect
    s, out = [], [None] * len(a)
    for i, x in enumerate(a):
        if x is None:
            continue
        bisect.insort(s, x)
        out[i] = 100 * bisect.bisect_right(s, x) / len(s)
    return out


def interp_pct_expanding(a, q):
    """percentile q con interpolazione lineare sulla storia fino a t inclusa (come nella ricerca volatilita)"""
    import bisect
    s, out = [], [None] * len(a)
    for i, x in enumerate(a):
        if x is None:
            continue
        bisect.insort(s, x)
        if len(s) < 2:
            continue
        pos = (len(s) - 1) * q; lo = math.floor(pos); hi = min(lo + 1, len(s) - 1)
        out[i] = s[lo] + (s[hi] - s[lo]) * (pos - lo)
    return out


# ------------------------------------------------------------------ main
F, C = fred(), cboe()
Y = {k: yahoo(s) for k, s in [('SPX', '%5EGSPC'), ('NDX', '%5ENDX'), ('VIX', '%5EVIX')]}
J = json.load(open(VJ))
JS = {k: decode(J['series'][k]) for k in ['VIX', 'SPX', 'NDX']}
res = {'asOf': J['asOf'], 'generated': J['generated'], 'controlli': {}}
ck = res['controlli']

# 1. confronto dei dati
spx_dates = sorted(Y['SPX'])
ndx_dates = sorted(Y['NDX'])
for k, ref in [('SPX', Y['SPX']), ('NDX', Y['NDX'])]:
    d, v = JS[k]
    miss = sorted(set(ref) - set(d)); extra = sorted(set(d) - set(ref))
    diffs = [(x, y, ref[x]) for x, y in zip(d, v) if x in ref and abs(y - round(ref[x], 2)) > 0.0051]
    ck[f'{k}_vs_yahoo'] = {'sedute_json': len(d), 'sedute_yahoo': len(ref), 'mancano_nel_json': miss[:20], 'n_mancano': len(miss),
                           'in_piu_nel_json': extra[:20], 'n_in_piu': len(extra), 'diff_oltre_0_005': len(diffs), 'esempi': diffs[:10],
                           'null': sum(1 for y in v if y is None), 'ultima': d[-1]}
vd, vv = JS['VIX']
VJd = dict(zip(vd, vv))
fred_s = {x: y for x, y in F.items() if x in set(spx_dates)}
fred_closed = sorted(x for x in F if x not in set(spx_dates) and x >= '1990-01-02' and x <= CUT)
ck['VIX_vs_FRED'] = {
    'sedute_json': len(vd), 'fred_su_sedute_spx': len(fred_s), 'fred_in_giorni_senza_seduta_spx': fred_closed,
    'mancano_nel_json': sorted(set(fred_s) - set(vd)), 'in_piu_nel_json': sorted(set(vd) - set(fred_s)),
    'diff': [(x, VJd[x], fred_s[x]) for x in vd if x in fred_s and abs(VJd[x] - fred_s[x]) > 0.00051],
    'json_su_giorni_senza_seduta_spx': sorted(set(vd) - set(spx_dates)),
    'sedute_spx_senza_vix_fred': sorted(x for x in spx_dates if x not in F),
    'sedute_spx_senza_vix_json': sorted(x for x in spx_dates if x not in VJd),
    'ultima_fred': max(F), 'campo_fred_json': J['series']['VIX'].get('fred'), 'ultima_json': vd[-1],
}
ck['VIX_FRED_vs_Cboe'] = {'date_comuni': len(set(F) & set(C)), 'diff': [(x, F[x], C[x]) for x in sorted(set(F) & set(C)) if abs(F[x] - C[x]) > 0.0051],
                          'solo_fred': sorted(set(F) - set(C))[:30], 'solo_cboe': sorted(x for x in set(C) - set(F) if x >= '1990')[:30],
                          'ultima_cboe': max(C)}
ck['VIX_json_vs_Cboe'] = {'diff': [(x, VJd[x], C[x]) for x in vd if x in C and abs(VJd[x] - C[x]) > 0.0051], 'json_non_in_cboe': [x for x in vd if x not in C]}
ck['VIX_yahoo_vs_FRED'] = {'date_comuni': len(set(F) & set(Y['VIX'])),
                           'diff_oltre_0_01': [(x, round(F[x], 2), round(Y['VIX'][x], 2)) for x in sorted(set(F) & set(Y['VIX'])) if abs(F[x] - Y['VIX'][x]) > 0.01]}

# 2. serie allineate costruite da me: calendario delle sedute dell'indice, VIX di FRED (o Yahoo dopo l'ultimo FRED)
fl = max(F)
def vix_on(d):
    if d in F:
        return F[d]
    if d > fl and d in Y['VIX']:
        return Y['VIX'][d]
    return None

out_ix = {}
for k, dl in [('SPX', spx_dates), ('NDX', ndx_dates)]:
    close = [Y[k][d] for d in dl]
    vix = [vix_on(d) for d in dl]
    T = table(dl, close, vix)
    out_ix[k] = {'dates': dl, 'close': close, 'vix': vix, 'T': T}
    # variante sui dati del json (per separare differenze di dati da differenze di calcolo)
    jd, jc = JS[k]
    jvix = [VJd.get(d) for d in jd]
    out_ix[k]['Tjson'] = table(jd, jc, jvix)
    # variante con ingresso nello stesso giorno (ricerca, versione principale)
    out_ix[k]['T0'] = table(dl, close, vix, entry=0)

def ser_table(T):
    return {'from': T['from'], 'to': T['to'], 'base': T['base'],
            'thr': {X: {'n_ep': len(t['episodes']), 'stats': t['stats'],
                        'episodes': [{kk: e[kk] for kk in ['date', 'vix', 'vixMax', 'end', 'ret', 'dd', 'toMin', 'partial']} for e in t['episodes']]}
                    for X, t in T['thr'].items()}}

res['tabella'] = {k: ser_table(v['T']) for k, v in out_ix.items()}
res['tabella_json'] = {k: ser_table(v['Tjson']) for k, v in out_ix.items()}
res['tabella_ingresso_stesso_giorno'] = {k: ser_table(v['T0']) for k, v in out_ix.items()}

# 3. riquadri e grafico (S&P 500)
S = out_ix['SPX']
rv = realized(S['close'])
prem = [(v - r) if (v is not None and r is not None) else None for v, r in zip(S['vix'], rv)]
vp = rank_pct_expanding(S['vix']); pp = rank_pct_expanding(prem)
t = max(i for i, v in enumerate(S['vix']) if v is not None)
res['oggi'] = {'date': S['dates'][t], 'vix': S['vix'][t], 'provvisorio': S['dates'][t] > fl, 'pct': vp[t], 'rv': rv[t], 'prem': prem[t], 'premPct': pp[t],
               'n_storia_vix': sum(1 for v in S['vix'][:t + 1] if v is not None)}
# percentile del VIX sull'intera serie FRED (anche giorni di borsa chiusa) per sensibilità
allf = [F[d] for d in sorted(F) if d <= S['dates'][t]]
res['oggi']['pct_su_tutta_FRED'] = 100 * sum(1 for x in allf if x <= S['vix'][t]) / len(allf)
res['grafico'] = {d: {'close': S['close'][i], 'vix': S['vix'][i], 'rv': rv[i], 'prem': prem[i], 'premPct': pp[i]} for i, d in enumerate(S['dates'])}

# 4. scatter (VIX >= 30, 252 sedute, ingresso il giorno dopo)
sc = {}
for k in ['SPX', 'NDX']:
    O = out_ix[k]; dl, close, vix = O['dates'], O['close'], O['vix']; n = len(close)
    eps = O['T']['thr'][30]['episodes']
    pts = []
    for p, v in enumerate(vix):
        if v is None or v < 30 or p + 1 + 252 >= n:
            continue
        ep = None
        for e in eps:
            if e['p'] <= p:
                ep = e['date']
        pts.append({'date': dl[p], 'vix': v, 'ret': (close[p + 253] / close[p + 1] - 1) * 100, 'ep': ep})
    byep = {}
    for q in pts:
        byep[q['ep']] = byep.get(q['ep'], 0) + 1
    top2 = sum(sorted(byep.values(), reverse=True)[:2])
    e30 = [e for e in eps if e['ret'][252] is not None]
    hi = [q for q in pts if q['vix'] >= 50]
    sc[k] = {'giorni': len(pts), 'giorni_pos': sum(1 for q in pts if q['ret'] > 0), 'episodi_nei_punti': len(byep),
             'ep_pos': sum(1 for e in e30 if e['ret'][252] > 0), 'ep_tot': len(e30), 'top2_pct': 100 * top2 / len(pts),
             'sopra50': len(hi), 'sopra50_ep': len({q['ep'] for q in hi}),
             'aperti': sum(1 for p, v in enumerate(vix) if v is not None and v >= 30 and p + 253 >= n),
             'punti_campione': {q['date']: q['ret'] for q in pts}}
res['scatter'] = sc

# 5. statistiche dei testi
# 5a. 83% e 3,4 punti: VIX contro realizzata delle 21 sedute dopo, sedute dal 2005-01-01 con la RVf nota
rvf = realized_fut(S['close'])
sel = [i for i, d in enumerate(S['dates']) if d >= '2005-01-01' and S['vix'][i] is not None and rvf[i] is not None]
# la ricerca usa anche la data di fine 07/10/2026 (ultimo giorno con 21 sedute dopo, ai dati del 05/11) e le sole sedute
# con tutti i previsori: qui tutte le sedute con VIX e RVf
res['testi'] = {'quota_vix_sopra_rvf': 100 * sum(1 for i in sel if S['vix'][i] > rvf[i]) / len(sel),
                'media_vix_meno_rvf': statistics.mean(S['vix'][i] - rvf[i] for i in sel), 'n': len(sel),
                'dal': S['dates'][sel[0]], 'al': S['dates'][sel[-1]]}
# 5b. 12 su 204: eventi = RVp > suo 90° percentile (interpolato, storia fino a t) dopo almeno 63 sedute sotto;
# segnale = premio (VIX - RVp) > suo 80° percentile (interpolato, storia fino a t); inizi = segnale oggi e non ieri,
# dal 2005; valutabili se t+21 <= ultima seduta; seguiti se un evento cade in (t, t+21].
p90 = interp_pct_expanding(rv, .90)
above = [rv[i] is not None and p90[i] is not None and rv[i] > p90[i] for i in range(len(rv))]
valid = [rv[i] is not None and p90[i] is not None for i in range(len(rv))]
start = next(i for i, d in enumerate(S['dates']) if d >= '2005-01-01')
end = len(rv) - 1
for i in range(len(prem)):  # la ricerca si ferma all'ultima seduta con l'implicita di FRED
    pass
ev = [i for i in range(max(start, 63), end + 1) if above[i] and all(valid[i - 63:i]) and not any(above[i - 63:i])]
p80 = interp_pct_expanding(prem, .80)
sig = [prem[i] is not None and p80[i] is not None and prem[i] > p80[i] for i in range(len(prem))]
onsets = [i for i in range(start, end + 1) if sig[i] and not sig[i - 1]]
judged = [s for s in onsets if s + 21 <= end]
hit = [s for s in judged if any(s < e <= s + 21 for e in ev)]
# variante «come nell'app»: percentile di rango >= 80 (colore rosso del grafico)
sigA = [pp[i] is not None and pp[i] >= 80 for i in range(len(pp))]
onA = [i for i in range(start, end + 1) if sigA[i] and not sigA[i - 1]]
jA = [s for s in onA if s + 21 <= end]
hA = [s for s in jA if any(s < e <= s + 21 for e in ev)]
res['testi'].update({'eventi': [S['dates'][i] for i in ev], 'inizi': len(onsets), 'valutabili': len(judged), 'seguiti': len(hit),
                     'app_inizi': len(onA), 'app_valutabili': len(jA), 'app_seguiti': len(hA),
                     'sedute_segnale_pct': 100 * sum(sig[start:end + 1]) / (end - start + 1),
                     'sedute_rosse_app_pct': 100 * sum(sigA[start:end + 1]) / (end - start + 1)})
# stessa cosa fermandosi al 04/11/2026 (dati della ricerca)
end2 = S['dates'].index('2026-11-04')
ev2 = [i for i in ev if i <= end2]
on2 = [i for i in range(start, end2 + 1) if sig[i] and not sig[i - 1]]
j2 = [s for s in on2 if s + 21 <= end2]
h2 = [s for s in j2 if any(s < e <= s + 21 for e in ev2)]
res['testi'].update({'al_04_11_inizi': len(on2), 'al_04_11_valutabili': len(j2), 'al_04_11_seguiti': len(h2)})

# 6. criterio «robusto» (regimi.md): >= 8 episodi con 12 mesi completi; mediana a 12 mesi >= base + 5 punti oppure
# quota di positivi >= base + 15 punti; differenza nella stessa direzione in >= 2 dei sottoperiodi 1990-2007, 2008-2015,
# 2016-oggi che hanno episodi (differenza della mediana dalla base del periodo).
def criterio(O, T, entry):
    dl, close = O['dates'], O['close']; n = len(close)
    first = next(i for i, v in enumerate(O['vix']) if v is not None)
    out = {}
    per = [('1990', '2007'), ('2008', '2015'), ('2016', '2099')]
    for X in XS:
        eps = T['thr'][X]['episodes']
        full = [e for e in eps if e['ret'][252] is not None]
        med = q7([e['ret'][252] for e in full], .5); pos = 100 * sum(1 for e in full if e['ret'][252] > 0) / len(full) if full else None
        bmed = T['base'][252]['median']; bpos = T['base'][252]['pos']
        c1 = len(full) >= 8
        c2 = med is not None and (med - bmed >= 5 or pos - bpos >= 15)
        sub = []
        for a, b in per:
            ee = [e['ret'][252] for e in full if a <= e['date'][:4] <= b]
            if not ee:
                continue
            bb = [(close[p + entry + 252] / close[p + entry] - 1) * 100 for p in range(first, n) if p + entry + 252 < n and a <= dl[p][:4] <= b]
            sub.append({'periodo': f'{a}-{b}', 'ep': len(ee), 'diff_mediana': q7(ee, .5) - q7(bb, .5), 'pos': sum(1 for x in ee if x > 0)})
        main_sign = 1 if (med is not None and med - bmed >= 0) else -1
        c3 = sum(1 for s in sub if (s['diff_mediana'] > 0) == (main_sign > 0)) >= 2
        out[X] = {'ep_completi': len(full), 'mediana': med, 'base_mediana': bmed, 'delta_mediana': None if med is None else med - bmed,
                  'pos': pos, 'base_pos': bpos, 'delta_pos': None if pos is None else pos - bpos, 'c1': c1, 'c2': c2, 'c3': c3,
                  'passa': bool(c1 and c2 and c3), 'sottoperiodi': sub}
    return out

res['robusto'] = {k: {'ingresso_dopo': criterio(out_ix[k], out_ix[k]['T'], 1), 'ingresso_stesso_giorno': criterio(out_ix[k], out_ix[k]['T0'], 0)} for k in out_ix}
# quiete 21 e 126 sedute, ingresso il giorno dopo
for Q in (21, 126):
    for k in out_ix:
        O = out_ix[k]
        T = {'base': O['T']['base'], 'thr': {X: {'episodes': episodes(O['dates'], O['close'], O['vix'], X, Q=Q)} for X in XS}}
        res['robusto'][k][f'quiete_{Q}'] = criterio(O, T, 1)

json.dump(res, open(OUT, 'w'), default=lambda o: None, indent=1)
print('scritto', OUT)

# 7. Nasdaq-100 alla soglia 30 con la quiete a 21 sedute e ingresso nello stesso giorno (confronto con la ricerca)
O = out_ix['NDX']
T = {'base': O['T0']['base'], 'thr': {X: {'episodes': episodes(O['dates'], O['close'], O['vix'], X, Q=21, entry=0)} for X in XS}}
res['robusto']['NDX']['quiete_21_stesso_giorno'] = criterio(O, T, 0)
O = out_ix['SPX']
T = {'base': O['T0']['base'], 'thr': {X: {'episodes': episodes(O['dates'], O['close'], O['vix'], X, Q=21, entry=0)} for X in XS}}
res['robusto']['SPX']['quiete_21_stesso_giorno'] = criterio(O, T, 0)
json.dump(res, open(OUT, 'w'), default=lambda o: None, indent=1)
