#!/usr/bin/env python3
"""Controllo numeri 1.4.0 · confronto tra i valori letti nel browser (dom.json) e il ricalcolo indipendente (calc.json).
Ogni controllo: valore atteso formattato come l'app (virgola decimale, «−», «—») contro il testo del DOM.
Uso: python3 -I ricerca/qa/1.4.0/numeri/confronto.py"""
import json, os, re
from decimal import Decimal, ROUND_HALF_UP
HERE = os.path.dirname(os.path.abspath(__file__))
dom = json.load(open(os.path.join(HERE, 'dom.json'))); calc = json.load(open(os.path.join(HERE, 'calc.json')))
FXL = {'calo': 'In calo forte', 'ferma': 'Ha smesso di scendere', 'normale': 'Normale', None: '—'}
ok, ko, warn = [], [], []

def fmt(v, d=1):
    if v is None: return '—'
    # toFixed di JavaScript: valore binario esatto, arrotondamento a metà verso l'alto
    s = str(Decimal(abs(v)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))
    z = float(s) == 0
    return ('−' if v < 0 and not z else '') + s.replace('.', ',')
def sgnP(v, d=1):
    if v is None: return '—'
    s = fmt(abs(v), d); z = float(s.replace(',', '.')) == 0
    return ('' if z else '+' if v > 0 else '−') + s + '%'
def near_tie(v, d):
    x = abs(v) * 10 ** d; return abs(x - int(x) - 0.5) < 1e-6
def check(name, got, exp, v=None, d=None):
    if got == exp:
        if v is not None and d is not None and near_tie(v, d): warn.append((name, got, exp, 'torna ma il valore è a metà tra due arrotondamenti'))
        else: ok.append(name)
    else: ko.append((name, got, exp))

# KPI del dollaro
dl = calc['dollar']; k0 = dom['kpis'][0]
check('KPI dollaro valore', k0['v'], fmt(dl['val'], 1), dl['val'], 1)
exp_s = f"{'sopra la media 200' if dl['val'] > dl['sma'] else 'sotto la media 200'} · {sgnP(dl['ch'])} in 3 mesi · {'favorevole' if dl['D'] else 'non favorevole'} · FRED al {dl['date'][8:10]}/{dl['date'][5:7]}/{dl['date'][:4]}"
check('KPI dollaro riga', k0['s'], exp_s)
# KPI delle valute (stato dell'ultima riga del cambio; HSI ed EEM esclusi)
fxk = [k for k in calc['fx'] if k != 'HSI']
for i, st in ((3, 'calo'), (4, 'ferma')):
    who = [k for k in fxk if calc['fx'][k]['state'] == st]
    check(f'KPI valute {st} numero', dom['kpis'][i]['v'], f"{len(who)} / {len(fxk)} con dati")
    check(f'KPI valute {st} nomi', dom['kpis'][i]['s'], ' · '.join(who) or 'nessuno')
# tabellone
for r in dom['table']:
    k = r['k']; I = calc['idx'][k]; RS = calc['rs'][k]
    check(f'{k} breadth', r['breadth'], fmt(I['breadth']) + '%', I['breadth'], 1)
    check(f'{k} 3 mesi locale', r['m3'], sgnP(I['ch63']), I['ch63'], 1)
    check(f'{k} 3 mesi in $', r['m3u'], sgnP(I['ch63u']), I['ch63u'], 1)
    check(f'{k} quadrante', r['rs'], RS['quad'] or '—')
    check(f'{k} data RS', r['rsTitle'].split(' al ')[-1], '/'.join(reversed(RS['last'].split('-'))))
    if k in calc['fx'] and k != 'HSI':
        F = calc['fx'][k]
        check(f'{k} stato valuta', r['fx'], FXL[F['state']])
        m = re.search(r'deviazioni standard: (\S+) .*cambio (\S+) al (\S+)', r['fxTitle'])
        check(f'{k} z', m.group(1), fmt(F['z'], 2), F['z'], 2)
        check(f'{k} cambio', m.group(2), fmt(F['val'], 4 if F['val'] < 10 else 2), F['val'], 4 if F['val'] < 10 else 2)
        check(f'{k} data cambio', m.group(3), '/'.join(reversed(F['date'].split('-'))))
    else:
        check(f'{k} stato valuta', r['fx'], 'Agganciato' if k == 'HSI' else 'In dollari')
# punti della forza relativa
for t in dom['rsDots']:
    m = re.match(r'(\w+) · \w+ contro ACWI al (\S+): RS-Ratio (\S+), RS-Momentum (\S+) \((\w+)\)', t)
    k = m.group(1); RS = calc['rs'][k]
    check(f'{k} RS-Ratio', m.group(3), fmt(RS['ratio'], 1), RS['ratio'], 1)
    check(f'{k} RS-Momentum', m.group(4), fmt(RS['mom'], 1), RS['mom'], 1)
    check(f'{k} quadrante punto', m.group(5), RS['quad'])
    if fmt(RS['ratio'], 1) == '100,0' or fmt(RS['mom'], 1) == '100,0':
        warn.append((f'{k} RS', t, f"ratio {RS['ratio']:.4f} mom {RS['mom']:.4f}", 'mostrato 100,0 ma il quadrante dipende dal valore non arrotondato'))
# riquadro del grafico
for k, D in dom['detail'].items():
    I = calc['idx'][k]
    check(f'{k} dati al', D['dmeta'].split('dati al ')[-1], '/'.join(reversed(I['last'].split('-'))))
    for key, rows in D['tips'].items():
        if not rows: continue
        rng, day = key.split(':'); e = I['probe'][day]
        tip = {}
        for row in rows[1:]:
            for lab in ('Prezzo', 'In dollari (base 100)', 'Sopra media 200', 'per dollaro', 'Valuta', 'Dollaro vs emergenti'):
                if lab in row and lab not in tip: tip[lab] = row.split(lab, 1)[1].strip(); break
        name = f'{k} {key}'
        c = e['close']; check(name + ' prezzo', tip.get('Prezzo'), fmt(c, 0 if c >= 1000 else 2), c, 0 if c >= 1000 else 2)
        check(name + ' breadth', tip.get('Sopra media 200'), '—' if e['p200'] is None else fmt(e['p200']) + '%')
        if 'In dollari (base 100)' in tip:
            base = I['base_' + rng]['base']
            u = None if e['usd'] is None or base is None else e['usd'] / base * 100
            check(name + ' in dollari base 100', tip['In dollari (base 100)'], fmt(u, 1), u, 1)
        if 'fx' in e and 'per dollaro' in tip:
            check(name + ' cambio', tip['per dollaro'], '—' if e['fx'] is None else fmt(e['fx'], 4 if e['fx'] < 10 else 2))
            check(name + ' stato valuta', tip.get('Valuta'), FXL[e['fxstate']])
        check(name + ' dollaro FRED', tip.get('Dollaro vs emergenti'), fmt(e['dl'], 2))
json.dump({'ok': len(ok), 'ko': ko, 'warn': warn, 'ok_list': ok}, open(os.path.join(HERE, 'confronto.json'), 'w'), indent=1, ensure_ascii=False)
print('passano', len(ok), '· diversi', len(ko), '· coincidenze da guardare', len(warn))
for x in ko: print('DIVERSO', x)
for x in warn: print('ATTENZIONE', x)
