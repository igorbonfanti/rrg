# Ricontrollo indipendente · versione 1.10.0 · commit 2c565ed

Controllo delle correzioni ai rilievi dei tre rapporti (`testi-codice/`, `numeri/`, `uso/`, tutti sul commit 99054cc),
12/11/2026 ~16:10 UTC. Non ho scritto il codice; nessun file dell'app toccato. Server statico mio su 127.0.0.1:8851,
Chromium di Playwright 1.63, pipeline su un clone usa e getta nella cartella temporanea della sessione.

**Verdetto: GO.** Nessun bloccante, nessun «da correggere». Tutti i bloccanti e i «da correggere» dei tre rapporti sono
corretti e verificati; restano solo minori (sotto), uno dei quali è una piccola regressione grafica.

## Esito dei rilievi

| Rapporto · # | Esito | Come l'ho verificato |
|---|---|---|
| testi B1 Brent «3 volte» | **corretto** | `petrolio/risultati.json` `R3_Brent_S100_K2.segnali` = 2008-04, 2011-03, 2022-04, 2026-04 → «4 volte … aprile 2026, ancora in corso» (condizione vera a 10/2026 in `adesso.condizioni_ultimo_mese`); `segnali_dettaglio`: dd12 −51,2/−17,1/−13,4 (tutti ≥10%), S&P già −11,5% e −13,9% sotto il massimo dei 12 mesi nel 2008 e 2022; criterio (b) «troppo pochi casi» |
| testi C1 frasi più forti della ricerca | **corretto** | guida e nota di versione ora dicono «nessuna supera il criterio»; 350 pb: 4/7 contro 26,7% (`hy_L350.a`, base dd126 q10), «con 7 casi può essere il caso» (p = 0,087); 300/400/500 tutte `pass:false` su (b); `verdetti`: nessuna regola passa; le 48 regole dell'elenco coincidono con le 48 `sensibilita:false` (R1 12/36 mesi nominale e reale, R2 +50/+100%, R3 95/100 $ K2/K3, WTI e Brent) |
| testi C2 «qualche decimo» | **corretto** | «a volte di alcuni punti»; WTI −23,39% e −27,58% all'11/11/2026 = `distPct` e `last/intradayRef−1` di `data/ath.json`; 7.818,93 e 7.844,52 = `ref` e `intradayRef` SPX |
| testi C3 «Caricamento…» mai mostrato | **corretto** | `ricontrollo.cjs` §1: storico trattenuto con `page.route`; prima apertura, altro mercato, chiudi/riapri: sempre «Caricamento dello storico…»; all'arrivo grafico del mercato aperto per ultimo |
| testi C4 «Fonti» del VIX fuori posto | **corretto** | il paragrafo è tornato in fondo a «Struttura a termine e credito», prima di #credito-petrolio; #massimi ha la sua voce «Fonti» (Yahoo, ricalcolo ogni notte) |
| testi M1 mutanti | **corretto** | `testi-codice/mutanti.mjs` rilanciato: 22 presi su 23, il 23° non è più applicabile (riga cambiata) e il caso è coperto dal test nuovo (`intradayRef` 121) |
| testi M2 «massimo storico» | **corretto** | grep su workflow, scripts, test, docs: restano solo usi in altre viste (emergenti), corretti |
| testi M3 «quasi intatto» | **corretto** | «−14,6% dal massimo di settembre invece che −40,7%» = `confronto.json` BTC `bull20` (21/09/2026, −14,6) e `ath`/3 anni (06/10/2025, −40,7) |
| testi M4 video e data | **corretto** | link e titolo del video come in `ricerca/oscillatori/identificazione.md`; data ora riferita alla verifica |
| testi M5 grigio | **corretto** | grigio solo oltre 3 giorni; prova con bitcoin alla domenica, 6 mercati al venerdì, argento −3 giorni, WTI −4: grigio solo WTI; guida aggiornata |
| testi M6 serie senza `cd` | **corretto** | §3: `cd` assente, serie vuota, `cd` corto → «Storico di questo mercato non disponibile.», nessun errore, il mercato dopo si disegna |
| testi M7 / numeri 3 `ath.json` illeggibile | **corretto** | `pipeline.sh` §I: troncato, 0 byte, `{}`, `null` → exit 1 «illeggibile o senza mercati»; assente → nessun controllo (voluto) |
| testi M8 documenti | **corretto** | `docs/sviluppo.md` 12/11/2026 v1.10.0; nota in testa a `sintesi.md`; README cita `confronto.mjs` per i 3 anni |
| testi M9 testi della tabella | **in parte** | «1 giorno fa», giorni fino a oggi, pallini del massimo e dell'ultima chiusura in legenda: sì. Con `data/vix.json` mancante il pannello dei massimi sparisce ancora (`senza-vix.cjs`) |
| numeri 1 ordine dei file | **corretto** | `pipeline.sh` §B: due corse con ordini di arrivo diversi (anche con 2 mercati mancanti) → file uguali a parte `generated`, `keep_unchanged` non pubblica niente |
| numeri 2 codice d'uscita | **corretto** | §C, D, G, H: exit 1 con «Mercati non aggiornati: …»; file riscritti con la riga e lo storico pubblicati (sha1 dello storico WTI uguale); il commento del workflow ora è vero |
| numeri 4 `athStats` con null | **corretto** | `numeri/casi_limite.mjs` 19 su 19; `start` = prima seduta con chiusura, massimo della seduta solo nei giorni con chiusura |
| numeri 5 nota del WTI | **corretto** | `data/ath.json` rigenerato: label, simbolo, tipo e nota uguali a `config/ath.json`; §A: una corsa sulle risposte salvate dà lo stesso file a parte `generated` |
| numeri 6 riga senza file precedente | **in parte** | storico vecchio non più tenuto e messaggio giusto per il mercato; il riepilogo dice ancora «8 mercati su 9 (righe pubblicate: WTI)» anche se una riga pubblicata non c'è |
| numeri 7 NDX Yahoo contro ufficiale | invariato | informativo, nessuna azione richiesta |
| numeri 8 «giorni fa» | **corretto** | giorni contati fino alla data del computer: 9 mercati uguali a `max(days, oggi − refDate)` (oggi 12/11 → +1); con la data fissata all'11/11 tornano i `days` del file |
| uso 1 asse nello zoom stretto | **corretto nel pannello** | §6: zoom stretti su SPX, NDX, rame, oro, BTC a 1440, 390, 360 px (lente al tocco): sempre ≥2 valori, in ordine e in scala logaritmica. Il grafico grande del VIX ha ancora il difetto (non era una regressione, non toccato) |
| uso 2 tabella del telefono | **corretto** | §7: 390 e 360, chiaro e scuro, chiusa e con una riga aperta: `scrollWidth` = `clientWidth`, nessuna cella fuori, `scrollLeft` resta 0; nessuna altra vista con la pagina più larga di 390 |
| uso 3 etichetta del massimo sulla linea | **corretto** | etichetta tolta dal grafico, valore in legenda: 9 mercati, ultimi 3 anni (dal …), massimo, minimo, ultima chiusura, massimo di sempre uguali a `data/ath.json` (formattatore mio) |
| uso 4 controlli senza storico | **corretto** | §2 (404) e §3: grafico, periodi e lente nascosti; console solo il 404 voluto |
| uso 5 Esc toglie due zoom | non corretto | minore, non toccato |
| uso 6 tastiera | **in parte** | `aria-controls` aggiunto; l'ordine del Tab è quello di prima |
| uso 7 accessibilità e titolo | **in parte** | (b) `aria-label` con mercato e data d'inizio, (c) titolo «serie dal …», (d) «1 giorno fa»: corretti; (a) `role="button"` sulle righe resta |

