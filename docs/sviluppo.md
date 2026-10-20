# Sviluppo di Sector Monitor: stato, decisioni e prossimi passi

Documento di passaggio per riprendere lo sviluppo senza perdere il filo. Aggiornato al 18/10/2026, versione 0.9.0.
- **Regole di lavoro**: `CLAUDE.md`.
- **Dettaglio tecnico**: `README.md`.
- **Spiegazione per chi usa l'app**: `guida.html`.
- **Ricerche e prove**: `ricerca/`, solo sul ramo di sviluppo `claude/great-noether-2f1ude`.

## 1. A cosa serve

Uno strumento di studio, gratuito e in italiano, per un investitore in euro che costruisce un portafoglio multi-asset con gli ETF e ragiona su mesi e anni. Fa due cose:
1. **Possibili bottom** di settori S&P 500 e indici mondiali, con il metodo di Massimo Rea (quant-rea): la % di titoli sopra la media a 200 sedute scende sotto un **livello blu**, con il drawdown dell'ETF o dell'indice. Una macchina a stati trasforma la lettura in Attenzione → Zona blu → Trigger → (Fallito) → Cooldown.
2. **Rotazione relativa** (stile RRG, con RS-Ratio e RS-Momentum) di settori, MAG7, ETF UCITS in euro (asset class, fattori, regioni, paesi, indici) e asset reali in dollari.

Non è consulenza e non dà ordini: dirige l'attenzione. La regola principale è che ogni numero mostrato sia verificato e verificabile (`CLAUDE.md`).

## 2. Architettura

