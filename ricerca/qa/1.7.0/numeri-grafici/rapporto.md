# Controllo numeri e grafici · versione 1.7.0 · commit 8796e55

Verdetto: **NO-GO**. Nessun numero è sbagliato. Restano però tre punti «da correggere» che possono far leggere male la pagina: colori degli episodi, riquadro dei valori con il Nasdaq-100, tabella tagliata a 1280 px.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Mini-grafici della tabella degli episodi e fasce del pannello dell'indice | Gli episodi senza gruppo (crisi «—», e anche «2014 ottobre», che non ha punti nello scatter) usano il colore di riserva `--amber`. Quel colore è quasi uguale a quello di due crisi: in chiaro `#9a4a00` contro `#953e04` di «2011-12 debito USA/euro» (g7) e `#a86f00` di «1990 Golfo» (g0); in scuro `#ffa028` contro `#e69f00` di «1990 Golfo». La legenda dice «nel colore della crisi» e ha proprio il riquadro ambra. Così una fascia senza crisi sembra la crisi del 1990 o del 2011-12. Esempi alla soglia 25: 16/03/2011 (2 sedute, accanto alle fasce di luglio 2011), 1997-09, 1998-04→2000-05, 2021-09→2023-03, 2024-12→2025-04. Alla soglia 20: la fascia 1996-12→2003-10, lunga 7 anni. | Soglia 25 (o 20), periodo MAX, tema chiaro e scuro | `shots/episodi-NDX-25-1280-chiaro.png`, `shots/zoom-SPX-25-MAX-pannello-indice-1440-{chiaro,scuro}.png`, `shots/grafico-SPX-20-MAX-1440-*.png`, `shots/legenda-1440-chiaro.png` |
| 2 | da correggere | Riquadro dei valori di #vxChart con il Nasdaq-100 scelto | Ora la prima riga mostra l'indice scelto («Nasdaq-100 1.399»). Subito sotto, «Realizzata 21 sedute» e «Premio per la paura» restano dell'S&P 500, ma senza dirlo. Il 03/04/2001 il riquadro mostra 31,6: la realizzata dell'S&P 500 è 31,6, quella del Nasdaq-100 è 71,6 (ricalcolo in Python dalle chiusure del file). Prima della 1.7.0 la prima riga era sempre l'S&P 500 e l'ambiguità non c'era. | Indice Nasdaq-100, soglia 30, MAX, mouse sul 2001 | `riquadro_ndx.cjs`, `shots/riquadro-NDX-30-MAX-1440-chiaro.png` |
| 3 | da correggere | Tabella degli episodi a 1280 e 1024 px | Con le tre colonne nuove la tabella è più larga del suo contenitore: 1254–1262 px contro 1220 a 1280, e contro 964 a 1024. La colonna «calo dopo» si vede solo scorrendo la tabella in orizzontale. Nella 1.6.2 (8151601) la tabella stava nel contenitore a tutte e tre le larghezze (misurato). | Finestra 1280 px, vista VIX, tabella degli episodi | `shots/episodi-*-1280-*.png`; misure nell'output di `screenshot.cjs` e nel confronto 1.6.2/1.7.0 (scratchpad `w162.cjs`) |
| 4 | minore | Fasce in tema scuro | Alcune crisi hanno colori scuri che, all'opacità .28, sul nero quasi spariscono. Per esempio «2000-03 bolla internet» `#96412c` e «2025 dazi» `#ca4963`: a 10A la fascia del 2025 (5 sedute) si vede appena. | Soglia 40, 10A, scuro | `shots/grafico-SPX-40-10A-1440-scuro.png`, `shots/grafico-SPX-40-10A-390-scuro.png` |
| 5 | minore | Riquadro dei valori, fasce lunghe | Con una soglia bassa, un episodio prende il nome della crisi del primo giorno anche anni dopo. Per esempio l'08/08/2011, alla soglia 20, il riquadro dice «Nell'episodio a 20 o più dal 26/07/2007 al 24/07/2012 (2007-09 crisi finanziaria)». La regola è giusta e spiegata nella vista, ma il riquadro non dice che quella è la crisi del primo giorno. | Soglia 20, MAX, mouse su agosto 2011 | dal codice e dal ricalcolo (episodio 2007-07-26 → 2012-07-24) |
| 6 | minore (latente) | Bordo sinistro del pannello dell'indice a 3A e 10A | Una fascia iniziata prima del periodo comincia sul bordo sinistro senza nessun segno (`a = max(t0, data)`). Oggi nessun episodio attraversa il bordo (controllato per tutte le soglie). Succederà dall'agosto 2027 a 3A con l'episodio a 20 dal 02/08/2024. Il riquadro dei valori ne mostra comunque la data d'inizio. | Non riproducibile con i dati di oggi | ricalcolo, elenco degli episodi a cavallo del bordo: vuoto |
| 7 | minore | Mini-grafico sul telefono | Con `preserveAspectRatio="none"` e larghezza 92 px, i cerchi (primo giorno, massimo) diventano ellissi schiacciate. Anche la colonna «Massimo» è nascosta: il massimo si legge solo nel title. | 390/360 px | `shots/episodi-SPX-40-360-chiaro.png` |
| 8 | minore | Ultima seduta provvisoria | L'episodio a 20 dal 02/11/2026 e quello a 25 dal 05/11/2026 hanno come ultimo giorno il 06/11/2026, cioè il dato provvisorio di Cboe che FRED non ha ancora. Nella tabella e nel title del mini-grafico manca «provv.», che invece compare nel riquadro del grafico. Con il solo FRED: ultimo giorno 05/11/2026 e 4 e 1 sedute invece di 5 e 2. | Soglia 20 o 25, prima riga | `ricalcolo.py`, variante A contro B |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

