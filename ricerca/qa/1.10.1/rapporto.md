# Controllo indipendente (numeri, testi, codice, browser) · versione 1.10.1 · commit 7357eb2

Verdetto: **GO**, a due condizioni: correggere la frase della guida (rilievo 1) e, alla pubblicazione, copiare su `main` anche `data/ath.json` e `data/ath_history.json`, ma non gli altri file di `data/` (rilievo 2).

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `guida.html` #massimi, riga 433 | «Oro, argento, rame e petrolio sono il future continuo di Yahoo (…), **cioè il contratto principale di ogni momento**»: per SI=F e HG=F è falso. Lo storico giornaliero è il contratto del mese più vicino, quasi senza scambi (sintesi 2.2). Il 12/11 SI=F = 49,972 = settlement NOV 26 (15 contratti), non DEC 26 (50,065, 60.860 contratti). La frase contraddice anche la nota di `config/ath.json` per l'argento («contratto del mese più vicino»). | `ricerca/poc/sintesi.md` §2.2; `ricerca/poc/cache/fonti.json` (cme.SI 11/12/2026) | ultima chiusura di SI=F in `ricalcolo.json` |
| 2 | da correggere (pubblicazione) | `data/ath.json` e `data/ath_history.json` su `main` | Su `main` le righe sono ancora GLD e SLV, con il simbolo, il tipo e la nota scritti nel file dei dati. Se si copiano solo codice e config, fino alla corsa notturna il pannello mostra GLD e SLV con le note degli ETF, sotto una nota che parla di future (e `v1101.cjs` fallisce su Pages). Gli altri file di `data/` del ramo sono **più vecchi** di `main` (breadth e VIX all'11/11 contro il 12/11): non vanno copiati. | `git show origin/main:data/ath.json`; `git diff origin/main..7357eb2 -- data/breadth.json` | — |
| 3 | minore | nota del pannello (`index.html` #athNote), guida (riga 437, «Fonti») | La verifica è indicata solo in `ricerca/bolle-rotazione/`, e le seconde fonti solo per S&P 500, Nasdaq-100, bitcoin e petrolio. La verifica dei future di oro e argento (settlement CME) sta in `ricerca/poc/`. | grep «bolle-rotazione» | — |
| 4 | minore | «13:30» per l'argento (config, guida, nota, versione) | Il settlement dell'argento Comex è alle 13:25 di New York (la stessa sintesi §2.4 dice «intorno alle 13:25»); 13:30 è l'ora dell'oro. Proposta: «verso le 13:30». | sintesi §2.4 | — |
| 5 | minore | `scripts/fetch_ath.js`, riga 11 (commento) | Il commento dice ancora «ETF fisici per oro e argento». | `grep -n "ETF fisici" scripts/fetch_ath.js` | — |
| 6 | minore | «di solito verso l'alto» (nota dell'oro, guida) | Nel campione dei 12 mesi tutti e 5 i cambi dell'oro sono al rialzo (contango, sintesi §2.3): la regola è plausibile, ma su più anni non è misurata. Va bene come «di solito»; resta una generalizzazione. | sintesi §2.3 | — |
| 7 | minore | `ricerca/poc/dati.mjs` | Il download dei settlement CME chiama l'endpoint interno del sito. Oggi CME risponde: «This IP address is blocked due to suspected web scraping… prohibited by CME Group's website Data Terms of Use». Il repository è pubblico: meglio non rilanciarlo e dire che il confronto delle 4 sedute è stato fatto una volta. | `curl …/CmeWS/mvc/Settlements/Futures/Settlements/437/FUT?tradeDate=11/12/2026` | risposta di CME (13/11/2026) |
| 8 | minore | `ricerca/qa/browser/v1101.cjs` | Il test ascolta solo `pageerror`, non `console.error`, e confronta la pagina con `data/ath.json` (non con un ricalcolo). Lo copre `ricerca/qa/1.10.1/browser.cjs`. | — | — |

## Cosa ho verificato e passa

- **Numeri, dati Yahoo contro `data/ath.json`.** Ricalcolo in Python, codice proprio: `ricalcolo.py`. I 14 campi coincidono, per GC=F e per SI=F.
  - Oro: ultima 3.885,30 il 12/11/2026; massimo dei 3 anni 5.318,40 il 29/01/2026; −26,95%; 287 giorni all'ultima chiusura; calo più profondo −26,95% il 12/11; nella seduta 5.586,20 il 29/01; massimo di sempre lo stesso; serie dal 30/08/2000.
  - Argento: ultima 49,972; massimo 115,08 il 26/01/2026; −56,58%; 290 giorni; calo più profondo −57,34% il 30/10/2026, +1,78% da lì; nella seduta 121,30 il 29/01.
  - Ricalcolati anche GLD (−28,44%, 29/01) e SLV (−57,27%, massimo il **28/01**) per il confronto.
- **Seconda fonte.** I settlement CME salvati dalla ricerca (`ricerca/poc/cache/fonti.json`) coincidono con le chiusure Yahoo del 12/11: GC=F 3.885,3 = DEC 26, SI=F 49,972 = NOV 26. Non ho potuto ripetere la richiesta a CME (bloccata, rilievo 7).
- **Storico del grafico** (`storico.mjs`): GOLD e SILVER di `data/ath_history.json` coincidono con GC=F e SI=F in 6.577 e 6.578 sedute su 6.577 e 6.578 (0 diverse). Contro GLD e SLV lo stesso controllo fallisce: discrimina.
- **Barre attorno al massimo dell'argento** (SI=F/SLV): 23/01 100,93/92,91; 26/01 115,08/98,34; 27/01 105,52/101,59; 28/01 113,11/105,60; 29/01 114,04/105,57; 30/01 78,29/75,44. Come nella sintesi. Nessun buco oltre 4 giorni nei 3 anni.
- **Testi**, ritrovati in `ricerca/poc/sintesi.md` e `risultati.json`:
  - regolamento verso le 13:30 (§2.4 e §2.5);
  - massimo di SI=F il 26/01 e di SLV il 28/01 (§2.1, `A.stats`);
  - oro: cambio di contratto ogni due mesi; argento: ogni mese (§2.3);
  - il livello sale ai cambi, in contango (§2.3);
  - da un massimo lontano il calo è più piccolo (−26,95% contro −28,44% di GLD, §2.1).
  - Grep di GLD e SLV in app, guida, README, config, scripts e test: nessuna frase vecchia sul pannello, salvo il commento del rilievo 5. Le altre occorrenze sono di altre viste (Asset reali, rotazione) o note di versioni passate.
- **Codice.** `prevRowOf` simulato su una copia del commit, con `data/ath*.json` di `origin/main` (riga GLD) e la rete finta `finto_fetch.mjs`, in 4 casi:
  1. GC=F non risponde: GOLD ha `stats` null («—»), nessuno storico, `missing` = [GOLD], uscita con errore;
  2. lo stesso caso con il codice della 1.10.0: la riga GLD (−28,44%) finisce sotto il simbolo GC=F. Il controllo fallisce sulla versione vecchia, quindi la correzione serve;
  3. tutto risponde: righe e storico identici a quelli del ramo;
  4. seconda corsa con GC=F giù: tiene la riga GC=F appena pubblicata.
- **`npm test`**: 182 su 182.
- **Browser** (server mio su 127.0.0.1:8823):
  - `v1101.cjs` 0 FAIL, `v1100.cjs` 0 FAIL;
  - il mio `browser.cjs`: 55 controlli, 0 FAIL. Copre 1440 chiaro e scuro, 390 chiaro e scuro, 360 chiaro, con clic o tocco su Oro e Argento: riga, dettaglio (6 pezzi), grafico con il massimo, console senza errori né avvisi, nessuna richiesta fallita, nessuno scorrimento orizzontale;
  - lo stesso script sulla 1.10.0 dà 30 FAIL: discrimina.
  - La riga mostra «288/291 giorni fa» invece di 287/290: è voluto, il conteggio arriva a oggi (`vix-view.js` riga 436, comportamento della 1.10.0).

## Cosa non ho potuto verificare

- I settlement CME di oggi e del 26/01/2026: CME blocca le richieste automatiche, e lo storico non è pubblico.
- La pagina pubblicata su GitHub Pages: non è ancora pubblicata.

## Script e screenshot

`ricerca/qa/1.10.1/`:
- `ricalcolo.py` (→ `ricalcolo.json`);
- `storico.mjs`;
- `finto_fetch.mjs`;
- `browser.cjs`;
- `shots/` (tabella e grafico dell'argento a 1440, 390 e 360, chiaro e scuro).
