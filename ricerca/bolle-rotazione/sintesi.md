# Distanza dal massimo storico («le bolle che si sgonfiano a rotazione») · fase 1

> **Aggiornamento del 12/11/2026 (decisione dell'utente):** nell'app il riferimento è il **massimo di chiusura degli ultimi 3 anni** (il picco dell'ultimo ciclo), non il massimo di sempre descritto qui sotto; il massimo di sempre resta nel dettaglio della riga. Confronto tra le definizioni in `riferimento/confronto.mjs` e `riferimento/confronto.json`. Il resto della nota (serie, seconde fonti, casi limite) vale com'è.

Verifica preliminare del 12/11/2026, sola lettura sull'app. Idea dell'utente da una slide di Francesco Caruso (Cicli&Mercati), usata solo come controllo esterno.

- **Script**: `ricerca/bolle-rotazione/dati.mjs` (scarica in `cache/`, esclusa da git, e scrive `risultati.json`).
- **Ricalcolo indipendente**: `ricerca/bolle-rotazione/verifica.py` (Python, altro codice sugli stessi dati). Risultato: tutti i numeri coincidono.
- **Rifare**: `node ricerca/bolle-rotazione/dati.mjs --refresh && python3 -I ricerca/bolle-rotazione/verifica.py`.

Tutti i numeri qui sotto vengono da `risultati.json`.

## 1. Cosa ho capito e verdetto

**Cosa ho capito.** Un pannello descrittivo, senza segnali né soglie. Per un elenco fisso di mercati mostra quanto ciascuno è sotto il suo massimo di chiusura, con la data del massimo. Così si vede chi si è già sgonfiato e chi è ancora vicino al massimo.

**Esiste già?** Solo in parte, e sempre su 52 settimane, non dall'inizio della storia:
- nella rotazione, gruppo «5 · Asset reali», le colonne «Drawdown da max 52s» e «Solo prezzo» di GLD, SLV, CPER, USO, BTC-USD e SPY (`js/app.js:228-236`, `:436`);
- nella vista 8 VIX, il credito come distanza dal massimo di 12 mesi;
- nella vista 6, la colonna «Dal max 52s» dei cali forti.

**Verdetto: procedi con modifiche.** I dati reggono e le seconde fonti confermano massimi e date. Restano però quattro scelte da fare con l'utente:
1. **Chiusura o intraday.** Raccomando la chiusura, come chiede l'idea. La slide usa il massimo intraday almeno per l'S&P 500 (punto 4).
2. **Oro e argento con gli ETF fisici GLD e SLV** invece dei future continui GC=F e SI=F (punto 3).
3. **Petrolio.** Il massimo è del 2008, quindi la riga dice poco sulla «bolla» del 2026. Il calo massimo non si può calcolare, perché il WTI ha chiuso sotto zero il 20/04/2020.
4. **Dove metterlo.** Raccomando la vista 8 come pannello di contesto (punto 6).

## 2. Valori attuali

Valori al 12/11/2026, ultima seduta chiusa di ogni mercato. «Dal» è l'inizio della serie: il massimo è «dal …», non assoluto. Le chiusure sono solo prezzo, nella valuta di quotazione (dollari; KOSPI in won). Le righe in corsivo sono l'alternativa scartata.

| Mercato | Serie | Dal | Ultima chiusura | Massimo di chiusura | Distanza | Giorni dal massimo | Calo massimo dal picco | Risalita dal minimo |
|---|---|---|---|---|---|---|---|---|
| Bitcoin | BTC-USD | 17/09/2014 | 73.964,47 (11/11/2026) | 124.752,53 (06/10/2025) | **−40,71%** | 401 | −53,06% (30/06/2026) | +26,31% |
| Oro | GLD | 18/11/2004 | 365,17 (11/11/2026) | 495,90 (29/01/2026) | **−26,36%** | 286 | −28,26% (30/10/2026) | +2,64% |
| *Oro* | *GC=F* | *30/08/2000* | *4.000,50 (11/11/2026)* | *5.318,40 (29/01/2026)* | *−24,78%* | *286* | *−26,69% (30/10/2026)* | *+2,61%* |
| Argento | SLV | 28/04/2006 | 46,65 (11/11/2026) | 105,60 (28/01/2026) | **−55,82%** | 287 | −57,77% (30/10/2026) | +4,60% |
| *Argento* | *SI=F* | *30/08/2000* | *51,88 (11/11/2026)* | *115,08 (26/01/2026)* | *−54,92%* | *289* | *−57,34% (30/10/2026)* | *+5,67%* |
| Rame | HG=F | 30/08/2000 | 6,27 (11/11/2026) | 6,80 (09/09/2026) | **−7,78%** | 63 | −8,61% (06/11/2026) | +0,91% |
| Petrolio WTI | CL=F | 23/08/2000 | 86,53 (11/11/2026) | 145,29 (03/07/2008) | **−40,44%** | 6705 | sotto zero (20/04/2020) | — |
| *Petrolio Brent* | *BZ=F* | *30/07/2007* | *92,76 (11/11/2026)* | *146,08 (03/07/2008)* | *−36,50%* | *6705* | *−86,77% (21/04/2020)* | *+379,88%* |
| Nasdaq-100 | ^NDX | 01/10/1985 | 28.374,25 (11/11/2026) | 31.224,47 (06/10/2026) | **−9,13%** | 36 | −14,71% (05/11/2026) | +6,55% |
| S&P 500 | ^GSPC | 30/12/1927 | 7.619,38 (11/11/2026) | 7.818,93 (06/10/2026) | **−2,55%** | 36 | −5,95% (05/11/2026) | +3,61% |
| Semiconduttori | SOXX | 13/07/2001 | 155,40 (11/11/2026) | 218,34 (22/06/2026) | **−28,83%** | 142 | −39,59% (05/11/2026) | +17,82% |
| KOSPI (Corea) | ^KS11 | 11/12/1996 | 5.342,73 (12/11/2026) | 9.114,55 (22/06/2026) | **−41,38%** | 143 | −44,94% (09/11/2026) | +6,45% |

**Ordine di sgonfiamento** (data del massimo, dal più vecchio):
1. petrolio (03/07/2008);
2. bitcoin (06/10/2025);
3. argento (26–28/01/2026);
4. oro (29/01/2026);
5. semiconduttori e KOSPI (22/06/2026);
6. rame (09/09/2026);
7. Nasdaq-100 e S&P 500 (06/10/2026).

Il campo è `deflationOrder` in `risultati.json`.

**Massimo delle ultime 52 settimane, solo come contesto** (campi `max52w` e `dist52wPct`):
- WTI: massimo il 07/04/2026, −23,39%;
- Brent: massimo il 31/03/2026, −21,62%;
- bitcoin: massimo il 12/11/2025, −27,25%.

## 3. Serie e fonti, mercato per mercato

| Mercato | Serie consigliata | Perché | Già nella pipeline? | Seconda fonte e risultato |
|---|---|---|---|---|
| Bitcoin | Yahoo `BTC-USD`, giorno UTC, 7 giorni su 7 | quella dell'app | sì, ma 5 anni, allineata alle sedute NYSE (`data/prices_macro.json`) | **Bitstamp** (giorni UTC, dal 2011): stesso massimo il 06/10/2025 (124.728 contro 124.752,53), distanza −40,74% contro −40,71%, scarto mediano 0,10%. **FRED CBBTCUSD** (Coinbase): massimo datato 05/10/2025, perché dal 08/09/2024 al 03/11/2025 circa FRED data la serie un giorno prima di Yahoo (`verifica.py`). Da usare solo per i valori, non per le date. |
| Oro | Yahoo `GLD` (ETF fisico, prezzo LBMA meno lo 0,40% annuo di commissioni) | stessa ora di chiusura degli indici USA (16:00 New York), nessun cambio di contratto; già scaricato | sì, 5 anni (GLD non paga dividendi) | GC=F: stesso giorno del massimo (29/01/2026), ma distanza −24,78% contro −26,36%. Il rapporto GC=F/GLD si sposta del +2,15% tra il massimo e oggi: cambi di contratto e ora della chiusura del future, che su Yahoo non è quella delle 16:00 di New York. Il prezzo LBMA non è più su FRED (`GOLDPMGBD228NLBM` non esiste) e `prices.lbma.org.uk` risponde 403: nessuna fonte spot raggiunta. |
| Argento | Yahoo `SLV` (fisico, 0,50% annuo) | come l'oro | sì, 5 anni | SI=F: massimo il 26/01/2026, SLV il 28/01/2026. Il 26/01 SLV chiude il 14,5% sotto SI=F: è lo scarto più grande dal 2006 (mediano 4,9%), in una giornata con escursioni enormi. La chiusura del future su Yahoo non è delle 16:00. Il controllo sul dato segnala il massimo di SI=F il 19,9% sopra la mediana delle 5 sedute prima e dopo (`athVsNeighboursPct`). |
| Rame | Yahoo `HG=F` (COMEX, $/libbra) | non c'è un ETF fisico; CPER segue un indice di futures con il rollover | no (solo CPER, 5 anni) | CPER: massimo il 22/09/2026, contro il 09/09/2026 di HG=F; il massimo intraday di HG=F è proprio del 22/09/2026, deriva +0,34%. FRED `PCOPPUSDM` (FMI, media mensile LME): massimo nel mese di settembre 2026. |
| Petrolio | Yahoo `CL=F` (WTI, primo contratto) | il «prezzo del petrolio» di riferimento | no (solo USO) | **FRED DCOILWTICO** (spot Cushing, dal 1986): massimo 145,31 il 03/07/2008, contro 145,29 nello stesso giorno, scarto mediano giornaliero 0,12%. Anche dal 1986 non c'è un massimo più alto. **USO è il tranello**: massimo 939,84 il 14/07/2008 (−84,95%). Nei 5 anni della pipeline USO ha il massimo il 23/10/2026 (−16,56%), mentre il WTI lo ha l'08/03/2022: il rollover cambia sia la data sia la distanza. Brent `BZ=F` contro FRED DCOILBRENTEU: stesso giorno del massimo, ma il future contro lo spot Dated ha uno scarto mediano dell'1,22%. |
| Nasdaq-100 | Yahoo `^NDX`, solo prezzo | — | sì, dal 1990 (`data/vix.json`) e dal 2000 (`data/indices.json`) | **FRED NASDAQ100** (dal 1986): stesse chiusure (scarto mediano 0), stesso massimo. |
| S&P 500 | Yahoo `^GSPC`, solo prezzo | — | sì, dal 1990 e dal 2000 | **FRED SP500** (solo ultimi 10 anni): stesse chiusure, stesso massimo. Nei file della pipeline, a parità di periodo, nessuna differenza. |
| Semiconduttori | Yahoo `SOXX`, chiusura rettificata solo per gli split (solo prezzo, come gli indici) | è l'industria dell'app | sì, ma solo con i dividendi (`data/industries.json`) | Con i dividendi −28,78% contro −28,83% (stesso giorno). ^SOX (PHLX, dal 1994): stesso giorno, −27,81%; SOXX segue dal 2021 un indice ICE, non il PHLX. |
| KOSPI | Yahoo `^KS11` (KOSPI Composite, won) | — | sì, dal 2000: è il prezzo della riga «KOSPI 200» della vista 6 | Nessuna seconda fonte dell'indice: KRX vuole il login (`ricerca/indici/fonti-dati.md` §2.15). Controllo di coerenza: KODEX 200 (`069500.KS`, altro indice) ha il massimo lo stesso giorno, −43,22%; EWY in dollari il 18/06/2026, −32,57%. |

Altre fonti provate e non usate:
- **Stooq**: risponde vuoto.
- **API storica di nasdaq.com**: non provata. Vuole intestazioni da browser e la richiesta è stata bloccata in questa sessione.
- **LBMA**: risponde 403.

Note sui dati:
- **Festività.** I future su Yahoo non hanno barre nei giorni di chiusura della NYSE (controllato sul 2026), né nei fine settimana.
- **Orari diversi.** Il KOSPI chiude prima: la mattina in Europa ha già la seduta di oggi, gli Stati Uniti quella di ieri. Il bitcoin ha anche sabato e domenica. Ogni riga deve quindi mostrare la sua data.
- **Massimi isolati.** Il controllo sul dato (`athVsNeighboursPct`) non trova massimi isolati da errore. I valori alti dicono che i massimi sono veri ma in giornate di picco con crollo subito dopo: argento +19,9%, SOXX +8,55%, oro +7,43%.

## 4. Confronto con la slide

Chiusure al 09/11/2026; per il bitcoin al 05/11/2026.

| Slide | Il nostro calcolo | Spiegazione |
|---|---|---|
| S&P 500 −3,76%, massimo 7.844,52 | dalla chiusura massima 7.818,93: −3,44%; dal massimo intraday del 06/10/2026, 7.844,52: **−3,76%** | La slide usa il **massimo intraday** (Yahoo, identico al centesimo) contro la chiusura del 09/11 (7.549,94). |
| Nasdaq −8,50% | Nasdaq Composite, chiusura contro chiusura: **−8,50%**; Nasdaq-100 −10,62% | «Nasdaq» nella slide è il **Composite**, e qui è chiusura su chiusura. Il metodo non è lo stesso della riga dell'S&P 500. |
| Oro −26,04%, massimo 5.595 | GC=F: −22,64% dalla chiusura massima (5.318,40), −26,35% dal massimo intraday (5.586,20); GLD: −23,47% e −25,54% | La slide usa l'**oro spot** con il **massimo intraday** (5.595): la chiusura implicita è 4.138,06, contro 4.114,50 del future. Spot non verificabile con le fonti raggiunte. |
| Bitcoin −39,77% (dato al 5/11) | al 05/11: −39,13% dalla chiusura massima, −39,82% dal massimo intraday (126.198,07); al 09/11: −39,70% dalla chiusura | Vicino in entrambe le letture, entro 0,07 punti. Dipende dall'ora della «chiusura» di una moneta che quota sempre e dal massimo usato; non si può dire quale. |

Conclusione: le differenze vengono da quattro cose:
- massimo intraday contro massimo di chiusura;
- spot contro future;
- Composite contro Nasdaq-100;
- ora della chiusura del bitcoin.

Con le stesse scelte i numeri tornano. Nell'app conviene il massimo di **chiusura** per tutti, scritto chiaramente. Il massimo intraday, se si vuole, va solo nel tooltip.

## 5. Idee di contorno

- **Giorni dal massimo**: sì, in giorni di calendario. Le sedute non sono confrontabili tra bitcoin, Corea e USA.
- **Calo massimo nel ciclo attuale** (minimo di chiusura dopo il massimo, con data) e **risalita dal minimo**: sì. Il calo massimo va come tacca sulla barra, come il «peggior drawdown a 5 anni» del Monitor. Caso limite: WTI sotto zero il 20/04/2020, dove la percentuale (−125,9%) non ha senso. Lì la tacca va tolta, con «sotto zero il 20/04/2020» nel tooltip.
- **Ordine di sgonfiamento**: sì, come secondo ordinamento della tabella («per data del massimo»), senza classifiche né colori di giudizio.
- Niente soglie e niente colori per profondità: una sola tinta neutra per tutte le barre.

## 6. Piano di inserimento

**Dove.** Raccomando la **vista 8 VIX**, come pannello «Distanza dal massimo storico» prima di «Come leggere il VIX» (`index.html:477`, dentro `#vxBody`). Motivi:
- la vista è già «solo contesto», senza regole né alert (`js/vix-view.js:1-6`);
- ha già una «distanza dal massimo» (credito);
- carica i suoi dati alla prima apertura, quindi il Monitor non rallenta.

Le altre posizioni, scartate:
- **Monitor**: è la pagina degli stati dei settori, sul percorso di avvio veloce (`js/app.js:94-99`).
- **Vista 6**: è sulla breadth degli indici, non ha materie prime né bitcoin.
- **Rotazione «5 · Asset reali»**: è forza relativa, non ha Nasdaq-100, SOXX e KOSPI, e USO lì resta il tranello.

Se l'utente vuole più visibilità, si può aggiungere nel Monitor un link «Massimi storici →» alla vista 8.

**Dati: un passo nuovo, piccolo e indipendente.**
- **`config/ath.json`**: per ogni mercato `id`, `label`, simbolo Yahoo, tipo, nota e `maxAge` in giorni per `check_fresh`. KOSPI 12, perché nel 2017 c'è stata una pausa di 11 giorni (`ricerca/emergenti/dati/dati.md`); gli altri 4; bitcoin 2.
- **`scripts/fetch_ath.js`**:
  - usa `fetchDaily(sym, { period1: -2208988800, raw: true })` da `scripts/lib/yahoo.js:49`, tutta la storia, 9 richieste;
  - ricalcola ogni notte dall'intera storia, senza un massimo «salvato»: le revisioni di Yahoo entrano da sole;
  - se un mercato non risponde, tiene la riga del file precedente con la sua data e lo mette in `missing`;
  - non scrive orari di download per riga, così `scripts/keep_unchanged.js` evita i commit inutili;
  - avvisa se il nuovo massimo è più basso del precedente oltre lo 0,5% (storia troncata o rivista) e se il massimo è isolato, oltre il 25% sopra entrambe le sedute vicine.
- **`data/ath.json`**, circa 3 KB:
  - in testa `generated`, `method` e `missing`;
  - per ogni mercato `label`, `symbol`, `start`, `last`, `lastDate`, `ath`, `athDate`, `distPct`, `days`, `cycleLow`, `cycleLowDate`, `cycleLowPct` (null se c'è una chiusura ≤ 0 dopo il massimo), `intradayAth` e `intradayAthDate` per il tooltip.
- **Calcolo in `js/ath.js`**, condiviso tra script e test come `js/metrics.js`. Il browser mostra i valori del file e non ricalcola.
- **Workflow** (`.github/workflows/update-data.yml:84-88`): passo «Distanza dal massimo storico» dopo il VIX, con `continue-on-error: true` e `timeout-minutes: 5`. Il file entra già con `git add data/` (riga 124); nel messaggio di commit (righe 128-136) si aggiunge la data.
- **`scripts/check_fresh.js:57-61`**: un controllo per mercato con `maxAge`.
- **`js/app.js`**:
  - `:82`, nello `SHAPE`, aggiungere `'data/ath.json': ['markets']`;
  - `:275`, in `createVix`, un secondo `load` facoltativo (`getJSON('data/ath.json', true, true)`): se manca, il pannello dice che i dati non ci sono e il resto della vista funziona.

**Come mostrarlo.** Una tabella con barre, come nella slide:
- **colonne**: Mercato (con la serie in piccolo: «GLD, ETF fisico»), Distanza dal massimo (numero e barra), Massimo (data e «x giorni fa»), Ultima chiusura (data);
- **barra**: scala fissa da 0 a −60%, tacca grigia al calo massimo (classi `.bar`, `.bar i` e `.bar .mark` di `css/style.css:239-242`);
- **ordinamento**: per distanza (predefinito) o per data del massimo;
- **tooltip**: prezzi, «massimo di chiusura dal 17/09/2014», massimo intraday, note per riga (fisico contro future, petrolio sotto zero nel 2020, KOSPI in won, bitcoin 7 giorni su 7);
- **sotto**: la nota delle approssimazioni e l'idea citata («da una slide di Francesco Caruso, Cicli&Mercati»; chiedere all'utente se va bene citarlo).

**Telefono (390 e 360 px).** Righe a scheda come `.board-cards` (`css/style.css:705`):
- prima riga: nome e distanza;
- seconda riga: barra a tutta larghezza;
- terza riga: «massimo il 06/10/2025 · 401 giorni fa».

Niente scorrimento orizzontale; i dettagli si aprono al tocco, come le schede del Monitor.

**Temi.** Solo variabili esistenti: `--bar-fill`, `--ink-3`, `--panel-2`. Va controllato il contrasto della barra nel tema scuro. Lo zoom non serve.

**Casi limite da gestire e testare.**
- **Nuovo massimo oggi**: 0,0%, «massimo oggi», nessuna tacca.
- **Parità con il massimo**: vale la prima data.
- **Mercato chiuso per festa**: la riga resta alla sua ultima seduta, con la data in grigio se più vecchia delle altre.
- **Dato in ritardo o fetch fallito**: riga del giorno prima, segnata, e `missing`.
- **Mercato assente nel file**: riga con «—».
- **Bitcoin**: solo giorni UTC chiusi (yahoo.js scarta la barra in corso).
- **Chiusure ≤ 0**: niente calo massimo né risalita.
- **Serie con meno storia**: il «dal …» lo dice.

**Test.**
- **`test/ath.test.js`**:
  - `athStats` su serie piccole scritte a mano: nuovo massimo all'ultima seduta (0 e 0 giorni), parità, chiusura negativa, taglio a una data;
  - confronto con `risultati.json` su un estratto reale salvato in `test/fixtures/` (per esempio ^GSPC e CL=F nel 2008–2026);
  - il file mancante dà «—».
- **`test/syntax.test.js`**: copre già `js/*.js`; aggiungere `scripts/fetch_ath.js` se non è coperto.
- **`check_fresh`**: test del nuovo controllo.
- **Browser** (`ricerca/qa/browser/v1100.cjs`), a 1440/1280 e 390/360 px, chiaro e scuro:
  - 9 righe;
  - valori uguali a `data/ath.json`;
  - nessuno scorrimento orizzontale a 390 px;
  - ordinamento;
  - tooltip;
  - pannello senza dati.

  Come chiede la skill, il controllo deve fallire sulla 1.9.1.

**Versione e testi.**
- Versione 1.10.0: `js/version.js:8-10` e `version.json` insieme, nota in `README.md` (sezione vista 8, `:96`, e note di versione, `:171`).
- `guida.html:393-399`: un paragrafo nella sezione 8 VIX.
- `docs/sviluppo.md`: decisione e fonti.

## 7. Rischi e limiti

- **«Storico» vuol dire «dall'inizio della serie».** Le serie partono così: future dal 2000, GLD 2004, SLV 2006, bitcoin 2014, KOSPI 1996. Per petrolio, Nasdaq-100 e bitcoin una seconda fonte più lunga (FRED dal 1986, Bitstamp dal 2011) conferma che prima non c'è un massimo più alto. Per oro, argento, rame e KOSPI non ho una fonte più lunga verificata: l'app deve dire «massimo dal …».
- **Oro e argento con gli ETF fisici.** Sono vicini allo spot, ma con la commissione (0,40% e 0,50% l'anno) la distanza da un massimo vecchio è leggermente più ampia. Con i future, invece, ci sono il rollover e l'ora della chiusura: per l'oro oggi 1,6 punti di differenza (−24,78% contro −26,36%), per l'argento un giorno diverso del massimo.
- **Rame e petrolio con il future continuo.** I cambi di contratto spostano il livello. Per il WTI la deriva contro lo spot FRED è del −3,55% in 18 anni, con scarto giornaliero mediano 0,12%. L'app lo deve dire.
- **Nessun total return.** Indici, SOXX ed ETF sono solo prezzo, come «Solo prezzo» nella rotazione. Per SOXX la differenza oggi è di 0,05 punti.
- **Valute.** Tutto è nella valuta di quotazione: il KOSPI in won (in dollari, con EWY, il quadro è diverso), il resto in dollari. Per un investitore in euro il calo è un altro: va scritto.
- **Nome del KOSPI.** Nella vista 6 la riga si chiama «KOSPI 200» ma usa ^KS11 come prezzo (nota in `config/indices.json`). Nel pannello va chiamato «KOSPI (Corea)», per non creare confusione.
- **Petrolio.** Con il massimo del 2008, la riga non racconta la salita del 2026. Si può mettere il massimo a 52 settimane nel tooltip, ma non come seconda misura nella tabella.
- **Seconde fonti.** Per oro, argento e KOSPI non c'è una seconda fonte dello stesso strumento: solo ETF e future sullo stesso sottostante, con le differenze spiegate sopra.
- **File non salvati.** Script, risultati e nota sono in `ricerca/bolle-rotazione/` e non ancora salvati sul ramo di sviluppo.
