import json, sys, bisect
sys.path.insert(0, '.')
from tschk import *
R = json.load(open('out/ix.json'))
def capcheck(scen, k, x, tag):
    S = ref.index(k); win = x['win']; n = len(win); d1 = win[-1]; atEnd = d1 == S['dates'][-1]
    C = ref.cap(k); cpos = {d: i for i, d in enumerate(C['dates'])}; pos = {d: i for i, d in enumerate(S['dates'])}
    bad = []
    for d, rows in x['capTips']:
        t = tipmap(rows) if rows else {}; j = cpos.get(d)
        s = C['sum'][j] if j is not None else None; a = C['alert'][j] if j is not None else None
        cl = S['close'][pos[d]]
        if not rows or iso(rows[0][0]) != d or not close_enough(num(t.get('Prezzo')), cl, pxdec(cl)) or not close_enough(num(t.get('Cali forti')), s, 0) or not close_enough(num(t.get('Soglia di allerta')), a, 0): bad.append((d, rows, cl, s, a))
    rec(scen, f'{tag}cali forti: riquadro = calcolo dal file ({len(x["capTips"])} sedute, calendario dell\'indice)', not bad and x['capEdges'] == x['edges'], f'{bad[:2]} bordi {x["capEdges"]}')
    j1 = cpos.get(d1); al = C['alert'][j1] if j1 is not None else None
    st = [t['t'] for t in x['cap']['texts'] if 'capalert-t' in t['cls']]
    rec(scen, f'{tag}«soglia X al data» alla fine del tratto', st == [f'soglia {fmt(al, 0)}' + ('' if atEnd else f' al {dIT(d1)}')], f'{st} (calcolo {al})')
    zc = [t['t'] for t in x['cap']['texts'] if t['cls'] == 'lasttxt zend']
    c1 = S['close'][pos[d1]]
    expc = [fmt(c1, 0 if c1 >= 1000 else pxdec(c1)), fmt(C['sum'][j1], 0) if j1 is not None and C['sum'][j1] is not None else None]
    rec(scen, f'{tag}cali forti: riquadri a destra alla fine del tratto', atEnd or zc == [e for e in expc if e is not None], f'{zc} vs {expc}')
for scen, r in R.items():
    m = r['main']; k0 = m['k']; S0 = ref.index(k0); D0 = S0['dates']
    d0, d1 = m['win'][0], m['win'][-1]
    rec(scen, f'{k0}: etichetta e bordi', m['chip'] == f'Zoom: dal {dIT(d0)} al {dIT(d1)}' and m['edges'] == [dIT(d0), dIT(d1)] and m['capChip'] == m['chip'], f"{m['chip']} {m['edges']}")
    if r['before'].get('tips'):
        tb = dict((d, t) for d, t in r['before']['tips']); tz = dict((d, t) for d, t in m['tips'])
        diff = [(d, tb[d], tz.get(d)) for d in tb if tb[d] != tz.get(d)]
        rec(scen, f'{k0}: riquadro identico con e senza zoom ({len(tb)} sedute)', not diff, str(diff[:2]))
    for x in [m] + r['after']:
        k = x['k']
        if x.get('missing'): rec(scen, f'{k}: chip presente', False, 'indice non tra i pulsanti'); continue
        S = ref.index(k); D = S['dates']
        first = max(next(i for i, v in enumerate(S['p200']) if v is not None), next(i for i, v in enumerate(S['dd']) if v is not None) + 252)
        back = {'3A': 756, '10A': 2520, 'MAX': len(D)}[r['range']]; iBase = max(first, len(D) - 1 - back)
        a = max(iBase, bisect.bisect_left(D, d0)); b = min(len(D) - 1, bisect.bisect_right(D, d1) - 1)
        e0, e1, zoomed = (D[a], D[b], True) if b - a + 1 >= 10 else (D[iBase], D[-1], False)
        tag = f'{k}: '
        rec(scen, f'{tag}tratto sul calendario dell\'indice ({e0} – {e1}, {b - a + 1} sedute)', x['edges'] == [dIT(e0), dIT(e1)] and x['win'] == D[a:b + 1] and x['chip'] == (f'Zoom: dal {dIT(e0)} al {dIT(e1)}' if zoomed else None), f"bordi {x['edges']} etichetta {x['chip']}")
        g = check_ts(scen, k, x['win'], x['dump'], x['tips'], label=tag, S=S)
        i1 = D.index(e1); atEnd = e1 == D[-1]
        zt = [t['t'] for t in x['dump']['texts'] if t['cls'] == 'lasttxt zend']
        exp = [fmt(S['close'][i1], pxdec(S['close'][i1])), fmt(S['dd'][i1]) + '%', fmt(S['p200'][i1]) + '%']
        zd = [t['t'] for t in x['dump']['texts'] if 'zendt' in t['cls']]
        rec(scen, f'{tag}riquadri a destra = fine del tratto', (atEnd and not zt) or (zt == exp and zd == [f'valori al {dIT(e1)}']), f'{zt} vs {exp} {zd}')
        mn = min(v for v in g['dd'] if v is not None); pg = [t['t'] for t in x['dump']['texts'] if 'peggiore' in t['t']]
        rec(scen, f'{tag}«peggiore nel tratto»', pg == [f'peggiore nel tratto {fmt(mn)}%'], f'{pg} ({mn:.3f})')
        tk = sorted([(t['x'], t['t']) for t in x['dump']['texts'] if t['cls'] == 'axt' and t['anchor'] == 'middle'])
        n = len(x['win']); badt = [(lab, x['win'][round((xx - g['L']) / g['PW'] * (n - 1))]) for xx, lab in tk if not tick_ok(lab, x['win'][round((xx - g['L']) / g['PW'] * (n - 1))])]
        rec(scen, f'{tag}asse del tempo ({len(tk)} etichette) uguale alla seduta sotto', len(tk) >= 2 and not badt, f'{[l for _, l in tk]} · sbagliate {badt}')
        capcheck(scen, k, x, tag)
