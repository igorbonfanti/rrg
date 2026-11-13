# Sviluppo di Sector Monitor: stato, decisioni e prossimi passi

Documento di passaggio per riprendere lo sviluppo senza perdere il filo. Aggiornato al 12/11/2026, versione 1.10.0.
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
  | `js/vix.js` | vista 8: episodi del VIX, rendimenti dopo i picchi, scatter, realizzata e premio per la paura, struttura a termine (VIX/VIX3M) e credito (HYG/IEF) |
  | `js/emerging.js` | vista 7 (Emergenti): pulizia dei cambi, z e F della valuta, D del dollaro, forza relativa contro ACWI |

- **Viste e grafici**:

  | File | Cosa disegna |
  |---|---|
  | `js/app.js` | avvio, comandi, viste, versione |
  | `js/bottom.js` | Monitor, Bottom Map, Settore, Alert |
  | `js/indices.js` | vista 6 |
  | `js/titles.js` | vista 5 |
  | `js/vix-view.js` | vista 8 VIX |
  | `js/emerging-view.js` | vista 7 Emergenti (stato degli indici preso dalla vista 6 con `snapshot`) |
  | `js/cap-view.js`, `js/cap-chart.js` | scheda Cali forti |
  | `js/rrg-chart.js`, `js/perf-chart.js`, `js/sector-chart.js`, `js/bottom-map.js` | grafici SVG |
  | `js/format.js` | numeri all'italiana, tooltip, checklist |

- **Avvio in due tempi**:
  - prima i file del Monitor (`prices`, `sectors`, `breadth`, `thresholds`, `breadth_latest`, `alerts`, `config/indices`);
  - dopo il primo disegno `prices_global` e `prices_macro`;
  - alla prima apertura della vista: `indices`, poi `indices_more`, `sector_members`, `capitulation`;
  - alla prima apertura della vista 7: `emerging` e i due file degli indici (`ensureAll`).
  - I file caricati dopo usano `cache: 'no-cache'`.
- **Versione**: `js/version.js` e `version.json` devono coincidere. Se il browser usa file vecchi l'app lo dice e il pulsante «Nuova versione» riscarica tutto.

## 3. Dati e aggiornamento notturno

