# Controllo codice e pipeline · versione 1.4.0 · commit 249d245

Verdetto: **GO**. Non ho trovato bloccanti: nessun numero sbagliato, nessun dato pubblicato male, l'Action non fallisce per colpa di questo codice e la pagina si apre. Due punti sono da correggere, meglio prima della pubblicazione o comunque subito dopo: il file `data/emerging.json` cambia a ogni corsa (n. 1) e con FRED appeso il passo va oltre il suo timeout (n. 2).

Copia di lavoro: `git worktree` di 249d245 nello scratchpad (`cp2`). Le simulazioni girano su una copia dell'app, con `fetch` sostituito da `mock_fetch.mjs`: risposte vere registrate da Yahoo e FRED oggi (05/11/2026, 17:00 UTC), poi le fonti messe giù una alla volta.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `scripts/fetch_emerging.js`, `pickSeries` (insieme a `keep_unchanged.js`) | Se si rilancia la corsa senza dati nuovi, il file **non** resta uguale. A ogni chiamata Yahoo restituisce `adjclose` con un rumore dell'ordine di 8e-7 relativo, sul 70% delle barre. Arrotondando a 4 decimali, tra 50 e 255 valori per ETF cambiano di 0,0001 (8 ETF, circa 1.100 valori a corsa). `pickSeries` tiene la serie nuova anche quando `last` è uguale a quella pubblicata, quindi `onlyStamp` non vede mai un file uguale. Risultato: un commit e un nuovo deploy di Pages anche nelle corse senza sedute nuove (corse di recupero dopo la prima, corse lanciate a mano, sabato). `prices.json` non ha il problema perché, senza una seduta nuova, tiene il file pubblicato. I numeri mostrati non cambiano (differenze di 1e-4). | `sim.sh live1 none rec`, poi `sim.sh live2 <live1> none` un minuto dopo, poi `diffser.mjs live1 live2` | `log/live2_rerun.log`, `log/live3_rerun.log`: «uguale … a parte generated: false». Prima e seconda corsa: ASHR 33, INDA 66, EWZ 186, EWY 187, EWT 82, EWH 94, EEM 206, ACWI 252 date diverse. Seconda e terza: 48 … 255. Cambi e DTWEXEMEGS sono identici. Correzione proposta: in `pickSeries` tenere la pubblicata se le date sono le stesse (e `fred` è uguale) e ogni valore differisce al massimo di 1/ps. |
| 2 | da correggere | `fetch_emerging.js` + `fetchFred` (`fetch_data.js`) + workflow `timeout-minutes: 5` | Con FRED che non risponde (connessione appesa, non un 503), ogni serie FRED prova 4 volte con 30 s di timeout più le pause (1,5+3+6+12 s), circa 142 s. Sono 6 cambi a 2 alla volta più DTWEXEMEGS: **572 s**. Il passo viene fermato a 300 s e il file non si scrive. Così non si aggiornano nemmeno le code di Yahoo e gli ETF, e la regola «se FRED non risponde si tiene la parte Fed pubblicata» non entra mai in gioco. L'Esito lo segnala (outcome failure), quindi niente dati sbagliati, ma la vista resta ferma finché FRED non torna. Con FRED che risponde subito 503 la corsa dura 91 s e va bene. | `LIMIT=900 sim.sh L_fredhang <prev> replay,fredhang` | `log/L_fredhang.summary`: «uscita 0, 572 s», con tutte le parti Fed tenute. Correzione proposta: dopo il primo errore di FRED, saltare le altre serie FRED (ripiego sulla parte pubblicata), oppure 2 tentativi da 15 s, oppure `timeout-minutes: 12`. Anche la pausa dopo l'ultimo tentativo (12 s) è inutile. |
| 3 | minore | `test/emerging.test.js`, `test/pipeline.test.js` | I test non coprono la logica di giunzione e di ripiego della pipeline. Prese 12 mutazioni su 28, una delle quali era equivalente (`parseFredDaily` con «.»: `Number('.')` è già NaN). Non prese: `splice` con `>=` (data della giunzione duplicata, che in una corsa vera fa cadere tutti i cambi), la coda di Yahoo che sovrascrive la parte Fed, `pickSeries` senza il controllo della storia accorciata, `pack` a 2 decimali sotto 1.000, soglia dell'80% al 10%, niente ripiego sulla coda pubblicata con Yahoo giù, campo `fred` non scritto, `lastLongGap` a 10 giorni, soglia di `cleanFx` dal 3% al 5%, buchi oltre 20 giorni invece di 10, limite di 3,5 anni della deviazione standard tolto, quadrante RS con gli assi scambiati, `fxState` con «calo» da z ≥ 0,5, `check_fresh` con la parte Fed a 60 giorni e con le serie mancanti ignorate. | `node mutate.mjs <copia>` | Output di `mutate.mjs`. Suggerimento: test di `splice` (coda vuota, coda più vecchia, Fed più avanti, date uguali), di `pickSeries` (storia accorciata), di `pack` per INR/CNY, di `fxState(0, 0.7)`, e di `staleData` con `emergingFed` e `missing`. |
| 4 | minore | `fetch_emerging.js`, `pickSeries` dopo `splice` | Se la coda di Yahoo arriva vuota o finisce prima del file pubblicato, la serie nuova finisce prima della pubblicata e si tiene **tutta** la pubblicata, compresa la vecchia parte Fed. In una corsa con la Fed appena uscita, i valori nuovi della Fed si perdono fino alla corsa dopo. Nessun errore viene stampato: solo «tenuta la serie pubblicata». Caso opposto: se FRED accorcia una serie (Fed indietro di un mese), quelle date passano in silenzio ai valori di Yahoo e `fred` torna indietro. Lo coglie solo `check_fresh` dopo 14 giorni. | `sim.sh J1 <prev> replay,yahooempty`, `J2 … yahoostale`, `K … fedlag=DEXINUS` | `log/J1_yahooempty.log`, `log/J2_yahoostale.log` (6 cambi tenuti, file identico); `log/K_fedlag.log`: INR=X con `fred` dal 30/10 al 30/09, 6.730 righe contro 6.729, nessuna nota. |
| 5 | minore | `emerging-view.js`, `row` → `chUsd` | Con il calendario della Fed, «3 mesi in $» vale «—» quando la seduta di partenza (t−63) è una festa negli Stati Uniti (la Fed non ha il cambio). Nell'ultimo anno è successo in 7–10 sedute su 251 per indice. La cella mostra «—» con il tooltip «indice diviso per il cambio dello stesso giorno», senza dire che manca il cambio della data di partenza. La regola lo consente («—» dove manca), ma si può spiegare. Lo stesso vale per i piccoli buchi della linea in dollari nel grafico. | `node usd3m.mjs <emerging.json> data/indices.json data/indices_more.json` | CSI300 8, NIFTY50 10, IBOV 8, KOSPI200 7, TWN 7, HSI 7 sedute (per esempio con partenza il 01/09/2025, il 13/10/2025, l'11/11/2025 o il 27/11/2025). Valori di oggi: KOSPI200 −13,82% in valuta locale, −7,80% in $; IBOV −5,81% e −12,28%. |
| 6 | minore | coda di Yahoo per CNY=X | Nella coda provvisoria di Yahoo, CNY=X ripete la chiusura del giorno prima in 24 sedute su 86. Per esempio è fermo a 6,6779 dal 22 al 26/10/2026, mentre la Fed passa da 6,6745 a 6,6700. Il CNY provvisorio può quindi essere vecchio di qualche giorno (fino allo 0,1–0,2%). È già detto in generale che la coda è «provvisoria». | `node cny_flat.mjs <cache>` | Elenco delle 24 date con il valore della Fed accanto. Gli altri 5 cambi: 0 ripetizioni. |
| 7 | minore (procedura) | pubblicazione | `data/emerging.json` del ramo «non si pubblica». Dopo il push su `main`, quindi, la vista 8 mostra «Dati della vista Emergenti non disponibili (data/emerging.json: HTTP 404)» fino alla prima corsa dell'Action. Se a quella prima corsa FRED è giù, il file non si scrive: arrivano 8 serie su 15. | `sim.sh E none replay,fred503` | `log/E_nofile_fred503.log`. Consiglio: lanciare l'Action a mano (`workflow_dispatch`) subito dopo la pubblicazione e controllare che `data/emerging.json` arrivi su Pages. |
| 8 | minore | `fetch_emerging.js` | Quando FRED è giù, la corsa esce con 0. Errori e note escono con `console.warn` in testo semplice, non come `::warning::`, quindi non compaiono nel riepilogo della corsa. L'unico segnale arriva da `check_fresh` dopo 14 giorni (parte Fed) o 4 giorni (cambi ed ETF). | `sim.sh B <prev> replay,fred503` | `log/B_fred503.log`: uscita 0, «Errori:» solo nel log. |

