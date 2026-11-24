import json, sys
sys.path.insert(0, '.')
from tschk import *
R = json.load(open('out/sec2.json'))
for scen, r in R.items():
    sym = r['sym']; win = r['win']; d0, d1 = win[0], win[-1]
    rec(scen, 'etichetta e bordi del grafico', r['chip'] == f'Zoom: dal {dIT(d0)} al {dIT(d1)}' and r['edges'] == [dIT(d0), dIT(d1)], f"{r['chip']} · bordi {r['edges']}")
    want = [d for d in D if d0 <= d <= d1]
    rec(scen, 'sedute del tratto = calendario del file', win == want, f'{len(win)} sedute')
    g = check_ts(scen, sym, win, r['dump'], r['tips'])
    S = ref.sector(sym); i1 = D.index(d1)
    # 6. riquadri a destra (zend) e data
    atEnd = d1 == D[-1]
    zt = [t['t'] for t in r['dump']['texts'] if t['cls'] == 'lasttxt zend']
    exp = [fmt(S['close'][i1], pxdec(S['close'][i1])), fmt(S['dd'][i1]) + '%', fmt(S['p200'][i1]) + '%']
    zd = [t['t'] for t in r['dump']['texts'] if 'zendt' in t['cls']]
    if atEnd: rec(scen, 'tratto fino all\'ultima seduta: riquadri pieni, niente data', not zt and not zd, f'{zt} {zd}')
    else: rec(scen, 'riquadri a destra = valori alla fine del tratto', zt == exp and zd == [f'valori al {dIT(d1)}'], f'{zt} vs {exp} · {zd}')
    pg = [t['t'] for t in r['dump']['texts'] if 'peggiore' in t['t']]
    mn = min(v for v in g['dd'] if v is not None)
    rec(scen, '«peggiore nel tratto»', pg == [f'peggiore nel tratto {fmt(mn)}%'], f'{pg} (calcolo {mn:.3f})')
    # 7. identità con il grafico senza zoom
    if r.get('tipsBefore'):
        tb = dict((d, t) for d, t in r['tipsBefore']); tz = dict((d, t) for d, t in r['tips'])
        diff = [(d, tb[d], tz.get(d)) for d in tb if d in tz and tb[d] != tz[d]]
        rec(scen, f'riquadro identico con e senza zoom ({len(set(tb) & set(tz))} sedute)', not diff, str(diff[:2]))
    # 8. trigger, fasce e pallini contro il grafico senza zoom
    wb = [d for d in D if iso(r['edgesBefore'][0]) <= d <= iso(r['edgesBefore'][1])]
    fb = frames(r['dumpBefore'])[0]
    inw = lambda s: {d for d in s if d0 <= d <= d1}
    tB, tZ = inw(marks(r['dumpBefore'], wb, fb['x'], fb['w'])), marks(r['dump'], win, g['L'], g['PW'])
    rec(scen, 'triangoli dei trigger = quelli senza zoom nel tratto, nessuno fuori', tB == tZ, f'zoom {sorted(tZ)} · senza {sorted(tB)}')
    for cls in ('band', 'band-off'):
        bB, bZ = inw(bands_dates(r['dumpBefore'], cls, wb, fb['x'], fb['w'])), bands_dates(r['dump'], cls, win, g['L'], g['PW'])
        rec(scen, f'fasce «{cls}» = quelle senza zoom nel tratto', bB == bZ, f'{len(bZ)} sedute (senza zoom {len(bB)}); diff {sorted(bB ^ bZ)[:6]}')
    cB, cZ = [d for d in circles(r['dumpBefore'], wb, fb['x'], fb['w']) if d0 <= d <= d1], circles(r['dump'], win, g['L'], g['PW'])
    rec(scen, 'pallini d\'ingresso dell\'avvicinamento = quelli senza zoom (nessuno sul bordo per un tratto iniziato prima)', cB == cZ, f'zoom {cZ} · senza {cB}')
    # 9. asse del tempo
    tk = sorted([(t['x'], t['t']) for t in r['dump']['texts'] if t['cls'] == 'axt' and t['anchor'] == 'middle'])
    n = len(win); badt = [(lab, win[round((x - g['L']) / g['PW'] * (n - 1))]) for x, lab in tk if not tick_ok(lab, win[round((x - g['L']) / g['PW'] * (n - 1))])]
    rec(scen, f'asse del tempo: {len(tk)} etichette in ordine e uguali alla seduta sotto', len(tk) >= 2 and not badt, f'{[l for _, l in tk]} · sbagliate {badt}')
    # 10. cali forti
    C = ref.cap(sym); cpos = {d: i for i, d in enumerate(C['dates'])}
    rec(scen, 'cali forti: stessa etichetta e stessi bordi', r['capChip'] == r['chip'] and r['capEdges'] == r['edges'], f"{r['capChip']} · {r['capEdges']}")
    bad = []
    for d, rows in r['capTips']:
        t = tipmap(rows) if rows else {}
        j = cpos.get(d); s = C['sum'][j] if j is not None else None; a = C['alert'][j] if j is not None else None
        if not rows or iso(rows[0][0]) != d or not close_enough(num(t.get('Prezzo')), S['close'][D.index(d)], pxdec(S['close'][D.index(d)])) or not close_enough(num(t.get('Cali forti')), s, 0) or not close_enough(num(t.get('Soglia di allerta')), a, 0):
            bad.append((d, rows, s, a))
    rec(scen, f'cali forti: riquadro = calcolo dal file ({len(r["capTips"])} sedute)', not bad, str(bad[:2]))
    if r.get('capTipsBefore'):
        tb = dict((d, t) for d, t in r['capTipsBefore']); tz = dict((d, t) for d, t in r['capTips'])
        diff = [(d, tb[d], tz.get(d)) for d in tb if d in tz and tb[d] != tz[d]]
        rec(scen, f'cali forti: riquadro identico con e senza zoom', not diff, str(diff[:2]))
    j1 = cpos.get(d1); al = C['alert'][j1] if j1 is not None else None
    st = [t['t'] for t in r['cap']['texts'] if 'capalert-t' in t['cls']]
    rec(scen, '«soglia X al data» = soglia all\'ultima seduta del tratto', st == [f'soglia {fmt(al, 0)}' + ('' if atEnd else f' al {dIT(d1)}')], f'{st} (calcolo {al})')
    zc = [t['t'] for t in r['cap']['texts'] if t['cls'] == 'lasttxt zend']
    expc = [fmt(S['close'][i1], pxdec(S['close'][i1]) if S['close'][i1] < 1000 else 0), fmt(C['sum'][j1], 0)]
    rec(scen, 'cali forti: riquadri a destra alla fine del tratto', atEnd or zc == expc, f'{zc} vs {expc}')
    # scala dei cali forti con il taglio
    sums = [C['sum'][cpos[d]] if d in cpos else None for d in win]; als = [C['alert'][cpos[d]] if d in cpos else None for d in win]
    aMax = max([0] + [v for v in als if v is not None]); sMax = max([1] + [v for v in sums if v is not None])
    cut = aMax * 1.3 if aMax > 0 and sMax > aMax * 1.3 else None; top = cut if cut is not None else max(sMax, aMax); hi = top * 1.08
    y0c, y1c = 216, 346; syc = lambda v: y1c - min(v, hi) / hi * 130
    ap = [x for x in r['cap']['paths'] if x['cls'] == 'capalert'][0]['pts']; aw = [i for i in range(n) if als[i] is not None]
    erra = max([abs(p[2] - syc(als[i])) for p, i in zip(ap, aw)] or [0])
    area = [x for x in r['cap']['paths'] if x['cls'] == 'caparea'][0]['pts']
    sw = [(i, sums[i]) for i in range(n) if sums[i] is not None]
    inner = [p for p in area if not (abs(p[2] - y1c) < 0.06 and any(abs(p[1] - (8 + i / (n - 1) * g['PW'])) < 0.06 and abs(syc(v) - y1c) > 0.06 for i, v in []))]
    pts_sum = [p for p in area[1:]]  # dopo M del primo tratto
    ys = {}
    for p in area:
        if p[0] == 'L': ys.setdefault(round((p[1] - 8) / g['PW'] * (n - 1)), p[2])
    errs = max(abs(ys[i] - syc(v)) for i, v in sw if i in ys)
    outc = [p for x in r['cap']['paths'] for p in x['pts'] if x['cls'] in ('px', 'caparea', 'capalert') and not (8 - 0.1 <= p[1] <= 8 + g['PW'] + 0.1 and 20 - 0.1 <= p[2] <= 346.1)]
    lab = [t['t'] for t in r['cap']['texts'] if 'capcut' in t['cls']]
    over = [(win[i], v) for i, v in sw if v > hi]
    st_ = []; i = 0
    while i < n:
        if sums[i] is None or sums[i] <= hi: i += 1; continue
        j = i; im = i
        while j + 1 < n and sums[j + 1] is not None and sums[j + 1] > hi:
            j += 1
            if sums[j] > sums[im]: im = j
        st_.append(f"▲{fmt(sums[im], 0)} ({MESI[int(win[im][5:7]) - 1]} {win[im][:4]})"); i = j + 1
    rec(scen, 'cali forti: etichette ▲ = massimi dei tratti oltre il taglio', all(x in st_ for x in lab) and (bool(lab) == bool(st_)), f'{lab} / attese {st_}')
    rec(scen, 'cali forti: scala (taglio a 1,3 × soglia più alta del tratto) e punti dentro il riquadro', erra < 0.06 and errs < 0.06 and not outc, f'taglio {cut}, fondo scala {hi:.2f}; scarti {erra:.3f}/{errs:.3f}; ▲ {lab}; sedute oltre {len(over)}; fuori {outc[:3]}')
    # 11. dopo il cambio di settore
    for s2, x in (r.get('after') or {}).items():
        S2 = ref.sector(s2); first = max(next(i for i, v in enumerate(S2['p200']) if v is not None), next(i for i, v in enumerate(S2['dd']) if v is not None) + 252)
        back = {'3A': 756, '10A': 2520, 'MAX': len(D)}[r['range']]; iBase = max(first, len(D) - 1 - back)
        a = max(iBase, D.index(d0) if d0 in D else 0); bnd = D.index(d1)
        if bnd - a + 1 < 10: e0, e1, zoomed = D[iBase], D[-1], False
        else: e0, e1, zoomed = D[a], D[bnd], True
        rec(scen, f'cambio a {s2}: tratto tagliato alla storia ({"zoom" if zoomed else "periodo"} {e0} – {e1})', x['edges'] == [dIT(e0), dIT(e1)] and x['chip'] == (f'Zoom: dal {dIT(e0)} al {dIT(e1)}' if zoomed else None) and x['capChip'] == x['chip'], f"bordi {x['edges']} · etichetta {x['chip']} · cali {x['capChip']} / {x['capEdges']}")
        w2 = [d for d in D if e0 <= d <= e1]
        check_ts(scen, s2, w2, x['dump'], x['tips'], label=f'{s2}: ')
