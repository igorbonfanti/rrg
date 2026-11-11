# SOXX (semiconduttori): come inserirlo nel codice (verifica preliminare)

Fase di ricerca: questo file non cambia l'app e non è un commit. È il piano per la sessione che scriverà il codice, dopo il verdetto del backtest (altro agente) e l'ok dell'utente.
Idea dell'utente: breadth del SOXX sopra la media a 200 sedute con un livello blu di partenza del 3%, idea di Massimo Rea (quant-rea, da citare).
Letti: `CLAUDE.md`, `README.md`, `docs/sviluppo.md`, la skill e `references/sector-monitor.md`, `config/indices.json`, `config/thresholds.json`, `universe.json`, `js/signals.js`, `js/bottom.js`, `js/indices.js`, `js/titles.js`, `js/app.js`, `scripts/fetch_breadth.js`, `scripts/fetch_indices.js`, `scripts/lib/members.js`, `scripts/lib/capeq.js`, `scripts/backfill_indices.py`, `scripts/backfill_capitulation.py`, `scripts/send_alerts.js`, `scripts/check_fresh.js`, `scripts/need_update.js`, `scripts/keep_unchanged.js`, `.github/workflows/update-data.yml`, `test/indices.test.js`, `ricerca/qa/browser/v180.cjs`.
Righe citate: ramo `claude/great-noether-2f1ude` al commit `4301ed4` (1.8.0).

## 0. Fatti controllati oggi (11/11/2026)

- **Holdings del SOXX**: `https://www.ishares.com/us/products/239705/x/latest-holdings.csv` risponde (200, «iShares Semiconductor ETF», holdings al 10/11/2026). Lo stesso formato di IWM/EEM/EWT/IVV: `parseIShares` (`scripts/lib/members.js:144`) e `parseIvv` (`scripts/lib/capeq.js:271`) lo leggono così come sono (prova: `node` con i due parser, nessuna modifica).
  - **30 titoli azionari**, tutti quotati negli USA (NASDAQ o NYSE, anche gli ADR): AMD AVGO NVDA MU INTC TXN ADI QCOM MPWR KLAC NXPI AMAT TSM LRCX MRVL SKHY TER MCHP ALAB ON ASML CRDO ENTG MTSI TSEM ASX CBRS UMC STM ARM. Nel file ci sono anche righe Cash, Cash Collateral e Futures, che il lettore già scarta (`Asset Class` diverso da `Equity`).
  - **13 su 30 non sono nell'S&P 500**: TSM SKHY ALAB ASML CRDO ENTG MTSI TSEM ASX CBRS UMC STM ARM.
  - 19 su 30 sono nel Nasdaq-100; **11** non sono in nessuna lista già scaricata da `fetch_indices.js` (TSM SKHY ON CRDO ENTG MTSI TSEM ASX CBRS UMC STM).
- **Storia su Yahoo** (prima seduta): SOXX 13/07/2001, ^SOX 04/05/1994, SMH 05/06/2000; titoli giovani: **SKHY dal 10/07/2026 (87 sedute)**, **CBRS dal 14/05/2026 (125 sedute)**, ALAB 20/03/2024, ARM 14/09/2023, CRDO 27/01/2022. TSM e ASML dagli anni '90.
- Il SOXX non è in nessun universo della rotazione (`universe.json`, `data/prices.json`: 22 ticker USA). Nemmeno SMH, né un ETF UCITS sui semiconduttori negli universi in euro.
- Script e file della prova: `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/soxx/` (temporanei, non nel repository). Dati e backtest li verifica l'altro agente in `ricerca/soxx/`.

### Due conseguenze per le regole (da dire all'utente, non da decidere qui)

