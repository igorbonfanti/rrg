# Sector Monitor 0.9.8: controllo grafico e di accessibilità

Data: 20/10/2026 · ramo `claude/great-noether-2f1ude` (commit di partenza 9a81dd8, versione 0.9.8, dati al 19/10/2026) · server locale `ricerca/qa/server/gzserve.mjs` sulla porta 8802 · Chromium di Playwright.
Non ho modificato l'app: tutto il lavoro è in `ricerca/qa/audit-0.9.8/grafica/`.

## Cosa ho controllato

- **Viste**: 1 Monitor, 2 Rotazione, 3 Bottom Map, 4 Settore (XLU, più XLRE e XLE per le righe tratteggiate), 5 Alert, 6 Indici (tabellone, mappa e dettaglio di SPX, DAX, N225, KOSPI200, TWN, FTSEMIB, SPX su MAX), 7 Titoli (`#tit-XLK`) e `guida.html`.
- **Dimensioni e temi**: 1440×900, 820×1180, 390×844 e 360×740 (con `isMobile` e `hasTouch`), ognuna in tema scuro e chiaro. Modalità CVD a 1440 e 390 in tutti e due i temi.
- **In tutto**: 120 schermate a pagina intera, più 78 ritagli del focus, 24 tocchi e 16 mappe delle crisi.
- **Le novità 0.9.5–0.9.8**:
  - i pannelli richiudibili, anche con Invio e Spazio;
  - le date allineate e la linea del cursore condivisa. Ho rilanciato `ricerca/qa/browser/v095.cjs`: 64 OK su 64. Anche `v091.cjs` passa: 88 OK su 88;
  - la scala tagliata con le etichette ▲;
  - i link a TradingView;
  - le righe tratteggiate.

**Script** (cartella `grafica/`):

| Script | Cosa fa |
|---|---|
| `giro.cjs` + `misure.cjs` | per ogni vista misura: scroll orizzontale, elementi fuori dallo schermo, testi SVG e HTML che si sovrappongono o escono, testo tagliato, aree da toccare sotto 24 px (WCAG 2.5.8), contrasto AA di ogni testo, corpo reale del testo nei grafici |
| `interazioni.cjs` | focus da tastiera (70 Tab per vista, contrasto del contorno), tooltip al tocco, schermate CVD |
| `tocchi.cjs`, `tocchi-titoli.cjs` | tocchi mirati: ultima seduta, margine, grafici della vista Titoli |
| `crisi.cjs` | Bottom Map di settori e indici a mar 2020 e nov 2008, con e senza «Zoom sulla zona» |
| `dettagli.cjs` | righe tratteggiate e linea del cursore |
| `contrasto_token.py` | contrasto WCAG di tutti i colori principali (token di `css/style.css`) |

Le schermate complete restano fuori dal repository. In `grafica/` ci sono solo i 15 ritagli che documentano i problemi (`NN-*.jpg`, circa 450 KB).

## Riepilogo

| Gravità | n. | Di cosa si tratta |
|---|---|---|
| **Bloccante per la 1.0** | **0** | — |
| **Da correggere** | **5** | contrasto della guida nel tema chiaro; etichette dei cali forti tagliate o sopra i picchi; tocco sull'ultima seduta; tabelle che scorrono sul telefono; testo dei grafici a 9 px sul tablet |
| **Minore** | **13** | legenda «allerta», colore del segno di trigger, etichette che si toccano, crisi sul telefono, CVD, focus del campo comandi, allineamenti, guida |

Non ho trovato nessun bloccante:
- nessuno scroll orizzontale della pagina a nessuna larghezza;
- nessun errore in console;
- nessun NaN;
- il contrasto AA del testo dell'app è rispettato ovunque.

L'unico testo sotto AA è nella guida, tema chiaro (D1).

---

## Da correggere

