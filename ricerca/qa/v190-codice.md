# Controllo codice e pipeline · versione 1.9.0 · commit f1a5de9

(Il ramo è poi passato a 2f79ee1, che aggiunge solo screenshot in `ricerca/soxx/shots/`: codice identico.)

Verdetto: **NO-GO**, ma solo per due correzioni piccole (D1, D2). Nessun bloccante. Dopo le due correzioni, e un nuovo controllo dei due punti, è GO.

Script, copie e prove: `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa190-codice/` (sotto, `S/`). Prove sulla copia di `origin/main` (1ec509d) con i file dell'app e degli script del ramo (`S/main/`, senza `ricerca/`). Fonti finte: `S/mock.mjs` per iShares e Yahoo, che serve le risposte reali salvate dal backfill (`S/cache/`, `S/holdings.csv` del 10/11/2026), e `S/mock_tg.mjs` per Telegram.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| D1 | da correggere | `scripts/fetch_industries.js` `updateIndustry` (passo 1) + `buildSectorMembers` | Se il CSV iShares cambia i nomi delle colonne «Weight (%)» o «Quantity» (i vecchi CSV iShares usavano «Shares»), la lista viene accettata (i ticker ci sono), ma pesi e azioni diventano `null`/vuoti. `industry_members.json` si scrive lo stesso: il «cap-weighted» del SOXX viene calcolato con i pesi di riempimento di `buildSectorMembers` (`small`: stesso valore per ogni titolo), senza nessun avviso, e `weightsAsOf` dice «2026-11-10». Esempio: 1M cap −22,2% invece di −19,4%; 1A 33,7% invece di 38,7%; storia della divergenza diversa in 51 settimane su 52. In `latest` tutti i `w` sono `null`. Per i settori c'è la protezione (`fetch_breadth.js`: `if (!tot) throw new Error('pesi nulli')`), per le industrie no. È un valore di riempimento mostrato come dato. | `S/scen.sh csvCols 2026-11-05 csvCols`, poi `node S/confronta.mjs S/data_backfill S/run/csvCols/data industry_members.json` | output in `S/run/csvCols/` |
| D2 | da correggere | `scripts/send_alerts.js` `main()`; `js/bottom.js` `createBottom` / `js/industries.js` `industryKeys` | Un `data/industries.json` che è JSON valido ma ha la struttura rotta (`dates` senza `d0`/`gaps`, oppure serie senza `breadth`) ferma anche i settori. (a) `send_alerts.js` termina con un'eccezione («gaps is not iterable» / «Cannot read properties of undefined (reading 'n')»), exit 1. Gli alert dei settori non partono (trigger XLU di prova non inviato) e `alerts.json` non si scrive: gli eventi non si perdono, ma restano fermi finché il file non torna giusto. Il `try` copre solo la lettura del file, non `collectIndustryEvents`. (b) Nel browser l'intera app mostra «Impossibile caricare i dati (gaps is not iterable)»: spariscono anche gli 11 settori. Il workflow controlla solo che il JSON sia valido. Il file lo scrive il nostro script, quindi il caso è poco probabile, ma contraddice la regola «un problema del SOXX non ferma mai i settori». Correzione: un `try` per industria intorno a `collectIndustryEvents`; nel browser controllare la forma (`dates.d0`, `gaps`, `breadth.a200`, lunghezze) in `industryKeys` e, se fallisce, ripiegare su `IND = null`. Un file troncato (JSON non valido) invece è gestito bene in tutti e due i casi. | alert: `S/run/AR_date_rotte`, `S/run/AR_senza_breadth` (`S/alert.sh <dir>`); browser: `NODE_PATH=$(npm root -g) node S/browser_rotto.cjs` (server statico sul ramo, porta 8797) | `S/shot-date_rotte.png`, `S/shot-senza_breadth.png` |
| M1 | minore | `scripts/send_alerts.js` `planGroups` (prima volta di un'industria) | Alla prima registrazione lo stato si salva senza invii, ma gli eventi delle ultime 6 sedute non entrano nel registro. Alla corsa dopo `newEvents` li trova nella finestra `recheck`, non registrati, e li invia con la loro data vecchia. Con i dati troncati al 28/03/2025, la zona blu del 27/03/2025 è stata inviata alla seconda corsa. **Con i dati di oggi non succede**: l'ultimo evento del SOXX è il trigger del 02/05/2025. Con l'`alerts.json` vero di main ho fatto due corse sulla copia: «prima volta… senza inviare lo storico», 0 messaggi, registro invariato. È lo stesso comportamento che i settori hanno avuto alla loro prima corsa. Correzione possibile: alla prima volta mettere nel registro gli eventi della finestra con `telegram: false`. | `S/run/A2` (comandi nel paragrafo «Alert» sotto) | — |
| M2 | minore | `scripts/fetch_industries.js` `industryMembers` | Basta un membro senza la chiusura dell'ultima seduta per fermare `industry_members.json` ogni sera. Succede con un titolo nuovo della lista che Yahoo non conosce, con un titolo acquisito ancora nelle holdings, o con una barra mancante. I settori tollerano fino all'1% di titoli non pesanti. `industries.json` va avanti lo stesso. La vista 5 mostra il SOXX disattivato con il motivo (`mergeTitles`) e `check_fresh` lo segnala dopo 4 giorni. Scelta prudente: va solo detta. | `S/scen.sh csvAddNo 2026-11-05 csvAdd`; `S/scen.sh H1 2026-11-05 "" QA_DROP="NVDA:2026-11-10"` | log in console |
| M3 | minore | `fetch_industries.js` (controllo `lost`) + `need_update.js` | Se la storia dell'ETF su Yahoo perde una seduta già pubblicata, i file restano fermi (exit 1 ogni sera) finché Yahoo non la rimette. Intanto `need_update` fa ripartire ogni notte tutte e 6 le corse di recupero, con l'aggiornamento completo. Il numero è limitato (cron 01:10–06:10), non infinito; `check_fresh` lo segnala dopo 4 giorni. `fetch_indices.js` invece tollera il caso (`mergePrices`). | `S/scen.sh etfLost 2026-11-05 etfLost` | file invariati (`confronta` su `data_prima`) |
| M4 | minore | `fetch_industries.js` scrittura | Il file si riscrive anche senza sedute nuove in due casi. (1) Il rumore di Yahoo sulle chiusure rettificate fa cambiare di 0,01 un valore arrotondato: 1 valore su 6370 tra backfill e corsa forzata, 24/02/2024 a 67,54500580 e poi 67,54501343. (2) `lists.SOXX.asOf` prende la data della corsa. `keep_unchanged.js` toglie solo le differenze in `generated`. Grazie all'uscita anticipata (asOf ≥ seduta attesa e vista 5 aggiornata) succede solo quando il SOXX è indietro. `fetch_emerging.js` ha già una tolleranza per lo stesso rumore. | `node scripts/fetch_industries.js --force` sulla copia, poi `node S/confronta.mjs` | — |
| M5 | minore | pubblicazione / `universe.json` | `data/prices.json` di main (e del ramo) non ha il SOXX: entra con la prima corsa di `fetch_data.js` dopo la pubblicazione. Se la prima corsa non ha una seduta nuova (fine settimana), `withMeta` aggiorna solo i gruppi e il SOXX entra la sera dopo. Fino ad allora il SOXX manca dalla rotazione e la sua colonna rotazione nel Monitor è vuota, senza errori e senza note. Con un `prices.json` rigenerato (`fetch_data.js us`) il SOXX compare (LAGGING 99,80/97,66) e le 11 righe dei settori restano identiche, Monitor compreso. | `node S/browser_rrg.cjs`, `node S/browser_rrg_soxx.cjs` | `S/shot-rrg-senza-soxx.png`, `S/shot-rrg-con-soxx.png` |
| M6 | minore | `scripts/backfill_industries.js`; `docs/sviluppo.md` §9 | (a) Senza `--force` il backfill rifiuta di sovrascrivere `industries.json`, ma sovrascrive `industry_members.json` se c'è solo quello. (b) La procedura «Ricostruire i cali forti» (`backfill_capitulation.py`) riscrive `capitulation.json` da zero e toglie la serie SOXX: dopo va rieseguito `backfill_industries.js --force`. Va scritto in §9. | `S/run/bf` | — |
| M7 | minore | `fetch_industries.js` + testi | Quando la lista cambia, si ricalcolano con i membri nuovi solo le ultime 5 sedute e le precedenti restano con quelli vecchi (nella prova `members` passa da 30 a 31 a metà serie). Col tempo la storia diventa «membri del giorno del calcolo», non più «membri di oggi» come dicono README e app (effetto piccolo). Da dire nei testi o da accettare. | `S/scen.sh csvAddYes 2026-11-05 csvAdd QA_ADD=QAX` | — |
| M8 | minore | messaggi | Nell'app il nome è «Semiconductors», nei messaggi Telegram «Semiconduttori (SOXX, industria)», da `label` di config. I settori usano il nome inglese in tutti e due. Da far scegliere all'utente. | `S/run/A3/tg.txt` | — |
| M9 | minore | `.github/workflows/update-data.yml` | Gli alert del SOXX partono solo se il passo della breadth dei settori è riuscito: se quello fallisce, aspettano la sera dopo (non si perdono). Accettabile, va detto nel commento del passo. | lettura | — |
| M10 | minore | pulizia | In `fetch_industries.js` la costante `UA` non si usa. Il commento in testa a `scripts/lib/members.js` («la validazione … sta in fetch_indices.js») è superato. Due controlli di `updateIndustry` non sono coperti da `npm test` (storia accorciata, meno del 90% dei prezzi: mutazioni sopravvissute, `S/mutazioni.sh`); il mock di questo controllo potrebbe diventare un test. | `S/mutazioni.sh` | — |

## Cosa ho verificato e passa

- **Sintassi e test**: `node --check` su 58 file (`js/`, `scripts/`, `scripts/lib/`, `test/`): nessun errore. `npm test` sul ramo: 169/169. Sulla copia di main prima del backfill: 166/169 (i 3 test sui file `data/` delle industrie falliscono come devono), dopo il backfill: 169/169.
- **Backfill su main** (copia di 1ec509d con i file del ramo):
  - durata 4,7 s;
  - cambiano solo `capitulation.json` (serie SOXX) e i due file nuovi; gli altri 35 file di `data/` sono identici (sha1 prima/dopo);
  - `ricerca/soxx/verifica_app.mjs S/main/data`: tutto OK (breadth 6357/6357 sedute uguali alla ricerca; 7 zone blu e 7 trigger al 3%; fotografia 30/30, a200 7);
  - `industries.json` coincide con quello del ramo campo per campo, tranne `generated`; `industry_members.json` è identico.
- **Rifiuti del backfill**:
  - senza `--force` con `industries.json` presente: exit 1;
  - con `capitulation.json` non nel formato di `JSON.stringify`: exit 1;
  - con `--force` tocca solo i 3 file previsti.
- **Corsa serale**:
  - con i dati già alla seduta attesa: uscita subito, nessun file scritto;
  - con la storia troncata 3 sedute indietro: recupera 8 sedute e il risultato è identico al backfill (`industries.json` solo `generated`, `industry_members.json` identico, `capitulation.json` solo `generated`).
- **Casi difficili con il mock** (20 prove):
  - iShares HTTP 500, pagina HTML, timeout, colonna «Asset Class» cambiata, metà della lista: si tiene l'ultima lista, avviso, breadth aggiornata;
  - ETF giù, membri giù, ETF senza una seduta pubblicata: file invariati byte per byte, exit 1;
  - ETF più vecchio: nessun salto all'indietro;
  - un titolo senza l'ultima chiusura: seduta pubblicata (≤ 1), riga `at: 2026-11-09`;
  - due titoli senza l'ultima chiusura: si aspetta, asOf 09/11;
  - buco di due titoli il 06/11: seduta saltata con nota, le seguenti pubblicate;
  - ETF senza l'ultima barra: asOf 09/11;
  - titolo nuovo (su Yahoo e no), titolo uscito: lista con `changes`;
  - frazionamento non ancora rettificato da Yahoo: stesso comportamento degli indici, si corregge da solo con il ricalcolo delle 5 sedute.
- **Alert Telegram** (mock, 14 corse):
  - prima volta su main con l'`alerts.json` vero: 0 invii; seconda corsa: 0 invii;
  - evento nuovo del SOXX: un solo invio, formato «▼ ZONA BLU · Semiconduttori (SOXX, industria)» con link `…/rrg/#SOXX`; nessun doppio invio alla corsa dopo;
  - evento finto di XLU nel registro: annullato solo dal gruppo dei settori, il SOXX resta;
  - zona blu del SOXX sparita dopo il ricalcolo: «↻ RETTIFICA» del SOXX, settori intatti;
  - invio fallito: registrato `failed`, rinviato la sera dopo, poi più niente;
  - `industries.json` troncato: avviso, settori inviati.
  - Inoltre gli eventi del SOXX calcolati come nel browser (calendario dei settori allungato) coincidono con quelli degli alert: 14/14, anche con un buco finto nella serie (`S/app_vs_alert.mjs`).
- **Nessun cambio per indici e settori**: `loadMembers` di main contro `nextList` su 20.000 liste casuali: 0 differenze (liste scritte e avvisi). `buildSectorMembers` di main contro quello della 1.9.0 (default e `total: true`): identico; `total: false` = main senza la riga SPX (`S/diff_equivalenza.mjs`).
- **Workflow**:
  - il passo «Industrie (SOXX)» ha `continue-on-error` e timeout di 8 minuti, ed è prima degli indici;
  - scrive i file solo alla fine, quindi un timeout non lascia file a metà;
  - i file nuovi entrano con `git add data/`, con il controllo del JSON e `rm -f` se un file nuovo è rotto;
  - il messaggio di commit ha «industrie al …»;
  - «Esito» comprende il passo;
  - nessuna corsa si fa ripartire da sola: i push con `GITHUB_TOKEN` non avviano workflow.
- **`need_update`**: 5 casi (file assente: nessun controllo; al giorno: salta; indietro o illeggibile: riparte; corsa principale: parte sempre); sulla copia di main reale: «Salto».
- **`check_fresh`** sulla copia di main: «Dati aggiornati»; con file fermi da 6 giorni segnala tutti e 4 i controlli nuovi.
- **Browser** (Playwright, 1440 px, 10 varianti di `industries.json`/`industry_members.json` più 2 di `prices.json`):
  - file mancante o troncato: 11 settori, nessun errore oltre l'avviso;
  - SOXX indietro di una seduta (breadth, oppure tutto l'ETF): riga e dettaglio «al 09/11/2026» con i valori del file;
  - SOXX una seduta avanti: la seduta in più non entra;
  - prezzo più corto: «al 27/10/2026»;
  - `industry_members.json` mancante: viste 1-4 normali.
- **Mutazioni**: 13 mutazioni della logica nuova, 11 fanno fallire `npm test`.
- **Sicurezza e vincoli**:
  - nessun segreto nei file cambiati;
  - Rea citato in `config/industries.json` (`blueSource`), in `config/thresholds.json` e nei testi; nessun dato di quant-rea, TradingView o StockCharts nei file dell'app (`tv` è solo il simbolo del link);
  - pesi e nomi iShares pubblicati come già si fa per IVV;
  - i 33 file `data/` del ramo sono più vecchi di quelli di main (fino a 4 giorni): la copia deve escludere `data/`, come dicono `docs/sviluppo.md` §9 e la skill. I due file nuovi si generano su main con il backfill, che dà gli stessi dati del ramo.

## Cosa non ho potuto verificare e perché

- La corsa vera su GitHub Actions (cron, push, Telegram vero): verificata solo leggendo il workflow e con le prove locali con mock.
- Un giorno di festa reale e l'ora della seduta attesa: `expectedSession` usa l'orologio, che non ho finto. Ho verificato che le candidate passino da `isTradingDay` e che l'uscita anticipata usi la seduta attesa.
- Telefono e tema chiaro: non sono il mio tema (le prove nel browser sono a 1440 px, tema di default).

## Script

In `S/` = `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa190-codice/`:

- **Corsa serale e backfill**:
  - `mock.mjs`: mock di iShares e Yahoo, con scenari scelti da `QA_SCEN`/`QA_DROP`;
  - `scen.sh NOME DATA SCENARI [env]`: corsa serale su una copia con la storia troncata;
  - `tronca.mjs`: tronca la storia a una data;
  - `confronta.mjs`: confronta due cartelle `data/`.
- **Alert**:
  - `mock_tg.mjs`, `alert.sh DIR`: Telegram finto;
  - `eventi.mjs`, `eventi2.mjs`: eventi del SOXX e dei settori;
  - `app_vs_alert.mjs`: eventi del browser contro quelli degli alert.
- **Equivalenza e test**:
  - `diff_equivalenza.mjs` (con `old/`, i file di main);
  - `mutazioni.sh` (copia `mut/`);
  - `need.mjs`;
  - `jitter.mjs`: rumore di Yahoo tra due richieste.
- **Browser**: `browser_varianti.cjs` (`varianti/`), `browser_rotto.cjs`, `browser_rrg.cjs`, `browser_rrg_soxx.cjs`. Server: `python3 -m http.server 8797 --bind 127.0.0.1` dalla radice del ramo; `NODE_PATH=$(npm root -g)`.
- **Copie e dati**:
  - `main/`: copia di main con i file del ramo e il backfill fatto;
  - `data_backfill/`: `data/` dopo il backfill;
  - `run/*`: esiti delle prove.

Comandi della prova M1, in `S/`:

```
D=S/run/A2; node tronca.mjs $D/data 2025-03-28; ./alert.sh $D
cp data_backfill/industries.json $D/data/
node tronca.mjs $D/data 2025-03-31; ./alert.sh $D
cat $D/tg.txt
```
