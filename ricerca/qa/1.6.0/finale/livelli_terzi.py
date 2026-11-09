# Controllo finale 1.6.0: nei file tracciati da git sotto ricerca/vix/struttura/ e ricerca/qa/1.6.0/ restano LIVELLI
# di HY OAS / IG OAS (ICE) o di BAA10Y, AAA10Y, Baa-Aaa, DBAA, DAAA (Moody's)?
# Metodo: per ogni riga (e le 2 vicine) si prendono le date (AAAA-MM-GG, GG/MM/AAAA) e i numeri decimali; si segnala il
# numero che coincide (a 2 decimali) con il livello di una di queste serie in una di quelle date. In più si cercano
# massimi e minimi storici di ogni serie scritti ovunque nel file. Le serie si leggono dalla cache non tracciata.
# Uso: python3 -I livelli_terzi.py <radice repo> <cache>
import sys, os, re, csv, subprocess, json
R, C = sys.argv[1], sys.argv[2]
def fred(i):
    m = {}
    p = os.path.join(C, f'fred_{i}.csv')
    for r in list(csv.reader(open(p)))[1:]:
        try: m[r[0]] = float(r[1])
        except: pass
    return m
S = {k: fred(k) for k in ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y', 'AAA10Y', 'DBAA', 'DAAA']}
for f in os.listdir(C):
    if f.startswith('alfred_BAMLH0A0HYM2'):
        for r in list(csv.reader(open(os.path.join(C, f))))[1:]:
            try: S['BAMLH0A0HYM2'].setdefault(r[0], float(r[1]))
            except: pass
S['Baa-Aaa'] = {d: round(v - S['AAA10Y'][d], 2) for d, v in S['BAA10Y'].items() if d in S['AAA10Y']}
S['DBAA-DAAA'] = {d: round(v - S['DAAA'][d], 2) for d, v in S['DBAA'].items() if d in S['DAAA']}
files = subprocess.run(['git', '-C', R, 'ls-files', 'ricerca/vix/struttura', 'ricerca/qa/1.6.0'], capture_output=True, text=True).stdout.split()
files = [f for f in files if not f.endswith('.png')]
DATE = re.compile(r'(\d{4})-(\d{2})-(\d{2})|(\d{2})/(\d{2})/(\d{4})')
NUM = re.compile(r'(?<![\d.,/-])[-−]?\d{1,2}[.,]\d{1,4}(?![\d/])')
ext = {}
for k, m in S.items():
    if not m: continue
    hi = max(m, key=m.get); lo = min(m, key=m.get)
    ext[k] = [(hi, m[hi]), (lo, m[lo])]
hits, exthits, checked = [], [], 0
for f in files:
    try: L = open(os.path.join(R, f), encoding='utf8').read().split('\n')
    except: continue
    for i, line in enumerate(L):
        win = ' '.join(L[max(0, i - 2): i + 3])
        ds = ['%s-%s-%s' % (m[0], m[1], m[2]) if m[0] else '%s-%s-%s' % (m[5], m[4], m[3]) for m in DATE.findall(win)]
        nums = NUM.findall(line)
        for ns in nums:
            v = float(ns.replace(',', '.').replace('−', '-')); checked += 1
            for d in set(ds):
                for k, m in S.items():
                    if d in m and abs(round(v, 2) - m[d]) < 1e-9 and len(ns.split('.' if '.' in ns else ',')[1]) <= 2:
                        hits.append((f, i + 1, k, d, ns, line.strip()[:200]))
            for k, e in ext.items():
                for d, x in e:
                    if abs(round(v, 2) - x) < 1e-9 and len(ns.split('.' if '.' in ns else ',')[1]) == 2 and re.search(r'HY|IG|OAS|BAA|AAA|Baa|Aaa|BAML|spread|credit', win):
                        exthits.append((f, i + 1, k, d, ns, line.strip()[:200]))
print(f'file controllati: {len(files)}; numeri decimali letti: {checked}')
print(f'coincidenze numero = livello alla data vicina: {len(hits)}')
for h in hits: print('  ', h)
print(f'estremi storici scritti vicino a parole del credito: {len(exthits)}')
for h in exthits: print('  ', h)