1. **Con 30 titoli il 3% vuol dire zero titoli sopra la media.** Un titolo vale 3,33 punti: 1/30 = 3,3% è già sopra il livello. Zona blu = tutti i 30 sotto la media per 2 chiusure; trigger = almeno max(3 + 5 punti, 2 titoli) → 3 titoli su 30 (10%); Attenzione = breadth ≤ 13% (3 titoli o meno). C'è un precedente: SMI (20 titoli, 3%) e FTSE MIB (40 titoli, 3% = al massimo un titolo, detto nella `note`). Va scritto nella `note` del SOXX.
2. **SKHY e CBRS contano «sotto la media» finché non hanno 200 sedute** (regola dell'app: `countDay` in `scripts/fetch_indices.js:190-204`, README «Membri di oggi»). Oggi la breadth del SOXX non può superare 28/30 = 93,3%, e due titoli su 30 pesano 6,7 punti sulla risalita (trigger più difficile) fino a circa febbraio (CBRS) e maggio 2027 (SKHY). Nella storia ricostruita con i membri di oggi succede lo stesso a ogni titolo giovane (ARM, ALAB, CRDO…). Non cambia nulla vicino allo 0%, ma va detto nella `note`. Cambiare la regola (togliere i giovani dal denominatore) sarebbe un cambio di formula: solo con l'utente.

## 1. Dove sta meglio: indice (vista 6) o settore (viste 3-4-5)?

### Strada A: «indice» nella vista 6

Il SOXX diventa una voce di `config/indices.json` con i membri di oggi dalle holdings iShares, come Russell 2000, EEM e Taiwan.

**Pro**
- La pipeline c'è già quasi tutta: lettore delle holdings iShares (`kind: 'ishares'`), lista validata (`checkList`), registro dei cambi in `data/index_members/SOXX.json`, prezzi spark, conteggi `countDay`, cali forti (`countsOn`/`mergeCap`), ricostruzione con `--only` e partenza automatica della storia (`"from": null`, regola del 60%), controllo dei dati fermi (`check_fresh.js` legge da solo ogni indice, ogni serie dei cali forti e ogni lista: zero righe da aggiungere).
- I membri non S&P (ADR) non sono un problema: sono ticker USA, calendario NYSE, nessuna festa diversa (MIN_FRESH 75% sempre soddisfatto).
- La vista 6 ha già tutto il resto: macchina a stati, «Perché questo stato», Bottom Map con data scorrevole, tabellone, episodi a 3/6/12 mesi con il confronto, cali forti, qualità della storia («membri di oggi», «con limiti», `note` mostrata nell'app), livello blu regolabile, testo «Livello di default dai grafici di Massimo Rea (quant-rea)» con `blueSource: "Rea"`.
- Onestà del metodo: la vista 6 dice già che la storia con i membri di oggi è distorta; le viste 1-3-4 promettono «composizione di ogni data» e non hanno questo avviso.
- Nessun effetto su Monitor, Alert, Telegram e statistiche dei settori.

**Contro**
- Il SOXX non è un indice di mercato: va in un'area a parte del selettore («Industrie USA») e i testi «22 indici» diventano «22 indici e un'industria».
- Le statistiche degli indici scritte nei testi vengono da script che leggono tutta la configurazione (vedi §1.3): aggiungendo il SOXX cambierebbero al primo ricalcolo.
- Non compare nelle viste 3, 4 e 5 dei settori: servono dei ponti (§4) e, se la si vuole, una fase 2 per la vista 5 (§3).
- Telegram: gli indici non mandano alert (`send_alerts.js` gira solo su `SECTOR_KEYS`); il SOXX seguirebbe la decisione già presa per gli indici («Telegram per gli indici: dopo il mese di prova»).

### Strada B: «settore» (`SECTOR_KEYS`)

Il SOXX diventa il dodicesimo «settore» accanto a XLK.

**Pro**: compare da solo in Monitor, Bottom Map 3, Settore 4, Titoli 5, Alert e Telegram.

**Contro (pesanti)**
- **La breadth dei settori nasce dai membri dell'S&P 500 con il settore GICS** (`scripts/fetch_breadth.js:42-47` `GICS`/`ETFS`, `computeCounts` 137-157, `publishable` 163-186 con «≤1 mancante per settore», `validateMembers` 76-98 con «non ci sono 11 settori» alla riga 81). Il SOXX ha 13 titoli fuori dall'S&P 500: servirebbero una lista a parte, prezzi a parte e un caso speciale in ogni funzione.
- **Storia**: `breadth.json` dal 2005 è ricostruita con la composizione di ogni data (`backfill_breadth.py`, release Johnbrick123). Per il SOXX la composizione storica gratuita non c'è: andrebbe ricostruito con i membri di oggi dentro un file che promette il contrario, senza un posto nell'app per dirlo (le viste 1-3-4 non hanno la riga «qualità della storia»).
- **Formati con un solo settore per titolo**: `breadth_latest.json` (`sector`), `sector_members.json` (`sec`), cali forti per `m.sector` (`capRows`, 212). NVDA, AVGO, AMD… stanno già in XLK: andrebbero cambiati i formati (titolo in più settori) e chi li legge (`renderMembers` 458-470 di `js/bottom.js`, `js/titles.js`, `test/alerts.test.js`, `test/capeq.test.js`).
- **Telegram parte subito** per il SOXX (`send_alerts.js:30` itera `SECTOR_KEYS`), senza il mese di prova degli indici; `alerts.json` registra `thresholds` con il nuovo livello.
- **Statistiche e testi dei settori**: «gli 11 settori» (README:14, index.html:829, guida 120 e 190), avvicinamento «50 tocchi su 63», «33 da solo», «17 su 43» (`js/bottom.js:448`, `index.html:841`, `js/signals.js:87`, README:67 e 180, `docs/sviluppo.md:176`), riquadri della vista 9 «Zone blu dal 2005 / Trigger dal 2005 / tutti i settori dal 2005» (`js/bottom.js:519-523`, calcolati dal vivo ma presentati come settori), test `signals.test.js:24` («tutti gli 11 settori») e `capeq.test.js:176`.
- **Doppione**: 17 titoli su 30 sono in XLK e pesano molto: Monitor e Bottom Map mostrerebbero spesso due punti che si muovono insieme.
- Stima: 5-8 giorni, con decisioni dell'utente su regole, formati e Telegram.

### 1.3 Testi e numeri che cambiano con la strada A (grep fatto)

| Dove | Testo | Cosa fare |
|---|---|---|
| `index.html:834`, `guida.html:120` e `:334`, README:81, `docs/sviluppo.md:167` | «22 indici azionari» (la guida li elenca per nome) | «22 indici azionari e l'industria dei semiconduttori (SOXX)»; aggiungere SOXX all'elenco della guida |
| `index.html:834`, `guida.html:336`, README:82 e :87 | «i 10 principali» | solo se SOXX ha `"main": true` (vedi decisione D3) |
| `js/indices.js:395`, README:258 | «Sugli indici con un livello di Rea… entro un punto in 6 casi su 12» | il SOXX ha un livello di Rea: o si ricalcola con `ricerca/qa/audit-0.9.0/testi/livelli.mjs` («x casi su 13») o lo script e il testo escludono le industrie |
| `js/indices.js:404` (tooltip mostrato anche nel dettaglio del SOXX), `index.html:834`, README:85 e :180, `docs/sviluppo.md:176` | avvicinamento «sui 22 indici… 89 tocchi su 132, 83 da solo» | idem, con `ricerca/attenzione/script/avvicinamento_pit_indici.mjs` |
| README:262 | «sui 9 indici della prima fase…», «Sui 13 indici con limiti, 54 episodi» | `ricerca/qa/audit-0.9.0/testi/risultati_indici.mjs` prende tutti gli indici con `limits`: il SOXX diventerebbe il 14° |
| README:205, `docs/sviluppo.md:128` e `:158` | «prova della capitolazione sui 22 indici» | resta vero (prova storica): nessuna modifica |
| README:195-196 (note di versione 0.9.6-0.9.7) | «22 indici» | note storiche: non si toccano |

**Raccomandazione**: un campo `"kind": "industria"` in `config/indices.json` e i tre script di ricerca che filtrano `kind !== 'industria'`, così i numeri pubblicati sugli indici restano quelli (detto nei testi: «sui 22 indici, SOXX escluso»). Le statistiche proprie del SOXX, se l'utente le vuole nei testi, vengono dall'agente del backtest con uno script in `ricerca/soxx/`. In alternativa si ricalcola tutto con il SOXX e si aggiornano i numeri in tutte le copie: più lavoro e più rischio di copie dimenticate.

## 2. Vista 2 Rotazione

- **Oggi**: né SOXX né SMH sono in `universe.json`.
- **Come si aggiunge**: una riga in `universe.json`, `groups["Settori S&P 500"].tickers` (riga 10), per esempio `"SOXX": "Semiconductors"`. `scripts/fetch_data.js` legge l'universo a ogni corsa (`meta` 51-60, `usGroups` 195) e scarica un ticker in più (una richiesta a Yahoo, 5 anni, circa +12 KB in `data/prices.json`). Nessun cambio di codice: gruppi, nomi e tabella Prezzi vengono dal file. Il SOXX compare dopo la prima corsa della Action su `main`.
- **Dove**: nell'universo dei settori contro SPY. Un gruppo a parte con il solo SOXX non ha senso (un ticker contro il benchmark), e la cosa utile da vedere è proprio «i semiconduttori guidano o seguono la tecnologia e gli altri settori». Ogni coda si calcola solo contro il benchmark, quindi gli 11 settori non cambiano; `sectorRotation` (`js/app.js:324-331`) usa il gruppo che contiene XLK ma il Monitor chiede solo i `SECTOR_KEYS`: il quadrante del Monitor resta uguale. `test/engine.test.js:7` usa i ticker del gruppo: il SOXX ha 5 anni di storia, il test regge.
  - Alternativa da proporre solo se l'utente vuole altre industrie (software, biotech, banche regionali…): gruppo nuovo «Industrie USA» contro SPY. Cambierebbe nome e testi; oggi non serve.
- **Conflitto nella barra dei comandi**: oggi un ticker scritto per intero vale più di un indice (`js/app.js:1033`, `isIndex(v) && !findSymbol(v, true)`). Con SOXX in rotazione e in vista 6, `SOXX` evidenzierebbe la coda nella rotazione e il dettaglio della vista 6 non si aprirebbe più dalla barra. È il secondo caso dopo CAC/CAC.PA (README, nota 0.9.7), ma qui le due stringhe sono uguali. Proposta (decisione D4): `SOXX` apre la vista 6 (la funzione nuova), `SOXX ROT` la rotazione; alias `SEMI` e `SEMICONDUTTORI` in `IX_ALIAS` (riga 1031). Serve un ramo «indice + vista» simile a quello dei settori (`XLK TIT`, righe 1025-1029), che oggi c'è solo per i settori e per `EMG`.
- **Testi**: README:34 «settori S&P 500 (contro SPY)», la riga della guida sugli universi, la nota della versione.

## 3. Vista 5 Titoli

Cosa mostrerebbe per il SOXX, in due livelli di costo.

### 3a. Livello 1 (consigliato nella fase 1): «Titoli dell'indice» nel dettaglio della vista 6

La tabella che il dettaglio del settore ha già («Titoli del settore», `renderMembers` in `js/bottom.js:458-470`): i 30 titoli dal più sopra al più sotto la media 200, distanza dalla media 200 e 50, drawdown a 52 settimane, la riga di taglio dove comincia chi è sotto, «4 su 30 sopra la media 200 · al … · 2 con meno di 200 sedute», più una colonna «Peso nel SOXX» (dal CSV). È la risposta a «chi è sotto la media».

- **Dati**: nuovo `data/index_latest.json` `{generated, asOf, series: {SOXX: {asOf, members: [{s, name, w, close, d200, d50, dd, up200}]}}}`, scritto da `scripts/fetch_indices.js` per gli indici con `"latest": true` in config (solo SOXX all'inizio; DJI, SMI, FTSE MIB potrebbero seguire). I prezzi ci sono già (`px`, 1 anno di spark, puliti con `clean`), alla stessa seduta pubblicata (`done.at(-1)`), con la stessa regola di `countDay` per `up200` (media a 200 solo con 200 chiusure). Pochi KB.
- **Nomi e pesi**: `parseIShares` oggi restituisce solo i ticker. Variante `parseIShares(text, parseCSV, foreign, { withInfo: true })` o funzione nuova `parseISharesInfo` che legge anche `Name` e `Weight (%)`; `fetchList`/`loadMembers` (`scripts/fetch_indices.js:50-97`) la passano al passo che scrive il file.
- **App**: funzione condivisa `membersTableHTML(rows, asOf)` in `js/format.js` (estratta da `renderMembers`), usata dalla vista 4 e da un pannello nuovo nella vista 6 (`index.html`, sotto «Situazione» nella colonna di destra, id `ixMemBox`/`ixMemTable`), visibile solo se il file ha l'indice scelto. File scaricato alla prima apertura del dettaglio di un indice con `latest` (`getJSON(..., true)`, opzionale: se manca, il pannello non c'è).
- **Costo**: mezza giornata più i test.

### 3b. Livello 2 (fase 2, solo se l'utente la vuole): il SOXX nella vista 5

Il SOXX come riga in più nel dumbbell «Grandi contro piccoli», la sua «Storia della divergenza» e la bubble dei titoli.

- **Dati**: `buildSectorMembers` (`scripts/lib/capeq.js:207-268`) funziona già con `sectors: ['SOXX']`, membri con `sector: 'SOXX'`, `life` di tutti `[['0000','9999']]` (membri di oggi) e `qty` dalle `Quantity` delle holdings del SOXX (`parseIvv` le legge già). Il «cap-weighted» diventerebbe il peso vero dell'ETF (con i suoi tetti): un controllo indipendente gratuito, perché deve seguire il prezzo del SOXX. Attenzione: `buildSectorMembers` aggiunge sempre una riga `SPX` calcolata sui titoli passati (riga 223): per il SOXX va tolta o non letta, altrimenti un «S&P 500» fatto di 30 semiconduttori.
- **Dove**: in `scripts/fetch_breadth.js` dopo `updateSectorMembers` (riga 408): 17 titoli hanno già i prezzi di 2 anni scaricati per l'S&P 500 (`prices`), servono `fetchDaily` di 2 anni per i 13 fuori (13 richieste, circa 10 s) e una richiesta per il CSV. File nuovo `data/industry_members.json`, stesso formato di `sector_members.json`, stesso `cal` (`breadth.dates`): se le date di `dates`/`starts` non coincidono con quelle di `sector_members.json` (una sera un file sì e l'altro no) la vista non unisce i due file e lo dice.
- **App** (`js/titles.js`): oggi `SECTORS = Object.keys(ctx.names)` (riga 64), la scelta è quella della vista 4 (`getSector`/`setSector`, `selectSector` accetta solo `SECTOR_KEYS`, `js/bottom.js:565`) e `#tit-XLK` passa da `isSector` (`js/app.js:305-312`). Serve: unire i due file nel browser, un chip «SOXX» staccato dagli 11 (con un separatore e l'etichetta «industria»), una scelta propria della vista 5 quando è il SOXX, il testo della bubble «peso nel SOXX» invece di «peso nell'S&P 500», la nota «membri di oggi: su YTD e 1 anno l'equal-weight risulta più alto del vero» (lo dice già il commento di `capeq.js:10-13`).
- **Costo**: 1,5-2,5 giorni con test e controlli. Rischio: la vista 5 è complessa (scia, storia, bubble, ordine): toccarla per un solo elemento ha un rapporto costo/beneficio basso finché il livello 1 basta.

## 4. Collegamenti XLK ↔ SOXX

- **Campo in config**: `"parent": "XLK"` nel SOXX. Così il collegamento è generico (un domani XBI sotto XLV) e nessun nome è scritto nel codice.
- **Dal SOXX a XLK (vista 6)**: in `ixLinks` (`js/indices.js:414-415`, dove c'è già il rimando alla vista 7) `<a href="#XLK">Settore che lo contiene: XLK Technology, vista 4 →</a>`. `#XLK` funziona già (`routeHash`, `js/app.js:305-307`). Facoltativo: una riga in «Situazione» con lo stato e la breadth di XLK, presi dalla vista 4 (`state.bottom.stateCode`, già esposto; servirebbe esporre anche la breadth di oggi).
- **Da XLK al SOXX (vista 4)**: un riquadro «Industria nel settore» nel dettaglio di XLK (vedi §8). Dati: `state.indices.ensureAll()` e `snapshot('SOXX')` esistono già e la vista 7 li usa così (`js/emerging-view.js:45, 71`). Va passato a `createBottom` un `ctx.industries(s)` che restituisce le chiavi con `parent === s` e una funzione che apre l'indice.
  - Costo di rete: il riquadro chiede i dati della vista 6 alla prima apertura di XLK (con `main: true` solo `data/indices.json`, circa 300 KB compressi; con `main: false` anche `indices_more.json`). Finché non arrivano il riquadro dice «Caricamento…»; se non arrivano, «Dati della vista 6 non disponibili» e resta il link.
- **Indirizzo diretto**: oggi non esiste `#idx-<indice>` (solo `#emg-<indice>`). Aggiungere in `routeHash` la forma `IDX-(\w+)` → `state.indices.open(k); setView('idx')`, così il link è `href="#idx-SOXX"`, funziona il tasto Indietro e il link si può condividere. `syncHash` può scrivere `#idx-SOXX` quando si sceglie un indice (oggi la vista 6 non tiene l'indice nell'indirizzo: decisione minore).

## 5. Pipeline notturna

| Cosa | Strada A (fase 1) | Fase 2 vista 5 | Strada B |
|---|---|---|---|
| Richieste Yahoo in più | `fetch_indices.js`: 11 simboli nuovi nello spark (20 per richiesta: 4.626 → 4.637 simboli, 232 richieste prima e dopo, quindi 0-1 in più), qualche eventuale ripresa da chart (`needsChart`), 1 chart per il prezzo SOXX (1 mese); `fetch_data.js`: 1 (SOXX, 5 anni) | 13 `fetchDaily` di 2 anni | 13 `fetchDaily` di 2 anni + 1 ETF in `sectors.json` dal 2004 |
| Altre richieste | 1 CSV iShares | 1 CSV iShares (o lo stesso passato tra gli script) | 1 CSV iShares |
| Tempo in più | pochi secondi (il passo indici dura meno di 3 minuti con 4.600 titoli) | circa 10-15 s | circa 15 s |
| File nuovi | `data/index_members/SOXX.json` (lista e cambi), `data/index_latest.json` | `data/industry_members.json` | nessuno, ma formati cambiati |
| File che cambiano | `indices.json` o `indices_more.json` (serie SOXX), `capitulation.json` (serie SOXX), `prices.json` (ticker SOXX) | — | `breadth.json`, `sectors.json`, `breadth_latest.json`, `capitulation.json`, `sector_members.json`, `alerts.json` |
| `check_fresh.js` | automatico per la serie, i cali forti e la lista (`indexLast`, `capLast`, `indexMembers`, righe 56-60 e 76-86); da aggiungere `index_latest.json` (4 giorni dalla breadth) | `industry_members.json` (4 giorni) e la data delle holdings (10 giorni, come IVV) | — |
| `need_update.js` | `US = ['SPX','NDX','DJI','RUT']` (riga 19): aggiungere `SOXX` solo se è in `indices.json` (`"main": true`), perché `check` legge solo quel file (righe 46-58). Non indispensabile: il SOXX si aggiorna nello stesso spark degli altri | — | — |
| Workflow | nessun passo nuovo: limite di 45 minuti lontano; il commit mette già `data/` e i file nuovi (`git add data/`) | idem | idem |
| Messaggio del commit | invariato | — | — |

**Ricostruzione della storia (una volta sola), il punto più delicato.** `fetch_indices.js` salta un indice che non è nel file (`if (!data.series[k] || !idx[n]) return;`, riga 293) e ha solo un anno di prezzi: la storia va costruita a mano e pubblicata su `main` insieme alla configurazione, altrimenti `test/indices.test.js` («ogni indice ha prezzo e breadth», `> 2000` sedute) fallisce e l'app non ha la serie. La regola del progetto «non si copia mai `data/` su `main`» resta: i dati si **generano** nel worktree di `main` sui file di `main` appena scaricati, non si copiano dal ramo di sviluppo. Va detto all'utente come eccezione una tantum (come per gli indici con limiti della F4). Sequenza:
1. worktree di `origin/main` aggiornato, fuori dagli orari della Action (22:40, 01:10-06:10, 11:40 UTC: altrimenti il `git pull --rebase` della Action va in conflitto su `indices.json`);
2. copia dei file dell'app (con `config/indices.json` con il SOXX e `"from": null`, `scripts/lib/members.js` con la fonte);
3. `data/index_members/SOXX.json` con un piccolo script una tantum che usa `fetchList`/`parseIShares` (meglio che lanciare tutto `fetch_indices.js`, che aggiornerebbe anche gli altri 21 indici);
4. `python3 scripts/backfill_indices.py prices --cache DIR --only SOXX` e `build --cache DIR --only SOXX` (scrive anche `"from"` in config: va riportato nel ramo di sviluppo);
5. `build` scrive tutte le serie in `indices.json` in forma estesa e **cancella `indices_more.json`** (`finish`, `scripts/backfill_indices.py:403-430`): subito dopo uno script una tantum con `splitIndices` (`scripts/fetch_indices.js:245-249`) per ridividere e compattare, come farebbe la Action;
6. cali forti: `backfill_capitulation.py` oggi ricostruisce tutto e chiede la release dell'S&P 500 (`--jb`, `--repo`). Aggiungere `--only K,…` che salta `sp500()`, calcola solo quegli indici con `indices(cache)` (righe 168-198) e li unisce al `capitulation.json` esistente (15-20 righe). Senza, la scheda dei cali forti del SOXX parte vuota e si riempie solo dalle sedute nuove (servono 3 anni per la soglia);
7. controllo: tutte le serie diverse da SOXX identiche byte per byte prima e dopo (script di confronto in `ricerca/soxx/`), poi `npm test`, poi push.

## 6. File e funzioni da toccare (strada A, fase 1)

| File | Righe | Modifica |
|---|---|---|
| `config/indices.json` | dopo `IBOV` | `"SOXX": { "name": "Semiconduttori (iShares SOXX)", "area": "Industrie USA", "kind": "industria", "parent": "XLK", "price": "SOXX", "composition": "oggi", "limits": true, "from": null, "blue": 3, "blueSource": "Rea", "latest": true, "source": "holdings iShares SOXX", "note": "…" }`; `main` da decidere (D3). Nota: prezzo dell'ETF di solo prezzo; membri di oggi; 13 titoli su 30 fuori dall'S&P 500 (ADR compresi); con 30 titoli il 3% vuol dire nessun titolo sopra la media; titoli quotati da poco contano sotto la media fino a 200 sedute (SKHY, CBRS); livello di partenza indicato da Massimo Rea (quant-rea). Aggiornare anche `_comment` (campi `kind`, `parent`, `latest`) |
| `scripts/lib/members.js` | 178-203 | `SOXX: { url: 'https://www.ishares.com/us/products/239705/x/latest-holdings.csv', kind: 'ishares', min: 28, max: 35 }` (titoli USA: niente `foreign`); lettore di nomi e pesi (§3a) |
| `scripts/fetch_indices.js` | 50-97, 251-329 | passare nomi e pesi; scrivere `data/index_latest.json` per gli indici con `latest`; commento in testa |
| `scripts/backfill_capitulation.py` | 201-218 | opzione `--only` (§5, passo 6) |
| `js/indices.js` | 18-24 | `TV.SOXX = ['NASDAQ:SOXX']` (nessuna serie pronta della breadth su TradingView: solo l'ETF; da verificare con un clic) |
| `js/indices.js` | 46 | `ORDER_AREAS` con «Industrie USA» in fondo |
| `js/indices.js` | 374-418 | link al settore `parent` in `ixLinks`; pannello «Titoli dell'indice»; testi delle righe 395 e 404 secondo §1.3 |
| `js/indices.js` | 452-457, 514-519 | `snapshot` restituisce anche `above200[now]` (per il riquadro di XLK) |
| `js/format.js` | — | `membersTableHTML` condivisa |
| `js/bottom.js` | 416-470, 50-56 | riquadro «Industria nel settore» per i settori con figli; `renderMembers` usa la funzione condivisa |
| `js/app.js` | 257-262, 305-313, 1025-1054 | `industries`/`openIndex` a `createBottom`; route `#idx-<K>`; comandi `SOXX`, `SOXX ROT`, `SEMI` |
| `index.html` | 424-430, 649-652, 829-855 | pannelli nuovi; testi «22 indici»; elenco comandi |
| `css/style.css` | — | riquadro dell'industria (riusa `.r .track` della distanza dal livello blu e `.st` dei badge) |
| `universe.json` | 10-24 | `"SOXX": "Semiconductors"` nei settori |
| `scripts/check_fresh.js` | 25-60, 76-90 | `index_latest.json` |
| `scripts/need_update.js` | 19 | `SOXX` solo con `main: true` |
| `ricerca/attenzione/script/avvicinamento_pit_indici.mjs`, `ricerca/qa/audit-0.9.0/testi/livelli.mjs`, `.../risultati_indici.mjs` | 12-15, 6-16, 5-10 | filtro `kind !== 'industria'` (o ricalcolo, §1.3) |
| `guida.html` | 120, 190, 334-340, comandi | SOXX nella vista 6, il riquadro in XLK, la tabella dei titoli, il comando |
| `README.md` | 3, 34, 81-87, tabella «Indici con limiti» 236-252, «Livelli» 258, Personalizzare | riga del SOXX con «3% (Rea)», membri di oggi, nota di versione |
| `docs/sviluppo.md` | 3, §3, §7 | stato e decisioni |
| `js/version.js`, `version.json` | — | 1.9.0 (funzione nuova) |

## 7. Rischi e casi limite

- **Holdings non disponibili o cambiate**: `loadMembers` tiene l'ultima lista buona e lo dice; `checkList` con 30 titoli e soglia 80% scarta una lista con più di 6 cambi in una volta (i ribilanciamenti dell'indice ne fanno di solito pochi: da verificare con la storia del SOXX, altrimenti alzare il limite solo per lui). Un CSV con zero righe Equity (formato cambiato) dà «lista vuota» → ultima buona.
- **Ticker che cambiano** (ADR rinominati, `BRK.B` → `BRK-B`): `parseIShares` senza `foreign` sostituisce punti e spazi con trattini, come per IWM.
- **Titoli quotati da poco** (SKHY, CBRS): sotto la media fino a 200 sedute, `young` nella tabella; nel `countDay` il controllo `short` (riga 200) riguarda solo chi ha un anno intero di prezzi, quindi non scarta le sedute.
- **Livello 3% con n che cambia**: con 34 titoli o più un titolo sopra la media resterebbe sotto il 3%; la `note` deve dire «con 30 titoli», non «sempre zero».
- **Storia con i membri di oggi**: la breadth del passato è più alta del vero nelle fasi intermedie (+3,6 punti in media sul Nasdaq-100, README) e per un paniere di 30 titoli dove un terzo è entrato da poco può esserlo di più: lo misura l'altro agente; nell'app la riga «qualità della storia» lo dice già per gli indici con `composition: "oggi"`.
- **Prezzo**: SOXX di solo prezzo (come gli altri ETF della vista 6: XIU, 510300, EEM) contro ^SOX con la storia dal 1994. Il SOXX dal 2021 segue un indice diverso dal PHLX SOX: per coerenza con le holdings meglio l'ETF. Da confermare con l'altro agente.
- **Bottom Map degli indici sul telefono**: un'etichetta in più vicino a NDX (le etichette che si toccano sono già un rilievo minore aperto, `docs/sviluppo.md` §7).
- **Ricostruzione su `main`**: vedi §5; il rischio vero è pubblicare dati vecchi degli altri indici o lasciare `indices_more.json` cancellato. Il confronto byte per byte del passo 7 lo evita.
- **Riquadro in XLK**: se la vista 6 non è disponibile (`config/indices.json` mancante: `state.indices` è null, `js/app.js:263-264`) il riquadro non deve comparire.
- **Comando `SOXX`**: dopo il cambio di precedenza, un test deve garantire che `CAC` apra ancora l'indice e `CAC.PA` l'ETF.
- **Livello blu nel browser**: `ixBlue` salva i livelli per chiave; il SOXX entra da solo (`validBlue` accetta interi 0-60).

## 8. Test

**`npm test`** (oggi 144 test):
- `test/indices.test.js`: CSV del SOXX ridotto in `test/fixtures/` (righe NASDAQ e NYSE, un ADR, Cash e Futures) → 30 ticker; `checkList` con `SOURCES.SOXX`; il test esistente su `indices.json` (prezzo e breadth, file giusto per `main`) copre la serie nuova.
- `index_latest.json`: per ogni indice con `latest`, la somma di `up200` è uguale a `a200` alla stessa seduta di `indices.json`, e `members.length` uguale a `n` (stessa regola di `countDay`).
- `backfill_capitulation.py --only`: le altre serie non cambiano (test Python leggero o confronto in `ricerca/soxx/`).
- `test/pipeline.test.js`: `staleData` segnala `index_latest.json` fermo.
- Comandi: funzione pura per la precedenza indice/ticker (oggi è dentro `onsubmit`: estrarla per poterla provare) con i casi `SOXX`, `SOXX ROT`, `SEMI`, `CAC`, `CAC.PA`.
- Configurazione: ogni indice con `parent` punta a un settore di `SECTOR_KEYS`; `kind`, se c'è, vale `industria`.

**Playwright** (`ricerca/qa/browser/v190.cjs`, deve fallire sulla 1.8.0), su 1440 scuro, 1280 chiaro, 390 scuro con il tocco, 820:
- vista 6: SOXX nel selettore sotto «Industrie USA», nel tabellone e nella Bottom Map quando è mostrato; dettaglio con titolo, badge, «Perché questo stato», livello blu 3% con la frase su Rea, «Con 30 titoli, uno vale 3,3 punti», nota di qualità, link `NASDAQ:SOXX` e link a XLK;
- pannello «Titoli dell'indice»: 30 righe, conteggio uguale a «Titoli sopra media 200» della Situazione, riga di taglio;
- vista 4 XLK: riquadro presente, stato uguale a quello della vista 6, link che apre il SOXX; negli altri 10 settori assente;
- `#idx-SOXX` apre il dettaglio, Indietro torna alla vista prima;
- barra: `SOXX` → vista 6, `SOXX ROT` → rotazione con SOXX evidenziato, `CAC` e `CAC.PA` come prima;
- vista 2: SOXX nella tabella e nel grafico dei settori;
- console senza errori; regressioni `v091.cjs`, `v095.cjs`, `v130.cjs`, `v180.cjs`.

## 9. Stima del lavoro

| Parte | Tempo |
|---|---|
| Configurazione, fonte, test del lettore | 1 h |
| Ricostruzione della storia e dei cali forti (`--only`), confronto, procedura su `main` | 3-4 h |
| `index_latest.json` e pannello «Titoli dell'indice» | 4-6 h |
| Ponti XLK ↔ SOXX, `#idx-`, comandi | 2-3 h |
| Rotazione (universo) | 0,5 h |
| Testi (README, guida, index.html, sviluppo, statistiche con `kind`) | 3-4 h |
| Test, Playwright, controlli indipendenti | 4-6 h |
| **Totale fase 1** | **circa 2,5-3 giorni** |
| Fase 2 (SOXX nella vista 5) | 1,5-2,5 giorni |
| Strada B (per confronto) | 5-8 giorni, più le decisioni su regole e Telegram |

## 10. Raccomandazione

**Strada A**, con:
1. **Vista 6**: SOXX come «industria» (area «Industrie USA», `kind: "industria"`), membri di oggi dalle holdings iShares, prezzo dell'ETF, livello blu 3% citato come idea di Massimo Rea, nota su «3% = nessun titolo con 30 titoli» e sui titoli giovani; tabella «Titoli dell'indice».
2. **Vista 2**: SOXX nell'universo dei settori contro SPY; `SOXX` nella barra apre la vista 6, `SOXX ROT` la rotazione.
3. **Vista 4**: riquadro «Industria nel settore» in XLK e link inverso dal SOXX.
4. **Vista 3**: niente punto SOXX nella Bottom Map dei settori (sta nella Bottom Map della vista 6, con la stessa data scorrevole).
5. **Vista 5**: solo la tabella della vista 6 nella fase 1; il SOXX nel dumbbell e nella bubble come fase 2, se l'utente lo chiede dopo averla vista.
6. **Telegram**: niente nella fase 1; il SOXX segue la decisione «Telegram per gli indici dopo il mese di prova».
7. **Statistiche nei testi**: quelle degli indici restano sui 22 (SOXX escluso con `kind`).

**Decisioni per l'utente prima del codice**: D1 strada A (o B); D2 livello 3% sapendo che con 30 titoli vuol dire zero titoli sopra la media (e cosa dice il backtest); D3 `main: true` (visibile di partenza, «11 principali» nei testi, riquadro di XLK più leggero) o `false`; D4 precedenza del comando `SOXX`; D5 statistiche degli indici con o senza il SOXX; D6 fase 2 della vista 5 sì o no; D7 Telegram; D8 la ricostruzione della storia su `main` come eccezione una tantum alla regola sui dati.

## 11. Idea grafica

**Vista 4, dettaglio di XLK, riquadro «Industria nel settore»**
- *Computer*: nella colonna di destra, tra «Situazione» e «Titoli del settore», un pannello con lo stesso stile degli altri. Intestazione: «Industria nel settore · Semiconduttori (SOXX)», a destra in grigio «vista 6 · membri di oggi». Prima riga: il badge dello stato del SOXX (stesse icone e colori del Monitor; anello tratteggiato se in avvicinamento) e «4/30 sopra la media 200 · 13,3%». Seconda riga: la barra della distanza dal livello blu, identica a quella accanto alla Bottom Map degli indici (traccia, zero = livello blu, barra rossa se sotto), con «+10,3 pt · 4 titoli al livello blu». Terza riga: mini-grafico di un anno della breadth del SOXX (linea), con la linea tratteggiata del livello 3% e, più chiara, la breadth di XLK per confronto: si vede subito se i semiconduttori anticipano il settore. In fondo «Livello blu 3%, idea di Massimo Rea (quant-rea)» e il link «Apri SOXX nella vista 6 →». Durante il caricamento della vista 6 una riga «Caricamento…»; se i dati non ci sono, «—» e il link.
- *Telefono* (fino a 900 px la colonna di destra va sotto il grafico): stesso pannello a tutta larghezza; badge e conteggio sulla stessa riga se ci stanno, altrimenti a capo; mini-grafico alto 48 px a tutta larghezza; il link è un pulsante alto almeno 44 px. Tema chiaro e scuro con i token esistenti (`--ink-2`, `--rule`, colori degli stati).

**Vista 6, dettaglio del SOXX**
- Situazione: in fondo i link «NASDAQ:SOXX su TradingView ↗» e «Settore che lo contiene: XLK Technology, vista 4 →».
- Pannello nuovo «Titoli dell'indice» sotto Situazione: la tabella della vista 4 con la colonna «Peso», riga di taglio tra sopra e sotto la media, meta «4 su 30 sopra la media 200 · al 10/11/2026 · 2 con meno di 200 sedute». Sul telefono prima colonna fissa, come le altre tabelle.
- Selettore «Indici mostrati»: un gruppo in fondo «Industrie USA» con il chip «SOXX»; nel tabellone una riga come le altre con «con limiti»; nella Bottom Map un punto con l'etichetta «SOXX» (stessa forma: un simbolo diverso per le industrie è possibile, ma aggiunge una legenda per un solo punto).

**Vista 2**: una coda in più nel grafico dei settori, etichetta «SOXX», colore del quadrante come le altre; in tabella il nome «Semiconductors».
