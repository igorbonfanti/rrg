"""Prova che i controlli possono fallire: crea una copia dell'app con 5 errori voluti (finestra del mini-grafico 20 sedute dopo
invece di 21, cerchio del massimo spostato di una seduta, fascia un giorno più lunga, riquadro sempre con l'S&P 500, sedute
contate una in meno). Uso: python3 -I mutazioni.py <copia dell'app>; poi servila (gzserve.mjs) e lancia browser_numeri_grafici.cjs.
Esito sulla 1.7.0 (8796e55): 4361 controlli, 1417 FAIL (sedute 162, cerchio 162, fasce 116, riquadro 45, linea 316, title 158)."""
import sys, os
d = sys.argv[1]
p = os.path.join(d, 'js/vix-view.js'); s = open(p).read()
for a, b in [("i1 = Math.min(n - 1, e.endP + 21)", "i1 = Math.min(n - 1, e.endP + 20)"),
             ("const im = A.dates.indexOf(e.maxDate, e.p);", "const im = A.dates.indexOf(e.maxDate, e.p) + 1;"),
             ("b = Math.min(t1, Date.parse(e.end));", "b = Math.min(t1, Date.parse(e.end) + 86400000);"),
             ("const ci = ixAt.get(dates[i])", "const ci = A.close[i]")]:
    assert a in s, a; s = s.replace(a, b)
open(p, 'w').write(s)
p = os.path.join(d, 'js/vix.js'); s = open(p).read(); a = "sessions: pos[last] - p + 1"; assert a in s
open(p, 'w').write(s.replace(a, "sessions: pos[last] - p"))
