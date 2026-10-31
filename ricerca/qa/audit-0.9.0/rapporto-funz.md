# Sector Monitor · rapporto di test funzionale

- **Versione provata**: 0.9.0 (commit `07a09d7`, ramo `claude/great-noether-2f1ude`), dati EOD al 16/10/2026.
- **Data**: 18/10/2026. Server statico con gzip: `node ricerca/qa/server/gzserve.mjs /home/user/rrg 8801`.
- **Browser**: Chromium headless (Playwright), locale it-IT, fuso Europe/Rome.
- **Profili**: desktop 1440×900, laptop 1280×720, tablet 820×1180 (touch), telefono 390×844 (isMobile, hasTouch); tema scuro e chiaro (`antigravity-theme` e interruttore).
- **Script**: `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa-browser/funz/s1…s13*.js` (libreria comune `lib.js`); esiti grezzi in `OUT/res/*.json`; screenshot in `OUT/shots/`.
- **Repository non modificato** da questo test. Nota: tra le 20:29 e le 20:34 UTC un'altra sessione ha modificato il working tree (`js/app.js`, `js/metrics.js`, `data/prices_global.json`, script); quasi tutte le prove sono girate prima. Una ripetizione della prova della Rotazione sul tree modificato (`res/s2_rrg_wip_desktop.json`) non ha dato errori.

## Sintesi

1.341 verifiche automatiche (423 casi distinti × profili). **Nessun bug bloccante o alto.** 8 bug di gravità **media** e 11 di gravità **bassa**; 5 segnalazioni degli script sono falsi positivi (spiegati in fondo).

