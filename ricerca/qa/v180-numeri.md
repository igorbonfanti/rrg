# 1.8.0 · controllo indipendente dei numeri e dei grafici durante lo zoom

Controllore: agente indipendente (non ha scritto il codice). Data: 10/11/2026. Primo controllo sul commit 5cfa6d6, **ricontrollo sul commit b08aeb3** (correzioni dei rilievi 1–5), ramo `claude/great-noether-2f1ude`. Server locale su 127.0.0.1:8791, Chromium (Playwright) a 1440×900.
Durante il controllo un'altra sessione ha cambiato la copia di lavoro (`js/zoom.js`: solo la gestione del puntatore e di Esc; `guida.html`, `css`, `index.html`, `version.js`). Il codice dei calcoli e dei disegni non è cambiato, quindi i rilievi valgono anche per quella versione.

## Metodo

- **Valori attesi** calcolati in Python direttamente dai JSON in `data/`, senza usare funzioni dell'app. Sono stati riscritti: decodifica di date, differenze e RLE; media 200; drawdown a 252 sedute; breadth = a200/n; somma dei cali forti e soglia al 99° percentile delle sedute precedenti (almeno 756); realizzata a 21 sedute; base 100.
- **Valori mostrati** letti dal browser: il riquadro a **ogni seduta** del tratto (in tutto più di 3.000 riquadri), le coordinate di tutti i percorsi SVG, i riquadri a destra, le note e le etichette dell'asse.
- Per ogni scala si ricalcola la y attesa di ogni punto e la si confronta con quella disegnata (tolleranza 0,06 unità SVG, cioè l'arrotondamento di `toFixed(1)`).
- Script in `ricerca/qa/v180-numeri/` (si ripetono tutti con `sh ricerca/qa/v180-numeri/run.sh`, con il sito servito su 127.0.0.1:8791): `ref.py` contiene i calcoli indipendenti; `sec.cjs`, `sec2.cjs`, `sec3.cjs`, `ix.cjs`, `perf.cjs`, `perflate.cjs` e `tm.cjs` raccolgono i dati dal browser; i file `check_*.py` fanno i confronti. Nel primo controllo 452 controlli passati e i rilievi 1–5 qui sotto. **Nel ricontrollo su b08aeb3: 463 controlli passati, 0 falliti**. Sono stati ripetuti tutti gli scenari, più i punti a metà tra due sedute per il riquadro dei grafici per data. In più, `ticks2.mjs` prova direttamente le tacche di `zoom.js` su 41.086 finestre di 10–60 sedute dei calendari dei settori, di N225 e di DAX: nessuna etichetta diversa dalla seduta sotto, nessuna di sabato o domenica.

Scenari: Settore XLK 3A (mar–mag 2025), XLF MAX (set 2008–giu 2009, taglio dei cali forti), XLK MAX 2005–2012 (8 anni, scala log), XLK MAX 2017–19, 2010–12 e 2015–16 con passaggio a XLC e XLRE, XLE 3 settimane (zoom nello zoom), XLE con avvicinamento iniziato prima del tratto e iniziato al primo giorno del tratto. Indici: SPX → N225, DAX e FTSEMIB (lug–set 2024), SPX → N225 3 settimane a cavallo di Capodanno, N225 MAX → SPX (2008–09). Performance relativa: settori USA, 3 settimane, linea che parte dopo l'inizio del tratto (MWEQ.MI). Emergenti: NIFTY50 (anche dal 20/01/2025, giorno senza cambio), KOSPI200 3 settimane, EEM 2020. VIX: 10A 2020, 3A 3 settimane, MAX 2007–09 con passaggio a NDX.

## Controlli

| Controllo | Esito | Dettaglio |
|---|---|---|
| Sedute disegnate e date ai bordi = tratto scelto (#ts, #secCapSvg, #ixTs, #ixCapSvg, #perf) | ✅ | numero di punti = sedute con chiusura nel file; x = L + i/(n−1)·PW per ogni punto; etichetta «Zoom: dal … al …» = riquadro al bordo sinistro e al destro |
| Indice non USA, calendario diverso (N225, DAX, FTSEMIB) | ✅ | lo zoom di SPX 01/07–30/09/2024 passa a N225 con le sedute del calendario giapponese (stessi bordi, numero di sedute diverso); N225 MAX 01/09/2008 → SPX parte dal 02/09/2008 |
| Settore giovane (XLC, XLRE) | ✅ | zoom 2017–19 → XLC dal 20/06/2019 (prima seduta del suo periodo); zoom 2010–12 → XLC e XLRE tornano al periodo e l'etichetta sparisce; zoom 2015–16 → XLRE dal 07/10/2016. Stesso tratto nei Cali forti |
| Riquadro con zoom = senza zoom (prezzo, media 200, drawdown, breadth 200 e 50, cali forti e soglia) | ✅ | identico carattere per carattere in 63 + 209 + 754 + 754 + 402 sedute (settori), 63 (indici), e uguale al calcolo dal file in ogni seduta del tratto |
| Riquadro con zoom = senza zoom e = file (Emergenti: prezzo, breadth, cambio, dollaro; VIX: VIX, realizzata, premio) | ✅ | 80 + 39 + 15 + 104 sedute (Emergenti), 62 + 15 + 524 sedute (VIX) |
| Base 100 di #perf | ✅ | 12 linee × 83 sedute e 12 × 15: valore = chiusura / chiusura del primo giorno × 100, a 0,05; legenda «zoom dal … al …, base 100 al …»; etichette finali corrette |
| Base 100 di #perf per una linea che parte dopo l'inizio del tratto | ✅ | MWEQ.MI (prima quotazione 07/10/2024) in un tratto dal 02/09/2024: 100,0 il 07/10, assente il giorno prima, nota in legenda. Dall'interfaccia il caso non si raggiunge con i dati di oggi (il periodo massimo, 504 sedute, parte il 05/11/2024): provato con `drawPerf` e un vero `zoomGroup` su un periodo di 600 sedute |
| Base 100 di #emChart (valori) | ✅ | «In dollari (base 100)» = (chiusura/cambio)/(idem al primo giorno) × 100 in ogni seduta |
| Scala del prezzo base 100 di #emChart sui valori visibili | ✅ | ricontrollo: scarto ≤ 0,05 px dalla scala sui soli valori del tratto (EEM 2020, NIFTY50, KOSPI200). Prima era ❌ (rilievo 1) |
| Riquadri a destra (zend) e «valori al <data>» | ✅ | prezzo, drawdown e breadth all'ultima seduta del tratto (settori, indici, Cali forti); nessun riquadro vuoto quando il tratto arriva all'ultima seduta |
| «peggiore nel tratto» | ✅ | = minimo del drawdown nel tratto, in tutti gli scenari |
| «soglia X al <data>» nei Cali forti | ✅ | = soglia ricalcolata all'ultima seduta del tratto (settori e indici, anche sul calendario di N225 e FTSEMIB) |
| Pallino d'ingresso dell'avvicinamento | ✅ | XLE con zoom dal 28/04/2025 (tratto iniziato il 21/04): nessun pallino sul bordo; zoom dal 21/04: pallino sul bordo; gli altri pallini sono gli stessi che senza zoom |
| Triangoli dei trigger e fasce (zona blu, sotto il livello) | ✅ | stesse sedute che senza zoom, solo quelle dentro il tratto (per esempio XLK 2005–12: 4 trigger, 164 + 14 sedute di fasce); nessun triangolo fuori dal riquadro |
| Scale e punti dentro il riquadro (#ts, #ixTs, Cali forti, #perf, #vxChart) | ✅ | y di ogni punto = scala sui soli valori visibili; nessun punto fuori dal pannello |
| Passaggio log/lineare | ✅ | lineare fino a 4 anni (2017–19, 754 sedute); logaritmica oltre (2005–12, 2.013 sedute), con il titolo «SCALA LOGARITMICA» |
| Taglio della scala dei Cali forti | ✅ | taglio a 1,3 × la soglia più alta del tratto (XLK 2025: 32,5; XLF 2008: 118,3); etichette «▲71 (apr 2025)» e «▲134 (nov 2008)» = massimi dei tratti oltre il taglio |
| VIX: x per data, pallino VIX/VIX3M, NDX | ✅ | x di ogni punto alla sua data; il pallino dell'ultimo VIX/VIX3M c'è solo se il tratto arriva all'ultima seduta; lo zoom resta passando a NDX |
| Asse del tempo, zoom di 2–3 settimane, grafici per seduta | ✅ | ricontrollo: XLE «16/10 20/10 22/10 26/10 …», SPX e N225 a cavallo di Capodanno, «27/05» per il Memorial Day: ogni etichetta è la data della seduta sotto. Prima era ❌ (rilievo 2) |
| Asse del tempo, zoom di mesi o anni | ✅ | «ott 08 … 2009 … mar 09», «apr 25 mag 25», anni: in ordine e sulla prima seduta del mese o dell'anno |
| Asse del tempo, grafici per data (Emergenti, VIX) | ✅ | ricontrollo: VIX e KOSPI200 in 3 settimane «15/10 19/10 21/10 … 02/11», nessun sabato o domenica. Prima era ⚠️ (rilievo 5) |
| Nota «base 100 al …, inizio dello zoom» | ✅ | ricontrollo: NIFTY50 dal 20/01/2025 → «base 100 al 21/01/2025, primo giorno dello zoom con tutti i dati»; quando la base è il primo giorno resta «inizio dello zoom». Prima era ⚠️ (rilievo 3) |
| Riquadro nei grafici per data: seduta più vicina | ✅ | ricontrollo: puntatore al 40% e al 60% tra due sedute consecutive → la prima e la seconda, con valori uguali al file. Sono 520 punti, oltre a ogni seduta del tratto (NIFTY50, KOSPI200, EEM, VIX 2020, VIX 3 settimane, VIX 2007–09). L'ultima seduta si raggiunge anche dentro il grafico. Prima era ⚠️ (rilievo 4) |
| Errori in console | ✅ | nessuno in tutti gli scenari |

## Rilievi del primo controllo (5cfa6d6), tutti corretti in b08aeb3

1. **#emChart, scala del prezzo base 100 calcolata anche sulle sedute dopo la fine del tratto.** Da correggere. Esempio: EEM 10A dal 03/02 al 30/06/2020, valori visibili 71,9–105,1 ma scala fino a 167,2, scarto fino a 75 px. **Corretto**: ora la base 100 si calcola solo sulle sedute della finestra.
2. **Grafici per seduta, zoom sotto i due mesi: l'etichetta di un giorno senza seduta finiva sulla seduta dopo con la data del giorno chiuso.** Da correggere. Esempi: «17/10» sotto il 19/10/2026, «26/05» sotto il 27/05/2025. **Corretto**: `sessionTicks` scrive la data della seduta.
3. **Nota «base 100 al 21/01/2025, inizio dello zoom» con lo zoom dal 20/01** (NIFTY50, giorno senza cambio). Minore. **Corretto**.
4. **Riquadro dei grafici per data sulla seduta precedente**: in uno zoom stretto il mirino saltava indietro fino a ~100 px. Minore. **Corretto**: ora è la seduta più vicina.
5. **Etichette di sabato e domenica** negli zoom di poche settimane dei grafici per data. Minore. **Corretto**.

**Resta, non blocca.** La selezione dello zoom nei grafici per data (`dateAt`) prende il giorno di calendario sotto il puntatore, non la seduta più vicina come dice il suo commento. La differenza è sotto il pixel e la fascia della selezione mostra le date prese, quindi non c'è nessun inganno.

**Osservazioni, non sono errori.** Da 10A non si fa uno zoom di 3 settimane in un solo trascinamento: sono meno di 5 px, e serve uno zoom nello zoom. In #perf il caso «linea che parte dopo l'inizio del tratto» non si raggiunge dall'interfaccia con i dati di oggi; è stato provato con `drawPerf` (`perflate.cjs`).

## Verdetto

**GO** (ricontrollo su b08aeb3). Tutti i numeri controllati coincidono con il calcolo indipendente dai file: valori dei riquadri, basi 100, riquadri di fine tratto, soglie, scale, trigger, fasce, pallini, calendari diversi, settori giovani. I cinque rilievi del primo controllo sono corretti. `npm test` passa. Nessun errore in console.