- **Sito statico** (GitHub Pages, `main`): `index.html`, `guida.html`, `css/style.css` e moduli ES in `js/`, senza build e senza librerie di grafici.
- **Moduli condivisi** (li usano sia l'app nel browser sia gli script Node):

  | Modulo | Contenuto |
  |---|---|
  | `js/engine.js` | rotazione |
  | `js/signals.js` | breadth, macchina a stati, `explainState`, `signalContext`, `approachLevel` |
  | `js/metrics.js` | drawdown |
  | `js/portfolio.js` | portafoglio di riferimento |
  | `js/indexdata.js` | formato compatto degli indici |
  | `js/capitulation.js` | cali forti |
  | `js/calendar.js` | calendari |

- **Viste e grafici**:

  | File | Cosa disegna |
  |---|---|
  | `js/app.js` | avvio, comandi, viste, versione |
  | `js/bottom.js` | Monitor, Bottom Map, Settore, Alert |
  | `js/indices.js` | vista 6 |
  | `js/titles.js` | vista 7 |
  | `js/cap-view.js`, `js/cap-chart.js` | scheda Cali forti |
  | `js/rrg-chart.js`, `js/perf-chart.js`, `js/sector-chart.js`, `js/bottom-map.js` | grafici SVG |
  | `js/format.js` | numeri all'italiana, tooltip, checklist |

- **Avvio in due tempi**:
  - prima i file del Monitor (`prices`, `sectors`, `breadth`, `thresholds`, `breadth_latest`, `alerts`, `config/indices`);
  - dopo il primo disegno `prices_global` e `prices_macro`;
  - alla prima apertura della vista: `indices`, poi `indices_more`, `sector_members`, `capitulation`.
  - I file caricati dopo usano `cache: 'no-cache'`.
- **Versione**: `js/version.js` e `version.json` devono coincidere. Se il browser usa file vecchi l'app lo dice e il pulsante «Nuova versione» riscarica tutto.

## 3. Dati e aggiornamento notturno

Workflow `.github/workflows/update-data.yml`, alle 22:40 UTC, ogni ora dalle 01:10 alle 06:10 UTC (si ferma se la seduta USA c'è già: `scripts/need_update.js`) e alle 11:40 UTC. Nelle due settimane fino al 20/10/2026 GitHub ha fatto partire la corsa delle 22:40 tra 2 h 04 e 4 h 30 dopo, quella delle 03:20 (tolta) tra 4 h 34 e 7 h 25 dopo; la prima corsa ha trovato la seduta USA completa su Yahoo in 4 notti su 9 (dai commit `chore: dati al …` di `main`).

| Passo | Script | Scrive |
|---|---|---|
| Prezzi | `scripts/fetch_data.js` | `data/prices.json` (USA), `prices_global.json` (UCITS in euro), `prices_macro.json` (asset reali, CPI da FRED) |
| Breadth settori | `scripts/fetch_breadth.js` | `breadth.json`, `breadth_latest.json`, `sectors.json`, `sp500_members.json`, `sp500_history.json`, `sector_members.json`, `capitulation.json` (SPX e settori) |
| Indici | `scripts/fetch_indices.js` | `indices.json`, `indices_more.json`, `index_members/*.json`, `capitulation.json` (indici) |
| Alert | `scripts/send_alerts.js` | Telegram e `alerts.json`; un invio fallito si riprova per 5 sedute |
| Commit | `scripts/keep_unchanged.js` | non pubblica i file che cambiano solo per l'ora |
| Controllo | `scripts/check_fresh.js` | fa fallire l'esito se una fonte è ferma oltre il suo limite |

**Ricostruzioni storiche una tantum** (istruzioni in testa a ogni file):
- `scripts/backfill_breadth.py`: settori e S&P 500 dal 2005, con la release Johnbrick123/sp500-data e la storia di datasets/s-and-p-500-companies;
- `scripts/backfill_indices.py`: indici dal 2000, con il comando `prices` per la cache dei membri e `build`;
- `scripts/backfill_capitulation.py`: cali forti, che riusa le due ricostruzioni precedenti.

**Fonti**:
- Yahoo Finance per i prezzi;
- Wikipedia per membri e cambi dell'S&P 500 e liste di molti indici;
- holdings iShares (IVV, EXSA, IWM, EEM, EWT);
- API Nasdaq, Nikkei e B3;
- FRED per il CPI.

**Approssimazioni dichiarate** (devono restare scritte nell'app):
- **Composizione**: storia con i membri di oggi per gli indici senza composizione storica gratuita.
- **Copertura**: inferiore al 100% dove Yahoo non ha i prezzi di un titolo uscito dall'indice.
- **DBMFE**: prima del 28/04/2025 è il DBMF americano convertito in euro.
- **Prezzi mancanti**: ultimo prezzo noto nei giorni di festa di una borsa; bitcoin preso alle sedute di Milano.
- **CPI**: a gradini, dal giorno di pubblicazione.
- **Drawdown**: con i dividendi oppure sul solo prezzo.
- **Cali forti**: esclusi gli errori di stampa; Taiwan escluso (`noCap`).

## 4. Metodi (sintesi; i dettagli sono nel README)

- **Breadth**:
  - un titolo è «sopra» se chiude sopra la sua media a N sedute, avendo almeno N sedute;
  - chiusure rettificate per gli split, non per i dividendi;
  - composizione di ogni data per l'S&P 500 e i settori (anche Dow e Nasdaq-100); il denominatore conta i membri quotati.
- **Livelli blu**:
  - settori: tabella «200 LEVEL SETTORI» di Rea (`config/thresholds.json`);
  - indici: livello di Rea dove c'è, altrimenti il 3° percentile della storia (`config/indices.json`, campo `blueSource`).
- **Macchina a stati** (`config/thresholds.json`):

  | Parametro | Valore |
  |---|---|
  | watchBand | 10 |
  | ddSetup | 70 |
  | ddWatch | 85 |
  | setupCloses | 2 |
  | minRecoveryPoints | 5 |
  | minRecoveryStocks | 2 |
  | slowSetupSessions | 60 |
  | failWindow | 20 |
  | cooldown | 63 |
  | resetFloor | 40 |
  | resetAbove | 25 |

  Il trigger chiede una conferma (due se la zona è lenta o dopo un fallito): spinta di breadth, prezzo sopra una media 20 crescente, divergenza, oppure ritorno al livello di riarmo. È verificato in `ricerca/verifica-trigger/`: nessuna delle regole alternative ha superato i criteri.
- **Avvicinamento**: livello blu più il calo forte (90° percentile) della breadth in 10 sedute. Non è uno stato e non manda alert. Le statistiche nel testo sono «nel campione».
- **Rotazione**: formula «Nuova» (predefinita) e «Medie semplici» a confronto. RS-Ratio e RS-Momentum mantengono questi nomi per scelta dell'utente.
- **Portafoglio di riferimento** (Asset class): 50/30/13/5/2, ribilanciato a fine mese, pesi regolabili nel browser. Trend (DBMFE) ha peso 0.
- **Cap contro equal per settore** (vista 7): indici simulati con i membri di ogni data. L'equal-weight si ribilancia ogni trimestre; il cap-weighted usa le azioni delle holdings IVV. I numeri differiscono da quelli di Rea per metodo (`ricerca/settori-titoli/confronto-rea.md`).
- **Cali forti** (0.9.0):
  - membri con un calo giornaliero di almeno il 5, 7 o 10%, sommati su N sedute (preset di Rea: −7% su 5);
  - allerta oltre il 99° percentile delle sedute precedenti, dopo 3 anni di storia, con almeno 5 cali;
  - solo contesto, conta se l'allerta si ripete: mediana di 31,5 sedute in allerta nei 12 mesi dal primo episodio nel 2007-2009, 12 nel 2020, 5 nell'aprile 2025 (script `ricerca/quant-rea/script/capitolazione_persistenza.mjs`);
  - prova sui 22 indici in `ricerca/quant-rea/risultati/capitolazione/`.

## 5. Decisioni prese con l'utente

| Tema | Decisione |
|---|---|
| Nomi della rotazione | RS-Ratio e RS-Momentum restano: i nomi neutri sono stati provati e tolti (0.8.1) |
| Tema | lo sceglie l'utente; nessun tema automatico |
| Fascia pari | no, nella vista 7 |
| Managed futures | DBMFE.PA, peso 0, non coperto dal cambio, scala automatica |
| Cap contro equal | si tiene il nostro metodo (rendimento reale degli indici) con una nota sulle differenze da Rea |
| Cali forti | addon di contesto con il preset di Rea; il filtro «indice già oltre −20% dal massimo» è solo informativo (colonna «Dal max 52s»), non una regola |
| Telegram per gli indici | rinviato fino alla fine del mese in cui gli indici sono solo registrati |
| Discord | permesso di Massimo Rea (email del 18/10/2026) a condividere tutto nella stanza «Codice della Truppa»; il post con le novità è preparato, lo pubblica l'utente |
| Rendimenti degli episodi | indecisa: calcolarli dalla chiusura della seduta dopo il segnale invece che dal giorno stesso (cambio di regola, da decidere con l'utente) |

## 6. Ricerca svolta (`ricerca/`, ramo di sviluppo)

| Cartella | Contenuto |
|---|---|
| `verifica-trigger/` | due protocolli congelati sulle regole d'ingresso dopo la zona blu: resta il trigger attuale |
| `attenzione/` | fascia di attenzione sopra il livello blu, da cui l'Avvicinamento |
| `indici/` | fonti dei membri, livelli di Rea letti dai suoi grafici, validazione F1 |
| `settori-titoli/` | progetto della vista 7 e confronto con il grafico di Rea |
| `managed-futures/` | quanto pesare il trend following e quale ETF |
| `quant-rea/` | catalogo e verifica delle 34 analisi del fascicolo di un utente, classifica di utilità, prova della capitolazione su 22 indici, preset |
| `qa/` | script Playwright e server per le verifiche nel browser |

## 7. Stato attuale (1.0.0)

- 7 viste, 22 indici, 11 settori, 6 universi di rotazione più gli asset reali.
- Test automatici: `npm test`, 104 test; nel browser `ricerca/qa/browser/v091.cjs` (88 controlli su computer e telefono, tema chiaro e scuro) e `v095.cjs` (64 controlli: pannelli richiudibili, date allineate, linea condivisa, picchi tagliati).
- Audit completo della 0.9.0 (18/10/2026): `ricerca/qa/audit-0.9.0/`. Fatti il passo 1 (0.9.1: numeri, avvertenze, testi), il passo 2 (0.9.2: grafica e telefono) e il passo 3 (0.9.3: robustezza della pipeline). Del passo 2 restano, minori:
  - con CVD la freccia di salita blu accanto alla barra viola del cap-weighted si confonde (cambiato solo il testo);
  - la tabella della rotazione sul telefono nasconde colonne invece di diventare a schede;
  - etichette che si toccano in casi stretti (bolle dei Titoli a 360 px, «RUT/NDX» sulla mappa degli indici del telefono): il posizionamento è migliorato ma non garantito;
  - sul tablet a 820 px Guida/CVD/Chiaro vanno ancora a capo.
- **Passo 3 (0.9.3), fatto**: controllo dei dati fermi su tutti i file e su ogni indice e serie dei cali forti, avviso per il prezzo di un indice mancante, barra in corso senza orario, timeout (richieste 30 s, workflow 45 min), JSON validati prima del commit, Telegram dopo il push con un secondo commit per `alerts.json`, azioni per SHA e credenziali solo nei passi che pubblicano, breadth solo su sedute NYSE, avvisi per ticker esclusi, buchi degli ETF e prezzi USA sospetti, `—` per i valori mancanti, ordinamenti, escape di `e.sector`, cache di `decodeDates` e della soglia nel replay. Restano: la CSP dell'app; il cambio del giorno prima per l'ultima seduta del proxy DBMF (latente).
- **Passo 4**: di nuovo i 5 controlli, poi 1.0.0 se puliti.
- **Decisioni dell'utente del 19/10/2026**: il giorno del segnale fallito conta come nuovo minimo della zona blu (0.9.4; confronto prima/dopo in `ricerca/qa/audit-0.9.0/a1/`); Telegram manda una rettifica quando il ricalcolo sposta o annulla un evento già inviato.
- **Da verificare**: Taiwan, la chiusura di Yahoo non rettificata per i dividendi in azioni sposta forse anche la breadth (medie a 200 sedute); la statistica dell'Avvicinamento conta ogni discesa sotto la soglia, l'app mostra l'anello solo in stato Normale (differenza piccola); scorciatoia «mar 2009» per il minimo del prezzo nella crisi del 2008.
- **Richiesta dell'utente del 19/10/2026 (0.9.5)**: «Episodi in zona blu» richiudibile e chiuso di default (viste 4 e 6, stato in `sm.opened`); grafico dei cali forti sulle sedute e sulla larghezza del grafico principale, linea verticale condivisa tra i grafici della vista; scala dei cali forti tagliata a 1,3 volte la soglia più alta del periodo, con il valore dei picchi scritto (scelta dell'utente).
- **Decisioni dell'utente del 19/10/2026 (sera)**: link a TradingView per tutti gli indici (0.9.6; da far verificare all'utente con un clic, soprattutto INDEX:FTSEMIB, INDEX:R2TH, TSX:TX60); `CAC` nella barra apre l'indice (0.9.7); le righe delle sedute sotto il livello fuori dalla zona blu restano anche quando sono di un solo giorno (la prima chiusura sotto il livello).
- **1.0.0 (20/10/2026)**: pubblicata su richiesta dell'utente subito dopo la 0.9.10. ASX 200: si tiene la lista di Wikipedia con l'avvertenza (decisione dell'utente). Da qui le versioni seguono semver.
- **Ricalcolo della breadth degli indici (20/10/2026)**: dopo la correzione delle sospensioni (CTD.AX) si è ricalcolata la storia recente con il workflow a mano (`recompute`). Un primo tentativo con 50 sedute ha abbassato le sedute di inizio agosto di alcuni indici (con un anno di prezzi la media a 200 sedute non c'era): file ripristinati subito, limite portato a 40 e controllo `short` in `countDay`; il secondo ricalcolo (40 sedute) cambia solo poco (ASX 200 di mezzo punto dal 03/09, altri indici al massimo un punto, cioè un titolo).
- **0.9.10**: corretto quanto trovato dall'audit della 0.9.8 tranne i punti aperti qui sotto. Restano aperti, minori: intervalli dei risultati storici degli indici (dal 2001 contro dal 2005, testi m6); etichette che si toccano sulle mappe al telefono, zoom automatico sulle crisi al telefono, freccia blu e barra viola in CVD, barre sfalsate nelle schede, testata del tablet su due righe (grafica m3, m4, m5, m7, m10); portafoglio a pesi tutti zero che torna all'esempio senza messaggio (funz F8); soglia del 75% per la breadth degli indici, detta nella guida (codice M2 della 0.9.0); Content-Security-Policy; dati minori (breadth EEM durante le feste asiatiche, YTD di Madrid, sedute di Milano tolte, CSI 300 fermo quando Yahoo ha la barra dell'ETF vuota, asta di Madrid per LYXIB). **Da decidere**: la lista dell'ASX 200 da Wikipedia è in ritardo sui ribilanciamenti (CTD uscita a dicembre 2025, cambi di settembre 2026 mancanti): cercare un'altra fonte o tenerla con l'avvertenza.
- **Passo 4, audit della 0.9.8 (20/10/2026)**: `ricerca/qa/audit-0.9.8/`, nessun bloccante per la 1.0; pipeline corretta nella 0.9.9, il resto nella 0.9.10. Decisioni dell'utente: (1) via i valori di Rea letti dagli screenshot (nota della vista 7 e script `confronto_rea.mjs`); (2) un salto che arriva dopo una sospensione lunga (sedute ferme a volume 0) è un crollo vero e non si riscala, da verificare con una seconda fonte (CTD.AX); (3) tabelle sul telefono con la prima colonna fissa.
- Decisioni dell'utente del 18/10/2026: la scala Adatta/Massima della rotazione resta salvata nel browser.

## 8. Prossimi passi proposti (in ordine)

| Sigla | Proposta | Note |
|---|---|---|
| A | due righe negli episodi: «dal minimo vero» e «nuovo minimo entro 3 mesi dal trigger» | piccolo |
| B | scheda «Il calo in corso»: episodi de-duplicati, «da −X% a −Y%» con *n*, sedute al minimo e al recupero | serve `data/history_long.json` con le chiusure lunghe degli indici, caricato solo all'apertura |
| D | fasce toro/orso sui grafici degli indici, regola del 20% sulle chiusure | riusa B |
| C | VIX per episodi nella vista Alert | `data/vix.json` dal 1990 |
| — | Telegram per gli indici | dopo il mese di prova |
| — | Taiwan nei cali forti | richiede la chiusura rettificata dei membri |

Altri punti:
- Vista 7: titoli usciti senza le azioni (q), effetto di circa 0,1 punti, e ritardo del CSV rispetto alle uscite segnalate su Wikipedia.
- Da non fare, per la ricerca su quant-rea: anni analoghi, entropia, «ergodicità», Poisson, GARCH, serie di giorni consecutivi, soglie «dinamiche».

## 9. Procedure

- **Pubblicare**: vedi `CLAUDE.md`. Si copiano su `main` solo i file dell'app, mai `ricerca/`; i dati su `main` li aggiorna la Action. Prima di copiare si fa il merge di `origin/main` nel ramo di sviluppo e non si copia mai `data/`: il 20/10/2026 la pubblicazione della 0.9.9 ha ricopiato su `main` sei file di dati più vecchi (ripristinati subito con un commit).
- **Verifiche nel browser**: `node ricerca/qa/server/gzserve.mjs <cartella> <porta>`, poi gli script in `ricerca/qa/browser/` con Playwright (Chromium in `/opt/pw-browsers`).
- **Ricostruire i cali forti**:
  1. `python3 scripts/backfill_indices.py prices --cache DIR`
  2. `python3 scripts/backfill_capitulation.py --jb DIR --repo DIR --cache DIR`
- **Controllare un numero**: ricalcolarlo con uno script indipendente (non con il modulo dell'app) e confrontarlo con una seconda fonte quando esiste (FRED, ETF equal-weight, serie pubbliche).
