# Zoom su un sottoperiodo: inserimento nel codice (fase 1, verifica preliminare)

Idea dell'utente: in tutti i grafici con il tempo in ascissa, uno zoom come in Plotly. Si trascina sul grafico per scegliere due date, il grafico si ridisegna su quel tratto con assi e scale ricalcolati sui dati visibili, e un pulsante (o il doppio clic) riporta al periodo scelto con i pulsanti 3A/10A/MAX. Stesso comportamento in tutta l'app.

Questo documento è l'inventario e il piano. Non modifica l'app. Le righe citate sono quelle della 1.7.0 (commit `34c263a`). Il commit `61b9623` ha poi aggiunto un prototipo sul solo grafico del VIX (`js/zoom.js`, `test/zoom.test.js`): il confronto è nel § 6.

Tempi misurati con Chromium headless su questo server, 5 ridisegni per caso, con il profilatore CPU di DevTools (script `ricerca/zoom/prof_ridisegni.cjs`). Su un telefono vanno moltiplicati per 3-5 circa: è una stima, non una misura.

## 1. Inventario dei grafici con il tempo in ascissa

### Grafici esclusi (il tempo non è in ascissa)

| Grafico | Perché resta fuori |
|---|---|
| RRG `#rrg` | ascissa RS-Ratio; il tempo è la scia e il cursore `#frame` |
| Bottom Map `#bm`, `#ixMap` | breadth contro drawdown; il tempo è il cursore di replay |
| `#titSpread` | barre per settore |
| `#titBubble` | bolle dei titoli |
| `#vxScatter` | VIX contro rendimento a 12 mesi |
| `#emRS` | quadrante della forza relativa |
| Sparkline del Monitor (`sparkline()`, `bottom.js` 40-46) | minuscoli, `aria-hidden`, senza interazione |
| Mini-grafici degli episodi del VIX (`spark()`, `vix-view.js` 104-118) | minuscoli, `aria-hidden`, senza interazione |

### Grafici inclusi: otto SVG in sei funzioni

| # | SVG | Vista | Funzione che disegna | Chi la chiama |
|---|---|---|---|---|
| 1 | `#ts` | 4 Settore | `drawSector` (`sector-chart.js` 48-199) | `renderSector` (`bottom.js` 413-417) |
| 2 | `#secCapSvg` | 4 Settore, scheda Cali forti | `drawCap` (`cap-chart.js` 32-169) | `card('sec')` (`cap-view.js` 93-158, disegno a 133-141) |
| 3 | `#ixTs` | 6 Indici | `drawSector` | `renderDetail` (`indices.js` 368-373) |
| 4 | `#ixCapSvg` | 6 Indici, scheda Cali forti | `drawCap` | `card('ix')` |
| 5 | `#emChart` | 7 Emergenti | `drawChart` (`emerging-view.js` 183-318) | `renderDetail` (165-181) |
| 6 | `#vxChart` | 8 VIX | `renderChart` (`vix-view.js` 257-389) | `render` (53-65) e `renderTable` (righe della soglia, 134) |
| 7 | `#perf` | 2 Rotazione, «Performance relativa» | `drawPerf` (`perf-chart.js` 30-111) | `renderPerf` (`app.js` 673-680) |
| 8 | `#titHist` | 5 Titoli, «Storia della divergenza» | `drawHist` (`titles.js` 225-291), più `histTip` (293-307) | `render` e i pulsanti del periodo (`titles.js` 88, 467) |

Il #8 è un caso a parte: 52 settimane fisse. I pulsanti 1M…1A cambiano l'orizzonte del rendimento, non la finestra. Si propone di farlo per ultimo, oppure di lasciarlo fuori se l'utente preferisce (§ 4.8).

### Scheda per grafico

#### 1 e 3. `drawSector` (`#ts`, `#ixTs`)

- **Finestra**:
  - Inizio: `i0 = rangeStart()`, cioè `bottom.js` 399-403 e `indices.js` 355-359. È il massimo tra la prima seduta utile (breadth e percentile del drawdown) e la data di oggi meno 756 o 2520 sedute (3A, 10A), oppure l'inizio della storia (MAX).
  - Fine: sempre l'ultima seduta. Il parametro di fine non esiste: `slice(i0)` alle righe 51-54.
  - Chiavi salvate: `sm.range` per il Settore (`bottom.js` 75, 537) e `sm.ixRange` per gli Indici (`indices.js` 68, 457).
- **Ascissa**: per indice di seduta, `sx(i) = L + i/(n-1)·PW` (riga 68). I settori hanno il calendario di `DATES`; ogni indice ha il suo `s.dates`.
- **Scale y, tutte sui dati visibili**:
  - Prezzo: logaritmico se la finestra supera 4 anni (`n/252 > 4`, riga 76), quindi uno zoom su MAX può passare da logaritmico a lineare.
  - Drawdown: dal minimo visibile (86).
  - Breadth: fissa da 0 a 100 (87).
  - La media 200 è calcolata su tutta la serie e poi tagliata (50-52): nello zoom è giusta, senza riscaldamento.
