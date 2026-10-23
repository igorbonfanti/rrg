# C6. Cali forti: somma su N sedute, soglia di allerta (99° percentile delle sedute precedenti, dopo 756 somme),
# allerta (somma > soglia e almeno 5 cali), episodi (sedute in allerta distanti meno di 10) e situazione di oggi
# (percentile = quota delle sedute precedenti con una somma più bassa; sedute in allerta negli ultimi 63) ricalcolati
# da zero (numpy.quantile lineare) sui conteggi di data/capitulation.json, contro js/capitulation.js capAnalysis.
# Più i conteggi di alcune sedute storiche dell'S&P 500 che l'audit della 0.9.0 aveva trovato sbagliati.
# uso: python3 c6_cap.py
import sys, os, json, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import load, app_cap, dump, R

C = load('capitulation.json')
PRESETS = [dict(thr=7, win=5, mode='count'), dict(thr=5, win=3, mode='count'), dict(thr=10, win=10, mode='pct'), dict(thr=7, win=5, mode='pct')]


def analysis(s, thr, win, mode, q=0.99, warm=756, mn=5, gap=10, look=63):
    x, n = s['x%d' % thr], s['n']; L = len(x)
    sm, cnt = [None] * L, [None] * L
    for i in range(win - 1, L):
        w = range(i - win + 1, i + 1)
        if any(x[k] is None or not n[k] for k in w):
            continue
        cnt[i] = sum(x[k] for k in w)
        sm[i] = sum((100 * x[k] / n[k]) if mode == 'pct' else x[k] for k in w)
    alert, prev = [None] * L, []
    for i in range(L):
        if len(prev) >= warm:
            alert[i] = float(np.quantile(np.array(prev), q))
        if sm[i] is not None:
            prev.append(sm[i])
    on = [sm[i] is not None and alert[i] is not None and sm[i] > alert[i] and cnt[i] >= mn for i in range(L)]
    eps, cur = [], None
    for i, v in enumerate(on):
        if not v:
            continue
        if cur and i - cur['end'] < gap:
            cur['end'] = i; cur['days'] += 1
            if sm[i] > cur['peak']:
                cur['peak'] = sm[i]
            continue
        cur = dict(start=i, end=i, days=1, peak=sm[i]); eps.append(cur)
    frm = next((i for i, a in enumerate(alert) if a is not None), -1)
    last = max(i for i in range(L) if sm[i] is not None)
    past = [v for v in sm[max(0, frm):last] if v is not None]
    today = dict(i=last, value=sm[last], cnt=cnt[last], alert=alert[last], on=on[last], pct=100 * sum(1 for v in past if v < sm[last]) / len(past) if past else None,
                 recent=sum(on[max(0, last - look + 1):last + 1]))
    return dict(sum=sm, alert=alert, on=on, episodes=eps, today=today)


keys = list(C['series'])
js = """
import fs from 'node:fs'; import {capSeries, capAnalysis} from '%s/js/capitulation.js';
const C = JSON.parse(fs.readFileSync('%s/data/capitulation.json')), presets = %s, o = {};
for (const k of Object.keys(C.series)) { const s = capSeries(C.series[k]); o[k] = presets.map((p) => { const a = capAnalysis(s, p);
  return {alert: a.alert, on: a.on, episodes: a.episodes.map((e) => [e.start, e.end, e.days, e.peak]), today: a.today}; }); }
console.log(JSON.stringify(o));""" % (R.rstrip('/'), R.rstrip('/'), json.dumps(PRESETS))
app = json.loads(subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout)
res = []
for k in keys:
    s = app_cap(k)
    for pi, p in enumerate(PRESETS):
        o = analysis(s, **p); a = app[k][pi]
        da = sum(1 for x, y in zip(a['alert'], o['alert']) if (x is None) != (y is None) or (x is not None and abs(x - y) > 1e-6))
        do = sum(1 for x, y in zip(a['on'], o['on']) if x != y)
        de = [e for e in o['episodes']] != [dict(start=e[0], end=e[1], days=e[2], peak=e[3]) for e in a['episodes']]
        t, u = a['today'], o['today']
        dt_ = {f: (t[f], u[f]) for f in ('i', 'value', 'cnt', 'on', 'recent') if t[f] != u[f]}
        for f in ('alert', 'pct'):
            if (t[f] is None) != (u[f] is None) or (t[f] is not None and abs(t[f] - u[f]) > 1e-6):
                dt_[f] = (t[f], u[f])
        res.append(dict(series=k, preset=p, alert_diff=da, on_diff=do, episodes_diff=de, n_episodes=len(o['episodes']), today_diff=dt_, today=u, date=s['dates'][u['i']]))
dump('c6_cap.json', res)
bad = [r for r in res if r['alert_diff'] or r['on_diff'] or r['episodes_diff'] or r['today_diff']]
print(f'Serie {len(keys)} × preset {len(PRESETS)} = {len(res)} confronti; con differenze: {len(bad)}')
for r in bad[:20]:
    print('  DIFF', r['series'], r['preset'], r['alert_diff'], r['on_diff'], r['episodes_diff'], r['today_diff'])
print('\nSituazione di oggi, preset di Rea (−7% su 5 sedute, titoli):')
for r in res:
    if r['preset'] == PRESETS[0]:
        u = r['today']; al = '—' if u['alert'] is None else '%.1f' % u['alert']
        print(f"  {r['series']:9} {r['date']} somma {u['value']:.0f} (cali {u['cnt']}) soglia {al} allerta {u['on']} percentile {u['pct']:.1f} sedute in allerta negli ultimi 3 mesi {u['recent']} episodi {r['n_episodes']}")

# conteggi storici dell'S&P 500 che nella 0.9.0 il filtro errori di stampa sbagliava (valori «veri» dal conteggio
# indipendente della 0.9.0, rapporto-dati.md punto 7.3; README 0.9.1: 10/10/2008 a −7% 46 titoli)
S = app_cap('SPX'); pos = {d: i for i, d in enumerate(S['dates'])}
for d, exp in (('2008-10-10', (79, 46)), ('2025-04-08', (41, 11)), ('2020-04-03', (51, 11)), ('2020-03-16', None), ('2025-04-04', None)):
    i = pos[d]
    print(f"  SPX {d}: app x5 {S['x5'][i]} x7 {S['x7'][i]} x10 {S['x10'][i]} n {S['n'][i]}" + (f"  | conteggio grezzo 0.9.0 x5 {exp[0]} x7 {exp[1]}" if exp else ''))
