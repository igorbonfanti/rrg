# Controllo codice e pipeline · versione 1.5.0 · commit a801454

Verdetto: **GO** (nessun bloccante). Prima di pubblicare va corretto il testo dell'aiuto rapido (n. 1, già sistemato nella copia di lavoro ma non ancora nel commit). I buchi dei test (n. 2) si possono chiudere subito dopo.

Copia di lavoro: `git worktree` di a801454 nello scratchpad (`wt-codice-150`). Nessuna modifica a `/home/user/rrg` tranne questa cartella. Rete verso Yahoo e FRED disponibile.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `index.html:862` (aiuto rapido, `?`) | Nel commit a801454 c'è ancora «Tasti: 1–8 viste» e l'elenco dei comandi non ha `VIX`. Le schede invece sono 9 e il tasto 9 apre Alert. La guida (`guida.html:426`) dice giustamente 1–9. **Nella copia di lavoro non committata (`/home/user/rrg/index.html:863`) è già corretto**: va solo committato. | Aprire l'app e premere `?` | `grep -n "<kbd>1</kbd>–<kbd>8" index.html` sul commit |
| 2 | da correggere | `test/vix.test.js`, `test/pipeline.test.js` | Su 35 mutazioni mirate i test ne colgono 16. Non ne colgono 19, tra cui: VIX massimo dell'episodio non calcolato (mostrato nella tabella degli episodi), sedute al minimo con un quantile diverso dalla mediana (mostrate), calo peggiore = massimo, etichette delle crisi spostate, VIX mancante riempito con il precedente (contro la regola «mai riempire»), `provisional` con `>=`, finestra del calo 251, soglia `<=`, scatter fuori di uno, calo base con finestre incomplete, soglie di `check_fresh` per S&P 500 e Nasdaq-100 (4→40), `check_fresh` che non legge più `vix.json`. Non colgono neanche le tre mutazioni di `main()` di `fetch_vix.js`: la logica di ripiego (FRED giù, Yahoo giù, coda) non ha nessun test automatico. Oggi i numeri sono giusti (vedi sotto: 1.893 confronti indipendenti), ma una regressione futura non verrebbe segnalata. | `node ricerca/qa/1.5.0/codice/script/mutazioni.mjs <copia senza .git con tutti i file>` | `mutazioni.out` |
| 3 | minore | `scripts/fetch_vix.js` (con `scripts/lib/yahoo.js`) | Se Yahoo è appeso, ogni simbolo costa 4 tentativi da 30 s più 12 s di attese, cioè 132 s. Con tre simboli (^GSPC, ^NDX, ^VIX) fanno 396 s, più dei 5 minuti del passo, che quindi viene interrotto. Il file pubblicato resta com'era (corretto) e l'Esito lo segnala, però in quella notte il nuovo valore di FRED non entra, anche se FRED risponde. Con FRED appeso da solo bastano 142,5 s, quindi rientra nel limite; con tutti e due appesi servono 538 s. Manca un «Yahoo già giù» come `fredDown` di `fetch_emerging.js`. | `scenari.sh` casi Y1–Y3 (tempi ×100), oppure il calcolo dai parametri di `fetchDaily` e `fetchFred` | `scenari.out` |
| 4 | minore | `scripts/fetch_vix.js` + `pickSeries` | Se FRED risponde con dati più vecchi di quelli già pubblicati (per esempio una cache), `fred` torna indietro (11-05 → 11-02) e gli ultimi 3 valori verificati di FRED vengono sostituiti da quelli di Yahoo, segnati come provvisori, senza nessun avviso. `pickSeries` guarda solo `last`, non `fred`. Oggi i valori coincidono, quindi non si vede nessuna differenza. L'app lo dichiara («provvisorio») e `check_fresh` se ne accorge dopo 6 giorni. | `scenari.sh` caso D (`MOCK=fredOld`) | `sc_D.log`: nessuna riga «Note/Errori» |
| 5 | minore | `scripts/fetch_vix.js` (prima corsa) | Senza file pubblicato, se Yahoo restituisce per ^GSPC una storia accorciata ma con almeno 5.000 sedute, il file si scrive con S&P 500 **e VIX** dal 2001 (il Nasdaq-100 resta dal 1990). Alla corsa dopo si ripara da solo, perché la serie lunga sostituisce quella corta. | `scenari.sh` caso M (`MOCK=spxShort`, senza file) | `sc_M.log`: «VIX dal 2001-11-20» |
| 6 | minore | `scripts/check_fresh.js:89` | `vix: read('vix.json') \|\| undefined` trasforma un file illeggibile (null) in «file assente», quindi non viene segnalato. Il test `pipeline.test.js` («file illeggibile: segnalato», con `vix: null`) prova un caso che `main()` non produce mai. In pratica il rischio è coperto: il passo di commit rimette la versione pubblicata di ogni JSON non valido. Anche gli Emergenti seguono lo stesso schema. | Leggere `main()`, oppure la mutazione «check_fresh non legge vix.json», che i test non colgono | — |
| 7 | minore | pubblicazione | `data/vix.json` non è su `origin/main`. Se non lo si copia al momento della pubblicazione, fino alla prima corsa della Action (11:40 o 22:40 UTC; quelle di recupero non partono se i dati USA ci sono già) la vista mostra «Dati del VIX non disponibili (data/vix.json: HTTP 404)». È scritto in `docs/sviluppo.md`. Il file sul ramo (dati al 05/11) è identico, valori compresi, a una corsa nuova di oggi. | `git show origin/main:data/vix.json` | — |
| 8 | minore | `README.md:72` | Dice «in sintesi nella vista 8 Alert», ma ora Alert è la 9. Già corretto nella copia di lavoro non committata. | — | — |

