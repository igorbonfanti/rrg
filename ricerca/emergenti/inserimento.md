# Vista «Emergenti»: come inserirla nel codice (verifica preliminare)

Fase di verifica: questo file non cambia l'app. È il piano per la sessione che scriverà il codice, quando arriveranno le regole definitive dal backtest separato.
Letti: `CLAUDE.md`, `docs/sviluppo.md`, `README.md`, `index.html`, `css/style.css` (parti), `js/app.js`, `js/indices.js`, `js/bottom.js`, `js/signals.js`, `js/indexdata.js`, `js/format.js`, `js/*-chart.js`, `scripts/fetch_data.js`, `scripts/fetch_indices.js`, `scripts/check_fresh.js`, `scripts/keep_unchanged.js`, `scripts/need_update.js`, `.github/workflows/update-data.yml`, `config/indices.json`, `universe.json`, `test/`, `ricerca/qa/browser/`.
Le righe citate (file:riga) sono quelle del ramo `claude/great-noether-2f1ude` al commit `afd19d5`.

## 0. Stato del ramo e incongruenze notate

- **Versione**: `js/version.js` 1.3.4 del 31/10/2026, uguale a `version.json`. Ultima nota: bias dei membri di oggi ricalcolato con la regola dell'app (+3,6 punti invece di +4,5). Albero di lavoro pulito, ramo allineato a `origin`.
- **Dati del ramo**: fermi al 30/10/2026 (`prices.json`, `prices_macro.json`). È normale: i dati veri li aggiorna la Action su `main`. Per le prove nel browser servono i dati di `main`.
- **Incongruenze, tutte minori, da correggere quando si tocca il file**:
  - `docs/sviluppo.md:3` dice «Aggiornato al 18/10/2026, versione 0.9.0»; il titolo del §7 dice «Stato attuale (1.0.0)», ma il testo arriva alla 1.3.4.
  - `docs/sviluppo.md` §7: «104 test»; oggi `npm test` ne conta 112 (`grep -c "^test(" test/*.js`).
  - `js/app.js:1`: il commento elenca le viste senza Titoli (vista 7).
  - `css/style.css:99`: «le cinque schede vanno su due righe»; le schede sono 7 (con questa vista 8).
  - `docs/sviluppo.md` §7: «Passo 4: di nuovo i 5 controlli, poi 1.0.0» è superato.
- **Cose utili già presenti**:
  - ACWI in dollari c'è già in `data/prices.json` (benchmark di `universe.json:7`, 5 anni).
  - Il gruppo «4 · Paesi» di `prices_global.json` ha già Cina, India, Taiwan, Corea e Brasile in ETF UCITS in euro. La forza relativa in euro contro un ETF mondiale in euro è uguale a quella in dollari (il cambio euro/dollaro si annulla nel rapporto). Ma la storia è di 5 anni, sul calendario di Milano, e SWDA non è ACWI.
- **Fonti controllate oggi (05/11/2026)**:
  - FRED `DTWEXEMEGS`: ultimo valore al 30/10/2026. FRED lo pubblica una volta alla settimana (rilascio H.10, di solito il lunedì): il ritardo va da 3 a circa 10 giorni.
  - Yahoo: `CNY=X`, `INR=X`, `BRL=X`, `KRW=X`, `TWD=X`, `HKD=X` hanno `instrumentType: CURRENCY`, fuso Europe/London, una barra per ogni giorno feriale, compresa quella di oggi ancora aperta. Le quotazioni sono in valuta locale per un dollaro: se il numero sale, la valuta locale si indebolisce. HKD resta tra 7,84 e 7,85, perché è agganciato al dollaro.

## 1. Vista nuova o estensione della vista 6?

**Raccomandazione: una vista nuova, «8 Emergenti» (`#emg`).** Lo stato della macchina va preso dalla vista 6 (stesso codice, stessi livelli blu anche se modificati nel browser), senza ricalcolarlo da capo.

