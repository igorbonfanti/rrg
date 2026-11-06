"""verita.py — seconda implementazione della data delle barre (zoneinfo di Python, non Intl di Node) e confronto con
l'output di confronto.mjs.

Per ogni simbolo:
  truth   = data locale di ogni timestamp con chiusura non nulla, nel fuso exchangeTimezoneName (duplicati: tiene l'ultima);
  newNow  = parse nuovo (gmtoffset di oggi); newAlt = parse nuovo con il gmtoffset dell'altra stagione;
  oldNow / oldAlt = parse vecchio (origin/main) con gli stessi due gmtoffset.
Controlli: newNow == newAlt (indipendente dalla stagione), newNow == truth (a parte l'ultima barra: seduta aperta o
fillLast), e dove il vecchio differisce dal nuovo, per quali simboli e quante date.
Uso: python3 -I verita.py <confronto_out.json> > verita.txt
"""
import json, sys, datetime as dt
from zoneinfo import ZoneInfo
from collections import Counter, defaultdict

d = json.load(open(sys.argv[1]))


def truth(x):
    tz = ZoneInfo(x['tz']) if x['tz'] else None
    out = []
    for t, c in zip(x['ts'], x['close']):
        if c is None:
            continue
        if tz:
            day = dt.datetime.fromtimestamp(t, tz).strftime('%Y-%m-%d')
        else:
            day = dt.datetime.fromtimestamp(t + (x['gmtoffset'] or 0), dt.timezone.utc).strftime('%Y-%m-%d')
        if out and out[-1] == day:
            continue
        out.append(day)
    return out


def weekend(s):
    return dt.date.fromisoformat(s).weekday() >= 5


summary = defaultdict(Counter)
detail = []
for group in ('chart5y', 'chartMax', 'spark'):
    for sym, x in sorted(d[group].items()):
        T, N, NA, O, OA = truth(x), x['newNow'], x['newAlt'], x['oldNow'], x['oldAlt']
        summary[group]['simboli'] += 1
        summary[group]['barre'] += len(N)
        if N != NA:
            summary[group]['NUOVO dipende dalla stagione'] += 1
            detail.append(f'!! {group} {sym}: nuovo con gmtoffset diverso da date diverse')
        # nuovo contro verità: uguale, a parte l'ultima barra (aperta o riempita con fillLast)
        tt = T[:-1] if len(T) == len(N) + 1 else T
        nn = N
        if tt != nn and not (len(T) == len(N) and T[:-1] == N[:-1]):
            summary[group]['NUOVO diverso da zoneinfo'] += 1
            sa, sb = set(tt), set(nn)
            detail.append(f'!! {group} {sym} ({x["tz"]}): nuovo≠zoneinfo, solo zoneinfo {sorted(sa - sb)[:5]}, solo nuovo {sorted(sb - sa)[:5]}')
        if any(weekend(s) for s in N) and x['type'] != 'CRYPTOCURRENCY':
            wk = [s for s in N if weekend(s)]
            summary[group]['simboli non crypto con barre nel fine settimana (nuovo)'] += 1
            detail.append(f'   {group} {sym} ({x["tz"]}): {len(wk)} barre nel fine settimana con il nuovo, es. {wk[:4]}')
        for name, V in (('vecchio, offset di oggi', O), ('vecchio, offset altra stagione', OA)):
            if V != N:
                sv, sn = set(V), set(N)
                # quante barre cambiano data: confronto per posizione dove le lunghezze coincidono, altrimenti differenza tra insiemi
                moved = sum(a != b for a, b in zip(V, N)) if len(V) == len(N) else len(sv ^ sn)
                summary[group][f'simboli diversi ({name})'] += 1
                summary[group][f'barre diverse ({name})'] += moved
                wk = sum(weekend(s) for s in V) - sum(weekend(s) for s in N)
                detail.append(f'   {group} {sym} [{x["type"]}, {x["tz"]}, gmtoffset {x["gmtoffset"]}→{x["altOffset"]}] {name}: '
                              f'{moved} barre, lunghezza {len(V)} contro {len(N)}, barre nel weekend in più col vecchio {wk}')

for g, c in summary.items():
    print(f'== {g}')
    for k, v in c.items():
        print(f'   {k}: {v}')
print()
print('\n'.join(detail))