- **Mirino e riquadro**:
  - Il rettangolo `hit` va da L a L+PW+R (171-173).
  - Il riquadro usa `bindTip(hit, …)` (198) e `placeTip`.
  - La linea è condivisa con la scheda Cali forti tramite `syncX`/`emitX`, gruppi `'sec'` e `'ix'` (179, 185).
  - Al tocco: `pointerdown` apre il riquadro.
  - Il CSS di `svg.ts` ha `touch-action: pan-y` (`style.css` 440). Sul telefono un trascinamento verticale scorre la pagina, uno orizzontale fa scorrere il mirino.
- **Elementi sui bordi che con uno zoom possono ingannare**:
  - `lasttag` (163-168): valore a destra con il riquadro pieno, che oggi è sempre l'ultima seduta. In uno zoom che finisce nel passato mostrerebbe il valore della fine dello zoom con l'aspetto di «oggi».
  - «peggiore nel periodo» (118): diventerebbe il peggiore dello zoom. È giusto, se il testo dice «nel tratto mostrato».
  - Pallino d'ingresso dell'avvicinamento (156-162): sul bordo sinistro si toglie solo se `p.appr[i0-1]` (161). Funziona anche nello zoom se `i0` resta l'indice assoluto d'inizio. Va passato così, non ricalcolato sul tratto tagliato.
  - Bande blu e chiare (91-104): si tagliano ai bordi, accettabile. Lo zoom non aggiunge segni d'ingresso.
  - Triangoli dei trigger (139-144): solo dentro la finestra; ok anche con una fine anticipata, grazie a `i >= n`.
  - Tacche del tempo (120-129): ogni 3, 6, 12, 24 o 48 mesi. Uno zoom di 2-3 mesi può restare senza etichette.
- **Costo**:
  - `drawSector` da solo: 3-4 ms (3A), 6-8 ms (10A), 12-20 ms (MAX).
  - `renderSector` intero: 29-60 ms, con tabelle, episodi e scheda Cali forti a 14-25 ms.
  - `renderDetail` degli indici: 16-33 ms.
  - Lo zoom deve ridisegnare solo il grafico.

#### 2 e 4. `drawCap` (`#secCapSvg`, `#ixCapSvg`)

- **Finestra**:
  - Sono le sedute del grafico principale: `card()` riceve `o.dates`, `o.close` e `o.from` (`bottom.js` 448, `indices.js` 408) e taglia da `o.dates.indexOf(o.from)` fino alla fine (`cap-view.js` 133-135).
  - Non ha pulsanti di periodo propri.
  - Le scelte della scheda sono salvate in `sm.cap` (soglia, sedute, unità).
- **Ascissa**: per indice di seduta (riga 42).
- **Scale y, sui dati visibili**:
  - Prezzo logaritmico oltre 4 anni (46).
  - La scala dei cali forti si taglia a 1,3 volte la soglia di allerta più alta «del periodo» (59-65): con lo zoom cambia il taglio e cambiano le etichette ▲ (114-133). È coerente con la nota della scheda («del periodo»).
- **Mirino**: `hit` (147), `bindTip` (168), `syncX` con il grafico principale (151).
- **Bordi**:
  - `lasttag` di prezzo e cali (137-142).
  - Scritta «soglia X» (135-136): soglia all'ultima seduta della finestra, quindi nello zoom alla fine del tratto.
  - Bande degli episodi di allerta (68-77) tagliate ai bordi: un'allerta iniziata prima dello zoom sembra iniziare sul bordo. Il riquadro dice «allerta».
- **Scheda chiusa** (`<details>`): ha larghezza zero e all'apertura si ridisegna con gli ultimi argomenti (`cap-view.js` 99-100, `last[p]`). Lo zoom va letto al momento del disegno, non salvato negli argomenti.
- **Costo**: `drawCap` 1-9 ms; `card()` 6-25 ms per la tabella degli episodi e `capOutcomes`.

#### 5. `drawChart` degli Emergenti (`#emChart`)

- **Finestra**:
  - Per data, in millisecondi: `t1 = ultima data`; `t0 = t1 − 3 o 10 anni`, oppure l'inizio (`emerging-view.js` 187-189).
  - `inWin(d)` (191); `i0` è la prima seduta nella finestra (205).
  - Chiave salvata: `sm.emRange` (39, 360).
- **Ascissa**: per data (`x(d) = L + (Date.parse(d) − t0)/(t1 − t0)·PW`, 190). Serve perché le serie hanno calendari diversi: indice, cambio della Fed giornaliero, dollaro FRED settimanale.
- **Scale y**:
  - Prezzo: in base 100 alla prima seduta della finestra con entrambe le linee (`jb`, 209-212). Lo zoom cambia la base: la nota deve dirlo sempre (oggi `baseNote`, 213, compare solo se `jb > i0`).
  - Breadth: fissa da 0 a 100.
  - Cambio e dollaro: sui valori visibili (`scale(…)` con `inWin`, 214-221, 262, 272).
- **Mirino**: `hit` (284); `syncX('emg')` (287), gruppo con un solo grafico; `bindTip` (307).
- **Bordi**:
  - Bande (zona blu, cambio in calo forte o fermo, dollaro favorevole) dal primo giorno visibile (222-227): nessun segno d'ingresso.
  - Triangoli dei trigger solo nella finestra (252).
  - Tacche: solo anni (236-242). Uno zoom dentro un solo anno (per esempio febbraio-novembre 2020) resta senza etichette.