### D1. Guida, tema chiaro: testata e pulsanti «Apri …» sotto il contrasto AA
- **Dove**: `guida.html`, tutte le dimensioni, solo tema chiaro.
- **Schermate**: `grafica/01-guida-chiaro-contrasto-testata.jpg`, `grafica/01-guida-chiaro-contrasto-apri.jpg`.
- **Misura**:
  - «SECTOR·MON» e gli 8 pulsanti «Apri il Monitor →», «Apri la Rotazione →» e così via hanno testo nero `#000` su `var(--amber)`;
  - nel tema chiaro `var(--amber)` vale `#9a4a00`, quindi il contrasto è **3,35:1**, mentre AA chiede 4,5:1 per testo di 12–13 px;
  - l'app non ha il problema, perché nel tema chiaro usa `--amber-fill` (style.css r. 528–529).
- **Correzione** (guida.html, r. 17 e 41): `background: var(--amber-fill)` al posto di `var(--amber)` per `.g-top .brand` e `.g-main .open`. Il nero su `#ffa028` dà 10,3:1 in tutti e due i temi.

### D2. Cali forti: etichette ▲ e «soglia N» tagliate o attraversate dai picchi
- **Dove**: vista Settore e vista Indici, scheda «Cali forti», tutte le dimensioni (peggio a 390 e 360), tutti e due i temi.
- **Schermate**: `grafica/02-cali-forti-360-etichetta-tagliata.jpg` (SPX, MAX, 360), `grafica/03-cali-forti-1440-XLU-etichette-sui-picchi.jpg`, `grafica/04-cali-forti-390-KOSPI200-soglia-sui-picchi.jpg`.
- **Cosa succede**:
  1. **A 360 px l'etichetta ▲557 (ott 2008) esce di 4 px a sinistra dall'SVG**: il triangolo è tagliato e si legge «557 (ott 2008)». Le due etichette ▲ quasi si toccano.
     - **Causa**: `cap-chart.js` r. 123 centra il testo con un limite fisso: `Math.max(x, L + 40)`. Un testo di 15 caratteri è largo circa 100 unità, metà 50, quindi a sinistra esce dal grafico.
  2. **Le etichette sono disegnate sopra i picchi**:
     - **▲**: il picco tagliato passa proprio nello spazio tra «(apr» e «2025)» (XLU, 1440);
     - **«soglia N»**: è attraversata dalle barre rosse (KOSPI200 a 390: «soglia 102» sopra i picchi del 2026; SPX MAX: «soglia 268» sul picco del 2025);
     - **effetto**: rosso su rosso, si legge male.
