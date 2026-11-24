# Controllo 1: numeri di tabelle, grafici, kpi, fatti, liste, meta e legende tra 1.12.0 (old.json) e 1.13.0 (new.json).
# Per ogni scenario e ogni blocco con lo stesso id: testo uguale? Se no, stampa i numeri che cambiano (multiinsieme) e il testo.
# Uso: python3 confronta_blocchi.py old.json new.json
import json, re, sys
from collections import Counter
old, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
NUM = re.compile(r'[−+-]?\d[\d.,]*%?°?')
nums = lambda s: Counter(NUM.findall(s or ''))
tot_same = tot_diff = 0
for sc in old:
    o, n = old[sc]['blocks'], new[sc]['blocks']
    print(f'== {sc}: blocchi vecchi {len(o)}, nuovi {len(n)}')
    for k in sorted(set(o) | set(n)):
        a, b = o.get(k), n.get(k)
        if a is None or b is None:
            t = (a or b)
            print(f'  {"SOLO NUOVO" if a is None else "SOLO VECCHIO"} {k}: {t["t"][:160]!r} | title: {t["ti"][:120]!r}')
            continue
        if a['t'] == b['t'] and a['ti'] == b['ti']:
            tot_same += 1; continue
        tot_diff += 1
        if a['t'] != b['t']:
            na, nb = nums(a['t']), nums(b['t'])
            print(f'  TESTO {k}: numeri tolti {dict(na-nb)} aggiunti {dict(nb-na)}')
            print(f'     vecchio: {a["t"][:400]!r}')
            print(f'     nuovo:   {b["t"][:400]!r}')
        if a['ti'] != b['ti']:
            na, nb = nums(a['ti']), nums(b['ti'])
            print(f'  TITLE {k}: numeri tolti {dict(na-nb)} aggiunti {dict(nb-na)}')
            # differenze di frase
            sa, sb = set(a['ti'].split(' | ')), set(b['ti'].split(' | '))
            for x in sorted(sa - sb): print(f'     - {x[:300]!r}')
            for x in sorted(sb - sa): print(f'     + {x[:300]!r}')
print(f'blocchi uguali {tot_same}, diversi {tot_diff}')
