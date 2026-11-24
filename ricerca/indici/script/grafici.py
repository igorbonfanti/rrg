# Grafici di confronto con quelli di Rea: prezzo (scala log) colorato per stato e breadth a 200 sedute
# con il livello blu e la copertura. uso: python3 grafici.py VALIDA.json CARTELLA_USCITA
import json, sys, os, datetime as dt
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.collections import LineCollection

v = json.load(open(sys.argv[1]))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
COL = {'setup': '#3b7bff', 'trig': '#22c55e', 'fail': '#ef4444', 'watch': '#ffc400', 'cool': '#8a8a8a', 'normal': '#8a8a8a', None: '#3a3a3a'}
BG, INK = '#0b0b0c', '#d8d8d8'
for k, o in v.items():
    s = o['series']
    d = [mdates.date2num(dt.date.fromisoformat(x)) for x in s['dates']]
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(16, 8.4), sharex=True, gridspec_kw={'height_ratios': [3, 2], 'hspace': 0.05})
    fig.patch.set_facecolor(BG)
    for a in (a1, a2):
        a.set_facecolor(BG); a.tick_params(colors=INK, labelsize=9)
        for sp in a.spines.values(): sp.set_color('#333')
        a.grid(color='#222', lw=0.6)
    segs = [[(d[i - 1], s['close'][i - 1]), (d[i], s['close'][i])] for i in range(1, len(d))]
    cols = [COL.get(s['days'][i]) for i in range(1, len(d))]
    a1.add_collection(LineCollection(segs, colors=cols, linewidths=1.1))
    a1.set_yscale('log'); a1.set_xlim(d[0], d[-1]); a1.set_ylim(min(s['close']) * 0.92, max(s['close']) * 1.08)
    for e in o['episodes']:
        if e['trig']:
            x = mdates.date2num(dt.date.fromisoformat(e['trig']))
            a1.axvline(x, color='#22c55e', lw=0.7, alpha=0.5)
    a1.set_title(f"{o['name']} ({k}) · prezzo colorato per stato · membri: {'di epoca' if o['composition'] == 'epoca' else 'di oggi'}",
                 color=INK, loc='left', fontsize=12)
    b = [x if x is not None else float('nan') for x in s['pct200']]
    L = o['level']
    a2.plot(d, b, color='#cfcfcf', lw=0.8)
    a2.fill_between(d, b, L, where=[x <= L for x in [y if y == y else 999 for y in b]], color='#3b7bff', alpha=0.55, lw=0)
    a2.axhline(L, color='#3b7bff', lw=1.4)
    a2.text(d[-1], L, f' {L}%', color='#3b7bff', va='center', fontsize=10)
    cov = [x if x is not None else float('nan') for x in s['cov']]
    a2.plot(d, cov, color='#937b5a', lw=0.8, ls=':')
    a2.set_ylim(0, 100)
    src = 'Rea' if o['rea'] is not None else '3° percentile'
    a2.set_title(f"% titoli sopra la media a 200 sedute · livello blu {L}% ({src}) · p3 {o['p3']} · sedute sotto il livello {o['belowPct']}% · tratteggio = copertura",
                 color=INK, loc='left', fontsize=10)
    a2.xaxis.set_major_locator(mdates.YearLocator(2)); a2.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
    fig.savefig(os.path.join(out, f'{k}.png'), dpi=90, facecolor=BG, bbox_inches='tight')
    plt.close(fig)
    print(k)