## Regressioni cercate

- `npm test`: 181 test, 0 falliti. `node --check` su `js/`, `scripts/`, `test/`: nessun errore. YAML del workflow e tutti
  i JSON di `data/`, `config/`, `version.json` validi. `js/version.js` e `version.json` entrambi 1.10.0.
- `ricerca/qa/browser/v1100.cjs` sul mio server: 0 FAIL (1440 scuro, 1280 chiaro, 390 scuro, 360 chiaro, file mancante, guida).
- `uso/controllo.cjs` rilanciato (copia, `controllo-uso.cjs`): 1.489 OK; i 212 FAIL sono tutti i
  cambi voluti (giorni +1 fino a oggi, etichetta del massimo spostata in legenda, titolo «serie dal …») più l'arresto nella
  fase «miss» perché il pulsante MAX ora è nascosto senza storico (comportamento corretto). Console senza errori su tutte
  le larghezze.
- Pipeline: nessuna ripubblicazione inutile, nessun file rovinato, `missing` nell'ordine della configurazione.

## Rilievi residui

| # | Gravità | Dove | Cosa | Come riprodurlo |
|---|---|---|---|---|
| R1 | minore (regressione grafica) | `js/vix-view.js` `lab` | Le tacche sotto 10 non intere (1,5; 2,5) hanno 2 decimali: «2,50» accanto a «3», «4» (rame 10A), «1,50». Prima «2,5». | #vix, Rame, 10A; `controllo-uso.log` riga «10A COPPER: … 2,50,3,4,5,6» |
| R2 | minore | `js/vix-view.js`, zoom stretto | Con meno di 2 valori tondi l'asse mostra 5 livelli non tondi (6,32k 6,67k 7,04k 7,43k 7,84k): giusti e leggibili, ma 6,5k 7k 7,5k sarebbero più facili. | §6, SPX zoom 93–100% |
| R3 | minore | `scripts/fetch_ath.js` riepilogo | «8 mercati su 9 (righe pubblicate: WTI)» quando il mercato non è arrivato e una riga pubblicata non c'è (solo log). | `pipeline.sh` §E |
| R4 | minore | `js/vix-view.js` | Con `data/vix.json` mancante sparisce anche il pannello dei massimi (resta il messaggio del VIX). | `senza-vix.cjs` |
| R5 | minore | `js/zoom.js` | Un Esc toglie lo zoom sia del grafico grande del VIX sia del pannello (uso 5). | rapporto uso |
| R6 | minore | grafico grande del VIX | Zoom stretto con una sola tacca sull'asse dei prezzi (uso 1, parte non corretta, già nella 1.9.x). | `uso/rilievo-zoom-asse-vix.cjs` |
| R7 | minore | tabella | `role="button"` sulle righe e ordine del Tab (uso 6-7a). | rapporto uso |
| R8 | minore | `scripts/check_fresh.js` | `{"markets":[]}` passa senza segnalazione (fetch_ath.js non scrive mai un file così). | `pipeline.sh` §I |
| R9 | minore (solo ricerca) | `ricerca/qa/1.10.0/uso/controllo.cjs`, `testi-codice/verifica_testi.py` | Gli script dei controlli precedenti segnano FAIL sui cambi voluti (giorni, etichetta, titolo; `verifica_testi.py` controlla la ricerca, non il testo nuovo): da aggiornare se si riusano. | — |

