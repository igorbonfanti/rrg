# Controllo numeri e coerenza (vista 8 VIX) · versione 1.6.2 · commit ff84565

Verdetto: **NO-GO** (nessun numero sbagliato; due etichette nuove della 1.6.2 dicono una cosa falsa, rilievi 1 e 2)

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | riquadro dei valori dello scatter, righe «VIX sopra 30 dal» e «VIX sopra X dal» (js/vix-view.js r. 216) | «Sopra … dal» si legge «sempre sopra da quel giorno», ma la data è l'inizio dell'episodio, e un episodio va avanti finché il VIX non resta sotto la soglia per 63 sedute di fila. In 355 punti su 734 il VIX è sceso sotto 30 tra quella data e il giorno del punto. Con la soglia 40 o 50 il riquadro si contraddice da solo: 119 punti su 327 (soglia 40) e 49 su 124 (soglia 50) mostrano un VIX del giorno sotto la soglia insieme a «VIX sopra X dal». Esempi: 01/09/1998 «VIX 36,48 · VIX sopra 40 dal 31/08/1998»; 04/11/2008 «VIX 47,73 · VIX sopra 50 dal 06/10/2008»; 27/01/2021 «VIX sopra 30 dal 27/02/2020» (il VIX è stato sotto 30 per 151 sedute in mezzo). Nella 1.6.1 c'era «Episodio iniziato il», che era corretto | soglia 40, passare il mouse sul punto del 01/09/1998 | `riquadro_contraddizione.cjs`, `riquadro-40-1998-09-01.png`, `riquadro-50-2008-11-04.png`, `riquadro-30-2021-01-27.png`, `continuita.py` |
| 2 | da correggere | tabella «Episodi con il VIX sopra X», colonne «Sopra X dal» e «VIX massimo dell'episodio» | Il problema della continuità è lo stesso del rilievo 1. Alle soglie 20 e 25 un episodio può durare anni e comprendere più crisi, e il massimo finisce sulla riga di un'altra crisi. Esempi a 20: «02/08/2024 · 2024 carry yen · VIX massimo 52,3», ma 52,33 è dell'08/04/2025 (dazi) e il massimo del carry yen è stato 38,57; «12/12/1996 · — · 45,7», episodio fino al 02/10/2003 con il massimo dell'08/10/1998 (Russia/LTCM). A 25: 1997-09-04 → massimo del 1997 Asia; 1998-04-27 → 1998 Russia; 2021-09-20 → 2022; 2024-12-18 → 2025 dazi. A 30: 2021-12-01 → massimo del 07/03/2022. Il valore segue la regola (le chiusure ≥ X fino all'episodio successivo), ma né la tabella né il tooltip della colonna dicono fin dove arriva l'episodio. Proposta (solo testo, nessuna formula cambia): «Primo giorno sopra X» al posto di «Sopra X dal»; nel riquadro «Episodio sopra 30 iniziato il» e «Episodio sopra X iniziato il»; nel tooltip del massimo, «fino all'ultima chiusura sopra X prima di 63 sedute sotto (a 20 e 25 può durare anni)», oppure mostrare la data di fine | soglia 20, S&P 500, riga del 02/08/2024 | `episodi20-1440-chiaro.png`, `continuita.py` |
| 3 | minore | guida.html #vix (Scatter) e README r. 99 | «Il punto grande è il primo giorno sopra la soglia scelta (sopra 30 se la soglia è 20 o 25 …): coincide con la colonna «Sopra X dal»». Alle soglie 20 e 25 non coincide: la colonna ha le date sopra 20 o 25. La nota nella vista (#vxScBig) invece lo dice giusto | leggere la guida | — |
| 4 | minore | vista, nota #vxScBig alla soglia 30 | «come la colonna «Sopra 30 dal»»: la colonna ha 21 righe e i punti grandi sono 20, perché il 27/03/2026 non ha ancora 12 mesi di dati. La didascalia lo dice altrove («1 seduta recente … non è disegnata») | soglia 30 | — |
| 5 | minore | testi «sopra 30/40/50» | La regola è ≥: 3 punti hanno il VIX esattamente a 30, 40 o 50 (20/08/1998, 25/10/2002, 31/12/2008). La didascalia dice giusto «a 30 o più», i testi dicono «sopra» | — | `ricalcolo.json` |
| 6 | minore | README, sezione VIX (r. 99), e CRISES in js/vix.js | La vista e la guida dicono «etichette di periodo scelte a mano». Il README dice solo «crisi di `CRISES`» e il commento nel codice «solo etichette»: la parola «a mano» manca, ma non c'è nessuna contraddizione | — | — |

## Cosa ho verificato e passa

- **Ricalcolo indipendente** (`ricalcolo_episodi.py`, che non usa js/vix.js), con due fonti:
  - A: VIX di FRED (VIXCLS fino al 05/11/2026) con ^GSPC e ^NDX scaricati ora da Yahoo;
  - B: VIX e indici decodificati da data/vix.json.

  Le sedute di Yahoo e del file coincidono: 9281 per indice, nessuna data in più o in meno, scarto massimo delle chiusure 6e-8. Il VIX del file coincide con FRED, scarto 0,0. Il file non ha 20 date festive che su FRED ci sono, ma su quelle l'indice non ha sedute; ha in più il 06/11/2026 (Cboe, provvisorio, 25,64). Episodi uguali in A e B a tutte le soglie: 24, 23, 21, 10 e 3, con rendimenti diversi al massimo di 1e-5 punti.
- **Browser contro il ricalcolo** (`browser_vix.cjs`, 1440 px): 6093 controlli, 0 FAIL con la variante B e 0 FAIL con la variante A. Coprono:
  - 162 righe della tabella, a tutte le soglie e per tutti e due gli indici: data, VIX quel giorno, VIX massimo, 1, 3, 6 e 12 mesi, calo dopo e asterisco;
  - 7340 punti (734 per ogni combinazione di indice e soglia): insieme delle sedute e coordinate, entro 0,12 unità SVG da VIX e rendimento a 12 mesi, ricavati dalle etichette degli assi;
  - i punti grandi, uguali ai primi giorni sopra max(30, X) con 12 mesi di dati e alla colonna per X ≥ 30;
  - 758 riquadri dei valori, anche con «2020 Covid» e «2007-09 crisi finanziaria» evidenziate: data, VIX, 12 mesi, date «sopra 30 dal» e «sopra X dal» uguali all'inizio dell'episodio che contiene la seduta (altrimenti «—»), nota del punto grande solo sui punti grandi.

  Lo stesso script sulla 1.6.1 (a6e8506) dà 3522 FAIL, quindi può fallire.
- **Telefono** (390 px, tocco, tema scuro) e 1440 chiaro (`telefono_testi.cjs`): il riquadro al tocco su un punto grande è giusto a ogni soglia, la crisi si accende, il testo di #vxScBig è giusto per 20, 25, 30, 40 e 50, la console non ha errori.
- **Script del repository**:
  - `v162.cjs`: 56 OK, 0 FAIL;
  - `v161.cjs`: 76 OK, 0 FAIL;
  - `verifica_episodi.py` con FRED per SPX e NDX: 2 differenze, solo nella data di fine dell'episodio a 20 e a 25. FRED si ferma al 05/11 e il file ha il 06/11 provvisorio: la data di fine non si mostra e il massimo non cambia;
  - `npm test`: 0 fail.
- **Testi**: nella vista, nella guida e nel README non resta nessun «Inizio» o «Episodio iniziato», né frasi su un inizio della crisi calcolato. Sulle crisi la vista e la guida dicono «etichette di periodo scelte a mano, non date d'inizio calcolate». La nota della 1.6.1 nel README («pallini d'inizio») è storia della versione.

## Cosa non ho potuto verificare

- La seduta del 06/11/2026 su FRED, che non l'ha ancora pubblicata: nel file è il valore provvisorio di Cboe e non cambia nessun numero mostrato.
- I grafici a 1280 e 360 px e il contrasto: è un altro tema.

## Script e screenshot

`ricerca/qa/1.6.2/`:
- `ricalcolo_episodi.py` e `ricalcolo.json`;
- `browser_vix.cjs` (VAR=A o B, BASE);
- `continuita.py`;
- `riquadro_contraddizione.cjs`;
- `telefono_testi.cjs`;
- screenshot `episodi20-*.png`, `scatter40-*.png`, `riquadro-*.png`.

Per rilanciare il ricalcolo servono le fonti scaricate:
- VIX di FRED: `https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS`;
- indici di Yahoo: `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=631152000&period2=1794000000&interval=1d`, e lo stesso indirizzo con %5ENDX.
