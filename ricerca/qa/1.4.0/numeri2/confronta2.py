"""Confronto DOM (dom2.json) contro il ricalcolo indipendente (lib2.py).
Uso: python3 -I confronta2.py <sito> <dom2.json> [uscita.json]"""
import sys, os, json, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib2
from lib2 import fmt, sgnp, dit

DROP = None
if '--drop' in sys.argv:
    i = sys.argv.index('--drop'); DROP = sys.argv[i + 1]; del sys.argv[i:i + 2]
site, domf = sys.argv[1], sys.argv[2]
outf = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output/confronto2.json')
lib2.init(site)
if DROP:  # stessa simulazione di dom2.mjs --drop-last-tail: via l'ultima riga dei cambi (sulle date decodificate)
    import datetime as _dt
    for s_, x in lib2.EMG['series'].items():
        if not (s_.endswith('=X') if DROP == 'ALL' else s_ == DROP): continue
        k_ = int(x['gaps'][-1], 36); x['cd'] = x['cd'][:-1]; x['gaps'] = x['gaps'][:-1]
        x['last'] = (_dt.date.fromisoformat(x['last']) - _dt.timedelta(days=k_)).isoformat()
DOM = json.load(open(domf))
M = lib2.model()
CFG = lib2.CFG['indices']
LAB = {'calo': 'In calo forte', 'ferma': 'Ha smesso di scendere', 'normale': 'Normale'}
ok, bad, log = 0, [], []


def chk(where, got, exp):
    global ok
    if got == exp: ok += 1
    else: bad.append({'dove': where, 'dom': got, 'atteso': exp})


dl = M['dollar']; j = len(dl['val']) - 1
# ---------- KPI ----------
k0 = DOM['kpis'][0]
chk('KPI dollaro valore', k0['v'], fmt(dl['val'][j], 1))
exp_s = f"{'sopra la media 200' if dl['val'][j] > dl['sma'][j] else 'sotto la media 200'} · {sgnp(dl['ch'][j])} in 3 mesi · {'favorevole' if dl['D'][j] else 'non favorevole'} · FRED al {dit(dl['dates'][j])}"
chk('KPI dollaro testo', k0['s'], exp_s)
log.append(f"dollaro {dl['dates'][j]} {dl['val'][j]} sma200 {dl['sma'][j]:.4f} ch63 {dl['ch'][j]:.4f} D {dl['D'][j]}")

# ---------- righe ----------
rows = {}
for k in lib2.CFG['order']:
    c = CFG[k]; X = M['ix'][k]; d = X['dates']; cl = X['close']; last = len(cl) - 1
    t = last
    while t > 0 and X['pct200'][t] is None: t -= 1
    b = X['pct200'][t]
    ddv = lib2.drawdown52(cl)[last]
    ch = lib2.change(cl, 63)
    f = M['fx'].get(k)
    if c['fx'] is None: usd = cl
    else:
        fm = dict(zip(f['dates'], f['val']))
        usd = [cl[i] / fm[x] if cl[i] is not None and fm.get(x) else None for i, x in enumerate(d)]
    tl = len(cl) - 1
    while tl >= 0 and cl[tl] is None: tl -= 1
    tu = tl
    while tu >= 0 and usd[tu] is None: tu -= 1
    chu = lib2.change(usd, 63, tu)
    if c.get('peg'): st = 'Agganciato'
    elif not c['fx']: st = 'In dollari'
    else:
        jj = len(f['val']) - 1; s = lib2.fx_state(f['F'][jj], f['z'][jj]); st = LAB.get(s, '—')
    rows[k] = dict(b=b, dd=ddv, ch=ch, chu=chu, tu=tu, tl=tl, usd=usd, st=st, date=d[last], bdate=d[t])
    log.append(f"{k}: data {d[last]} (breadth {d[t]}) b {b} dd {ddv:.3f} 3m {ch:.4f} 3m$ {chu} al {d[tu]} {'(ritardo)' if tu < tl else ''} usd[t-63] {usd[tu-63]} fx {st}")

