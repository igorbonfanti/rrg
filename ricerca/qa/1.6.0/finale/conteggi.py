# Controllo finale 1.6.0: ricalcolo indipendente (senza il codice dell'app né dati.mjs) delle sedute in backwardation
# «da 1 in su» dal 04/12/2007 al 05/11/2026: VIX/VIX3M (FRED VIXCLS / VXVCLS) e VX1/VX2 (Settle Cboe dei futures).
# Sedute: date del ^GSPC di Yahoo nella cache. VX1 = mensile con scadenza > data, VX2 = il mensile dopo.
# Scadenza: nome del file per i file CDN (vx/VX_<scadenza>.csv), ultima data del file per l'archivio (vx_old/).
# Settle CDN se > 0, se no archivio se > 0; prima del 26/03/2007 l'archivio è /10 (non serve: si parte dal 2007-12).
# Uso: python3 -I conteggi.py <cartella cache>   (ricerca/vix/struttura/dati/cache, non tracciata da git)
import sys, os, json, csv, datetime
C = sys.argv[1]
def fred(i):
    m = {}
    for r in list(csv.reader(open(os.path.join(C, f'fred_{i}.csv'))))[1:]:
        try: v = float(r[1])
        except: continue
        if v > 0: m[r[0]] = v
    return m
vix, v3 = fred('VIXCLS'), fred('VXVCLS')
g = json.load(open(os.path.join(C, 'yahoo_GSPC_1d.json')))['chart']['result'][0]
sess = sorted({datetime.datetime.fromtimestamp(t + g['meta'].get('gmtoffset', -18000), datetime.timezone.utc).strftime('%Y-%m-%d') for t, c in zip(g['timestamp'], g['indicators']['quote'][0]['close']) if c})
cdn, old = {}, {}
for f in os.listdir(os.path.join(C, 'vx')):
    if not f.startswith('VX_'): continue
    e = f[3:13]; d = cdn.setdefault(e, {})
    for r in list(csv.reader(open(os.path.join(C, 'vx', f))))[1:]:
        try: s = float(r[6])
        except: continue
        d[r[0]] = s
for f in os.listdir(os.path.join(C, 'vx_old')):
    if not f.endswith('.csv'): continue
    rows = []
    for r in csv.reader(open(os.path.join(C, 'vx_old', f))):
        if not r or r[0].count('/') != 2: continue
        mm, gg, aa = r[0].split('/')
        try: rows.append((f'{aa}-{int(mm):02d}-{int(gg):02d}', float(r[6])))
        except: pass
    if not rows: continue
    rows.sort(); e = rows[-1][0]; d = old.setdefault(e, {})
    for k, s in rows: d[k] = s / 10 if k < '2007-03-26' else s
EXP = sorted(set(cdn) | set(old))
def st(e, d):
    a = cdn.get(e, {}).get(d, 0)
    if a > 0: return a
    b = old.get(e, {}).get(d, 0)
    return b if b > 0 else None
cal, ri, rf = [], {}, {}
for d in sess:
    if d < '2007-12-04' or d > '2026-11-05': continue
    if d not in vix or d not in v3: continue
    nx = [e for e in EXP if e > d]
    if len(nx) < 2: continue
    a, b = st(nx[0], d), st(nx[1], d)
    if a is None or b is None: continue
    cal.append(d); ri[d] = vix[d] / v3[d]; rf[d] = a / b
out = {'sedute': len(cal), 'dal': cal[0], 'al': cal[-1],
       'VIX/VIX3M >= 1': sum(ri[d] >= 1 for d in cal), 'VX1/VX2 >= 1': sum(rf[d] >= 1 for d in cal),
       'VIX/VIX3M > 1': sum(ri[d] > 1 for d in cal), 'VX1/VX2 > 1': sum(rf[d] > 1 for d in cal),
       'concordanza >= 1': round(sum((ri[d] >= 1) == (rf[d] >= 1) for d in cal) / len(cal), 4),
       'R == 1': [d for d in cal if ri[d] == 1]}
print(json.dumps(out, indent=1))
