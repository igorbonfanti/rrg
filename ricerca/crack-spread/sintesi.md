# Crack spread 3-2-1 accanto al petrolio · sintesi

Fase di ricerca del 24/11/2026: **nessuna modifica all'app**. Domanda e criteri in `domanda.md`.

## Interpretazioni decise prima dei risultati (24/11/2026)

Scritte dopo aver controllato solo le proprietà dei dati (date, buchi, segno del crack), prima di calcolare qualsiasi test.
Non sono state cambiate dopo.

**Serie del crack (principale).** Crack 3-2-1 = (2 × benzina + 1 × gasolio) × 42 / 3 − WTI, cioè 14 × (2 × benzina +
gasolio) − WTI, in dollari al barile. Benzina = `DGASNYH` (convenzionale regolare, New York Harbor), gasolio = `DHOILNYH`
(gasolio da riscaldamento n. 2, New York Harbor), WTI = `DCOILWTICO` (Cushing). Si usa New York Harbor per entrambi i
prodotti perché è il luogo di consegna dei future RB e HO della formula vista in diretta. Il crack esiste solo nei giorni in
cui tutte e tre le serie hanno un valore: nessun riempimento (tra il 1993 e il 2006 EIA non pubblica molti giorni, fino a
35 giorni di fila; nel 1999 i giorni completi sono 43). Il 20/04/2020 (WTI spot −36,98 $, scadenza del contratto di maggio)
è tolto da tutte le serie, WTI compreso. Il crack può essere negativo (4 giorni: 2006, 2008): resta così.
Varianti solo di controllo, che non decidono il verdetto: benzina Gulf Coast (`DGASUSGULF`); gasolio sostituito dal diesel
ULSD di New York Harbor (`DDFUELNYH`) dal 14/06/2006; ogni componente riempita con l'ultimo valore per al massimo 5 giorni.

**«3 mesi».** 91 giorni di calendario: il valore di partenza è l'ultimo disponibile alla data t − 91 o prima, purché non più
vecchio di 31 giorni (t − 122); altrimenti la variazione manca. **«12 mesi»**: 365 giorni di calendario.
**Metà del campione**: 1986-2005 e 2006-oggi, secondo la data del caso (massimo del WTI, inizio del segnale, fine della
finestra a 3 mesi). Ogni criterio deve passare in **tutte e due** le metà, con tutte le sue condizioni.

**Criterio 1 (anticipa i massimi del WTI).**
- Massimi di ciclo con `cyclePeaks` di `js/peaks.js` (massimo di 52 settimane seguito da un calo di almeno X% prima di
  tornare sopra), per il crack e per il WTI, con la stessa soglia X.