for r in DOM['table']:
    k = r['k']; e = rows[k]; c = CFG[k]
    chk(f'{k} breadth', r['breadth'], fmt(e['b']) + '%')
    chk(f'{k} drawdown', r['dd'], sgnp(e['dd']))
    chk(f'{k} 3 mesi locale', r['m3'], sgnp(e['ch']))
    chk(f'{k} 3 mesi in $', r['m3u'], sgnp(e['chu']) + ('*' if e['tu'] < e['tl'] else ''))
    chk(f'{k} stato valuta', r['fx'], e['st'])
    if c['fx'] and not c.get('peg'):
        f = M['fx'][k]; jj = len(f['val']) - 1
        zt = f"variazione del cambio in 13 settimane in deviazioni standard: {fmt(f['z'][jj], 2)} (a destra = valuta più debole; tacca = soglia 1) · cambio {fmt(f['val'][jj], 4 if f['val'][jj] < 10 else 2)} al {dit(f['dates'][jj])}"
        chk(f'{k} titolo z', r['zTitle'], zt)
        log.append(f"{k}: z {f['z'][jj]:.4f} F {f['F'][jj]} sd {f['sd'][jj]:.5f} cambio {f['val'][jj]} al {f['dates'][jj]} tolti {f['removed']}")
    rs = M['rs'][k]
    chk(f'{k} quadrante', r['rs'], rs['quad'] if rs and rs['quad'] else '—')
    chk(f'{k} titolo forza rel.', r['rsTitle'], f"{c['etf']} contro ACWI, settimanale, al {dit(rs['last'])}")

# KPI conteggi delle valute
withfx = [k for k in lib2.CFG['order'] if CFG[k]['fx'] and not CFG[k].get('peg')]
calo = [k for k in withfx if rows[k]['st'] == 'In calo forte']; ferma = [k for k in withfx if rows[k]['st'] == 'Ha smesso di scendere']
con = [k for k in withfx if rows[k]['st'] in LAB.values()]
chk('KPI calo forte', (DOM['kpis'][3]['v'], DOM['kpis'][3]['s']), (f'{len(calo)} / {len(con)} con dati', ' · '.join(calo) or 'nessuno'))
chk('KPI smesso', (DOM['kpis'][4]['v'], DOM['kpis'][4]['s']), (f'{len(ferma)} / {len(con)} con dati', ' · '.join(ferma) or 'nessuno'))

# punti della forza relativa
for g in DOM['rsDots']:
    k = g['k']; rs = M['rs'][k]; etf = CFG[k]['etf']
    dr = 2 if abs(rs['ratio'] - 100) < 0.05 else 1; dm = 2 if abs(rs['mom'] - 100) < 0.05 else 1
    chk(f'{k} punto RS', g['title'], f"{k} · {etf} contro ACWI al {dit(rs['last'])}: RS-Ratio {fmt(rs['ratio'], dr)}, RS-Momentum {fmt(rs['mom'], dm)} ({rs['quad']})")
    W = DOM['rsW']; cl = lambda v: max(96, min(104, v))
    chk(f'{k} punto RS posizione', (round(g['cx'], 1), round(g['cy'], 1)), (round((cl(rs['ratio']) - 96) / 8 * W, 1), round(W - (cl(rs['mom']) - 96) / 8 * W, 1)))
    log.append(f"{k} RS {rs['last']} ratio {rs['ratio']:.4f} mom {rs['mom']:.4f} {rs['quad']}")

# meta
dates = sorted(set(rows[k]['date'] for k in rows))
asof = lib2.EMG['asOf']
fxl = min(lib2.EMG['series'][CFG[k]['fx']]['last'] for k in CFG if CFG[k]['fx'])
etfl = min(lib2.EMG['series'][s]['last'] for s in set([CFG[k]['etf'] for k in CFG] + ['ACWI']))
chk('meta tabellone', DOM['meta'], (f"ultima seduta di ogni borsa, dal {dit(dates[0])} al {dit(dates[-1])}" if len(dates) > 1 else f"dati al {dit(dates[0])}") + f" · cambi al {dit(fxl)} · ETF al {dit(etfl)}")

