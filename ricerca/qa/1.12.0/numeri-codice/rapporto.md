# Controllo numeri e codice · versione 1.12.0 · commit cd50f19

Verdetto: **GO**

Controllo indipendente (non ho scritto il codice). Ramo `claude/great-noether-2f1ude`, servito con `python3 -m http.server 8817` dalla cartella del repository; confronto con la 1.11.0 (`origin/main`, servita da un archivio su 8818).

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore (latente, non prima di ottobre 2027) | `js/peaks.js`, `timeline()` / `runningPeak()` | Se l'S&P 500 ha un calo ≥ 15% non ancora recuperato e poi fa un nuovo massimo di 52 settimane **più basso** del vecchio massimo, il calo grande sparisce dalla linea del tempo: non è tra i «conclusi» (è `ongoing`) e il riquadro «in corso» riparte dal massimo nuovo, più basso. Con i dati veri: al 31/07/2023 e al 29/12/2023 la pagina avrebbe mostrato 2010, 2011, 2018, 2020 e un «in corso» dal 31/07/2023 (o 28/12/2023, −0,3%), senza il calo del 2022 (−25,4%, recuperato solo il 19/01/2024). Oggi non succede: il calo in corso (06/10/2026) è a −11,6%, e un nuovo massimo di 52 settimane sotto quello del 06/10/2026 è possibile solo dopo il 06/10/2027. È coerente con la definizione scritta nella guida («ultimo massimo di 52 settimane non ancora superato»), ma il risultato è fuorviante. Proposta: come «in corso» prendere il massimo di ciclo ≥ 15% non ancora recuperato, se c'è, altrimenti l'ultimo massimo di 52 settimane; da decidere con l'utente (è una regola). | `node ricerca/qa/1.12.0/numeri-codice/casi-limite.mjs` | righe «PROBLEMA» ai tagli 2023-07-31 e 2023-12-29 |
| 2 | minore | `js/ath-view.js`, titolo del riquadro | Quando l'ultima chiusura dell'S&P 500 è il massimo (calo nullo), il titolo dice «calo — in corso». Il «—» nel progetto vuol dire «dato mancante»; qui il dato c'è, il calo è zero (la riga dell'S&P 500 dice giustamente «al massimo»). Meglio «al massimo». È già successo, per esempio al 13/03/2013, al 30/04/2019, al 19/01/2024, al 27/06/2025 e al 06/10/2026. | `casi-limite.mjs`, caso «Nuovo massimo dell'S&P 500 all'ultima seduta» (`ddPct null`) | codice: `calo ${ep.ddPct == null ? '—' : …}` |
| 3 | minore | `js/ath-view.js`, `markets()` | Senza `data/ath.json` (se lo storico invece c'è) la linea del tempo si vede lo stesso, ma con gli id inglesi come etichette (BTC, GOLD, SILVER…), e senza le etichette italiane nell'ordine tipico. Nessun errore. | `codice.cjs`, caso 4 (blocca `data/ath.json`) | uscita: «etichette BTC,GOLD,SILVER,…» |
| 4 | minore | `js/peaks.js`, `pick()` | Un mercato con la serie ferma da mesi (Yahoo non risponde e la pipeline tiene le righe pubblicate) risulta «nessun calo ≥ 20%» nel calo in corso, e non «dati fermi». Lo segnala già `check_fresh.js` dopo `maxAge`, quindi resta solo da sapere. | script temporaneo (oro tagliato al 31/12/2025: `{"status":"none"}`) | — |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

1. **Numeri della linea del tempo, ricalcolo indipendente** (`ricalcolo.py`, Python, forza bruta, codice mio; decodifica di `data/ath_history.json` fatta da capo). Cinque finestre: 18/09/2018 (−19,8%), 19/02/2020 (−33,9%), 03/01/2022 (−25,4%), 19/02/2025 (−18,9%) e quella in corso dal 06/10/2026 (−11,6% finora).
   - Contro la fixture `test/fixtures/peaks_20261120.json.gz`: **314 campi, 0 differenze** (`confronta_fixture.py file.json`). Confrontati: stato, data, scarto, calo, «finora», sotto zero, minimo, altri massimi e soglia 15%.
   - **Seconda fonte, Yahoo** (chart v8, scaricato il 22/11/2026, tagliato al 20/11/2026): **314 campi, 0 differenze** (`yahoo.json`). Le chiusure coincidono con il file in tutte le sedute (stesso numero per i 9 mercati). Lo scarto è 0 tranne all'ultima seduta dei future: argento 0,09%, rame 0,15%, petrolio 0,68% (Yahoo ha corretto il regolamento del 20/11). Non cambia nessun risultato. Una prima versione del mio script sbagliava di un giorno le date dei future (ora legale): l'ho corretto. Anche con i dati di oggi gli episodi sono gli stessi.
   - **Pagina** (`pagina.cjs`, a 1440 e 390 px): **298 controlli, 0 falliti**. Per ogni riga: titolo del riquadro, testo a destra o sotto, posizione del punto pieno e dei cerchi vuoti ricavata dalle coordinate SVG, riga meta, ordine tipico, console. Il controllo può fallire: con 3 valori alterati di proposito trova 8 errori (i 3 valori, a 2 larghezze), e sulla 1.11.0 si ferma.
2. **Ordine tipico** (`ordine.py`): ricalcolato da zero sulle serie Yahoo complete, compreso il 1999 per il calo del 2000. Gli 8 cali (2000, 2007, 2010, 2011, 2018, 2020, 2022, 2025) e i ranghi medi sono uguali a `ORDER` di `js/peaks.js` e a `risultati.json` (`order.SPX15`): **72 campi, 0 differenze**. Uguali anche a T3 di `tabelle.md` (0,23 · 0,33 · 0,45 · 0,46 · 0,50 · 0,56 · 0,56 · 0,71 · 0,86) e alla guida.
3. **Casi limite** (`casi-limite.mjs`, 18 situazioni su dati veri tagliati o allungati):
   - nessun episodio doppio. Quando il calo in corso supera il 15%, il riquadro resta uno solo (06/10/2026 a −20%) e i 4 conclusi restano quelli;
   - con un nuovo massimo dell'S&P 500 il riquadro riparte da lì;
   - nessun massimo «di ciclo» senza il −20% già avvenuto entro l'ultima seduta. Il Nasdaq-100 a −15% risulta «nessun calo ≥ 20% (≥ 15%: 0 g)», il rame «(≥ 15%: −27 g)»;
   - petrolio sotto zero: 2018, «sotto zero il 20/04/2020» sul computer e «sotto zero» sul telefono;
   - bitcoin: dati dal 17/09/2014, massimi validi dal 17/09/2015, presente in tutte e 5 le finestre;
   - serie vuota: «serie troppo corta»;
   - date e chiusure di lunghezza diversa: mercato escluso;
   - calcolo in 19 ms.
4. **Codice**:
   - `npm test`: 201 test, 0 falliti. `node --check` su tutti i `js/*.js`;
   - `version.js` e `version.json` sono entrambi a 1.12.0;
   - `vix-view.js` non usa più nessun identificatore dei massimi;
   - `codice.cjs`: 27 controlli, 0 falliti. Verificati: richieste di rete (`#ath` non scarica `vix.json`; `#mon` e il VIX non scaricano i file dei massimi; alla seconda apertura lo storico non si riscarica), tasto 0, tasto 0 nel campo comandi, scorciatoie spente, `#ath`, Indietro, collegamento dal VIX, comandi MASSIMI/bolle/Ath/MAX/massimo, storico mancante (messaggio, nessun errore), console. Lo script fallisce sulla 1.11.0;
   - controlli nel browser del progetto con `BASE=http://127.0.0.1:8817/` e `SHOTS=0`: `v1100.cjs` 0 FAIL, `v1101.cjs` 0 FAIL, `v1110.cjs` 2845 OK / 0 FAIL, `v1120.cjs` 250 OK / 0 FAIL (uscite in `v11*.txt`).

## Cosa non ho potuto verificare e perché

- Le immagini (temi, 1280 e 360 px) sono di altri controlli: qui `SHOTS=0`, per non sovrascrivere `ricerca/qa/1.12.0/shots/`.
- Le cache di Yahoo, circa 14 MB di dati grezzi, non sono nel repository, come per le altre ricerche. `ricalcolo.py` e `ordine.py` le riscaricano.

## Script

In `ricerca/qa/1.12.0/numeri-codice/`:
- `ricalcolo.py`, `confronta_fixture.py`, `ordine.py`;
- `pagina.cjs`, `codice.cjs`, `casi-limite.mjs`;
- uscite: `file.json`, `yahoo.json`, `yahoo_oggi.json`, `v1100.txt`, `v1101.txt`, `v1110.txt`, `v1120.txt`.