## Cosa ho verificato e passa

- **Sintassi e formato** (49 controlli). `node --check` passa su 46 file (`js/`, `scripts/`, `scripts/lib/`, `test/`). `config/*.json`, `data/emerging.json`, `version.json` e il workflow YAML sono validi. In `index.html` e `guida.html` non ci sono errori di annidamento. Tutti i 20 id usati da `emerging-view.js` esistono in `index.html`. Versione 1.4.0 uguale in `js/version.js` e `version.json`.
- **Test**: `npm test` dà 127 su 127. Senza `data/emerging.json`, come sarà su `main`, i test sono 124 più 3 saltati, nessuno fallito.
- **Pipeline, 16 corse simulate** (`sim.sh`, log in `log/`):
  - prima corsa senza file, dati veri: 15 serie su 15, cambi dal 03/01/2000 con `fred` 30/10, 483 KB, 5 s;
  - corsa ripetuta con le stesse risposte: file identico a parte `generated`;
  - FRED giù con 503: tenute le 6 parti Fed e DTWEXEMEGS, file identico, uscita 0, 91 s;
  - Yahoo giù: 7 serie su 15, il file non si scrive, uscita 1;
  - FRED e Yahoo giù: 6 su 15, il file non si scrive, uscita 1, 175 s;
  - prima corsa con FRED giù (8 su 15) o con Yahoo giù (7 su 15): il file non si scrive, uscita 1;
  - file del formato precedente (6e98bd5: senza `fred`, cambi di Yahoo dal 2003/2006): passaggio corretto a Fed dal 2000 + coda;
  - formato precedente con FRED giù: il file non si scrive, uscita 1, resta quello vecchio;
  - DEXKOUS accorciata dal 2015: «storia accorciata (dal 2015-01-02, 2960 righe): tenuta la pubblicata»;
  - coda di Yahoo vuota o più vecchia della Fed: si tiene la pubblicata;
  - Fed più avanti di Yahoo: nessuna data duplicata, perché la giunzione prende solo le date successive a `fred`.

  `encodeDates` farebbe fallire la serie con una data duplicata (intervallo di 0 giorni). Con il codice attuale non succede.
