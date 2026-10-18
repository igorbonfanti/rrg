# Sector Monitor v0.9.0: controllo grafico e visivo (QA UI)

Data: 18/10/2026 · dati dell'app al 16/10/2026 · server locale `gzserve.mjs` sulla porta 8802 · Chromium (Playwright).
Il repository `/home/user/rrg` non è stato modificato.

**Copertura.** 5 viewport (1440×900, 1280×720, 820×1180, 390×844, 360×740) × 2 temi (scuro/chiaro). Per ciascuna combinazione: Monitor; Rotazione con gli 8 universi (Settori, MAG7, 1–6) e tutte e due le formule (Nuova, Medie semplici), più la tabella Prezzi; Bottom Map oggi, al 20/03/2020 e al 20/11/2008; Settore XLK e XLE con la scheda Cali forti aperta; Alert; Indici (tabellone, mappa, mappa al 2020, dettaglio, Cali forti); Titoli; guida rapida (modale); intro; `guida.html`. Su 1440 e 390 ci sono anche le schermate dei singoli pannelli (`__pNN`). In più: modalità CVD (1440 e 390, scuro e chiaro), focus da tastiera, stati di caricamento con rete rallentata, tooltip (mouse e tocco), misura del contrasto calcolato e della dimensione reale del testo nei grafici.

In tutto le schermate sono 543, in `OUT/shots/`. I ritagli delle pagine lunghe sono in `OUT/tiles/`. I dati grezzi sono in `OUT/audit-*.json` (sovrapposizioni dei testi SVG, testo tagliato, overflow) e `OUT/measure.json` (contrasto, corpo minimo del testo, tabelle che scorrono). Gli script sono in `scratchpad/qa-browser/g_*.js`.
Nomi dei file: `<viewport>-<tema>__<vista>.png`, per esempio `390x844-dark__6idx.png`.

## Riepilogo

| Gravità | n. | Temi principali |
|---|---|---|
| Bloccante | 0 | — |
| Alta | 4 | tabellone Indici sul telefono, testo dei grafici a 7,7–9 px sul telefono, tooltip irraggiungibili al tocco, Bottom Map delle crisi illeggibile |
| Media | 11 | colori della Bottom Map ≠ stato, focus invisibile, etichette sovrapposte, scroll orizzontale evitabile, fasce invisibili, ordine dei pannelli sul telefono, testi CVD, tablet |
| Bassa | 9 | titoli degli assi a filo, tick sotto le etichette, allineamenti, caricamento, testi |

Cose che vanno bene:
- nessuno scroll orizzontale della pagina, a nessuna larghezza;
- nessun NaN, `undefined` o segno meno ASCII nei valori (i trattini trovati sono «Gov 1-3» e «Nasdaq-100»);
- su desktop i tooltip restano sempre dentro lo schermo (punti agli estremi di 11 grafici);
- la scala logaritmica è scritta nel titolo del pannello («PREZZO (SCALA LOGARITMICA)»);
- i colori dei quadranti coincidono tra legenda, punti, pillole della tabella e Monitor, in tutti e due i temi;
- il contrasto AA del testo è rispettato ovunque in tutti e due i temi, con una sola eccezione (M9);
- la guida e la modale scorrono bene anche a 360 px.

---

## Coerenza tra grafico e tabella (5 campioni, più i controlli automatici)

Le coordinate SVG sono state convertite in valori con l'interpolazione dei tick degli assi (`g_cons.js`).

