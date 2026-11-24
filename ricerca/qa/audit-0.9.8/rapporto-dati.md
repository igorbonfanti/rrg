# Sector Monitor 0.9.8: controllo dei dati prima della 1.0

Data del controllo: 20/10/2026, dalle 05:55 alle 07:00 UTC circa. Oggetto: commit `9a81dd8` del ramo `claude/great-noether-2f1ude` (versione 0.9.8). I dati vengono dalla corsa delle 05:32-05:38 UTC del 20/10: USA, globali e asset reali al 19/10/2026, indici fino al 20/10.

**I dati sono cambiati durante il controllo.** Alle 05:46-05:51 UTC è partita un'altra corsa, poi è stata pubblicata la 0.9.9 (commit fino a `914cda9`). Per lavorare su dati fermi ho estratto i file di `9a81dd8` in una cartella a parte (`git archive 9a81dd8 data config js universe.json`). Tutti gli script li leggono da lì, tramite la variabile `RRG`. La corsa delle 05:46 cambia poco:
- la quarta cifra decimale di alcune chiusure rettificate di Yahoo (scarti relativi sotto 2·10⁻⁵);
- il numero di titoli di RUT ed EEM in qualche seduta;
- la chiusura di Taiwan del 20/10 (problema 1).

Alle 06:15 GitHub Pages serviva la 0.9.9 con i dati delle 05:46.

Gli script sono in `ricerca/qa/audit-0.9.8/dati/` (Python 3 e Node; servono solo numpy e pandas). Le risposte di Yahoo e FRED e i risultati (`*.json`) restano fuori dal repository, in `$QA98` (di default `.../scratchpad/qa98/` della sessione).

Fonti indipendenti:
- endpoint chart di Yahoo, scaricato di nuovo con pause tra le richieste. La pipeline usa la stessa fonte, quindi questo confronto controlla l'elaborazione, non la fonte;
- FRED (CPIAUCSL, SP500, DJIA) e le vintage ALFRED per le date di uscita del CPI;
- il probe storico Johnbrick123 dell'audit della 0.9.0, per la breadth con la composizione d'epoca;
- per la vista 7, gli ETF SPDR XL* e Invesco RSP*.

Il codice dell'app (`js/`) l'ho eseguito solo per sapere cosa mostra l'app. Tutti i ricalcoli sono scritti da zero.

Come rifare tutto:
```bash
cd ricerca/qa/audit-0.9.8/dati
export RRG=<cartella con git archive 9a81dd8 data config js universe.json>   # default /home/user/rrg
export QA98=<cartella di lavoro>                                          # cache di Yahoo e FRED e risultati
python3 -I c1_prices.py           # C1 prezzi, rendimenti, prezzi ricopiati, max52 dei tre file prezzi
python3 -I c1_macro.py            # C1 CPI contro FRED, DXY_INV, raccordo DBMFE, bitcoin
node c7_dates.mjs                 # C7 date e calendari
python3 -I c2_breadth.py          # C2 breadth S&P 500 e settori, breadth_latest, cali forti SPX e settori (circa 510 richieste)
PYTHONPATH=<data-probe/pylib> python3 c2_spx_hist.py 2008-10-10 2008-11-20 2011-10-03 2020-03-23 2022-10-12 2025-04-08
YPAUSE=1 python3 -I c2_indices.py # C2 breadth, cali forti e chiusure di 16 indici (circa 1.200 richieste)
python3 -I c2_fred.py             # chiusure S&P 500 e Dow contro FRED
python3 -I c3_dd.py               # C3 drawdown, solo prezzo, percentile
node c4_machine.mjs; python3 -I c4_alerts.py   # C4 stati e alert
python3 c5_rrg.py                 # C5 rotazione
python3 c6_cap.py                 # C6 somme, soglia e allerta dei cali forti
python3 -I c8_coverage.py; python3 -I c8_stale_members.py   # C8 copertura e titoli sospesi negli indici
python3 c9_capeq.py               # vista 7, cap-weighted ed equal-weight
node ../../server/gzserve.mjs <albero di 9a81dd8> 8831 &
NODE_PATH=$(npm root -g) node b1_app.cjs; python3 -I b2_compare.py   # numeri mostrati nel browser contro i ricalcoli
```
Se le richieste sono troppo fitte Yahoo risponde 429: `common.py` aspetta e riprova. `YPAUSE` è la pausa tra una richiesta e l'altra (default 0,35 s).