- **Formato compatto con i dati veri** (`roundtrip.mjs`, 87.216 controlli, 0 falliti):
  - `pack` della serie decodificata ridà esattamente lo stesso `d0`, `gaps` e `cd` per le 15 serie;
  - parte Fed uguale alle risposte grezze di FRED (errore relativo massimo 5e-8; KRW con 2 decimali 4,4e-8; HKD 3,8e-6; CNY 3,6e-8);
  - coda e ETF entro mezzo passo di arrotondamento;
  - nessuna data della fonte persa;
  - `last` coerente.
- **Definizioni uguali al backtest** (`porting.mjs`):
  - F dell'app (`fxSignals`) contro `computeF` del backtest sui 6 cambi del file vero (Fed + coda pulita), e D (`dollarSignals`) contro `computeD`: 45.599 confronti, 0 diversi;
  - parte Fed del file contro la cache FRED del backtest (`fedcache.mjs`): 7 serie, 0 date in più o in meno, 0 valori diversi fino al 30/10/2026.
- **`check_fresh.js`**:
  - sul file vero: «Dati aggiornati.», uscita 0;
  - `fresh_sim.mjs`: 939 giorni di corsa simulati (novembre 2023 – ottobre 2026), con le date vere di FRED, l'uscita di H.10 il martedì della settimana dopo (stima prudente), la seduta USA del giorno prima e i cambi del giorno feriale prima: 0 falsi allarmi, età massima di FRED 11 giorni contro un limite di 14;
  - le serie mancanti sono segnalate «senza data»;
  - un file assente non porta controlli.
