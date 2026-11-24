#!/usr/bin/env python3
"""Confronta i numeri letti nel browser (dom.json, da dom.mjs) con il ricalcolo indipendente (ricalcolo.json).
Uso: python3 -I confronta.py ricalcolo.json dom.json"""
import json, re, sys, math
from decimal import Decimal, ROUND_HALF_UP

R = json.load(open(sys.argv[1])); D = json.load(open(sys.argv[2]))
ok, ko = [], []


def fx(v, d=1):
    if v is None:
        return '—'
    # come Number.prototype.toFixed: valore binario esatto, metà arrotondata per eccesso
    q = Decimal(abs(v)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    s = f'{q:.{d}f}'.replace('.', ',')
    return ('−' if v < 0 and q != 0 else '') + s


def sg(v, d=1):
    if v is None:
        return '—'
    z = Decimal(abs(v)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP) == 0
    return ('' if z else '+' if v > 0 else '−') + fx(abs(v), d)


def sp(v, d=1):
    return '—' if v is None else sg(v, d) + '%'


def check(where, got, exp):
    (ok if got == exp else ko).append((where, got, exp))


def dIT(s):
    return f'{s[8:10]}/{s[5:7]}/{s[:4]}'


IXN = {'SPX': 'S&P 500', 'NDX': 'Nasdaq-100'}
for tag in ['desk-light', 'phone-dark']:
    V = D[tag]
    # riquadri
    T = R['oggi']
    k = {x['k']: x for x in V['kpis']}
    check(f'{tag} riquadro VIX', k['VIX']['v'], fx(T['vix'], 2))
    check(f'{tag} riquadro VIX data', k['VIX']['s'], f'paura · al {dIT(T["date"])}')
    check(f'{tag} percentile VIX', k['Percentile del VIX']['v'], fx(T['pct'], 0) + '°')
    check(f'{tag} realizzata', k['Volatilità realizzata']['v'], fx(T['rv'], 1))
    check(f'{tag} premio', k['Premio per la paura']['v'], sg(T['prem'], 1))
    check(f'{tag} percentile premio', k['Premio per la paura']['s'], f'VIX − realizzata · {fx(T["premPct"], 0)}° percentile')
    check(f'{tag} meta date', V['meta'], f'VIX al {dIT(R["asOf"]["vix"])} · S&P 500 al {dIT(R["asOf"]["spx"])} · Nasdaq-100 al {dIT(R["asOf"]["ndx"])}')
    for ix in ['SPX', 'NDX']:
        t = V['tables'][ix]; M = R['tabella'][ix]
        b = M['base']
        exp = ['Una seduta qualsiasi', '—'] + [f'{fx(b[str(h)]["pos"], 0)}% {sp(b[str(h)]["median"])}' for h in [21, 63, 126, 252]] + [sp(b['dd']['median']), '—']
        check(f'{tag} {ix} riga base', t['rows'][0], exp)
        for i, X in enumerate([20, 25, 30, 40, 50]):
            th = M['thr'][str(X)]; s = th['stats']
            cells = [f'{X} robusto' if X == 40 else str(X), str(th['n_ep'])]
            for h in [21, 63, 126, 252]:
                d = s[str(h)]
                cells.append(f'{d["posN"]}/{d["n"]} {sp(d["median"])}' if d['n'] else '—')
            cells += [sp(s['dd']['median']), fx(s['toMin'], 0)]
            check(f'{tag} {ix} riga {X}', t['rows'][i + 1], cells)
            # episodi (dal più recente)
            rows = []
            for e in reversed(th['episodes']):
                r = [dIT(e['date']), None, fx(e['vix'], 1), fx(e['vixMax'], 1)]
                r += ['in corso' if e['ret'][str(h)] is None else sp(e['ret'][str(h)]) for h in [21, 63, 126, 252]]
                r.append(sp(e['dd']) + ('*' if e['partial'] else ''))
                rows.append(r)
            got = [[c for j, c in enumerate(r) if j != 1] for r in t['eps'][str(X)]['rows']]
            check(f'{tag} {ix} episodi {X}', got, [[c for j, c in enumerate(r) if j != 1] for r in rows])
        S = R['scatter'][ix]
        note = (f"Giorni contro episodi. {S['giorni']} sedute, positive dopo 12 mesi {S['giorni_pos']} ({fx(100 * S['giorni_pos'] / S['giorni'], 0)}%); "
                f"ma vengono da {S['episodi_nei_punti']} episodi, positivi {S['ep_pos']} su {S['ep_tot']}, e le due crisi più lunghe da sole fanno {fx(S['top2_pct'], 0)}% dei punti. "
                f"Sopra 50: {S['sopra50']} sedute da {S['sopra50_ep']} {'episodio' if S['sopra50_ep'] == 1 else 'episodi'}. Contare i giorni dà più peso alle crisi lunghe: la tabella conta gli episodi. "
                f"{S['aperti']} sedute recenti non hanno ancora 12 mesi di dati e non sono disegnate.")
        check(f'{tag} {ix} didascalia scatter', t['scNote'], note)
        for tip in t['scTips']:
            if not tip:
                continue
            ln = tip.split('\n'); dd = ln[0]; iso = f'{dd[6:10]}-{dd[3:5]}-{dd[0:2]}'
            vix = ln[ln.index('VIX') + 1]; ret = ln[ln.index(f'{IXN[ix]} dopo 12 mesi') + 1]
            check(f'{tag} {ix} scatter {dd} rendimento', ret, sp(S['punti_campione'][iso]))
    # grafico
    for rg, tips in V['chartTips'].items():
        for tip in tips:
            if not tip:
                ko.append((f'{tag} grafico {rg}', 'riquadro vuoto', '')); continue
            ln = tip.split('\n'); dd = ln[0]; iso = f'{dd[6:10]}-{dd[3:5]}-{dd[0:2]}'
            G = R['grafico'][iso]
            def after(lbl):
                return ln[ln.index(lbl) + 1]
            check(f'{tag} grafico {rg} {dd} S&P', ln[1], f'S&P 500 {fx(G["close"], 0)}')
            check(f'{tag} grafico {rg} {dd} VIX', after('VIX'), fx(G['vix'], 2))
            check(f'{tag} grafico {rg} {dd} realizzata', after('Realizzata 21 sedute'), fx(G['rv'], 1))
            check(f'{tag} grafico {rg} {dd} premio', after('Premio per la paura'), sg(G['prem'], 1) if G['prem'] is not None else '—')
            check(f'{tag} grafico {rg} {dd} pct premio', after('Percentile del premio'), (fx(G['premPct'], 0) + '°') if G['premPct'] is not None else '—')

print(f'passano {len(ok)} controlli, non passano {len(ko)}')
for w, g, e in ko:
    print('KO', w, '\n   app :', g, '\n   mio :', e)
