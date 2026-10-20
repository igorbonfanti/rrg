# Sector Monitor · audit dei testi, dei numeri e delle avvertenze (0.9.8)

20/10/2026 · versione 0.9.8 (ramo `claude/great-noether-2f1ude`, commit 9a81dd8) · dati al 19/10/2026.
Solo lettura: fuori da `ricerca/qa/audit-0.9.8/` non è stato toccato nulla.

**Script** in `ricerca/qa/audit-0.9.8/testi/`. Importano i moduli dell'app (`js/`) e leggono `data/` e `config/`. L'output di tutti gli script è in `testi/output.txt`.

| Script | Cosa ricalcola |
|---|---|
| `avvicinamento.mjs` | statistiche dell'Avvicinamento (settori e 22 indici). Copia dell'audit 0.9.0, in più stampa la mediana dell'app |
| `livelli.mjs`, `copertura.mjs`, `suth.mjs`, `rotazione.mjs`, `cali.mjs`, `risultati_indici.mjs`, `zonablu.mjs`, `extra.mjs` | copie dell'audit 0.9.0, rieseguite sui dati di oggi |
| `verifica_098.mjs` (nuovo) | T1 Rea contro 3° percentile · T2 titoli unici, borse, peso dei file · T3 scala tagliata dei cali forti · T4 numeri della 0.9.1 · T5 prezzi ricopiati · T6 drawdown citati · T7 e T15 crisi passate e minimi della breadth · T8 note della 0.9.4 · T9 e T10 cali forti · T11 portafoglio · T12 CPI · T13 punti per titolo · T14 coperture e inizio dei prezzi · T16 vista 7 contro Rea · T17 scala della formula nuova negli altri universi |

Sono stati rieseguiti anche i due script citati dai testi: `ricerca/quant-rea/script/capitolazione_persistenza.mjs` e `ricerca/attenzione/script/indici.mjs`.

---

## 1. In sintesi