- **Costo**: `drawChart` 14-18 ms, anche a 3A: scorre tutte le date con `Date.parse`. `renderDetail` ne aggiunge 1-2.

#### 6. `renderChart` del VIX (`#vxChart`)

- **Finestra**:
  - Come gli Emergenti, per data: `t0`/`t1` (`vix-view.js` 262-264), `inWin`.
  - Chiave salvata: `sm.vxRange` (28, 394).
- **Ascissa**: per data. L'indice scelto (SPX o NDX) è preso per data (`ixAt`).
- **Scale y, tutte sui visibili**:
  - VIX e realizzata (285); indice, logaritmico sui visibili (292-307).
  - Premio (311); VIX/VIX3M (336-350); credito (352-361).
- **Mirino**: `hit` (367), `bindTip` (385). Nessuna linea condivisa.
- **Bordi**:
  - Fasce degli episodi tagliate a `t0`/`t1` (296-300).
  - Fascia grigia «prima che la serie esista» (`noData`, 320-329): solo se l'inizio della serie cade dopo `t0`. Nello zoom funziona.
  - Pallino dell'ultimo VIX/VIX3M: solo se l'ultima seduta è visibile (348). Ok.
  - Tacche: solo anni (280-281), con lo stesso problema degli Emergenti.
- **Costo**:
  - `renderChart` 16-38 ms.
  - `render()` intero 26-60 ms, con indicatori, tabella e scatter.
  - Lo zoom deve chiamare solo `renderChart`.

#### 7. `drawPerf` (`#perf`)

- **Finestra**:
  - `i0 = ultima − days` (riga 33).
  - `days` viene da `#perfSeg` (63/126/252/504 sedute, chiave `sm.perfDays`, `app.js` 37, 909).
  - Il calendario dipende dal gruppo (USA, UCITS, asset reali).
- **Ascissa**: per indice di seduta (56).
- **Scale y**:
  - Base 100 al primo prezzo del periodo di ogni linea (36-45), con «quotato dal …» per gli ETF più giovani.
  - Scala sui visibili (52-55). Lo zoom ribasa a 100 all'inizio del tratto.
- **Mirino**: `hit` (92), `bindTip` (105); il riquadro va sopra il puntatore (`dy −40`).
- **Bordi**:
  - Etichette finali (76-85): valore alla fine della finestra; migliore e peggiore scelti lì.
  - Legenda «dal …» (107-110): con lo zoom deve diventare «dal … al …».
- **Ridisegni frequenti**: `refreshFocus` (`app.js` 682-687) ridisegna `#perf` a ogni cambio di evidenza nella RRG, cioè a ogni passaggio del mouse. Lo zoom deve stare fuori da `drawPerf` e i listener non vanno aggiunti a ogni disegno.
- **Costo**: 1-3 ms.

#### 8. `drawHist` dei Titoli (`#titHist`)