# ---------- dettaglio e riquadro dei valori ----------
STL = {'setup': 'zona blu', 'watch': 'attenzione', 'normal': 'normale', 'trig': 'trigger', 'fail': 'fallito', 'cool': 'cooldown'}
ntips = 0
for k, det in DOM['detail'].items():
    if not det: continue
    c = CFG[k]; X = M['ix'][k]; d = X['dates']; cl = X['close']; n = len(d); e = rows[k]
    f = M['fx'].get(k); hasfx = bool(f and c['fx'] and not c.get('peg'))
    chk(f'{k} dmeta', det['dmeta'].split(' · ')[0], 'breadth ' + fmt(e['b']) + '%')
    chk(f'{k} dmeta data', det['dmeta'].split(' · ')[-1], 'dati al ' + dit(e['date']))
    fred = f['fred'] if f else None
    cm = f"cambio al {dit(f['dates'][-1]) if f else '—'}" + (f" (Fed fino al {dit(fred)}, poi Yahoo provvisorio)" if f and fred and fred < f['dates'][-1] else '') + f" · dollaro FRED al {dit(dl['dates'][-1])}"
    chk(f'{k} nota del grafico (inizio)', det['chartMeta'][:len(cm)], cm)
    if f and f['removed']:
        log.append(f"{k}: tolti nella coda {f['removed']}")
    fi = {x: i for i, x in enumerate(f['dates'])} if hasfx else {}
    di = {x: i for i, x in enumerate(dl['dates'])}
    at = {x: i for i, x in enumerate(d)}
    t1 = lib2.dnum(d[-1])
    for rg, tips in det['tips'].items():
        span = {'3A': 3, '10A': 10, 'MAX': None}[rg]
        t0 = max(lib2.dnum(d[0]), t1 - span * 365.25) if span else lib2.dnum(d[0])
        i0 = 0
        while i0 < n - 1 and not (t0 <= lib2.dnum(d[i0]) <= t1): i0 += 1
        usdraw = e['usd'] if c['fx'] else None
        jb = next((i for i in range(i0, n) if cl[i] is not None and (usdraw is None or usdraw[i] is not None)), -1)
        for dd_, rws in tips.items():
            ntips += 1
            iso = f'{dd_[6:10]}-{dd_[3:5]}-{dd_[0:2]}'; i = at[iso]
            R = {r[0]: r[1:] for r in rws[1:]}
            w = f'{k} {rg} {iso}'
            chk(w + ' prezzo', R['Prezzo'][0], fmt(cl[i], 0 if cl[i] >= 1000 else 3 if cl[i] < 10 else 2))
            if usdraw is not None:
                u = None if usdraw[i] is None or i < i0 else usdraw[i] / usdraw[jb] * 100
                chk(w + ' in dollari', R['In dollari (base 100)'][0], fmt(u, 1))
            p = X['pct200'][i]
            chk(w + ' breadth', R['Sopra media 200'][0], '—' if p is None else fmt(p) + '%')
            if hasfx:
                j2 = fi.get(iso)
                fxt = '—' if j2 is None else fmt(f['val'][j2], 4 if f['val'][j2] < 10 else 2) + (' Yahoo, provvisorio' if fred and iso > fred else '')
                chk(w + ' cambio', ' '.join(R[c['ccy'] + ' per dollaro'][0].split()), fxt)
                s = None if j2 is None else lib2.fx_state(f['F'][j2], f['z'][j2])
                chk(w + ' valuta', R['Valuta'][0], LAB[s] if s else '—')
            j3 = di.get(iso)
            chk(w + ' dollaro', R['Dollaro vs emergenti'][0], '—' if j3 is None else fmt(dl['val'][j3], 2))
            note = any(r and str(r[-1]).startswith('NOTE:') for r in rws)
            chk(w + ' nota FRED', note, j3 is None)

res = {'ok': ok, 'diversi': len(bad), 'tips': ntips, 'elenco': bad[:300], 'log': log}
json.dump(res, open(outf, 'w'), indent=1, ensure_ascii=False)
print('\n'.join(log))
print(f'controlli uguali {ok}, diversi {len(bad)}, riquadri letti {ntips}')
for b in bad[:60]: print('  DIVERSO', b)