- **Correzione**:
  - in `cap-chart.js` misurare la larghezza vera (`t.getComputedTextLength()` dopo l'inserimento) e limitare `x` tra `L + w/2` e `L + PW − w/2`, oppure ancorare a sinistra o a destra vicino ai bordi;
  - dare a `.ts .capalert-t` lo stesso alone di `.capcut` (`paint-order: stroke; stroke: var(--bg); stroke-width: 3px`);
  - per le ▲, un rettangolo di fondo `var(--bg)` dietro il testo, oppure spostare la riga delle etichette sopra il riquadro, nel margine tra il titolo del pannello e l'area.

### D3. Al tocco l'ultima seduta è quasi irraggiungibile; un tocco nel margine lascia un tooltip vecchio
- **Dove**: Settore (`#ts`, `#secCapSvg`), Indici (`#ixTs`, `#ixCapSvg`), Performance relativa (`#perf`), telefono, tutti e due i temi.
- **Schermata**: `grafica/05-tocco-margine-tooltip-senza-linea.jpg` (390, scuro).
- **Misura** (`tocchi.cjs`): sul telefono l'area che riceve i tocchi è larga 262 px su 330, e in 3A ci sono circa 3 sedute per pixel.
  - A 2 px dal bordo destro dell'area il tooltip dice **09/10/2026**, non 19/10/2026; la Performance relativa dice 16/10. Con un dito l'ultima settimana non si prende.
  - Un tocco a destra, sulle etichette dei valori, lascia aperto il tooltip della data toccata prima ma toglie la linea verticale. Il motivo: il grafico gemello si chiude e manda `emitX(null)`.
  - **Risultato**: un tooltip senza la linea che dice a che data si riferisce.
- **Correzione**:
  - in `sector-chart.js` (r. 160), `cap-chart.js` e `perf-chart.js`, allargare il rettangolo `hit` fino al bordo destro dell'SVG (`width: PW + R`), con l'indice già limitato a `n − 1`. Così un tocco sulle etichette di destra apre l'ultima seduta;
  - in alternativa, al tocco agganciare la seduta più vicina con un margine di 12 px dal bordo.

### D4. Telefono: le tabelle scorrono ancora di lato e i numeri principali restano fuori
- **Dove**: 390 e 360, tutti e due i temi.
- **Schermata**: `grafica/06-telefono-tabelle-episodi-mediane.jpg`.
- **Cosa succede**: dopo il passo 2 le colonne secondarie sono nascoste, ma le tabelle sono ancora più larghe dello schermo. L'ombra a destra avvisa che scorrono; si vedono:

  | Tabella | Si vede | Resta fuori |
  |---|---|---|
  | Episodi | data, breadth, trigger | +1M, +3M, +6M |
  | Mediane | etichetta, «Casi» (tagliato) | tutti i rendimenti |
  | Cali forti | date | sedute, picco, rendimenti |
  | Rotazione | titolo, quadrante, RS | direzione |
  | I più in pena | — | la colonna «Peso» |

  È il punto rimasto aperto in `docs/sviluppo.md` §7, ma oggi colpisce di più: le mediane sono il senso della tabella, e sul telefono non si vedono.
- **Correzione**:
  - sotto i 600 px, nella tabella delle mediane, mettere «Casi» sotto l'etichetta (`td:first-child small`) e lasciare solo +1M/+3M/+6M;
  - per Episodi e Cali forti, schede come `.board-cards`: data e trigger su una riga, i rendimenti sotto.

### D5. Tablet 820: il testo dei grafici è a 9,1 px reali
- **Dove**: 820×1180 (e ogni larghezza tra 500 e circa 1100 px), tutti i grafici temporali (`ts`, `ixTs`, `CapSvg`) e `titSpread`, tutti e due i temi.
- **Schermata**: `grafica/07-tablet-820-testo-grafici-9px.jpg`.
- **Misura** (`misure.cjs`, corpo × scala del viewBox):
  - tick, titoli dei pannelli ed etichette dell'ultimo valore sono a 9,1 px;
  - sul telefono l'audit della 0.9.0 (A2) è risolto: nessun testo SVG sotto 10 px a 390 e a 360;
  - ma a 820 la regola di `chartWidth` (format.js r. 65) usa un viewBox 1,15 volte più largo, quindi 10,5 / 1,15 = 9,1 px. Oggi il tablet ha il testo più piccolo di tutte le dimensioni.
- **Correzione**: in `chartWidth`, applicare il fattore 1,15 solo da 1000 px in su (`w * (w < 1000 ? 1 : 1.15)`), oppure lasciare la larghezza e portare il corpo di `.ts .axt, .ts .pane-t, .ts .lasttxt` a 12 px sotto i 1100 px.

---

## Minori

| # | Vista · dimensione · tema | Schermata | Descrizione | Correzione proposta |
|---|---|---|---|---|
| m1 | Cali forti, tutte, scuro | `03-…XLU…jpg` (legenda) | Il quadratino «allerta» in legenda ha `opacity:.12` (index.html r. 381 e 560), le fasce nel grafico `fill-opacity:.25`: in legenda è quasi nero su nero (≈1,1:1) e non corrisponde alle fasce. Nel pannello dei cali le fasce si vedono appena (KOSPI200, `04-…jpg`) | usare `opacity:.25` (scuro) e `.14` (chiaro) anche in legenda, con una classe invece dello stile in linea; valutare `fill-opacity:.35` nello scuro |
| m2 | Settore e Indici, tutte, tutti e due | `07-…jpg` | Il segno del trigger nel grafico è verde acqua (`.ts .trigmark { fill: var(--q-lead) }`, r. 449), il trigger nel badge, nel Monitor e nella legenda della Bottom Map è verde (`--st-trig`). Legenda e grafico tra loro sono coerenti, ma con il resto dell'app no | `fill: var(--st-trig)` e lo stesso colore nella legenda (index.html r. 358 e 537) |
| m3 | Rotazione 360, Bottom Map 360, mappa Indici 390 | `10-telefono-mappa-indici-etichette.jpg` | Etichette che si toccano: «XLY/XLU» (rrg, 360), «NORMALE/XLV» (bm, 360), «N225/FTSEMIB» (ixMap, 390). Sulla mappa degli indici «RUT NDX» e «DJI» stanno tra due punti e non si capisce di chi sono (punto aperto in sviluppo §7) | linea guida dal punto all'etichetta anche per spostamenti piccoli; «NORMALE» disegnato prima dei dati |
| m4 | Bottom Map settori e indici, crisi, telefono | `08-telefono-bottom-map-crisi-2008-2020.jpg` | Senza zoom, nov 2008 sul telefono ha 7 sovrapposizioni («ZONA BLU» coperta da «XLI», «XLY/XLU», «XLE/XLB»). Con «Zoom sulla zona» diventano 1 (2008) e 2 (2020), ma tutti i punti stanno sul bordo dei 100°. A 1440 nessuna sovrapposizione, con e senza zoom | attivare lo zoom da solo quando si sceglie una crisi sotto i 600 px |
| m5 | Titoli, CVD, tutte | `09-cvd-chiaro-freccia-blu-barra-viola.jpg` | La freccia di salita blu accanto alla barra viola del cap-weighted (XLB, XLY) si confonde: contrasto fra i due colori 1,01:1 nel chiaro, 1,13:1 nello scuro (punto aperto in sviluppo §7) | in CVD, freccia con la punta più grande o bianca con bordo blu; oppure barra viola tratteggiata |
| m6 | Barra dei comandi, tutte, tutti e due | `interazioni.json` (focus) | `.cmd input:focus { outline: none }`: il focus del campo comandi è solo una riga di 1 px sotto il campo, sopra il bordo ambra della barra, quindi non si distingue (il cursore lampeggiante aiuta). Tutti gli altri controlli hanno un contorno di 2 px ben visibile (contrasto 6,3–10,3:1) | `.cmd:focus-within { box-shadow: 0 0 0 2px var(--amber); }` |
| m7 | Monitor e Indici a schede, 820/390/360 | `13-tablet-schede-barre-sfalsate.jpg` | Le barre di breadth e drawdown partono a x diversi da una scheda all'altra (6–18 px), come nella 0.9.0 (B4) | larghezza fissa per valore e sotto-valore (`.board-cards .c-br .v { min-width: 11ch }`, `.c-blue { min-width: 7ch }`) |
| m8 | Indici, «Situazione», 1440 e telefono | `12-indici-situazione-etichette-a-capo.jpg` | Le etichette vanno a capo («Sopra media / 50», «Drawdown da / max 52s»): la riga «Copertura · 503 su 503 membri con prezzi» allarga la colonna dei valori (`.facts` è `1fr auto`). Nella vista Settore non succede | `.facts dt { white-space: nowrap }`, oppure «Copertura» nella nota sotto |
| m9 | Alert, registro, tutte | `11-alert-badge-testo-attaccati.jpg` | Il testo comincia subito dopo il badge, senza spazio, e a x diversi («ZONA BLU» è più largo di «TRIGGER») | badge con `min-width: 11ch` e `margin-right: 8px` |
| m10 | Testata, 820 | — | Guida, CVD e Chiaro vanno su una seconda riga (punto aperto in sviluppo §7) | come 0.9.0 (B5) |
| m11 | Titoli, 360 | — | La select «Distanza dalla media 200» è tagliata (serve 196 px, ne ha 188), come nella 0.9.0 (B8) | testo breve «Dist. media 200» sotto i 400 px |
| m12 | Guida, tutte | `14-guida-indice-pallino.jpg` | Nell'indice laterale «Cali forti (capitolazione)» ha un pallino e un rientro diversi dalle altre voci: è in un `<ul>`, mentre lo stile c'è solo per `ol` (guida.html r. 93) | `<ol>` al posto di `<ul>` |
| m13 | Guida e Settore, telefono | — | Aree piccole: «← Torna all'app» nella guida è a 10 px, alto 18 px; i ticker della tabella «Titoli del settore» sono alti 23 px («FE» largo 16). Passano la deroga della spaziatura di WCAG 2.5.8 per poco | `.g-top .mini { font-size: 12px; padding: 6px 0 }`; `td a.sym { display: inline-block; min-width: 24px; padding: 2px 0 }` |

---

## Problemi dell'audit 0.9.0: cosa è risolto

| 0.9.0 | Esito nella 0.9.8 |
|---|---|
| A1 tabellone Indici sul telefono e sul tablet | **Risolto**: schede fino a 900 px |
| A2 testo dei grafici a 7,7–9 px sul telefono | **Risolto sul telefono** (nessun testo SVG < 10 px a 390 e 360). Sul tablet è 9,1 px (D5) |
| A3 tooltip al tocco | **Risolto**: si aprono al tocco su tutti i grafici, Titoli compresi, restano aperti e si chiudono toccando fuori. Bottom Map: primo tocco tooltip, secondo apre il settore. Resta D3 (ultima seduta e margine) |
| A4 Bottom Map delle crisi | **Migliorato**: «Zoom sulla zona» e nessuna sovrapposizione a 1440. Sul telefono resta m4 |
| M1 colori della Bottom Map | **Risolto**: trigger verde, fallito rosso, cooldown vuoto, in legenda |
| M2 focus invisibile | **Risolto**: contorno di 2 px, colore `--ink` sulle schede e sui pulsanti premuti. Resta m6 |
| M3 etichette sovrapposte | **In parte**: la storia della divergenza è a posto («XLK +0,9» / «S&P −2,1»). Restano i casi di m3 |
| M4 scroll orizzontale su desktop | **Risolto**: a 1440 episodi, cali forti e «I più in pena» stanno interi |
| M5 tabelle larghe sul telefono | **In parte**: colonne nascoste, ma lo scroll resta (D4) |
| M6 fasce invisibili | **Risolto**: le righe fuori dalla zona blu sono tratteggiate e visibili nei due temi (XLRE 36 righe, XLE 15). La legenda di «allerta» no (m1) |
| M7 ordine dei pannelli sul telefono | **Risolto**: «Perché questo stato» subito dopo il grafico |
| M8 testi CVD | **Risolto il testo** («verde (blu con CVD)»). Il colore resta (m5) |
| M9 contrasto di «5 SED.» | **Risolto** |
| M10 Monitor sul tablet | **Risolto**: schede, KPI su una riga |
| M11 code sul telefono | **A posto** nelle schermate |
| B4, B5, B8 | **Aperti**: m7, m10, m11 |
| B7 intro | **Risolto** («accanto (sul telefono sopra)») |
| B9 sigle «Prima» | **Risolto**: spiegate nella nota della tabella |
| B6 caricamento | **Non ricontrollato** in questo giro |

## Cose controllate e a posto

**Pagina e layout**
- Scroll orizzontale: 0 px in tutte le 64 combinazioni di vista, dimensione e tema, compresa la guida a 360 px. Nessun elemento fuori dallo schermo, fuori dai contenitori che scorrono.
- Console: nessun errore in nessuna combinazione. `v091.cjs` (88/88) e `v095.cjs` (64/64) passano sulla 0.9.8.

**Novità 0.9.5–0.9.8**
- **Pannelli richiudibili** («Episodi in zona blu», «Cali forti»):
  - chiusi di default e ricordati dopo il ricaricamento;
  - con la tastiera si aprono con Invio e si chiudono con Spazio;
  - il focus sul titolo ha un contorno di 2 px (10,3:1 scuro, 6,3:1 chiaro);
  - il triangolo ▶/▼ cambia.
- **Grafico dei cali forti**: stessa larghezza e stesse date agli stessi pixel del grafico principale, a 1440 e a 390 (v095).
- **Linea del cursore**: condivisa in tutte e due le direzioni, con il mouse (scarto < 1,5 px) e al tocco (la linea gemella compare: `interazioni.json`).
- **Scala tagliata**: le etichette ▲ ci sono con il valore e il mese (SPX MAX: ▲557 ott 2008, ▲1082 mar 2020); i problemi di posizione sono in D2.
- **Link TradingView**: presenti nella scheda «Situazione» degli indici controllati (SPX/S5TH, KOSPI200/KOSPI…), leggibili e alti 28 px sul telefono. Non ho aperto i link: la verifica con un clic è dell'utente (sviluppo §7).
- **Righe tratteggiate fuori dalla zona blu**: visibili in tutti e due i temi, in legenda con lo stesso disegno a righe (scelta dell'utente: restano).

**Colori e contrasto** (`contrasto_token.py`)
- Tutti i colori del testo superano 4,5:1 su fondo e pannello, in tutti e due i temi e con CVD (il minimo è il segnaposto: 4,53:1 sul pannello chiaro).
- I badge con testo nero sono tra 5,46:1 (zona blu) e 13,15:1.
- Le linee di griglia e di base dei grafici restano sotto 3:1: sono decorative e i valori sono scritti negli assi, quindi va bene.
- Il contrasto misurato su ogni nodo di testo non ha eccezioni, a parte D1. Le etichette nere sul rettangolo ambra dell'ultimo valore risultano 1,00 solo per il metodo (fondo dell'SVG); a mano danno 10,3:1.

**Coerenza dei colori con le legende**
- Quadranti uguali tra punti, pillole, legenda e Monitor.
- Stati della Bottom Map uguali al Monitor (XLU trigger verde, XLRE attenzione gialla).
- Zona blu, livello blu e drawdown coerenti tra grafico e legenda. Eccezioni: m1 e m2.

**Telefono e tablet**
- Schede del Monitor e degli Indici.
- «Perché questo stato» in alto.
- Pulsanti, chip, periodi e passi del livello blu alti 34–40 px.
- Nessuna area da toccare sotto 24 px senza spazio intorno, a parte m13.

**Tooltip**
- Su desktop restano dentro lo schermo.
- Al tocco si aprono, restano dentro lo schermo e si chiudono toccando fuori (verificato su 6 grafici temporali, Bottom Map, mappa Indici, Titoli: bolle, dumbbell, storia).

**Altro**
- CVD: l'interruttore funziona e viene ricordato; su/giù in blu/rosso in tabelle, KPI, badge «Aggiornato» e frecce. Trigger e fallito restano distinguibili per l'icona (▲ e ✕).
- Tema: nessun cambio automatico; l'interruttore «Chiaro» è un `role="switch"` con `aria-checked`. C'è `prefers-reduced-motion`.

## Note di metodo

- **Sovrapposizioni**: si contano solo i testi che si sovrappongono per più di 2 px in larghezza e per più del 35–40% dell'altezza. Ho escluso:
  - le testate fisse delle tabelle;
  - le righe della lista «Titoli del settore», che scorre dentro un contenitore alto fisso e sembra coprire il piè di pagina solo nelle misure;
  - i titoli dei pannelli che «escono» di 2 px in alto: è solo lo spazio sopra le lettere.
- **Corpo del testo**: corpo CSS × larghezza reale dell'SVG / larghezza del viewBox.
- **Durante il controllo** il ramo ha ricevuto commit di altri (`914cda9`, `d9c2a9b`, `f51d882`). In `ricerca/qa/audit-0.9.8/funz/res/` risultano file cancellati che non ho toccato io: sono di un altro controllo.