- **Ho controllato 116 affermazioni.** Esiti: 94 giuste, 2 sbagliate, 12 imprecise o rimaste indietro, 8 non verificabili con i dati del repository. Due delle giuste (#27, #81) sono verificabili solo in parte. Delle 8 non verificabili:
  - 5 (#22, #23, #84, #85, #87) hanno uno script che legge dati scaricati fuori dal repository, oppure non hanno nessuno script;
  - le altre sono letture private di StockCharts, un dato esterno con la fonte citata e una frase qualitativa.
- **Quasi tutte le statistiche principali si ricalcolano esattamente.** Sono l'Avvicinamento (59/73, 96/134), i risultati storici degli indici, i cali forti (31,5 / 12 / 5 sedute), le coperture, i livelli e i numeri delle note di versione 0.9.1, 0.9.4 e 0.9.5 (per esempio ▲557, la scala a circa 500 invece di 1.170, 46 titoli, 67 titoli, −0,14%).
- **Due affermazioni sono sbagliate.**
  - Il riquadro del livello blu degli indici dice «entro un punto in 6 casi su 13». Gli indici con un livello di Rea sono 12.
  - La scorciatoia «nov 2008» è descritta come «minimo della breadth». Non lo è: è il minimo di chiusura di SPY nel 2008. La breadth dell'S&P 500 tocca il fondo il 02/03/2009, quella dei settori a settembre-ottobre 2008.
- **Dall'audit 0.9.0 sono risolti tutti i punti alti** (A1-A5) e quasi tutti i medi. Restano aperti:
  - M10, la breadth di Taiwan con i dividendi in azioni;
  - in parte M1 (S5TH senza dati né script);
  - B3, B6 e B9.
  - Il B4 è stato corretto in modo sbagliato (vedi sopra).
- **Testi rimasti indietro rispetto alla 0.9.8 e alla 0.9.7.**
  - «Ogni sera» e «aggiornamento serale» compaiono ancora in 5 punti.
  - Il README dice ancora che un indice apre il dettaglio «se non è anche un ticker della rotazione».
- **Da decidere con l'utente.** La vista 7 mostra un valore di Rea (8,1%) letto da uno screenshot della sua piattaforma, e le letture sono salvate in uno script del repository pubblico. CLAUDE.md dice «niente dati estratti dalla piattaforma».

---

## 2. Tabella delle affermazioni

Esito: **OK** · **SBAGLIATO** · **IMPRECISO** (vero in parte) · **INDIETRO** (rimasto a una versione precedente) · **NV** (non verificabile con i dati del repository).

### 2.1 Avvicinamento

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 1 | README 67 · guida 161 · index 726 · bottom.js 229, 430 · signals.js 85 | 59 tocchi del livello su 73 avvisati, dal 2005 | 59/73 (`avvicinamento.mjs`) | OK |
| 2 | idem | anticipo mediano «circa un mese» | 23 sedute, anche con la mediana dell'app | OK |
| 3 | idem | meno della metà degli avvicinamenti arriva al livello | 91/224 = 40,6% | OK |
| 4 | README 79 · index 721 · indices.js 394 | 22 indici: anticipo 20 sedute, 96/134, 47% | 20 · 96/134 · 47,1% | OK |
| 5 | README 79 | 9 sedute con la fascia fissa di 10 punti | 9 (83/134) | OK |
| 6 | index 721 · indices.js 394 | «la più lunga dal 2000» | Dow Jones dal 03/01/2000 | OK |
| 7 | `ricerca/attenzione/script/indici.mjs` | lo script degli indici riproduce la statistica | ora legge i due file: 96/134, 47%, 20 sedute | OK (A5 risolto) |
| 8 | guida 160 · bottom.js 141 | in un calo deciso il livello è a circa due settimane | vero per costruzione (10 sedute) | OK |

### 2.2 Livelli blu, storia, membri

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 9 | README 129-141 | livelli blu dei settori | uguali a `config/thresholds.json` | OK |
| 10 | README 187-212 | livelli degli indici e fonte (Rea o 3° percentile) | 22 su 22 uguali alla configurazione | OK |
| 11 | README 187-212 | anni d'inizio della breadth | 22 su 22 | OK |
| 12 | README 199-212 | colonna Prezzo degli indici con limiti | 13 su 13 uguali a `config/indices.json` | OK |
| 13 | README 76 · index 721 · guida 306 | 10 principali e 22 indici, con l'elenco | `main: true` su 10 indici, 22 in tutto | OK |
| 14 | README 219 | i livelli di Rea lasciano sotto circa il 3% delle sedute: S&P 500 3,0%, settori 2,4-4%, Real Estate 5,8% | 2,97% · da 2,43% (XLP) a 3,99% (XLB) · 5,76% | OK (M2 risolto) |
| 15 | README 219 | 3° percentile: uguale su S&P 500 e Russell, a un punto su Nikkei, CAC, FTSE MIB e Hang Seng; lontano su Nasdaq-100 (11/18), Dow (10/15), DAX (3/7), SMI (0/3), IBEX (4/6) ed EM (22/15) | tutti i valori coincidono (T1, `livelli.mjs`) | OK (A1 risolto) |
| 16 | **indices.js 385** (riquadro del livello blu degli indici con il 3° percentile) | «Sugli indici con un livello di Rea la regola gli arriva entro un punto in 6 casi su 13» | gli indici con un livello di Rea sono **12**: è 6 su 12 (T1) | **SBAGLIATO** |
| 17 | indices.js 385 | «(Nasdaq-100 11 contro 18)» | 11 contro 18 | OK |
| 18 | README 197 | la storia degli indici con limiti parte quando almeno il 60% dei membri di oggi ha i prezzi | copertura alla prima seduta tra il 61% e l'88% (T14) | OK |
| 19 | README 108 · index 366 · guida 397 | settori: 292 su 500 nel 2005 (58%), 378 nel 2009 (76%), 434 a fine 2012 (87%) | 292 · 378 · 434 (`extra.mjs`) | OK (A3 risolto) |
| 20 | README 112 · guida 397 | copertura dell'S&P 500: 65% nel 2005, 80% nel 2009, oltre il 90% dal 2014, 99% dal 2021 | 64-65% · 79-80% · 90-91% · 2021 tra 98 e 99% | OK |
| 21 | README 110 | SUTH 42,85 / 82,75 / 3,57, identici | 12/28 · 24/29 · 1/28 | OK |
| 22 | README 111 · backfill_breadth.py 10 | S5TH: scarto tra −0,1 e +0,4 punti su 9 sedute | ora README e script dicono la stessa cosa. I valori S5TH non sono nel repository; l'audit dati 0.9.0 aveva trovato da −0,06 a +0,44 | NV, manca lo script (M1 in parte) |
| 23 | README 220 · indices.js 176 | membri di oggi: in media +4,3 punti (mediana 4,6, da −6,9 a +18,1) | fonte `ricerca/indici/fonti-dati.md`. `ricerca/indici/script/ndx_exp.py` legge prezzi scaricati in una cartella temporanea che non esiste più | NV, script non rieseguibile |
| 24 | indices.js 170 | indici d'epoca: copertura all'inizio | Nasdaq-100 59% (2008), Dow 87% (2000), S&P 500 64% (2005), calcolata dai dati | OK (M4 risolto) |
| 25 | README 201, 212 | Russell circa 1.970 membri, EEM circa 1.180 | 1.975 · 1.182 | OK |
| 26 | config TWN.note | circa 76 titoli | 76 | OK |
| 27 | config HSI.note | da 50 a circa 85 titoli | 85 oggi. Il 50 del 2020 non è nei dati | OK / NV |
| 28 | config FTSEMIB.note | con 40 titoli il 3% vuol dire al massimo un titolo | 1/40 = 2,5% | OK |
| 29 | config CSI300.note, NIFTY50.note | prezzo dal 2012, prezzo da settembre 2007 | 04/05/2012 · 17/09/2007 | OK |
| 30 | README 222 | lo STOXX 600 mette insieme 17 borse | 17 suffissi di borsa (T2) | OK |
| 31 | README 287 · guida 389 | circa 4.600 titoli degli indici | 4.640 titoli unici (5.487 contando le ripetizioni) | OK |
| 32 | README 81 | indices.json circa 300 KB compressi | 290 KB con gzip | OK |
| 33 | README 277 | circa 500 titoli | 503 | OK |
| 34 | guida 134 | Utilities: 31 titoli, uno vale 3,2 punti | 31 · 3,23 | OK |
| 35 | index 323 | settori piccoli (Energy, Communication Services, Materials, Real Estate, Utilities: 21-31 titoli), 3-5 punti | 21 · 22 · 24 · 30 · 31; da 3,2 a 4,8 punti (T13) | OK (B5 risolto) |
| 36 | index 506 | SMI 20 titoli = 5 punti; STOXX 600 meno di 0,2 | 20 · 0,17 | OK |
| 37 | guida 140 | percentile dal 2004; Real Estate dal 2015, Comunicazioni dal 2018; parte dopo un anno | ETF dal 08/10/2015 e dal 19/06/2018; percentile dal 07/10/2016 e dal 20/06/2019 | OK (M5 risolto) |
| 38 | README 221 | il percentile del drawdown degli indici usa la storia dal 2000 | vero per 17 indici su 22. STOXX 600 dal 2004, Euro Stoxx 50 e Nifty dal 2007, EEM dal 2003, CSI 300 dal 2012 (T14) | IMPRECISO |
| 39 | README 221 | «indice di solo prezzo in valuta locale» | EEM è l'ETF in dollari; XIU e 510300 sono ETF. L'app e la guida lo dicono già | IMPRECISO (B9 in parte) |

### 2.3 Stati, episodi, risultati

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 40 | README 115-125 · guida 149-154 · index 727-730 · bottom.js 230-234, 516-519 | soglie: 10 punti, 70°/85°, 2 chiusure, 5 punti o 2 titoli, 60 sedute, 20, 63, max(40, livello + 25) | uguali a `DEFAULT_PARAMS` e a `thresholds.json` | OK |
| 41 | **bottom.js 232** (legenda degli stati) · **bottom.js 517** (Regole, vista Alert) · **guida 152** | condizione del trigger | la legenda non dice «di almeno 2 titoli sopra il minimo della zona blu» e nemmeno «due conferme dopo un fallimento o una zona blu lunga»; le Regole non dicono i 2 titoli sopra il minimo; la guida scrive «e sopra il minimo» senza «di almeno 2 titoli» | IMPRECISO (B6 in parte) |
| 42 | format.js 102 | checklist: «le conferme richieste, una o due» | come `explainState` | OK (M13 risolto) |
| 43 | guida 151 · index 728 | nella zona blu si formano spesso i bottom, di solito in anticipo | dopo l'ingresso il prezzo scende ancora entro 6 mesi in 46 casi su 48; il minimo dei ±6 mesi cade entro 3 mesi in 29 su 48 (`zonablu.mjs`) | OK |
| 44 | README 223 | 9 indici: 75 trigger dal 2001, mediana a 12 mesi +14,8%, 49 positivi | 75 · +14,8 · 49 | OK |
| 45 | README 223, 159 | ultimo trigger di ogni episodio dal 2005: 39 episodi, mediana +20,6%, 34 positivi | 39 · +20,6 · 34 | OK |
| 46 | README 223 | 13 indici con limiti: 54 episodi, mediana +23,4%, 46 positivi | 54 · +23,4 (media dei due centrali, come la mediana dell'app dalla 0.9.1) · 46 | OK |
| 47 | README 123, 159 | 0.9.4: XLY 2008 (trigger del 03/04, poi zona blu dal 07/10/2008 e trigger il 02/01/2009), trigger SPX il 10/10/2011, trigger UKX il 04/04/2008 | uguale (T8) | OK |
| 48 | README 63 · guida 263 · bottom.js 245 | crisi passate: ott 2011, feb 2016, dic 2018, mar 2020, ott 2022, apr 2025 | ognuna è la data del minimo di chiusura di SPY (T7) | OK |
| 49 | **guida 263 · README 63** | «nov 2008 (minimo della breadth; il prezzo dell'S&P 500 tocca il fondo il 09/03/2009)» | il 20/11/2008 è il **minimo di chiusura di SPY nel 2008**. La breadth dell'S&P 500 ha il minimo il 02/03/2009 (0,8%; il 20/11/2008 era all'1,0%). Nei settori il minimo è tra settembre e ottobre 2008 (media degli 11 settori: 0,4% il 09/10/2008; 0,8% il 20/11) (T15) | **SBAGLIATO** |
| 50 | idem | il prezzo tocca il fondo il 09/03/2009 | 09/03/2009 | OK |
| 51 | index 545 · README 223 | nei mercati orso lunghi i trigger sono stati spesso rimbalzi falliti | descrizione qualitativa dalla ricerca F1 | NV |

### 2.4 Cali forti

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 52 | README 217 · guida 318 · cap-view 154 · index 721 | preset −7% su 5 sedute, 99° percentile delle sedute precedenti, dopo 3 anni, almeno 5 cali | `CAP_DEFAULT` (0,99, 756, 5) | OK |
| 53 | README 217 · guida 321 · cap-view 154 | la scala si ferma a 1,3 volte la soglia più alta quando un picco la supera di oltre il 30% | cap-chart.js 61-64 | OK |
| 54 | README 158 | S&P 500 nel periodo MAX: la scala arriva a circa 500 invece di 1.170 | 502 invece di 1.169 (T3) | OK |
| 55 | README 158 | picco del 2022 di 106 titoli: un quinto del pannello invece di un undicesimo | 106 titoli · 0,21 contro 0,09 | OK |
| 56 | README 158 | etichetta ▲557 (ott 2008) | SPX, vista 6, MAX: ▲557 (ott 2008), ▲1082 (mar 2020) | OK |
| 57 | README 217 · guida 320 · cap-view 155 · capitulation.js 17 | in allerta 31,5 sedute di mediana nel 2007-2009, 12 nel 2020, 5 nell'aprile 2025 | 31,5 · 12 · 5 (`capitolazione_persistenza.mjs`) | OK |
| 58 | guida 320 | S&P 500 nel 2007-2009: 5 episodi, 60 sedute | 5 episodi, 60 sedute | OK |
| 59 | guida 320 | 2020 «in un solo episodio» | un solo episodio in 25 serie su 30; due episodi nelle altre 5 (T10) | IMPRECISO (minore) |
| 60 | guida 318 | un −7% è frequente in Corea e raro in Svizzera | 97,1 contro 42,3 cali ogni 10.000 titoli-seduta | OK |
| 61 | README 217 · guida 327 | dopo le allerte, in media meglio di una seduta qualsiasi; quasi tutto il vantaggio viene dai crolli rapidi | +10,9 punti in 12 mesi su 102 episodi; senza marzo 2020 e aprile 2025 +2,4 punti (64 episodi) (`cali.mjs`) | OK |
| 62 | guida 327 | tra agosto 2007 e settembre 2008 l'indice era più in basso un anno dopo | 13 casi su 14: il FTSE 100 del 16/09/2008 era a +0,3% (T9) | IMPRECISO |
| 63 | README 217 · guida 327 | «Nella prova sui 22 indici» | le serie dei cali forti sono 21, Taiwan esclusa (anche nelle conclusioni della ricerca) | IMPRECISO |
| 64 | cap-view 153 | «in media dopo una seduta qualsiasi» | `capOutcomes` calcola una media | OK (M6 risolto) |
| 65 | README 163 | 10/10/2008, S&P 500: 46 titoli a −7% | 46 (T4) | OK |
| 66 | README 163 | FTSE 100 al 16/10: 67 titoli sopra la media a 20 | 67 su 100 | OK |
| 67 | README 163 | CSI 300, 1G del 16/10: −0,14% | −0,14% | OK |
| 68 | README 217 · guida 327 · config TWN.noCap | Taiwan esclusa: Yahoo non rettifica i dividendi in azioni | confermato dalla ricerca (`capitolazione/README.md:46`, falsi cali nel 2005-07) | OK |

### 2.5 Rotazione, portafoglio, titoli

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 69 | index 97, 189 | formula nuova: di solito entro 3 punti da 100 | settori 99,8%; universi in euro e asset reali tra il 98,3 e il 100% (T17) | OK |
| 70 | index 199 | medie semplici: sui settori di solito entro 10 punti | 99,1% | OK |
| 71 | index 204 · guida 246 · README 249 | stesso quadrante circa tre volte su quattro | 72,6% settimanale, 72,0% giornaliero | OK |
| 72 | index 200 · README 249 | coincide al centesimo con StockCharts (11 letture); con SPY circa 0,2 più basso | letture private (regola di CLAUDE.md) | NV |
| 73 | README 39, 47 · guida 230 | pesi del portafoglio e classi | uguali a `universe.json` (T11) | OK |
| 74 | guida 238 | ISIN LU2951555403 | `ricerca/managed-futures/rapporto.md` (fonte justETF) | OK |
| 75 | guida 238 | Trend +21% nel 2008 e +27% nel 2022 (SG Trend Index) | ricerca: +20,9 e +27. È un dato esterno con la fonte citata | NV |
| 76 | guida 242 · nome dell'ETF in `universe.json` · README 175 | DBMF americano prima del 28/04/2025 | detto nel nome dell'ETF (tooltip e tabella) | OK |
| 77 | README 40 | Eq Weight MWEQ dal 2024 | primo prezzo il 07/10/2024 | OK |
| 78 | README 264 | mancano le sedute di Milano dal 13 al 20/09/2022; il rendimento del 21/09 copre 7 sedute | 6 sedute assenti; la seduta prima del 21/09 è il 12/09 (T5) | OK |
| 79 | README 264 | dal 04 al 06/12/2023 i 13 ETF di Xetra hanno il prezzo dell'01/12 | 13 ETF ricopiati | OK |
| 80 | README 263 | CSNDX.MI al 30/12/2025 ha il prezzo del 23/12 | uguale | OK |
| 81 | README 19 | XLU al 29/09/2026: −15,1% con i dividendi, −16,8% sul solo prezzo | −15,06%. Il solo prezzo a quella data non è nei dati (`max52` vale solo per l'ultima seduta) | OK / NV |
| 82 | README 19 | GLD −22,8% in tutte e due | −22,79% | OK |
| 83 | README 20 · index 748 | GLD il 29/01/2026: 509,70 contro 495,90 | `max52`: ih 509,7, hi 495,9 | OK |
| 84 | **index 693** | «3 mesi al 16/10/2026, Tecnologia: 8,1% contro 5,8%; 5,7% sulle nostre 63 sedute» | 8,1 è una lettura da uno screenshot di Rea; 5,8 viene da `confronto-rea.md`. Non ricalcolabili senza dati scaricati | NV (vedi il problema D1) |
| 85 | index 693 | equal-weight di solito entro un punto (9 settori su 11); cap-weighted in media un punto, 2-3 in Energia e Tecnologia | `confronto_rea.mjs` legge prezzi scaricati (`fetch.mjs`) che non sono nel repository | NV |
| 86 | index 693 | cambia chi è davanti in Tecnologia e Industriali (16/10/2026) | segno della divergenza 3M diverso da Rea solo in XLK e XLI (T16) | OK |
| 87 | README 284 · index 692 | equal-weight in media a 0,5 punti dagli RSP*; la stima sposta i rendimenti al massimo di 0,07 punti | `check.mjs` legge dati scaricati; l'audit dati 0.9.0 aveva misurato al massimo 0,07 | NV |
| 88 | README 284 | chi non è nelle holdings pesa 0,7 volte il 20° percentile | scripts/lib/capeq.js 213-216 | OK |

### 2.6 Dati, aggiornamento, comandi, versione

| # | Dove | Testo | Valore ricalcolato | Esito |
|---|---|---|---|---|
| 89 | guida 387 | parte alle 00:40 con l'ora legale, alle 23:40 con l'ora solare | cron 22:40 UTC | OK (M12 risolto) |
| 90 | README 259 · app.js 18 · update-data.yml | 22:40 UTC, ogni ora dalle 01:10 alle 06:10 UTC, 11:40 UTC | cron uguali; `need_update.js` ha lo stesso testo del cron | OK |
| 91 | README 155 | nella notte del 20/10 la corsa delle 22:40 UTC è partita alle 01:15 | API di GitHub: corsa programmata alle 01:15:47 UTC | OK |
| 92 | guida 387 · index 742 · app.js 22 | GitHub fa partire le corse anche con qualche ora di ritardo | 16-17/10: corse partite alle 07:54 e 08:17 (programmata 03:20) e alle 14:22 e 15:29 (programmata 11:40) | OK |
| 93 | guida 387 | «Finché la seduta non arriva, il badge in alto dice "1 seduta indietro"» | vale solo dalle 20:30 di New York (`PUBLISH_US`, le 2:30 in Italia); prima il badge dice «Aggiornato» | IMPRECISO |
| 94 | **index 439 · guida 145, 298, 310, 389** | «aggiornamento serale», «ogni sera» | dalla 0.9.8 i dati arrivano tra la notte e la mattina | INDIETRO |
| 95 | guida 410 | GitHub fa tenere i file al browser per 10 minuti | `cache-control: max-age=600` sul sito | OK |
| 96 | README 297 | limiti di `check_fresh.js` (7, 7, 10, 14, 4, 6, 12 giorni) | uguali | OK |
| 97 | README 296 | workflow al massimo 45 minuti; ogni richiesta 30 secondi | `timeout-minutes: 45`; `AbortSignal.timeout(30000)` | OK |
| 98 | README 275 | meno dell'80% dei ticker, oppure più del 20% fermo | fetch_data.js 231, 240 | OK |
| 99 | README 267 | bitcoin escluso se fermo da più di 4 giorni | fetch_data.js 537 | OK |
| 100 | README 286, 290 · guida 310 | 99% dei membri, 75% dei titoli, ultime 5 sedute, ultima chiusura entro 5 giorni | `RECOMPUTE` 5, `MIN_FRESH` 0,75, `STALE_DAYS` 5, 0,99 | OK |
| 101 | README 288-289 | almeno l'80% della lista coincide; 20 titoli per richiesta | `MIN_OVERLAP` 0,8; blocchi da 20 | OK |
| 102 | README 294 · guida 298 | invio fallito riprovato per 5 sedute | `retryFrom(…, 5)` | OK |
| 103 | guida 298 | rettifica «se un evento già inviato si sposta di un giorno» | `reconcile` sposta l'evento di qualunque numero di sedute (ultime 6) | IMPRECISO |
| 104 | README 273 · index 255 | date dalle vintage ALFRED fino ad agosto 2026; ottobre 2025 mai pubblicato | `cpi_releases.json` da 2019-01 a 2026-08; 2025-10 assente (T12) | OK |
| 105 | README 99 · guida 370 · index 755 | tasti `1`-`7` | 7 viste | OK (B1 risolto) |
| 106 | **README 95** | un indice apre il dettaglio «se non è anche un ticker della rotazione» | dalla 0.9.7 il nome di un indice vale più di un ticker senza borsa (app.js 985): `CAC` apre l'indice | INDIETRO |
| 107 | guida 364 · README 156 | `CAC` apre il CAC 40, `CAC.PA` l'ETF | app.js 985, 1004 | OK |
| 108 | README 157 · guida 312 | link a TradingView per tutti i 22 indici | 22 su 22 in `TV` (indices.js 18-25) | OK |
| 109 | README 157 | dove il prezzo è un ETF o un altro indice c'è anche quello («EWT per Taiwan») | per Taiwan il prezzo è il TAIEX (`^TWII`); EWT è l'ETF da cui viene il paniere della breadth | IMPRECISO |
| 110 | version.js · version.json · README 155 | 0.9.8 del 20/10/2026 | coincidono | OK |
| 111 | guida 179 | trigger nelle ultime 63 sedute | `cooldown` 63 | OK |
| 112 | guida 295 | gli ultimi 60 cambi di stato | `slice(0, 60)` | OK |
| 113 | README 24 · guida 177 | breadth mosse di almeno 5 punti | bottom.js 172 | OK |
| 114 | README 83-86 · guida 339-350 | 3 divergenze, 8 più in pena, 12 nella lista, 52 settimane | `WORST` 8, `LIST` 12, `hist` di 52 settimane | OK |
| 115 | guida 262 · index 302 | zoom: drawdown oltre il 50°, breadth da −15 a +40 | `ZOOM` | OK |
| 116 | **README 3** | «quattro universi globali di ETF in euro (asset class, fattori, regioni, paesi)» | sono cinque (c'è anche 6 · Indici), più gli asset reali in dollari (README 35 lo dice) | INDIETRO |

---

## 3. Approssimazioni: dove sono dette

| Approssimazione | App | Guida | README | Esito |
|---|---|---|---|---|
| Storia con i membri di oggi (18 indici) | sì: tooltip «membri di oggi» con +4 punti (−7/+18); Situazione | sì (314) | sì (220) | detta. Lo script del numero non si può rieseguire (#23) |
| Copertura bassa nei primi anni, settori senza i membri usciti prima del 2013 | sì: nota degli episodi (index 366); copertura iniziale degli indici d'epoca nel tooltip | sì (397) | sì (108, 112) | detta |
| DBMF americano prima del 28/04/2025 | sì, nel nome dell'ETF (tooltip e tabella) | sì (242) | sì (175) | detta. «Raccordato al primo prezzo dell'ETF» è scritto solo nel README |
| Prezzi ricopiati (ETF senza barra, feste di altre borse) | sì: asterisco e nota nella tabella Prezzi (app.js 402, 416) | sì (213, 401) | sì (263) | detta. Nella modalità Rotazione (rotNote) non se ne parla, anche se grafico e tabella usano gli stessi prezzi (minore) |
| Bitcoin con la chiusura di Yahoo a mezzanotte UTC | sì (pxCopied) | sì (213) | sì (164, 267) | detta. Il dato di Yahoo non è verificabile dal repository |
| Scala tagliata dei cali forti | sì: nota della scheda, ▲ con il valore, tooltip | sì (321) | sì (158, 217) | detta |
| Orari dell'aggiornamento | sì: tooltip della data e guida rapida | sì (387) | sì (155, 259) | detta. Restano 5 «ogni sera / serale» (#94) |
| Livelli e regola dell'avvicinamento scelti sulla stessa storia | sì: «nel campione» in legenda, guida rapida e Situazione; replay | sì (266, 398) | sì (63, 67, 79) | detta |
| CPI con i valori rivisti di oggi | sì (index 255) | — | sì (273) | detta (B7 risolto) |
| Prezzo degli indici con un ETF o un altro indice (EEM in dollari, XIU, 510300, KOSPI) | sì: tabellone (index 476), note degli indici | sì (309) | in parte: README 221 dice «valuta locale» (#39) | detta nell'app |
| Filtro degli errori di stampa e dei crolli oltre il 60% nei cali forti | sì (cap-view 156) | sì (327) | sì (217) | detta (B8 risolto) |
| Seduta qualsiasi dei cali forti come media | sì («in media») | — | — | detta |
| **Taiwan: la chiusura non rettificata per i dividendi in azioni entra anche nella breadth** | no: lo dicono solo per i cali forti (`noCap`) | no | no | **non detta** (M10 ancora aperto). La ricerca conferma falsi cali per questo motivo, quindi le stesse chiusure spostano anche le medie a 200 sedute |
| Peso stimato dei titoli usciti nella vista 7 (0,7 volte il 20° percentile) | sì (index 692) | — | sì (284) | detta |
| Vista 7: indici simulati, prezzi senza dividendi | sì (index 692, 722) | sì (343) | sì | detta |

---

## 4. Problemi dell'audit 0.9.0: a che punto sono

| Punto | Stato |
|---|---|
| A1 Rea e 3° percentile | risolto nel README. Il nuovo testo di indices.js 385 contiene però un conteggio sbagliato (13 invece di 12, #16) |
| A2 durata dell'allerta | risolto, con i dati e con lo script citato |
| A3 settori prima del 2013 | risolto (app, guida, README) |
| A4 ultimo prezzo noto negli universi globali | risolto |
| A5 script degli indici | risolto (96/134) |
| M1 S5TH | i testi ora sono coerenti; mancano ancora i valori e lo script nel repository |
| M2-M9, M11-M14 | risolti. M11 resta da rivedere per la lettura di Rea (D1); M12 ha dei residui (#94) |
| M10 Taiwan, breadth | **aperto** |
| B1, B2, B5, B7, B8, B10, B11, B13, B14 | risolti. B12 non serve più: dalla 0.9.1 la mediana è quella standard |
| B3 intervalli dei risultati storici | aperto (minore) |
| B4 «nov 2008» | **corretto in modo sbagliato** (#49) |
| B6 regola del trigger | risolto nella guida rapida; aperto nella legenda, nelle Regole e nella tabella della guida (#41) |
| B9 valuta degli indici | risolto in app e guida; aperto nel README (#39) |

---

## 5. Coerenza tra app, guida e README; italiano

1. **Orari.**
   - Guida rapida, tooltip e guida §Dati dicono «tra la notte e la mattina».
   - La vista Alert («aggiornamento serale») e la guida («Ogni sera una macchina a stati…», «ogni sera, dopo l'aggiornamento dei dati», «si ricalcolano ogni sera», «calcolata ogni sera») dicono un'altra cosa.
2. **Comandi.** La guida (364) e la nota 0.9.7 dicono che `CAC` apre l'indice. Il README 95 ha ancora la regola vecchia.
3. **Trigger.** Sono quattro formulazioni diverse:
   - README e guida rapida: completa;
   - legenda del Monitor: manca la condizione sul minimo e non ci sono le due conferme;
   - Regole della vista Alert: manca la condizione sul minimo;
   - tabella della guida: «e sopra il minimo», senza «di almeno 2 titoli».
4. **Zona blu.**
   - Guida e guida rapida: «si formano spesso i bottom, di solito in anticipo».
   - Legenda del Monitor (bottom.js 231): «Qui si formano i bottom, spesso in anticipo». È più categorica e dice un'altra cosa.
5. **Il nome di Rea** è scritto in tre modi: «Massimo Rea», «quant-rea», «Quant Rea» (cap-view: «preset di Quant Rea»). Le citazioni ci sono dove servono: footer, guida rapida, guida, README, livello blu, cali forti e vista 7.
6. **Indirizzi.** La guida (371) non elenca `#sec`, il README sì.
7. **README, sezioni «4 Settore» e «6 Indici».** Non dicono che gli episodi sono richiudibili e chiusi di default, né che ci sono i link TradingView per tutti gli indici. Lo dicono solo le note di versione.
8. **Testo del fallito** nel registro e nei messaggi Telegram (signals.js 160): «il prezzo chiude sotto il minimo della zona blu». La regola è «meno un'escursione media giornaliera», e c'è anche il controllo tardivo. La legenda e la guida la dicono giusta.

---

## 6. Problemi, dal più grave

### Bloccanti per la 1.0

Sono affermazioni false visibili all'utente. Si correggono in pochi minuti.

**B-1. «entro un punto in 6 casi su 13»** (js/indices.js 385). Gli indici con un livello di Rea sono 12.
Testo proposto: «…Sugli indici con un livello di Rea la regola gli arriva entro un punto in 6 casi su 12 e altrove se ne scosta di molto (Nasdaq-100 11 contro 18)…»

**B-2. «nov 2008 (minimo della breadth…)»** (guida.html 263, README 63). Il 20/11/2008 è il minimo di chiusura dell'S&P 500 nel 2008. La breadth dell'S&P 500 tocca il fondo il 02/03/2009; quella dei settori tra settembre e ottobre 2008.
- Guida: «…portano ai minimi di nov 2008 (minimo del prezzo nel 2008; la breadth dei settori era già a zero da ottobre e quella dell'S&P 500 tocca il fondo il 02/03/2009, il prezzo il 09/03/2009), ott 2011, …»
- README: «(nov 2008, minimo del prezzo nel 2008: la breadth dell'S&P 500 tocca il fondo il 02/03/2009 e il prezzo il 09/03/2009; …)».
- In alternativa si può aggiungere la scorciatoia «mar 2009».

### Da correggere

**D1. Valore di Rea letto da uno screenshot** (index.html 693: «Tecnologia: 8,1%»; letture `REA` in `ricerca/settori-titoli/script/confronto_rea.mjs`, repository pubblico). CLAUDE.md dice: «Niente dati estratti dalla piattaforma». Va deciso con l'utente.
- Proposta: togliere il numero di Rea e usare il nostro ricalcolo del suo metodo. «…quindi il suo valore di solito è più alto di quanto ha reso davvero un indice a capitalizzazione (3 mesi al 16/10/2026, Tecnologia: con i pesi di fine periodo 8,2%, con i pesi di inizio periodo 5,8% dalla stessa data di partenza; 5,7% sulle nostre 63 sedute)…»
- Nello script si possono lasciare solo i segni (chi è davanti), oppure togliere le letture.

**D2. Residui di «ogni sera»** (testi rimasti indietro rispetto alla 0.9.8).
- index.html 439: «…invia solo i nuovi cambi di stato dopo ogni aggiornamento dei dati (di solito tra la notte e la mattina).»
- guida 145: «A ogni aggiornamento dei dati una macchina a stati legge…»
- guida 298: «dopo ogni aggiornamento dei dati, un messaggio per ogni nuovo cambio di stato… Le ultime sedute si ricalcolano a ogni aggiornamento: se un evento già inviato cambia data arriva una rettifica con le due date…» (corregge anche il #103)
- guida 310 e 389: «a ogni aggiornamento» al posto di «ogni sera».

**D3. Regola del trigger incompleta** (#41).
- bottom.js 232: «la breadth risale sopra il livello blu di almeno 5 punti (o 2 titoli, se valgono di più) e di almeno 2 titoli sopra il minimo della zona blu, con una conferma (due dopo un fallimento o una zona blu di più di 60 sedute): …»
- bottom.js 517: «Trigger: breadth ≥ livello + max(5 punti, 2 titoli) e almeno 2 titoli sopra il minimo della zona blu, con una conferma (…)».
- guida 152: «…e di almeno 2 titoli sopra il minimo della zona blu…».
- bottom.js 231, per allinearla alla guida: «Qui si formano spesso i bottom, di solito in anticipo: ci si prepara.»

**D4. README 95**: «un indice della pagina Indici (`NDX`, `N225`, `CAC`…) apre il suo dettaglio; vale più di un ticker scritto senza borsa (`CAC` apre il CAC 40, `CAC.PA` l'ETF nella rotazione);»

**D5. Taiwan, breadth con i dividendi in azioni non rettificati** (M10). Nella nota di TWN in `config/indices.json`, e quindi nella Situazione: «La chiusura di Yahoo non rettifica i dividendi in azioni, frequenti a Taiwan: dopo gli stacchi un titolo può scendere sotto la media a 200 sedute senza un calo vero, quindi la breadth può risultare più bassa.» Prima conviene misurarlo, per esempio contando i titoli che scendono sotto la media nel giorno di uno stacco.

**D6. Cali forti, «22 indici» e «più in basso un anno dopo»** (README 217, guida 327).
- «Nella prova sui 21 indici con i cali forti (Taiwan esclusa)…»
- «…tra agosto 2007 e settembre 2008, in 13 casi su 14 l'indice era più in basso un anno dopo.»

**D7. Statistiche senza uno script rieseguibile nel repository.** CLAUDE.md chiede che siano ricalcolabili con uno script salvato in `ricerca/`.
- S5TH, −0,1/+0,4 (#22): salvare in `ricerca/` le 9 letture pubbliche di S5TH e uno script che le confronta con `breadth.json`.
- Membri di oggi, +4,3 punti (#23): `ndx_exp.py` legge una cartella temporanea che non c'è più. Salvare in `ricerca/indici/` le due serie (d'epoca e con i membri di oggi) alle date usate, e far leggere quelle allo script.
- Vista 7: 0,5 punti dagli RSP*, 0,07 punti, «9 settori su 11», «in media un punto» (#85, #87). Salvare i rendimenti degli ETF usati nel confronto (un piccolo JSON) e fare girare `check.mjs` e `confronto_rea.mjs` su quello. Attenzione a D1 per le letture di Rea.

### Minori

- **m1.** README 221: «Prezzo: indice di solo prezzo nella valuta dell'indice; per S&P/TSX 60 e CSI 300 l'ETF, per l'MSCI Emerging l'ETF EEM in dollari. Il percentile del drawdown usa la storia del prezzo dal 2000, o dalla prima seduta disponibile (STOXX 600 2004, EEM 2003, Euro Stoxx 50 e Nifty 2007, CSI 300 2012).»
- **m2.** Guida 387: «Dopo le 2:30 circa (ora italiana), finché la seduta non arriva, il badge dice «1 seduta indietro».»
- **m3.** Guida 320: «12 nel 2020, di solito in un solo episodio».
- **m4.** README 3: «…dei titoli MAG7, di cinque universi globali di ETF in euro (asset class, fattori, regioni, paesi, indici) e degli asset reali in dollari…»
- **m5.** README 157 (e il commento di indices.js 21): «…(XIU per l'S&P/TSX 60, 510300 per il CSI 300, KOSPI per il KOSPI 200; per Taiwan il TAIEX del prezzo ed EWT, da cui viene il paniere)…»
- **m6.** README 223 (B3): dire perché l'insieme dei trigger parte dal 2001 e l'ultimo trigger dal 2005, oppure aggiungere «dal 2001: 50 episodi, mediana +18,3%, 40 positivi» (`risultati_indici.mjs`, mediana dell'app).
- **m7.** signals.js 160 (registro e Telegram): «il prezzo chiude sotto il minimo della zona blu meno un'escursione media: segnale fallito, …»
- **m8.** Usare un solo nome: «Massimo Rea (quant-rea)» la prima volta, poi «Rea». Per esempio cap-view 114 e 154: «preset di Rea».
- **m9.** Guida 371: aggiungere `#sec`. README «4 Settore» e «6 Indici»: una riga sugli episodi richiudibili e sui link TradingView.
- **m10.** Rotazione: nella nota della tabella (rotNote) aggiungere «Prezzi ricopiati: vedi la tabella Prezzi (asterisco)». Nella guida 242 aggiungere «raccordato al primo prezzo dell'ETF».
- **m11.** `ricerca/indici/fonti-dati.md:75` dice ancora «tra 0 e +0,4» per S5TH (documento di ricerca, non dell'app).
