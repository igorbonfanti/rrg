# Oscillatori mensili sull'S&P 500: dati e inserimento nel codice

Fase di ricerca del 12/11/2026 (ramo `claude/great-noether-2f1ude`): **non modifica l'app**. Le formule degli oscillatori
non sono ancora note: qui si stimano dati e lavoro con oscillatori generici (Coppock, KST mensile di Pring, MACD e RSI
mensili). Ogni numero viene da `dati.mjs` (uscita in `dati.out.txt`) o da `mese_in_corso.mjs` (`mese_in_corso.out.txt`).

## 1. Dati

### 1.1 Cosa c'è già

| File | Serie | Da | Tipo | Fonte |
|---|---|---|---|---|
| `data/vix.json` → `series.SPX` | S&P 500 `^GSPC` | **02/01/1990** | giornaliera, solo prezzo | Yahoo (`scripts/fetch_vix.js:211-214`, `SINCE` a `:37`) |
| `data/vix.json` → `series.NDX` | Nasdaq-100 `^NDX` | 02/01/1990 | giornaliera, solo prezzo | Yahoo |
| `data/vix.json` → `series.VIX` | VIX di chiusura | **02/01/1990** | giornaliera | FRED `VIXCLS` (= Cboe), coda Cboe/Yahoo provvisoria (`:172-205`) |
| `data/indices.json` → `series.SPX` | S&P 500 `^GSPC` | 03/01/2000 | giornaliera, solo prezzo | Yahoo (`scripts/fetch_indices.js`) |
| `data/prices.json` | SPY, non l'indice | 5 anni | rettificata | Yahoo |

- **La serie migliore è `data/vix.json` SPX**: 9.283 sedute dal 02/01/1990 al 10/11/2026. Coincide con
  `data/indices.json` su tutte le 6.755 sedute comuni dal 2000 (0 differenze oltre 0,005 punti). Total return non c'è
  nell'app (Yahoo ha `^SP500TR` dal 1988, copia in `ricerca/vix/cache/_SP500TR.json`); gli oscillatori classici si
  calcolano sul prezzo.
- `data/sp500_history.json` **non** è una serie di prezzi: sono i cambi di composizione da Wikipedia (dal 2024).
- **VIX dal 02/01/1990**: copre il segnale del 1998. 3 sedute dell'S&P 500 senza VIX (01/03/1991, 31/01/1997,
  26/11/1997), che restano «—».
- Buchi giornalieri oltre 4 giorni: solo chiusure vere (11/09/2001, funerale di Ford 02/01/2007, uragano Sandy 2012).

### 1.2 Chiusure mensili (ultima seduta del mese)

- **443 mesi, dal 1990-01 al 2026-11**, nessun mese mancante. Sedute per mese chiuso: da 15 a 23.
- **Mese in corso**: 2026-11 non è chiuso (ultima seduta nei dati 10/11, ultima attesa 30/11, 7 sedute finora).
- In tutti i 442 mesi chiusi l'ultima seduta nei dati è l'ultima seduta NYSE di `js/calendar.js`.
- Regola usata per «mese chiuso»: l'ultima seduta del mese nei dati è ≥ l'ultima seduta NYSE del mese, oppure i dati
  arrivano già oltre quella data (copre una chiusura straordinaria a fine mese, che il calendario non conosce).
  `js/calendar.js` tratta come festivi i Martin Luther King Day 1990-1997, quando la NYSE era aperta: per la fine del
  mese non conta.

### 1.3 Confronto con fonti indipendenti

- **Cboe `SPX_History.csv`** (file pubblico di Cboe, stesso host già usato per il VIX; S&P 500 giornaliero dal 1975):
  442 mesi chiusi confrontati, **11 chiusure diverse** oltre 0,005 punti. Nove sono di 0,01-0,04 punti; 1997-02
  differisce di 0,034% (790,82 contro 791,09); **2019-02 di 0,28%** (Yahoo 2.784,49, Cboe 2.792,38): qui FRED dà
  ragione a Yahoo, l'errore è nel file di Cboe. Cboe non ha il 31/12/1999 (lo stesso buco del suo file del VIX), quindi
  per 1999-12 la sua «ultima seduta» è il 30/12.