## Cosa non ho potuto verificare

- GitHub Actions vero (passo `ath` con exit 1 e «Esito»): solo localmente, con il mock di Yahoo.
- Safari, Firefox, telefono vero, lettore di schermo.
- Nessun nuovo confronto con fonti esterne: i valori di `data/ath.json` sono cambiati solo in `generated` e nella nota del WTI
  rispetto al commit già controllato dal rapporto «numeri».

## File

- `ricontrollo.cjs` → `ricontrollo.log` (86 OK, 0 FAIL): storico lento, 404, serie rotte, legenda e giorni, grigio, zoom
  stretto computer e telefono, tabella del telefono, altre viste. Schermate in `shots/`.
  `BASE=http://127.0.0.1:8851/ NODE_PATH=/opt/node-tools/node_modules node ricerca/qa/1.10.0/ricontrollo/ricontrollo.cjs`
- `pipeline.sh <clone> <cartella temporanea>` → `pipeline.log` (usa `../numeri/mock_yahoo.mjs` e `../numeri/cache/`).
- `senza-vix.cjs`: pannello con `data/vix.json` mancante.
- `controllo-uso.cjs` (copia di `uso/controllo.cjs` con le schermate in `shots-uso/`, cancellate dopo la corsa: 16 MB) → `controllo-uso.log`.