Funzionano bene, su tutti i profili e i due temi: le 7 viste (nessun errore in console, nessun NaN/undefined, nessuno scorrimento orizzontale della pagina), universi 1–6 e tutti i benchmark, timeframe, formula (la data resta), coda, scala, PLAY/STOP, cursori, frecce ← →, Spazio, Esc, ordinamenti (12 colonne, asc/desc verificati sui valori), spunte, evidenza, performance, portafoglio (cursori, caselle, limite 100, «Porta a 100%», «Ripristina l'esempio», salvataggio e ricarica), asset reali (clic sulle righe), Bottom Map (cursore, PLAY, Oggi), livello blu (+/−, limiti 0 e 60 con pulsanti spenti, asterisco nel Monitor e negli indici, Ripristina, «Copia configurazione» sia con appunti consentiti sia con il ripiego sul testo selezionato), indici mostrati (chip, Principali, Tutti, ultimo che non si toglie), scheda Cali forti (soglia/sedute/mostra/preset, apri/chiudi), vista 7 (chip, periodi, scia, ordine, asse, bolle, scelte salvate), barra dei comandi (ticker, nomi, viste, minuscole, `XLK TIT`, `XLU GO`, tema, sconosciuti con avviso che sparisce dopo 4 s), tasti 1–7, `?`, `/`, Esc, frecce/Home/Fine sulle schede, scorciatoie spegnibili, indirizzi diretti e Indietro/Avanti, ricarica con lo stato, avviso «Nuova versione» (comparsa, clic che riscarica e ricarica, version.json uguale/rotta/irraggiungibile, controllo al ritorno sulla scheda), intro, striscia dei cambi, guida rapida (focus, Esc, ×, clic fuori, link alla sezione della vista) e guida.html (tutte le 27 ancore e i 10 link «Apri…»), badge di freschezza con l'orologio simulato, localStorage corrotto o bloccato.

I valori dei tooltip coincidono con le tabelle: RRG ↔ tabella di rotazione (11/11), Bottom Map ↔ «Distanza dal livello blu» (11/11), mappa indici ↔ distanza ↔ tabellone (10/10), grafico del settore all'ultima seduta ↔ Situazione, cali forti ↔ frase «Oggi…», storia della divergenza ↔ nota «oggi», k/n e «un titolo vale» ↔ percentuale del Monitor, Monitor ↔ Situazione (XLU), tabellone ↔ Situazione degli indici.

## Bug per gravità

| # | Gravità | Area | Titolo |
|---|---|---|---|
| B1 | media | Indici · errori | Senza `capitulation.json` la colonna «Cali forti» resta su «…» per sempre e il riquadro sparisce senza spiegazione |
| B2 | media | Indici · errori | Senza `indices_more.json` nessun avviso; «4 su 10 mostrati» con 2 righe; «Tutti» = 10 |
| B3 | media | Rotazione · errori | Senza `prices_global.json` / `prices_macro.json` l'universo salvato è sostituito in silenzio dai Settori; `SWDA` «non trovato. Prova … SWDA» |
| B4 | media | Cali forti | Con 0 cali il percentile mostrato è alto (CAC 73°, DJI 80°, XLU 88°) |
| B5 | media | Comandi | `DAX` e `SMI` aprono la Rotazione, non il dettaglio dell'indice come dicono guida, guida rapida e README |
| B6 | media | Comandi | `SPY` da un universo globale apre «5 · Asset reali» con SPY contro BIL, non la rotazione contro SPY |
| B7 | media | Bottom Map (settori e indici) | Le «Crisi passate» mostrano la settimana prima del minimo; nov 2008 e feb 2016 senza chip evidenziato |
| B8 | media | 7 Titoli | La «storia della divergenza» non è a fine settimana: punti ogni 5 sedute (tooltip «Settimana al 01/12/2025», un lunedì) |
| B9 | bassa | Telefono · Monitor | Nessuna spiegazione raggiungibile al tocco nel Monitor a schede |
| B10 | bassa | Touch · Indici | Le spiegazioni nelle celle del tabellone non si leggono al tocco (il tocco apre il dettaglio) |
| B11 | bassa | 7 Titoli · errori | `sector_members.json` valido ma senza campi: TypeError non gestito, vista vuota senza messaggio |
| B12 | bassa | Indici · errori | Senza `config/indices.json` la scheda sparisce ma `#idx`, il tasto 6 e `IDX` aprono una pagina vuota |
| B13 | bassa | Alert · errori | Senza `alerts.json` il riquadro dice «La GitHub Action non ha ancora registrato controlli» |
| B14 | bassa | Portafoglio | Con tutti i pesi a 0 la riga sopra il grafico dice «Contro il tuo portafoglio: . Composizione…» |
| B15 | bassa | Accessibilità | Il focus finisce sul body dopo «Preset di Rea» e dopo «Ho capito» |
| B16 | bassa | Accessibilità | Ticker del registro Alert: focus segnalato solo dalla sottolineatura (`all: unset` toglie l'outline) |
| B17 | bassa | Accessibilità | `<h2>` dentro `<summary>` nelle schede Cali forti |
| B18 | bassa | Documentazione | README: «Tasti `1`–`6` viste»; l'app (e la guida) usano 1–7 |
| B19 | bassa | Errori (generale) | Messaggio di B3: suggerisce proprio il ticker che non trova (vedi B3) |

## Dettaglio dei bug

### B1 · media · Cali forti assenti: colonna degli indici su «…» per sempre
- **Passi**: bloccare `data/capitulation.json` (abort, 404 o JSON rotto: `page.route(/capitulation\.json/, r => r.abort())`), aprire `#idx`.
- **Atteso**: la colonna «Cali forti» dice che i dati mancano («—» con spiegazione), come la scheda del dettaglio («dati non disponibili»).
- **Ottenuto**: tutte le celle restano «…» (aspetto di caricamento in corso) senza fine; il riquadro «Cali forti in allerta» scompare senza dire perché. La scheda del dettaglio invece è corretta («Dati dei cali forti non disponibili (Failed to fetch)»). Causa: `cap.cell()` in `js/cap-view.js` non controlla `failed`.
- **Screenshot**: `shots/e-desktop-cap-idx-abort.png`, `shots/e-desktop-cap-idx-404.png`, `shots/e-desktop-cap-sec-abort.png`.

### B2 · media · Indici non principali assenti: nessun avviso e conteggio sbagliato
- **Passi**: localStorage `sm.ixShown=["SPX","NDX","SMI","TSX60"]`, `sm.ixSel="SMI"`; bloccare `data/indices_more.json`; aprire `#idx`; poi clic su «Tutti».
- **Atteso**: un avviso che 12 indici non sono arrivati; conteggio coerente con le righe.
- **Ottenuto**: 2 righe (NDX, SPX) ma «4 su 10 mostrati»; dettaglio su SPX invece di SMI senza spiegazione; 10 chip invece di 22; «Tutti» mostra «10 su 10 mostrati · i principali». Nessun messaggio (il `.catch` di `loadMore` in `js/indices.js` è vuoto).
- **Screenshot**: `shots/e-desktop-more.png`.

### B3 · media · Prezzi globali o asset reali assenti: universo salvato sostituito in silenzio
- **Passi**: `sm.group="1 · Asset class"` (o `"5 · Asset reali"`), bloccare `data/prices_global.json` (o 404 su `data/prices_macro.json`), aprire `#rrg`. Poi scrivere `SWDA` nella barra.
- **Atteso**: un avviso che gli ETF in euro (o gli asset reali) non sono disponibili.
- **Ottenuto**: la rotazione apre «Settori S&P 500 vs SPY» senza dire nulla; gli universi globali spariscono dal menu. `SWDA` dà «"SWDA" non trovato. Prova un ticker (XLU, SWDA)…»: il suggerimento cita proprio il ticker non trovato (B19). La scelta salvata non viene sovrascritta (OK).
- **Screenshot**: `shots/e-desktop-global.png`.

### B4 · media · Percentile alto con zero cali
- **Passi**: `#idx` → «Tutti»; guardare la colonna «Cali forti» di CAC, DJI, FTSEMIB; oppure `#XLU` → scheda «Cali forti».
- **Atteso**: con 0 cali nelle ultime 5 sedute il valore non deve far pensare a una situazione tesa (0° o «nessun calo»).
- **Ottenuto**: CAC «73°», DJI «80°», FTSEMIB «65°»; XLU «Oggi 0 cali nelle ultime 5 sedute: 88° percentile della storia». Il percentile conta le sedute con valore ≤ oggi (`js/capitulation.js`, riga 146), quindi gli zeri a pari merito lo gonfiano. Il numero è vero per definizione, ma si legge al contrario.
- **Screenshot**: `shots/bug-cali-0-percentile.png`, `shots/c-desktop-sec-open.png`.

### B5 · media · `DAX` e `SMI` non aprono la pagina Indici
- **Passi**: barra dei comandi → `DAX` Invio; poi `SMI` Invio.
- **Atteso** (guida.html «Comandi e tasti»: «NDX, DAX, N225: un indice, il suo dettaglio nella vista 6»; la guida rapida dice «un indice (es. NDX, DAX) apre il suo dettaglio»; il README cita `SMI`): il dettaglio dell'indice.
- **Ottenuto**: `DAX` apre la Rotazione «6 · Indici» con DBXD.DE evidenziato; `SMI` apre la Rotazione con XSMI.DE (MSCI Switzerland, trovato per la parola «SMI» nel nome «non esiste un ETF sullo SMI»). `NDX` e `N225` funzionano.
- **Screenshot**: `shots/bug-cmd-dax.png`.

### B6 · media · `SPY` da un universo globale apre gli asset reali
- **Passi**: Rotazione → universo «1 · Asset class» (o qualsiasi universo globale) → comando `SPY`.
- **Atteso** (README: «un benchmark (`SPY`, `QQQ`, `ACWI`, `PTF`) apre la rotazione contro di lui»): Settori S&P 500 contro SPY.
- **Ottenuto**: «5 · Asset reali» contro BIL con SPY evidenziato (SPY è un titolo di quell'universo e la ricerca dei titoli viene prima dei benchmark degli altri universi). Dal Monitor o dai Settori funziona.
- **Screenshot**: `shots/bug-cmd-spy.png`.

### B7 · media · «Crisi passate»: settimana prima del minimo, chip non evidenziato
- **Passi**: `#btm` → «nov 2008»; poi «feb 2016». Stessa cosa nella Bottom Map degli indici (`#idx`).
- **Atteso**: la mappa alla settimana del minimo (20/11/2008, 11/02/2016) e il chip premuto.
- **Ottenuto**: «settimana al 14/11/2008» e «settimana al 05/02/2016» (6 giorni prima del minimo) e nessun chip con `aria-pressed=true` (la soglia è < 6 giorni). Per gli altri 5 chip il chip si accende, ma la data è sempre l'ultima settimana chiusa *prima* del minimo (es. 07/10/2022 per il 12/10/2022, 20/03/2020 per il 23/03/2020): `weekOf()` prende la settimana che finisce entro la data.
- **Screenshot**: `shots/b-desktop-jump-2008-11-20.png`, `shots/b-desktop-jump-2016-02-11.png`.

### B8 · media · Storia della divergenza: non «alla fine di ogni settimana»
- **Passi**: `#tit-XLU` → passare sul grafico «Storia della divergenza».
- **Atteso** (README, guida, nota sotto il grafico: «alla fine di ognuna delle ultime 52 settimane»): punti al venerdì (o all'ultima seduta della settimana).
- **Ottenuto**: i 52 punti sono le sedute N, N−5, N−10… (`scripts/lib/capeq.js`, riga 211): solo 19 cadono di venerdì, 11 di lunedì. Il tooltip dice «Settimana al 01/12/2025» (lunedì) e la nota «Guidano i grandi da 7 settimane (dal 03/09/2026)» (giovedì).
- **Screenshot**: `shots/bug-hist-lunedi.png`.

### B9 · bassa · Telefono: Monitor senza spiegazioni al tocco
- **Passi**: telefono 390×844, `#mon`, toccare le voci delle schede (BREADTH, DRAWDOWN, 5/31…).
- **Atteso** (README: «le spiegazioni delle intestazioni e della Situazione si aprono al tocco»; guida: «ogni voce con la sottolineatura a puntini… sul telefono toccala»).
- **Ottenuto**: i 44 elementi con spiegazione sono tutti dentro righe cliccabili (il tocco apre il settore) e le intestazioni con la spiegazione di Drawdown, Solo prezzo e Rotazione sono nascoste nel layout a schede. Sul tablet funziona.
- **Screenshot**: `shots/bug-phone-monitor-schede.png`.

### B10 · bassa · Touch: celle del tabellone indici
- **Passi**: tablet o telefono, `#idx`, toccare la cella «Cali forti» o la percentuale di una riga.
- **Ottenuto**: il tocco apre il dettaglio e scorre in basso; il testo della spiegazione («Cali forti: 33 cali nelle ultime 5 sedute…, soglia 266») non si legge. L'intestazione «Cali forti» invece si apre al tocco (OK).

### B11 · bassa · `sector_members.json` incompleto
- **Passi**: rispondere a `data/sector_members.json` con `{"x":1}`; aprire `#tit`.
- **Ottenuto**: `UNHANDLED_REJECTION TypeError: Cannot read properties of undefined (reading 'some')` in `renderControls` (`js/titles.js:100`), corpo della vista mostrato ma vuoto. Con abort o JSON rotto il messaggio è corretto. `capitulation.js` controlla invece `d.series`.
- **Screenshot**: `shots/e-desktop-tit-json.png`.

### B12 · bassa · Senza configurazione degli indici
- **Passi**: bloccare `config/indices.json`; aprire `#idx` o premere 6.
- **Ottenuto**: la scheda «6 Indici» è nascosta, ma l'indirizzo, il tasto 6 e il comando `IDX` mostrano una pagina vuota senza messaggio.
- **Screenshot**: `shots/e-desktop-noixcfg.png`.

### B13 · bassa · Senza `alerts.json`
- **Passi**: bloccare `data/alerts.json`; `#alr`.
- **Ottenuto**: «La GitHub Action non ha ancora registrato controlli.»: falso, il file non è arrivato.

### B14 · bassa · Portafoglio con tutti i pesi a zero
- **Passi**: `#rrg` → «1 · Asset class», benchmark PTF → tutti i cursori a 0.
- **Ottenuto**: avviso corretto sotto la tabella, ma sopra il grafico «Contro il tuo portafoglio: . Composizione e cursori sotto il grafico.» (elenco vuoto). Ricaricando tornano i pesi dell'esempio senza avviso.
- **Screenshot**: `shots/bug-ptf-zero.png`, `shots/p-desktop-ptf-zero.png`.

### B15 · bassa · Focus perso
- «Preset di Rea» nella scheda Cali forti: il pulsante si nasconde dopo il clic e il focus va su `<body>` (tutti i profili).
- «Ho capito» nell'intro: l'intro si nasconde e il focus va su `<body>`.

### B16 · bassa · Focus dei ticker nel registro Alert
- `.alist .who { all: unset }` toglie l'outline di `:focus-visible`: con la tastiera il ticker è segnalato solo dalla sottolineatura.

### B17 · bassa · Intestazioni dentro `<summary>`
- `#secCap` e `#ixCap` hanno `<summary class="ph"><h2>…`: in alcuni lettori di schermo il summary perde il ruolo di intestazione o viceversa.

### B18 · bassa · README e tasti
- README, riga 99: «`1`–`6` viste»; l'app gestisce 1–7 (il 7 apre i Titoli) e guida e guida rapida dicono 1–7.

## Falsi positivi e note

- **H1 (Tab nella guida rapida)**: dopo l'ultimo elemento il focus passa per un attimo al documento: è il comportamento nativo di `<dialog>` in Chromium, non esce verso la pagina.
- **I9 (desktop)**: «29188» nel tabellone contro «29187,55» nella Situazione: arrotondamento voluto (0 decimali sopra 1000).
- **TT10 (telefono)**: l'intestazione «Cali forti» era coperta dalla prima colonna fissa dopo lo scorrimento automatico dello script; toccata in vista, la spiegazione si apre.
- **TT22 (telefono)**: la riga SPY a schede non ha «Ultimo» e «Solo prezzo» (scelta del layout); su desktop i valori coincidono.
- **A6**: la casella dei comandi non ha outline ma la barra mostra la linea ambra (`:focus-within`): accettabile.
- **K13**: la scala (Adatta/Massima) non resta dopo la ricarica, mentre le altre scelte della rotazione sì. Non è documentata come scelta salvata: da decidere.
- Grafico del settore (tooltip): sul telefono una seduta del grafico del settore vale meno di mezzo pixel, quindi l'ultima seduta si raggiunge solo dal bordo (succede per costruzione).

## Tabella dei casi di test

Esito per caso distinto; «Profili» indica dove è OK o BUG (`*` = falso positivo spiegato sopra). Dettagli e valori in `res/*.json`.

| ID | Area | Caso di test | Esito | Profili OK | Profili BUG | Screenshot |
|---|---|---|---|---|---|---|
| M0 | avvio | caricamento Monitor | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| M1 | tema | tema applicato da localStorage | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| M2 | vista mon | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-mon.png |
| M3 | vista mon | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-mon.png |
| M4 | vista mon | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-mon.png |
| M2 | vista rrg | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-rrg.png |
| M3 | vista rrg | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-rrg.png |
| M4 | vista rrg | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-rrg.png |
| M2 | vista btm | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-btm.png |
| M3 | vista btm | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-btm.png |
| M4 | vista btm | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-btm.png |
| M2 | vista sec | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-sec.png |
| M3 | vista sec | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-sec.png |
| M4 | vista sec | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-sec.png |
| M2 | vista alr | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-alr.png |
| M3 | vista alr | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-alr.png |
| M4 | vista alr | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-alr.png |
| M2 | vista idx | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-idx.png |
| M3 | vista idx | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-idx.png |
| M4 | vista idx | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-idx.png |
| M2 | vista tit | apertura con la scheda | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-tit.png |
| M3 | vista tit | niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-tit.png |
| M4 | vista tit | nessun NaN/undefined nel testo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/m-desktop-dark-tit.png |
| M5 | console | nessun errore in console | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| R1 | rotazione | elenco universi | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | Settori S&P 500 vs SPY | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | Settori S&P 500 vs QQQ | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | Settori S&P 500 vs RSP | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | Settori S&P 500 vs ACWI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | MAG7 vs SPY | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | MAG7 vs QQQ | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | MAG7 vs RSP | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | MAG7 vs ACWI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 1 · Asset class vs PTF | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 1 · Asset class vs XEON.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 1 · Asset class vs SWDA.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 2 · Fattori vs SWDA.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 2 · Fattori vs IUSQ.DE | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 3 · Regioni vs IUSQ.DE | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 3 · Regioni vs SWDA.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 4 · Paesi vs IUSQ.DE | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 4 · Paesi vs SWDA.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 6 · Indici vs IUSQ.DE | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 6 · Indici vs SWDA.MI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs BIL | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs CPI | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs DXY_INV | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs IEF | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs SPY | OK | desktop, laptop, phone |  |  |
| R2 | rotazione | 5 · Asset reali vs GLD | OK | desktop, laptop, phone |  |  |
| R2b | rotazione | benchmark salvato per universo | OK | desktop, laptop, phone |  |  |
| R3 | rotazione | universo salvato in localStorage | OK | desktop, laptop, phone |  |  |
| R4 | rotazione | timeframe giornaliero | OK | desktop, laptop, phone |  |  |
| R5 | rotazione | formula Medie semplici (stessa data, nota aggiornata) | OK | desktop, laptop, phone |  |  |
| R6 | rotazione | coda 4 | OK | desktop, laptop, phone |  |  |
| R6 | rotazione | coda 16 | OK | desktop, laptop, phone |  |  |
| R6 | rotazione | coda 26 | OK | desktop, laptop, phone |  |  |
| R6 | rotazione | coda 10 | OK | desktop, laptop, phone |  |  |
| R7 | rotazione | scala Massima cambia gli assi | OK | desktop, laptop, phone |  |  |
| R8 | rotazione | PLAY parte da un anno fa e STOP ferma | OK | desktop, laptop, phone |  | shots/r-desktop-play.png |
| R9 | rotazione | frecce ← → spostano il periodo | OK | desktop, laptop, phone |  |  |
| R10 | rotazione | Spazio avvia e ferma l'animazione | OK | desktop, laptop, phone |  |  |
| R11 | rotazione | ultimo periodo: data e nota provvisorio coerenti | OK | desktop, laptop, phone |  |  |
| R12 | tooltip | tooltip RRG = tabella di rotazione (RS-Ratio, RS-Mom, quadrante) | OK | desktop, laptop |  | shots/r-desktop-tip.png |
| R13 | rotazione | clic su riga fissa il titolo, Esc lo libera | OK | desktop, laptop, phone |  |  |
| R14 | rotazione | spunta nasconde e rimostra il titolo | OK | desktop, laptop, phone |  |  |
| R15 | rotazione | interruttore Prezzi | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per sym (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per last (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per d1 (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per w1 (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per m1 (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per m3 (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per ytd (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per dd (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per ddp (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per vs200 (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per rot (clic 2) | OK | desktop, laptop, phone |  |  |
| R16 | ordinamento | ordina per weeks (clic 2) | OK | desktop, laptop, phone |  |  |
| R17 | performance | periodo 63 | OK | desktop, laptop, phone |  |  |
| R17 | performance | periodo 252 | OK | desktop, laptop, phone |  |  |
| R17 | performance | periodo 504 | OK | desktop, laptop, phone |  |  |
| R17 | performance | periodo 126 | OK | desktop, laptop, phone |  |  |
| R18 | rotazione | nota «come si calcola» si apre | OK | desktop, laptop, phone |  |  |
| P1 | portafoglio | pannello in Asset class, benchmark PTF, totale 100 | OK | desktop, laptop, phone |  | shots/p-desktop-ptf0.png |
| P2 | portafoglio | cursore cambia peso, totale, nota, salva e ricalcola | OK | desktop, laptop, phone |  | shots/p-desktop-ptf1.png |
| P3 | portafoglio | pesi e universo restano dopo la ricarica | OK | desktop, laptop, phone |  |  |
| P4 | portafoglio | «Porta a 100%» | OK | desktop, laptop, phone |  |  |
| P5 | portafoglio | casella numero 150 limitata a 100 | OK | desktop, laptop, phone |  |  |
| P5b | portafoglio | casella svuotata torna al valore | OK | desktop, laptop, phone |  |  |
| P6 | portafoglio | tutti i pesi a zero: avviso, niente NaN | OK | desktop, laptop, phone |  | shots/p-desktop-ptf-zero.png |
| P7 | portafoglio | «Ripristina l'esempio» | OK | desktop, laptop, phone |  |  |
| P8 | portafoglio | «Confronta con il portafoglio» torna a PTF | OK | desktop, laptop, phone |  |  |
| P9 | portafoglio | passaggio su riga evidenzia la componente | OK | desktop |  |  |
| X1 | asset reali | pannello benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga BIL cambia benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga CPI cambia benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga DXY_INV cambia benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga IEF cambia benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga SPY cambia benchmark | OK | desktop, laptop, phone |  |  |
| X2 | asset reali | clic su riga GLD cambia benchmark | OK | desktop, laptop, phone |  |  |
| R99 | console | nessun errore | OK | desktop, laptop, phone |  |  |
| B1 | bottom map | stato iniziale «oggi» | OK | desktop, laptop, phone, tablet |  | shots/b-desktop-oggi.png |
| B2 | bottom map | cursore: settimana passata, pulsante Oggi | OK | desktop, laptop, phone, tablet |  |  |
| B3 | bottom map | crisi «nov 2008» (minimo 2008-11-20) | BUG |  | desktop, laptop, phone, tablet | shots/b-desktop-jump-2008-11-20.png |
| B3 | bottom map | crisi «ott 2011» (minimo 2011-10-03) | OK | desktop, laptop, phone, tablet |  |  |
| B3 | bottom map | crisi «feb 2016» (minimo 2016-02-11) | BUG |  | desktop, laptop, phone, tablet | shots/b-desktop-jump-2016-02-11.png |
| B3 | bottom map | crisi «dic 2018» (minimo 2018-12-24) | OK | desktop, laptop, phone, tablet |  |  |
| B3 | bottom map | crisi «mar 2020» (minimo 2020-03-23) | OK | desktop, laptop, phone, tablet |  |  |
| B3 | bottom map | crisi «ott 2022» (minimo 2022-10-12) | OK | desktop, laptop, phone, tablet |  |  |
| B3 | bottom map | crisi «apr 2025» (minimo 2025-04-08) | OK | desktop, laptop, phone, tablet |  |  |
| B4 | bottom map | PLAY parte da un anno fa, avanza, si ferma lasciando la vista | OK | desktop, laptop, phone, tablet |  |  |
| B5 | bottom map | freccia sul cursore cambia settimana | OK | desktop, laptop, phone, tablet |  |  |
| B6 | tooltip | tooltip Bottom Map coerente con «Distanza dal livello blu» | OK | desktop, laptop |  | shots/b-desktop-tip.png |
| B7 | bottom map | clic su riga apre il settore | OK | desktop, laptop, phone, tablet |  |  |
| S1 | settore | 11 chip dei settori | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLK | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLC | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLY | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLP | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLE | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLF | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLV | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLI | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLB | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLRE | OK | desktop, laptop, phone, tablet |  |  |
| S2 | settore | chip XLU | OK | desktop, laptop, phone, tablet |  |  |
| S3 | settore | periodo 10A | OK | desktop, laptop, phone, tablet |  |  |
| S3 | settore | periodo MAX | OK | desktop, laptop, phone, tablet |  |  |
| S3 | settore | periodo 3A | OK | desktop, laptop, phone, tablet |  |  |
| S4 | livello blu | + alza di 1 per clic, Ripristina visibile, salvato | OK | desktop, laptop, phone, tablet |  |  |
| S5 | livello blu | asterisco nel Monitor dopo la modifica | OK | desktop, laptop, phone, tablet |  |  |
| S6 | livello blu | «Copia configurazione» (messaggio + JSON valido col livello nuovo) | OK | desktop, laptop, phone, tablet |  | shots/s-desktop-copycfg.png |
| S7 | livello blu | Ripristina torna al default | OK | desktop, laptop, phone, tablet |  |  |
| S8 | livello blu | limite 0%: − disattivato | OK | desktop, laptop, phone, tablet |  |  |
| S9 | livello blu | limite 60%: + disattivato | OK | desktop, laptop, phone, tablet |  |  |
| S10 | livello blu | livelli non validi in localStorage ignorati | OK | desktop, laptop, phone, tablet |  |  |
| S11 | tooltip | tooltip del grafico all'ultima seduta = Situazione (prezzo, DD, breadth 200/50) | OK | desktop |  | shots/s-desktop-tstip.png |
| S12 | coerenza | XLU: breadth e drawdown uguali tra Monitor e Situazione | OK | desktop, laptop, phone, tablet |  |  |
| S13 | settore | «7 Titoli →» apre i titoli dello stesso settore | OK | desktop, laptop, phone, tablet |  |  |
| C1 | cali forti | scheda si apre con preset −7%/5/titoli | OK | desktop, laptop, phone, tablet |  | shots/c-desktop-sec-open.png |
| C2 | cali forti | scelta thr=5 | OK | desktop, laptop, phone, tablet |  |  |
| C2 | cali forti | scelta thr=10 | OK | desktop, laptop, phone, tablet |  |  |
| C2 | cali forti | scelta win=3 | OK | desktop, laptop, phone, tablet |  |  |
| C2 | cali forti | scelta win=10 | OK | desktop, laptop, phone, tablet |  |  |
| C2 | cali forti | scelta mode=pct | OK | desktop, laptop, phone, tablet |  |  |
| C3 | cali forti | «Preset di Rea» ripristina −7%, 5, titoli | OK | desktop, laptop, phone, tablet |  |  |
| C3b | accessibilità | focus dopo «Preset di Rea» non va perso sul body | BUG |  | desktop, laptop, phone, tablet |  |
| C4 | tooltip | tooltip dei cali forti all'ultima seduta coerente con la frase «Oggi …» | OK | desktop |  | shots/c-desktop-tip.png |
| C5 | cali forti | scheda si richiude | OK | desktop, laptop, phone, tablet |  |  |
| C6 | cali forti | cambiando settore la scheda mostra il nuovo settore | OK | desktop, laptop, phone, tablet |  |  |
| Z | console | nessun errore | OK | desktop, laptop, phone, tablet |  |  |
| A1 | alert | registro, riquadri e regole | OK | desktop, phone, tablet |  | shots/a-desktop.png |
| A2 | alert | ordinati dal più recente | OK | desktop, phone, tablet |  |  |
| A3 | alert | clic sul ticker apre il settore | OK | desktop, phone, tablet |  |  |
| I1 | indici | apertura: 10 principali, 22 chip, «Principali» premuto | OK | desktop, phone, tablet |  | shots/i-desktop-0.png |
| I1b | indici | riquadro «Cali forti in allerta» presente | OK | desktop, phone, tablet |  |  |
| I2 | indici | colonna «Cali forti» valorizzata (nessun «…») | OK | desktop, phone, tablet |  |  |
| I3 | indici | «Tutti» mostra 22 indici e salva | OK | desktop, phone, tablet |  |  |
| I3b | indici | 22 indici senza NaN | OK | desktop, phone, tablet |  | shots/i-desktop-all.png |
| I4 | indici | Taiwan senza cali forti, con spiegazione | OK | desktop, phone, tablet |  |  |
| I5 | indici | clic su chip toglie l'indice (focus resta) | OK | desktop, phone, tablet |  |  |
| I6 | indici | «Principali» torna a 10 | OK | desktop, phone, tablet |  |  |
| I7 | indici | non si possono togliere tutti (resta 1) | OK | desktop, phone, tablet |  | shots/i-desktop-one.png |
| I8 | indici | clic su riga apre il dettaglio | OK | desktop, phone, tablet |  |  |
| I9 | coerenza | NDX: breadth, drawdown e ultimo uguali tra tabellone e Situazione | OK | desktop*, phone, tablet |  |  |
| I10 | indici | chip dettaglio SPX | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio NDX | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio DJI | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio N225 | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio SXXP | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio DAX | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio RUT | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio FTSEMIB | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio KOSPI200 | OK | desktop, phone, tablet |  |  |
| I10 | indici | chip dettaglio EEM | OK | desktop, phone, tablet |  |  |
| I11 | indici | periodo 10A | OK | desktop, phone, tablet |  |  |
| I11 | indici | periodo MAX | OK | desktop, phone, tablet |  |  |
| I11 | indici | periodo 3A | OK | desktop, phone, tablet |  |  |
| I12 | livello blu | indice: +, −, asterisco in tabella, Ripristina | OK | desktop, phone, tablet |  |  |
| I13 | mappa indici | data passata: nota con gli indici senza dati | OK | desktop, phone, tablet |  | shots/i-desktop-map-past.png |
| I14 | mappa indici | crisi «nov 2008» | BUG |  | desktop, phone, tablet |  |
| I14 | mappa indici | crisi «ott 2011» | OK | desktop, phone, tablet |  |  |
| I14 | mappa indici | crisi «feb 2016» | BUG |  | desktop, phone, tablet |  |
| I14 | mappa indici | crisi «dic 2018» | OK | desktop, phone, tablet |  |  |
| I14 | mappa indici | crisi «mar 2020» | OK | desktop, phone, tablet |  |  |
| I14 | mappa indici | crisi «ott 2022» | OK | desktop, phone, tablet |  |  |
| I14 | mappa indici | crisi «apr 2025» | OK | desktop, phone, tablet |  |  |
| I15 | mappa indici | PLAY/STOP | OK | desktop, phone, tablet |  |  |
| I16 | tooltip | tooltip mappa indici = distanza = tabellone | OK | desktop |  | shots/i-desktop-tip.png |
| IC1 | cali forti | scheda indice SPX | OK | desktop, phone, tablet |  | shots/i-desktop-cap.png |
| IC2 | cali forti | la scelta −5% si riflette anche nella colonna della tabella | OK | desktop, phone, tablet |  |  |
| IC3 | cali forti | Taiwan: scheda «non disponibile» con motivo | OK | desktop, phone, tablet |  |  |
| IC4 | cali forti | con 0 cali il percentile mostrato non deve sembrare alto | BUG |  | desktop, phone, tablet |  |
| I17 | indici | dopo ricarica restano «Tutti» e l'indice scelto (anche non principale) | OK | desktop, phone, tablet |  |  |
| T1 | titoli | apertura | OK | desktop, phone, tablet |  | shots/t-desktop-0.png |
| T2 | titoli | chip XLK | OK | desktop, phone, tablet |  |  |
| T2 | titoli | chip XLE | OK | desktop, phone, tablet |  |  |
| T2 | titoli | chip XLRE | OK | desktop, phone, tablet |  |  |
| T3 | titoli | Indietro torna al settore precedente | OK | desktop, phone, tablet |  |  |
| T4 | titoli | periodo 1M | OK | desktop, phone, tablet |  |  |
| T4 | titoli | periodo 6M | OK | desktop, phone, tablet |  |  |
| T4 | titoli | periodo YTD | OK | desktop, phone, tablet |  |  |
| T4 | titoli | periodo 1A | OK | desktop, phone, tablet |  |  |
| T4 | titoli | periodo 3M | OK | desktop, phone, tablet |  |  |
| T5 | titoli | scia sel | OK | desktop, phone, tablet |  |  |
| T5 | titoli | scia off | OK | desktop, phone, tablet |  |  |
| T5 | titoli | scia all | OK | desktop, phone, tablet |  |  |
| T6 | titoli | ordine Settore vs Divergenza cambia l'ordine | OK | desktop, phone, tablet |  |  |
| T7 | titoli | asse dd | OK | desktop, phone, tablet |  |  |
| T7 | titoli | asse prev | OK | desktop, phone, tablet |  |  |
| T7 | titoli | asse d200 | OK | desktop, phone, tablet |  |  |
| T8 | titoli | bolle Uguali | OK | desktop, phone, tablet |  |  |
| T9 | titoli | scelte restano dopo la ricarica | OK | desktop, phone, tablet |  |  |
| T10 | tooltip | tooltip riga dumbbell | OK | desktop |  | shots/t-desktop-spreadtip.png |
| T11 | titoli | passaggio su «I più in pena» evidenzia la bolla | OK | desktop |  |  |
| T12 | tooltip | tooltip bolla | OK | desktop |  | shots/t-desktop-bubtip.png |
| T13 | tooltip | tooltip storia della divergenza: ultimo punto = «oggi» della nota | OK | desktop |  | shots/t-desktop-histtip.png |
| T14 | titoli | ticker dei più in pena aprono TradingView in nuova scheda | OK | desktop, phone, tablet |  |  |
| K1 | comandi | comando «XLU» | OK | desktop, phone |  |  |
| K1 | comandi | comando «xlk» | OK | desktop, phone |  |  |
| K1 | comandi | comando «XLK TIT» | OK | desktop, phone |  |  |
| K1 | comandi | comando «XLU SEC» | OK | desktop, phone |  |  |
| K1 | comandi | comando «ORO» | OK | desktop, phone |  |  |
| K1 | comandi | comando «NDX» | OK | desktop, phone |  |  |
| K1 | comandi | comando «N225» | OK | desktop, phone |  |  |
| K1 | comandi | comando «DAX» | BUG |  | desktop, phone |  |
| K1 | comandi | comando «SMI» | BUG |  | desktop, phone |  |
| K1 | comandi | comando «SPY» | BUG |  | desktop, phone |  |
| K1 | comandi | comando «QQQ» | OK | desktop, phone |  |  |
| K1 | comandi | comando «INDIA» | OK | desktop, phone |  |  |
| K1 | comandi | comando «TESLA» | OK | desktop, phone |  |  |
| K1 | comandi | comando «nvda» | OK | desktop, phone |  |  |
| K1 | comandi | comando «SWDA» | OK | desktop, phone |  |  |
| K1 | comandi | comando «PTF» | OK | desktop, phone |  |  |
| K1 | comandi | comando «GLD» | OK | desktop, phone |  |  |
| K1 | comandi | comando «BITCOIN» | OK | desktop, phone |  |  |
| K1 | comandi | comando «BTC» | OK | desktop, phone |  |  |
| K1 | comandi | comando «XLU GO» | OK | desktop, phone |  |  |
| K1 | comandi | comando «MON» | OK | desktop, phone |  |  |
| K1 | comandi | comando «ROT» | OK | desktop, phone |  |  |
| K1 | comandi | comando «RRG» | OK | desktop, phone |  |  |
| K1 | comandi | comando «BTM» | OK | desktop, phone |  |  |
| K1 | comandi | comando «SEC» | OK | desktop, phone |  |  |
| K1 | comandi | comando «ALRT» | OK | desktop, phone |  |  |
| K1 | comandi | comando «ALERT» | OK | desktop, phone |  |  |
| K1 | comandi | comando «IDX» | OK | desktop, phone |  |  |
| K1 | comandi | comando «TIT» | OK | desktop, phone |  |  |
| K1 | comandi | comando «indici» | OK | desktop, phone |  |  |
| K1 | comandi | comando «HELP» | OK | desktop, phone |  |  |
| K1 | comandi | comando «GUIDA» | OK | desktop, phone |  |  |
| K1 | comandi | comando «CHIARO» | OK | desktop, phone |  |  |
| K1 | comandi | comando «TEMA» | OK | desktop, phone |  |  |
| K1 | comandi | comando «SCURO» | OK | desktop, phone |  |  |
| K1 | comandi | comando «ZZZZ» | OK | desktop, phone |  |  |
| K1 | comandi | comando «XLK FOO» | OK | desktop, phone |  |  |
| K1 | comandi | comando «   » | OK | desktop, phone |  |  |
| K2 | comandi | avviso «non trovato» sparisce dopo 4 s | OK | desktop, phone |  |  |
| K3 | tasti | tasto 2 → rrg | OK | desktop, phone |  |  |
| K3 | tasti | tasto 3 → btm | OK | desktop, phone |  |  |
| K3 | tasti | tasto 4 → sec | OK | desktop, phone |  |  |
| K3 | tasti | tasto 5 → alr | OK | desktop, phone |  |  |
| K3 | tasti | tasto 6 → idx | OK | desktop, phone |  |  |
| K3 | tasti | tasto 7 → tit | OK | desktop, phone |  |  |
| K3 | tasti | tasto 1 → mon | OK | desktop, phone |  |  |
| K4 | tasti | ? apre la guida, Esc la chiude | OK | desktop, phone |  |  |
| K5 | tasti | / porta alla barra; scrivendo un numero non cambia vista | OK | desktop, phone |  |  |
| K6 | tasti | frecce/Home/Fine sulle schede | OK | desktop, phone |  |  |
| K7 | accessibilità | schede con tabindex «roving» | OK | desktop, phone |  |  |
| K8 | tasti | scorciatoie spente dalla guida: 3 e ? non fanno niente | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #mon | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #rrg | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #btm | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #sec | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #alr | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #idx | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #tit | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #xlu | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #XLE | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #tit-XLK | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #tit-xlb | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #TIT-ZZZ | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #pippo | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta # | OK | desktop, phone |  |  |
| K9 | indirizzi | apertura diretta #NDX | OK | desktop, phone |  |  |
| K10 | indirizzi | cambio dell'hash a mano apre la vista | OK | desktop, phone |  |  |
| K11 | indirizzi | Indietro: btm → XLK → XLU → rrg → mon; Avanti → rrg | OK | desktop, phone |  |  |
| K12 | ricarica | universo, benchmark, formula, coda, timeframe, tema, CVD restano | OK | desktop, phone |  |  |
| K12b | tema | tema chiaro: color-scheme e theme-color coerenti | OK | desktop, phone |  | shots/k-desktop-light-rrg.png |
| K13 | ricarica | scala (Adatta/Massima) dopo ricarica | OK | desktop, phone |  |  |
| Z1 | console | nessun errore (comandi/tasti) | OK | desktop, phone |  |  |
| V1 | versione | version.json diversa: compare «Nuova versione» | OK | desktop, phone |  | shots/v-desktop-banner.png |
| V2 | versione | clic: riscarica i file e ricarica la pagina | OK | desktop, phone |  |  |
| V3 | versione | versione uguale: niente avviso | OK | desktop, phone |  |  |
| V4 | versione | version.json non valida: niente avviso, niente errori | OK | desktop, phone |  |  |
| V5 | versione | version.json irraggiungibile: niente avviso | OK | desktop, phone |  |  |
| V6 | versione | controllo al ritorno sulla scheda (visibilitychange) | OK | desktop, phone |  |  |
| V7 | versione | numero di versione e novità al passaggio | OK | desktop, phone |  |  |
| N1 | intro | intro alla prima visita, «Apri la guida», «Ho capito» e non ricompare | OK | desktop, phone |  | shots/i-desktop-intro.png |
| N2 | accessibilità | dopo «Ho capito» il focus non si perde sul body | BUG |  | desktop, phone |  |
| N3 | monitor | striscia «cosa è cambiato» | OK | desktop, phone |  | shots/n-desktop-changes.png |
| N4 | monitor | voce della striscia apre il settore | OK | desktop, phone |  |  |
| N5 | monitor | clic su riga del Monitor apre il dettaglio | OK | desktop, phone |  |  |
| N6 | accessibilità | riga del Monitor apribile con Invio | OK | desktop, phone |  |  |
| N7 | monitor | scheda «Settori da osservare» apre il settore | OK | desktop, phone |  |  |
| Z2 | console | nessun errore (intro/striscia) | OK | desktop, phone |  |  |
| H1 | guida rapida | pulsante apre, focus su ×, Tab resta dentro, Esc chiude e torna al pulsante | OK | desktop-dark*, desktop-light*, laptop-dark*, laptop-light*, phone-dark*, phone-light*, tablet-dark*, tablet-light* |  | shots/h-desktop-dark-modal.png |
| H2 | guida rapida | chiusura con × e con clic sullo sfondo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H3 | guida rapida | la modale sta nello schermo | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista mon | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista rrg | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista btm | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista sec | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista alr | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista idx | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H4 | guida rapida | link «Guida completa» dalla vista tit | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| H5 | guida | «Guida completa» dalla Bottom Map apre guida.html#btm alla sezione | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/g-desktop-dark-btm.png |
| G1 | guida | tutte le ancore interne esistono | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G2 | guida | versione e niente scroll orizzontale | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  | shots/g-desktop-dark-top.png |
| G3 | guida | voci dell'indice portano alla sezione (26) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «SECTOR·MON» (./#mon) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «← Torna all'app» (./#mon) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri il Monitor →» (./#mon) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri la Rotazione →» (./#rrg) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri la Bottom Map →» (./#btm) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri un settore (XLU) →» (./#XLU) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri gli Alert →» (./#alr) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri gli Indici →» (./#idx) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G4 | guida | link «Apri i Titoli →» (./#tit) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| Z | console | nessun errore (app + guida) | OK | desktop-dark, desktop-light, laptop-dark, laptop-light, phone-dark, phone-light, tablet-dark, tablet-light |  |  |
| G5 | guida | indice: chiuso senza hash; con #tit la sezione è visibile e non coperta | OK | phone-dark, phone-light |  | shots/g-phone-dark-hash-tit.png |
| TT1 | spiegazioni | Monitor: elementi con spiegazione raggiungibili al tocco (fuori dalle righe cliccabili) | BUG | desktop, tablet | phone |  |
| TT20 | spiegazioni | title su intestazioni e conteggi del Monitor | OK | desktop |  |  |
| TT21 | coerenza | Monitor: k/n, valore del titolo e % coincidono | OK | desktop, phone, tablet |  |  |
| TT22 | coerenza | Monitor: riquadro SPY = riga SPY (ultimo, drawdown, solo prezzo) | OK | desktop, phone*, tablet |  |  |
| TT2 | spiegazioni | Monitor a schede: le spiegazioni di Drawdown / Solo prezzo / Rotazione sono raggiungibili | BUG | tablet | phone | shots/tt-tablet-mon.png |
| TT3 | taptip | tocco su voce della Situazione mostra la spiegazione | OK | phone, tablet |  | shots/tt-tablet-facts.png |
| TT4 | taptip | tocco altrove chiude la spiegazione | OK | phone, tablet |  |  |
| TT5 | taptip | il riquadro sta nello schermo | OK | phone, tablet |  |  |
| TT6 | taptip | lo scorrimento chiude la spiegazione | OK | phone, tablet |  |  |
| TT7 | taptip | intestazioni degli episodi | OK | phone, tablet |  |  |
| TT8 | taptip | RRG: tocco su un punto lo fissa e mostra i numeri | OK | phone, tablet |  | shots/tt-tablet-rrg.png |
| TT9 | taptip | RRG: tocco sul vuoto libera il punto | OK | phone, tablet |  |  |
| TT10 | taptip | Indici: intestazione «Cali forti» al tocco | OK | phone*, tablet |  |  |
| TT11 | taptip | Indici: cella con spiegazione nella riga (cali forti, ultimo) | BUG |  | phone, tablet |  |
| TT12 | taptip | Titoli: tocco su una bolla mostra il titolo | OK | phone, tablet |  | shots/tt-tablet-bubble.png |
| TT13 | taptip | Titoli: tocco sulla riga del dumbbell | OK | phone, tablet |  | shots/tt-tablet-spread.png |
| TT14 | taptip | Bottom Map: tocco su un punto apre il settore | OK | phone, tablet |  |  |
| E1 | errori | capitulation.json (abort): scheda Settore | OK | desktop |  | shots/e-desktop-cap-sec-abort.png |
| E2 | errori | capitulation.json (abort): colonna «Cali forti» degli indici dice che mancano i dati | BUG |  | desktop | shots/e-desktop-cap-idx-abort.png |
| E1 | errori | capitulation.json (404): scheda Settore | OK | desktop |  | shots/e-desktop-cap-sec-404.png |
| E2 | errori | capitulation.json (404): colonna «Cali forti» degli indici dice che mancano i dati | BUG |  | desktop | shots/e-desktop-cap-idx-404.png |
| E1 | errori | capitulation.json ({"rotto":): scheda Settore | OK | desktop |  | shots/e-desktop-cap-sec-json.png |
| E2 | errori | capitulation.json ({"rotto":): colonna «Cali forti» degli indici dice che mancano i dati | BUG |  | desktop | shots/e-desktop-cap-idx-json.png |
| E3 | errori | indices_more.json assente: avviso che mancano 12 indici | BUG |  | desktop | shots/e-desktop-more.png |
| E4 | errori | indices_more.json assente: conteggio «N su M mostrati» = righe visibili | BUG |  | desktop |  |
| E5 | errori | prices_global.json assente con universo salvato «1 · Asset class»: avviso chiaro | BUG |  | desktop | shots/e-desktop-global.png |
| E6 | errori | prices_global.json assente: comando SWDA spiega perché non c'è | BUG |  | desktop |  |
| E7 | errori | prices_global.json assente: l'universo salvato non viene sovrascritto | OK | desktop |  |  |
| E8 | errori | prices_macro.json 404 con universo salvato «5 · Asset reali»: avviso | BUG |  | desktop |  |
| E9 | errori | sector_members.json (abort): messaggio nella vista 7 | OK | desktop |  | shots/e-desktop-tit-abort.png |
| E9 | errori | sector_members.json (JSON senza campi): messaggio nella vista 7 | BUG |  | desktop | shots/e-desktop-tit-json.png |
| E10 | errori | indices.json assente: messaggio nella vista 6 | OK | desktop |  | shots/e-desktop-idx.png |
| E11 | errori | config/indices.json assente: #idx e tasto 6 non portano a una pagina vuota | BUG |  | desktop | shots/e-desktop-noixcfg.png |
| E12 | errori | alerts.json assente: il riquadro Telegram non dice cose false | BUG |  | desktop |  |
| E13 | errori | breadth_latest.json assente: titoli del settore con messaggio | OK | desktop |  | shots/e-desktop-latest.png |
| E14 | errori | prices.json 404: messaggio chiaro al posto del Monitor | OK | desktop |  | shots/e-desktop-prices.png |
| E15 | errori | capitulation.json lenta: «caricamento…» poi i dati | OK | desktop |  |  |
| A1 | accessibilità | #mon: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #mon: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #mon: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #mon: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #mon: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #mon: focus visibile sui primi 20 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #rrg: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #rrg: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #rrg: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #rrg: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #rrg: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #rrg: focus visibile sui primi 40 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #btm: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #btm: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #btm: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #btm: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #btm: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #btm: focus visibile sui primi 27 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #XLU: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #XLU: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #XLU: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #XLU: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #XLU: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #XLU: focus visibile sui primi 40 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #alr: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #alr: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #alr: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #alr: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #alr: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #alr: focus visibile sui primi 40 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #idx: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #idx: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #idx: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #idx: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #idx: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #idx: focus visibile sui primi 40 elementi | OK | desktop*, phone* |  |  |
| A1 | accessibilità | #tit: id unici | OK | desktop, phone |  |  |
| A2 | accessibilità | #tit: controlli con nome accessibile | OK | desktop, phone |  |  |
| A3 | accessibilità | #tit: bottoni a scelta con aria-pressed | OK | desktop, phone |  |  |
| A4 | accessibilità | #tit: grafici con aria-label | OK | desktop, phone |  |  |
| A5 | accessibilità | #tit: righe cliccabili raggiungibili e attivabili da tastiera | OK | desktop, phone |  |  |
| A6 | accessibilità | #tit: focus visibile sui primi 40 elementi | OK | desktop*, phone* |  |  |
| A7 | accessibilità | guida: <dialog> con aria-labelledby | OK | desktop, phone |  |  |
| A8 | accessibilità | lang="it", titolo, un h1 | OK | desktop, phone |  |  |
| A9 | accessibilità | intestazioni dentro <summary> (perdono il ruolo di heading in alcuni lettori) | BUG |  | desktop, phone |  |
| L1 | localStorage | valori corrotti in localStorage: tutte le viste funzionano senza NaN né errori | OK | — |  | shots/l-corrupt-rrg.png |
| L2 | localStorage | settore salvato non valido: #sec apre un settore valido | OK | — |  |  |
| L3 | localStorage | localStorage bloccato (navigazione privata rigida): app funziona | OK | — |  | shots/l-nols.png |
| L4 | livello blu | «Copia configurazione» con appunti consentiti: JSON con i due livelli cambiati | OK | — |  |  |
| L5 | livello blu | dopo un nuovo cambio il messaggio «Copiata» sparisce | OK | — |  |  |
| F1 | freschezza | orologio 2026-10-17T10:00:00+02:00: badge «Aggiornato» | OK | — |  |  |
| F1 | freschezza | orologio 2026-10-19T12:00:00+02:00: badge «Aggiornato» | OK | — |  |  |
| F1 | freschezza | orologio 2026-10-20T03:00:00+02:00: badge «1 seduta indietro» | OK | — |  |  |
| F1 | freschezza | orologio 2026-10-21T10:00:00+02:00: badge «2 sedute indietro» | OK | — |  |  |
| F1 | freschezza | orologio 2026-10-16T23:00:00+02:00: badge «1 seduta indietro/Aggiornato» | OK | — |  |  |