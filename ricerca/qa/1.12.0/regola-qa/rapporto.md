# QA indipendente 1.12.0: regola del calo «in corso» (linea del tempo dei massimi)

Commit controllato: `ade9994` (ramo `claude/great-noether-2f1ude`; i commit successivi fino a `b85294d` toccano solo `ricerca/qa/`, i file dell'app sono identici). Confronto negativo su `496178b`. Dati: `data/ath_history.json` di oggi (ultima seduta SPX 20/11/2026). Controllo del 22/11/2026.

## File

- `ricalcolo.py`: ricalcolo da zero in Python (decodifica d0/gaps/cd/ps, massimi di 52 settimane a forza bruta, massimi di ciclo ≥ 15%, conclusi = ultimi 4 recuperati, in corso = non recuperati o, in mancanza, l'ultimo massimo di 52 settimane non superato). Non importa né traduce `js/peaks.js`. `DAILY=1` per ogni seduta dal 2002.
- `app.mjs`: uscita di `timeline()` di `js/peaks.js` sugli stessi tagli, con le serie costruite come `buildTimeline()` di `js/ath-view.js`.
- `confronta.py`: confronto taglio per taglio e controlli del punto 2 (doppi, recuperati «in corso», conclusi non recuperati, record mai superati con calo ≥ 15% assenti).
- `browser.cjs` + `browser.txt`: controllo Playwright scritto da zero (non riusa `regola/in-corso.cjs`), con `page.route` su `data/ath_history.json` per i tagli passati; immagini `oggi-*.png`, `2011-10-03-1440.png`, `2005-06-30-1440.png`, `2003-01-31-1440.png`.
- Uscite: `py.json`, `app.json`, `confronto-ade9994.txt`, `confronto-ade9994-giornaliero.txt`, `app-496178b.json`, `confronto-496178b.txt`.

Per riprodurre (dalla radice):

```
python3 -I ricerca/qa/1.12.0/regola-qa/ricalcolo.py data/ath_history.json > ricerca/qa/1.12.0/regola-qa/py.json
node ricerca/qa/1.12.0/regola-qa/app.mjs . ricerca/qa/1.12.0/regola-qa/py.json > ricerca/qa/1.12.0/regola-qa/app.json
python3 -I ricerca/qa/1.12.0/regola-qa/confronta.py ricerca/qa/1.12.0/regola-qa/py.json ricerca/qa/1.12.0/regola-qa/app.json data/ath_history.json
# negativo: git worktree add /tmp/qa-496178b 496178b; HIST=$PWD/data/ath_history.json node ricerca/qa/1.12.0/regola-qa/app.mjs /tmp/qa-496178b ricerca/qa/1.12.0/regola-qa/py.json > ricerca/qa/1.12.0/regola-qa/app-496178b.json; (confronta come sopra); git worktree remove --force /tmp/qa-496178b
BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/regola-qa/browser.cjs
```

## Controlli

| # | Controllo | Esito |
|---|---|---|
| 1a | 311 tagli (fine mese 01/2002-11/2026 + 15 giorni richiesti + ultima seduta): conclusi (data, calo) e in corso (data, calo «finora» a 0,1) uguali tra Python e `timeline()` | **OK**: 0 differenze |
| 1b | Stesso confronto su ogni seduta dal 02/01/2002 al 20/11/2026 (6263 tagli) | **OK**: 0 differenze |
| 1c | Il confronto può fallire: stessi tagli su `496178b` | **OK** (fallisce come atteso): 52 differenze; al 31/07/2023 l'app vecchia dà in corso 31/07/2023 «al massimo» invece del 03/01/2022 −25,4%; al 30/06/2010 il 2007 risulta «concluso» |
| 1d | Chiusure SPX nel file contro valori ufficiali noti (16 date: 09/10/2007 1565,15; 09/03/2009 676,53; 23/04/2010 1217,28; 30/06/2010 1030,71; 03/01/2022 4796,56; 12/10/2022 3577,03; 19/02/2025 6144,15; 08/04/2025 4982,77 …) e cali ricalcolati a mano (−56,78; −15,33; −16,0; −19,39; −19,78; −33,92; −25,43; −18,90) | **OK** per le date fino al 2025. Le chiusure di ottobre-novembre 2026 (06/10/2026 7818,93; −11,6% al 20/11/2026) **non verificate** con una fonte esterna (solo ricalcolo dal file) |
| 2a | Nessun calo compare due volte; nessun calo «in corso» recuperato; nessun «concluso» non recuperato (tutti i 6263 tagli giornalieri) | **OK**: 0 casi (su `496178b`: 44 tagli con il 2007 «concluso» non recuperato e 52 con cali ≥ 15% non recuperati assenti) |
| 2b | Nessun massimo di 52 settimane non superato con calo successivo ≥ 15% manca dagli «in corso» | **OK**: 0 casi. Unico record non superato con calo ≥ 15% non mostrato: il massimo del 24/03/2000, nei tagli dal 02/01/2002 al 29/05/2007, che non è un massimo di 52 settimane perché il file parte dal 2000 (rilievo M4) |
| 2c | Tagli giornalieri: due «in corso» dal 30/06/2010 al 03/11/2010 (2007 + 23/04/2010) e dall'08/08/2011 al 23/02/2012 (2007 + 29/04/2011); mai tre; zero riquadri dal 02/01/2002 al 29/08/2003 | informativo |
| 3a | Commento di `js/peaks.js`: regola, eccezione «senza cali aperti» e 31/07/2023 corretti | **OK** (vedi M2 per «a giugno 2010») |
| 3b | Guida `#linea-massimi`: regola, esempio 31/07/2023 (riquadro del calo del 2022, −25,4% verificato), esempio 2007 + aprile 2010 | **OK** nella sostanza; M2 e M3 sui dettagli del testo |
| 3c | README (vista 0 Massimi e nota 1.12.0) e `docs/sviluppo.md` coerenti con il codice e tra loro; test citati (31/07/2023, 30/06/2010, 30/03/2012) presenti in `test/peaks.test.js` | **OK** |
| 3d | Intestazione `pkMeta` con 1 in corso (oggi, 2023-07-31, 2013-03-28, 2009-03-09) e 2 in corso (2010-06-30, 2011-10-03) | **OK** il conteggio; M1 per «ultimi 1 cali» e per «cali ≥ 15%: quello in corso» quando il calo è sotto il 15%. Con 0 in corso l'intestazione non compare: si vede il messaggio di M5 |
| 4a | Browser, dati di oggi, 1440 e 390 px, tema scuro e chiaro: 4 conclusi (20/09/2018 −19,8%, 19/02/2020 −33,9%, 03/01/2022 −25,4%, 19/02/2025 −18,9%) e 1 in corso (06/10/2026 −11,6% «in corso»); intestazione «ultimi 4 cali ≥ 15% dell'S&P 500 e quello in corso · chiusure al 20/11/2026»; nessun errore in console; nessuno scorrimento orizzontale | **OK** (16/16) |
| 4b | Browser, tagli passati con `page.route` (31/07/2023, 03/10/2011, 30/06/2010, 28/03/2013, 30/06/2005, 09/03/2009, 31/01/2003), 1440 e 390 px: titoli dei riquadri uguali a quelli attesi da `py.json` | **OK** (28/28) |
| 4c | `regola/in-corso.cjs` dell'autore | letto, non rieseguito (riscrive le immagini in `regola/`); i suoi tre tagli sono coperti da 1a/4b |
| 5 | `npm test` | **OK**: 203 su 203 |

## Rilievi

Nessun rilievo bloccante e nessuno da correggere prima della pubblicazione: la regola è implementata come descritta e con i dati di oggi l'app mostra quello che deve. I rilievi minori sotto riguardano testi e tagli passati che con i dati di oggi non si vedono.

**M1 (minore), intestazione del pannello nei tagli passati.**
(a) Con un solo calo concluso scrive «ultimi 1 cali ≥ 15% dell'S&P 500 e i 2 in corso» (tagli dal 04/11/2010 al 23/02/2012). Il problema c'era già prima della modifica, ma ora si vede insieme ai due riquadri.
(b) Con 0 conclusi e il ripiego sul massimo di 52 settimane scrive «cali ≥ 15% dell'S&P 500: quello in corso» anche se il calo è del 7,2% (30/06/2005; tagli dal 30/09/2003 al 31/12/2007).
È la stessa famiglia del rilievo già annotato in `docs/sviluppo.md` («e quello in corso» non dice che è sotto il 15%, che oggi si vede: −11,6%).
Riproduzione: `browser.cjs`, righe «intestazione» di 2011-10-03 e 2005-06-30 in `browser.txt`; immagini `2011-10-03-1440.png` e `2005-06-30-1440.png`.

**M2 (minore), «a giugno 2010».** Guida, README, commento di `js/peaks.js` e `docs/sviluppo.md` dicono che i riquadri in corso erano due «a giugno 2010». In realtà il massimo del 23/04/2010 diventa massimo di ciclo ≥ 15% solo il 30/06/2010 (1030,71 contro la soglia di 1034,69), cioè l'ultima seduta di giugno. I due riquadri ci sono dal 30/06/2010 al 03/11/2010, e di nuovo dall'08/08/2011 al 23/02/2012 (2007 + 29/04/2011). Suggerimento: «dal 30/06 al 03/11/2010». Riproduzione: `DAILY=1 python3 -I ricalcolo.py data/ath_history.json`, oppure `app.json` giornaliero, chiavi dal 25/06/2010 al 02/07/2010.

**M3 (minore), testi della guida.**
(a) Il primo paragrafo di `#linea-massimi` dice ancora «per gli ultimi 4 cali … e per quello in corso», al singolare. Anche il JSDoc di `timeline()` dice «e quello in corso».
(b) La frase «se l'S&P 500 fa un nuovo massimo, il riquadro riparte da lì» è ambigua con la regola nuova: un nuovo massimo di 52 settimane sotto il massimo di un calo ≥ 15% non recuperato non fa ripartire il riquadro (31/07/2023). Il riquadro riparte solo se l'indice supera il massimo del riquadro. Suggerimento: «se l'S&P 500 supera il massimo del riquadro».

**M4 (minore, limite già noto), calo del 2000 nei tagli dal 2002 al 2007.** Il file parte dal 03/01/2000, quindi il massimo del 24/03/2000 non è un massimo di 52 settimane. Nei tagli dal 02/01/2002 al 29/05/2007 il calo del 2000-2002, mai recuperato fino al 2007, non compare. Al suo posto, dal 30/09/2003, compare come «in corso» l'ultimo massimo di 52 settimane (per esempio 07/03/2005 −7,2%). Con i dati di oggi non si vede. La guida spiega il limite per l'ordine tipico (servono le chiusure del 1999), non per la linea del tempo. Basta saperlo se un giorno si mostrano tagli storici.

**M5 (minore, solo tagli passati), messaggio quando non ci sono riquadri.** Dal 02/01/2002 al 29/08/2003 non c'è nessun massimo di 52 settimane, quindi `timeline()` dà 0 episodi. L'app mostra «Linea del tempo non disponibile: manca lo storico dell'S&P 500 (data/ath_history.json)», ma lo storico c'è. Con i dati di oggi non si vede. Riproduzione: `browser.cjs`, taglio 2003-01-31, immagine `2003-01-31-1440.png`.

**Osservazioni fuori ambito (nessun effetto oggi).**
- `js/ath-view.js` decodifica con `deltaDecode(h.cd, h.ps || 1)`, mentre il formato (e `unpackIndex`) prevede ps assente = 100. Oggi `scripts/fetch_emerging.js` `pack()` scrive sempre ps, quindi l'effetto è nullo.
- Nei casi annidati i riquadri non sono in ordine di data (03/10/2011: 23/04/2010 concluso, poi 09/10/2007 e 29/04/2011 in corso), perché i conclusi vanno prima degli «in corso». È coerente con il test dell'autore e con la regola. Lo segnalo solo per l'uso.

## Verdetto

**GO** per la regola del calo in corso. Il codice coincide con il ricalcolo indipendente in tutti i 6263 tagli giornalieri dal 2002 e il confronto fallisce sul commit precedente. Nessun calo ≥ 15% non recuperato manca, nessuno compare due volte e nessuno recuperato è «in corso». Nel browser oggi si vedono 4 conclusi e 1 in corso (06/10/2026) a 1440 e 390 px, in tema chiaro e scuro, senza errori. I rilievi M1-M5 sono minori e riguardano testi o tagli storici. M2 e M3 sono correzioni di testo da una riga, consigliate prima della pubblicazione ma non necessarie.
