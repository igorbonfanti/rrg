# Controllo uso e testi · versione 1.12.0 · commit cd50f19

Verdetto: **NO-GO** finché non si corregge il rilievo 1 (da correggere). Nessun bloccante. Tutto il resto passa.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Vista 0, linea del tempo, finestre da circa 720 a 880 px (tablet verticale 768, 820, 834; telefono orizzontale 740-844; 861) | Il grafico passa al formato largo appena è largo almeno 640 px, ma il margine destro per i testi resta fisso a 315 px. I 24 mesi hanno solo 227-350 px (a 700 px, nel formato del telefono, ne hanno 514). Le etichette «−12 m»/«−9 m» e «+9 m»/«+12 m» si sovrappongono in tutti e 5 i riquadri e si leggono «−12 m9 m» e «+9 m12 m». | Finestra di 820×1180 (o 740×360), `#ath`, guardare l'asse in alto di ogni riquadro. | `assi.txt` (sovrapposizioni da 740 a 861 px, nessuna a 700 e da 900 in su); `shots/linea-820-scuro.png`, `shots/linea-740x360.png`; `uso.txt` (FAIL a 820 e 861) |
| 2 | minore | Vista 0 senza `data/ath.json` | La linea del tempo e l'ordine tipico usano gli identificativi interni come nomi: BTC, GOLD, SILVER, COPPER, WTI, NDX, SPX, SOXX, KOSPI. | Con `page.route` 404 su `data/ath.json`, aprire `#ath`. | `uso.txt` (INFO senza ath), `shots/mancanti-ath-1280.png` |
| 3 | minore | guida.html, indice | Le tre voci sotto «0 Massimi» sono in un `<ul>`: hanno i pallini e un rientro diverso, mentre le altre sottovoci («Cali forti», «Zoom su un tratto») sono in un `<ol>` senza segni. | Aprire guida.html a 1440 px e guardare l'indice. | `shots/guida-indice-1440.png` |
| 4 | minore | Vista 0, linea del tempo, da 1100 a 1300 px | I testi accanto alle righe sono a 9,6 px sullo schermo e i nomi a 10,4 px, perché `chartWidth` allarga il viewBox di 1,15 volte. A 1440 px sono a 10,7 px. | 1280×800, `#ath`. | `assi.txt` |
| 5 | minore | Vista 0, telefono e tablet | Toccando un punto o un cerchio vuoto non compare niente: i numeri sono solo nel `<title>` SVG, che si vede col mouse, e `bindTapTips` ignora gli elementi dentro `svg`. Per il punto pieno i numeri sono già nel testo sotto la riga. Per i cerchi vuoti, sul telefono non si vedono da nessuna parte. La guida dice correttamente «al passaggio del mouse». | 390×844 con il tocco, toccare un cerchio vuoto (per esempio Bitcoin 2022). | `uso.txt` (INFO «cerchio vuoto») |
| 6 | minore | Vista 0, riquadro del calo in corso | La metà destra va fino a +12 mesi, ma i dati arrivano solo a +45 g (20/11/2026). Nessun segno indica «oggi», quindi «nessun calo ≥ 20%» e la parte vuota possono sembrare definitivi. In più l'intestazione «ultimi 4 cali ≥ 15% … e quello in corso» può far credere che anche quello in corso superi il 15%, mentre è −11,6% (lo spiega la guida, `#linea-massimi`). | 1440, `#ath`, ultimo riquadro. | `shots/linea-1440-chiaro-cvd.png` |
| 7 | minore | Testi | (a) Il comando `MASSIMO` funziona ed è nel README, ma manca nella guida (tabella dei comandi) e nella nota di versione del README, che elencano MASSIMI, ATH, MAX e BOLLE. (b) Testi nuovi più lunghi in pagina, che si possono accorciare: la 5ª voce della legenda («accanto a ogni riga: data, giorni dal massimo dell'S&P 500, calo massimo («finora»: non finito)», 100 caratteri) e la parentesi dell'ordine tipico («rango medio, 8 cali ≥ 15% 2000-2025; 0 = primo, 1 = ultimo»), che ripete il riquadro della scritta «Ordine tipico». Sul telefono l'ordine tipico occupa 97 px a 390 e 116 px a 360. (c) La «i» mostra a chi usa l'app un percorso del repository, «(ricerca/rotazione-bolle/)». | — | grep su guida.html, README.md, index.html; `uso.txt` (INFO altezze) |
| 8 | minore | Barra delle schede, 360 e 390 px | La griglia 5 × 2 è senza tagli né scorrimento, ma alcune schede vanno su due righe («1 / MONITOR», «7 / EMERGENTI») e altre su una («5 TITOLI», «8 VIX»). Si legge bene ma è poco uniforme. | 360×780, guardare le schede. | `shots/schede-360.png` |

## Cosa ho verificato e passa

Sono 874 controlli in tutto: 856 OK e 4 FAIL in `uso.cjs` (tutti del rilievo 1), più 12 OK in `lento.cjs`.

- **Navigazione** a 1440, 1280, 1100, 861, 820, 390 e 360 px, tema chiaro e scuro, CVD a 1440 e 390:
  - clic su tutte e 10 le schede e Indietro del browser per tutta la catena;
  - tasti 1-9 e 0;
  - frecce e Fine sulle schede (Alert → Massimi → Monitor);
  - comandi MASSIMI, ath, Max, BOLLE e MASSIMO;
  - indirizzi `#ath` e `#ATH`;
  - rimando dalla vista VIX, Indietro che torna al VIX, guida rapida con il link `guida.html#ath`, link «Come si legge ↗».
- **Barra delle schede**: 10 schede, nessun testo tagliato, nessuno scorrimento. Una riga sopra 860 px, 2 × 5 a 820, 390 e 360 px.
- **Vista 0, tabella e grafico**: 9 righe. Clic o tocco apre il grafico con il profilo dei volumi. Il riquadro del prezzo e quello della fascia del profilo funzionano. Lo zoom si fa trascinando e Esc lo toglie; sul telefono c'è la lente. 3A, MAX e 10A funzionano, un secondo clic chiude il grafico.
- **Linea del tempo**: 5 riquadri (4 cali ≥ 15% conclusi e quello del 06/10/2026), 45 righe confrontate direttamente con `ricerca/rotazione-bolle/risultati.json` (`windows.SPX15` e l'ultima finestra di `windows.SPX10`), senza la fixture dell'app. Coincidono:
  - titoli, date, giorni e cali;
  - «sotto zero» del petrolio 2018, con la data 20/04/2020 presa dagli episodi;
  - «finora»;
  - posizione dei punti e dei cerchi vuoti (entro 0,6 px);
  - fascia «insieme» a ±31 giorni.
  
  Nessun testo, punto o cerchio tagliato. Nessuna sovrapposizione fuori dal rilievo 1.
- **Ordine tipico** uguale a `risultati.json` (`order.SPX15`), e la costante `ORDER` di `js/peaks.js` coincide campo per campo. La «i» funziona col mouse (title), con il tasto Tab e al tocco (riquadro). Le voci dell'ordine tipico si aprono al tocco.
- **File mancanti** (404 su `ath.json`, su `ath_history.json` e su tutti e due, a 1280 e 390): messaggi giusti, nessun «Caricamento» bloccato, nessun errore JS oltre al 404 della risorsa.
- **File lenti** (4 s), anche cambiando vista durante il caricamento: alla fine 5 riquadri e 9 righe, nessun errore.
- Rotazione del telefono da 740×360 a 360×740: la linea del tempo si ridisegna. Nessuno scorrimento orizzontale in nessuna larghezza, neanche nella guida a 1440, 390 e 360 (con le ancore `#ath`, `#massimi`, `#profilo-volumi`, `#linea-massimi`). Console pulita.
- **Numeri della guida** ritrovati in `risultati.json`, `backtest.md` e `tabelle.md`:
  - ranghi 0,23, 0,33, 0,45, 0,46, 0,50, 0,56, 0,56, 0,71, 0,86;
  - mediane −80 e −71 g; KOSPI mai dopo; semiconduttori dopo 1 volta (2010, +300);
  - Nasdaq-100 insieme 5 su 6; oro dopo 5 su 5, mediana 161;
  - bitcoin con dati in 4 cali; 4 cali ≥ 20% dal 2000; KOSPI 2 su 4, Nasdaq-100 1 su 4;
  - 79,3%; 9 massimi e solo 3 confermati (KOSPI 2 su 5, SOXX 1 su 4);
  - 8 cali e i loro anni; criterio (a) (b) (c) uguale a backtest.md §1;
  - serie: SOXX dal 2001, bitcoin dal 2014;
  - 281 episodi (`test/peaks.test.js`).
- **Coerenza tra le fonti**: pagina, guida, guida rapida, README, nota di versione e piè di pagina concordano. Nessuna promessa o avviso di segnale («solo descrizione», «Perché non è un segnale»). Francesco Caruso è citato nella nota del pannello, nella guida `#ath` e nel piè di pagina.
- **Regressioni**: `npm test` 201/201. `v1100.cjs` 0 FAIL, `v1101.cjs` 0 FAIL, `v1110.cjs` 2845 OK e 0 FAIL, `v1120.cjs` 250 OK e 0 FAIL (porta 8811, SHOTS=0 per non toccare `ricerca/qa/1.12.0/shots/`).

## Cosa non ho potuto verificare e perché

- I tooltip nativi (`title`) del computer non compaiono negli screenshot di Playwright: ho controllato solo che il testo ci sia.
- Ho provato solo Chromium, non Safari o Firefox veri, né un iPad reale.
- Non ho fatto girare `uso.cjs` sulla 1.11.0. Il controllo però fallisce davvero: nelle prime corse ha segnalato differenze reali di formato («sotto zero», «finora») prima che correggessi le mie attese, e segnala le sovrapposizioni del rilievo 1.

## Script e screenshot

- `ricerca/qa/1.12.0/uso-testi/uso.cjs` (risultato in `uso.txt` e `uso-info.txt`)
- `ricerca/qa/1.12.0/uso-testi/assi.cjs` (risultato in `assi.txt`)
- `ricerca/qa/1.12.0/uso-testi/lento.cjs` (risultato in `lento.txt`)
- `ricerca/qa/1.12.0/uso-testi/shots/` (linea, pannello, vista0, schede, testata, i-tocco, mancanti, guida, per tutte le larghezze e tutti e due i temi, con CVD a 1440 e 390)

Uso: `BASE=http://127.0.0.1:<porta>/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/uso-testi/uso.cjs`