- **Workflow**:
  - passo nuovo `emerging` con `continue-on-error` e `timeout-minutes: 5`, messo dopo i prezzi e prima del commit;
  - l'Esito include `steps.emerging.outcome`;
  - il messaggio di commit legge `asOf.fx` con un ripiego sicuro;
  - `git add data/` prende anche il file nuovo alla prima corsa;
  - il controllo del JSON troncato copre `data/emerging.json`.
- **Prestazioni**: il calcolo del modello della vista (6 cambi, D e 7 forze relative) richiede 141 ms in Node (`perf.mjs`). Il file pesa 483 KB e si scarica solo alla prima apertura.

## Cosa non ho potuto verificare e perché

- **La vista nel browser** (tabellone, grafico, tooltip, `placeTip` vicino al fondo, telefono e temi) non l'ho controllata in Playwright. Il mio tema era codice e pipeline, e il browser lo controllano gli altri controllori. La logica di `chUsd` l'ho controllata copiandola in Node (`usd3m.mjs`).
- **Le date reali di uscita di H.10** (ALFRED, ritardi di fine anno): ho usato l'approssimazione del backtest, cioè il martedì della settimana dopo. Se a fine anno la Fed salta davvero un'uscita, l'età arriva a circa 17–18 giorni e `check_fresh` darebbe un allarme per una sera (FRED oltre 14 giorni).
- **Il comportamento di GitHub Actions** con il timeout del passo e `continue-on-error`: l'ho dedotto dalla documentazione, non l'ho visto in una corsa vera.
- **L'ora del cambio di Yahoo** (che valore porta la barra datata d) è un tema dei controlli sui numeri, e non l'ho rifatto.

## Script (tutti in `ricerca/qa/1.4.0/codice2/`)

- `mock_fetch.mjs`: sostituisce `fetch` per registrare o rigiocare le risposte e simulare FRED o Yahoo giù, appesi, vuoti, vecchi o accorciati.
- `sim.sh`: una corsa simulata di `fetch_emerging.js`.
- `summary.mjs`: riassunto di una corsa e confronto «a parte `generated`».
- `diffser.mjs`: differenze serie per serie tra due file.
- `roundtrip.mjs`: formato compatto contro le risposte grezze.
- `porting.mjs`: definizioni dell'app contro quelle del backtest.
- `fedcache.mjs`: parte Fed contro la cache del backtest.
- `usd3m.mjs`: «3 mesi in $» e «—» per le feste USA.
- `fresh_sim.mjs`: `check_fresh` su 3 anni.
- `mutate.mjs`: mutazioni mirate.
- `perf.mjs`: tempo del calcolo del modello.
- `cny_flat.mjs`: chiusure ripetute nella coda di Yahoo.
- `log/`: log delle 16 corse simulate.

Nota: `roundtrip.mjs`, `usd3m.mjs` e `diffser.mjs` importano `js/` e `scripts/` del repository principale con percorsi relativi. Oggi nel repository principale `js/emerging.js` e `js/emerging-view.js` hanno modifiche non salvate rispetto a 249d245, ma riguardano solo commenti e la vista. I file importati (`emerging.js` lato calcoli, `indexdata.js`, `fetch_emerging.js`, `yahoo.js`) hanno lo stesso codice di 249d245. `porting.mjs`, `fedcache.mjs`, `fresh_sim.mjs` e `mutate.mjs` prendono la copia come argomento.
