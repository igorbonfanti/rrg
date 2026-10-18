# Sector Monitor · audit dei testi, dei numeri e delle avvertenze

18/10/2026 · versione 0.9.0 (ramo `claude/great-noether-2f1ude`, commit 07a09d7) · dati al 16/10/2026.
Solo lettura: `/home/user/rrg` non è stato toccato.

**Script di ricalcolo** (importano i moduli dell'app da `/home/user/rrg/js/` e leggono `data/` e `config/`), in `script/`:

| Script | Cosa ricalcola |
|---|---|
| `avvicinamento.mjs` | statistiche dell'Avvicinamento: settori dal 2005, 22 indici, solo i 10 principali |
| `livelli.mjs` | quota di sedute sotto i livelli blu, 3° percentile, membri e punti per titolo |
| `copertura.mjs` | copertura dei membri per anno (S&P 500, settori, indici) e data d'inizio della breadth |
| `suth.mjs` | i tre valori SUTH citati |
| `rotazione.mjs` | «entro 3 punti», «entro 10 punti», «stesso quadrante circa tre volte su quattro» |
| `cali.mjs` | prova dei cali forti sui 21 indici (Taiwan esclusa), in titoli e in percentuale |
| `risultati_indici.mjs` | «Risultati storici» del README (75 trigger, 39 episodi, 54 episodi) |
| `zonablu.mjs` | «nella zona blu si formano spesso i bottom, di solito in anticipo» |
| `extra.mjs` | membri dei settori senza settore noto, sedute in allerta nel 2008/2020/2025, inizio della storia di XLC e XLRE |

L'output di tutti gli script è in `script/output.txt`.

---

## 1. In sintesi

- **Statistiche dell'Avvicinamento.** Si ricalcolano esattamente: settori 59/73, 41%, 23 sedute; indici 96/134, 47%, 20 sedute (9 con la fascia fissa). Lo script citato per gli indici però (`ricerca/attenzione/script/indici.mjs`) oggi legge solo `data/indices.json`, cioè i 10 principali, e dà 46/62. La regola «ricalcolabile con uno script del repository» non è più rispettata.
- **Errori nei testi.**
  - Il riquadro del livello blu degli indici dice che il 3° percentile «ritrova i livelli di Rea sugli indici che li hanno». Con i dati di oggi li ritrova solo sull'S&P 500 e sul Russell 2000, e sta entro un punto su 6 dei 13 indici con un livello di Rea.
  - Per i cali forti si legge che «nei crolli rapidi (2020…) l'allerta dura pochi giorni», e nell'app che 10 o più sedute in allerta sono «il segno dei mercati orso lunghi». Nel 2020 la mediana è stata di 12 sedute in allerta in 3 mesi, su 27 serie oltre la soglia di 10.
  - Nel README la fascia dei settori «dal 2,4% al 4%» lascia fuori XLRE, che è al 5,8%.
  - Per lo scarto da S5TH il README dice «tra 0 e +0,4 punti», `scripts/backfill_breadth.py` dice «tra −0,1 e +0,9»: le due fonti si contraddicono.
- **Approssimazioni non dichiarate o dichiarate poco.**
  - Fino al 2012 la breadth dei settori esclude i membri usciti prima del 2013, che non hanno un settore noto: nel 2005 i membri di settore sono 331 su 500 e quelli con prezzi 292, cioè il 58% del vero (contro il 64-65% dichiarato per l'S&P 500).
  - Negli universi globali, un ETF senza prezzo in una seduta prende l'ultimo prezzo noto, e l'app non lo dice. È proprio uno degli esempi di CLAUDE.md.
  - Il Nasdaq-100 «d'epoca» parte con una copertura del 59%, ma nell'app si mostra solo la copertura di oggi.
  - Il confronto «seduta qualsiasi» dei cali forti è una media, mentre altrove è una mediana, e il testo non lo dice.
  - XLC e XLRE dicono «dal 2005», ma i loro episodi possono cominciare solo dal 2019 e dal 2016.

---

## 2. Tabella delle affermazioni

Esito: **OK**, **SBAGLIATO**, **NON VERIFICABILE** (NV, con i dati del repository), **IMPRECISO** (vero in parte, oppure detto in modo che può trarre in inganno).

### 2.1 Avvicinamento

| File:riga | Affermazione | Come verificata | Esito | Valore ricalcolato |
|---|---|---|---|---|
| README.md:67, guida.html:161, index.html:715, js/bottom.js:230, js/bottom.js:409, js/signals.js:85 | dal 2005, 59 tocchi del livello su 73 avvisati | `avvicinamento.mjs` (stessa definizione di `fasce.mjs`: tocco dopo 60 o più sedute sopra il livello, allarme dopo 20 o più sedute sopra la soglia, iniziato almeno 5 sedute prima del tocco ed entro 126) | OK | 59/73 |
| README.md:67, guida.html:161, index.html:715, js/bottom.js:409 | anticipo mediano «circa un mese» | idem: mediana dell'anticipo degli allarmi che arrivano al livello | OK | 23 sedute (anche l'ultimo allarme prima dei tocchi avvisati: mediana 23) |
| README.md:67, guida.html:161, index.html:715, js/bottom.js:230 | meno della metà degli avvicinamenti arriva al livello | idem | OK | 91/224 = 40,6% |
| README.md:79, index.html:710, js/indices.js:376 | 22 indici: anticipo mediano 20 sedute, 96/134, 47% | idem, su `indices.json` più `indices_more.json` | OK | 20 sedute, 96/134, 164/348 = 47,1% |
| README.md:79 | 9 sedute con la fascia fissa di 10 punti | idem | OK | 9 sedute (83/134, 57%) |
| index.html:710, js/indices.js:376 | «dal 2001 sui 22 indici» | prima data della breadth | IMPRECISO | Dow Jones dal 03/01/2000 e S&P/TSX 60 dal 01/02/2000. La statistica non usa il percentile del drawdown, quindi comprende anche il 2000 |
| ricerca/attenzione/fasce.md:41 (citato da signals.js:85) | lo script degli indici riproduce 96/134 | `ricerca/attenzione/script/indici.mjs` legge solo `data/indices.json` | SBAGLIATO (lo script non riproduce più il dato) | oggi ottiene 46/62, 53%, 22 sedute (10 indici principali) |
| js/bottom.js:142, guida.html:160 | «in un calo deciso il livello blu è a circa due settimane» | per costruzione: la soglia è il livello più il calo al 90° percentile in 10 sedute | OK (vero per definizione) | — |

### 2.2 Livelli blu, storia, membri

| File:riga | Affermazione | Come verificata | Esito | Valore ricalcolato |
|---|---|---|---|---|
| README.md:129-141 | livelli blu dei settori | `config/thresholds.json` | OK | identici |
| README.md:174-202 | livelli blu degli indici, fonte (Rea o 3° percentile), «main» | `config/indices.json` | OK | 22 su 22 coincidono |
| README.md:76, index.html:710, guida.html:307 | 10 indici principali e loro elenco | `"main": true` | OK | 10, stesso elenco |
| guida.html:305, index.html:710 | 22 indici e loro elenco | config | OK | 22 |
| README.md:174-202 | anni d'inizio della breadth (tutti) | prima `pct200` non nulla in `indices*.json` | OK | tutti coincidono (Dow 2000, Russell 09/2017, TSX 2000…) |
| README.md:208 | i livelli di Rea lasciano sotto circa il 3% delle sedute: S&P 500 3,0%, settori dal 2,4% al 4% | `livelli.mjs` | SBAGLIATO | S&P 500 2,97%; settori dal 2,43% (XLP) al 3,99% (XLB), **ma XLRE 5,76%**. La ricerca (`ricerca/indici/piano.md:32`) lo scriveva |
| README.md:208 | «la regola ritrova i suoi livelli su S&P 500, Nikkei, CAC e SMI» | 3° percentile oggi | IMPRECISO | S&P 500 13,3 (Rea 13), Nikkei 9,5 (8), CAC 5,1 (4), **SMI 0,0 (3)**. La ricerca diceva «scarto di 1-3 punti» (F1-risultati.md:10) |
| js/indices.js:367 | 3° percentile: «la regola che ritrova i livelli di Rea sugli indici che li hanno» | 13 indici con il livello di Rea | **SBAGLIATO** | coincide (arrotondato) solo su S&P 500 e Russell 2000; entro 1 punto su 6 di 13; Nasdaq-100 11 contro 18, Dow 10 contro 15, DAX 3 contro 7, MSCI EM 22 contro 15, SMI 0 contro 3 |
| README.md:174-202 (p3) | i livelli «3° percentile» | 3° percentile arrotondato | OK | 9 di 9 (STOXX 9, FTSE 12, TSX 23, SX5E 7, CSI 14, KOSPI 15, Taiwan 8, Nifty 10, ASX 14, Ibovespa 11) |
| README.md:110 | SUTH 42,85 / 82,75 / 3,57 identici | `suth.mjs`, valori troncati come in `test/signals.test.js` | OK | 42,857 / 82,759 / 3,571 (12/28, 24/29, 1/28) |
| README.md:111 | S5TH: scarto tra 0 e +0,4 punti | nessuna serie S5TH nel repository | NV, e **in contraddizione** | `scripts/backfill_breadth.py:10` dice «tra −0,1 e +0,9 punti» |
| README.md:112, guida.html:393 | copertura dal 65% nel 2005 all'80% nel 2009, oltre il 90% dal 2014, 99% dal 2021 | `copertura.mjs`: n/membri dell'S&P 500 | OK (S&P 500) | 2005 64-65%, 2009 79-80%, 2014 90-91%, 2021 media 98,6% (minimo 98%) |
| (implicito nelle stesse righe) | la stessa copertura vale per i settori | `extra.mjs` | **IMPRECISO / non dichiarato** | 2005: titoli con prezzi nei settori 292 su 500 membri = **58%**; i membri usciti prima del 2013 non hanno settore (backfill_breadth.py:20) |
| README.md:209, js/indices.js:167 | membri di oggi: «3-6 punti più alta» nelle fasi intermedie | `ricerca/indici/fonti-dati.md:58` | IMPRECISO | in media +4,3 (mediana +4,6), **da −6,9 a +18,1**; +4/+8 anche nel 2024-25 |
| README.md:190, 198, 201 | Russell circa 1.970, Taiwan circa 76, EEM circa 1.180 | membri all'ultima seduta | OK | 1.975 / 76 / 1.182 |
| README.md:264 | circa 500 titoli | SPX | OK | 503 |
| README.md:274, guida.html:385 | indici: circa 4.600 titoli | ticker unici in `data/index_members/` | OK | 4.640 unici (5.487 con le ripetizioni) |
| README.md:81 | indices.json circa 300 KB compressi | gzip | OK | 300 KB |
| guida.html:134 | Utilities 31 titoli, uno vale 3,2 punti | breadth.json | OK | 31; 3,23 |
| index.html:317 | «nei settori piccoli (Utilities, Real Estate, Energy) uno solo sposta la breadth di 3–5 punti» | n all'ultima seduta | IMPRECISO | 3,2 / 3,3 / 4,8, ma XLC (22 titoli, 4,5 punti) e XLB (24, 4,2) sono più piccoli di Utilities e non sono citati |
| index.html:495 | SMI 20 titoli, 5 punti; STOXX 600 meno di 0,2 | n | OK | 20; 602 (0,17) |
| guida.html:140 | percentile: «più profondo del 90% delle sedute dal 2005» | `depthPercentile` su `sectors.json` | IMPRECISO | sessioni dal 2004 (ETF dal 02/01/2004); XLRE dal 2015, XLC dal 2018 (percentile dal 2016 e dal 2019) |
| index.html:272 | prezzi: rosso se oltre l'80% delle sedute degli ultimi 5 anni; segno grigio = peggiore dei 5 anni | `prices*.json` parte dal 18/10/2021 | OK | il percentile richiede 252 sedute, quindi conta dal 2022 |
| guida.html:185, index.html:124 | tacca: peggior drawdown a 5 anni | bottom.js:189, 1.260 sedute | OK | — |
| README.md:19 | XLU −15,1% con i dividendi al 29/09/2026; GLD −22,8% | drawdown di sectors.json e prices_macro.json | OK | −15,06%; −22,79% |
| README.md:19 | XLU −16,8% sul solo prezzo al 29/09 | `max52` esiste solo per l'ultima data | NV | — |
| README.md:20, index.html:737 | GLD 29/01/2026: 509,70 contro 495,90 | `max52.ih` e la chiusura | OK | 509,70 / 495,90 |

### 2.3 Stati, episodi, risultati

| File:riga | Affermazione | Come verificata | Esito | Valore ricalcolato |
|---|---|---|---|---|
| guida.html:149-154, README.md:115-125, js/bottom.js:230-, index.html:716-719 | soglie della macchina (10 punti, 70°/85°, 2 chiusure, 5 punti o 2 titoli, 60 sedute, 20, 63, max(40, livello+25)) | `DEFAULT_PARAMS` e `thresholds.json` | OK | identiche |
| index.html:718 | trigger: «la breadth risale di almeno 5 punti sopra il livello… con una conferma» | runMachine:183 | IMPRECISO | manca «e di almeno 2 titoli sopra il minimo della zona blu» (c'è nel README e in parte nella guida) |
| js/format.js:77 | «servono la breadth e le conferme (una qualsiasi tra le quattro…)» | explainState:298 | SBAGLIATO quando ne servono due | con zona blu oltre 60 sedute o dopo un fallimento le conferme richieste sono 2 |
| guida.html:151, index.html:717 | nella zona blu «si formano spesso i bottom, di solito in anticipo» | `zonablu.mjs` | OK | dopo l'ingresso il prezzo scende ancora entro 6 mesi in 45 casi su 47; il minimo dei ±6 mesi cade entro 3 mesi dall'ingresso in 29 su 47 |
| README.md:212 | 9 indici: 75 trigger dal 2001, mediana a 12 mesi +14,8%, 49 positivi; dal 2005, 39 episodi, +18,7%, 34 positivi | `risultati_indici.mjs` | OK | 75 / +14,8 / 49; 39 / +18,7 / 34 |
| README.md:212 | 13 indici con limiti: 54 episodi, mediana +23,4%, 46 positivi | idem | OK con riserva | 54 / 46 positivi; mediana +23,4 con la media dei due valori centrali, **+22,8 con la regola dell'app** (`signalContext` prende il valore centrale più basso) |
| README.md:212 | (scelta degli intervalli) | idem | da segnalare | «tutti i trigger dal 2001» ma «ultimo trigger dal 2005»; dal 2001 l'ultimo trigger dà 50 / +18,0 / 40 |
| README.md:63, guida.html:262, bottom.js:245 | scorciatoie ai «minimi delle crisi»: nov 2008… | minimo di SPY (chiusura rettificata) | IMPRECISO | 20/11/2008 è un minimo intermedio: il minimo della crisi è il **09/03/2009** (49,56 contro 54,46). Le altre date coincidono con i minimi di chiusura |
| index.html:534, README.md:212 | nei mercati orso lunghi (2001-2002, inizio 2008) i trigger sono stati spesso rimbalzi falliti | ricerca F1 | NV qui (ricerca qualitativa) | — |

### 2.4 Cali forti

| File:riga | Affermazione | Come verificata | Esito | Valore ricalcolato |
|---|---|---|---|---|
| README.md:155, 206, guida.html:314-316, index.html:708, 710, cap-view.js:139 | preset −7% su 5 sedute, 99° percentile delle sedute precedenti, 3 anni, almeno 5 cali | `CAP_DEFAULT` | OK | q 0,99, warm 756, min 5 |
| guida.html:316 | «un −7% è frequente in Corea e raro in Svizzera» | cali −7% ogni 10.000 titoli-seduta | OK | KOSPI 200 96,9 contro SMI 42,2 |
| guida.html:323, README.md:206 | dopo le allerte, in media meglio di una seduta qualsiasi; quasi tutto il vantaggio dai crolli rapidi | `cali.mjs` (modalità titoli, come il preset) | OK | eccesso medio a 12 mesi +11,4 punti (98 episodi); senza mar 2020 e apr 2025 +3,1 (63) |
| guida.html:323 | tra agosto 2007 e settembre 2008 l'indice era più in basso un anno dopo | idem | OK quasi sempre | 12 casi su 13 (FTSE 100 16/09/2008: ±0%) |
| **guida.html:317** | «nei crolli rapidi (2020, aprile 2025) l'allerta dura pochi giorni» | `extra.mjs`: sedute in allerta per serie in 3 mesi | **SBAGLIATO per il 2020** | 2020: mediana 12, massimo 27; 2025: mediana 4; 2008: mediana 19 |
| **js/cap-view.js:113, 140** | con 10 o più sedute in allerta negli ultimi 3 mesi: «è il segno dei mercati orso lunghi» | idem | **SBAGLIATO** | tra marzo e giugno 2020 (crollo a V) 27 serie su 32 superano 10 sedute |
| guida.html:323, README.md:206 | la prova sui 22 indici | ricerca/quant-rea/…/capitolazione/README.md | IMPRECISO | la prova di ricerca usa la **% dei membri**, il preset dell'app conta i **titoli**: le conclusioni reggono in tutte e due (in % +12,7 e +3,0) |
| cap-view.js:136-138 | «Per confronto, dopo una seduta qualsiasi della stessa storia: +3M …, +12M …» | capOutcomes:174-178 | IMPRECISO | è una **media** (in `signalContext` è una mediana) e il testo non lo dice |

### 2.5 Rotazione, portafoglio, titoli

| File:riga | Affermazione | Come verificata | Esito | Valore ricalcolato |
|---|---|---|---|---|
| index.html:96, 188 | Nuova: «di solito entro 3 punti da 100» | `rotazione.mjs`, settori contro SPY dal 2022 | OK | 99,8% (settimanale) |
| index.html:198 | Medie semplici: sui settori entro 10 punti | idem | OK | 99,1% |
| index.html:203, README.md:238, guida.html:246 | stesso quadrante circa tre volte su quattro | idem | OK | 72,6% settimanale, 72,0% giornaliero |
| index.html:199, README.md:238, guida.html:246 | coincide al centesimo con StockCharts (11 letture del 25/09/2026); con SPY circa 0,2 più basso | letture private (CLAUDE.md) | NV | — |
| README.md:39, 47, guida.html:230 | pesi del portafoglio e classi | universe.json | OK | identici (Trend 0) |
| guida.html:238 | Trend: +21% nel 2008, +27% nel 2022 «per l'indice dei trend follower» | ricerca/managed-futures/rapporto.md:17,21 (Cambridge Associates, Hedgeweek) | NV con i dati dell'app; la fonte non è citata | +20,9 / +27,3 nella ricerca |
| README.md:271, index.html:681 | equal-weight in media a 0,5 punti dagli ETF RSP* | RSP* settoriali non sono nei dati | NV | sull'S&P 500, contro RSP (chiusura rettificata di Yahoo): 0,4 / 0,9 / 1,5 / 2,0 punti su 3M/6M/YTD/1A; il confronto mescola il solo prezzo con il rendimento totale |
| index.html:682 | «3 mesi al 16/10/2026, Tecnologia: 8,1% contro 5,8%» | sector_members.json, confronto-rea.md | IMPRECISO | 8,1 è letto da uno screenshot (NV); 5,8 è il buy-and-hold dal 17/07, mentre l'app mostra **5,7%** (63 sedute) |
| index.html:682 | «su 3 mesi la differenza resta di solito entro un punto» | letture di Rea (confronto_rea.mjs) contro l'app | IMPRECISO | equal-weight entro 1 punto in 9 settori su 11 (media 0,6); cap-weighted solo in 6 su 11 (media 1,1, Energia −2,6, Tecnologia −2,4) |
| index.html:682 | cambia chi è davanti in Tecnologia e Industriali | idem | OK | XLK, XLI |

### 2.6 Dati, versione, tasti

| File:riga | Affermazione | Come verificata | Esito | Valore corretto |
|---|---|---|---|---|
| guida.html:383 | aggiornamento «verso mezzanotte e mezza ora italiana» | `.github/workflows/update-data.yml`: cron 22:40 UTC | IMPRECISO | 00:40 con l'ora legale, **23:40 d'inverno**, più la durata della corsa |
| index.html:731, js/app.js:22 | «verso l'1 (ora italiana)» | idem | IMPRECISO e in contraddizione con la guida | come sopra |
| guida.html:383 | recuperi «al mattino presto e a metà giornata» | 03:20 e 11:40 UTC | OK | 05:20 e 13:40 con l'ora legale |
| README.md:99 | tasti `1`–`6` viste | app.js:918, 7 viste | SBAGLIATO | `1`–`7` (la guida e la guida rapida lo dicono giusto) |
| js/version.js:10 | «… sommati su 5 sedute, con la soglia di allerta» | testo | frase troncata | «… con la soglia di allerta al 99° percentile delle sedute precedenti» |
| README.md:155-169 contro version.js | note della 0.9.0 | confronto | OK | 0.9.0, 18/10/2026; `version.json` coincide |
| README.md:283, 167, guida.html:297 | invii Telegram riprovati per 5 sedute | send_alerts.js:50 | OK | 5 |
| README.md:273, 277 | 99% dei membri (settori), 75% (indici), ultime 5 sedute ricalcolate | fetch_breadth.js:178, fetch_indices.js:32 | OK | — |
| README.md:260 | ottobre 2025 non pubblicato; date fino ad agosto 2026 da ALFRED | prices_macro.cpi, config/cpi_releases.json | OK | manca 2025-10; ultima data da ALFRED 2026-08 |

---

## 3. Approssimazioni e avvertenze

Esito: **detta** dove si vede il numero; **in parte** (solo nella guida o nel README, oppure in modo vago); **non detta**.

| Approssimazione (dove nel codice) | Dove si vede il numero | Cosa dice l'app | Esito |
|---|---|---|---|
| Ultimo prezzo noto per un ETF senza quotazione in una seduta di Milano (fetch_data.js, README:252) | Rotazione, universi 1-4 e 6 | niente (README soltanto) | **non detta**: è uno degli esempi di CLAUDE.md |
| Calendario globale fatto con le date in cui quota la maggioranza degli ETF (README:252) | idem | niente | non detta |
| Bitcoin e dollar index: ultimo prezzo a ogni seduta (README:254, 258) | universi 1 e 5 | detto solo per l'universo 5 (index.html:255) | in parte: per Bitcoin in euro nell'universo 1 non c'è nulla, e l'orario dell'ultimo prezzo (probabilmente mezzanotte UTC, non le 17:30: da verificare) non è detto |
| Bitcoin escluso se fermo da più di 4 giorni | idem | niente | non detta (bassa) |
| CPI a gradini dal giorno di uscita (synthetic cpi) | universo 5 | detto (index.html:241, 254; data di uscita nella testata) | detta |
| Valori del CPI rivisti (vintage di oggi) con le date della prima uscita | idem | «non usa dati prima che fossero noti» (index.html:254) | **in parte**: i valori sono quelli rivisti, quindi la frase promette troppo |
| DBMF americano convertito in euro prima del 28/04/2025 (spliceHistory) | Trend | nel nome dell'ETF (tooltip e tabella) e nella guida:242 | detta («raccordato al primo prezzo» manca, bassa) |
| Prezzo anomalo corretto (global) | testata dell'universo | «n prezzi anomali corretti» con il dettaglio (app.js:668) | detta |
| Prezzo anomalo corretto (macro) | universo 5 | `macroFreshness` non lo mostra (app.js:676-681) | **non detta** se succede (oggi `repaired` è vuoto) |
| Storia della breadth ricostruita con copertura del 64-65% nel 2005 | viste 1, 3, 4, 5 | guida «Limiti», README; nella vista 4 «storia ricostruita… con la composizione di allora» (index.html:360), nella vista 5 «(ricostruita)» (index.html:426) | in parte: nessun numero dove si vedono episodi e stati |
| **Settori fino al 2012 senza i membri usciti prima del 2013** (backfill_breadth.py:20) | breadth dei settori, zone blu, episodi, alert | niente; il README:108 lascia credere che tutti i titoli usciti abbiano un settore | **non detta** (alta) |
| Settori GICS di oggi riportati al passato (XLC dal 2005, Real Estate) | breadth dei settori | solo README:108 | in parte |
| XLC e XLRE: ETF dal 2018 e dal 2015, percentile dal 2019 e dal 2016 | vista 4 («N zone blu dal 03/01/2005», «Una seduta qualsiasi dal 2005»), guida:140 | l'app scrive «dal 2005» | **sbagliata** nella data (media) |
| Membri di oggi per 18 indici | vista 6 | «membri di oggi» con «3-6 punti» (indices.js:167), Situazione (indices.js:385), guida | detta, ma il «3-6 punti» sottostima (fino a +18) |
| Nasdaq-100 «d'epoca» con copertura del 59% nel 2008 (Dow 87% nel 2000) | vista 6 | tooltip «copertura oggi 101/101»; Situazione «nella storia la copertura è più bassa» | in parte: nessun numero storico |
| Breadth degli indici con l'ultima seduta del titolo fino a 5 giorni prima; seduta pubblicata con il 75% dei prezzi | vista 6 | «breadth al» se la data è diversa; nient'altro | in parte (bassa) |
| Prezzo-proxy degli indici (KOSPI per KOSPI 200, ETF XIU, 510300, EEM in dollari) | vista 6 | `note` nella Situazione e nel tooltip «con limiti» | detta; però il testo generale «solo prezzo, valuta locale» (index.html:470, guida:308) è falso per EEM (dollari) |
| Solo prezzo (indici) contro rendimento totale (ETF settoriali) | viste 4 e 6 | detto (index.html:360, 534; sector-chart «SOLO PREZZO») | detta |
| Massimo intraday contro massimo di chiusura | Monitor, Prezzi, indici | detto (DDP_TIP, ddpTip, indices.js:377, guida:142) | detta |
| Filtro degli errori di stampa nei cali forti (rientro il giorno dopo, mediana entro ±2%) | schede Cali forti | detto (cap-view.js:141, guida:323) | detta |
| Esclusione dei crolli oltre il 60% in giornate normali | idem | solo README:206 | **non detta** nell'app (bassa) |
| Rendimento rettificato per gli eventi straordinari (S&P 500, oltre 5 punti di differenza) | idem | solo README:206 | in parte (bassa) |
| Taiwan senza cali forti (noCap) | vista 6 | detto (cella, scheda, guida) | detta |
| **Taiwan: la stessa chiusura non rettificata per i dividendi in azioni entra anche nella breadth** (medie a 200 sedute) | breadth, stati ed episodi di Taiwan | niente | **non detta** (da verificare: è la stessa causa dichiarata per i cali) |
| Errori di scala di Yahoo corretti nei prezzi dei membri (36 titoli, fonti-dati.md §1.5) | breadth degli indici | niente | non detta (bassa) |
| Livelli blu e regola dell'Avvicinamento scelti sulla stessa storia (in-sample) | ovunque | «nel campione», «livelli di oggi scelti conoscendo anche quella crisi», guida «Senno di poi» | detta |
| Soglia del 3° percentile calcolata su tutta la storia, futuro compreso | vista 6 | niente di specifico | in parte (rientra nel «senno di poi») |
| Mediana dell'app = valore centrale più basso con un numero pari di casi | tutte le tabelle «Per confronto» | niente | non detta (bassa) |
| Vista 7: indici simulati con i pesi IVV, prezzi senza dividendi, titoli acquisiti esclusi | vista 7 | detto (index.html:681, `titData` con l'elenco) | detta; ma la guida rapida dice «rendimento reale degli indici» (index.html:711) |
| Rotazione «6 · Indici»: solo 9 dei 22 indici, SMI sostituito da MSCI Switzerland | vista 2, vista 6 | «La rotazione degli stessi indici… universo 6 · Indici» (index.html:470), «ETF in euro sugli indici della vista 6» (guida:209, index.html:729) | **in parte**: lascia credere che ci siano tutti |

---

## 4. Coerenza interna

1. **Guida rapida e guida sulle ore dell'aggiornamento**: «verso l'1» (index.html:731, app.js:22) contro «verso mezzanotte e mezza» (guida:383). La realtà è 00:40 con l'ora legale e 23:40 d'inverno, più la durata della corsa.
2. **README contro script sullo scarto da S5TH**: «tra 0 e +0,4» (README:111, fonti-dati.md:75) contro «tra −0,1 e +0,9» (backfill_breadth.py:10).
3. **README sui tasti**: «`1`–`6` viste» (README:99) contro le 7 viste reali e il «1–7» della guida.
4. **«Seduta qualsiasi»** vuol dire mediana nelle tabelle degli episodi e media nella scheda dei cali forti.
5. **Mediana**: l'app prende il valore centrale più basso, il README per i 13 indici con limiti usa la media dei due centrali (+23,4 contro +22,8).
6. **Trigger**:
   - La guida rapida (index.html:718) omette la condizione «2 titoli sopra il minimo».
   - L'intestazione della checklist (format.js:77) dice «una qualsiasi» anche quando ne servono due.
   - Il README parla di tre conferme più la V, la checklist di «quattro».
7. **Footer** (index.html:691): «indici: livelli dai grafici di Massimo Rea». Su 22 indici, 9 hanno il 3° percentile.
8. **Vista 7 nella guida rapida** (index.html:711): «I numeri sono il rendimento reale degli indici». Sono indici simulati, come dicono la guida (339) e la nota della vista (681).
9. **«Avvicinamento»**:
   - La statistica conta ogni discesa sotto la soglia. L'app mostra l'Avvicinamento solo in stato Normale (bottom.js:138): con il drawdown oltre l'85° percentile il settore è in Attenzione e l'anello non c'è. È una differenza piccola, ma la regola misurata non è esattamente quella mostrata.
   - README:67 e README:79 non dicono «nel campione», mentre la nota della 0.8.10 lo promette per i testi dell'app (lo fanno davvero guida rapida, legenda e Situazione).
10. **Unità**: «punti» per le distanze di breadth e «%» per la breadth sono usati in modo coerente. In «Cali forti» il picco in modalità «% titoli» è una somma di percentuali su 5 sedute (può superare 100%), e il testo non lo spiega (bassa).
11. **Parole che possono sembrare un consiglio o una certezza**:
    - «Trigger», «segnale», «fallisce se il prezzo chiude sotto X» (signals.js:319): la riga sembra uno stop-loss operativo.
    - «è il momento di metterlo in osservazione» (guida:160, index.html:715) va bene.
    - «Trend: puoi provarlo con i cursori (per esempio 5%, tolto dai governativi 15+ e dalle materie prime)» (guida:240) è un'allocazione precisa: suona come un consiglio.
    - I disclaimer generali ci sono (footer, guida, guida rapida).

---

## 5. Problemi, dal più grave

### Bloccante

Nessuno nel senso di un numero inventato: tutte le statistiche principali si ricalcolano. I due punti qui sotto vanno però corretti prima della prossima pubblicazione, perché l'app afferma come vero qualcosa che i suoi dati smentiscono.

### Alta

**A1. Il 3° percentile «ritrova i livelli di Rea»** (js/indices.js:367; README.md:208). Falso con i dati di oggi: coincide su 2 indici su 13 e sta entro un punto su 6.
- Testo proposto (indices.js:367): «Livello di default calcolato: 3° percentile della breadth dell'indice in tutta la sua storia. È la quota di sedute che i livelli di Rea lasciano sotto la soglia sull'S&P 500 e sui settori (circa il 3%); sugli altri indici i suoi livelli e questa regola possono differire di molti punti. Regole di zona blu, trigger e cooldown come per i settori.»
- README:208: «Sui nostri dati i livelli di Rea lasciano sotto la soglia circa il 3% delle sedute (S&P 500 3,0%, settori dal 2,4% al 4%, Real Estate 5,8%). Il 3° percentile dà lo stesso livello sull'S&P 500 e sul Russell 2000 e uno vicino (entro 1-2 punti) su Nikkei, CAC, FTSE MIB e Hang Seng; su Nasdaq-100, Dow, DAX, SMI e MSCI Emerging è lontano.»

**A2. Allerte dei cali forti nei crolli rapidi** (guida.html:317; js/cap-view.js:113 e 140; README:206; capitulation.js:17). Nel 2020 le sedute in allerta sono state 12 in mediana, fino a 27, e la frase «10 o più sedute = mercati orso lunghi» sarebbe comparsa in pieno crollo a V.
- guida:317: «Sedute in allerta: ad aprile 2025 l'allerta è durata pochi giorni (4 in mediana); a marzo 2020 una dozzina; tra settembre e novembre 2008 una ventina, e nel 2008-2009 è tornata per mesi. Per questo la scheda dice quante sedute è stata in allerta negli ultimi 3 mesi…»
- cap-view.js:113, sopra le 10 sedute: «: un'allerta che si ripete per settimane segnala vendite forti e prolungate (succede nei crolli lunghi come il 2008, ma anche nel marzo 2020).»
- cap-view.js:140: «Nei crolli più brevi (aprile 2025) dura pochi giorni; nel 2020 un paio di settimane; nei mercati orso lunghi (2007-2009) torna per mesi.»

**A3. Breadth dei settori fino al 2012 senza i membri usciti prima del 2013** (scripts/backfill_breadth.py:20; non detta nell'app; README:108 dice il contrario). Nel 2005 i titoli con prezzi nei settori sono 292 su 500 (58%): i titoli spariti fanno sopravvivenza proprio negli anni del 2008.
- README:108: «I settori dei titoli usciti vengono dalle versioni storiche della lista dei costituenti, disponibili dal dicembre 2012: chi è uscito prima non ha un settore e conta solo nella breadth dell'S&P 500. Nel 2005 la breadth dei settori copre circa il 58% dei membri di allora (292 su 500), nel 2009 il 76%.»
- Nota della vista 4 (index.html:360), dopo «composizione dell'indice di allora»: «; fino al 2012 mancano i titoli usciti prima del 2013 (copertura dei settori 58% nel 2005, 76% nel 2009)».
- Guida «Limiti» (393): aggiungere la stessa frase.

**A4. Ultimo prezzo noto negli universi globali** (non detto nell'app; esempio esplicito di CLAUDE.md). Nella nota della testata degli universi in euro (app.js `globalFreshness`) o nel tooltip «Prezzi», aggiungere: «Le sedute sono quelle di Borsa Italiana: un ETF quotato altrove (Xetra, Parigi, Madrid, Amsterdam) che quel giorno è chiuso per festa conta con il suo ultimo prezzo; il bitcoin con il suo ultimo prezzo di quel giorno.» Da verificare: la barra giornaliera di Yahoo per le cripto chiude a mezzanotte UTC, cioè ore dopo la chiusura di Milano; se è così, si può scrivere l'orario. Lo stesso nella guida (sezione «Universi e benchmark», 213).

**A5. Statistica degli indici non riproducibile con lo script citato** (ricerca/attenzione/script/indici.mjs legge solo `data/indices.json`). Sul ramo di sviluppo, correggere lo script perché legga anche `indices_more.json`, come `script/avvicinamento.mjs` di questo audit, e aggiornare fasce.md con la data del ricalcolo.

### Media

**M1. Scarto da S5TH contraddittorio** (README:111 contro backfill_breadth.py:10), e senza dati né script nel repository. Scegliere il valore del ricalcolo più recente, salvare in `ricerca/` le letture e lo script, e scrivere per esempio «S&P 500 (S5TH): scarto tra −0,1 e +0,9 punti su N date (elenco in ricerca/…)».

**M2. XLRE fuori dalla fascia dei settori** (README:208): «settori dal 2,4% al 4%, Real Estate 5,8%».

**M3. «3-6 punti» per i membri di oggi** (README:209, indices.js:167). Testo per il tooltip: «Storia ricostruita con i membri di oggi: nella prova sul Nasdaq-100 la breadth risulta in media 4 punti più alta (da −7 a +18 nelle singole date), vicino ai minimi lo scarto è di 0-3 punti.»

**M4. Copertura storica degli indici «d'epoca»** (indices.js:164, 379, 383). Il tooltip «d'epoca» dovrebbe dire «Storia con i membri di ogni data · copertura oggi 101/101, all'inizio (2008) 59%: i titoli usciti senza prezzi su Yahoo mancano, quindi fino al 2015 circa resta una parte di sopravvivenza». Nella Situazione basta aggiungere la copertura alla prima seduta, già nei dati (`n`/`members` a f0).

**M5. «dal 2005» per XLC e XLRE** (bottom.js:439, 442 e format.js:86; guida:140, 286). Usare la prima seduta con il percentile: `Math.max(first breadth, first dp)`, come già fa `rangeStart`. Nella guida: «90° vuol dire più profondo del 90% delle sedute precedenti, dal 2004 (Real Estate dal 2015, Comunicazioni dal 2018, quando sono nati gli ETF)».

**M6. «Seduta qualsiasi» media o mediana** (cap-view.js:138): «Per confronto, in media dopo una seduta qualsiasi della stessa storia: +3M …, +12M …».

**M7. Universo «6 · Indici»** (index.html:470, 729; guida:209): «La rotazione di 9 di questi indici (S&P 500, Nasdaq-100, Dow, Nikkei, STOXX 600, FTSE 100, DAX, CAC 40 e la Svizzera con l'MSCI Switzerland), con ETF in euro, è in 2 Rotazione, universo 6 · Indici.»

**M8. Footer** (index.html:691): «indici: livelli dai grafici di Massimo Rea dove ci sono, altrimenti il 3° percentile della storia dell'indice».

**M9. Guida rapida, vista 7** (index.html:711): «I numeri sono il rendimento di indici simulati con i membri di ogni data e possono differire…».

**M10. Taiwan, breadth** (config/indices.json TWN.note). Se la chiusura di Yahoo non rettifica i dividendi in azioni, lo stesso difetto sposta anche le medie a 200 sedute. Va verificato. Se si conferma, nella nota: «La chiusura di Yahoo non rettifica i dividendi in azioni, frequenti a Taiwan: anche la breadth può risultarne più bassa nei mesi dopo gli stacchi.»

**M11. Rea contro la vista 7** (index.html:682):
- «(3 mesi al 16/10/2026, Tecnologia: 8,1% contro 5,8% dalla stessa data di partenza; 5,7% sulle nostre 63 sedute)».
- «Su 3 mesi l'equal-weight resta di solito entro un punto (9 settori su 11); il cap-weighted si scosta in media di un punto, fino a 2-3 punti in Energia, Tecnologia e Materiali, …».

**M12. Ore dell'aggiornamento** (app.js:22, index.html:731, guida:383): «verso l'una di notte con l'ora legale, verso mezzanotte d'inverno (ora italiana)», oppure «circa 45 minuti dopo la mezzanotte UTC».

**M13. Checklist del trigger** (format.js:77): «Per il trigger servono la breadth e le conferme richieste (una, oppure due dopo un fallimento o una zona blu lunga; il rimbalzo a V basta da solo):».

**M14. «dal 2001 sui 22 indici»** (index.html:710, indices.js:376): «sui 22 indici, con la storia di ciascuno (la più lunga dal 2000)». Oppure tenere «dal 2001» e tagliare il 2000 nel ricalcolo.

### Bassa

- **B1.** README:99: «`1`–`7` viste».
- **B2.** version.js:10: completare con «al 99° percentile delle sedute precedenti».
- **B3.** README:212: dire perché l'ultimo trigger parte dal 2005 e l'insieme dei trigger dal 2001, oppure dare anche «dal 2001: 50 episodi, +18,0%, 40 positivi»; per i 13 indici con limiti usare la mediana dell'app (+22,8%) o dire che è la media dei due centrali.
- **B4.** Scorciatoia «nov 2008» (bottom.js:245, guida:262, README:63): «nov 2008 (minimo della breadth; il prezzo tocca il fondo il 09/03/2009)», oppure aggiungere «mar 2009».
- **B5.** index.html:317: «nei settori piccoli (Energy, Communication Services, Materials, Real Estate, Utilities: 21-31 titoli) uno solo sposta la breadth di 3-5 punti».
- **B6.** Guida rapida, trigger (index.html:718): aggiungere «e di almeno 2 titoli sopra il minimo della zona blu».
- **B7.** CPI (index.html:254): «ogni valore entra dal giorno in cui è stato pubblicato (i valori sono quelli rivisti di oggi, le date quelle della prima uscita)».
- **B8.** Cali forti: dire in guida:323 anche «e i crolli oltre il 60% in una giornata normale (frazionamenti non registrati)».
- **B9.** EEM «solo prezzo, valuta locale» (index.html:470, guida:308): «solo prezzo, nella valuta dell'indice (MSCI Emerging: ETF in dollari)».
- **B10.** Trend, guida:238: citare la fonte, «(SG Trend Index, fonti Cambridge Associates e Hedgeweek)»; guida:240: «per esempio con un peso piccolo, tolto da altre componenti: è una prova, non un'indicazione».
- **B11.** Riga del trigger (signals.js:319): «fallisce (regola dell'app) se il prezzo chiude sotto …», per non leggerla come uno stop operativo.
- **B12.** Mediana: dire una volta nella guida («con un numero pari di casi è il valore centrale più basso»), oppure usare la mediana standard.
- **B13.** README:67 e README:79: aggiungere «nel campione» come nei testi dell'app.
- **B14.** macroFreshness (app.js:681): mostrare i prezzi anomali corretti come per l'universo globale.