| # | Vista | Grafico | Tabella o tooltip | Esito |
|---|---|---|---|---|
| 1 | Bottom Map, oggi | XLRE y = +8,7 pt; XLU +11,1; XLV +72,3; XLE x = 0° | Distanza dal livello blu: +8,7 / +11,1 / +72,3; tooltip XLE «Profondità storica 0° pct», drawdown 0,0% | ✓ tutti e 11 i settori (y entro 0,1 pt, x uguale al percentile del tooltip) |
| 2 | Bottom Map, 20/03/2020 | XLRE −8,0; XLY −6,3; XLP +0,1 | lista: −8,0 / −6,3 / +0,1 pt; tooltip XLRE 0,0% contro livello 8% | ✓ (XLK è «Attenzione», giallo, dentro l'area blu: coerente con «colore = stato di quel giorno») |
| 3 | Settore XLK | etichette dell'ultimo valore 183,47 · −9,2% · 60,0% | Situazione: ultimo 183,47, sopra media 200 45/75 · 60,0%, drawdown −9,2%; Monitor 60,0% e −9,2% | ✓ |
| 4 | Rotazione, settori | punti XLK 101,36/99,30, XLC 97,92/100,67 (tutti gli 11) | tabella RS-Ratio/RS-Mom identici al centesimo | ✓ (anche Paesi, Medie semplici: Cina 94,47/100,92, Brasile 98,11/103,95) |
| 5 | Titoli XLE, 3M | bolla TPL a x −12,3%, y −13,5%; linee cap +18,4% ed equal +14,6% | I più in pena: TPL 3M −13,5%, M.200 −12,3%; dumbbell EW−CW −3,8; storia «oggi −3,8 pp» | ✓ (14,6 − 18,4 = −3,8) |
| + | Indici, mappa | KOSPI200 y = +7,5 | tabellone 22,5% contro un livello del 15%; lista +7,5 pt | ✓ |
| + | Performance | XLE 126, SPY 108, XLU 93 all'altezza giusta tra i tick 100 e 120 | — | ✓ |

Non ho trovato incoerenze numeriche. L'unica differenza di significato è M1 (colore dei punti della Bottom Map).

---

## Gravità ALTA

### A1. Tabellone degli Indici sul telefono e sul tablet: si vedono solo nome e stato
- **Vista**: 6 Indici · **Dispositivo**: 390, 360 (e 820) · **Tema**: entrambi
- **Schermate**: `shots/390x844-dark__6idx.png`, ritaglio `tiles/390x844-dark__6idx_t0.png` (colonna centrale), `shots/820x1180-light__6idx.png`
- **Descrizione**: il Monitor sotto i 600 px diventa a schede (`.board-cards`), `#ixTable` no. Sul telefono la tabella è larga 1074 px dentro 330 px: di partenza si vedono solo «Indice» e «Stato», mentre breadth, livello blu, drawdown, cali forti, ultimo, 1G e 1M restano a destra (si arriva con lo scroll laterale). A 820 px resta fuori il 30% delle colonne (1111 > 760). Per la vista più nuova è la prima informazione, e chi usa il telefono non la vede.
- **Correzione**: dare a `#ixTable` la classe `board-cards` in `js/indices.js` (nel render del tabellone, con le classi `c-name`, `c-state`, `c-br`, `c-blue`, `c-dd` sulle celle come in `js/bottom.js`) e allargare il blocco CSS `@media (max-width: 600px) { .board-cards … }` (style.css ~r. 673) a `max-width: 900px`, così anche il Monitor a 820 (A5) passa alle schede.

### A2. Testo dei grafici troppo piccolo sul telefono (7,7–9,1 px reali)
- **Viste**: Settore (prezzo/drawdown/breadth), Cali forti, Indici (dettaglio, Cali forti), Rotazione, Bottom Map · **Dispositivo**: 390 e 360 · **Tema**: entrambi
- **Schermate**: `tiles/390x844-light__4sec-XLK_t0.png`, `shots/360x740-dark__4sec-XLK.png`, `tiles/390x844-dark__2rrg-0SettoriSP5-nuova_t0.png`
- **Misura** (`measure.json`, corpo × scala di viewBox): tick e titoli dei pannelli di `#ts`, `#secCapSvg`, `#ixTs` e `#ixCapSvg` a **8,6 px** su 390 e **7,7 px** su 360; tick di `#rrg` e `#bm` a 9,1 px; etichette degli ultimi valori a 9,1 px. Il commento di `chartWidth` (format.js r. 36) promette «circa 10 px».
- **Causa**: `chartWidth(svg, 940, 380)` (bottom.js r. 384, indices.js r. 352, cap-view.js r. 125). A 390 px il grafico è largo 310 px, ma il minimo di 380 unità SVG lo rimpicciolisce a 0,82× (a 360: 280/380 = 0,74×).
- **Correzione**: abbassare il minimo a ~300 (`chartWidth($('ts'), 940, 300)`, lo stesso per `ixTs` e `CapSvg`), oppure lasciare la larghezza e scalare il carattere: `.ts .axt, .ts .pane-t { font-size: calc(10.5px / var(--svg-scale)) }`, con `--svg-scale` scritto dal JS. Per `#rrg` e `#bm` (SIZE fisso) a ≤440 px servono `.rrg .tick { font-size: 12px }` e `.rrg .tlabel { font-size: 13px }`.

### A3. Al tocco i tooltip non si aprono (grafici temporali e Bottom Map)
- **Viste**: Settore, Indici dettaglio, Cali forti, Performance relativa, Bottom Map (settori e indici) · **Dispositivo**: telefono (touch) · **Tema**: entrambi
- **Verifica** (`g_touch.js`, `g_tips.js`): con un tocco singolo nessun tooltip si apre su `ts`, `perf`, `secCapSvg`, `ixTs` e `ixCapSvg`. Si apre solo trascinando in orizzontale, e sparisce appena si alza il dito (`pointerleave`). Sulla Bottom Map i tocchi sono esclusi apposta (`if (e.pointerType === 'touch') return;`, bottom.js r. 339) e il tocco apre direttamente il settore: sul telefono la mappa non mostra mai breadth, drawdown e percentile. Il README dice «un tocco su un punto lo fissa»: vale solo per la Rotazione e i Titoli.
- **Correzione**: in `sector-chart.js` (r. 162), `perf-chart.js` (r. 92) e `cap-chart.js` (r. 120), aggiungere `hit.addEventListener('pointerdown', handler)` e, per `pointerType === 'touch'`, non nascondere il tooltip su `pointerleave` (lo chiude il tocco successivo fuori dal grafico, come `.taptip`). Bottom Map (bottom.js r. 338–360 e la copia in indices.js): al tocco, primo tocco = tooltip con un pulsante «Apri XLU →», secondo tocco sullo stesso punto = `openSector`.

### A4. Bottom Map delle crisi passate: punti ed etichette ammucchiati nell'angolo
- **Vista**: 3 Bottom Map (e la mappa degli Indici) con le scorciatoie «nov 2008», «mar 2020»… · **Dispositivo**: tutti (peggio sul telefono) · **Tema**: entrambi
- **Schermate**: `shots/1440x900-dark__3btm-2020__p01.png`, `shots/1440x900-dark__3btm-2008.png`, `shots/1440x900-dark__6idx-map2020.png`
- **Descrizione**: al 20/03/2020 tutti gli 11 settori stanno tra 94° e 100° e tra −8 e +0,1 pt, cioè circa nel 5% dell'area (asse y fisso fino a +100 «così il replay non salta»). L'audit conta 11 coppie di etichette sovrapposte (2020) e 6 (2008): «ZONA BLU» coperta da «XLY» («ZO XLY BLU»), «XLU» che si sovrappone a «XLV» («XLU V»), XLV con XLU, XLP con XLE. Le code di 8 settimane dall'alto riempiono il grafico di linee. Proprio nel momento che la funzione vuole far rivedere, non si legge chi è dove.
- **Correzione**: (a) un interruttore «Zoom sulla zona» nel replay (asse y −15…+40 e x 50°…100°, sempre fissi durante il PLAY, così non salta); (b) in `bottom-map.js` (r. 88–96, `leader`/`tlabel`), allontanare le etichette lungo un raggio dal gruppo, con la linea guida già prevista; (c) disegnare `qlabel` «ZONA BLU» prima dei dati e in alto a destra del rettangolo blu (`text-anchor:end`, x = sx(P.ddSetup) − 6), dove di solito non ci sono punti.

---

## Gravità MEDIA

### M1. Bottom Map: «colore del punto = stato attuale», ma Trigger, Cooldown e Fallito non hanno il colore del loro stato
- **Schermate**: `shots/1440x900-dark__3btm.png` (XLU, Trigger nel Monitor, è grigio: pixel (180,180,180)), `crop_btm_xlu.png`
- `STATE_ZONE` (bottom-map.js r. 22) riduce gli stati a 3 colori: trig e cool → grigio «normale», fail → blu. Nel Monitor, nell'Alert e nei badge Trigger è verde e Fallito è rosso, e la legenda della mappa ha solo «zona blu» e «attenzione». Chi legge la nota nel sottotitolo si aspetta XLU verde.
- **Correzione**: `STATE_ZONE = { …, trig: 'trig', fail: 'fail', cool: 'cool' }`, con `.rrg .headz-trig { fill: var(--st-trig) } .rrg .headz-fail { fill: var(--down) } .rrg .headz-cool { fill: var(--bg); stroke: var(--ink-2) }` e le voci in legenda (`#v-btm .legend`, index.html ~r. 306). Altrimenti va cambiato il testo in «colore = area del grafico».

### M2. Focus da tastiera invisibile sulla scheda attiva e sui pulsanti premuti (tema scuro)
- **Schermata**: `shots/focus-combo.png` (in alto: «2 ROTAZIONE» con il focus nel tema scuro, nessun contorno; in basso: «Nuova», contorno quasi invisibile)
- `:focus-visible { outline: 1px solid var(--amber); outline-offset: 1px }` e `.fnkeys button:focus-visible { outline-offset: -3px }` (style.css r. 56 e 90): un contorno ambra di 1 px dentro un pulsante con lo sfondo ambra non si vede. Nel tema chiaro si vede (marrone #9a4a00).
- **Correzione**: `:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px }` e `[aria-selected="true"]:focus-visible, [aria-pressed="true"]:focus-visible, [aria-checked="true"]:focus-visible { outline-color: var(--ink); }`; per `.fnkeys` usare `box-shadow: inset 0 0 0 2px var(--bg)` più l'outline.

### M3. Etichette sovrapposte o ambigue
- **Storia della divergenza** (Titoli): a 1440 «XLE −3,8» e «S&P −2,1» si sovrappongono (64×6 px; `shots/1440x900-dark__7tit__p02.png`). Lo scarto di 13 unità (titles.js r. 285) non basta per il corpo 12 px + 3 px di contorno. Sul telefono, con `narrow`, si legge «S&P» sopra e «−3,8» sotto (`tiles/390x844-light__7tit_t0.png`, `tiles/360x740-dark__7tit_t0.png`): sembra «S&P −3,8», ma −3,8 è il valore di XLE e quello dell'S&P (−2,1) non c'è. **Correzione**: scarto di 16 e, con `narrow`, `XLE −3,8` / `S&P −2,1` su due righe con il ticker sempre presente, oppure il valore dell'S&P come etichetta tratteggiata a sinistra.
- **Rotazione, formula Medie semplici**: Paesi «USA/Corea», «Svizzera/Francia», «Canada/Germania»; Indici «Nasdaq-100/Nikkei 225», «Dow Jones/DAX»; Fattori «Momentum/Eq Weight»; Asset reali (Nuova) «Oro/Argento» (`shots/1440x900-dark__2rrg-54Paesi-semplice.png`, `shots/1280x720-light__2rrg-75Assetreal-nuova.png`). In Paesi con le medie semplici 9 titoli stanno in ±2 punti dal centro e «Adatta» allarga la scala per la coda di Taiwan. **Correzione**: in `rrg-chart.js`, quando due etichette si toccano, spostarle con la linea guida (come nella Bottom Map); oppure aggiungere la scala «Adatta ai punti» (solo le teste).
- **Bottom Map degli Indici sul telefono**: «RUT» e «NDX» attaccati («RUT NDX», `tiles/390x844-dark__6idx_t0.png`, colonna destra).
- **Bolle dei Titoli a 360**: «WMB» e «HAL», «SLB» ed «EXE» si toccano (`tiles/360x740-dark__7tit_t0.png`).

### M4. Scroll orizzontale evitabile su desktop
- `#epiTable` 1108 > 1048 px a 1440 (l'ultima intestazione «PEGGIOR…» è tagliata, `shots/1440x900-dark__4sec-XLK.png`); `#ixEpiTable` 1116 > 1048; a 1280: 1108 > 918.
- `#titPain` 428 > 398 a 1440 e 1280: l'ultima colonna «PESO» resta fuori (`shots/1440x900-dark__7tit.png`, pannello «I più in pena»).
- `#rotTable` a 1280 con i nomi lunghi (Asset reali, «Treasury 7-10»): la colonna «SETT./PRIMA» è tagliata (`shots/1280x720-light__2rrg-75Assetreal-nuova.png`).
- **Correzione**: `.wrapc { min-width: 140px }` (style.css r. 425) e `white-space: normal` per «Conferma»; `#titPain .nm { max-width: 9ch }` sotto i 1600 px, oppure togliere la colonna Peso (è già nella dimensione delle bolle); per `#rotTable` a 1101–1439 px, anche `font-size: 12px` (la regola con il padding a 4 px c'è già, r. 217).

### M5. Telefono: Rotazione, Episodi e Cali forti solo in tabelle larghe
- `#rotTable` 644 > 330 (si vedono Titolo, Quadrante e RS-Ratio; RS-Mom, direzione, velocità… sono fuori), `#epiTable` 1108 > 330, `#epiCtx` 649 > 330, `#secCapTable` 759 > 310 (`tiles/390x844-dark__2rrg-0SettoriSP5-nuova_t0.png`, `tiles/390x844-light__4sec-XLK_t0.png`).
- **Correzione**: sotto i 600 px, `#rotTable` a schede come `.board-cards` (titolo + pillola, poi una riga «RS 97,92 ▲0,14 · Mom 100,67 ▲0,21 · 34° · 8 sett.»); nelle tabelle degli episodi, nascondere le colonne secondarie (`DD ingresso`, `+3M da zona blu`, `Peggior calo`) con `@media (max-width:600px) { #epiTable td:nth-child(n+…) … }` e mostrarle nel tooltip della riga.

### M6. Fasce di sfondo quasi invisibili (tutti e due i temi)
- Bottom Map: area «attenzione» rgb(11,8,0) su nero (1,05:1); «zona blu» rgb(9,20,41) su nero. Nel tema chiaro (255,247,219) e (227,236,255) su bianco (≈1,07:1). Si legge solo l'etichetta, il confine dell'area no (`shots/1440x900-dark__3btm.png`, `shots/1440x900-light__3btm.png`).
- Grafico del settore: `.ts .band-off { opacity: .08 }` («sotto il livello, fuori dalla zona blu»), invisibile in tutti e due i temi, e lo è anche il quadratino in legenda (`shots/1440x900-light__4sec-XLK__p02.png`, ultima riga della legenda). `.ts .band-cap { fill-opacity: .12 }` su nero dà (29,8,8): le sedute in allerta nel prezzo si vedono appena (`shots/1440x900-dark__6idx__p09.png`).
- **Correzione**: `--watch-zone` e `--blue-zone` con un'opacità circa doppia, più un bordo `stroke: var(--watch-line); stroke-opacity: .35` sui `rect.bz-*`; `.ts .band-off { opacity: .18 }`, meglio con un tratteggio (`<pattern>` a righe diagonali) per distinguerla da `.band`; `[data-theme="dark"] .ts .band-cap { fill-opacity: .25 }`.

### M7. Telefono: «Perché questo stato» e «Situazione» finiscono in fondo alla vista Settore
- In colonna singola (≤1100 px), l'ordine è grafico → episodi → confronto → Cali forti → Perché questo stato → Livello blu → Situazione → Titoli. Il riquadro che spiega lo stato sta a ~3500 px dall'inizio (`tiles/390x844-light__4sec-XLK_t1.png`); lo stesso succede negli Indici.
- **Correzione**: a ≤1100 px, `.grid-side > :last-child { order: -1 }` per il solo pannello «Perché questo stato» (o spostarlo nel DOM subito dopo il grafico), oppure mettere episodi e Cali forti dopo la colonna laterale.

### M8. CVD: i testi dicono ancora «verde/rossa» e alcuni elementi non cambiano
- **Schermate**: `shots/1440x900-light__cvd-tit.png`, `shots/1440x900-dark__cvd-mon.png`
- Con CVD le frecce della scia e i valori diventano blu/rossi (`--up` #3b9eff / #0b65c1), ma la legenda dei Titoli (index.html r. 624 e 679) dice ancora «freccia … verde se sale, rossa se scende». Il badge Trigger (`--st-trig`), `--trig-line` e le barre verde acqua restano verdi. Contro il Fallito (#ff5c4d) restano distinguibili per l'icona ▲/✕, quindi va bene, ma a destra di una barra viola (cap-weighted, #6a4bd8) la freccia blu CVD si confonde con il viola.
- **Correzione**: testo «verde (blu in CVD) se sale» oppure due `span.cvd-on/.cvd-off` con `.cvd .cvd-off { display:none }`; in CVD, freccia di salita `--up` più chiara (#5fb4ff) o con la punta piena e la barra viola tratteggiata.

### M9. Contrasto sotto AA: «5 SED.» nella colonna Cali forti degli Indici (scuro)
- `.capflag.weak { opacity: .85 }` (style.css r. 744): #ef4444 su nero diventa 4,21:1 a 11 px (serve 4,5:1). `shots/1440x900-dark__6idx__p03.png`, riga KOSPI200.
- **Correzione**: togliere `opacity` e lasciare solo `border-style: dashed`.

### M10. Tablet 820: il Monitor scorre di lato e i KPI lasciano un buco
- `#boardTable` 1105 > 760 px: Solo prezzo, Rotazione, Ultimo, 1G e 1M restano nascosti (`shots/820x1180-dark__1mon.png`). La griglia `.kpis` (auto-fit, minmax 170px) mette 4 KPI + 1 e lascia accanto a «SPY» un blocco vuoto grande come tre celle, colorato dallo sfondo `var(--rule)`.
- **Correzione**: le schede di A1 fino a 900 px; `.kpis { background: var(--panel) }` con i bordi sulle celle, oppure `@media (min-width:601px) and (max-width:1100px) { .kpis { grid-template-columns: repeat(5, 1fr) } }` (con i testi sotto che vanno a capo).

### M11. Nel tema scuro la «scia» e le code sono poco leggibili sul telefono
- Le code della Rotazione e della Bottom Map sono grigio medio a 1 px, con l'opacità che scende fino a .2, e su 300 px si fondono (`tiles/390x844-dark__3btm_t0.png`).
- **Correzione**: `@media (max-width:600px) { .rrg .seg { stroke-width: 1.4 } }` e un'opacità minima di .35 (bottom-map.js r. 81, `0.2 + 0.6*…` → `0.35 + 0.5*…`).

---

## Gravità BASSA

| # | Vista / dispositivo | Schermata | Descrizione | Correzione |
|---|---|---|---|---|
| B1 | Rotazione, Bottom Map, tutte | `shots/1440x900-dark__2rrg-0SettoriSP5-nuova.png` | Il titolo verticale dell'asse («RS-MOMENTUM → slancio», «BREADTH − LIVELLO BLU (punti) →») inizia 2 px fuori dall'SVG (x 28 contro 30); la freccia «↑» in cima è tagliata | in `bottom-map.js` r. 69 e in rrg-chart.js: `x: 14`, oppure `M.l` + 4 |
| B2 | Cali forti Indici, 1440 | `shots/1440x900-dark__6idx__p09.png` | L'etichetta «7659» copre il tick «8000» (27×3 px) | in `cap-chart.js` saltare i tick a meno di 12 px dall'etichetta dell'ultimo valore (come in sector-chart) |
| B3 | Cali forti Indici | idem | Il pannello dei cali ha un solo tick («200»), senza lo 0; la soglia di allerta (266) non ha etichetta, mentre il valore di oggi sì (33) | tick 0 e massimo; etichetta tratteggiata «soglia 266» a destra della linea `.capalert` |
| B4 | Monitor, 390/360 | `tiles/390x844-dark__1mon_t0.png` | Nelle schede «BLU 10%»/«BLU 11%» spingono a destra «DRAWDOWN» e la barra: XLB, XLP e XLV sono sfalsati di 8 px | `.board-cards .c-blue { min-width: 7ch }` |
| B5 | Testata, 820 | `tiles/820rrg.png` | Il segnaposto del comando è tagliato («…XLK T.»); Guida/CVD/Chiaro vanno a capo da soli su una seconda riga | segnaposto breve («Ticker o nome: XLU, ORO, HELP») già sotto i 900 px |
| B6 | Caricamento, telefono | `tiles/loading.png` | Durante il caricamento del Monitor si vedono riquadri vuoti («Settori da osservare», «Come si legge lo stato») e la legenda della tabella senza la tabella; il segnaposto lungo è tagliato prima che il JS lo accorci | nascondere `#v-mon .grid-side` finché `loadingNote` è visibile, oppure righe scheletro; segnaposto breve nell'HTML |
| B7 | Intro, telefono | `shots/390x844-light__9intro.png` | «Leggi il Monitor: … e, a destra, quelli da osservare»: sul telefono sono sopra la tabella | «e, accanto (sul telefono sopra), quelli da osservare» |
| B8 | Titoli, 360 | `tiles/360x740-dark__7tit_t0.png` | La select «Distanza dalla media 2…» è tagliata | `#titAx { max-width: 100%; }` e testo breve «Dist. media 200» a ≤400 px |
| B9 | Rotazione, tutte | `shots/1440x900-dark__2rrg-0SettoriSP5-nuova.png` | La colonna «PRIMA» usa sigle a 10 px («LAG», «IMP», «WEA») senza legenda vicino | `title` sulla cella o le sigle nella nota sotto la tabella |

---

## Note di metodo
- **Contrasto**: calcolato su ogni nodo con testo visibile (HTML e SVG), mescolando opacità e `fill-opacity` con lo sfondo effettivo del primo antenato opaco. Le etichette `lasttxt` (testo nero sul rettangolo ambra) risultavano a 1,00 solo perché lo script usa lo sfondo dell'SVG: verificate a mano, nero su #ffa028 dà circa 10:1. Escluse.
- **Corpo del testo**: corpo CSS × (larghezza reale dell'SVG / larghezza del viewBox).
- **Tooltip**: 7 punti per grafico (teste agli estremi e 3 punti lungo la larghezza) su 11 grafici, a 1440, 390 e 360. Sul desktop nessuno esce dallo schermo; al tocco vedi A3.
- **Dark/light**: a parte le fasce (M6) e il focus (M2), non ho trovato elementi che spariscono in uno dei due temi. Le linee del livello blu, le soglie tratteggiate e i trigger sono visibili in tutti e due.