- **Finestra**: le 52 settimane del file (`D.hist.dates`, dal 14/11/2025 al 06/11/2026 nei dati di oggi). Nessun pulsante di finestra.
- **Ascissa**: per indice (`X(i)`, 251).
- **Scala y**: su tutti i valori (249). Con lo zoom va calcolata sui visibili.
- **Mirino**: non usa `bindTip`. Ha `pointermove` e `click` propri sull'SVG (`titles.js` 480-483); `hist` conserva la geometria (291).
- **Bordi**:
  - Pallino ed etichette dell'ultimo valore a destra (279-289).
  - La nota sopra il grafico («oggi…, nell'anno da … a …», 242-244) resta sull'anno intero, anche nello zoom.
- **Costo**: 2-3 ms.

## 2. Modulo comune proposto: `js/zoom.js`

### 2.1 Funzioni pure, provate in Node

Lo zoom si conserva come coppia di **date ISO** `[d0, d1]` (sedute), non come millisecondi né come indici:
- vale sia per i grafici per indice sia per quelli per data;
- sopravvive al cambio di settore, indice o gruppo, che hanno calendari diversi;
- si scrive e si confronta facilmente nei test.

```text
pickRange(xa, xb, geo, minSessions = 10) → [d0, d1] | null
    geo = { L, PW, dates, idxAt(x) }: il grafico dice quale seduta sta sotto una x (la stessa regola del suo riquadro).
    x limitate a [L, L+PW], ordinate; null se le sedute comprese sono meno di minSessions.
windowIdx(dates, iBase, range, minSessions) → { i0, i1, zoomed }
    per i grafici per indice: i0 = prima seduta ≥ max(d0, dates[iBase]), i1 = ultima ≤ d1;
    se restano meno di minSessions sedute (indice con un'altra storia) → la finestra del periodo, zoomed = false.
windowTime(t0, t1, range) → [t0', t1'] | null      per i grafici per data (Emergenti, VIX)
timeTicks(t0, t1, maxN) → [{ t, label }]           anni, trimestri/mesi, settimane (c'è già nel prototipo)
sessionTicks(dates, i0, i1, maxN) → [{ i, label }]  le stesse tacche portate sulla prima seduta ≥ tacca
zoomText([d0, d1]) → 'dal 03/02/2020 al 15/05/2020'
```

### 2.2 Collegamento al DOM

```text
const z = zoomGroup(key, { lens, chip, onChange })   // una volta, nel bind() della vista
z.attach(svg)                                        // una volta per SVG (non nelle funzioni che disegnano)
z.geo(svg, { L, PW, top, bottom, dates, idxAt })     // a ogni disegno, dopo aver calcolato la geometria
z.range  // [d0, d1] | null, letto da chi disegna
z.reset() // senza ridisegnare (lo usa il pulsante del periodo prima del suo render)
z.set([d0, d1])
```

- **Gruppi**:

  | Chiave | SVG del gruppo |
  |---|---|
  | `sec` | `#ts` e `#secCapSvg` |
  | `ix` | `#ixTs` e `#ixCapSvg` |
  | `emg` | `#emChart` |
  | `vix` | `#vxChart` |
  | `perf` | `#perf` |
  | `titHist` | `#titHist` |

  Sono le stesse chiavi di `syncX`. Uno zoom su un grafico vale per tutti i grafici del gruppo, come la linea del mirino. Esempio: uno zoom sul 2020 nel prezzo del settore si vede anche nei cali forti.
- **Chi conserva lo stato**: il modulo, in memoria, una `Map` per gruppo.
  - **Non salvato** in `localStorage`. All'apertura l'app mostra il periodo dei pulsanti.
  - Uno zoom salvato, con i dati che si aggiornano ogni notte, riaprirebbe un tratto che non si ricorda più di aver scelto.
  - Lo zoom resta passando da una vista all'altra nella stessa sessione.
- **Pulsanti di periodo**:
  - Lo zoom sta sempre dentro la finestra del periodo: si seleziona solo il tratto visibile.
  - Il periodo resta segnato (`aria-pressed`).
  - Qualsiasi pulsante di periodo, anche quello già scelto, **toglie lo zoom**. Ripremere 3A significa «torna a 3A».
  - Zoom dentro zoom: permesso. Il ritorno porta sempre al periodo, non al passo prima, come il doppio clic di Plotly.
- **Etichetta**: «Zoom: dal 03/02/2020 al 15/05/2020 ×», accanto ai pulsanti del periodo.
  - Per la scheda Cali forti, che sta più in basso, una copia dell'etichetta va nell'angolo del suo grafico, così si vede dove si guarda.
  - Va fuori da `.controls`, che in stampa sparisce (`style.css` 583-595): lo zoom deve restare scritto anche su carta.
- **Come si torna al periodo**: «×» dell'etichetta, doppio clic sul grafico, Esc, oppure un pulsante del periodo.
- **Cambio di settore, indice, paese o indice del VIX (SPX/NDX)**:
  - Si propone di **tenere** lo zoom e di tagliarlo alla storia disponibile. Così si confrontano più settori nello stesso tratto, per esempio marzo 2020.
  - Se restano meno di `minSessions` sedute, lo zoom si toglie.
  - È una decisione dell'utente: l'alternativa è azzerarlo.
- **Cambio di gruppo nella Rotazione** (calendario diverso): si taglia allo stesso modo.
- **Ridimensionamento della finestra, cambio del tema, livello blu ±, scelte della scheda Cali forti**: lo zoom resta.

### 2.3 Mirino, riquadro dei valori e selezione

- **Mouse**:
  1. `pointerdown` con il tasto sinistro nell'area del grafico (tra L e L+PW, tra `top` e `bottom`) prepara un trascinamento.
  2. Sotto 5 px di movimento orizzontale tutto resta come oggi: il clic apre o aggiorna il riquadro.
  3. Oltre 5 px:
     - si nascondono riquadro, mirino e linea condivisa (`emitX(group, id, null)`);
     - si cattura il puntatore;
     - si disegna la banda della selezione con le due date scritte nell'etichetta mentre si trascina;
     - la banda diventa grigia se il tratto è sotto la soglia minima.
  4. `pointerup`: sopra la soglia diventa lo zoom e si ridisegna una volta sola; sotto la soglia si annulla.
  5. Il `click` che segue il trascinamento si ignora con un flag. Serve per `#titHist`, dove il clic apre il riquadro.
  6. Niente ridisegno durante il trascinamento: si sposta solo la banda.
- **Tocco**:
  - Senza lente niente cambia: tocco = riquadro, trascinamento verticale = scorrimento della pagina, orizzontale = mirino (`touch-action: pan-y`).
  - **Pulsante lente** accanto ai periodi (`aria-pressed`). Accesa, l'SVG prende la classe `zooming` (`touch-action: none`) e il trascinamento seleziona.
  - Un tocco senza trascinamento continua ad aprire il riquadro.
  - La lente si spegne da sola dopo uno zoom, con un secondo tocco o con Esc. Non resta accesa cambiando vista: altrimenti il grafico «blocca» lo scorrimento della pagina.
  - La penna fa come il tocco.
- **Alternativa sul telefono**: una barra di navigazione sotto il grafico, cioè la miniatura con le due maniglie del rangeslider di Plotly.
  - Si scopre meglio e con due cursori nativi sarebbe anche accessibile da tastiera.
  - Costa 40-50 px di altezza per grafico e molto più codice.
  - Si propone la lente nella prima versione e la barra come evoluzione, se l'utente la vuole.
- **Soglia minima**: 10 sedute per i grafici giornalieri, circa due settimane: abbastanza per due etichette di data e per la curva. Per `#titHist`, che è settimanale, 6 settimane. Sotto la soglia la selezione si annulla.
- **Tastiera ed Esc**:
  - Esc toglie lo zoom della vista visibile.
  - Oggi ci sono già due gestori di Esc su `document`: la RRG (`app.js` 980-984) e la crisi evidenziata del VIX (`vix-view.js` 392). Serve una precedenza: un Esc toglie una cosa sola, prima lo zoom, poi l'evidenza.
  - Si propone una funzione `zoomEsc()` che `app.js` chiama per prima e che ferma la propagazione se ha tolto uno zoom.
  - Nella guida: «Esc toglie lo zoom».
  - Una selezione da tastiera (con ←/→ dopo la lente) non è nella prima versione: chi usa la tastiera ha i pulsanti del periodo.
- **Accessibilità**:
  - Lente: `button` con `aria-label` («Zoom: scegli un tratto sul grafico») e `aria-pressed`.
  - «×»: `aria-label` «Togli lo zoom e torna a 3A». Dopo il clic il focus torna al pulsante del periodo scelto.
  - Una regione `aria-live="polite"` annuncia «Zoom dal … al …».
  - L'`aria-label` dell'SVG riceve « · zoom dal … al …».
  - Su `svg.ts`, `svg.perf` e `svg.cq` va `user-select: none`, per non selezionare il testo durante il trascinamento.

## 3. Modifiche per grafico (righe della 1.7.0)

### 3.1 `js/sector-chart.js` (`#ts`, `#ixTs`)

1. **Righe 49-54**: nuovo parametro `i1` (fine, default `p.dates.length − 1`). Tutti i `slice(i0)` diventano `slice(i0, i1 + 1)`. `i0` e `i1` sono assoluti.
2. **Righe 106 e 163-168**:
   - `lasttag` e il salto delle etichette dell'asse vicino al valore (`tagY`) solo se `i1` è l'ultima seduta.
   - Altrimenti niente riquadro pieno, che sembrerebbe «oggi». Al suo posto l'etichetta normale dell'asse, oppure un riquadro vuoto con la data (scelta grafica da mostrare all'utente).
3. **Riga 118**: «peggiore nel periodo» diventa «peggiore nel tratto» quando lo zoom è attivo (versione corta «min» invariata).
4. **Righe 120-129**: tacche con `sessionTicks()`, che aggiunge mesi e settimane alle finestre corte.
5. **Dopo la riga 198**: `p.zoom?.geo(svg, { L, PW, top: P0.y0, bottom: P2.y1, dates, idxAt })`, dove `idxAt` è la stessa formula di 183.
6. **Nessuna modifica** al pallino dell'avvicinamento (161), ma `i0` deve restare assoluto (punto 1).

### 3.2 `js/bottom.js` (Settore)

- **Righe 404-418**: spostare la chiamata a `drawSector` in una funzione `drawTs(s)`. Legge `rangeStart(s)` e lo zoom del gruppo `sec` (`windowIdx`) e passa `i0`/`i1`.
  - Lo zoom chiama `drawTs` più il ridisegno del solo `drawCap` (§ 3.4), non `renderSector`: 30-60 ms con tabelle ed episodi, contro 3-20 ms.
- **Riga 448**: `cap.card` riceve anche `to` (fine della finestra).
- **Riga 537**: il pulsante del periodo chiama `zoom.reset()` prima di `renderSector()`.
- **`bind()` (533-546)**:
  - `zoomGroup('sec', { lens: $('secLens'), chip: $('secZoom'), onChange: () => { drawTs(st.sector); cap.redraw('sec'); } })`;
  - `attach($('ts'))` e `attach($('secCapSvg'))`.
- **`openSector` (395-398)**: niente reset, se l'utente decide di tenere lo zoom cambiando settore (§ 2.2).

### 3.3 `js/indices.js` (Indici)

Come il Settore:
- **Righe 368-373**: `drawTs(k)`, con `windowIdx(s.dates, rangeStart(k), zoom.range)`.
- **Riga 408**: `to` per la scheda Cali forti.
- **Riga 457**: reset al cambio di periodo.
- **`bind()` (453-497)**: gruppo `ix`.
- **Calendari**: ogni indice ha il suo. Lo zoom per date si traduce in indici con `windowIdx`. Un indice con la storia che inizia dopo lo zoom ricade nel periodo (`zoomed = false`, etichetta nascosta per quel disegno).

### 3.4 `js/cap-view.js` e `js/cap-chart.js` (`#secCapSvg`, `#ixCapSvg`)

- **`cap-view.js` 133-141**:
  - `i1` da `o.to` (indice della fine), `days = o.dates.slice(i0, i1 + 1)` e lo stesso taglio per `o.close`.
  - La tabella degli episodi (144-149) resta su tutta la storia, come oggi.
- **Nuova funzione `redraw(p)`**: ridisegna solo `drawCap` con `last[p]` e lo zoom corrente. È quella che lo zoom chiama al posto di `card()`, che costa 6-25 ms.
- **`cap-view.js` 99-100**: all'apertura della scheda `card(p, …last[p])` legge lo zoom corrente. Funziona se `o.to` si ricalcola lì, non se resta negli argomenti salvati.
- **`cap-chart.js`**:
  - 78 e 137-142: `lasttag` solo se la finestra arriva all'ultima seduta.
  - 135-136: la scritta «soglia X» diventa «soglia X al <data>» se non è l'ultima seduta.
  - 91-99: tacche con `sessionTicks`.
  - Dopo 168: `p.zoom?.geo(…)`.

### 3.5 `js/emerging-view.js` (`#emChart`)

- **Righe 187-191**: se c'è lo zoom, `t0`/`t1` da `windowTime(t0, t1, z.range)`; `inWin` resta com'è.
- **Righe 205-213**: con `i0` dallo zoom, `jb` prende la prima seduta dello zoom. **La base 100 si sposta all'inizio dello zoom.** `baseNote` va sempre scritto quando c'è lo zoom («base 100 al <data>»): è un numero che cambia valore, deve essere detto.
- **Righe 236-242**: tacche con `timeTicks()`.
- **Dopo la riga 307**: `z.geo(svg, { L, PW, top: panes[0].y0, bottom: panes[3].y1, dates, idxAt })`, con `idxAt` dalla ricerca di 290-292.
- **Riga 360**: reset al cambio di periodo.
- **`bind()` (359-363)**:
  - gruppo `emg`, con `onChange: () => drawChart(row(st.sel))`;
  - non `renderDetail`, che rifà le note, anche se costa solo 1-2 ms in più.

### 3.6 `js/vix-view.js` (`#vxChart`)

- **Righe 262-264**: `t0`/`t1` da `windowTime` (il prototipo lo fa già: § 6).
- **Righe 280-281**: tacche con `timeTicks`.
- **Dopo la riga 385**: `z.geo(…)`.
- **Riga 394**: reset al cambio di periodo. **Riga 393** (SPX/NDX): lo zoom resta.
- **Riga 392**: precedenza di Esc (§ 2.3).
- **Riga 134** (scelta della soglia): ridisegna `renderChart` e lo zoom resta. Nessuna modifica.

### 3.7 `js/perf-chart.js` e `js/app.js` (`#perf`)

- **`perf-chart.js`**:
  - **Riga 33**: nuovo parametro `range`. Se c'è, `i0`/`i1` vengono da `windowIdx(all, i0, range)` e `dates = all.slice(i0, i1 + 1)`. I `slice(i0)` di 44 diventano `slice(i0, i1 + 1)`. La base 100 e il «quotato dal» seguono da soli.
  - **Righe 61-68**: tacche (`sessionTicks`) per gli zoom sotto il mese.
  - **Righe 107-110**: legenda «dal … al …» quando lo zoom è attivo.
  - **Dopo la riga 105**: `p.zoom?.geo(…)`.
- **`app.js`**:
  - **673-680** (`renderPerf`): passa `range` e `zoom`.
  - **909**: reset al cambio di periodo.
  - **`bind()`**: gruppo `perf`, con `onChange: renderPerf`.
  - **Esc (980-984)**: chiama per prima `zoomEsc()`.
  - **`refreshFocus` (682-687)**: nessuna modifica, perché lo zoom sta nel modulo, ma il test deve provarlo.

### 3.8 `js/titles.js` (`#titHist`), ultimo e facoltativo

- **Righe 245-291**:
  - finestra `i0`/`i1` dallo zoom;
  - `vals` (249) sui visibili;
  - `X(i)` sulla finestra;
  - etichette e pallino finali (279-289) solo se `i1` è l'ultima settimana.
- **Riga 291**: `hist` riceve `i0`.
- **`histTip` (293-307)**: aggiungere `i0` all'indice.
- **Righe 480-483**: `zoomGroup('titHist', …)`. Il `click` dopo un trascinamento si ignora.
- **Ritorno al periodo**: qui non ci sono pulsanti di finestra, quindi si torna con «×», doppio clic ed Esc. L'etichetta va nell'intestazione del pannello (`#titHistMeta`, 241).

### 3.9 `index.html`, `css/style.css`, `guida.html`, `README.md`

- **`index.html`**: lente ed etichetta dello zoom accanto a:
  - `#rangeSeg` (340-344);
  - `#ixRange` (575-579);
  - `#emRange` (776);
  - `#vxRange` (465);
  - `#perfSeg` (283-288);
  - `#titHistMeta`.

  Una copia dell'etichetta va dentro `#secCapWrap` (381) e `#ixCapWrap` (614). Più una regione `aria-live`.
- **`css/style.css`**:
  - `.zoomband`;
  - `svg.ts.zooming`, `svg.perf.zooming`, `svg.cq.zooming { touch-action: none }`;
  - `user-select: none` sui tre;
  - etichetta e lente in entrambi i temi;
  - `@media print` (583): l'etichetta resta visibile.
- **`guida.html`**:
  - «Come si legge» del Settore (285), degli Emergenti (366), del VIX e dei Titoli;
  - «Telefono e tablet» (443): la lente;
  - «Tasti» (436): «Esc toglie lo zoom».
- **README**: nota della versione (1.8.0: vista nuova, schema semver dopo la 1.0) e descrizione del modulo.

## 4. Rischi principali

1. **Ridisegni che costano troppo o che perdono lo zoom**:
   - Lo zoom deve ridisegnare solo i grafici del gruppo. Chiamare `renderSector`, `renderDetail` o `render()` del VIX costa 30-60 ms e rifà tabelle ed episodi.
   - Lo stato deve vivere fuori dalle funzioni di disegno. `#perf` si ridisegna a ogni passaggio del mouse sulla RRG; il ridimensionamento chiama `renderAll`; il livello blu chiama `renderSector`.
2. **Listener duplicati**: `drawSector`, `drawCap` e `drawPerf` girano molte volte. Lo zoom si aggancia all'SVG una volta sola, in `bind()`; l'SVG resta lo stesso elemento, perché si svuota con `replaceChildren`.
3. **Numeri che cambiano significato ai bordi**:
   - `lasttag` di prezzo, drawdown, breadth e cali forti;
   - scritta «soglia X»;
   - etichette finali di `#perf` e `#titHist`;
   - base 100 di `#perf` ed `#emChart` (si sposta all'inizio dello zoom);
   - «peggiore nel periodo»;
   - taglio della scala dei cali forti;
   - passaggio da scala logaritmica a lineare.

   Ognuno va adattato e detto nell'app (regola principale di `CLAUDE.md`).
4. **Asse del tempo senza etichette** negli zoom corti: oggi `drawSector` e `drawCap` scendono al massimo a 3 mesi, Emergenti e VIX hanno solo gli anni.
5. **Calendari diversi**: indici, cambi, dollaro settimanale, gruppi della Rotazione. Lo zoom per date ISO e la funzione `windowIdx` con la soglia minima evitano finestre vuote.
6. **Telefono**:
   - La lente accesa blocca lo scorrimento della pagina sul grafico, quindi deve spegnersi da sola.
   - Senza lente il comportamento di oggi non deve cambiare: tocco = riquadro, scorrimento verticale, mirino in orizzontale.
7. **Conflitti di Esc** con l'evidenza della RRG e la crisi del VIX. **Clic dopo un trascinamento** in `#titHist`.
8. **Gruppi condivisi**: la scheda Cali forti chiusa ha larghezza zero e si ridisegna all'apertura con argomenti vecchi; deve leggere lo zoom di quel momento.
9. **Decisioni da chiedere all'utente prima del codice** (grafica e formule visibili):
   - base 100 all'inizio dello zoom o quella del periodo;
   - zoom tenuto o azzerato cambiando settore, indice o paese;
   - lente o barra sotto il grafico;
   - `#titHist` dentro o fuori;
   - cosa mostrare al posto del valore «ultimo» a destra.

## 5. Controlli da scrivere (devono fallire sulla 1.7.0)

### 5.1 Unitari: `test/zoom.test.js`

Sulla 1.7.0 falliscono tutti perché `js/zoom.js` non esiste. Sul prototipo falliscono quelli delle funzioni che ancora mancano.

- `pickRange`:
  - trascinamento da destra a sinistra: date ordinate;
  - x oltre i bordi: tagliate a `dates[0]` e `dates.at(-1)`;
  - 9 sedute → `null`, 10 → intervallo;
  - con `idxAt` per indice e per data, la data scelta è quella che il riquadro mostrerebbe in quella x.
- `windowIdx`:
  - zoom dentro la storia → indici giusti (prima ≥ d0, ultima ≤ d1, anche se d0 o d1 cadono di sabato);
  - zoom prima dell'inizio della serie, oppure con meno di 10 sedute in comune → finestra del periodo, `zoomed = false`;
  - `i0` mai prima di `iBase`.
- `windowTime`: intersezione con il periodo; `null` se vuota.
- `timeTicks` e `sessionTicks`:
  - per finestre di 3 settimane, 2 mesi, 8 mesi, 3 anni e 30 anni: almeno 2 etichette, al massimo `maxN`, tutte dentro la finestra, in ordine crescente;
  - `sessionTicks` dà indici di sedute esistenti.
- `zoomText`: «dal 03/02/2020 al 15/05/2020».

### 5.2 Nel browser: `ricerca/qa/browser/vZOOM.cjs`

Stesso impianto di `v170.cjs`.

**Ambienti**:
- 1440 scuro, 1280 chiaro, 1024 chiaro;
- 390 scuro con `hasTouch`;
- i trascinamenti al tocco con `Input.dispatchTouchEvent` di CDP.

**Grafici**: `#ts` (XLK), `#secCapSvg`, `#ixTs` (SPX e un indice asiatico, per il calendario diverso), `#ixCapSvg`, `#emChart`, `#vxChart`, `#perf`, `#titHist` se incluso.

**Per ciascuno**:

1. **Esistenza**: lente ed etichetta ci sono, con `aria-label` e `aria-pressed`. Sulla 1.7.0 fallisce.
2. **Trascinamento col mouse** dal 30% al 60% dell'area del grafico:
   - l'etichetta è visibile con «dal X al Y»;
   - X e Y sono le date che il riquadro mostra in quei due punti *prima* dello zoom (± 1 seduta);
   - dopo lo zoom, il riquadro al bordo sinistro mostra X e quello al bordo destro Y.
3. **Sedute ridisegnate**: il numero di punti di `path.px` (o della linea principale) è uguale al numero di sedute tra X e Y, contate in modo indipendente dai file in `data/`.
4. **Scale sui visibili**:
   - il punto più alto della linea del prezzo sta entro il 6-8% dal bordo alto del suo pannello, e il più basso entro il 6-8% dal bordo basso;
   - nessun punto esce dal riquadro.
5. **Valori invariati**: per le serie non ribasate, il riquadro in una data dentro lo zoom mostra gli stessi valori che mostrava senza zoom.
6. **Valori ribasati** (`#perf`, `#emChart`):
   - il valore alla fine dello zoom è uguale a `close[Y]/close[X]·100`, calcolato dai JSON;
   - la nota o la legenda dice «base 100 al X» e «dal X al Y».
7. **Bordi**:
   - zoom che finisce prima dell'ultima seduta: nessun `rect.lasttag` (oppure l'etichetta con la data, secondo la decisione);
   - «soglia X al <data>» nei cali forti;
   - nessun `circle.apprin` con `cx = L` se il tratto di avvicinamento era iniziato prima: lo zoom parte dentro un tratto noto, calcolato in Node con i moduli dell'app come fa `v170.cjs` con `vix.js`.
8. **Tacche**: in uno zoom di circa 2 mesi almeno 2 etichette sull'asse del tempo. Sulla 1.7.0 Emergenti e VIX ne hanno 0 dentro un solo anno; `drawSector` ne ha 0 o 1.
9. **Gruppi**: zoom su `#ts` → `#secCapSvg` ha le stesse date ai bordi; e il contrario. Con la scheda chiusa e poi aperta, lo zoom c'è.
10. **Clic senza trascinamento** (o con meno di 5 px): si apre il riquadro come oggi e nessuno zoom. Trascinamento di 9 sedute: niente zoom.
11. **Ritorno al periodo** con doppio clic, «×», Esc e pulsante del periodo (anche quello già scelto):
    - etichetta nascosta;
    - sedute di nuovo quelle del periodo;
    - `aria-pressed` invariato;
    - dopo «×» il focus sul pulsante del periodo.
12. **Lo zoom resta** dopo:
    - livello blu ±;
    - cambio di tema;
    - ridimensionamento oltre 40 px;
    - cambio di scelta nella scheda Cali forti;
    - passaggio del mouse sulla RRG (`#perf`);
    - cambio SPX/NDX e soglia del VIX;
    - cambio di settore (se l'utente decide di tenerlo).
13. **Esc con l'evidenza del VIX**: il primo Esc toglie lo zoom e lascia l'evidenza, il secondo toglie l'evidenza.
14. **Non salvato**: dopo il ricaricamento nessuno zoom e nessuna chiave nuova in `localStorage`.
15. **Telefono**:
    - trascinamento orizzontale senza lente: nessuno zoom e la pagina non si blocca;
    - trascinamento verticale: `scrollY` cambia;
    - lente → trascinamento → zoom, e la lente si spegne;
    - tocco con la lente accesa: si apre il riquadro;
    - nessuno scorrimento orizzontale della pagina;
    - l'etichetta sta nella larghezza.
16. **Console senza errori** in tutti gli ambienti.

**Screenshot da mostrare all'utente prima della pubblicazione**: computer e telefono, chiaro e scuro, un grafico per vista con lo zoom, salvati in `ricerca/zoom/shots/`.

## 6. Confronto con il prototipo già nel ramo (`61b9623`, solo `#vxChart`)

Il prototipo segue già l'impianto di questo piano:
- trascinamento col mouse;
- lente sul telefono;
- «Zoom: dal … al … ×»;
- doppio clic, Esc e periodo per tornare;
- `timeTicks`;
- banda della selezione;
- `touch-action: none` solo con la lente.

**Da sistemare per estenderlo a tutti i grafici**:

1. **Lo stato è in millisecondi** (`pickRange` arrotonda al giorno UTC).
   - Per i grafici per indice serve la data della seduta: date ISO e `windowIdx`.
   - La soglia minima è di 10 giorni di calendario, circa 7 sedute: meglio contare le sedute.
2. **Nessun gruppo**. `#ts` con `#secCapSvg` e `#ixTs` con `#ixCapSvg` hanno bisogno di uno zoom condiviso.
3. **Esc**: il listener di `attachZoom` e quello della crisi evidenziata (`vix-view.js` 395 nel prototipo) scattano insieme. Un Esc toglie sia lo zoom sia l'evidenza.
4. **Lente senza `aria-label`**: c'è solo `title`. Manca anche la regione `aria-live`.
5. **Durante il trascinamento**:
   - `bindTip` continua a mostrare il riquadro a ogni movimento e il modulo lo rinasconde, cercando il primo `.tip` nel genitore;
   - il mirino resta visibile;
   - meglio un flag `dragging` letto dal riquadro.
6. **`user-select: none`** è solo su `.ts`. `#perf` (`svg.perf`) e `#titHist` (`svg.cq`) ne hanno bisogno.
7. **Etichetta dello zoom**: nel prototipo sta nell'intestazione del pannello, che in stampa resta visibile. Va controllato per le viste dove i pulsanti sono in `.controls` (Settore, Indici), che in stampa sparisce.
8. **Commit nel ramo di sviluppo**: il prototipo è entrato anche in `js/`, `index.html` e `css/` (commit `61b9623`, prima dell'ok dell'utente). Se l'utente non approva va tolto, e i file su `main` non vanno copiati da questo ramo finché non è deciso.
