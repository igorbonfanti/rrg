"""Riepilogo dei title HTML già presenti, per vista: quanti, dove (intestazioni, riquadri, legende, celle, pulsanti, link) e
quanti spiegano un'intestazione o un riquadro (candidati all'icona ⓘ). Scrive titoli.csv. Uso: python3 ricerca/semplificazione/script/titoli.py"""
import csv, json, os
from collections import OrderedDict, defaultdict
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = json.load(open(os.path.join(OUT, 'inventario_grezzo.json')))
def where(x):
    s, t = x['sel'], x['tag']
    if t == 'th': return 'intestazione'
    if t == 'dt': return 'voce della Situazione'
    if t == 'div' and 'kpi' in s: return 'riquadro in alto (kpi)'
    if t == 'div': return 'riquadro in alto (kpi)'
    if t == 'button': return 'pulsante'
    if t == 'a': return 'link (TradingView)'
    if t == 'tr': return 'riga cliccabile'
    if 'legend' in s: return 'legenda'
    return 'valore in tabella o scheda'
seen, rows, S = set(), [], defaultdict(lambda: defaultdict(int))
for x in D:
    if x['kind'] != 'title': continue
    k = (x['view'], x['text'])
    if k in seen: continue
    seen.add(k)
    w = where(x)
    rows.append(OrderedDict(vista=x['view'], dove=w, elemento=x['tag'], posizione=x['sel'], etichetta=x['label'], parole=x['words'], testo=x['text']))
    S[x['view']][w] += 1; S[x['view']]['totale'] += 1
with open(os.path.join(OUT, 'titoli.csv'), 'w', newline='', encoding='utf-8') as f:
    wr = csv.DictWriter(f, fieldnames=list(rows[0].keys())); wr.writeheader(); wr.writerows(rows)
for v, s in S.items(): print(v, dict(s))
