# Ricontrollo testi e data del massimo (vista 8 VIX) · versione 1.6.2 · commit a9335b1

Verdetto: **NO-GO** (nessun numero sbagliato; un testo della nota sotto lo scatter è falso alle soglie 20 e 25, rilievo 1)

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | nota sotto lo scatter, `#vxScBig` alle soglie 20 e 25 (js/vix-view.js r. 122) | Il testo dice: «il primo giorno di ogni episodio con il VIX a 30 o più (con la soglia 25 della tabella i primi giorni sono sotto 30 e lo scatter non li mostra)». Ci sono due problemi. (a) Non è sempre vero: la tabella mostra primi giorni già a 30 o più, a 20 il 05/02/2018 (37,3) e a 25 il 05/02/2018 (37,3) e il 05/08/2024 (38,6), che sono anche punti grandi. (b) «ogni episodio», scritto sotto la tabella a 20 o 25, si legge come «ogni episodio della tabella», ma i punti grandi sono gli inizi degli episodi a 30, e non c'è un punto per ogni riga. A 20, 17 episodi della tabella non contengono nessun inizio a 30, mentre quello dal 12/12/1996 al 02/10/2003 ne contiene 6; a 25 i casi sono 7 senza e 4 con 2 o 3. Il riquadro dei valori invece è chiaro («Primo giorno dell'episodio a 30 o più»). Proposta, solo testo: «il primo giorno di ogni episodio a 30 o più (episodi calcolati con la soglia 30, perché lo scatter mostra solo le sedute a 30 o più: un episodio a 25 della tabella può non contenerne nessuno o contenerne più d'uno)» | S&P 500 o Nasdaq-100, soglia 25: la riga 05/02/2018 con «VIX quel giorno 37,3» e la nota sotto lo scatter | `conteggio_20_25.py`, `data_massimo.py`, `episodi25-1440.png`, `nota-scatter25-1440.png` |
| 2 | minore | guida.html #vix (Scatter) e README, sezione 8 VIX («a 20 e 25 il primo giorno a 30 o più») | È la stessa ambiguità del rilievo 1b: non dicono «dell'episodio a 30». La guida in più giustifica la differenza così: «perché lo scatter mostra solo le sedute con il VIX a 30 o più». Non dice il falso, ma non spiega che a 20 e 25 non c'è un punto grande per ogni riga | leggere | — |
| 3 | minore | titolo `#vxEpsTitle` («Episodi con il VIX sopra X»), `#vxEpsNone` («episodi del VIX sopra X»), aria-label dello scatter, guida («ha chiuso sopra 20…», «ogni punto è una seduta con il VIX sopra 30» e, nello stesso paragrafo, «a 30 o più»), index r. 833 | Restano dei «sopra» dove la regola è ≥ (rilievo 5 del primo giro, ancora aperto). Il titolo sta subito sopra la colonna «Primo giorno a X o più». Nessuno contraddice la regola dei punti grandi né suggerisce un VIX sempre sopra la soglia | soglia 40, titolo sopra la tabella degli episodi | `testi_vista.json` |
| 4 | minore | nota sotto la tabella delle soglie («accanto al massimo c'è la sua data») e guida | Sotto 600 px la colonna del massimo è nascosta, con la sua data: sul telefono la nota rimanda a una colonna che non si vede. Era nascosta anche prima | 390 px | `browser_massimo.cjs` (0 celle visibili a 390) |

## Cosa ho verificato e passa

- **Data del massimo** (`data_massimo.py`, che non usa js/vix.js): ricalcolo da FRED VIXCLS (fino al 05/11/2026) sulle sedute di Yahoo ^GSPC e ^NDX. Episodi: 24, 23, 21, 10 e 3 per indice. Non ci sono pari merito, quindi la data del massimo è univoca.
- **Browser a 1440 px** (`browser_massimo.cjs`), 1384 controlli, 0 FAIL:
  - 162 righe, tutte le soglie e tutti e due gli indici: data, VIX massimo e data del massimo uguali al ricalcolo;
  - intestazione «Primo giorno a X o più» a ogni soglia;
  - 146 riquadri dei punti grandi a 1440 e 25 al tocco a 390: «Episodio a 30 o più iniziato il», «Episodio a X o più iniziato il» uguale alla data del punto (a 40 e 50), nota «Primo giorno dell'episodio a X o più (il punto grande)», nessun «sopra»;
  - a 390 px la colonna del massimo è nascosta;
  - console senza errori.

  Sul commit ff84565 lo stesso script fallisce (26 FAIL, poi si ferma): può fallire.
- **Esempi nel README e nei test**: a 20, l'episodio del 02/08/2024 ha il massimo di 52,33 l'08/04/2025; a 40, quello del 29/09/2008 ha 80,86 il 20/11/2008. A 30, l'episodio del 01/12/2021 ha il massimo il 07/03/2022: la data lo rende visibile.
- **Testi letti**, giusti a tutte le soglie:
  - tooltip delle colonne «Primo giorno…», «VIX quel giorno» e «VIX massimo dell'episodio»;
  - nota sotto la tabella delle soglie: inizio, fine dopo 63 sedute di fila sotto, «in mezzo può scendere sotto»;
  - `#vxScBig` a 30, 40 e 50, con l'eccezione degli episodi senza 12 mesi di dati;
  - guida «Dopo i picchi»;
  - nota 1.6.2 nel README e js/version.js.

  Nessuna etichetta suggerisce più un VIX sempre sopra la soglia dalla data indicata. I rilievi 1, 2 e 3 del primo giro sono risolti, a parte quanto detto qui sopra.
- **Script del repository**:
  - `ricerca/qa/browser/v162.cjs`: 0 FAIL;
  - `v161.cjs`: 0 FAIL;
  - `npm test`: 144 pass, 0 fail.

## Cosa non ho potuto verificare

- La seduta del 06/11/2026 su FRED, che non c'è ancora. Nel file è provvisoria (25,64, sotto il massimo dell'episodio in corso), quindi non cambia nessuna data del massimo.
- Il tema chiaro e scuro non li ho riprovati: nessuno stile è cambiato.

## Script e screenshot

`ricerca/qa/1.6.2/ricontrollo/`:
- `data_massimo.py` e `data_massimo.json`;
- `conteggio_20_25.py`;
- `browser_massimo.cjs`;
- `testi_vista.json`;
- `screenshot.cjs`, `episodi25-1440.png` e `nota-scatter25-1440.png`.
