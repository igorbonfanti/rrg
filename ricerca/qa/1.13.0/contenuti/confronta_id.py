# Controllo 1 bis: per ogni elemento con id presente nelle due versioni (stesso scenario), i numeri del suo testo.
# Stampa solo gli elementi in cui il multiinsieme dei numeri cambia; per ognuno, se i numeri tolti sono nella stessa vista
# della 1.13.0 (testo intero, attributi o riquadri «i» aperti). Uso: python3 confronta_id.py old.json new.json
import json, re, sys
from collections import Counter
old, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
NUM = re.compile(r'[−+-]?\d[\d.,/]*%?')
C = lambda s: Counter(x.replace('−', '-').rstrip('.,') for x in NUM.findall(s or ''))
same = diff = 0
seen = set()
for sc in old:
    o, n = old[sc].get('ids', {}), new[sc].get('ids', {})
    L0 = new[sc]['all'] + ' '.join(new[sc]['attrs']) + ' '.join((x or {}).get('t', '') for x in new[sc]['infoText'])
    for k in sorted(set(o) & set(n)):
        a, b = C(o[k]), C(n[k])
        if a == b: same += 1; continue
        diff += 1
        gone = a - b; add = b - a
        key = (k, tuple(sorted(gone.items())), tuple(sorted(add.items())))
        if key in seen: continue
        seen.add(key)
        where = {x: (x.replace('-', '−') in L0 or x in L0) for x in gone}
        print(f'[{sc}] #{k}: tolti {dict(gone)} aggiunti {dict(add)} · tolti ancora nella vista: {where}')
        print(f'   1.12.0: {o[k][:300]!r}\n   1.13.0: {n[k][:300]!r}')
    for k in sorted(set(o) - set(n)):
        if C(o[k]): print(f'[{sc}] SOLO 1.12.0 #{k}: {o[k][:200]!r}')
print('elementi con gli stessi numeri', same, 'diversi', diff)
