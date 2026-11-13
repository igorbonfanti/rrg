"""Ricontrollo 1.6.2: alle soglie 20 e 25, quanti inizi degli episodi a 30 (i punti grandi) cadono in ogni episodio
della tabella, e quali primi giorni della tabella sono gia' a 30 o piu'. Uso: python3 -I conteggio_20_25.py data_massimo.json"""
import json, sys
R = json.load(open(sys.argv[1]))['SPX']
s30 = [e['date'] for e in R['30']]
for X in ('20', '25'):
    c = {}
    for e in R[X]:
        k = sum(1 for d in s30 if e['date'] <= d <= e['end']); c[k] = c.get(k, 0) + 1
    print(X, 'episodi della tabella per numero di inizi a 30 contenuti:', dict(sorted(c.items())),
          '; primo giorno gia a 30 o piu:', [(e['date'], e['vix']) for e in R[X] if e['vix'] >= 30])