- **Ricalcolo indipendente** (`ricalcolo.py`, Python, senza js/vix.js). Le fonti:
  - (A) FRED VIXCLS scaricato oggi, con le sedute di Yahoo ^GSPC e ^NDX;
  - (B) data/vix.json, decodificato in Python.

  A e B coincidono per S&P 500 e Nasdaq-100 a tutte e 5 le soglie (24/23/21/10/3 episodi). L'unica differenza è la seduta provvisoria del 06/11/2026 (punto 8). Il VIX del file è identico a FRED in tutte le date comuni (0 differenze). I calendari degli indici sono identici a Yahoo (9281 sedute). Le chiusure differiscono al massimo di 6e-8 in termini relativi.
- **Tabella nel browser** (`browser_numeri_grafici.cjs`, 1440 px chiaro): 162 righe, cioè tutti gli episodi di 2 indici × 5 soglie. Per ognuna ho controllato:
  - primo giorno, crisi, VIX quel giorno, massimo e data, ultimo giorno con o senza asterisco, sedute;
  - il title e l'aria-label del mini-grafico (date e valori) contro il ricalcolo.
- **Mini-grafici**, punto per punto:
  - 33 300 vertici della linea alle sedute giuste (da 63 sedute prima a 21 dopo), con le interruzioni dove il VIX manca;
  - linea della soglia all'altezza giusta (scala da 0 al massimo × 1,06);
  - 11 612 vertici colorati, solo nelle sedute ≥ X dell'episodio e mai uniti tra sedute non consecutive;
  - punto pieno, cerchio del massimo e tacca alla seduta e al valore giusti.
- **Pannello dell'indice**, a 3A, 10A e MAX, per 2 indici e 5 soglie (30 combinazioni):
  - 244 fasce, con inizio e fine esattamente al primo e all'ultimo giorno e lo stesso colore della riga della tabella;
  - 125 480 vertici del prezzo alla data e al valore giusti in scala logaritmica, tutti dentro il pannello;
  - 135 etichette dei prezzi all'altezza del loro valore e mai più vicine di 12 px;
  - titolo e legenda con l'indice e la soglia.
- **Riquadro dei valori**: 90 sedute, con la chiusura dell'indice scelto, la riga dell'episodio (o la sua assenza) e il VIX giusti. In totale 4361 controlli, 0 FAIL, console senza errori.
- **I controlli possono fallire** (`mutazioni.py`). Su una copia dell'app con 5 errori voluti, lo stesso script dà 1417 FAIL e trova tutti e 5 gli errori.
- **Screenshot** a 1440, 1280, 1024, 390 e 360 px, chiaro e scuro (66 più gli zoom):
  - la pagina non scorre mai in orizzontale;
  - la scala logaritmica ha etichette sensate (500, 1k, 2k, 5k; a 10A 2,5k, 3k, 4k, 5k, 6k, 8k);
  - i mini-grafici si leggono a 150 px.

  Le scale diverse da riga a riga sono dichiarate nel title dell'intestazione. La linea tratteggiata della soglia dà un riferimento comune, e la scala parte da 0, quindi non gonfia i picchi.
- **Regressioni**: v170.cjs (62 OK, 0 FAIL), v162.cjs (56 OK, 0 FAIL), v161.cjs (76 OK, 0 FAIL); `npm test` 144/144.
- **File dell'app**: nessun cambiamento tra 8796e55 e HEAD (`git diff` vuoto su js, css, index.html, data).

## Cosa non ho potuto verificare e perché

- Il bordo di una fascia iniziata prima del periodo: con i dati di oggi nessun episodio attraversa il bordo di 3A o 10A (punto 6).
- La seduta del 06/11/2026 da una seconda fonte: FRED non l'ha ancora. Non ho confrontato il file di Cboe.
- Il contrasto l'ho valutato a occhio e con i valori dei colori, non con uno strumento WCAG sulle fasce semitrasparenti.

## Script e screenshot

In `ricerca/qa/1.7.0/numeri-grafici/`:

- `ricalcolo.py` e `ricalcolo_sintesi.json`: il ricalcolo indipendente;
- `browser_numeri_grafici.cjs`, con `browser_log.txt` e `browser_esito.json`: il confronto con la pagina;
- `mutazioni.py`: la prova che i controlli possono fallire;
- `screenshot.cjs`, `screenshot_zoom.cjs`, `riquadro_ndx.cjs`: gli screenshot;
- `regressioni_log.txt`: l'esito delle regressioni;
- `shots/`: gli screenshot.

Comando: `python3 -I ricalcolo.py fred.csv yahoo_gspc.json yahoo_ndx.json data/vix.json ric.json`, poi `BASE=http://127.0.0.1:8807/ RIC=ric.json OUT=. NODE_PATH=$(npm root -g) node browser_numeri_grafici.cjs`.