- **FRED `SP500`**: solo gli ultimi 10 anni per la licenza S&P (dal 11/11/2016): 120 mesi, **0 differenze**.
- **Stooq** non risponde da qui (connessione rifiutata; secondo `ricerca/indici/fonti-dati.md:93` vuole JavaScript);
  TradingView e StockCharts esclusi dalle regole.
- Conclusione: le chiusure mensili di `data/vix.json` sono confermate da due fonti indipendenti (FRED dal 2016, Cboe
  dal 1990, con un solo scarto rilevante, sbagliato in Cboe).

### 1.4 VIX: massimi di chiusura per anno 1998-2022

Da `dati.out.txt` (FRED `VIXCLS`, uguale al massimo di chiusura del file di Cboe in tutti i 25 anni):

| Anno | Max | Data | | Anno | Max | Data |
|---|---:|---|---|---|---:|---|
| 1998 | 45,74 | 08/10 | | 2011 | 48,00 | 08/08 |
| 1999 | 32,98 | 14/01 | | 2012 | 26,66 | 01/06 |
| 2000 | 33,49 | 14/04 | | 2013 | 20,49 | 20/06 |
| 2001 | 43,74 | 20/09 | | 2014 | 26,25 | 15/10 |
| 2002 | 45,08 | 05/08 | | 2015 | 40,74 | 24/08 |
| 2003 | 34,69 | 27/01 | | 2016 | 28,14 | 11/02 |
| 2004 | 21,58 | 22/03 | | 2017 | 16,04 | 10/08 |
| 2005 | 17,74 | 15/04 | | 2018 | 37,32 | 05/02 |
| 2006 | 23,81 | 13/06 | | 2019 | 25,45 | 03/01 |
| 2007 | 31,09 | 12/11 | | 2020 | 82,69 | 16/03 |
| 2008 | 80,86 | 20/11 | | 2021 | 37,21 | 27/01 |
| 2009 | 56,65 | 20/01 | | 2022 | 36,45 | 07/03 |
| 2010 | 45,79 | 20/05 | | | | |