Workflow `.github/workflows/update-data.yml`, alle 22:40 UTC, ogni ora dalle 01:10 alle 06:10 UTC (si ferma se la seduta USA c'è già: `scripts/need_update.js`) e alle 11:40 UTC. Nelle due settimane fino al 20/10/2026 GitHub ha fatto partire la corsa delle 22:40 tra 2 h 04 e 4 h 30 dopo, quella delle 03:20 (tolta) tra 4 h 34 e 7 h 25 dopo; la prima corsa ha trovato la seduta USA completa su Yahoo in 4 notti su 9 (dai commit `chore: dati al …` di `main`).

| Passo | Script | Scrive |
|---|---|---|
| Prezzi | `scripts/fetch_data.js` | `data/prices.json` (USA), `prices_global.json` (UCITS in euro), `prices_macro.json` (asset reali, CPI da FRED) |
| Breadth settori | `scripts/fetch_breadth.js` | `breadth.json`, `breadth_latest.json`, `sectors.json`, `sp500_members.json`, `sp500_history.json`, `sector_members.json`, `capitulation.json` (SPX e settori) |
| Indici | `scripts/fetch_indices.js` | `indices.json`, `indices_more.json`, `index_members/*.json`, `capitulation.json` (indici) |
| VIX | `scripts/fetch_vix.js` | `vix.json` (VIX dal 1990 e VIX3M dal 2007 da FRED con l'ultima seduta dal file di Cboe, Yahoo di riserva; S&P 500 e Nasdaq-100 dal 1990; HYG/IEF rettificati dal 2007; VIX3M e HYG/IEF facoltativi); passo che può fallire senza fermare gli altri, 8 minuti |
| Emergenti | `scripts/fetch_emerging.js` | `emerging.json` (cambi della Fed da FRED con gli ultimi giorni da Yahoo, ETF da Yahoo, `DTWEXEMEGS` da FRED); passo che può fallire senza fermare gli altri |
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
- FRED per il CPI e per il dollaro contro le valute emergenti (`DTWEXEMEGS`, settimanale);
- FRED H.10 per i cambi della vista 7 (valuta locale per un dollaro, mezzogiorno di New York), Yahoo per gli ultimi giorni non ancora pubblicati dalla Fed (provvisori).

**Approssimazioni dichiarate** (devono restare scritte nell'app):
- **Composizione**: storia con i membri di oggi per gli indici senza composizione storica gratuita.
- **Copertura**: inferiore al 100% dove Yahoo non ha i prezzi di un titolo uscito dall'indice.
- **DBMFE**: prima del 28/04/2025 è il DBMF americano convertito in euro.
- **Prezzi mancanti**: ultimo prezzo noto nei giorni di festa di una borsa; bitcoin preso alle sedute di Milano.
- **CPI**: a gradini, dal giorno di pubblicazione.
- **Drawdown**: con i dividendi oppure sul solo prezzo.
- **Cali forti**: esclusi gli errori di stampa; Taiwan escluso (`noCap`).
- **Emergenti**: indice in dollari = chiusura locale / cambio della Fed dello stesso giorno (mezzogiorno di New York: orari diversi dalla chiusura della borsa); ultimi giorni con il cambio provvisorio di Yahoo, con gli errori di stampa isolati tolti (`cleanFx`); «3 mesi in $» con l'asterisco quando il cambio di oggi non c'è ancora.

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
- **Cap contro equal per settore** (vista 5): indici simulati con i membri di ogni data. L'equal-weight si ribilancia ogni trimestre; il cap-weighted usa le azioni delle holdings IVV. I numeri differiscono da quelli di Rea per metodo (`ricerca/settori-titoli/confronto-rea.md`).
- **Cali forti** (0.9.0):
  - membri con un calo giornaliero di almeno il 5, 7 o 10%, sommati su N sedute (preset di Rea: −7% su 5);
  - allerta oltre il 99° percentile delle sedute precedenti, dopo 3 anni di storia, con almeno 5 cali;
  - solo contesto, conta se l'allerta si ripete: mediana di 31,5 sedute in allerta nei 12 mesi dal primo episodio nel 2007-2009, 12 nel 2020, 5 nell'aprile 2025 (script `ricerca/quant-rea/script/capitolazione_persistenza.mjs`);
  - prova sui 22 indici in `ricerca/quant-rea/risultati/capitolazione/`.

- **Emergenti** (1.4.0, solo contesto): definizioni di F (valuta che ha smesso di scendere), «in calo forte» e D (dollaro emergente favorevole) in testa a `js/emerging.js`, identiche a `ricerca/emergenti/backtest/script/backtest.mjs` (porting verificato: `ricerca/emergenti/verifica_porting.mjs`, 0 differenze su 33.632 valori di F (cambi della Fed) e 5.222 di D). Forza relativa: ETF in dollari contro ACWI con la formula «Nuova».

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
| Vista Emergenti (05/11/2026, allora la 8, oggi la 7) | solo contesto: nessuna regola e nessun alert; i quattro elementi (stato, valuta, dollaro, forza relativa) tutti mostrati; scia della forza relativa solo per l'indice scelto; fasce «favorevole» sul grafico del dollaro |
| Struttura a termine e credito nella vista 8 (09/11/2026) | solo contesto (il backtest non trova statistiche robuste); VIX/VIX3M al posto di VX1/VX2 (stessa lettura nel 91% delle sedute, niente salti di scadenza); soglia 1 per la backwardation; credito da HYG/IEF (HY OAS di ICE non ripubblicabile, BAA10Y con nota restrittiva di Moody's) come distanza dal massimo di 12 mesi; ultima seduta del VIX e del VIX3M dal file ufficiale di Cboe, Yahoo di riserva. Idea di Stefano Serafini (Morning Trading Show di BNP Paribas), senza data né link della puntata |
| Vista 8 VIX (06/11/2026) | solo contesto; tabella dei regimi per episodi con tutte le soglie e solo il 40 segnato «robusto»; scatter in stile Rea con la didascalia giorni contro episodi; VIX contro realizzata con il premio; niente GARCH (riammesso solo per la verifica, scartato); rendimenti dalla chiusura della seduta dopo il segnale; Alert alla 9 |
| Distanza dal massimo (12/11/2026) | pannello di solo contesto nella vista 8 come il prototipo; riferimento il massimo di chiusura degli ultimi 3 anni (il picco dell'ultimo ciclo), il massimo di sempre nel dettaglio; grafico del prezzo al clic; GLD e SLV per oro e argento, future continuo per rame e petrolio (niente USO); idea citata a Francesco Caruso (Cicli&Mercati) |
| Oro e argento nel pannello dei massimi (13/11/2026) | future GC=F e SI=F invece di GLD e SLV (1.10.1), con le note su regolamento delle 13:30 e cambi di contratto |
| POC e profilo dei volumi (13/11/2026) | niente linea del POC (non robusto in 7 mercati su 9, `ricerca/poc/`); l'utente vuole il profilo dei volumi a lato del grafico: verifica in corso in `ricerca/poc/profilo/` |
| Spread HY a 350 pb e petrolio come innesco (12/11/2026) | verificati e lasciati fuori (`ricerca/credito-soglia/`, `ricerca/petrolio/`): solo un paragrafo nella guida |
| Oscillatori mensili di Francesco Caruso (12/11/2026) | non si fa la pagina: il segnale «Composite Momentum e secondo oscillatore girano al ribasso da zona alta» sull'S&P 500 mensile non anticipa i cali più di un mese qualunque (solo CMO: 9 segnali su 30 seguiti da un calo ≥10% in 12 mesi, contro 125 mesi su 397 di base; 162 varianti con Coppock, KST e MACD/PPO, nessuna supera i criteri decisi prima). Il CMO si può usare con il permesso di Caruso (riferito dall'utente, 12/11/2026); il C-Wave non è pubblico. Ricerca in `ricerca/oscillatori/` |
| Rendimenti degli episodi | indecisa: calcolarli dalla chiusura della seduta dopo il segnale invece che dal giorno stesso (cambio di regola, da decidere con l'utente) |

## 6. Ricerca svolta (`ricerca/`, ramo di sviluppo)

| Cartella | Contenuto |
|---|---|
| `verifica-trigger/` | due protocolli congelati sulle regole d'ingresso dopo la zona blu: resta il trigger attuale |
| `attenzione/` | fascia di attenzione sopra il livello blu, da cui l'Avvicinamento |
| `indici/` | fonti dei membri, livelli di Rea letti dai suoi grafici, validazione F1 |
| `settori-titoli/` | progetto della vista 5 e confronto con il grafico di Rea |
| `managed-futures/` | quanto pesare il trend following e quale ETF |
| `quant-rea/` | catalogo e verifica delle 34 analisi del fascicolo di un utente, classifica di utilità, prova della capitolazione su 22 indici, preset |
| `avvicinamento-uso/` | uso pratico dell'avvicinamento: promemoria, non segnale |
| `indici-breadth50/` | breadth a 50 sedute per gli alert degli indici: nessun pattern regge |
| `vix/` | regimi del VIX, implicita contro realizzata contro GARCH, dati e inserimento della vista 8 (`sintesi.md`); `struttura/` dati, backtest e piano della struttura a termine e del credito (1.6.0) |
| `emergenti/` | backtest dei cambi e del dollaro emergente, demo, piano di inserimento e sintesi della vista 7 |
| `oscillatori/` | Composite Momentum (Caruso) e C-Wave: identificazione, dati, backtest e ricalcolo indipendente in Python; verdetto: scartato come allarme |
| `bolle-rotazione/` | distanza dal massimo (degli ultimi 3 anni dalla scelta dell'utente; prima il massimo di sempre): serie, seconde fonti, confronto con la slide di Caruso, prototipo e piano (1.10.0) |
| `credito-soglia/` | spread high yield a 350 pb e soglie su HYG/IEF: resta contesto |
| `petrolio/` | petrolio come innesco dei cali dell'S&P 500 dal 1950: solo contesto (legame con le recessioni) |
| `qa/` | script Playwright e server per le verifiche nel browser |

## 7. Stato attuale (1.10.0)

- 9 viste, 22 indici, 11 settori, 6 universi di rotazione più gli asset reali.
- Test automatici: `npm test`, 144 test; nel browser `ricerca/qa/browser/v091.cjs` (88 controlli su computer e telefono, tema chiaro e scuro), `v095.cjs` (64 controlli: pannelli richiudibili, date allineate, linea condivisa, picchi tagliati), `v130.cjs` (avvicinamento sul grafico) `v140.cjs` e `v140fix.cjs` (vista Emergenti), `v150.cjs` (vista VIX), `v160.cjs` (struttura a termine e credito), `v161.cjs` (scatter per crisi), `v162.cjs` (punti grandi e tabella), `v170.cjs` (mini-grafici e pannello dell'indice).
- Audit completo della 0.9.0 (18/10/2026): `ricerca/qa/audit-0.9.0/`. Fatti il passo 1 (0.9.1: numeri, avvertenze, testi), il passo 2 (0.9.2: grafica e telefono) e il passo 3 (0.9.3: robustezza della pipeline). Del passo 2 restano, minori:
  - con CVD la freccia di salita blu accanto alla barra viola del cap-weighted si confonde (cambiato solo il testo);
  - la tabella della rotazione sul telefono nasconde colonne invece di diventare a schede;
  - etichette che si toccano in casi stretti (bolle dei Titoli a 360 px, «RUT/NDX» sulla mappa degli indici del telefono): il posizionamento è migliorato ma non garantito;
  - sul tablet a 820 px Guida/CVD/Chiaro vanno ancora a capo.
- **Passo 3 (0.9.3), fatto**: controllo dei dati fermi su tutti i file e su ogni indice e serie dei cali forti, avviso per il prezzo di un indice mancante, barra in corso senza orario, timeout (richieste 30 s, workflow 45 min), JSON validati prima del commit, Telegram dopo il push con un secondo commit per `alerts.json`, azioni per SHA e credenziali solo nei passi che pubblicano, breadth solo su sedute NYSE, avvisi per ticker esclusi, buchi degli ETF e prezzi USA sospetti, `—` per i valori mancanti, ordinamenti, escape di `e.sector`, cache di `decodeDates` e della soglia nel replay. Restano: la CSP dell'app; il cambio del giorno prima per l'ultima seduta del proxy DBMF (latente).
- **Decisioni dell'utente del 19/10/2026**: il giorno del segnale fallito conta come nuovo minimo della zona blu (0.9.4; confronto prima/dopo in `ricerca/qa/audit-0.9.0/a1/`); Telegram manda una rettifica quando il ricalcolo sposta o annulla un evento già inviato.
- **Da verificare**: Taiwan, la chiusura di Yahoo non rettificata per i dividendi in azioni sposta forse anche la breadth (medie a 200 sedute); la statistica dell'Avvicinamento conta ogni discesa sotto la soglia, l'app mostra l'anello solo in stato Normale: rifatta il 31/10/2026 (`ricerca/attenzione/fasce.md`, ultime sezioni): testi corretti nella 1.3.1 e di nuovo nella 1.3.3, contando solo il periodo che l'app mostra (settori 33 tocchi su 63 da solo, 50 con l'Attenzione; indici 83 e 89 su 132; l'avvicinamento aggiunge 7 tocchi con poco preavviso e anticipa il primo avviso solo in 17 tocchi su 43, di 7 sedute in mediana); uso pratico in `ricerca/avvicinamento-uso/sintesi.md`; scorciatoia «mar 2009» per il minimo del prezzo nella crisi del 2008.
- **Richiesta dell'utente del 19/10/2026 (0.9.5)**: «Episodi in zona blu» richiudibile e chiuso di default (viste 4 e 6, stato in `sm.opened`); grafico dei cali forti sulle sedute e sulla larghezza del grafico principale, linea verticale condivisa tra i grafici della vista; scala dei cali forti tagliata a 1,3 volte la soglia più alta del periodo, con il valore dei picchi scritto (scelta dell'utente).
- **Decisioni dell'utente del 19/10/2026 (sera)**: link a TradingView per tutti gli indici (0.9.6; da far verificare all'utente con un clic, soprattutto INDEX:FTSEMIB, INDEX:R2TH, TSX:TX60); `CAC` nella barra apre l'indice (0.9.7); le righe delle sedute sotto il livello fuori dalla zona blu restano anche quando sono di un solo giorno (la prima chiusura sotto il livello).
- **1.0.0 (20/10/2026)**: pubblicata su richiesta dell'utente subito dopo la 0.9.10. ASX 200: si tiene la lista di Wikipedia con l'avvertenza (decisione dell'utente). Da qui le versioni seguono semver.
- **Ricalcolo della breadth degli indici (20/10/2026)**: dopo la correzione delle sospensioni (CTD.AX) si è ricalcolata la storia recente con il workflow a mano (`recompute`). Un primo tentativo con 50 sedute ha abbassato le sedute di inizio agosto di alcuni indici (con un anno di prezzi la media a 200 sedute non c'era): file ripristinati subito, limite portato a 40 e controllo `short` in `countDay`; il secondo ricalcolo (40 sedute) cambia solo poco (ASX 200 di mezzo punto dal 03/09, altri indici al massimo un punto, cioè un titolo).
- **0.9.10**: corretto quanto trovato dall'audit della 0.9.8 tranne i punti aperti qui sotto. Restano aperti, minori: intervalli dei risultati storici degli indici (dal 2001 contro dal 2005, testi m6); etichette che si toccano sulle mappe al telefono, zoom automatico sulle crisi al telefono, freccia blu e barra viola in CVD, barre sfalsate nelle schede, testata del tablet su due righe (grafica m3, m4, m5, m7, m10); portafoglio a pesi tutti zero che torna all'esempio senza messaggio (funz F8); soglia del 75% per la breadth degli indici, detta nella guida (codice M2 della 0.9.0); Content-Security-Policy; dati minori (breadth EEM durante le feste asiatiche, YTD di Madrid, sedute di Milano tolte, CSI 300 fermo quando Yahoo ha la barra dell'ETF vuota, asta di Madrid per LYXIB). **Da decidere**: la lista dell'ASX 200 da Wikipedia è in ritardo sui ribilanciamenti (CTD uscita a dicembre 2025, cambi di settembre 2026 mancanti): cercare un'altra fonte o tenerla con l'avvertenza.
- **Passo 4, audit della 0.9.8 (20/10/2026)**: `ricerca/qa/audit-0.9.8/`, nessun bloccante per la 1.0; pipeline corretta nella 0.9.9, il resto nella 0.9.10. Decisioni dell'utente: (1) via i valori di Rea letti dagli screenshot (nota della vista 7 e script `confronto_rea.mjs`); (2) un salto che arriva dopo una sospensione lunga (sedute ferme a volume 0) è un crollo vero e non si riscala, da verificare con una seconda fonte (CTD.AX); (3) tabelle sul telefono con la prima colonna fissa.
- **1.1.0–1.3.0 (31/10/2026)**: livello di osservazione: si tiene il nostro (livello blu + 10 punti, non il 20% di Rea), ma nel grafico della breadth dei settori la fascia è gialla (1.1.0). La linea tratteggiata della soglia di avvicinamento di oggi (1.2.0) non è piaciuta all'utente ed è stata tolta: dalla 1.3.0 la linea della breadth è gialla nelle sedute in avvicinamento, con un pallino all'ingresso, con la soglia di ogni seduta calcolata sulla sola storia fino a lì (`approachSeries`, test di uguaglianza con `approachLevel`; controllo nel browser `ricerca/qa/browser/v130.cjs`).
- **1.3.1–1.3.4 (31/10/2026)**: statistiche dell'avvicinamento rifatte sulla regola e sul periodo che l'app mostra, metodo d'uso nella guida (1.3.3, tre controlli indipendenti); pallino sul bordo del periodo (1.3.2); bias dei membri di oggi +3,6 con le regole dell'app (1.3.4). Ricerche concluse senza modifiche all'app: uso pratico dell'avvicinamento (promemoria, non segnale: `ricerca/avvicinamento-uso/sintesi.md`), nota e regola sulla «risalita dopo l'Attenzione» (scartate: `risalita.md`), pattern della breadth a 50 sedute sugli indici (nessuno regge: `ricerca/indici-breadth50/sintesi.md`). Decisione dell'utente del 02/11/2026: si tiene così e si osservano i prossimi giorni. Aperti, minori: la scheda di un settore in avvicinamento in risalita dice ancora «in un calo deciso il livello blu è a circa due settimane»; EEM nelle feste cinesi (68 sedute con la breadth falsata).
- **1.3.5 (05/11/2026)**: le date delle barre di Yahoo usano il fuso della borsa con l'ora legale di quel giorno (`barDate` in `scripts/lib/yahoo.js`); dall'arrivo dell'ora solare erano sbagliati il dollaro (DXY_INV) e la storia di DBMFE.PA prima del 28/04/2025. Controlli in `ricerca/qa/1.3.5/`.
- **1.4.0 (05/11/2026)**: vista 8 Emergenti, solo contesto, dal piano `ricerca/emergenti/inserimento.md`. Il file `data/emerging.json` lo crea la Action: finché non c'è, la vista dice che i dati non sono disponibili. Controllo nel browser `ricerca/qa/browser/v140.cjs`.
- **1.4.1 (05/11/2026)**: schede riordinate su richiesta dell'utente: 1 Monitor, 2 Rotazione, 3 Bottom Map, 4 Settore, 5 Titoli, 6 Indici, 7 Emergenti, 8 Alert (`VIEWS` in `js/app.js`); indirizzi e comandi invariati. Le note storiche usano i numeri di allora (Titoli era la 7, Alert la 5, Emergenti la 8).
- **1.5.0 (06/11/2026)**: vista 8 VIX (Alert alla 9), dalla verifica in `ricerca/vix/` (idea di Massimo Rea). Il file `data/vix.json` lo crea la Action: finché non c'è, la vista dice che i dati non sono disponibili. Test: `test/vix.test.js` (valori verificati con lo script di ricerca), controllo nel browser `ricerca/qa/browser/v150.cjs`.
- **1.10.2 (13/11/2026)**: falso allarme della corsa delle 18:42 UTC (KOSPI con una seduta in meno da Yahoo): ora solo un avviso. Controllato con una simulazione (riga pubblicata più recente, esito 0 e avviso) e `npm test`, senza agente indipendente.
- **1.10.1 (13/11/2026)**: oro e argento con i future nel pannello dei massimi (scelta dell'utente), verifica in `ricerca/poc/sintesi.md` parte A.
- **1.10.0 (12/11/2026)**: nella vista 8 il pannello «Distanza dal massimo degli ultimi 3 anni» (richiesta dell'utente, idea da una slide di Francesco Caruso), solo contesto; scelte dell'utente: come il prototipo (`ricerca/bolle-rotazione/prototipo/`), nella vista VIX, massimo di chiusura, oro e argento con GLD e SLV, rame e petrolio con il future continuo; poi (stesso giorno) riferimento il massimo degli ultimi 3 anni invece di quello di sempre («il massimo dell'ultima bull run», confronto in `ricerca/bolle-rotazione/riferimento/`) e grafico del prezzo al clic sulla riga; credito a 350 pb e petrolio solo come paragrafo nella guida. Dati `data/ath.json` e `data/ath_history.json` (`scripts/fetch_ath.js`, nuovo passo della Action): finché la Action non li crea su main il pannello dice che i dati non ci sono. Test `test/ath.test.js` (fixture reale con i valori dello script di ricerca), controllo nel browser `ricerca/qa/browser/v1100.cjs`. Controlli indipendenti in `ricerca/qa/1.10.0/` (numeri, uso, testi e codice, ricontrollo: GO dopo le correzioni). Minori aperti: un solo Esc toglie sia lo zoom del grafico del pannello sia quello del grafico grande del VIX; le righe della tabella hanno `role="button"` e i comandi del grafico si raggiungono con il Tab solo dopo le righe successive; senza `data/vix.json` sparisce anche il pannello dei massimi (sta dentro la vista); nello zoom stretto l'asse dei prezzi usa 5 livelli non tondi; nel grafico grande del VIX lo zoom stretto lascia ancora una sola tacca sul prezzo (c'era già); un `ath.json` con `markets` vuoto non sarebbe segnalato (lo script non lo scrive mai).
- **1.9.0 (11/11/2026)**: SOXX (semiconduttori) come industria accanto agli 11 settori nelle viste 1-5, alert Telegram attivi, livello blu 3% di Rea, storia dal 2001 con i membri di oggi (scelte dell'utente); nella vista 5 il cap-weighted del SOXX è il rendimento dell'ETF (scelta dell'utente). Dati `data/industries.json`, `data/industry_members.json`, serie SOXX in `capitulation.json`; dopo un `backfill_capitulation.py` va rieseguito `node scripts/backfill_industries.js --force` (il primo cancella la serie SOXX). Guida: confronto RRG con Bloomberg (`ricerca/rrg-bloomberg/`). Controlli: `v190.cjs`, `ricerca/qa/v190-numeri.md`, `v190-codice.md`, `v190-uso.md`. Minori aperti: alla prima registrazione negli alert gli eventi delle ultime 6 sedute del SOXX potrebbero partire la sera dopo (non con i dati di oggi); un solo membro senza chiusura ferma `industry_members.json` per quella sera; con una lista cambiata solo le ultime 5 sedute usano i membri nuovi; gli alert del SOXX partono solo se è riuscita la breadth dei settori; SPY nel confronto degli episodi del SOXX parte dal 2004 (6 trigger su 7). Dal controllo di usabilità: il piè di pagina della vista 4 parla di costituenti S&P 500 e della tabella «200 LEVEL SETTORI» anche per il SOXX; nella guida «dal 2005» per il periodo MAX e gli episodi (il SOXX parte dal 2002) e la guida rapida dal SOXX porta a #sec; nomi iShares in maiuscolo nella bubble; con un file con prezzi tutti nulli la vista 4 mostra «null»; a 1440 la freccia del collegamento a XLK va a capo; nei Cali forti l'ultimo picco tagliato non ha l'etichetta ▲. Il SOXX entra nella rotazione dalla prima corsa notturna dopo la pubblicazione (`prices.json`).
- **1.8.0 (10/11/2026)**: zoom su un tratto (richiesta dell'utente) con il modulo comune `js/zoom.js` in Performance relativa, Settore e Indici con i Cali forti (zoom condiviso), Emergenti e VIX; scelte dell'utente: base 100 dall'inizio del tratto, zoom tenuto cambiando settore/indice/paese, lente sul telefono, «Storia della divergenza» dei Titoli fuori, valori a destra della fine del tratto in un riquadro vuoto con la data. Piano in `ricerca/zoom/inserimento.md`; controlli `v180.cjs`, `ricerca/qa/v180-uso.md`, `ricerca/qa/v180-numeri.md`. Minori aperti: con la lente accesa sul telefono il grafico non fa scrollare con gesti obliqui; nessuna selezione da tastiera (ci sono i pulsanti del periodo); eventuale barra di navigazione sotto il grafico (rangeslider) da valutare.
- **1.7.0 (09/11/2026)**: tabella degli episodi con il mini-grafico del VIX (63 sedute prima del primo giorno, 21 dopo l'ultimo), «VIX massimo» con la data, ultimo giorno alla soglia o più (asterisco e «provv.» se in corso) e sedute; sul telefono riassunto sotto il nome della crisi; pannello del prezzo dell'indice scelto con le fasce degli episodi. Controllo nel browser `v170.cjs`. Minori aperti (`ricerca/qa/1.7.0/ricontrollo/rapporto.md`): nelle righe grigie i tratti alla soglia si distinguono solo per lo spessore; la guida non spiega il grigio delle fasce; «provv.» non compare accanto alla data del massimo se cadesse nella seduta provvisoria; a 820 px la tabella scorre nel suo riquadro.
- **1.6.2 (09/11/2026)**: punti grandi dello scatter allineati alla soglia della tabella (segnalazione dell'utente), colonne «Primo giorno a X o più», «VIX quel giorno», «VIX massimo dell'episodio» con la data, testi su quanto dura un episodio e sulle crisi come etichette di periodo. Ricalcolo indipendente degli episodi: `ricerca/vix/scatter/verifica_episodi.py`; controllo `v162.cjs`.
- **1.6.1 (09/11/2026)**: scatter della vista 8 a tutta larghezza, un colore per crisi (ogni seduta con la crisi della sua data, altrimenti del suo episodio; tavolozza di `ricerca/vix/scatter/tavolozza.py`), elenco delle crisi cliccabile, alone e righe della tabella degli episodi collegate (richiesta dell'utente). Controllo nel browser `ricerca/qa/browser/v161.cjs`. Minori aperti: con il daltonismo simulato restano coppie di crisi poco distinguibili (15 colori non bastano: la selezione con l'alone fa la distinzione); al 17° gruppo i colori si ripeterebbero; Esc che chiude la guida toglie anche la selezione; sul telefono l'elenco delle crisi è lungo.
- **1.6.0 (09/11/2026)**: nella vista 8 struttura a termine (VIX/VIX3M) e credito (HYG/IEF), due riquadri e due pannelli, dalla verifica in `ricerca/vix/struttura/`. Finché la Action non scrive le serie nuove i due riquadri dicono «dato non disponibile». Test: `test/vix_struttura.test.js`, controllo nel browser `ricerca/qa/browser/v160.cjs` (fallisce sulla 1.5.0).
- Punto aperto per l'utente (segnalato il 09/11/2026): i termini d'uso di FRED vietano di archiviare i loro dati in una raccolta, mentre permettono di mostrare con la citazione le serie «Citation required»; riguarda già VIX, cambi H.10 e CPI pubblicati in `data/`. Decisione sua se approfondire.
- Altri punti aperti per l'utente (09/11/2026): le condizioni d'uso dei file `*_History.csv` di Cboe (ultima seduta del VIX e del VIX3M) non sono state lette; nella cronologia del ramo di sviluppo (commit già su GitHub) restano un centinaio di livelli di HY OAS (ICE) e degli spread di Moody's, tolti dai file con `ricerca/vix/struttura/ripulisci.mjs`: riscrivere la cronologia solo se l'utente lo chiede.
- 1.6.0, rilievi minori aperti (`ricerca/qa/1.6.0/`): la logica che sceglie le fonti (`volSeries`) è provata solo con gli scenari simulati di `ricerca/qa/1.6.0/codice2/`, non in `npm test`; un simbolo di Yahoo che risponde senza dati ferma ancora gli altri; le fasce di backwardation di una seduta sono larghe 1 px; sul telefono il riquadro dei valori copre buona parte del grafico; le etichette negative del premio usano il trattino, quelle del credito il segno meno; il riquadro del credito non ha una parola (calmo/tensione) perché sarebbe una regola nuova da decidere con l'utente.
- 1.5.0, rilievi minori aperti (`ricerca/qa/1.5.0/`): tabella dei regimi più larga dello schermo sul telefono (si scorre dentro la tabella); righe della tabella senza ruolo per i lettori di schermo (come nel Monitor); spiegazioni solo nei `title` (al tocco si vedono su riquadri e pillole); la riga della soglia di oggi non è evidenziata all'apertura; prima corsa con ^GSPC accorciato scriverebbe una storia corta (si ripara alla corsa dopo). Sul Nasdaq-100 la soglia 30 supera il criterio in 5 varianti su 6 (scelta: «robusto» solo con 6 su 6).
- Rilievi minori aperti della 1.3.5 (`ricerca/qa/1.3.5/codice/rapporto-codice.md`): la cache delle date di `barDate` non si svuota mai (nel caso reale 85.574 istanti diversi su 1,3 milioni, nessun problema); `scripts/backfill_indices.py` e i vecchi controlli in `ricerca/qa/audit-0.9.*` datano ancora con il `gmtoffset` (giusto per i titoli, sbagliato d'inverno per cambi e DX-Y.NYB).
- Decisioni dell'utente del 18/10/2026: la scala Adatta/Massima della rotazione resta salvata nel browser.

## 8. Prossimi passi proposti (in ordine)

| Sigla | Proposta | Note |
|---|---|---|
| A | due righe negli episodi: «dal minimo vero» e «nuovo minimo entro 3 mesi dal trigger» | piccolo |
| B | scheda «Il calo in corso»: episodi de-duplicati, «da −X% a −Y%» con *n*, sedute al minimo e al recupero | serve `data/history_long.json` con le chiusure lunghe degli indici, caricato solo all'apertura |
| D | fasce toro/orso sui grafici degli indici, regola del 20% sulle chiusure | riusa B |
| C | colonna «VIX» negli episodi delle viste Indici (S&P 500, Nasdaq-100) e Settore | `data/vix.json` c'è dalla 1.5.0 |
| — | Telegram per gli indici | dopo il mese di prova |
| — | Taiwan nei cali forti | richiede la chiusura rettificata dei membri |

Altri punti:
- Vista 7: titoli usciti senza le azioni (q), effetto di circa 0,1 punti, e ritardo del CSV rispetto alle uscite segnalate su Wikipedia.
- Da non fare, per la ricerca su quant-rea: anni analoghi, entropia, «ergodicità», Poisson, GARCH, serie di giorni consecutivi, soglie «dinamiche». Il GARCH è stato riammesso una volta per la verifica del VIX (06/11/2026) e scartato: `ricerca/vix/volatilita/volatilita.md`.

## 9. Procedure

- **Pubblicare**: vedi `CLAUDE.md`. Si copiano su `main` solo i file dell'app, mai `ricerca/`; i dati su `main` li aggiorna la Action. Prima di copiare si fa il merge di `origin/main` nel ramo di sviluppo e non si copia mai `data/`: il 20/10/2026 la pubblicazione della 0.9.9 ha ricopiato su `main` sei file di dati più vecchi (ripristinati subito con un commit).
- **Verifiche nel browser**: `node ricerca/qa/server/gzserve.mjs <cartella> <porta>`, poi gli script in `ricerca/qa/browser/` con Playwright (Chromium in `/opt/pw-browsers`).
- **Ricostruire i cali forti**:
  1. `python3 scripts/backfill_indices.py prices --cache DIR`
  2. `python3 scripts/backfill_capitulation.py --jb DIR --repo DIR --cache DIR`
- **Controllare un numero**: ricalcolarlo con uno script indipendente (non con il modulo dell'app) e confrontarlo con una seconda fonte quando esiste (FRED, ETF equal-weight, serie pubbliche).