- Casi = i massimi di ciclo del WTI con la finestra ±365 giorni tutta dentro i dati del crack (stessa regola `hasData` di
  `peaks.js`, più la fine della finestra entro l'ultimo dato). Per ogni caso il massimo del crack è quello di ciclo più alto
  nella finestra ±365 giorni (come `pick` in `peaks.js`); «prima» = più di 31 giorni prima (stesse classi «prima / insieme
  ±31 giorni / dopo» dell'app). Un caso senza massimo del crack nella finestra conta come «non prima».
- Passa se, **sia con X = 20 sia con X = 30**, in ognuna delle due metà: almeno 8 casi, almeno il 70% «prima» e p < 0,05.
- Modello nullo: 10.000 spostamenti circolari casuali delle date dei massimi del crack (spostamento uniforme sull'arco dei
  dati del crack, con ritorno all'inizio); p = (1 + spostamenti con quota «prima» ≥ quella osservata) / (1 + 10.000).

**Criterio 2 (aggiunge qualcosa al petrolio per l'S&P 500).**
- Segnale nel giorno t: crack sopra il 90° percentile (interpolazione lineare, come `numpy.percentile`) dei suoi valori
  **prima** di t, con almeno 250 valori alle spalle, **oppure** crack sceso di oltre il 40% in 3 mesi (partenza positiva).
  Stessa regola sul solo WTI, con la sua storia. I segnali contano dal primo giorno in cui possono scattare entrambe le
  regole.
- Cali dell'S&P 500 (`^GSPC`, chiusure): metodo «zigzag» al 10% dello studio sul petrolio: un calo del 10% dal massimo di
  chiusura apre l'episodio (data di conferma = prima chiusura ≤ 90% del massimo), un rialzo del 10% dal minimo lo chiude.
- Un segnale è «seguito da un calo» se un episodio viene confermato nei 365 giorni dopo il segnale. Un segnale che cade
  dentro un episodio già confermato e non ancora chiuso non conta (né come successo né come caso). Episodi del segnale
  indipendenti: il primo giorno di segnale apre l'episodio, i segnali nei 365 giorni successivi non contano di nuovo.
  Contano solo i segnali con i 365 giorni successivi tutti osservati.
- Frequenza di base: quota delle sedute dell'S&P (stessa metà, stesso periodo, fuori dagli episodi aperti, finestra
  completa) seguite da una conferma entro 365 giorni.
- Passa se in ognuna delle due metà: almeno 8 episodi del crack e quota del crack > base **e** > quota della stessa regola
  sul WTI. La regola combinata (percentile **o** calo) decide; le due parti si mostrano anche da sole. Il valore p contro
  spostamenti circolari dei segnali si riporta solo come informazione (il criterio non lo chiede).

**Criterio 3 (spiega il settore energia).**
- Variabile da spiegare: variazione a 3 mesi del logaritmo di XLE / SPY (chiusure rettificate per i dividendi) e, per le
  raffinerie, di VLO / `^GSPC` (chiusure solo rettificate per gli split, per avere lo stesso trattamento dal 1986).
- Il crack scende sotto zero, quindi non si usa la variazione percentuale: la variazione del crack è (crack_t −
  crack_partenza) / WTI_partenza, cioè la variazione del margine come quota del prezzo del greggio. WTI: variazione del
  logaritmo. Stessa data di partenza per tutte le variabili, sulle date comuni (sedute con tutti i dati).
- Modello A: y = a + b × WTI. Modello B: y = a + b × WTI + c × crack (l'aumento di R² è quello di aggiungere il crack al
  WTI). Minimi quadrati su tutte le date (finestre sovrapposte); le finestre a cavallo del 01/01/2006 si tolgono.
- R² fuori campione = 1 − Σ(y − ŷ)² / Σ(y − media di y nella metà di prova), con i coefficienti stimati sull'altra metà.
  Passa se l'aumento (B − A) è ≥ 0,05 **in entrambe le direzioni** (stima 1986-2005 → prova 2006-oggi, e viceversa) per
  XLE **oppure** per VLO. XLE parte il 22/12/1998, quindi la sua prima metà è 1999-2005.
- Controlli: crack in dollari invece che in quota del WTI; finestre trimestrali non sovrapposte; VLO solo dall'01/08/1997
  (prima il titolo VLO di Yahoo è la vecchia Valero Energy, raffinazione più gas naturale); paniere VLO, MPC, PSX dal 2012
  (solo nella seconda metà, senza prova fuori campione).

**Oggi (solo descrizione).** Ultimo crack disponibile, percentile su tutta la storia del crack, distanza dal massimo dei 12
mesi; per confronto il crack dei future Yahoo dello stesso giorno.

<!-- I risultati sono sotto questa riga: scritti dopo i calcoli. -->

## In breve

**Verdetto: nessuno dei tre criteri passa.** Secondo `domanda.md` il crack spread quindi **non entra nell'app come
contesto**: resta la scelta tra un paragrafo nella guida e niente. Consiglio il paragrafo (testo proposto in fondo).

| Criterio | Risultato principale | Esito |
|---|---|---|
| 1 · Anticipa i massimi del WTI | soglia 20%: 7 casi su 18 «prima» (38,9%; a caso 32,4%; p 0,39). Soglia 30%: 6 su 12 (50%; p 0,13). Per metà: 4/8 e 3/10; 3/5 e 3/7 | **non passa** |
| 2 · Aggiunge al petrolio per l'S&P 500 | crack estremo seguito da un calo ≥ 10% entro 12 mesi: 7 episodi su 16 (43,8%) nel 1986-2005, contro 6 su 11 (54,5%) del WTI; 11 su 17 (64,7%) dal 2006, contro 5 su 11 (45,5%) del WTI e 59,8% di base | **non passa** (prima metà) |
| 3 · Spiega il settore energia | aumento di R² fuori campione aggiungendo il crack al WTI: XLE/SPY +0,027 e +0,002; VLO/S&P +0,070 e −0,012 | **non passa** |

- I numeri sono confermati da un ricalcolo indipendente in Python (`script/verifica.py`): **42 confronti, 0 differenze**.
- I test sanno rifiutare e sanno trovare: con serie inventate con un anticipo noto il metodo lo trova, con serie
  indipendenti lo rifiuta (sezione «I test funzionano?»).
- **Dove il crack conta davvero: le raffinerie.** Dal 2006 il crack aggiunge 0,13 di R² al WTI per spiegare VLO contro
  l'S&P 500. Il criterio 3 però non passa, con ogni probabilità perché il titolo VLO di Yahoo prima del 1997 è un'altra società. Prendendo solo
  la Valero di oggi (dall'agosto 1997), l'aumento fuori campione è +0,129 e +0,118. Questa prova è stata fatta dopo aver
  visto i risultati e non cambia il verdetto. Dice però una cosa vera: il crack è il margine delle raffinerie e spiega le
  raffinerie. Non anticipa né il petrolio né l'S&P 500.
- **Oggi** (ultimo dato FRED, 17/11/2026): il crack è a **31,09 $ al barile**, al 91° percentile della sua storia dal 1986.
  È il **60,6% sotto il massimo dei 12 mesi**: 78,92 $ il 25/09/2026, che è anche il massimo di sempre. In 3 mesi ha perso il
  54,8%. Questi numeri descrivono la situazione e non prevedono niente: il criterio 2 dice che un crack così non ha avvisato
  dei cali dell'S&P meglio del petrolio.

## Dati e licenze

| Serie | Fonte | Periodo | Note |
|---|---|---|---|
| WTI spot Cushing `DCOILWTICO` | FRED (dati EIA, dominio pubblico) | 02/01/1986 → 17/11/2026 | 20/04/2020 (−36,98 $) tolto |
| Benzina convenzionale NY Harbor `DGASNYH` | FRED / EIA | 02/06/1986 → 17/11/2026 | serie principale |
| Benzina convenzionale Gulf Coast `DGASUSGULF` | FRED / EIA | 02/06/1986 → 17/11/2026 | variante |
| Gasolio da riscaldamento n. 2 NY Harbor `DHOILNYH` | FRED / EIA | 02/06/1986 → 17/11/2026 | serie principale: **non è finita** |
| Diesel ULSD NY Harbor `DDFUELNYH` | FRED / EIA | 14/06/2006 → 17/11/2026 | variante dal 2006 |
| S&P 500 `^GSPC`, SPY, XLE, VLO, MPC, PSX | Yahoo (stesso codice dell'app, `scripts/lib/yahoo.js`) | ^GSPC e VLO dal 1985, SPY dal 29/01/1993, XLE dal 22/12/1998, MPC dal 24/06/2011, PSX dal 12/04/2012 → 23/11/2026 | |
| Future RB=F, HO=F, CL=F | Yahoo | dal 2000 → 23/11/2026 | solo confronto |

- **Il crack esiste in 7.804 giorni** dal 02/06/1986 al 17/11/2026. Tra il 1993 e il 2006 EIA lascia vuoti molti giorni,
  e non sempre gli stessi nelle tre serie. I giorni completi sono 43 nel 1999, 56 nel 1995 e 73 nel 1994, e il buco più
  lungo è di 35 giorni (dal 23/05/1994). Non si riempie niente. La variante «riempito per al massimo 5 giorni» non cambia
  nessun verdetto.
- **Le festività** sono righe vuote nei CSV di FRED: restano fuori. Sulle date di Yahoo (NYSE) si usano solo i giorni con
  tutti i dati.
- **Il crack sotto zero** capita in 4 giorni: 10/02/2006 (−0,76), 14/02/2006 (−0,14), 22/09/2008 (−3,72, quando il WTI spot
  è salito a 120,92 $ alla scadenza del contratto di ottobre) e 31/12/2008 (−1,26). Restano così: per questo la variazione
  del crack non è percentuale nel criterio 3.
- **I cambi di specifica**:
  - il gasolio da riscaldamento di New York è una serie EIA continua fino a oggi. Il diesel ULSD costa in media 0,094 $ al
    gallone in più (2006-2013) e 0,103 $ in più dal 2013, cioè circa 1,4 $ al barile sul crack. Con l'ULSD dal 2006 i
    risultati non cambiano;
  - la benzina spot è sempre la convenzionale. Il future RB è la RBOB, e prima della fine del 2006 Yahoo non dice quale
    contratto mostra;
  - il future HO è il gasolio fino ad aprile 2013 e l'ULSD da maggio 2013.
- **Spot e future a confronto** (5.734 giorni comuni dal 01/11/2000): il crack dei future (14 × (2 × RB=F + HO=F) − CL=F,
  la formula vista in diretta) è in media **0,96 $ più alto** di quello spot, con una deviazione standard dello scarto di
  3,06 $. La correlazione è **0,967 sui livelli** e **0,869 sulle variazioni a 3 mesi**. Per tratti:
  - 2000-2005: +1,16 $ (deviazione 1,49), correlazioni 0,911 e 0,870;
  - 2006-04/2013: +0,80 $ (2,74), 0,962 e 0,886;
  - 05/2013-oggi: +1,01 $ (3,43), 0,958 e 0,860.

  Il WTI spot e CL=F hanno una correlazione di 0,9995. Il 25/09/2026 il crack dei future era 68,19 $ e quello spot
  78,92 $: nel picco di settembre lo spot di New York è andato molto sopra i future.
- **Un errore di dati trovato dopo il primo calcolo.** La chiusura di VLO su Yahoo, rettificata solo per gli split, perde il
  33% il 01/08/1997: è la scissione di Valero, mentre la chiusura rettificata per i dividendi non ha il salto. Correzione
  minima: si tolgono le finestre a 3 mesi che contengono quel giorno. Il risultato del criterio 3 cambia di pochi millesimi
  e il verdetto resta lo stesso.
- **Licenze.** I prezzi spot EIA sono di dominio pubblico (FRED li ripubblica). Yahoo si usa come già fa l'app. Non si
  usano TradingView, StockCharts, CME, ICE né Bloomberg.

## Metodo

Le regole complete sono nella sezione «Interpretazioni decise prima dei risultati», sopra. In breve:

- **Massimi di ciclo**: la funzione `cyclePeaks` di `js/peaks.js` dell'app, importata così com'è.
- **Cali dell'S&P 500**: metodo zigzag al 10% sulle chiusure. Dal 1985 sono 33 episodi; l'ultimo è confermato il
  20/11/2026 (−11,6% dal massimo del 06/10/2026) ed è ancora aperto.
- **Modelli nulli**:
  - criterio 1: 10.000 spostamenti circolari delle date dei massimi del crack;
  - criterio 2: 2.000 spostamenti circolari dei giorni di segnale, solo come informazione.
- **Metà del campione**: 1986-2005 e 2006-oggi.
- **Script**:
  - `script/backtest.mjs` (Node) fa tutti i calcoli;
  - `script/potenza.mjs` fa le prove su serie sintetiche;
  - `script/verifica.py` fa il ricalcolo indipendente. È scritto da capo in Python, con algoritmi diversi: forza bruta per
    i massimi di 52 settimane e `numpy.percentile` giorno per giorno.

## Criterio 1 · il crack anticipa i massimi del WTI?

| Soglia | Metà | Casi | Prima | Insieme | Dopo | Nessuno | Quota prima | A caso (media) | p |
|---|---|---|---|---|---|---|---|---|---|
| 20% | tutto | 18 | 7 | 1 | 9 | 1 | 38,9% | 32,4% | 0,386 |
| 20% | 1986-2005 | 8 | 4 | 1 | 3 | 0 | 50,0% | 32,2% | 0,226 |
| 20% | 2006-oggi | 10 | 3 | 0 | 6 | 1 | 30,0% | 32,5% | 0,721 |
| 30% | tutto | 12 | 6 | 0 | 5 | 1 | 50,0% | 32,2% | 0,129 |
| 30% | 1986-2005 | **5** | 3 | 0 | 2 | 0 | 60,0% | 32,5% | 0,165 |
| 30% | 2006-oggi | 7 | 3 | 0 | 3 | 1 | 42,9% | 32,0% | 0,440 |

- Con la soglia del 20% lo scarto mediano è di **+69 giorni**: il massimo del crack arriva più spesso **dopo** quello del
  WTI (9 casi) che prima (7). Esempi: nel 2008 il WTI ha il massimo il 03/07 e il crack il 12/09; nel 2022 il WTI l'08/03 e
  il crack il 16/05.
- Con la soglia del 30%, nel 1986-2005 il WTI ha solo 5 massimi utilizzabili. Il minimo di 8 casi per metà, letto in modo
  stretto, rende questa soglia impossibile da superare. Ma anche nella lettura più larga (8 casi e p < 0,05 sul campione
  intero) il crack resta lontano: 50% e p 0,13.
- Contando come «prima» ogni scarto negativo (anche di un giorno), i casi sono 7/18 con la soglia del 20% e 6/12 con
  quella del 30%: nessun cambio.
- Le varianti (benzina Gulf, ULSD dal 2006, riempimento per 5 giorni) danno, sul campione intero, quote tra 33,3% e 50% e
  p tra 0,12 e 0,41; in nessuna metà si arriva al 70%.

## Criterio 2 · un crack estremo avvisa dei cali dell'S&P 500 meglio del petrolio?

Segnali dal 17/08/1987, esiti fino al 23/11/2026. «Seguiti» = un calo dell'S&P ≥ 10% confermato entro 12 mesi.

| Regola | Tutto | 1986-2005 | 2006-oggi |
|---|---|---|---|
| Base (sedute qualsiasi) | 4.093/8.279 = 49,4% | 1.550/4.027 = 38,5% | 2.543/4.252 = 59,8% |
| **Crack estremo** (percentile 90 o calo 40% in 3 mesi) | 18/33 = 54,5% | **7/16 = 43,8%** | 11/17 = 64,7% |
| solo percentile 90 | 15/26 = 57,7% | 6/11 = 54,5% | 9/15 = 60,0% |
| solo calo 40% in 3 mesi | 14/25 = 56,0% | 6/14 = 42,9% | 8/11 = 72,7% |
| **WTI estremo**, stessa regola | 11/22 = 50,0% | **6/11 = 54,5%** | 5/11 = 45,5% |

- **1986-2005**: il crack batte la base (+5,3 punti) ma non il WTI (−10,7 punti), quindi non passa.
- **2006-oggi**: il crack batte la base (+4,9 punti) e il WTI (+19,2 punti), quindi passa.
- In tutte e due le metà gli episodi sono almeno 8.
- **Sono differenze da caso.** Contro gli spostamenti casuali dei segnali, il valore p del crack è 0,36 sul campione
  intero (0,56 e 0,26 nelle due metà); quello del WTI è 0,73.
- **La regola è accesa quasi sempre.** Il crack sopra il suo 90° percentile storico è frequente, perché il crack in
  dollari cresce nel tempo, e la regola è accesa nel 38,4% dei giorni (il WTI nel 38,6%). Per questo gli episodi
  indipendenti ripartono quasi ogni anno (1987, 1988, 1989…) e la regola assomiglia più a un calendario che a un allarme.
- Controlli: benzina Gulf, ULSD, riempimento, percentile 85 o 95. In nessuno il crack batte il WTI nel 1986-2005
  (per esempio, con il percentile 95: 7/16 contro 4/8).

## Criterio 3 · il crack spiega la forza relativa del settore energia?

Aumento di R² aggiungendo il crack al WTI. Fuori campione significa coefficienti stimati su una metà e misurati
sull'altra. Soglia: +0,05 in tutte e due le direzioni.

| Obiettivo | 1986-2005 → 2006-oggi | 2006-oggi → 1986-2005 | Esito |
|---|---|---|---|
| **XLE / SPY** (prima metà 1999-2005) | +0,027 | +0,002 | no |
| **VLO / ^GSPC** (serie decisa prima) | +0,070 | −0,012 | no |
| VLO / ^GSPC senza la scissione del 1997 (correzione dei dati) | +0,069 | −0,009 | no |
| VLO rettificato per i dividendi | +0,071 | −0,006 | no |
| *VLO solo dall'agosto 1997 (controllo deciso prima)* | *+0,129* | *+0,118* | *sì, ma non decide* |
| *VLO, finestre trimestrali non sovrapposte* | *+0,074* | *+0,140* | *sì, ma non decide* |
| *VLO, crack in dollari invece che in quota del WTI* | *−0,047* | *+0,010* | *no* |
| *XLE, finestre trimestrali* | *−0,054* | *+0,061* | *no* |

- **Nel campione, dal 2006**:
  - XLE/SPY: il WTI spiega il 32,8% e il crack aggiunge 0,039;
  - VLO: il WTI spiega l'8,3% e il crack aggiunge 0,131;
  - paniere VLO, MPC, PSX (dal 2012): il crack aggiunge 0,068.
- **XLE è un settore di petrolieri**, non di raffinatori: lo muove il WTI, e il crack aggiunge poco.
- **Per le raffinerie il crack conta.** Il criterio non passa per la prima metà di VLO, che fino al 1997 è un'altra
  società (la vecchia Valero Energy, con il gas naturale). È un risultato economico atteso, non un segnale sul mercato.

## I test funzionano? (serie sintetiche, `script/potenza.mjs`)

| Prova | Risultato |
|---|---|
| C1 · «crack» = WTI anticipato di 60 giorni esatti, soglia 20% | 14/18 prima (78%), p 0,005; metà 6/8 e 8/10: **passa** |
| C1 · stesso, anticipato di 120 giorni | 14/18, p 0,012: **passa** |
| C1 · «crack» che segue il WTI di 60 giorni | 0/18 prima: **non passa** |
| C1 · anticipo di 60 giorni con rumore del 2% / del 5% | p < 0,05 in 48 serie su 50 / in 31 su 50 |
| C1 · 200 serie indipendenti | p < 0,05 in 9 su 200 (20%) e 13 su 200 (30%), cioè circa il 5% atteso; **0 passano** |
| C2 · picco 90-120 giorni prima di ogni calo dell'S&P | 19/23 (82,6%; metà 8/11 e 11/12) contro base 49,4% e WTI 50%: **passa** |
| C2 · 200 serie indipendenti | **14 su 200 (7%) passano** il criterio così come è scritto; 81 su 200 battono la base in tutte e due le metà |
| C3 · effetto noto del crack | aumento +0,25 e +0,25 (XLE), +0,29 e +0,36 (VLO): **passa** |
| C3 · 200 crack indipendenti | 0 su 200 passano; aumento mediano −0,007, 95° percentile +0,012 |

- **Il criterio 2 è largo.** Chiede solo «più spesso» della base e del WTI, senza una soglia statistica, e lascia passare
  il 7% delle serie inventate. Il crack vero non lo passa comunque.
- **Il criterio 1 con la soglia del 30%** non può passare, nemmeno con un anticipo perfetto, perché nel 1986-2005 il WTI
  ha solo 5 casi.

## Limiti

- Pochi casi: 18 massimi del WTI (20%), 33 episodi di segnale del crack, 33 cali dell'S&P dal 1985. Le percentuali sono
  indicative.
- Tra il 1993 e il 2006 i dati giornalieri del crack sono pochi: un massimo o un minimo può cadere in un giorno senza dato.
- Il crack spot (benzina convenzionale, gasolio n. 2) non è quello dei future della diretta (RBOB, ULSD): sono molto
  correlati (0,967), con uno scarto medio di +0,96 $ e punte fino a −23,86 $ (07/11/2022, impennata del gasolio spot di
  New York).
- XLE esiste solo dal 22/12/1998, quindi la sua prima metà dura 7 anni.
- Le prove del criterio 3 su VLO dal 1997 e quella trimestrale sono state guardate dopo i risultati principali: valgono
  come descrizione, non come verdetto.

## Raccomandazione

**Nessun pannello e nessun dato notturno nuovo**: nessun criterio passa. Non anticipa il WTI, non aggiunge niente al
petrolio per i cali dell'S&P 500, e per XLE conta poco. Consiglio **un paragrafo nella guida**, nella sezione «Spread a 350
punti base e petrolio: verificati, non sono segnali» (`guida.html`, `#credito-petrolio`). La decisione spetta all'utente.

Testo proposto:

> **Crack spread 3-2-1** (margine delle raffinerie: 2 barili di benzina e 1 di gasolio meno 3 di greggio). Verificato dal
> 1986 con i prezzi spot EIA, non è un segnale:
> - i suoi massimi vengono prima di quelli del WTI in 7 casi su 18, quasi quanto a caso;
> - un crack estremo è stato seguito da un calo dell'S&P 500 del 10% o più entro 12 mesi in 18 casi su 33 (54,5%), contro
>   il 49,4% di un giorno qualsiasi, e nel 1986-2005 meno spesso della stessa regola sul petrolio.
>
> Spiega invece le raffinerie: dal 2006 aggiunge 0,13 di R² al petrolio per spiegare Valero contro l'S&P 500.
> Ricalcolo: `ricerca/crack-spread/`.

Se un giorno lo si volesse mostrare lo stesso, solo come contesto, ci sono due possibilità:
- i dati FRED, che arrivano con circa una settimana di ritardo (l'ultimo dato al 24/11/2026 è del 17/11);
- i future di Yahoo RB=F, HO=F e CL=F, che si aggiornano ogni notte ma misurano un crack diverso (RBOB e ULSD): andrebbe
  detto nell'app.

## Rifare tutto

```
node ricerca/crack-spread/script/scarica.mjs            # dati in ricerca/crack-spread/cache/ (--refresh per riscaricare)
node ricerca/crack-spread/script/backtest.mjs           # risultati.json (circa 10 s)
node ricerca/crack-spread/script/potenza.mjs            # aggiunge «potenza» a risultati.json (circa 1 min); dopo backtest
python3 -I ricerca/crack-spread/script/verifica.py      # verifica.json, ricalcolo indipendente (circa 2,5 min)
```