**Chiusura, non intraday.** Il massimo intraday esiste solo nel file di Cboe (1990-1991 solo chiusura) e ha valori
sospetti: 36,55 nel 2004 e 36,56 nel 2005, quando la chiusura più alta dell'anno è 21,58 e 17,74. Per la tabella «picco
del VIX dopo il segnale» si propone la **chiusura** (FRED, già nell'app); se l'utente vuole l'intraday va detto e
verificato a parte (2018: 37,32 in chiusura, 50,30 intraday).

### 1.5 Storia sufficiente?

Primo mese con un valore partendo dal 1990-01 (oscillatori generici):

- Coppock (ROC 14 + ROC 11, WMA 10): **1991-12** (24 mesi);
- KST mensile (ROC 9/12/18/24, medie 6/6/6/9): 1992-09; linea di segnale SMA 9: **1993-05** (41 mesi);
- MACD 12/26/9 e RSI 14 mensili: medie esponenziali, primo valore dopo 26 (+9) e 15 mesi; dal 1990 al 1996 il seme
  pesa ormai poco.

Per segnali dal 1996-1998 **bastano i dati che l'app ha già**. Serve più storia solo se una formula usa finestre di
oltre ~5 anni o se si vogliono segnali prima del 1995 (bear market del 1990). In quel caso:

- **Yahoo `^GSPC` dal 02/01/1985** (copia in `ricerca/vix/cache/_GSPC.json`), **Cboe `SPX_History.csv` dal 1975**.
- Nella pipeline **non** si allunga `series.SPX` di `data/vix.json` (cambierebbe la vista VIX: `align` usa le date
  dell'indice, il grafico «MAX» partirebbe dal 1985 senza VIX, la realizzata cambierebbe inizio). Meglio una serie
  facoltativa nuova, per esempio `series.SPXM` = chiusure mensili dal 1985 (o 1975) in `scripts/fetch_vix.js`
  (aggiungerla a `OPTIONAL` a `:41`, un'altra richiesta a Yahoo con `period1` del 1985, ~450-610 numeri). Attenzione:
  `encodeDates` (`js/indexdata.js:20`) accetta salti fino a 35 giorni; tra due ultime sedute di mese si arriva a 33-35:
  per una serie mensile meglio un formato a mesi (`m0` + `cd`).

## 2. Inserimento nel codice

### 2.1 Come sono fatte le viste

- **Ordine e tasti**: `js/app.js:19` `VIEWS = ['mon','rrg','btm','sec','tit','idx','emg','vix','alr']`, tasti 1-9 in
  `js/app.js:999-1000` (`const idx = +e.key - 1; if (VIEWS[idx]) setView(...)`). **Le cifre sono finite**: una decima
  vista vuole il tasto `0` (oggi `'0' - 1 = -1`, nessuna vista).
- **Schede**: `index.html:81-90` (`<button role="tab" id="tab-…" data-view="…">8 VIX</button>`), sezioni
  `<section class="view" id="v-…">` (VIX `index.html:439-491`, Alert `:493`).
- **Creazione**: import `js/app.js:8`, `createVix({ $, store, load })` a `:275`, `state.vix.bind()` a `:292`.
- **Instradamento**: `routeHash` `js/app.js:309-318` (indirizzo `#vix`), `renderAll` `:382-393`, `setView` `:802-817`,
  `syncHash` `:821-825`.
- **Barra dei comandi**: dizionario `words` a `js/app.js:1015` (VIX, VOLATILITA…).
- **Guida rapida**: elenco delle viste `index.html:834-843`, tasti `index.html:876` («1–9 viste»); link alla guida
  completa per vista `js/app.js:861` (`guida.html#` + id della vista).
- **Guida completa**: indice `guida.html:90-100`, sezioni `id="vix"` `guida.html:392`, `id="alr"` `:422`, tasti `:452`.
- **CSS delle schede**: `css/style.css:89-114`; tablet 5 colonne (`:101-105`), telefono 3 colonne (`:106-114`, commento
  «nove schede su tre righe di tre»).

### 2.2 Modello più vicino: `js/vix-view.js`

Ha già tutto quello che serve: dati caricati alla prima apertura (`ensure`, `:31-37`), `build()` con i calcoli in un
modulo puro (`js/vix.js`), riquadri in alto (`renderKpis` `:68-82`), tabella per eventi con mini-grafici, grafico a
pannelli impilati con asse del tempo, linea verticale e riquadro dei valori (`renderChart` `:258-394`: array `P` dei
pannelli, `timeTicks`, `bindTip`, `placeTip`), periodi 3A/10A/MAX e zoom (`bind` `:396-404`). La nuova pagina è un
sottoinsieme: pannello dell'indice (log) + 2 pannelli oscillatore + tabella dei segnali. `js/emerging-view.js` serve
solo se si vogliono altri indici (usa `indices.ensureAll()` e `indices.snapshot(k)`, `:45`, `:71`).

- **Zoom** (`js/zoom.js`): `zoomGroup(key, { lens, chips, back, onChange })`, poi `zoom.time(t0, t1, dates)` per i grafici
  per data e `zoom.geo(svg, { L, PW, top, bottom, t0, t1, dates })`; minimo 10 punti (`MIN_SESSIONS`, `:20`): con dati
  mensili vuol dire 10 mesi, va bene.
- **Riquadro dei valori**: `bindTip(target, svg, show, hide)` (`js/format.js:49-55`): mouse, tocco, chiusura toccando
  fuori, niente riquadro durante la selezione dello zoom.
- **Temi**: i colori stanno solo nel CSS (classi sugli elementi SVG, variabili in `:root` e `:root[data-theme="light"]`,
  `css/style.css:527`); il cambio di tema non ridisegna nulla. Le classi nuove (linee degli oscillatori, punti del
  segnale, punto provvisorio) vanno definite con le variabili, anche per `.cvd` (daltonici, `:542`).
- **Test**: `npm test` = `node --test` su `test/*.test.js`; `test/syntax.test.js` controlla la sintassi di tutto `js/`;
  `test/vix.test.js` usa la fixture congelata `test/fixtures/vix_1990_2025.json` (VIX, SPX, NDX dal 1990 al
  31/12/2025: mesi tutti chiusi, ideale anche per gli oscillatori).
- **Controlli nel browser**: `ricerca/qa/browser/v191.cjs` come modello (Playwright, 1440 scuro, 1280 chiaro, 390
  telefono scuro, errori in console, niente scorrimento orizzontale).
- **Versione**: `js/version.js:8-10` (`VERSION`, `RELEASE`, `NOTES` in cima) e `version.json` insieme; nota nel
  `README.md` sezione «Versioni» (`:168`). Una vista nuova = versione minore (1.10.0).

### 2.3 Piano proposto

**Dove calcolare: nel browser, dai dati che ci sono già** (`data/vix.json`, 253 KB, 79 KB compresso, già scaricato dalla
vista VIX). Nessun passo nuovo nella Action finché la storia dal 1990 basta (§1.5). Le chiusure mensili si derivano
dalle giornaliere in un modulo puro: un solo calcolo, provato dai test, uguale per app e ricerca.

File nuovi:

1. `js/oscillators.js` (puro, niente DOM, come `js/vix.js`):
   - `monthly(dates, close, lastData)` → `[{ m, date, close, closed, sessions }]` con la regola del §1.2 (usa
     `NYSE.isTradingDay` di `js/calendar.js`);
   - le due formule (quando l'altro agente le avrà trovate), su `close` mensili, `null` finché non c'è storia;
   - `turns(osc1, osc2, months, { zone })` → segnali solo sui **mesi chiusi** («entrambi girano al ribasso da zona
     alta»: definizione esatta da decidere con l'utente, è una regola nuova);
   - `vixAfter(signal, vixDaily, h)` → massimo di chiusura del VIX dalla seduta dopo la fine del mese del segnale per h
     mesi, con la data e un flag `partial` se la finestra non è finita (come `outcomes` in `js/vix.js:72-82`);
     eventualmente anche il calo dell'indice nello stesso periodo.
2. `js/osc-view.js`: `createOsc({ $, store, load })` sul modello di `vix-view.js`: riquadri (valori dell'ultimo mese
   chiuso e del mese in corso), grafico a 3 pannelli (S&P 500 mensile in scala log con le fasce dei segnali, oscillatore
   1, oscillatore 2, con zone alte tratteggiate), tabella dei segnali (data, valori, picco del VIX e data, calo
   dell'indice, «in corso»), testo «Come leggere» e fonti (citare l'autore dell'idea; se è Massimo Rea, citarlo come
   nelle altre viste).
3. `test/oscillators.test.js`: casi sintetici (mese chiuso/aperto, festa a fine mese, `null` iniziali, segnale in
   finestra non finita) e valori attesi sulla fixture 1990-2025 ricalcolati da uno script di `ricerca/oscillatori/`
   scritto a parte (come `ricerca/vix/verifica_app.mjs`).
4. `ricerca/qa/browser/v1100.cjs` (o il numero della versione): vista aperta da tasto, scheda, comando e `#osc`; tre
   pannelli e tabella non vuoti; punto provvisorio; riquadro dei valori; zoom; due temi; telefono senza scorrimento
   orizzontale; nessun errore in console.

File toccati:

- `js/app.js`: import (`:8`); `VIEWS` (`:19`), con la nuova vista prima di `alr` come fu per il VIX nella 1.5.0;
  `createOsc` e `bind` (`:275`, `:292`); `renderAll` (`:392`); tasto `0` (`:999`: `const idx = e.key === '0' ? 9 : +e.key - 1`);
  `words` (`:1015`: `OSC`, `OSCILLATORI`…); un caricatore condiviso di `data/vix.json` per non scaricarlo due volte
  (oggi `load: () => getJSON('data/vix.json', false, true)` a `:275` lo richiede a ogni chiamata).
- `index.html`: nuova scheda e sezione `v-osc` (`:81-90`, dopo `:491`), Alert rinumerata (`10 Alert`, tasto 0), guida
  rapida (`:834-843`, `:876` «1–9 e 0»).
- `css/style.css`: classi del grafico; schede sul telefono (`:106-114`): con 10 schede la griglia a 3 colonne lascia una
  scheda sola sulla quarta riga; meglio 5 colonne × 2 righe con un nome corto («9 Oscill.» o un nome scelto
  dall'utente), da provare a 390 px.
- `guida.html`: indice (`:90-100`), sezione `id="osc"`, Alert «10», tasti (`:452`).
- `js/version.js`, `version.json`, `README.md` (Viste, Versioni, Architettura), `docs/sviluppo.md` (stato).
- `.github/workflows/update-data.yml`: **niente** con l'opzione browser; solo il commento del passo VIX (`:82-83`) se il
  file serve anche alla nuova vista.

Se servisse la storia dal 1985 (§1.5): `scripts/fetch_vix.js` (serie facoltativa `SPXM`), `test/vix_struttura.test.js`
o un test nuovo per `assemble`, `scripts/check_fresh.js:56-61` (età della serie), README.

### 2.4 Mese in corso: come mostrarlo onestamente

Il valore dell'ultimo mese cambia a ogni seduta fino all'ultima del mese. Con oscillatori generici, dal 1994
(`mese_in_corso.mjs`): la **direzione** rispetto al mese prima calcolata alla 5ª, 10ª e 15ª seduta è diversa da quella
di fine mese in 44, 36 e 33 mesi su 394 per il Coppock (11,2%, 9,1%, 8,4%) e in 37, 37 e 24 su 394 per il KST (9,4%,
9,4%, 6,1%). Da rifare con le formule vere. Proposta:

- segnali e tabella **solo sui mesi chiusi**;
- il mese in corso come punto vuoto (come il punto «provvisorio» della Rotazione) con l'etichetta «provvisorio, al
  gg/mm, n sedute su N»; nel riquadro in alto «se il mese chiudesse oggi: …», mai come segnale;
- una nota che dice che un segnale si conferma solo con la chiusura dell'ultima seduta del mese;
- se il VIX dell'ultima seduta è provvisorio (dopo l'ultimo FRED), la tabella lo dice come la vista VIX.

### 2.5 Casi limite

- Fine mese con borsa chiusa per un evento straordinario: il mese risulta aperto finché non arriva la seduta del mese
  dopo (regola del §1.2), mai «chiuso» con una seduta mancante.
- File `data/vix.json` non arrivato o senza `SPX`: messaggio come `vxMiss`, nessun valore di riempimento.
- Segnale negli ultimi mesi: picco del VIX «finora» con asterisco, come gli episodi in corso del VIX.
- 3 sedute senza VIX (1991, 1997): il massimo del periodo le salta; non vanno riempite.
- Solo prezzo: i dividendi non entrano (va detto, come nella vista VIX).
- I segnali dipendono da regole nuove (zona alta, «girano al ribasso»): vanno decisi con l'utente prima del codice e
  provati con un backtest (skill `sviluppo-app-finanziarie`); con pochi bear market dal 1996 i casi saranno pochi.

## 3. Altri indici (vista 6)

- **Nasdaq-100: costo quasi nullo**, è già in `data/vix.json` dal 1990 (stessa fonte, stesso file). Il VIX però è la
  volatilità dell'S&P 500; per il Nasdaq-100 il suo indice (VXN, FRED `VXNCLS` dal 2001) non è nell'app.
- **Gli altri 20 indici** hanno le chiusure in `data/indices.json` e `data/indices_more.json` (842 + 936 KB, 294 + 298 KB
  compressi), ma solo dal 2000 (STOXX 600 dal 2004, Euro STOXX 50 e Nifty dal 2007, CSI 300 come ETF dal 2012, EEM come
  ETF dal 2003). Con 24-41 mesi di riscaldamento gli oscillatori partono dal 2002-2003 (dal 2015 per il CSI 300): fuori
  il bear market 2000-2002 per quasi tutti, quindi pochissimi segnali e per alcuni nessuno. Si potrebbero leggere con
  `indices.ensureAll()` + `snapshot(k).close` come fa la vista 7, ma caricarli costa ~1,8 MB e il calcolo della vista 6
  per tutti gli indici.
- Storia più lunga per questi indici: Yahoo ha molti indici da prima del 2000 (`^DJI` solo dal 1992, vedi
  `ricerca/indici/fonti-dati.md:93`); servirebbe una serie mensile nuova nella pipeline (una richiesta per indice), da
  verificare indice per indice. Per la tabella del VIX servirebbe una volatilità implicita per ogni mercato (VSTOXX,
  VXN…), che l'app non ha: per gli altri indici la tabella mostrerebbe solo il calo dell'indice.
- Proposta: prima solo S&P 500 (eventualmente Nasdaq-100 con un selettore come `#vxIx`), poi, se l'idea regge, gli altri
  indici con una serie mensile lunga dedicata.

## File di questa ricerca

- `dati.mjs` (`node ricerca/oscillatori/dati.mjs [--offline]`) → `dati.out.txt`, `cache/spx_mensile.json` (mesi,
  chiusura, mese chiuso, massimo di chiusura del VIX nel mese), copie `cache/SPX_History.csv`, `cache/VIX_History.csv`.
- `mese_in_corso.mjs` → `mese_in_corso.out.txt`.