Perché:
1. **Peso della vista 6**: oggi ha tabellone, Bottom Map con replay, dettaglio a tre pannelli, cali forti, episodi e livello blu regolabile, su 22 indici (`js/indices.js`, 489 righe). Uno strato macro per 7 indici su 22 la renderebbe più lunga per tutti, anche per chi guarda DAX o S&P 500.
2. **Caricamento pigro**: il file nuovo (`data/emerging.json`) si scarica solo alla prima apertura della vista 8, come `indices.json`, `sector_members.json` e `capitulation.json`. Chi non apre la vista non paga nulla. L'avvio in due tempi (`app.js:94-108`) non cambia.
3. **URL e cronologia**: `#emg` e `#emg-KOSPI200` (vista con l'indice scelto), sul modello di `#tit-XLK` (`app.js:291-298`, `app.js:796-800`). Il tasto Indietro funziona come nelle altre viste.
4. **Coerenza con le viste esistenti**: Monitor/Settore e Indici seguono già lo schema «tabellone → dettaglio». La vista 8 ripete lo stesso schema (KPI, tabellone a schede sul telefono, dettaglio con grafico a pannelli e linea condivisa) e usa la stessa rotazione (RS-Ratio e RS-Momentum, `engine.js`).
5. **Due uscite possibili**: nella vista nuova si può partire da un pannello di contesto e, se il backtest lo giustifica, aggiungere una colonna «regola» senza toccare la macchina a stati della vista 6 (vedi §3.4).

Collegamenti tra le due viste (piccoli, nella vista 6):
- nel dettaglio di uno dei 7 indici, un link «Cambio e dollaro: vista Emergenti» in `#ixLinks` (`indices.js:405`);
- nella vista 8, un clic sul nome dell'indice apre la vista 6 su quell'indice (`state.indices.open(k)` + `setView('idx')`, come nella barra comandi, `app.js:1003-1006`).

Alternativa scartata: una scheda dentro il dettaglio della vista 6 (come «Cali forti»). Costa meno in navigazione, ma non c'è posto per un confronto tra i 7 paesi (tabellone e dollaro emergente comune). E i dati macro arriverebbero in mezzo a un dettaglio che serve 22 indici.

### Modifiche alla navigazione (`js/app.js`)
- `app.js:16` `VIEWS`: aggiungere `'emg'` **in fondo**, così i tasti 1-7 non cambiano e la vista 8 si apre con il tasto `8` (`app.js:972`).
- `app.js:987` `words`: `EMG`, `EMERGENTI`. Facoltativo: `KOSPI EMG` sul modello di `XLK TIT` (`app.js:993-999`).
- `app.js:291` `routeHash`: riconoscere `EMG-<indice>`.
- `app.js:796` `syncHash`: `v === 'emg' ? '#emg-' + sel : …`, con `pushState` anche quando cambia l'indice (come `sec` e `tit`).
- `app.js:362-371` `renderAll`: `else if (state.view === 'emg') state.emerging.render()`.
- `app.js:260-261`: creare la vista solo se c'è `config/indices.json`; altrimenti nascondere `#tab-emg`, come `#tab-idx`.
- `app.js:75` `SHAPE`: `'data/emerging.json': ['series']` (ed eventualmente `'config/emerging.json': ['indices']`).
- `index.html:74-81`: bottone `tab-emg` «8 Emergenti»; `index.html` dopo la riga 597: `<section class="view" id="v-emg" role="tabpanel" aria-labelledby="tab-emg" hidden>`.
- `app.js:836` (link alla guida): `guida.html#emg` funziona da solo se la sezione ha `id="emg"`.

### Stato della macchina: un'API nuova in `js/indices.js`
Oggi tutto è chiuso dentro `createIndices` (`S`, `PX`, `machine`, `stateOf`, `approach`, `st.blue`). Se la vista 8 ricalcolasse per conto suo, con un livello blu cambiato nel browser le due viste mostrerebbero stati diversi. Proposta (`indices.js:483-488`):
- `ensureAll()`: aspetta `indices.json` **e** `indices_more.json`. Oggi il secondo file parte solo da `render()` (`indices.js:154`) e 5 dei 7 indici (CSI300, NIFTY50, TWN, HSI, IBOV) stanno lì; EEM e KOSPI200 sono `main`.
- `snapshot(k)`: `{dates, close, pct200, px, m (runMachine), state: stateOf(k), appr: approach(k), blue: st.blue[k], now: NOW[k]}` in sola lettura.
- `onChange(fn)`: avvisa la vista 8 quando cambia un livello blu (`setBlue`, `indices.js:427`).

## 2. Pipeline dei dati

### Dove scaricare: file nuovo `data/emerging.json`, script nuovo `scripts/fetch_emerging.js`
**Non** dentro `prices_macro.json`, per quattro motivi trovati nel codice:
1. `fetch_data.js:45` `RANGE = '5y'`: troppo poco per confrontarsi con le zone blu dal 2003-2012 e per un backtest della regola nell'app.
2. `fetch_data.js:705` `offHours` considera fuori orario solo `CRYPTOCURRENCY` e `INDEX`. I cambi (`CURRENCY`, fuso Londra, barra di oggi aperta) entrerebbero nel calcolo di `asOf` e del ritardo del file degli asset reali.
3. `fetch_data.js:623-628` `parseFredCsv` tiene un valore per **mese** (`out[d.slice(0, 7)]`): con una serie giornaliera come `DTWEXEMEGS` resterebbe solo l'ultimo giorno di ogni mese.
4. Un errore dei cambi farebbe fallire tutto il passo «Prezzi» (`main`, `fetch_data.js:818-825`, esce con 1 se un lavoro fallisce).

Script nuovo, che riusa le funzioni già esportate da `fetch_data.js`: `dropAfter`, `pickAsOf`, `keepPublished`, `copiedIdx`, `repairSpikes`, `marketIndex`, e `fetchDaily`/`mapLimit` da `scripts/lib/yahoo.js`. In `fetch_data.js` servono solo due modifiche:
- `export` di `fetchFred` (oggi non esportata, `fetch_data.js:633`);
- un `parseFredDaily(text)` accanto a `parseFredCsv`, che salta i valori «.», con `fetchFred(id, since, parse = parseFredCsv)`.

**Serie da scaricare** (mappa in `config/emerging.json`, letta dallo script e dall'app):

| Indice | Cambio (Yahoo) | ETF in dollari per la forza relativa | Note |
|---|---|---|---|
| CSI300 | `CNY=X` | `ASHR` (CSI 300 in dollari, dal 2013) o `MCHI` (MSCI China) | il prezzo dell'app è l'ETF 510300.SS in yuan |
| NIFTY50 | `INR=X` | `INDA` (dal 2012) | |
| IBOV | `BRL=X` | `EWZ` | |
| KOSPI200 | `KRW=X` | `EWY` | il prezzo dell'app è il KOSPI intero (`^KS11`) |
| TWN | `TWD=X` | `EWT` | prezzo TAIEX, breadth MSCI Taiwan |
| HSI | `HKD=X` (agganciato) | `FXI` o `MCHI` | cambio senza informazione: vedi §7 |
| EEM | nessuno (già in dollari) | `EEM` | strato valutario = `DTWEXEMEGS` |
| tutti | — | `ACWI` (benchmark) | già in `prices.json`, ma solo 5 anni |
| tutti | FRED `DTWEXEMEGS` | — | dal 2006, settimanale |

`ASHR` contro `MCHI` per il CSI 300, e `FXI` contro `MCHI` per l'Hang Seng: deve deciderlo il backtest. In `config/emerging.json` basta cambiare una stringa.

**Storia**: per Yahoo `period1` dal 01/01/2003 (cambi) o dalla prima quotazione (ETF); per FRED `cosd=2006-01-01`. Si riscarica tutto a ogni corsa: sono 13-14 richieste piccole e gli ETF rettificati per i dividendi cambiano scala a ogni stacco, quindi un aggiornamento solo della coda non basta.

### Formato compatto
Ogni serie ha il suo calendario e si scrive con gli encoder di `js/indexdata.js`:
- `encodeDates` per `d0` e `gaps`;
- `deltaEncode`/`deltaDecode` per le chiusure (`cd`), con `ps: 10000` sotto 100, come fa già `packIndex`. Così CNY a 6,66 e TWD a 32,9 restano a 4 decimali; KRW (1.344) e INR (94) vanno bene con `ps` 100 e 10000.

```
{ "generated": "...", "asOf": { "fx": "2026-11-04", "etf": "2026-11-04", "fred": "2026-10-30" },
  "fredSeries": "DTWEXEMEGS", "source": {...},
  "missing": [], "repaired": [ {sym, date, from, to} ],
  "series": { "CNY=X": { "d0", "gaps", "cd", "ps" }, …, "ACWI": {…, "adj": true}, "DTWEXEMEGS": {…} } }
```

**Niente campi che cambiano a ogni corsa** a parte `generated`: niente `checkedAt` e niente «seduta attesa». Altrimenti `keep_unchanged.js` (che ignora solo `generated`, `keep_unchanged.js:17-24`) non riconosce che il file è uguale, e ogni corsa (tre o più al giorno) fa un commit e un deploy.

**Dimensione stimata**: una serie di circa 5.900 sedute dal 2003 occupa circa 32 KB di `cd` più 6 KB di `gaps` (misurato su EEM in `indices.json`: 31.770 + 5.927 caratteri, 8,5 KB con gzip).
- 6 cambi + FRED + 6-7 ETF + ACWI ≈ 14 serie ≈ **450-500 KB grezzi, circa 130-180 KB con gzip**.
- Con un calendario feriale unico per i cambi (un solo `gaps`) si risparmiano circa 30 KB.
- Senza gli ETF (solo pannello valutario) circa 250 KB grezzi.

### Regole dello script (le stesse degli altri file)
- **Barra di oggi**: si scartano le barre aperte. I cambi quotano 24 ore: `parse()` scarta la barra se l'orario regolare è ancora aperto (`yahoo.js`, `SETTLE`), ma serve anche `dropAfter` con l'ultimo giorno feriale chiuso a Londra. Alla corsa delle 22:40 UTC la barra di oggi dei cambi non c'è ancora: arriva con la corsa successiva.
- **Barre segnaposto**: `dropStale: true` per gli ETF.
- **Prezzi anomali dei cambi**: Yahoo ha a volte stampe sbagliate su KRW e TWD (un salto che rientra il giorno dopo). Si usa `repairSpikes` contro un riferimento: la mediana dei rendimenti dei cambi (`marketIndex`) oppure `DX-Y.NYB`. Si registra in `repaired`, come in `prices_global`.
- **Dati più vecchi**: un file non si sovrascrive mai con dati più vecchi (`asOf` scaricato < pubblicato). FRED che non risponde lascia i valori FRED già pubblicati, come fa il CPI (`fetch_data.js:757-763`).
- **Troppi fallimenti**: con meno dell'80% delle serie arrivate non si scrive il file.

### Controllo dei dati fermi (`scripts/check_fresh.js`)
Aggiungere a `staleData` (`check_fresh.js:31-41`) un campo `emerging`, con un limite per fonte:

| Voce | Data | Riferimento | Giorni massimi | Perché |
|---|---|---|---|---|
| `emerging.json (cambi)` | `asOf.fx` | `B` (breadth) | 4 | i cambi quotano ogni giorno feriale, anche con la borsa locale chiusa |
| `emerging.json (ETF in dollari)` | `asOf.etf` | `B` | 4 | calendario NYSE, come `prices_macro` |
| `emerging.json (FRED DTWEXEMEGS)` | `asOf.fred` | `today` | 14 | H.10 settimanale; con un lunedì festivo esce il martedì; a fine anno può saltare una settimana |
| ogni cambio | ultima barra | `B` | 6 | un cambio sparito con gli altri aggiornati |

Nella funzione `main` (`check_fresh.js:57-73`) leggere `emerging.json`. Il test va in `test/pipeline.test.js` (vedi §6).

### Workflow (`.github/workflows/update-data.yml`)
- Passo nuovo dopo «Prezzi da Yahoo Finance»: `name: Cambi e dollaro emergente (vista Emergenti)`, `id: emerging`, `continue-on-error: true`, `run: node scripts/fetch_emerging.js`.
- «Esito»: aggiungere `steps.emerging.outcome == 'failure'` alla condizione e al messaggio.
- Messaggio del commit: `emergenti al ${EMG:-?}` letto da `asOf.fx`.
- La validazione JSON prima del commit (`for f in data/*.json`) copre già il file nuovo.
- `keep_unchanged.js` lo gestisce da solo: la prima volta il file è nuovo e passa (`continue`), poi conta solo il cambio di `generated`.
- `need_update.js`: nessun cambio. Le corse di recupero guardano solo le sedute USA. I cambi della seduta asiatica arrivano con la corsa delle 11:40 o con quella della sera.
- Tempo in più: 14 richieste a 2 alla volta, una ventina di secondi. Il limite di 45 minuti non è a rischio.

## 3. Calcoli: modulo condiviso `js/emerging.js`

Stesso schema di `js/capitulation.js` (calcoli, senza DOM) e `js/cap-view.js` (vista). Il modulo nuovo **non importa nulla del browser**: lo usano l'app, `scripts/fetch_emerging.js` (se serve), gli script di `ricerca/emergenti/` e i test con `node --test`. Così il backtest e l'app usano la stessa funzione: se il backtest separato ha scritto le sue funzioni, la sessione di implementazione le porta qui e i suoi script le importano da `../../js/emerging.js`.

Funzioni proposte (nomi indicativi):

| Funzione | Cosa fa | Note |
|---|---|---|
| `emSeries(x)` | decodifica una serie del file (`decodeDates` + `deltaDecode`) | riusa `indexdata.js` |
| `alignLast(srcDates, srcVals, dates, maxDays)` | per ogni data dell'indice, l'ultimo valore della fonte con data ≤ quella data; `null` se è più vecchio di `maxDays` | il cuore di «nessun dato futuro» e di «mancante = —» |
| `knownAt(dates, fredDates, fredVals, releaseOf)` | valore FRED **già pubblicato** a ogni data | come `cpiSteps` (`fetch_data.js:660`): un valore del giorno d è noto dal lunedì dopo il venerdì della sua settimana (regola H.10, da dichiarare) |
| `inUsd(close, fx)` | indice in dollari = chiusura locale / cambio | EEM: `fx = null` → la chiusura stessa |
| `ccyStrength(fx)` | forza della valuta = 1/cambio, così salire = valuta più forte | evita la confusione di segno su CNY=X e simili |
| `fxSignals(s, t, P)` | indicatori alla seduta t: variazione 1M/3M, «ha smesso di scendere», distanza dalla media, dollaro EM in calo | parametri `EM_DEFAULT` come `CAP_DEFAULT` (`capitulation.js:25`), valori dal backtest |
| `relStrength(etf, acwi, dates)` | RS-Ratio e RS-Momentum settimanali | **importa `rrgNew` e `weeklyIndices` da `engine.js`**: è la stessa formula della rotazione |
| `emContext(snap, em, t, P)` | oggetto unico per la vista: stato della macchina + strato macro, con `null` dove manca | |
| `emRule(m, ctx, P)` (solo se il backtest la promuove) | filtro sugli eventi della macchina: «trigger con valuta stabile» | **non tocca `runMachine`**: legge `m.events` e aggiunge un'etichetta |

### «Nessun dato futuro»
- Ogni indicatore alla seduta t usa solo `slice(0, t + 1)` della serie allineata. Le soglie in percentile si calcolano sulla storia fino a t, come `approachSeries` (`signals.js:102`).
- **Test di prefisso** (come quello di `approachSeries`, `test/signals.test.js:96-98`): il valore alla seduta t calcolato su tutta la serie deve essere uguale a quello calcolato sulla serie tagliata a t.
- **Orari**: il cambio di Yahoo del giorno D è la chiusura di Londra, che arriva **dopo** la chiusura di Shanghai, Mumbai, Seul e Taipei del giorno D. Per l'app va bene (si pubblica dopo). Per la regola nel backtest:
  - o si usa il cambio del giorno prima per le borse asiatiche (`lagFx: 1` in `config/emerging.json`);
  - o si dichiara l'approssimazione.

  Da decidere con chi fa il backtest. San Paolo chiude dopo Londra: lì il problema non c'è.
- **FRED**: mai il valore per data, sempre quello per data di pubblicazione (`knownAt`). Nell'app conviene mostrare tutte e due le date: «dollaro emergente al 30/10, pubblicato il 02/11».

### «Dato mancante = —»
- `alignLast` restituisce `null` oltre `maxDays` (proposta: 5 giorni di calendario per i cambi, 4 per gli ETF, 14 per FRED). Non ricopia mai all'infinito.
- Indicatori con storia insufficiente (INDA prima del 2012, ASHR prima del 2013, ACWI prima del 2008, FRED prima del 2006): `null`.
- In tabella: `fmt`, `sgnP` e `pct` di `format.js` stampano già «—» per `null` (`format.js:6-12`).
- Nei KPI: «3 su 6 con dati» invece di contare un mancante come «no».
- HSI: l'indicatore valutario resta `null` e la tabella mostra «agganciato» invece di «—», con il motivo nel tooltip.
- File che non arriva: la vista mostra il tabellone degli stati e scrive «cambi non disponibili (motivo)», come fa `cap.failed()` (`indices.js:204`).

### 3.4 Due uscite possibili
- **Pannello di contesto** (minimo): colonne e grafici informativi, nessun effetto su stati e alert.
- **Regola**: `emRule` aggiunge agli eventi della macchina un'etichetta (es. «trigger con valuta stabile») e una colonna negli episodi. È un cambio di regola: per `CLAUDE.md` va discusso con l'utente prima, e richiede il backtest in `ricerca/emergenti/`. La macchina (`signals.js:159`) e gli alert Telegram restano uguali. Se in futuro la regola dovesse cambiare lo stato, sarebbe una 2.0 o almeno una minor dichiarata, con `send_alerts.js` da rivedere.

I parametri e la scelta tra le due uscite stanno in `config/emerging.json` (`mode: "context" | "rule"`), così il passaggio dall'una all'altra non tocca la struttura.

## 4. Grafici e componenti riusabili

| Cosa | Da dove | Uso nella vista 8 |
|---|---|---|
| badge di stato e avvicinamento | `badge`, `apprBadge` (`bottom.js:29-32`) | colonna Stato, identica alla vista 6 |
| riquadri KPI | classe `kpis` (`index.html:467`) | «In zona blu», «Valute che hanno smesso di scendere», «Dollaro emergente 1M», «Più forti contro ACWI» |
| tabellone a schede sul telefono | `table.t.board-cards` con `data-l` sulle celle (`indices.js:178-189`, CSS `style.css:745-756`) | 7 righe, schede sotto 900 px, prima colonna fissa (decisione del 20/10) |
| chip per scegliere l'indice | `#ixChips` (`indices.js:362`) e `keepFocus` (`format.js:77`) | |
| linea verticale condivisa | `syncX`/`emitX` (`format.js:40-44`), gruppo `'emg'` | tra il grafico principale e quello del dollaro |
| tooltip mouse e tocco | `bindTip`, `placeTip`, `hideOnTapOutside` (`format.js:49-95`) | |
| larghezza dei grafici | `chartWidth(svg, 940)` (`format.js:63`) | |
| quadrante della rotazione | `qPill`, `arrow` (`format.js:96-97`), `stats` (`engine.js:150`) | colonna «contro ACWI» |
| performance base 100 | `drawPerf` (`perf-chart.js:30`) | 7 indici **in dollari** più ACWI su 3M/6M/1A: serve un calendario comune (giorni feriali) costruito con `alignLast` |
| rotazione | `drawRRG` (`rrg-chart.js:63`) | facoltativo: meglio un link alla vista 2 con un gruppo nuovo (sotto) |

**Grafico nuovo** `js/emerging-chart.js`, sul modello di `cap-chart.js`: pannelli con lo stesso asse del tempo, helper `el`/`ticks` copiati come negli altri grafici (ogni grafico ne ha una copia: è una duplicazione già presente, da non risolvere ora).
1. Indice in valuta locale e in dollari (base 100 al primo giorno del periodo), con le bande della zona blu e i trigger presi da `m.days` e `m.events`, come in `drawSector`.
2. Forza della valuta contro il dollaro (1/cambio, salire = valuta più forte) con la sua media e, se la regola esiste, i tratti «ha smesso di scendere».
3. Dollaro contro le valute emergenti (FRED), a gradini dalla data di pubblicazione, con la nota della data. Oppure RS-Ratio contro ACWI.

Periodi 3A/10A/MAX come in `#ixRange`. Sul telefono valgono le stesse regole di `sector-chart.js`: `narrow = PW < 440` → titoli corti, note sotto.

**Facoltativo, costa poco**: un gruppo «7 · Emergenti in dollari» nella sezione `macro` di `universe.json` (ETF paese contro ACWI ed EEM). Compare da solo nella vista 2 (`buildGroups`, `app.js:181-193`) e dà la rotazione completa con la stessa formula. Prezzo: circa 60-70 KB in più in `prices_macro.json` (5 anni). Si può fare anche in un secondo momento.

### Layout
- **Computer 1440 e 1280**: KPI in alto; sotto `grid-side` (`style.css:166-175`, a una colonna sotto 1100 px), con a sinistra il tabellone dei 7 e a destra «Dollaro emergente» (valore, variazione 1M/3M, data del dato e della pubblicazione); poi il dettaglio dell'indice scelto con il grafico a pannelli (940 px), i fatti in `<dl>` come `#ixFacts` e la qualità dei dati. Colonne del tabellone: Indice · Stato · Breadth/blu (barra come `c-br`) · Valuta 1M · Valuta 3M · Valuta (segnale) · Indice in $ 1M/3M · Contro ACWI (pillola del quadrante).
- **Telefono 390 e 360**: le schede vanno su due righe di 4 (8 bottoni, `style.css:100-103`). Da verificare a 360 che «8 EMERGENTI» non porti a tre righe; se succede si usa l'etichetta corta «8 EMERG.» solo sotto i 400 px, come `.only-phone`. Tabellone a schede, grafico a tutta larghezza, tooltip al tocco, nessuno scorrimento orizzontale della pagina.
- **Temi**: solo variabili CSS (`--amber`, `--up`, `--down`, `--q-lead`, `--ink-3`…) e le regole `[data-theme="light"]` (`style.css:512-575`). Nessun colore scritto nel JS. Con CVD (`html.cvd`) i segnali non si leggono solo dal verde e dal rosso: freccia o testo («stabile», «in calo»). Il tema lo sceglie l'utente.

## 5. Testi e versione

| File | Cosa |
|---|---|
| `index.html` | scheda 8, sezione `v-emg` con titoli dei pannelli, legende e note delle approssimazioni; `modulepreload` di `js/emerging.js` ed `emerging-view.js` (come `titles.js`, `index.html:45-48`); **nessun** preload di `data/emerging.json` |
| `guida.html` | sezione `<section id="emg"><h2>8 Emergenti</h2>`, «Comandi e tasti» (tasto 8, EMG), «Dati e aggiornamenti» (FRED settimanale, cambi di Londra), «Limiti da tenere a mente» |
| `README.md` | «Viste» (vista 8), «Architettura» (moduli nuovi), dati e fonti, approssimazioni, «Versioni» con la nota della 1.4.0 |
| `docs/sviluppo.md` | tabelle dei moduli, delle viste e della pipeline (§2-3), fonti (FRED `DTWEXEMEGS`, cambi Yahoo), decisioni, stato; correggere data e versione in testa e il numero dei test (§0) |
| `js/version.js` + `version.json` | **1.4.0** (funzione nuova, nessuna regola esistente cambiata), `RELEASE` della pubblicazione, `NOTES` con la riga della vista |
| `js/app.js:1`, `css/style.css:99` | commenti da aggiornare (§0) |

**Approssimazioni da scrivere nell'app** (note o tooltip) **e nel README**:
1. Il cambio di Yahoo è la chiusura di Londra, non quella dell'ora di chiusura della borsa locale.
2. Il dollaro contro le valute emergenti (FRED, Federal Reserve H.10) esce una volta alla settimana: nell'app vale dalla data di pubblicazione e ha qualche giorno di ritardo.
3. HKD è agganciato al dollaro (fascia 7,75-7,85): per l'Hang Seng il cambio non dice nulla. Se il backtest lo giustifica, si usa lo yuan come indicatore, dichiarandolo.
4. EEM è già in dollari: per lui lo strato valutario è il dollaro emergente di FRED.
5. CSI 300: prezzo dell'ETF 510300 in yuan; la forza relativa usa ASHR (o MCHI), che segue il CSI 300 (o l'MSCI China) in dollari con commissioni e scarti di replica.
6. KOSPI 200: il prezzo in dollari è quello del KOSPI intero diviso per il cambio. Taiwan: prezzo TAIEX, breadth del paniere MSCI, forza relativa con EWT.
7. Gli ETF della forza relativa sono rettificati per i dividendi, gli indici delle vista 6 no: l'indice in dollari e la forza relativa possono divergere per le cedole.
8. Storie più corte: INDA dal 2012, ASHR dal 2013, ACWI dal 2008, FRED dal 2006. Prima si mostra «—».
9. Se il backtest lo usa: il cambio del giorno prima per le borse asiatiche.

**Statistiche nei testi** (es. «la valuta ha smesso di scendere in N trigger su M»): solo se ricalcolabili con uno script salvato in `ricerca/emergenti/`, e verificate con un secondo ricalcolo indipendente prima di pubblicare (`CLAUDE.md`).

## 6. Test

### Unitari (`npm test`)
- **`test/emerging.test.js`** (nuovo):
  - `alignLast`: valore del giorno o precedente; `null` oltre `maxDays`; mai un valore con data successiva.
  - `knownAt`: un valore FRED del mercoledì non è visibile prima del lunedì dopo; lunedì festivo → martedì.
  - `inUsd` e `ccyStrength`: segni (CNY=X da 7,0 a 7,2 = yuan più debole = forza in calo); EEM senza cambio.
  - Prefisso: per ogni indicatore il valore a t su tutta la serie è uguale a quello sulla serie tagliata a t.
  - HSI agganciato → indicatore `null`; serie mancante → `null`, nessun errore.
  - `relStrength` uguale a `build()` di `engine.js` sugli stessi dati: è la stessa formula della rotazione.
  - Se c'è `emRule`: gli eventi della macchina non cambiano (`runMachine` produce gli stessi `days`), cambiano solo le etichette.
- **Dati veri** (stesso stile di `test/indices.test.js:18-30`): `data/emerging.json` con date in ordine, valori > 0, tutte le serie di `config/emerging.json` presenti, `asOf` coerenti. Le chiavi di `config/emerging.json` sono un sottoinsieme di `config/indices.json`.
- **`test/fetch_data.test.js`**: `parseFredDaily` con «.» e righe vuote; `parseFredCsv` invariato.
- **`test/pipeline.test.js`**: `staleData` con `emerging`: FRED a 10 giorni passa e a 15 no; cambi a 4 giorni passano e a 5 no.
- `test/syntax.test.js` controlla da solo i file nuovi in `js/`.

### Nel browser: `ricerca/qa/browser/v140.cjs` (Playwright, sul modello di `v130.cjs`)
Contesti: 1440×900 scuro, 1280×900 chiaro, 390×844 scuro con tocco, 360×780 chiaro con tocco. Controlli:
1. esiste `#tab-emg` con «8 Emergenti». **Sulla 1.3.4 fallisce già qui**, e lo script esce con 1 (`process.exit(fail ? 1 : 0)`);
2. `#emg` apre la vista; il tasto `8`, il comando `EMG` e `#emg-KOSPI200` aprono il dettaglio di KOSPI200; Indietro torna alla vista di prima;
3. caricamento pigro: aprendo `#mon` non c'è nessuna richiesta a `data/emerging.json` (`performance.getEntriesByType('resource')`); c'è dopo il clic sulla scheda;
4. 7 righe; lo stato di ogni riga è uguale a quello della stessa riga in `#ixTable` (vista 6), anche dopo aver cambiato un livello blu nella vista 6 (`#ixBluePlus`);
5. ogni cella valutaria contiene un numero o «—»; HSI dice «agganciato»; EEM non ha un cambio;
6. il grafico ha i pannelli previsti; il tooltip al passaggio o al tocco mostra data, valuta e dollaro; la linea condivisa compare nell'altro grafico;
7. file non disponibile (`page.route('**/data/emerging.json', r => r.abort())`): messaggio comprensibile, tabellone degli stati presente;
8. nessuno scorrimento orizzontale (`scrollWidth <= innerWidth`) e schede su al massimo due righe a 360 px;
9. nessun errore in console; screenshot in `OUT` per il controllo a occhio dei due temi e di CVD.

Uso: `node ricerca/qa/server/gzserve.mjs <cartella> 8791`, poi `BASE=http://127.0.0.1:8791/ OUT=… NODE_PATH=$(npm root -g) node ricerca/qa/browser/v140.cjs`. Si lancia una volta sulla 1.3.4 (deve fallire) e una sulla 1.4.0 (deve passare), e si scrive l'esito nel rapporto di QA.

## 7. Rischi e casi limite

| Caso | Dove | Cosa fare |
|---|---|---|
| **Feste asiatiche** (Capodanno cinese, Golden Week, Diwali, Chuseok) | `check_fresh.js:44` (12 giorni per gli indici); `indices.js:55-57` (`NOW[k]`) | i cambi quotano anche con la borsa chiusa: si allinea sempre **sulle date dell'indice** (`alignLast`), così nelle feste non compaiono sedute inventate; la variazione 1M dell'indice si conta in sedute dell'indice, quella della valuta in giorni del cambio, e va detto |
| **EEM durante le feste cinesi** | `docs/sviluppo.md` §7 (68 sedute con la breadth falsata) | resta un limite della vista 6; nella vista 8 non va «corretto» con i cambi |
| **Cambio mancante o fermo** | `alignLast` (nuovo); `check_fresh.js` (nuovo controllo, 6 giorni per serie) | `null` → «—»; mai riempire oltre `maxDays` |
| **Stampe sbagliate di Yahoo sui cambi** | script nuovo, con `repairSpikes` (`fetch_data.js`, esportata) | correggere e registrare in `repaired`, mostrato nella vista come in `globalFreshness` (`app.js:709-717`) |
| **Barra di oggi aperta dei cambi** (24 ore, fuso Londra) | `yahoo.js` `parse` (`SETTLE`); `fetch_data.js:705` (non vale per `CURRENCY`) | nello script nuovo `dropAfter` con l'ultimo giorno feriale chiuso a Londra; test con una risposta registrata in `test/fixtures` |
| **FRED in ritardo o senza risposta** (503) | `fetch_data.js:633-650` (riprova 4 volte); `fetch_data.js:628` (parser mensile) | parser giornaliero nuovo; se non risponde si tengono i valori pubblicati; limite di 14 giorni in `check_fresh`; nell'app sempre «al … pubblicato il …» |
| **Revisioni di FRED** | — | H.10 si rivede di rado; il file tiene l'ultima versione; se la regola usa FRED, il backtest deve dirlo (oppure usare ALFRED) |
| **HKD agganciato** | `config/indices.json:23` (HSI, `^HSI`) | `peg: true` in `config/emerging.json`: indicatore `null` con «agganciato»; indicatore alternativo (yuan) solo se il backtest lo giustifica e lo si dichiara |
| **EEM già in dollari** | `config/indices.json:35` (`price: "EEM"`) | `fx: null`: niente «indice in dollari»; strato valutario = `DTWEXEMEGS` |
| **CSI 300 con l'ETF al posto dell'indice** | `config/indices.json:25` (`510300.SS`); `docs/sviluppo.md` §7 («CSI 300 fermo quando Yahoo ha la barra dell'ETF vuota») | il prezzo in dollari eredita il limite (ETF fermo → «—» dopo `maxDays`); ASHR, MCHI e 510300 sono tre strumenti diversi, da dire nella nota |
| **KOSPI 200 con il KOSPI intero** | `config/indices.json:27` (`^KS11`) | dichiararlo nella nota del prezzo in dollari |
| **Taiwan: tre panieri diversi** | `config/indices.json:29` (prezzo TAIEX, breadth MSCI/EWT) | dichiararlo; EWT per la forza relativa è coerente con la breadth |
| **Orario del cambio e «nessun dato futuro» nella regola** | `emRule`/`fxSignals` (nuovi) | `lagFx` in config per Asia; test di prefisso |
| **Livello blu modificato nel browser** | `indices.js:42`, `indices.js:63`, `indices.js:427-432` | la vista 8 legge lo stato da `snapshot(k)`; test nel browser (punto 4) |
| **Secondo file degli indici non arrivato** | `indices.js:75-84` (`moreFailed`) | la vista 8 mostra solo EEM e KOSPI200 con l'avviso «altri 5 non disponibili», come `#ixPickMeta` |
| **8 schede sul telefono** | `style.css:100-103` | controllo a 360 px (punto 8 del test) |
| **Tasti 1-7** | `app.js:972` | `'emg'` in fondo a `VIEWS`, non in mezzo |
| **File nuovo copiato a mano su `main`** | procedura di `docs/sviluppo.md` §9 | `data/emerging.json` lo crea la Action; alla pubblicazione non si copia mai `data/`. Prima pubblicazione: lanciare il workflow a mano per avere il file, altrimenti la vista mostra «non disponibile» fino alla prima corsa |
| **Commit a ogni corsa** | `keep_unchanged.js:17-24` | nessun campo variabile oltre `generated` |
| **`missing`/esclusi** | `app.js:319` (`missTxt`) | riusare lo stesso avviso «senza …» nella testata della vista |

## 8. Ordine di lavoro proposto per la sessione di implementazione

1. Leggere le regole finali del backtest e copiarne le funzioni in `js/emerging.js`, con i test (`test/emerging.test.js`), prima di qualsiasi vista.
2. `scripts/fetch_emerging.js` + `config/emerging.json` + le due modifiche a `fetch_data.js`; generare `data/emerging.json` in locale e controllare dimensione e valori contro una seconda fonte (es. FRED `DEXCHUS`, `DEXINUS`, `DEXBZUS`, `DEXKOUS`, `DEXTAUS` per i cambi; deve tornare entro pochi decimi di punto percentuale, con date sfalsate di un giorno).
3. `check_fresh.js`, workflow e test della pipeline.
4. API in `indices.js` (`ensureAll`, `snapshot`, `onChange`), poi `js/emerging-view.js`, `js/emerging-chart.js`, `index.html` e CSS.
5. Navigazione in `app.js`, testi, versione 1.4.0.
6. `npm test`, `v140.cjs` (deve fallire sulla 1.3.4 e passare sulla 1.4.0), controlli indipendenti di numeri, grafici, testi e usabilità (computer, poi telefono), poi la pubblicazione secondo `CLAUDE.md`.

File che la sessione toccherà: **nuovi** `js/emerging.js`, `js/emerging-view.js`, `js/emerging-chart.js`, `scripts/fetch_emerging.js`, `config/emerging.json`, `test/emerging.test.js`, `ricerca/qa/browser/v140.cjs`; **modificati** `js/app.js`, `js/indices.js`, `index.html`, `css/style.css`, `guida.html`, `README.md`, `docs/sviluppo.md`, `js/version.js`, `version.json`, `scripts/fetch_data.js` (due export), `scripts/check_fresh.js`, `.github/workflows/update-data.yml`, `test/pipeline.test.js`, `test/fetch_data.test.js`; facoltativo `universe.json` (gruppo della rotazione).
