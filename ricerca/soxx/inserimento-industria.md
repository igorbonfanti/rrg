# SOXX come «industria» accanto ai settori: come inserirlo nel codice (verifica preliminare, seconda versione)

Fase di ricerca: questo file non cambia l'app e non è un commit.

**Decisione dell'utente (11/11/2026)**: la vista 6 Indici resta geografica, quindi il SOXX non va lì. Il SOXX è un'«industria» e va trattato insieme ai settori nelle viste 2, 3, 4 e 5 (preferenza dell'utente: insieme, non in una sezione a parte).

**Da dove parte questo piano**:
- il piano precedente `ricerca/soxx/inserimento.md` (strada «indice»): restano validi la fonte delle holdings, i lettori e i controlli fatti;
- la ricerca su dati e backtest `ricerca/soxx/dati/README.md`: 30 titoli dalla lista iShares, breadth con i membri di oggi dal 01/08/2001, 7 zone blu al 3% dal 2002, prezzo dell'ETF SOXX rettificato per i dividendi come gli ETF dei settori.

Le righe citate sono quelle del ramo `claude/great-noether-2f1ude` al commit `4301ed4` (1.8.0).

## 0. Riepilogo

- **Modello**: le chiavi dei settori restano `SECTOR_KEYS` (11, intatte). Le industrie hanno una lista a parte, `INDUSTRY_KEYS`, letta da `config/industries.json`. Ogni funzione sceglie tra:
  - «solo settori»: conteggi «/ 11», statistiche, vista 9, Telegram;
  - «settori e industrie»: righe, punti, chip, dettaglio, vista 5.
- **Dati**: file separati, così un problema del SOXX non blocca mai i settori.
  - `data/industries.json` (prezzo, breadth dal 2001, fotografia dei titoli, lista dei membri), scaricato all'avvio, circa 25 KB compressi;
  - `data/industry_members.json` (vista 5), scaricato alla prima apertura;
  - la serie `SOXX` in `data/capitulation.json`.
  - Uno script notturno nuovo, `scripts/fetch_industries.js`, in un passo che può fallire senza fermare gli altri. La storia si costruisce una volta sola con `scripts/backfill_industries.js` sui dati di `main`.
- **Calendario**: la storia del SOXX parte dal 2001, quella dei settori dal 2004 (prezzi) e dal 2005 (breadth). Nel browser il calendario dei settori si allunga **solo all'indietro**, con valori vuoti per gli 11 settori: i loro numeri non cambiano (test di uguaglianza seduta per seduta).
- **Stima**: circa 5-6,5 giorni con test e controlli.

## 1. Modello

### 1.1 Chiavi

| Dove | Oggi | Proposta |
|---|---|---|
| `js/signals.js:44` | `SECTOR_KEYS` (11) | invariato; più `industryKeys(cfg)` e `bottomKeys(cfg) = [...SECTOR_KEYS, ...industryKeys(cfg)]` |
| `config/industries.json` (nuovo) | — | `{ "SOXX": { "name": "Semiconductors", "label": "Semiconduttori", "parent": "XLK", "etf": "SOXX", "tv": "NASDAQ:SOXX", "holdings": "https://www.ishares.com/us/products/239705/x/latest-holdings.csv", "min": 25, "max": 35, "from": "2001-08-01", "blueSource": "Rea", "telegram": "prova", "note": "…" } }`, con un `_comment` come `config/indices.json` |
| `config/thresholds.json:3-4` | `blue` degli 11 | `"SOXX": 3`: un solo posto per i livelli, così «Copia configurazione» (`js/bottom.js:500-502`) e gli alert futuri lo trovano |

Lista delle industrie letta dalla configurazione, non scritta nel codice: domani un'altra industria (per esempio una sotto XLV) non richiede codice. Un test controlla la coerenza (§6).

### 1.2 Cosa conta «11 settori» e cosa cambia

| Elemento | Proposta | Motivo |
|---|---|---|
| Monitor, riquadri «Settori in zona blu x / 11», «Trigger…», «Settori in attenzione» (`js/bottom.js:230-234`) e «x su 11» (`:238`) | **solo settori**; il SOXX ha la sua riga e, se attivo, la sua scheda tra quelli da osservare con l'etichetta «industria» | «/ 11» resta vero; nessun conteggio misto |
| Statistiche dell'avvicinamento nei testi («50 tocchi su 63», «33 da solo», «17 su 43»: `js/bottom.js:448`, `index.html:841`, `js/signals.js:87`, README:67 e :180, `docs/sviluppo.md:176`, guida) | **solo settori**, con «sugli 11 settori» scritto dove manca | calcolate da `ricerca/attenzione/script/avvicinamento_pit.mjs` sugli 11; il SOXX non ci entra |
| Vista 9 Alert (`renderAlerts`, `js/bottom.js:506-541`): «Zone blu dal 2005», «Trigger dal 2005», «tutti i settori dal 2005», registro | **solo settori** (restano `SECTOR_KEYS`), più una riga: «Il SOXX (industria) ha gli eventi nel suo dettaglio; gli alert sono in prova» | i numeri della vista 9 non cambiano |
| Telegram (`scripts/send_alerts.js:14-35`) | **nessun invio per un mese**: gli eventi del SOXX si registrano in `data/alerts.json` con `prova: true` e la vista 9 li mostra come «solo registrato (prova)»; dopo il mese decide l'utente (`config/industries.json` → `"telegram": "on"`) | stessa cautela degli indici; si ha subito un registro da guardare |
| Macchina a stati, cooldown, riarmo, conferme | **uguali** (`config/thresholds.json` `params`, `runMachine`) | è la regola dei settori; il backtest l'ha usata così |
| Soglia di avvicinamento | **calcolata come per i settori** (`approachSeries`, `js/signals.js:102`): sulla storia di ricerca vale oggi 3 + 27 = 30% (`approachLevel` su `breadth_soxx.json`; settori tra 25,8 e 39,8) | stessa regola; il tooltip **non** cita le statistiche degli 11 settori: dice «statistiche verificate sugli 11 settori, non sul SOXX». Si possono chiedere all'agente del backtest |
| Bottom Map 3: prima settimana del cursore (`FIRST_WEEK`, `js/bottom.js:257`, almeno 6 settori) | **solo settori** | il cursore parte sempre dal 2005 |
| Livello blu nel browser (`validBlue`, `js/bottom.js:80-83`) | settori e industrie | il SOXX si regola come gli altri |

### 1.3 Monitor (vista 1): dentro, in un gruppo separato

**Proposta**: dentro, sotto gli 11 settori.
- Una riga di intestazione «Industria», poi la riga del SOXX, poi la riga SPY come oggi.
- Non entra nell'ordinamento per stato degli 11, così il tabellone dei settori resta quello di sempre.
- Entra nella striscia «cosa è cambiato dall'ultima visita» (`lastVisit` e `renderChanges`, `js/bottom.js:164-194`). Le fotografie salvate prima non hanno il SOXX: il codice lo salta già (`if (!Array.isArray(o)…) continue`).
- Alternativa, se l'utente vuole il Monitor «puro»: SOXX fuori dal Monitor, con un solo rimando nella riga di XLK. Raccomando di metterlo dentro: è lì che si guarda ogni giorno.

## 2. Dati

### 2.1 Perché file separati e non dentro `breadth.json` e `sectors.json`

- `scripts/fetch_breadth.js` costruisce tutto dai membri dell'S&P 500 con il settore GICS:
  - `validateMembers` (riga 81: «non ci sono 11 settori»), `computeCounts` 137-157, `publishable` 163-186 («≤1 mancante per settore»), `capRows` 212;
  - `breadth_latest.json` e `sector_members.json` assegnano un solo settore a ogni titolo (`sector`, `sec`).

  Il SOXX ha 13 titoli fuori dall'S&P 500 e 17 già in XLK: dentro quei file servirebbero casi speciali dappertutto.
- `updateSectors` (righe 318-350) non scrive `sectors.json` se manca anche un solo ETF (`res.some((r) => !r)`) e prende come data la più vecchia tra le ultime. Con il SOXX dentro, un problema del SOXX fermerebbe i prezzi degli 11 settori.
- `breadth.json` parte dal 03/01/2005 e `sectors.json` dal 02/01/2004. La storia del SOXX parte dal 2001: metterla lì vorrebbe dire anteporre quattro anni di valori vuoti a tutte le serie. Quei file li leggono anche `fetch_indices.js` (serie SPX), `send_alerts.js`, le ricostruzioni e gli script di ricerca.
- `breadthSeries` (`js/signals.js:67-80`) allinea **per data**, e la scheda dei cali forti (`js/cap-view.js:158-161`) anche: una fonte con un calendario suo funziona senza toccare quelle funzioni.

### 2.2 File nuovi e formato

**`data/industries.json`**, scaricato all'avvio insieme ai file del Monitor (opzionale: se manca, il SOXX non compare e nessuna vista si rompe):
```
{ generated, asOf,
  dates: { d0, gaps },                       // formato compatto di js/indexdata.js (encodeDates)
  series: { SOXX: {
    adjclose: [...],                         // ETF rettificato per i dividendi, dal 13/07/2001 (deltaEncode)
    max52, max52At,                          // come sectors.json, per «Solo prezzo»
    breadth: { members, n, a20, a50, a200 }, // RLE e array come breadth.json, allineati a dates; null prima di "from"
    latest: { asOf, members: [{ s, name, w, close, d200, d50, dd, up200 }] },   // stessa forma di breadth_latest.json
    list: { asOf, source, count, tickers, changes: [{ date, added, removed }] }  // come data/index_members/*.json
} } }
```
Dimensione stimata 60-80 KB, circa 25 KB compressi.

**`data/industry_members.json`** (vista 5), stesso formato di `sector_members.json` (`asOf`, `dates`, `starts`, `sectors`, `hist`, `stocks`, `weightsAsOf`, `missing`):
- solo la chiave `SOXX`, senza la riga `SPX`;
- `stocks` con `sec: 'SOXX'` e `w` = peso nel SOXX;
- scaricato alla prima apertura della vista 5, insieme a `sector_members.json`.

**`data/capitulation.json`**: la serie `SOXX` (nessun formato nuovo); `check_fresh.js` la controlla già da solo (`capLast`, righe 79-81).

### 2.3 Storia (una volta sola, sui dati di `main`)

`scripts/backfill_industries.js` (Node, nuovo, documentato in testa come gli altri backfill). Usa le funzioni dell'app: `clean` e `countDay` di `scripts/fetch_indices.js`, `countsOn` di `js/capitulation.js`, `buildSectorMembers` di `scripts/lib/capeq.js`, `encodeDates`/`deltaEncode` di `js/indexdata.js`.
1. Lista di oggi dal CSV iShares (`parseIShares`, `scripts/lib/members.js:144`), più nomi e pesi (variante con le colonne `Name` e `Weight (%)`).
2. Prezzi da Yahoo, intera storia: 30 titoli più il SOXX, 31 richieste.
3. Breadth dal `from` con la regola usata dalla ricerca: `countDay`, titoli con meno di 200 sedute contati «sotto», ultima seduta entro 5 giorni.
4. Cali forti su tutte le sedute.
5. `industry_members.json` e `latest`.

Controlli prima della pubblicazione:
- `ricerca/soxx/verifica_app.mjs` confronta la breadth del file con `ricerca/soxx/dati/breadth_soxx.json`: 0 sedute diverse attese;
- le 7 zone blu al 3% della macchina dell'app nel browser uguali a `risultati.json`;
- tutti gli altri file di `data/` identici byte per byte prima e dopo (lo script tocca solo `industries.json`, `industry_members.json` e la serie `SOXX` di `capitulation.json`).

Procedura (eccezione alla regola sui dati, da approvare): worktree di `origin/main`, fuori dagli orari della Action (22:40, 01:10-06:10, 11:40 UTC). Copia dei file dell'app, backfill, controlli, `npm test`, push dei file dell'app e dei tre file di dati nello stesso push.

### 2.4 Ogni notte: `scripts/fetch_industries.js`

1. Lista: CSV iShares → `checkList` (`scripts/fetch_indices.js:61-71`, già esportata) con `min`/`max` della configurazione e l'80% in comune con l'ultima buona, altrimenti si tiene l'ultima. I cambi vanno in `list.changes`. La logica di `loadMembers` (righe 72-97) va estratta in `scripts/lib/members.js` con il percorso del file come parametro, così gli indici e le industrie usano la stessa funzione.
2. Prezzi:
   - SOXX dal 2001: 1 richiesta, chiusure rettificate e non, massimi intraday per `max52` (le stesse funzioni di `updateSectors`: `closeHigh`, `exDates`, `intradayHigh`);
   - 30 titoli, 2 anni e un mese (`SINCE` di `fetch_breadth.js:39`): bastano per la media a 200, per il massimo a 52 settimane e per la vista 5 (`HISTORY` di `capeq.js:24`).
3. Breadth: ricalcolo delle ultime 5 sedute (`RECOMPUTE`). Una seduta si pubblica se è una seduta NYSE (`isTradingDay`) e se al massimo un titolo quotato non ha la chiusura di quel giorno: la stessa tolleranza dei settori («≤1 mancante per settore»). Una seduta incompleta in coda si aspetta; un buco in mezzo si salta (come `publishable`).
4. `latest` dell'ultima seduta pubblicata, con `up200` calcolato come in `countDay`.
5. Serie `SOXX` di `capitulation.json`, sulle sedute ricalcolate (`mergeCap`).
6. `industry_members.json` con `buildSectorMembers({ …, sectors: ['SOXX'], total: false })`. Serve un'opzione nuova: oggi la riga `SPX` si aggiunge sempre (`capeq.js:223`, `[...sectors, 'SPX']`) e sarebbe un «S&P 500» fatto di 30 semiconduttori. Altri dettagli:
   - `life` di tutti `[['0000','9999']]`, cioè membri di oggi;
   - `qty` = `Quantity` delle holdings del SOXX (`parseIvv` le legge già), quindi la linea «cap» sono i pesi veri dell'ETF, con i suoi tetti;
   - `cal` = date del SOXX.
   - Se mancano chiusure di titoli pesanti si tiene il file della sera prima, come `updateSectorMembers` (righe 300-307).
7. Una serie che non arriva, o arriva più vecchia, lascia il file pubblicato com'è (regola di `fetch_emerging.js` e `fetch_vix.js`). Errori e note vanno nel riepilogo della corsa (`::warning::`).

**Costo**: 32 richieste a Yahoo e 1 a iShares, circa 15-20 secondi (`mapLimit` a 3 con 150 ms). Si potrebbero risparmiare 17 richieste mettendo il passo dentro `fetch_breadth.js`, che ha già i prezzi dei membri S&P. Non lo consiglio: il passo separato non può fermare la breadth dei settori.

### 2.5 Workflow e controlli

| File | Righe | Modifica |
|---|---|---|
| `.github/workflows/update-data.yml` | dopo il passo `breadth` | passo «Industrie (SOXX)», `id: industries`, `continue-on-error: true`, `timeout-minutes: 8`; `steps.industries.outcome` nell'«Esito»; «industrie al …» nel messaggio del commit; Telegram dopo il commit come oggi |
| `scripts/check_fresh.js` | 28-44, 86-92 | `industries.json` (4 giorni dalla breadth), lista del SOXX (14 giorni come le liste degli indici), `industry_members.json` (4 giorni) e la data delle holdings (10 giorni, come IVV); i cali forti sono già automatici |
| `scripts/need_update.js` | 19-34, 46-58 | la data di `industries.json` tra quelle che devono avere la seduta attesa: le corse di recupero riprovano finché il SOXX non c'è |
| `scripts/keep_unchanged.js` | — | niente: i file nuovi hanno `generated`; `git add data/` li prende già |

## 3. Le viste

### 3.0 Il calendario del browser (`js/bottom.js:56-61`), il punto tecnico centrale

- `DATES = [...date del SOXX prima di sectors.dates[0], ...sectors.dates]`: si allunga solo all'indietro.
- I prezzi degli 11 settori, di SPY e di RSP prendono davanti tanti `null` quante sono le date aggiunte.
- Il SOXX si allinea per data, come fa `breadthSeries`. Le date del SOXX dopo l'ultima di `sectors.json` non entrano.
- Funzione pura `mergeCalendar(sectors, industries)` in un modulo nuovo `js/industries.js`, provata con `npm test`.
- **Perché i numeri dei settori non cambiano**: `drawdown` e `depthPercentile` (`js/metrics.js:10-36`) saltano i `null` e contano solo le sedute con un prezzo. `breadthSeries` allinea per data. `forward`, `sma` e la macchina lavorano per indice e trovano gli stessi valori.
- Test: per ogni settore, eventi, stati giornalieri, percentili e avvicinamento identici per data con e senza il prefisso.
- **Seduta più recente per chiave**: oggi `NOW` è unica (righe 63-65). Se `industries.json` è indietro di una seduta, il SOXX all'ultima seduta non ha valori. Serve `nowOf(s)` (uguale a `NOW` per i settori) nelle funzioni di ogni chiave: `stateOf`, `approach`, `explain`, le righe del Monitor, `renderSector`. Se il SOXX è indietro, la riga e il dettaglio dicono «SOXX al …».
- I prezzi si leggono da una tabella unica `AC` (settori allungati e SOXX) al posto di `S.adjclose`: righe 60, 199, 219, 444.

### 3.1 Vista 2 Rotazione

- `universe.json`, gruppo «Settori S&P 500» (righe 10-24): `"SOXX": "Semiconductors (industria)"`. Benchmark SPY come gli altri.
  - `fetch_data.js` lo scarica da solo: 1 richiesta, 5 anni, circa +12 KB in `prices.json`.
  - Compare dopo la prima corsa della Action su `main`.
- Il nome del gruppo resta (è salvato nel browser come scelta dell'utente); l'etichetta del grafico è «SOXX», il nome in tabella dice «(industria)».
- `sectorRotation` (`js/app.js:324-331`) usa il gruppo con XLK: la colonna Rotazione del Monitor ha subito anche il SOXX. Ogni coda si calcola solo contro il benchmark, quindi gli 11 non cambiano.
- `test/engine.test.js:7` passa (5 anni di storia).
- Barra dei comandi:
  - `SOXX` apre il dettaglio nella vista 4, come `XLK`, perché `isSector` viene prima di `findSymbol` (`js/app.js:1016`): nessun conflitto con la rotazione;
  - `SOXX TIT` apre i titoli, `SOXX ROT` la rotazione;
  - alias `SEMI` e `SEMICONDUTTORI` tra le parole riconosciute.

### 3.2 Vista 3 Bottom Map

- Il SOXX entra nella mappa: `mapData`, `mapStates`, `mapRings`, `mapTop`, `mapOpts` e la lista delle distanze passano da `SECTOR_KEYS` alle chiavi di settori e industrie (righe 264, 285-286, 319-320, 328). `FIRST_WEEK` resta sui soli settori (riga 257).
- **Punto distinto**: nuova opzione di `drawBottomMap` (`js/bottom-map.js:34`), `shapes: { SOXX: 'diamond' }`.
  - Il rombo è un `path` al posto del `circle` (riga 94), con le stesse classi di stato, lo stesso anello tratteggiato dell'avvicinamento (riga 93) e la stessa etichetta.
  - La vista 6 non passa l'opzione: nessun cambiamento lì.
- Legenda sotto la mappa: «◆ industria (membri di oggi)».
- Tooltip: riga «Industria · storia con i membri di oggi».
- Nella lista delle distanze dal livello blu, il rombo davanti al nome.
- Replay: dal 2005 (cursore dei settori); alle date delle crisi il SOXX c'è; i livelli sono quelli di oggi, come già detto per i settori.

### 3.3 Vista 4 Settore

- **Chip** (riga 418): gli 11 chip, un separatore sottile, l'etichetta «INDUSTRIA» in piccolo, il chip «SOXX» con il pallino dello stato.
- **Dettaglio**: `renderSector` (416-456) funziona per il SOXX se esistono `PX.SOXX`, `BR.SOXX`, `NAMES.SOXX` e `config.blue.SOXX`. Cambiano:
  - **titolo**: «SOXX · Semiconductors (industria)»;
  - **livello blu** (`blueSrc`, righe 437-439): «Livello di partenza indicato da Massimo Rea (quant-rea) per il SOXX. Con 30 titoli il 3% vuol dire nessun titolo sopra la media a 200 sedute: un titolo vale 3,3 punti». `blueInfo` dice già «Con 30 titoli, uno vale 3,3 punti»;
  - **avvicinamento** (riga 448): tooltip per le industrie senza le statistiche degli 11 settori;
  - **link** (riga 453):
    - per il SOXX: «SOXX su TradingView ↗» con `NASDAQ:SOXX` (oggi è scritto `AMEX:` per tutti) e nessuna serie pronta della breadth, più «Settore che la contiene: XLK →» (`#XLK`);
    - per XLK: «Industria nel settore: SOXX, semiconduttori →» (`#SOXX`);
  - **nota sulla qualità della storia**, nuova (paragrafo `secQuality` sotto Situazione, solo per le industrie), con le quattro note obbligatorie di §4.2;
  - **titoli** (`renderMembers`, 458-470): per il SOXX le righe vengono da `industries.json` (`latest`), con la colonna «Peso nel SOXX» e «2 con meno di 200 sedute»;
  - **episodi** (`renderEpisodes`): uguali; il confronto con SPY resta (settore meno SPY → industria meno SPY);
  - **cali forti**: `cap.card('sec', 'SOXX', …)` legge la serie `SOXX`.
- **Grafico**: «MAX» parte dal 2002 per il SOXX (prima seduta con percentile e breadth); per i settori non cambia (`rangeStart`, righe 400-404).
- **Indirizzi**: `#SOXX` e `#tit-SOXX` funzionano quando `isSector` (riga 567) accetta anche le industrie (`routeHash`, `js/app.js:305-313`).

### 3.4 Vista 5 Titoli

- **Dati**: `ensure()` (`js/titles.js:76-80`) scarica anche `industry_members.json`. Funzione pura `mergeTitles(sectorFile, industryFile)` che unisce `sectors`, `hist.sectors` e `stocks` **solo se `asOf`, `dates` e `starts` coincidono**. Altrimenti il chip del SOXX è spento con «dati del SOXX al …, settori al …».
  - I titoli doppi (NVDA in XLK e nel SOXX) non si confondono: bubble e lista filtrano per `sec` (riga 323).
- **Grandi contro piccoli** (`drawSpread`, 123-200):
  - le righe ordinate restano gli 11 (anche i tre anelli della divergenza più ampia);
  - poi «S&P 500» come oggi;
  - poi un separatore «INDUSTRIA» e la riga del SOXX, con scia e riquadro come gli altri.
  - Per il SOXX il pallino pieno sono i **pesi dell'ETF** (con i tetti), non un cap-weighted puro: tooltip e nota lo dicono.
  - `titData` (riga 104): «Pesi IVV al …; SOXX: pesi dell'ETF al …».
- **Storia della divergenza** (`drawHist`, 225-292): funziona; il riferimento tratteggiato resta l'S&P 500.
- **Bubble e «I più in pena»**: funzionano filtrando `sec === 'SOXX'`. Cambiano i testi «peso nell'S&P 500» (riga 448 e legenda) in «peso nel SOXX».
- **Nota obbligatoria**: con i membri di oggi l'equal-weight su YTD e 1 anno risulta più alto del vero (lo dice già il commento di `capeq.js:10-13`).
- **Chip**: come nella vista 4. `SECTORS = Object.keys(ctx.names)` (riga 64) diventa «settori e industrie con i dati». La scelta resta quella della vista 4 (`selectSector` accetta le industrie).

### 3.5 Viste 6, 7, 8 e 9

- Viste 6, 7 e 8: nessun cambiamento.
- Vista 9: vedi §1.2 (statistiche solo settori, eventi del SOXX «in prova» nell'elenco degli invii).

## 4. Testi

### 4.1 Da cambiare (grep fatto)

| Dove | Oggi | Dopo |
|---|---|---|
| `index.html:829`, `guida.html:120` e `:190`, README:14 | «gli 11 settori» | «gli 11 settori e l'industria dei semiconduttori (SOXX)» |
| README:3 e :34, guida (universi della rotazione) | «settori S&P 500 (contro SPY)» | «settori S&P 500 e SOXX» |
| README:62-80, guida `#btm`, `#sec`, `#tit` | descrizione delle viste 3, 4 e 5 | rombo, chip, nota sulla qualità, pesi dell'ETF |
| README:142-156 (tabella dei livelli blu) | 11 righe «200 LEVEL SETTORI» | riga separata «Industria: Semiconduttori (SOXX), 3%, livello di partenza di Massimo Rea (quant-rea)» |
| `js/bottom.js:448`, `index.html:841`, stateLegend (`js/bottom.js:243`), README:67 | statistiche dell'avvicinamento | «sugli 11 settori» esplicito |
| `js/bottom.js:519-523` (vista 9) | «tutti i settori dal 2005» | invariato, più la riga sulle industrie |
| `js/titles.js:2`, `index.html` vista 5 | «dentro i settori S&P 500» | «dentro i settori S&P 500 e il SOXX» |
| README «Architettura» (righe 294-340) e `docs/sviluppo.md` §2-3 e §7 | file e passi | `industries.json`, `industry_members.json`, `fetch_industries.js`, `backfill_industries.js`, `check_fresh` |
| README «Personalizzare» (342-347) | `config/thresholds.json` | anche `config/industries.json` |
| `js/version.js`, `version.json`, nota nel README | 1.8.0 | 1.9.0 |

Restano come sono: «/ 11» nei riquadri del Monitor, i test «11 settori» (`signals.test.js:24`, `capeq.test.js:176`), `fetch_breadth.js:81`, le note di versione passate.

### 4.2 Note obbligatorie nell'app

Nel dettaglio del SOXX, nella guida e nel README.

1. **Membri di oggi**: la storia dal 2001 usa i 30 titoli di oggi (lista iShares). Allora molti non erano quotati: 21 titoli nel 2001, 22 nel 2008, 25 dal 2015. Bias misurato sulle fotografie del SOX: in media da −0,7 a +4,9 punti, vicino ai minimi da −2 a +3 (`ricerca/soxx/dati/`).
2. **Indice cambiato**: fino all'ottobre 2010 il fondo seguiva l'S&P North American Technology-Semiconductors Index, poi il PHLX SOX fino al 21/06/2021, poi il NYSE Semiconductor Index. Le date vengono da una fonte secondaria: nell'app «secondo fonti secondarie» finché non si conferma con il prospetto.
3. **3% = nessun titolo sopra la media**: con 21-30 titoli un titolo vale 3,3-4,8 punti e la breadth salta molto in pochi giorni (dal 56,7% al 3,3% tra il 29/10 e il 05/11/2026).
4. **Titoli quotati da poco contano «sotto»** finché non hanno 200 sedute: oggi SKHY (ADR di SK Hynix, dal 10/07/2026) e CBRS (dal 14/05/2026), fino a circa marzo-aprile 2027; in passato ARM, ALAB, CRDO.
5. In più:
   - 13 titoli su 30 sono fuori dall'S&P 500 (ADR compresi);
   - il 3% è scelto guardando questa storia: 7 zone blu in 6 crisi, numeri indicativi;
   - le statistiche dell'avvicinamento sono degli 11 settori.

## 5. Rischi e casi limite

- **Calendario allungato**: unico rischio sui numeri dei settori; lo copre il test di uguaglianza (§6). Da controllare anche: settimane della Bottom Map (`WEEKS`, riga 256) e prima settimana del cursore (deve restare quella di oggi), zoom (lavora per date), finestra a 5 anni del Monitor (`NOW - 1259`), confronto della vista 9 (`anyCache` dalla prima breadth di ogni settore).
- **`industries.json` assente o rotto**: SOXX invisibile ovunque, nessun errore in console. Il settore salvato nel browser `SOXX` torna a XLU, come per un valore non valido.
- **SOXX indietro o avanti di una seduta rispetto ai settori**: `nowOf(s)` e la data scritta. Le date oltre l'ultima dei settori non entrano.
- **Vista 5 con date diverse tra i due file**: SOXX spento con la spiegazione, mai mescolato.
- **Lista iShares cambiata molto** (più di 6 titoli su 30 in una volta): si tiene l'ultima buona con l'avviso. Ai ribilanciamenti va guardato se il limite dell'80% è troppo stretto.
- **Dimensione all'avvio**: circa +25 KB compressi sul primo disegno.
- **Telegram**: con `prova` nessun messaggio. Un test garantisce che nessun evento del SOXX venga inviato finché il campo non dice `on`.
- **`alerts.json`**: `thresholds` conterrà anche `SOXX`; il registro avrà `sector: 'SOXX'` con `prova: true`; `reconcile` e `newEvents` funzionano per chiave.
- **`capitulation.json`** è scritto da tre script in passi successivi: chiave nuova e nessuna sovrapposizione.
- **Telefono**: un chip in più va a capo; un rombo e un'etichetta in più sulla mappa (le etichette che si toccano sono già un rilievo minore aperto); il separatore del Monitor a schede deve diventare una scheda di intestazione.
- **Prima del backfill**: se i file dell'app arrivano su `main` senza `industries.json`, l'app regge (file opzionale), ma `npm test` sui dati deve richiedere il file solo se `config/industries.json` ha chiavi. Meglio un solo push con dati e codice.

## 6. Test

### `npm test`
- `test/industries.test.js` (nuovo):
  - **configurazione**: ogni chiave di `config/industries.json` ha `blue` in `config/thresholds.json` (intero da 0 a 60), `parent` tra i `SECTOR_KEYS`, nessuna sovrapposizione con i `SECTOR_KEYS`;
  - **`mergeCalendar`** su `data/sectors.json`, `breadth.json` e `industries.json`: per ognuno degli 11 settori `runMachine` (giorni ed eventi), `dp` e `approachSeries`, confrontati **per data**, uguali con e senza il prefisso;
  - **macchina del SOXX** nel calendario unito uguale a quella sul calendario del SOXX: è la base per gli alert futuri;
  - **file**: date in ordine, `n ≤ members`, breadth tra 0 e 100, `latest`: somma di `up200` uguale ad `a200` alla stessa seduta e numero di righe uguale a `n`.
- `scripts/fetch_industries.js`, funzioni pure:
  - sedute pubblicabili («≤1 mancante», attesa in coda, buco saltato);
  - lettura del CSV ridotto in `test/fixtures/` (righe NASDAQ, NYSE, un ADR, Cash e Futures);
  - `checkList` con `min`/`max` del SOXX.
- `test/capeq.test.js`: `buildSectorMembers({ …, total: false })` senza `SPX`; con `total` assente uguale a oggi.
- `mergeTitles`: unisce con date uguali, rifiuta con date diverse; i titoli doppi restano separati per `sec`.
- `test/alerts.test.js`: un evento del SOXX con `telegram: "prova"` finisce nel registro con `prova: true` e nessun invio.
- `test/pipeline.test.js`: `staleData` segnala `industries.json`, la lista e `industry_members.json` fermi; `needUpdate` riprova se il SOXX è indietro.
- Comandi: `SOXX`, `SOXX TIT`, `SEMI` (se la logica viene estratta in una funzione pura).

### Fuori da `npm test`
`ricerca/soxx/verifica_app.mjs`: breadth del file uguale a `breadth_soxx.json`; 7 zone blu al 3% uguali a `risultati.json`; cap del SOXX nella vista 5 contro il rendimento dell'ETF a 1, 3 e 6 mesi (seconda fonte; scarto atteso piccolo per commissioni e cassa, da misurare).

### Playwright, `ricerca/qa/browser/v190.cjs`
Deve fallire sulla 1.8.0. Gira su 1440 scuro, 1280 chiaro, 390 scuro con il tocco, 820.
- **Monitor**: gruppo «Industria» con la riga SOXX dopo gli 11; riquadri ancora «/ 11» con gli stessi numeri della 1.8.0; scheda del SOXX tra quelli da osservare se attivo; sul telefono la scheda di intestazione.
- **Bottom Map**: un `path` a rombo per SOXX con l'etichetta; legenda; tooltip con «industria»; scorciatoia «ott 2022» con il SOXX presente; cursore che parte dalla stessa settimana di prima.
- **Vista 4**: chip dopo il separatore; titolo, 3% con la frase su Rea, «uno vale 3,3 punti», nota sulla qualità con le quattro note, tabella di 30 titoli con il peso, cali forti apribili, link `NASDAQ:SOXX`, link XLK ↔ SOXX in tutte e due le direzioni; `#SOXX` e Indietro.
- **Vista 5**: riga SOXX sotto «S&P 500» con il separatore; ordine degli 11 invariato; bubble del SOXX con «peso nel SOXX»; storia della divergenza.
- **Vista 2**: SOXX nella tabella e nel grafico dei settori.
- **Vista 9**: statistiche identiche alla 1.8.0.
- Console senza errori; regressioni `v091.cjs`, `v095.cjs`, `v130.cjs`, `v180.cjs`.

## 7. Stima e ordine dei passi

| # | Passo | Tempo |
|---|---|---|
| 1 | `config/industries.json`, livello in `thresholds.json`, `industryKeys`, test della configurazione | 2 h |
| 2 | Lettore iShares con nomi e pesi, `loadMembers` condivisa, `buildSectorMembers` con `total: false` | 3 h |
| 3 | `scripts/backfill_industries.js` e `verifica_app.mjs` (sul ramo di sviluppo, con i dati del ramo) | 4 h |
| 4 | `scripts/fetch_industries.js`, workflow, `check_fresh`, `need_update` | 6 h |
| 5 | `js/industries.js` (`mergeCalendar`) e il test di uguaglianza degli 11 settori: **va fatto prima di toccare le viste** | 3 h |
| 6 | `js/bottom.js`: tabella `AC`, `nowOf`, Monitor a gruppi, mappa (con il rombo in `bottom-map.js`), chip e dettaglio, titoli, link | 1-1,5 giorni |
| 7 | `js/titles.js`: `mergeTitles`, riga e separatore, testi | 1 giorno |
| 8 | `universe.json`, comandi, `send_alerts.js` in prova | 3 h |
| 9 | Testi (README, guida, index.html, sviluppo, versione 1.9.0) | 4 h |
| 10 | `v190.cjs`, screenshot, controlli indipendenti (numeri, testi, usabilità su computer e telefono) | 1-1,5 giorni |
| 11 | Pubblicazione con il backfill su `main` (eccezione approvata) e controllo sha1 | 2 h |
| | **Totale** | **circa 5-6,5 giorni** |

## 8. Idea grafica

**Chip** (viste 4 e 5)
- *Computer*: dopo XLU un trattino verticale sottile (`--rule`), poi «INDUSTRIA» in maiuscoletto grigio (stile delle etichette dei grafici), poi il chip «SOXX» con il pallino dello stato. Il chip è identico agli altri, così si sceglie allo stesso modo; il separatore dice che non è un settore GICS.
- *Telefono*: i chip vanno a capo; il gruppo «INDUSTRIA · SOXX» resta unito (`white-space: nowrap` sul gruppo) e scende su una riga sua se non ci sta.

**Monitor**
- *Computer*: sotto gli 11 una riga di intestazione bassa «INDUSTRIA · storia con i membri di oggi» (grigio, come l'intestazione della tabella), poi la riga del SOXX con le stesse colonne; in fondo SPY come oggi.
- *Telefono*: una scheda di intestazione stretta con lo stesso testo, poi la scheda del SOXX uguale alle altre.

**Bottom Map**
- *Computer*: il SOXX è un rombo della stessa grandezza dei pallini, con il colore dello stato, l'anello tratteggiato se è in avvicinamento e la coda di 8 settimane a puntini come gli altri. L'etichetta «SOXX» è normale; la legenda sotto la mappa aggiunge «◆ industria (membri di oggi)».
- *Telefono*: lo stesso rombo; il primo tocco mostra il tooltip con la riga «Industria · membri di oggi», il secondo apre il dettaglio.

**Vista 5 Titoli**
- *Grandi contro piccoli*: dopo la riga «S&P 500» un filetto orizzontale con «INDUSTRIA» a sinistra in piccolo, poi la riga «SOXX · Semiconduttori» con il pallino pieno (pesi dell'ETF) e quello vuoto (equal-weight), la barra della divergenza e la scia come le altre righe. Nel tooltip «pallino pieno: pesi dell'ETF SOXX (con i tetti)».
- *Bubble del SOXX*: bolle proporzionali al peso nel SOXX; in rosso gli 8 più in pena come oggi. Sotto il titolo la nota breve: «membri di oggi: su YTD e 1 anno l'equal-weight è più alto del vero».
- *Telefono*: la riga del SOXX in fondo al dumbbell, sotto il filetto; il nome breve «SOXX» quando il grafico è stretto, come già per gli altri.

**Collegamento XLK ↔ SOXX** (vista 4): nella Situazione, sotto i link a TradingView, un link-pulsante:
- su XLK «Industria nel settore: SOXX · Semiconduttori →», con il pallino dello stato del SOXX;
- sul SOXX «Settore che la contiene: XLK · Technology →».

Sul telefono il link è alto almeno 44 px.

## 9. Raccomandazione

Procedere con questo modello: industria accanto ai settori nelle viste 1-5, con i file e il passo notturno separati, il calendario allungato solo all'indietro e verificato, le statistiche e i conteggi «11» solo sui settori, Telegram in prova per un mese, le note obbligatorie nel dettaglio.

**Decisioni ancora aperte per l'utente**
1. Monitor: SOXX dentro, in un gruppo sotto gli 11 (consigliato), oppure fuori con un rimando in XLK.
2. Telegram: un mese in prova, con gli eventi registrati ma non inviati (consigliato), oppure subito, oppure mai.
3. Storia dal 2001 con il calendario allungato (consigliato: tiene la zona blu del 2002 e i percentili del backtest), oppure dal 2004-2005 come i settori: perde la zona blu del 2002 e cambiano i percentili, quindi il backtest va rifatto.
4. Avvicinamento del SOXX: calcolato come per i settori, senza statistiche proprie (consigliato), oppure con statistiche proprie chieste al backtest, oppure spento.
5. Vista 5: pesi dell'ETF come linea «cap» (consigliato: è il SOXX vero) oppure un cap-weighted puro (servirebbero i valori di mercato di ogni titolo, che il CSV non dà).
6. Ricostruzione della storia sui dati di `main` come eccezione una tantum alla regola sui dati.
7. Le date del cambio di indice (2010, 2021) da confermare con il prospetto, oppure scritte come «secondo fonti secondarie».
