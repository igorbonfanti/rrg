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
KW = re.compile(r'HY|IG|OAS|BAA|AAA|Baa|Aaa|BAML|spread|credit|Moody|ICE', re.I)
def isodate(x):
    m = DATE.fullmatch(x.strip()) if isinstance(x, str) else None
    if not m: return None
    return '%s-%s-%s' % m.groups()[:3] if m.group(1) else '%s-%s-%s' % (m.group(6), m.group(5), m.group(4))
CK = re.compile(r'hy|ig_|oas|baa|aaa|baml|credit|spread|moody|ice', re.I)
def match(f, where, d, v, ns):
    global checked
    if isinstance(where, str) and not CK.search(where): return  # JSON: solo chiavi del credito (il VIX/VIX3M ~0,8-1,4 coincide per caso con Baa-Aaa)
    checked += 1
    for k, m in S.items():
        if d in m and abs(round(v, 2) - m[d]) < 1e-9: hits.append((f, where, k, d, ns))
def walk(f, o, path):
    if isinstance(o, dict):
        ds = [isodate(k) for k in o] + [isodate(v) for v in o.values()]
        ds = [d for d in ds if d]
        for k, v in o.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool) and v != int(v):
                for d in ds: match(f, path + '.' + k, d, v, str(v))
            if isodate(k) and isinstance(v, (int, float)) and not isinstance(v, bool): match(f, path + '.' + k, isodate(k), v, str(v))
            walk(f, v, path + '.' + str(k))
    elif isinstance(o, list):
        if len(o) >= 2 and isodate(o[0]) and all(isinstance(x, (int, float)) for x in o[1:]):
            for x in o[1:]: match(f, path, isodate(o[0]), x, str(x))
        for i, x in enumerate(o): walk(f, x, path + '[%d]' % i)
for f in files:
    try: txt = open(os.path.join(R, f), encoding='utf8').read()
    except: continue
    if f.endswith('.json'):
        try: walk(f, json.loads(txt), '')
        except Exception as e: print('JSON non letto', f, e)
        # in più: estremi scritti ovunque nel testo del file vicino a una chiave del credito
    for i, line in enumerate(txt.split('\n')):
        if not f.endswith('.json'):
            ds = [isodate(m.group(0)) for m in DATE.finditer(line)]
            if ds and KW.search(line):
                for ns in NUM.findall(line):
                    v = float(ns.replace(',', '.').replace('−', '-'))
                    for d in ds: match(f, i + 1, d, v, ns)
        for ns in NUM.findall(line):
            if len(re.split('[.,]', ns)[1]) != 2: continue
            v = float(ns.replace(',', '.').replace('−', '-'))
            for k, e in ext.items():
                for d, x in e:
                    if abs(v - x) < 1e-9 and KW.search(line[max(0, line.find(ns) - 120): line.find(ns) + 40]):
                        exthits.append((f, i + 1, k, 'estremo del ' + d, ns, line[max(0, line.find(ns) - 100): line.find(ns) + 30]))
# Nota: le coincidenze vanno guardate a mano: percentili, correlazioni e rapporti del VIX possono coincidere per caso.
print(f'file controllati: {len(files)}; coppie data-numero confrontate: {checked}')
print(f'coincidenze numero = livello della stessa data: {len(hits)}')
for h in hits: print('  ', h[:4] + ('[valore non scritto: può essere un livello di terzi]',))  # mai stampare il livello
print(f'estremi storici (max/min) scritti vicino a parole del credito: {len(exthits)}')
for h in exthits: print('  ', h[:4] + ('[valore non scritto]',))