## Cosa ho verificato e passa

- **Test**: `npm test` dà 134/134. Su una copia senza `ricerca/` (come `main`) dà sempre 134/134; senza `data/vix.json` 133 passano e 1 viene saltato. **3 corse.**
- **Sintassi**: `node --check` sui 50 file JS (`js/`, `scripts/`, `scripts/lib/`, `test/`). `data/vix.json` è JSON valido. Il workflow YAML si legge (PyYAML). Graffe del CSS in equilibrio. Tag di `index.html` e `guida.html` bilanciati. I 18 id del DOM usati da `vix-view.js` sono presenti una volta sola e non ci sono id duplicati. Le variabili CSS usate esistono. **72 controlli.**
- **Calcoli contro la ricerca**: `ricerca/vix/verifica_app.mjs` dà 83 confronti e 0 differenze (S&P 500, variante «ingresso il giorno dopo»).
- **Ricalcolo indipendente** (Python scritto dalle definizioni, senza riusare il codice JS) su `data/vix.json`. Per S&P 500 e Nasdaq-100, a tutte le soglie: episodi, date, VIX, VIX massimo, fine, rendimenti 21/63/126/252, calo, sedute al minimo, parziale; statistiche (n, positivi, mediana, p10, calo mediano e peggiore); base; scatter (punti, positivi, aperti). Per l'S&P 500 anche la lettura di oggi (VIX, percentile, realizzata, premio, percentile del premio) e alcuni campioni delle serie. **1.893 confronti, 0 differenze** (tolleranza 1e-6).
- **Dati del file** (controlli separati):
  - VIX contro un CSV di FRED scaricato a parte con curl: 9.277 sedute, 0 differenze, nessun valore perso nelle sedute dell'S&P 500. 34 valori di FRED in giorni di borsa chiusa vengono scartati, come previsto (2004-06-11 e le feste dal 2022).
  - S&P 500 e Nasdaq-100 contro `data/indices.json` dal 2000: 6.752 + 6.752 sedute, 0 differenze.
  - 3 sedute dell'S&P 500 senza VIX (1991-03-01, 1997-01-31, 1997-11-26) restano vuote: niente riempimento.
