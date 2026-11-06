# Sector Monitor 0.9.8: revisione del codice prima della 1.0

Revisione del 20/10/2026 sul ramo `claude/great-noether-2f1ude`, commit `9a81dd8` (versione 0.9.8).
Riferimento: `ricerca/qa/audit-0.9.0/rapporto-codice.md`. Lettura completa di `js/*.js`, `scripts/*.js`, `scripts/lib/*.js`, `.github/workflows/update-data.yml` e `test/*.js`, con più attenzione al codice cambiato dopo `07a09d7` (`git diff 07a09d7 9a81dd8`).

Nessun file del repository è stato cambiato fuori da `ricerca/qa/audit-0.9.8/`. Nessun commit. Nessun segreto letto: le prove di Telegram usano un `fetch` finto e un token inventato (`token-finto`). Una sola richiesta a Yahoo (endpoint spark, 3 titoli) per controllare il punto M6 dell'audit precedente.

**Esito di `npm test`**: 106 test, 106 passati (prima e dopo le prove).

**Prove scritte** (cartella `ricerca/qa/audit-0.9.8/codice/`, con l'uscita salvata accanto):

| File | Cosa dimostra | Uscita |
|---|---|---|
| `prova_alert.mjs` + `mock-telegram.mjs` | D1 (doppioni Telegram dopo un invio fallito) e D3 (evento annullato ma inviato) | `prova_alert.out.txt` |
| `prova_sha_coda.sh` | D2 (corsa in coda partita dal commit vecchio: conflitto al `git pull --rebase`) | `prova_sha_coda.out.txt` |
| `prova_gate.sh` | M1 (un file dei dati rotto ferma anche la corsa principale) | `prova_gate.out.txt` |
| `prova_capoutcomes.mjs` | M4 (`NaN` negli episodi dei cali forti prima della quotazione dell'ETF) | `prova_capoutcomes.out.txt` |
| `prova_avvisi_usa.mjs` | L10 dell'audit 0.9.0: nessun avviso falso sui prezzi di oggi | `prova_avvisi_usa.out.txt` |

Comandi: `node ricerca/qa/audit-0.9.8/codice/prova_alert.mjs`, `bash ricerca/qa/audit-0.9.8/codice/prova_sha_coda.sh`, `bash ricerca/qa/audit-0.9.8/codice/prova_gate.sh` (ognuno lavora in una cartella temporanea).

---

## Riepilogo

| # | Gravità | Dove | In breve |
|---|---|---|---|
| — | bloccante | — | **Nessun problema bloccante trovato.** Nessun difetto che faccia vedere numeri sbagliati |
| D1 | da correggere (priorità alta) | `.github/workflows/update-data.yml:109` | Se un invio Telegram fallisce, il registro degli alert non si pubblica: la sera dopo i messaggi già arrivati partono di nuovo e il limite dei «5 sedute» non vale |
| D2 | da correggere | `.github/workflows/update-data.yml:28, 48` | Una corsa rimasta in coda dietro un'altra parte dal commit di prima: il gate non la ferma, riscarica tutto e il commit finisce in conflitto (corsa rossa e mail). Con le corse orarie della 0.9.8 succede facilmente |
| D3 | da correggere | `scripts/send_alerts.js:104` | Un invio fallito di un evento poi annullato dal ricalcolo viene inviato lo stesso, seguito subito dalla rettifica |
| M1 | minore | `scripts/need_update.js:36-50` | Il gate legge i dati prima di guardare il cron: un `indices.json` rotto ferma anche la corsa delle 22:40 (prima della 0.9.8 i passi erano indipendenti) |
| M2 | minore | `update-data.yml:14-15, 78` | Il token resta in `.git/config` per i passi dopo il commit; il gate ha il permesso di scrittura. Il README dice «credenziali solo nei passi che pubblicano» |
| M3 | minore | `fetch_breadth.js:103, 259, 288`, `fetch_data.js:638`, `send_alerts.js:81` | Richieste senza timeout (solo quelle a Yahoo e agli indici ce l'hanno) |
| M4 | minore | `js/capitulation.js:169-174` | `capOutcomes` dà `NaN` per gli episodi prima della quotazione dell'ETF (XLC e XLRE nel 2008); l'app mostra «—» solo grazie al controllo dentro `pct` |
| M5 | minore | `scripts/fetch_data.js:728-790` | Asset reali: nessun `copied`, quindi un prezzo ricopiato non ha l'asterisco (per USA ed ETF in euro sì) |
| M6 | minore | `index.html`, `guida.html` | Ancora nessuna Content-Security-Policy (L7 dell'audit 0.9.0) |

Dubbi (non confermati) in fondo, prima delle cose trovate a posto.

---

## Da correggere

### D1. Un invio Telegram fallito blocca la pubblicazione del registro: doppioni la sera dopo
**Dove**: `.github/workflows/update-data.yml:109` (`if: steps.alerts.outcome == 'success'`), insieme a `scripts/send_alerts.js:118` (`if (failed) process.exitCode = 1`).

**Come scatta**:
1. `send_alerts.js` invia due eventi; il primo riceve un errore da Telegram (rete, 429, 5xx), il secondo arriva.
2. Lo script scrive `data/alerts.json` (il primo con `failed: true`, il secondo con `telegram: true`) ed esce con 1, come previsto.
3. Il passo ha `continue-on-error: true`, quindi `steps.alerts.outcome` vale `failure` (è il valore prima di `continue-on-error`; lo usa così anche il passo «Esito», riga 126).
4. «Commit registro degli alert» chiede `outcome == 'success'` e non parte: il registro della sera resta solo sul runner, che viene buttato.
5. La sera dopo `alerts.json` è quello di prima: tutti e due gli eventi risultano nuovi e partono di nuovo. Quello già arrivato arriva **due volte**.

Conseguenze in più:
- Il README promette «Un invio fallito si riprova per 5 sedute». In realtà il riprova vero (`failed` + `retryFrom`) non si attiva mai, perché il registro con `failed` non arriva su `main`. Gli eventi ripartono come «nuovi» finché la loro data è dopo `checkedThrough`, anche dopo più di 5 sedute.
- Finché Telegram fallisce, anche `checkedThrough` resta fermo.

**Prova** (`prova_alert.mjs`, scenario A, dati di oggi; eventi XLU zona blu 25/09 e trigger 12/10, registro di partenza con `checkedThrough` al 24/09):
```
sera 1 (prima chiamata HTTP 500): uscita 1
  chiamata 1 (HTTP 500): ▼ ZONA BLU · XLU … 25/09/2026
  chiamata 2 (ok): ▲ TRIGGER · XLU … 12/10/2026
sera 2 (Telegram funziona): uscita 0
  chiamata 1 (ok): ▼ ZONA BLU · XLU … 25/09/2026
  chiamata 2 (ok): ▲ TRIGGER · XLU … 12/10/2026
ESITO A: 1 messaggi arrivati due volte: ▲ TRIGGER · XLU … 12/10/2026
controprova: sera 2 con il registro della sera 1: 0 messaggi
```

**Correzione**: pubblicare il registro anche quando lo script è uscito con 1 (il file è stato scritto). Se lo script si è fermato prima di scrivere, il file è invariato e il passo non fa niente.
```diff
       - name: Commit registro degli alert
-        if: steps.alerts.outcome == 'success'
+        # anche con un invio fallito: il registro segna `failed` e la corsa dopo riprova solo quello
+        if: steps.alerts.outcome == 'success' || steps.alerts.outcome == 'failure'
```
Test consigliato: uno statico come quello del cron (`test/pipeline.test.js`), che controlla che la condizione del passo comprenda `failure`.

### D2. Una corsa in coda parte dal commit vecchio: conflitto al commit e corsa rossa
**Dove**: `.github/workflows/update-data.yml:28` e `:48` (`actions/checkout` senza `ref`), con `concurrency` alle righe 17-19.

**Meccanismo**:
- Una corsa programmata o lanciata a mano riceve come `GITHUB_SHA` l'ultimo commit di `main` nel momento in cui GitHub la crea.
- Se c'è già una corsa del gruppo `update-data`, la nuova resta in attesa (`cancel-in-progress: false`) con quello SHA.
- `actions/checkout` senza `ref` scarica proprio `github.sha`, non la punta di `main`. Così fanno sia il job `gate` sia il job `update`.

**Scenario tipico con la 0.9.8**: la corsa delle 22:40 parte di solito tra 00:40 e 03:10 UTC (README e `docs/sviluppo.md`), proprio nella finestra delle corse di recupero (01:10-06:10).
1. La corsa delle 22:40 parte alle 01:15 e pubblica i dati alle 01:21.
2. La corsa delle 01:10, creata durante quei 6 minuti, aspetta con lo SHA di prima.
3. Quando parte, il gate legge i dati vecchi: «manca la seduta» → `run=true`. È proprio la corsa che il gate doveva fermare.
4. Scarica di nuovo tutto (circa 6 minuti) e prova a pubblicare. I file in `data/` sono JSON su una riga, quindi `git pull --rebase` va in conflitto.
5. Il passo «Commit dati aggiornati» non ha `continue-on-error`: il job si ferma, la corsa è rossa e GitHub manda la mail. Alert e `check_fresh` non partono.

Gli stessi passi valgono per una corsa lanciata a mano mentre ne gira un'altra. I dati non si rovinano (il conflitto ferma tutto), ma ci sono corse rosse e mail inutili proprio dopo la 1.0.

**Prova** (`prova_sha_coda.sh`): repository locale con due corse sullo stesso `prices.json` di una riga.
```
CONFLICT (content): Merge conflict in data/prices.json
ESITO: git pull --rebase fallisce (uscita 1)
```
La parte su GitHub (SHA fissato alla creazione, checkout di `github.sha`) viene dalla documentazione di Actions e dal codice di `actions/checkout`: con `ref` vuoto usa `github.context.sha`. Non l'ho vista succedere davvero, perché la 0.9.8 è in linea dalle 05:45 di oggi e nessuna corsa oraria è ancora partita.

**Correzione**: far partire tutti e due i job dalla punta di `main`.
```diff
       - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09
         with:
+          ref: main   # non lo SHA di quando la corsa è stata creata: una corsa in coda vede i dati appena pubblicati
           persist-credentials: false
```
Va messo in tutti e due i checkout (gate e update). Così il gate della corsa in coda vede i dati appena pubblicati e la ferma. Test consigliato: uno statico sul file del workflow.

### D3. Un invio fallito di un evento poi annullato viene inviato lo stesso
**Dove**: `scripts/send_alerts.js:104`.
```js
const retry = (state ? state.log : []).filter((e) => e.failed && e.date >= retryFrom(sectors.dates, asOf));
```
`reconcile()` (riga 95, introdotta con la 0.9.4) ha appena segnato l'evento come `retracted`, ma il filtro dei riprova non lo guarda.

**Come scatta**: una sera l'invio di un evento fallisce. Nelle 5 sedute dopo, il ricalcolo della breadth lo toglie o lo sposta. La sera dopo succede questo:
- **evento tolto**: parte l'alert («▼ ZONA BLU XLK»), che ormai è falso. `e.telegram` diventa `true`, quindi subito dopo parte anche «↻ RETTIFICA … annullato». Il giusto sarebbe nessun messaggio, perché l'evento non era mai arrivato.
- **evento spostato**: arrivano tutti e due, il vecchio con la data sbagliata e il nuovo con «Rettifica: spostato dal …».

Con D1 non corretto questo caso non può succedere (il registro con `failed` non arriva mai su `main`). Diventa possibile appena si corregge D1, quindi vanno corretti insieme.

**Prova** (`prova_alert.mjs`, scenario B; registro di oggi più un evento XLK del 16/10 con `failed: true` che i dati non hanno):
```
chiamata 1 (ok): ▼ ZONA BLU · XLK Technology | 16/10/2026 · evento che il ricalcolo ha tolto
chiamata 2 (ok): ↻ RETTIFICA · XLK Technology | ▼ ZONA BLU del 16/10/2026 annullato …
ESITO B: 2 messaggi per un evento che non esiste più (atteso: 0, non era mai stato inviato)
```

**Correzione**:
```diff
-  const retry = (state ? state.log : []).filter((e) => e.failed && e.date >= retryFrom(sectors.dates, asOf));
+  // un evento annullato o spostato dal ricalcolo non si riprova (lo spostato parte con la data nuova)
+  const retry = (state ? state.log : []).filter((e) => e.failed && !e.retracted && e.date >= retryFrom(sectors.dates, asOf));
```
In più, in `reconcile` conviene togliere `failed` quando un evento è annullato (`delete old.failed`), così il registro della vista Alert non lo mostra come «da riprovare». Test consigliato: `main()` di `send_alerts` con il `fetch` finto, come in `prova_alert.mjs`.

---

## Minori

### M1. Il gate legge i dati anche quando non serve: un file rotto ferma tutto
**Dove**: `scripts/need_update.js:36-50`. `main()` decodifica `indices.json` (`indexSeries`) prima di chiamare `needUpdate`, anche per la corsa delle 22:40 e per quelle lanciate a mano, che partono comunque. Se la lettura lancia un errore, il gate esce con 1 e il job `update` (`needs: gate`) non parte. Si fermano anche prezzi, breadth, alert e `check_fresh`. Prima della 0.9.8 un file rotto fermava solo il suo passo (`continue-on-error`).

**Prova** (`prova_gate.sh`): `indices.json` con la serie SPX senza `d200`. È JSON valido, quindi passa il controllo del workflow.
```
cron «40 22 * * 1-5»: uscita 1, GITHUB_OUTPUT=«», TypeError: Cannot read properties of undefined (reading 'map')
cron «10 1-6 * * 2-6»: uscita 1, GITHUB_OUTPUT=«», TypeError: …
```
Serve un file pubblicato a mano o da uno script con un errore: probabilità bassa, ma un guasto solo dovrebbe fermare solo la sua parte.

**Correzione**: leggere i dati solo per le corse di recupero e, se la lettura fallisce, aggiornare.
```diff
 async function main() {
-  const read = …
-  const { indexSeries } = await import('../js/indexdata.js');
-  …
-  const r = needUpdate({ … });
+  const schedule = process.env.SCHEDULE || '';
+  let r;
+  try {
+    r = schedule !== RECOVERY ? needUpdate({ schedule }) : needUpdate({ schedule, expected: expectedSession(), ...readState() });
+  } catch (e) { r = { run: true, why: `dati non leggibili (${e.message}): aggiorno` }; }
```
(`readState()` = la lettura di oggi spostata in una funzione.)

### M2. Credenziali e permessi del workflow
**Dove**: `.github/workflows/update-data.yml:14-15` e `:78`.
- `git remote set-url origin "https://x-access-token:${GH_TOKEN}@…"` scrive il token in `.git/config`, dove resta per i passi dopo: alert, secondo commit e `check_fresh`. Il secondo commit ne ha bisogno (non ha `GH_TOKEN` suo). Il README però dice «credenziali solo nei passi che pubblicano». Il rischio è basso, perché sono script del repository.
- `permissions: contents: write` vale per tutto il workflow, compreso il job `gate`, che legge e basta.

**Correzione**: `permissions: contents: read` a livello di workflow, `permissions: contents: write` solo nel job `update`. In fondo a ogni passo che fa push, `git remote set-url origin "https://github.com/${{ github.repository }}"`, e nel secondo passo di commit `env: GH_TOKEN` con il suo `set-url`. Oppure si corregge la frase del README.

### M3. Richieste senza timeout fuori da Yahoo
**Dove**: `scripts/fetch_breadth.js:103` (costituenti), `:259` (Wikipedia), `:288` (holdings IVV), `scripts/fetch_data.js:638` (FRED), `scripts/send_alerts.js:81` (Telegram).
Il README dice «ogni richiesta a Yahoo al massimo 30 secondi», ed è vero. Queste invece hanno solo i limiti predefiniti di `fetch` in Node, 300 s per le intestazioni e 300 s per il corpo. Non bloccano il workflow (che ha 45 minuti), ma una risposta appesa costa fino a 10 minuti per richiesta. FRED ne fa fino a 4.
**Correzione**: `signal: AbortSignal.timeout(30000)` anche qui.

### M4. `capOutcomes`: `NaN` per gli episodi prima della quotazione dell'ETF
**Dove**: `js/capitulation.js:169-174`. Per XLC (ETF dal 2018) e XLRE (dal 2015) la serie dei cali forti parte nel 2005, ma `close[j]` è `null` negli episodi del 2008. `close[k] < lo` con `close[k] = null` vale `0 < Infinity`, quindi `lo` diventa `null` e `fall63 = Math.min(0, null / null − 1) = NaN`.

**Prova** (`prova_capoutcomes.mjs`, dati di oggi):
```
XLC episodi 3: 2008-09-29 fall63=NaN dd52=null; 2008-11-12 fall63=NaN dd52=null
XLRE episodi 4: 2008-07-09, 2008-09-15, 2009-02-17 fall63=NaN
```
Oggi nell'app si vede «—», perché `pct()` scarta i valori non finiti (`js/format.js:12`). È corretto per caso.

**Correzione**: `for (…) if (close[k] != null && close[k] < lo) lo = close[k];` e `fall63: j >= 0 && close[j] && lo < Infinity && …`.

### M5. Asset reali senza `copied`
**Dove**: `scripts/fetch_data.js:728-790`. USA ed ETF in euro segnano con l'asterisco i prezzi ricopiati dalla seduta prima (`copiedIdx`). Gli asset reali no: `alignToCalendar` riempie in silenzio un ETF USA senza barra in una seduta NYSE. Bitcoin e DXY sono già spiegati nell'app. Per gli ETF di borsa la lacuna è rara, ma la regola del progetto chiede di dirlo. **Correzione**: calcolare `copied` anche qui, come in `updateGlobal` (`real = realDates(series)` prima di `keepPublished`).

### M6. Nessuna Content-Security-Policy
Ancora aperto dal punto L7 dell'audit 0.9.0. Le stringhe esterne passano tutte da `esc()` o `textContent` (controllato di nuovo, vedi sotto). La CSP è una difesa in più, facoltativa.

---

## Dubbi (non confermati)

- **Quanto spesso succede D2**: non ancora osservato. Basta che una corsa sia creata durante i circa 6 minuti di un'altra. Con la corsa delle 22:40 che parte nella finestra delle corse orarie, mi aspetto che succeda più volte al mese.
- **Corse in coda annullate**: GitHub tiene in attesa una sola corsa per gruppo. Una nuova annulla quella in attesa (stato «cancelled», senza mail). Una corsa delle 22:40 in attesa può essere sostituita da una di recupero, che fa lo stesso lavoro. Non ho trovato casi in cui si perde un aggiornamento, perché la corsa di recupero che la sostituisce aggiorna tutto se manca la seduta USA. Dopo D2 il gate la ferma solo se i dati USA ci sono già, e allora qualcuno ha appena fatto l'aggiornamento completo.
- **Data di uscita del CPI**: `fetch_data.js:763` usa la data di New York del momento della corsa. Se il primo a vedere un mese nuovo è una corsa dopo la mezzanotte di New York (dalle 04:10 UTC d'estate, o quella delle 11:40), il gradino parte un giorno dopo. Non è nuovo della 0.9.8 e succede solo se la corsa della sera del giorno di uscita non vede il dato.
- **Chiusure straordinarie della NYSE** (lutti nazionali): il gate aspetta una seduta che non arriverà mai, quindi quella notte le 6 corse di recupero riscaricano tutto. Costa solo tempo.
- **Pianificazione disattivata dopo 60 giorni senza attività** (regola di GitHub per i repository pubblici): i commit notturni del bot dovrebbero contare come attività. Non verificato.

---

## Stato dei problemi dell'audit 0.9.0

| # | Stato | Verifica |
|---|---|---|
| B1 mediana | risolto | `signals.median` usato anche da `bottom.js` |
| A1 minimo nel giorno del fallito | risolto | `signals.js:163-164`, test dedicati |
| A2 ticker spariti | risolto | `::warning::` e `missing` mostrato (`app.js:303`, intestazione e righe della rotazione) |
| A3 prezzi corretti negli asset reali | risolto | `app.js:711-712` |
| A4 `check_fresh` | risolto | prezzi, ogni indice, ogni serie dei cali forti (`check_fresh.js:38-45`); passa sui dati di oggi |
| M1 decimali degli indici | risolto | `ps` 10000 sotto 100; andata e ritorno identici su tutti i 22 indici |
| M2 breadth degli indici al 75% | aperto, ma dichiarato | detto nella guida (`guida.html:310`) e nel README |
| M3 «−0,0%» | risolto | `contextHTML` usa `pct` |
| M4 «Oggi» dei cali forti | risolto | data esplicita in scheda, riga ⓘ e cella |
| M5 prezzo dell'indice mancante | risolto | `::warning::` (`fetch_indices.js:277`) |
| M6 barra in corso senza orario | risolto | provato dal vivo alle 06:00 UTC: spark ha `currentTradingPeriod`, e la barra del 20/10 di 7203.T (Tokyo aperta) si scarta con e senza quel campo |
| M7 timeout, JSON, Telegram | risolto | resta M3 per le richieste non Yahoo; nuovo D1 sul registro |
| M8 `decodeDates` | risolto | cache `ISO` |
| L1 sedute NYSE | risolto | `fetch_breadth.js:385` |
| L2 riempimenti | in gran parte | `copied` per USA e globali, avviso per `sectors.json`; mancano gli asset reali (M5) |
| L3 «—%» | risolto | `sgnP`, `pct` con `isFinite` |
| L4 ordinamenti | risolto | `num()` in `app.js:365` |
| L5 ricalcolo con i membri di oggi | risolto | detto nel README |
| L6 alert spostati | risolto | `reconcile` e rettifiche (0.9.4), con il nuovo difetto D3 |
| L7 XSS e CSP | in gran parte | `esc(e.sector)` fatto; CSP no (M6) |
| L8 workflow | in gran parte | SHA fissati, `persist-credentials: false`; token in `.git/config` (M2) |
| L9 cambio dell'ultima seduta | latente, invariato | tutti i ticker globali sono in EUR |
| L10 avvisi sui prezzi USA | risolto | `fetch_data.js:260-261`; nessun avviso falso sui 5 anni di oggi (`prova_avvisi_usa.mjs`) |
| L11 replay | risolto | cache `apprAt` |
| L12 `keep_unchanged` | a posto | |

---

## Controllato e trovato a posto

- **Gate della 0.9.8** (`need_update.js`):
  - il cron di `RECOVERY` coincide con quello del workflow (c'è un test);
  - `github.event.schedule` è vuoto per le corse a mano, che quindi partono sempre;
  - la seduta attesa è giusta da martedì a sabato, anche dopo un lunedì festivo, il Venerdì santo, Thanksgiving e nei cambi d'ora (01:10-06:10 UTC cade sempre dopo le 16:30 di New York);
  - un indice USA assente dal file fa aggiornare (direzione prudente);
  - oggi alle 05:56 UTC dice «Salto: dati USA già alla seduta 2026-10-19».
- **Corse durante le borse asiatiche aperte** (le corse di recupero cadono lì): la barra in corso si scarta sia nell'endpoint chart sia in spark (provato dal vivo). I cali forti non usano una barra aperta come «seduta dopo».
- **Macchina a stati**:
  - `runMachine` ed `explainState` usano le stesse conferme (`confirmationsAt`) e la stessa soglia del fallimento (`avgRange`);
  - dopo il fallimento si aggiornano `pmin`, `tp`, `bmin` e `tb`;
  - il fallimento tardivo funziona anche dopo il cooldown, prima del riarmo;
  - `stateOf` ed `explain` usano l'ultima seduta calcolata.
- **Rendimenti degli episodi**: `forward` e `worstWithin` restituiscono `null` senza futuro o senza trigger; il trigger alla seduta 0 è gestito (`u.trig && u.trig.t`).
- **Cali forti**:
  - un errore di stampa si scarta solo con il giorno e il giorno dopo tranquilli (all'ultima seduta il filtro non c'è, e il ricalcolo delle 5 sedute lo sistema la sera dopo);
  - il percentile usa solo le sedute precedenti;
  - la scheda e il tabellone hanno sempre la data;
  - `capSeries` e `mergeCap` vanno avanti e indietro senza perdite (test).
- **Formato degli indici**: `packIndex`/`unpackIndex` sono identici su tutti i 22 indici di oggi; `mergePrices` arrotonda a 4 decimali.
- **Pipeline dei prezzi**:
  - `copiedIdx` segna solo le sedute senza barra e senza un valore tenuto dal file precedente;
  - `moreComplete` impedisce di sostituire un file alla stessa data con uno con meno ticker;
  - `dropStale` scarta solo le barre segnaposto (nell'ultimo anno, una sola volta per CSNDX.MI, a fine 2025);
  - `repairSpikes` sui file di oggi non trova niente (nessun avviso falso).
- **`needsChart`**: le sedute «della borsa» sono quelle della maggioranza dei titoli con lo stesso suffisso, solo dentro la storia del titolo; un titolo nuovo non viene riscaricato per le sedute prima della sua quotazione.
- **`weekEnds`** (vista 7): ultima seduta di ogni settimana da lunedì a domenica, con l'ultima che è sempre oggi.
- **Workflow**:
  - JSON non valido tenuto fuori dal commit;
  - `keep_unchanged` confronta con `HEAD` e toglie solo `generated`;
  - Telegram parte dopo il push dei dati;
  - timeout di 45 minuti per il job e di 5 per il gate;
  - azioni fissate per SHA;
  - `check_fresh` passa sui dati di oggi.
- **Token di Telegram**: solo nell'ambiente del passo degli alert. Non compare nei log: l'errore stampa il testo della risposta di Telegram, non l'URL, e `fetch` non mette l'URL nel messaggio di errore. Nessun token nel repository.
- **XSS**:
  - le stringhe esterne (nomi da Wikipedia e dalle holdings, ticker, testi di `alerts.json`, nomi degli indici) passano da `esc()` o `textContent`;
  - i link a TradingView usano `encodeURIComponent` e hanno `rel="noopener"`;
  - senza escape restano solo chiavi di configurazione del repository e codici dei settori.
- **Robustezza dell'app**:
  - un file obbligatorio troncato dà il messaggio «Impossibile caricare i dati»;
  - i file facoltativi mancanti danno `null` e un avviso (alert, fotografia per titolo, indici, cali forti, titoli: «file incompleto»);
  - grafici con serie vuote (`drawCap` esce se `n = 0`);
  - ordinamenti con i `null` in fondo;
  - cache delle macchine per (serie, livello blu).
- **Condizioni di gara nell'app**:
  - `loadMore` degli indici rilegge i livelli blu salvati, quindi una modifica fatta nel frattempo resta;
  - `cap.card` aspetta i dati una volta sola (`waiting`);
  - il replay si ferma se la vista viene nascosta.

---

## Test: cosa manca

1. **`send_alerts.main()` con `fetch` finto** (riprova, `reconcile`, codice d'uscita, registro scritto): avrebbe fermato D3. `prova_alert.mjs` è già una base.
2. **Controlli statici sul workflow**, come quello del cron: condizione del commit del registro (D1) e `ref` dei checkout (D2).
3. **`need_update.main()`**: con un file rotto deve aggiornare (M1).
4. **`capOutcomes` con prezzi `null` all'inizio** (M4).
5. Ancora aperti dall'audit 0.9.0:
   - nessun test con DOM per Monitor, tabellone degli indici e schede (`linkedom` o `happy-dom` sui dati di un giorno fisso);
   - nessun flusso completo di `updateUS`, `updateGlobal`, `updateMacro` e `fetch_indices.main` con `fetch` finto.