## Sintesi

Il nucleo dei numeri è giusto e riproducibile. Coincidono con i miei ricalcoli:
- prezzi e rendimenti di tutti i 78 ticker, CPI, 1/DXY e raccordo DBMFE;
- breadth di S&P 500, settori e 16 indici nelle ultime sedute, e la fotografia titolo per titolo;
- drawdown e percentili;
- stati e alert;
- RS-Ratio e RS-Momentum;
- cali forti (conteggi, somme, soglia, allerta);
- cap ed equal-weight della vista 7.

Nel browser, 1.816 valori del Monitor, della tabella Prezzi e del tabellone degli indici (tema scuro e chiaro) coincidono con i ricalcoli. Le eccezioni sono quelle elencate sotto, già spiegate.

I cinque problemi della 0.9.0 di gravità alta o media sono risolti e non sono tornati.

**Nessun problema bloccante per la 1.0.** I problemi nuovi sono casi di dati della fonte presi per buoni:
- una chiusura di Taiwan pubblicata prima che fosse definitiva;
- un titolo australiano sospeso per un anno, il cui crollo alla riapertura viene «riscalato» come se fosse un errore di Yahoo;
- il bitcoin dell'ultima seduta, fermo al giorno prima;
- piccole incoerenze di composizione e di copertura, non dette nell'app.

## Verifiche

Esiti: OK = coincide entro l'arrotondamento mostrato; DIFF = differenza reale (vedi problemi); DUBBIO = differenza spiegabile, non confermata come errore.