- **Corsa ripetuta senza dati nuovi**: due corse vere di `fetch_vix.js` e il file del commit sono uguali a parte `generated` (`onlyStamp` vero, 2 confronti). `keep_unchanged.js` rimette il file com'era («cambia solo l'ora di generazione»). Tempo reale della corsa circa 1 s.
- **Casi limite con rete finta** (`scenari.sh`, 18 casi, tutti con l'esito atteso):
  - con file pubblicato: FRED 503, Yahoo giù, tutti e due giù, coda di Yahoo vuota, coda più vecchia di FRED, ultima barra di Yahoo nulla, Nasdaq-100 giù, S&P 500 accorciato → file uguale al pubblicato oppure serie tenuta, sempre con exit 0;
  - FRED con l'ultimo valore «.» → l'ultima seduta viene dalla coda di Yahoo e `fred` torna di un giorno;
  - senza file: S&P 500 giù o FRED giù → exit 1 e nessun file scritto; ^VIX giù → file solo con FRED;
  - Yahoo e/o FRED appesi → nessun file rovinato.
- **Freschezza**: `check_fresh.js` sui dati attuali dice «Dati aggiornati». Ho simulato 1.123 corse (22:40 e 11:40 UTC, dal 06/11/2026 al 31/12/2028) con il caso peggiore: FRED pubblica ogni mattina feriale la seduta precedente e si ferma nei weekend e nelle feste federali, Columbus Day e Veterans Day compresi. **0 falsi allarmi**, anche con Thanksgiving, Natale, Capodanno, Venerdì santo e i lunedì festivi. Il test di `pipeline.test.js` per la vista VIX passa.
- **Workflow**: il passo `vix` ha `continue-on-error` e `timeout-minutes: 5` e sta prima del commit. È nell'`if` e nel messaggio dell'Esito (come tutti i passi con `continue-on-error`). Il commit aggiunge `data/` (quindi anche il nuovo file) e il messaggio riporta «VIX al …». La prima corsa senza file funziona: `keep_unchanged` ignora i file nuovi.
- **Prestazioni della vista**: regimi e scatter (S&P 500 e Nasdaq-100) e `today()` si calcolano **una volta sola** (`model`, memorizzato in `render()`). Clic sulle soglie, cambio indice o periodo e ridimensionamento ridisegnano soltanto. Costo misurato in Node: build 110–160 ms, `today` 12–19 ms, una sola volta per pagina.
- **App**:
  - `VIEWS` ha 9 voci e i tasti 1–9 funzionano (0 e lettere non fanno niente);
  - `#vix` funziona con `routeHash`;
  - i comandi `VIX`/`VOLATILITA`/`VOLATILITÀ` vengono controllati prima dei simboli, e nessun ticker si chiama VIX;
  - `SHAPE` di `data/vix.json` presente;
  - lo `store` salva numeri in JSON, quindi la soglia viene ripristinata;
  - la versione coincide (`js/version.js` = `version.json` = 1.5.0, nota nel README).

## Cosa non ho potuto verificare e perché

- **Controllo nel browser** (resa, telefono, tema chiaro e scuro, scorrimento della barra a 9 schede): è fuori dal tema «codice». La vista non ha test automatici. `ricerca/qa/browser/v150.cjs` c'è, ma qui non l'ho eseguito.
- **Corsa vera su GitHub Actions** (tempi reali di Yahoo e FRED, kill del passo dopo 5 minuti, push): l'ho solo simulata in locale. I tempi con un server appeso li ho ricavati dai parametri di `fetchDaily`/`fetchFred` e verificati con il mock a velocità ×100.
- **Orari reali di aggiornamento di FRED nelle feste federali in cui la borsa è aperta**: ho usato il caso peggiore come ipotesi, senza osservarlo davvero.
- **Cboe**: non l'ho interrogato (probabilmente bloccato). Il confronto FRED contro Cboe resta quello della ricerca.
- **Modifiche non committate in `/home/user/rrg`** (`index.html`, `js/vix-view.js`, `guida.html`, `README.md`, `docs/sviluppo.md`): le ho solo guardate (passano `node --check`), non controllate a fondo, perché non fanno parte di a801454.

## Script

In `ricerca/qa/1.5.0/codice/script/`:

- `ricalcolo.py` e `confronta.mjs`: ricalcolo indipendente in Python e confronto con `js/vix.js`.
- `mutazioni.mjs`: 35 mutazioni, risultato in `mutazioni.out`.
- `mock.mjs`: rete finta per `fetch_vix.js` (modi `fred503`, `yahooNet`, `yahooHang`, `fredHang`, `fredOld`, `fredDot`, `vixEmpty`, `vixOld`, `vixNullLast`, `spxFail`, `ndxFail`, `vixFail`, `spxShort`; `SCALE` accorcia timeout e attese; `REC=1` registra le risposte vere).
- `scenari.sh`: i 18 casi, risultato in `scenari.out`.
- `same.mjs`: `onlyStamp` di `keep_unchanged.js` su due file.
- `diffvix.mjs`: valori del VIX diversi tra due file.
- `fresh_sim.mjs`: simulazione di `check_fresh` dal 2026 al 2028.
- `fredcmp.mjs`: VIX del file contro il CSV di FRED.
- `indici.mjs`: S&P 500 e Nasdaq-100 contro `data/indices.json`.
- `tempo.mjs`: tempi di calcolo del modello.
