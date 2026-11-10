import math, re
RES = []
def rec(scen, name, ok, detail=''):
    RES.append((scen, name, ok, detail))
    print(('OK  ' if ok else 'FAIL'), scen, '|', name, '|', detail)
def num(s):
    if s is None: return None
    s = s.strip().replace('−', '-').replace('%', '').replace('+', '').replace('°', '').split(' ')[0]
    if s in ('—', '-', ''): return None
    return float(s.replace('.', '').replace(',', '.')) if s.count(',') else float(s)
def fmt(v, d=1):
    if v is None: return '—'
    r = f'{abs(v):.{d}f}'
    neg = v < 0 and float(r) != 0
    return ('−' if neg else '') + r.replace('.', ',')
def jsfixed(v, d):
    # toFixed di JavaScript arrotonda il valore binario: per i confronti si accetta mezza unità
    return v
def close_enough(shown, v, d):
    if v is None: return shown is None
    if shown is None: return False
    return abs(shown - v) <= 0.5 * 10 ** -d + 1e-9
def dIT(iso): return f'{iso[8:10]}/{iso[5:7]}/{iso[0:4]}'
def iso(s): return f'{s[6:10]}-{s[3:5]}-{s[0:2]}'
def pxdec(v): return 3 if v is not None and abs(v) < 10 else 2
def tipmap(rows):
    m = {}
    for r in rows[1:]:
        if len(r) >= 2: m[r[0]] = r[1]
    return m
MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
def tick_ok(label, date):
    """etichetta dell'asse del tempo contro la data della seduta sotto la tacca"""
    if re.fullmatch(r'\d\d/\d\d', label): return label == f'{date[8:10]}/{date[5:7]}'
    if re.fullmatch(r'\d{4}', label): return date[:4] == label and date[5:7] == '01'
    m = re.fullmatch(r'([a-z]{3})(?: (\d\d))?', label)
    if m: return MESI.index(m.group(1)) + 1 == int(date[5:7]) and (m.group(2) is None or m.group(2) == date[2:4])
    return False