| # | Cosa ho confrontato | Con cosa | Casi | Esito |
|---|---|---|---|---|
| C1.1 | Storia completa delle chiusure rettificate dei tre file prezzi (`prices`, `prices_global`, `prices_macro`) | Yahoo chart adjclose scaricato ora | 78 ticker, circa 98.000 punti | OK: 0 punti oltre 0,05% (DBMFE prima del 28/04/2025 in C1.6) |
| C1.2 | Ultimo prezzo, 1G, 1S, 1M, 3M, YTD (formula dell'app riscritta) | Gli stessi rendimenti sulle sedute vere del ticker su Yahoo. Per gli ETF europei l'ultima seduta è il `regularMarketPrice`, perché alle 06-07 UTC Yahoo non ha ancora la barra del 19/10 | 78 ticker × 6 valori | OK, tranne lo YTD di CACC.PA, IAEX.AS, DBMFE.PA e LYXIB.MC (da −0,10 a −0,38 punti): la base è il 30/12/2025 di Milano. È detto nella guida, tranne per Madrid (problema 7) |
| C1.3 | Prezzi ricopiati: ogni seduta del file senza barra Yahoo deve avere il prezzo del giorno prima ed essere in `copied`, e nessuna seduta in `copied` deve avere una barra | Yahoo, senza le barre segnaposto (volume 0, O=H=L=C uguali alla chiusura precedente) | 46 ETF: 157 sedute ricopiate (XEON 28, CSCA 57, DBMFE 28 dopo il raccordo, Xetra 04-06/12/2023, CSNDX 6…) | OK: 0 non segnate, 0 segnate con barra, 0 barre segnaposto usate |
| C1.4 | `max52` (Solo prezzo): chiusura più alta non rettificata, data, ultima chiusura, massimo intraday, cedole nel periodo e dopo il massimo | Yahoo close, high ed eventi | 76 ticker | OK |
| C1.5 | CPI: 92 mesi, gradini a ogni seduta, date di uscita | FRED CPIAUCSL. Le uscite del 11/09 e del 14/10/2026 le ho controllate con le vintage ALFRED del giorno prima e del giorno stesso | 92 mesi, 1.254 sedute | OK: 0 differenze. Ottobre 2025 manca anche su FRED |
| C1.6 | DXY_INV = 10000/DX-Y.NYB; DBMFE prima del 28/04/2025 = DBMF in euro × fattore | Yahoo DX-Y.NYB, DBMF, EURUSD=X | 1.254 e 888 sedute | OK: 0 errori; scarto massimo del raccordo 1,05·10⁻⁶, fattore 4,5255 |
| C1.7 | Bitcoin all'ultima seduta (19/10) | Yahoo BTC-USD e BTC-EUR | 2 | DIFF: il valore del 19/10 è la chiusura del 18/10 (problema 3) |
| C2.1 | Breadth di S&P 500 e 11 settori (a20, a50, a200, n, membri), ricalcolata dai prezzi Yahoo di 506 titoli, con la lista dei membri della corsa che ha calcolato ogni seduta | `data/breadth.json` | 12 serie × 10 sedute (24-25/09, 08-19/10) | OK per le 7 sedute dal 09/10, tutte identiche. Il 24-25/09 XLC e SPX hanno 2 titoli in meno nel mio ricalcolo: PSKY e WBD sono usciti e oggi non hanno prezzi su Yahoo. È un limite del ricalcolo |
| C2.2 | `breadth_latest.json`: chiusura, d20, d50, d200, drawdown e up200 di ogni titolo | Ricalcolo dagli stessi prezzi | 503 titoli | OK: 0 differenze oltre 0,1 |
| C2.3 | Breadth storica con la composizione d'epoca | Probe Johnbrick123 (audit 0.9.0) | 6 date (10/10/2008, 20/11/2008, 03/10/2011, 23/03/2020, 12/10/2022, 08/04/2025) × 12 serie | OK: SPX identico in tutte. Settori entro 0,3 punti, salvo XLU al 03/10/2011 (+1,7, un titolo): è la mia mappa dei settori |
| C2.4 | Breadth degli indici con i membri di oggi, medie sulle sedute del titolo e regola dei 5 giorni | Yahoo chart dei membri (non spark) | 16 indici (DJI, NDX, DAX, CAC, SMI, FTSEMIB, SX5E, IBEX, UKX, N225, HSI, TSX60, NIFTY50, TWN, ASX200, IBOV) × 6 sedute = 96 righe | OK in 88. ASX200 (6 righe): differenza di un titolo, CTD.AX (problema 2); coincide se applico la stessa riscalatura dell'app. DAX e SX5E al 09/10: a50 +1 (DUBBIO: BAS.DE e DHL.DE sono entro lo 0,09% dalla media). IBOV al 19/10: a20 e a200 −1 (DUBBIO: oggi Yahoo chart ha la barra del 19/10 vuota per 51 titoli su 76) |
| C2.5 | Chiusure degli indici, ultime 260 sedute | Yahoo chart | 16 indici, 4.160 sedute | OK, tranne TWN al 20/10 (problema 1). Nessuna seduta in più o in meno |
| C2.6 | Chiusure di S&P 500 e Dow Jones | FRED SP500 e DJIA | 2 × 2.512 sedute | OK: 3 sedute oltre lo 0,01% (massimo 0,12% l'11/08/2021, come nella 0.9.0); ultima seduta identica |
| C2.7 | Conteggi dei cali forti (≤−5/7/10%, filtro degli errori di stampa, crolli oltre il 60%) di SPX, settori e 16 indici | Ricalcolo indipendente dagli stessi prezzi | 120 righe SPX/settori + 90 righe indici | OK per le sedute dal 09/10. Il 25/09 XLK x5/x7 è 2/1 invece di 1/0, e n differisce di 1 in XLK/XLB/XLC/SPX dal 15/09 al 01/10 (problema 5) |
| C2.8 | Copertura della breadth degli indici: sedute con n/membri sotto l'80% | `indices*.json` | 22 indici, dal 10/2024 | Solo EEM: 11 sedute con 627-708 titoli su 1.182 (problema 6) |
| C3.1 | Drawdown dal massimo a 52 settimane (con dividendi) e percentile della profondità, all'ultima seduta | Yahoo adjclose dal 2004 (11 settori, SPY, RSP) | 13 | OK: ≤0,01 punti; percentile ±1 (classi da 0,1 punti dell'app). XLI all'84° e XLU all'86°, come nell'app. La storia di `sectors.json` è identica a Yahoo (0 punti diversi) |
| C3.2 | Solo prezzo in `sectors.json` (massimo, data, ultima chiusura, drawdown) | Yahoo close | 13 | OK |
| C3.3 | Drawdown e percentile dei 22 indici (storia dal 2000) | Yahoo chart | 22 | OK: ≤0,01 punti, tranne TWN (−7,11 contro −7,08, problema 1). Il CSI 300 ora è esatto (−16,79) |
| C3.4 | Percentile della tabella Prezzi (5 anni) contro quello del Monitor (dal 2004) | Ricalcolo | 13 ETF | OK: la differenza è detta nella nota della tabella (`pxNote`) |
| C4.1 | Stati della macchina all'ultima seduta e eventi del 2026 (runMachine sui dati pubblicati), contro `alerts.json` | Registro | 11 settori, 22 indici | OK: 2 eventi (XLU zona blu 25/09, trigger 12/10), stesse date e stessi testi, nessun evento non registrato, livelli del registro = config |
| C4.2 | XLU, controllo indipendente: breadth giorno per giorno dai 31 membri, drawdown e percentile da Yahoo, regole del README | Ricalcolo | sedute dal 17/09 al 19/10 | OK: zona blu il 25/09 (2 chiusure al 3,2%, percentile 92,8, testo «93°»). Trigger il 12/10 (16,1% ≥ 11,45%, spinta a 20 giorni: 96,8% con minimo 3,2% nelle 15 sedute). Nessun segnale fallito (minimo 39,25, ultima 41,36) |
| C4.3 | Coerenza degli stati di oggi: Attenzione se breadth ≤ livello+10 o percentile ≥85 | Breadth (C2) e percentili (C3) ricalcolati | 11 settori, 22 indici | OK (XLRE Attenzione al 10,0%; XLI Normale all'84°; CSI300, NIFTY50 e KOSPI200 Attenzione) |
| C5 | RS-Ratio e RS-Momentum, formula nuova e a medie semplici, settimanale e giornaliero, ultime 4 barre | Pandas su prezzi Yahoo (USA e asset reali) e del file (ETF in euro, già verificati in C1) | 11 coppie (XLK, XLE, XLU, XLRE/SPY, NVDA, TSLA/QQQ, GLD, BTC/SPY, SGLD, EIMI, DBMFE/SWDA) × 2 × 2 × 4 = 176 | OK: scarto massimo 2,4·10⁻⁵ |
| C6 | Cali forti: somma su N sedute, soglia (99° percentile delle sedute precedenti dopo 756 somme), allerta, episodi, percentile e sedute in allerta di oggi | numpy, sui conteggi del file | 32 serie × 4 preset (7%/5 titoli, 5%/3, 10%/10 in %, 7%/5 in %) = 128 | OK: 0 differenze in ogni seduta |
| C6.2 | Cali forti storici che nella 0.9.0 erano sbagliati | Conteggio grezzo della 0.9.0 | SPX 10/10/2008, 03/04/2020, 08/04/2025 | OK: 79/46, 51/11, 41/11 (corretti nella 0.9.1); invariati N225 07/04/2025 (191/135/54), SPX 16/03/2020 e 04/04/2025 |
| C7.1 | Date dei file USA (prezzi, asset reali, settori, breadth, cali forti) | Sedute di SPY su Yahoo dal 2004 | 5 file | OK: nessuna seduta mancante o in più |
| C7.2 | Calendario NYSE di `js/calendar.js` | SPY dal 2004 | 5.735 sedute | Mancano le 6 chiusure straordinarie (11/06/2004, 02/01/2007, 29-30/10/2012, 05/12/2018, 09/01/2025). Sui file non hanno effetto, perché le date vengono da Yahoo; è detto nel commento del modulo |
| C7.3 | Calendario di Borsa Italiana di `js/calendar.js` e date del file globale | FTSEMIB.MI su Yahoo, 5 anni | 1.271 sedute | Calendario identico. Il file globale non ha 8 sedute di Milano: 13-20/09/2022 (dichiarate), 24/10/2025 e 06/03/2026 (problema 8) |
| C7.4 | Ultima seduta di ogni file all'ora in cui è stato generato | `expectedSession` NYSE e Milano | 7 file | OK; `indices.json` è al 20/10 per Taiwan e Australia |
| C7.5 | Ultima seduta di ogni indice | Calendari delle borse e Yahoo | 22 | OK, tranne il CSI 300 fermo al 16/10 (problema 9). Gli 8 indici europei e l'EEM hanno il prezzo al 19/10 e la breadth al 16/10 (problema 10). Hong Kong al 16/10 è giusto: il 19/10 era festa (Chung Yeung) |
| C8 | Titoli degli indici sospesi (volume 0, prezzo fermo per ≥20 sedute) e salti di scala senza rientro | Yahoo chart | 1.179 titoli | ASX200: CTD.AX (261 sedute ferme, poi −86%), FRW.AX (43), WAF.AX (64); nessun altro indice |
| C9 | Vista 7: cap ed equal-weight su 3M e 1M ad oggi, 3M di un mese fa | Simulazione della 0.9.0 sui prezzi chart | 12 serie × 3 = 36 | OK: scarto massimo 0,05 punti |
| B | Numeri mostrati nel browser (Chromium, 1440 px, tema scuro e chiaro, albero di 9a81dd8). Monitor: breadth, conteggio, drawdown, solo prezzo, ultimo, 1G, 1M. Tabella Prezzi degli 8 universi: ultimo, 1G, 1S, 1M, 3M, YTD, drawdown, solo prezzo, rispetto alla media 200. Tabellone dei 22 indici: breadth, conteggio, drawdown, ultimo, 1G, 1M, cali forti | Ricalcoli C1-C6 | 1.816 valori | OK in 1.796. I 20 diversi (10 per tema) sono: YTD di Parigi, Amsterdam e Madrid (C1.2); DBMFE «rispetto alla media 200» +10,8 contro +10,74, perché il calendario di Milano ricopia alcune sedute di Parigi; TWN ultimo, 1G e 1M (problema 1); IBOV breadth (DUBBIO di C2.4). Nessun errore nella console |
| T | Statistiche dei testi ricalcolate con gli script citati nel README | `capitolazione_persistenza.mjs`, `risultati_indici.mjs` sui dati di oggi | 7 numeri | OK: 31,5 / 12 / 5 sedute; 75 trigger con mediana +14,8% e 49 positivi; 39 con mediana +20,6% e 34 positivi; 54 con mediana +23,4% e 46 positivi |

## Problemi, in ordine di gravità

### Bloccanti per la 1.0
Nessuno. Nessun numero dell'ultima seduta è inventato. Gli scarti trovati sono di decimi di punto o di un titolo, e i casi più evidenti si correggono da soli alla corsa successiva.

### Da correggere

**1. Taiwan: la chiusura del 20/10 è stata pubblicata prima che fosse definitiva** (confermato)
- Dove: `data/indices_more.json`, serie TWN. Il prezzo viene da `fetch_indices.js`, che usa `fetchDaily(…, range 1mo)` e `parse` in `scripts/lib/yahoo.js`.
- Cosa: `parse` considera chiusa la barra appena passa la fine dell'orario regolare (13:30 a Taipei, 05:30 UTC). Ma per qualche minuto Yahoo cambia ancora il valore dell'indice.
  - corsa delle 05:38: 46.280,32 (commit 9a81dd8);
  - corsa delle 05:51: 46.234,29 (0.9.9);
  - Yahoo alle 06:13, su query1 e query2, range 1mo e 5d: 46.292,93 (`regularMarketTime` 05:33:15 UTC).
- Effetto nell'app (9a81dd8): ultimo 46280 invece di 46293; 1G −1,2% invece di −1,1% (−1,16 contro −1,13); 1M +0,9 contro +0,97; drawdown −7,11 contro −7,08. La corsa successiva ricalcola e corregge, ma fino ad allora il dato è provvisorio, e la stessa cosa può succedere a ogni borsa asiatica chiusa da pochi minuti (Australia oggi era definitiva).
- Prova: `python3 -I c2_indices.py TWN`, riga «chiusure … oltre l'arrotondamento 1 [('2026-10-20', 46280.32, 46292.93)]`. Oppure `curl 'https://query1.finance.yahoo.com/v8/finance/chart/%5ETWII?range=5d&interval=1d'` da confrontare con la serie TWN del file.
- Proposta: tenere una barra solo almeno 30-60 minuti dopo la fine dell'orario regolare, oppure solo se `regularMarketTime` è almeno N minuti prima dell'ora della corsa.

**2. ASX 200: un titolo sospeso per un anno viene «riscalato» e conta sopra le medie** (confermato sui dati; che il crollo sia vero è molto probabile ma non verificato con una seconda fonte)
- Dove: `scripts/fetch_indices.js` `clean()`, seconda parte: un salto di rapporto ≤0,25 o ≥4 senza rientro entro 60 sedute viene trattato come errore di scala, e tutta la storia precedente viene moltiplicata per il rapporto.
- Cosa:
  - CTD.AX (Corporate Travel Management) su Yahoo resta a 16,07 con volume 0 dal 25/08/2025 al 02/09/2026 (261 sedute: titolo sospeso);
  - il 03/09/2026 riapre a 2,32 (−86%), con 24,9 milioni di pezzi scambiati e nessuno split registrato da Yahoo. Uno split o un raggruppamento non spiegherebbe una discesa con quei volumi;
  - la pipeline riscala la storia ×0,144, quindi oggi CTD risulta sopra la media a 50 e a 200 sedute. Sui prezzi veri è molto sotto.
  - durante la sospensione, per un anno, le barre ferme con volume 0 contavano come «chiusura del giorno».
- Effetto: ASX200 a50 e a200 hanno un titolo in più in tutte le ultime 6 sedute. Al 20/10: 71/195 = 36,4% invece di 70/195 = 35,9%. Il mio ricalcolo coincide esattamente con l'app solo se applico la stessa riscalatura.
- Prova: `python3 -I c2_indices.py ASX200` (stampa «storia riscalata … ('2026-09-03', 0.144)» e le righe identiche); `python3 -I c8_stale_members.py` (CTD.AX fermo 261 sedute, salto 0,144).
- Proposta: non riscalare quando le sedute prima del salto hanno volume 0 (titolo sospeso), oppure chiedere che il salto non sia accompagnato da volumi normali. Trattare come mancanti le barre segnaposto con volume 0 anche per i titoli degli indici (`dropStale`, oggi usato solo per gli ETF globali).

### Minori

**3. Bitcoin: il prezzo del 19/10 è la chiusura del 18/10, e la nota dell'app dice altro** (confermato)
- `prices_macro.json` BTC-USD e `prices_global.json` BTC-EUR al 19/10 valgono 82.017,60 e 73.057,18. Sono le chiusure Yahoo del 18/10, perché Yahoo ha la barra del 19/10 vuota (`close: null`), mentre quelle del 18 e del 20 ci sono.
- Né `copied` né l'app lo segnalano. La nota della tabella Prezzi dice «per l'ultima seduta, il prezzo al momento dell'aggiornamento», ma qui il prezzo è di circa 30 ore prima. Il 1G mostrato (+0,6%/+0,7%) copre in realtà dal 16 al 18/10. Si sistema da solo se Yahoo riempie la barra.
- Prova: `python3 -I c1_macro.py` (righe BTC), oppure `curl 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=5d&interval=1d'`.
- Proposta: per le criptovalute, se la barra del giorno della seduta è vuota, usare la barra del giorno dopo fino all'ora della corsa, oppure segnare il valore come ricopiato.

**4. Taiwan e Australia: indici al 20/10 mentre gli altri sono al 19/10**
- È voluto (ogni indice è all'ultima seduta della sua borsa, `ixMeta` lo dice), ma rende possibile il problema 1. Solo informativo.

**5. Cali forti SPX e settori dal 15/09 al 01/10/2026: composizione diversa da quella della breadth** (confermato)
- La ricostruzione del 18/10 (`backfill_capitulation.py`) completa le sedute dopo la fine della release Johnbrick con i membri di oggi, come dice la docstring. La breadth invece usa la lista di allora.
- Effetto: per 13 sedute `n` dei cali forti differisce di 1 da `n` della breadth in XLK (75 contro 74), XLB (24 contro 25), XLC (22 contro 23) e SPX (502 contro 503). Il 25/09 XLK conta 2 cali ≤−5% e 1 ≤−7%, contro 1 e 0 con la composizione di allora: è TWLO, entrato il 06/10.
- Il README dice «con la stessa composizione della breadth».
- Prova: `python3 -I c2_breadth.py`, sezione cali forti, righe del 24-25/09. Per l'incoerenza interna ai file, confrontare `n` di `capitulation.json` e di `breadth.json` dal 2026-09-15 al 2026-10-01.
- Proposta: rifare quelle 13 sedute con la lista di allora (`sp500_members.json`), oppure dirlo nel README.

**6. EEM: nelle feste asiatiche lunghe la breadth si calcola su metà dei titoli e salta di alcuni punti** (confermato, non detto)
- Con la regola «ultima seduta entro 5 giorni», nelle feste cinesi (Capodanno, settimana d'oro) escono dal conteggio quasi 500 titoli su 1.182.
- Dal 10/2024 ci sono 11 sedute con n tra 627 e 708: per esempio 07/10/2026 con 708 titoli, 03/02/2025 con 48,7% contro 57,3% delle sedute vicine, 07/10/2024 con 69,7% contro 77,5%.
- La regola è nel README («Calendari», pensata per lo STOXX 600), ma l'app non segnala queste sedute e il grafico mostra i salti.
- Prova: `python3 -I c8_coverage.py`.
- Proposta: non pubblicare o segnare le sedute con n/membri sotto una soglia (per esempio 80%), oppure tenere l'ultimo prezzo dei titoli in festa per più giorni.

**7. YTD di Madrid non detto nella guida**
- La guida («Dati gratuiti») dice che gli ETF di Parigi e Amsterdam partono dall'ultima seduta di Milano dell'anno. Lo stesso vale per LYXIB.MC (Madrid): +12,4% contro +12,7% dal 31/12 della sua borsa.
- Prova: `python3 -I c1_prices.py prices_global`, riga LYXIB.MC; YTD nel JSON.

**8. Sedute di Milano tolte dal calendario globale e non elencate**
- Il 24/10/2025 e il 06/03/2026 non sono nel file globale: Yahoo non ha la barra per la maggior parte degli ETF (il 06/03/2026 per 36 su 46, mentre FTSEMIB.MI ce l'ha).
- La regola della maggioranza è nel README, ma come esempio sono citate solo le sedute del 13-20/09/2022. Nell'app il 1G del 09/03/2026 copre due sedute senza dirlo.
- Prova: `node c7_dates.mjs`, riga prices_global.json. Per le barre, il controllo nel log di questa sessione con `series(s,'5y')` sui 46 ETF.

**9. CSI 300 fermo al 16/10**
- 510300.SS su Yahoo ha la barra del 19/10 vuota (`close: null`), mentre i titoli del CSI 300 (600519.SS, 000001.SZ…) hanno la seduta. Quindi l'indice non si aggiorna, prezzo e breadth compresi.
- L'app mostra la data giusta («chiusura del 16/10/2026») e `check_fresh` avvisa dopo 12 giorni. Solo informativo; eventualmente si potrebbe usare un secondo simbolo di prezzo (000300.SS ha solo la seduta in corso, quindi non basta).

**10. Indici europei ed EEM: prezzo al 19/10, breadth, stato e cali forti al 16/10**
- Alla corsa del mattino Yahoo non ha ancora le chiusure europee dei titoli. Nel tabellone la riga mescola il drawdown e il 1G del 19/10 con breadth e stato del 16/10. Lo dice solo il tooltip della cella «Ultimo» («breadth al 16/10/2026»).
- La corsa delle 11:40 UTC dovrebbe allineare. Solo informativo; eventualmente segnarlo anche nella cella della breadth.

**11. LYXIB.MC: il prezzo finale della quotazione arriva prima dell'asta di chiusura di Madrid** (DUBBIO, da ricontrollare)
- Per l'ultima seduta l'app usa `regularMarketPrice`, dichiarato nel README. Per LYXIB.MC il suo orario è 17:29:56 di Madrid, prima dell'asta di chiusura (17:30-17:35); per gli ETF di Milano e Xetra è dopo (17:35:20).
- Nella 0.9.0 lo scarto era stato dello 0,16%. Alle 07:00 UTC Yahoo non aveva ancora la barra del 19/10, quindi non ho potuto confrontare.
- Per ricontrollare: `curl 'https://query1.finance.yahoo.com/v8/finance/chart/LYXIB.MC?range=5d&interval=1d'` e confrontare la chiusura del 19/10 con 201,60 di `prices_global.json` (9a81dd8).

### Dubbi non confermati (non sono errori dell'app, per quanto ho visto)
- DAX e SX5E al 09/10: a50 15 e 14 nel mio ricalcolo, 14 e 13 nell'app. I titoli al limite sono BAS.DE (+0,09% sulla media 50) e DHL.DE (+0,07%): basta una revisione di Yahoo al centesimo. Il 09/10 è uscito dalla finestra delle 5 sedute ricalcolate.
- IBOV al 19/10: oggi Yahoo chart ha per 51 titoli su 76 una barra del 19/10 vuota con volume 0, mentre alle 05:38 la pipeline (spark) l'aveva per tutti. Con la regola dei 5 giorni il mio conteggio è 57/76 contro 58/76. Da ricontrollare quando Yahoo si stabilizza.
- Breadth del 24-25/09 di XLC e SPX: nel mio ricalcolo mancano PSKY e WBD, che oggi non hanno prezzi su Yahoo. È un limite del ricalcolo, non dell'app.

## Problemi della 0.9.0: risolti o no

| 0.9.0 | Stato oggi | Prova |
|---|---|---|
| ALTA 1, il filtro degli errori di stampa scartava cali veri | Risolto. 10/10/2008: 79 cali ≤−5% e 46 ≤−7%; 08/04/2025: 41/11; 03/04/2020: 51/11, uguali al conteggio grezzo. Le sedute recenti sono identiche al mio ricalcolo con il filtro nuovo | `c6_cap.py` (ultime righe), `c2_breadth.py`, `c2_indices.py` |
| ALTA 2, barre segnaposto di Yahoo prese per chiusure | Risolto. Nessuna barra segnaposto usata nei 78 ticker; le sedute di Milano del 13-20/09/2022 sono fuori dal calendario; Xetra 04-06/12/2023 è segnato come ricopiato (`copied` 538-540) | `c1_prices.py`, colonne «segnap.usati» e «ricop.ok» |
| MEDIA 3, spark perde sedute | Risolto per le sedute controllate. FTSE 100 al 16/10: 67 titoli sopra la media a 20, come chart; 16 indici × 6 sedute identici a chart (eccezioni nei problemi 2 e nei dubbi) | `c2_indices.py` |
| MEDIA 4, prezzi ricopiati non detti | Risolto. `copied` coerente con Yahoo per tutti gli ETF; asterisco nella tabella Prezzi (CSNDX YTD «+22,6%*»); nota nella tabella e nella guida | `c1_prices.py`, `b1_app.cjs` |
| MEDIA 5, CSI 300 con 2 decimali | Risolto. `ps` 10000; ultimo 4,236, 1G −0,1%, drawdown −16,79 come Yahoo | `c3_dd.py`, `b2_compare.py` |
| BASSA 6, LYXIB con un prezzo diverso dalla chiusura all'ultima seduta | Il meccanismo resta, dichiarato nel README; da ricontrollare (problema 11) | — |
| BASSA 7, YTD dalla seduta di Milano | Detto nella guida per Parigi e Amsterdam; manca Madrid (problema 7) | — |
| BASSA 8, cambio di DBMF | Non ricontrollato il cambio; il raccordo è esatto (1,05·10⁻⁶) | `c1_macro.py` |
| BASSA 9, pesi stimati nel cap-weighted | Ora nel README; i risultati coincidono entro 0,05 punti | `c9_capeq.py` |
| BASSA 10, testi | README aggiornato (S5TH tra −0,1 e +0,4; cap-weighted anche su XLP, XLB e XLRE); percentile della tabella Prezzi detto in `pxNote` | — |

## Cosa non ho controllato
- La breadth ricalcolata di STOXX 600, Russell 2000, MSCI Emerging, KOSPI 200 e CSI 300: troppi titoli per scaricarli con moderazione (circa 4.000). Ho però controllato i loro prezzi, drawdown, percentili, cali forti (somme, soglia, allerta) e lo stato.
- Il portafoglio di riferimento, la storia della divergenza (`hist`) e i numeri dei singoli titoli della vista 7 (verificati nella 0.9.0; in `capeq.js` è cambiato solo il campionamento settimanale di `hist`).
- Bottom Map, tabelle degli episodi e grafici; la vista su telefono. Ho controllato il browser solo a 1440 px, ma i valori sono gli stessi nei due temi.
- La breadth degli indici nella storia lontana (controllata nella 0.9.0; i valori di prova di allora sono invariati: N225 07/04/2025 191/135/54, DJI 20/11/2008 0/29, DAX 23/03/2020 1/38).
- Il cambio EURUSD usato per DBMF prima del 2025.
