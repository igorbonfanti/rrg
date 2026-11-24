"""Confronta ricalcolo (file.json / yahoo.json) con test/fixtures/peaks_20261120.json.gz (timeline)."""
import gzip, json, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
F = json.load(gzip.open(os.path.join(ROOT, 'test/fixtures/peaks_20261120.json.gz')))
M = json.load(open(sys.argv[1]))
n = diff = 0
assert [e['peak'] for e in M['episodes']] == [e['peak'] for e in F['timeline']], ([e['peak'] for e in M['episodes']], [e['peak'] for e in F['timeline']])
for a, b in zip(M['episodes'], F['timeline']):
    for k in ['ddPct', 'ongoing']:
        n += 1
        if a[k] != b[k]: diff += 1; print('DIFF', a['peak'], k, a[k], b[k])
    for id_, ma in a['markets'].items():
        mb = b['markets'][id_]
        keys = ['status']
        if ma['status'] in ('peak', 'anchor'): keys += ['date', 'offset', 'ddPct']
        if ma['status'] == 'peak': keys += ['ongoing', 'belowZero', 'others']
        for k in keys:
            n += 1
            if ma.get(k) != mb.get(k): diff += 1; print('DIFF', a['peak'], id_, k, ma.get(k), mb.get(k))
        if ma['status'] == 'peak':
            n += 1
            if ma['trough'] != mb['troughDate']: diff += 1; print('DIFF', a['peak'], id_, 'trough', ma['trough'], mb['troughDate'])
        if ma['status'] == 'none':
            n += 1
            if ma['alt15'] != mb['alt15']: diff += 1; print('DIFF', a['peak'], id_, 'alt15', ma['alt15'], mb['alt15'])
print(f'campi confrontati: {n}, differenze: {diff}')
