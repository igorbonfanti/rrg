# QA usabilità 1.13.0 (bottoni «i», note più corte): controllo indipendente

- Versione provata: commit `2e33ad3` (1.13.0). Confronto: `0c253bb` (1.12.0, pubblicata).
- Server: worktree `/tmp/qa-u-new` (porta 8821) e `/tmp/qa-u-old` (porta 8822), con i dati di `/home/user/rrg/data/` copiati.
- Playwright: `chromium.launch()`, `sm.introSeen='true'` e `antigravity-theme` scuro o chiaro prima del caricamento. Computer 1440×900 e 1280×800 (anche 1024×768); telefono 390×844 e 360×740 (`isMobile`, `hasTouch`), più 768×1024 con il tocco.
- Script, esiti e immagini sono tutti in questa cartella. Si lanciano con `NODE_PATH=$(npm root -g) node <script>.cjs` (indirizzi in `lib.cjs`, variabili `NEW` e `OLD`).
- Nota: mentre il controllo era in corso il ramo è andato avanti (`cfe68dd`, poi due commit di QA). `js/info.js` è uguale, quindi i rilievi D1, D2, M1 e M2 valgono anche lì. `cfe68dd` aggiunge un «i» al pannello «VIX e indice nel tempo», che quindi esce da M3: quella modifica non l'ho provata.

## Verdetto: **GO**

Non ho trovato bloccanti. In tutte le viste e gli universi, alle quattro larghezze e nei due temi, i bottoni «i» si aprono e si chiudono come previsto (488 aperture, oltre 6.000 controlli). Il riquadro resta sempre nello schermo, l'ancora della guida esiste, la pagina non scorre in orizzontale e la console non ha errori. Le viste sono molto più leggere: nella prosa visibile −82% nel VIX, −79% nei Titoli, −77% negli Emergenti, −59% nei Massimi.
Tre rilievi da correggere (D1–D3) sono piccoli e conviene sistemarli prima della pubblicazione o subito dopo, in una 1.13.1.

## Tabella dei controlli

| # | Controllo | Come | Esito |
|---|---|---|---|
| 1.1 | Ogni «i» di ogni vista: #mon, #rrg nei suoi 8 universi (con il «i» delle formule nei filtri), #btm, #XLK, #SOXX, #tit, #idx, #emg, #vix, #ath, anche nei riquadri piegati aperti e nel grafico dei Massimi; #alr non ne ha | `bottoni.cjs`: 61 aperture per combinazione × 8 combinazioni (1440, 1280, 390, 360 × scuro e chiaro) | ✅ 488 aperture, 0 errori (`bottoni-*.txt`) |
| 1.2 | Apertura al passaggio del mouse e chiusura uscendo; resta aperto passando dal bottone al riquadro | `bottoni.cjs`, 1440 e 1280 | ✅ |
| 1.3 | Apertura al clic (computer) e al tocco (telefono) | `bottoni.cjs` | ✅ |
| 1.4 | Tastiera: si arriva al «i» con Tab, Invio apre, Esc chiude e riporta il focus sul bottone, Spazio apre, Esc chiude | `bottoni.cjs`, ogni «i» a 1440 e 1280 | ✅ (ma vedi M1: il link dentro il riquadro non si raggiunge) |
| 1.5 | Chiusura con clic o tocco fuori (punto neutro, senza elementi interattivi) | `bottoni.cjs` | ✅ |
| 1.6 | Uno solo aperto per volta (aprire un altro chiude il primo; aria-expanded=true su un solo bottone) | `bottoni.cjs` | ✅ |
| 1.7 | Riquadro dentro lo schermo, anche vicino ai bordi e in fondo alla pagina | misura del rettangolo a ogni apertura; ridimensionamento a 900×700 con il riquadro aperto | ✅ sempre dentro. ⚠️ A volte copre il suo bottone: M2 e D2 |
| 1.8 | Riquadri lunghi che scorrono | rotella sul riquadro (computer), scrollTop (telefono) | ✅ a 360 scorrono «regole degli stati» (854/714 px) e «Grandi contro piccoli» (746/714). ⚠️ Al telefono vedi D2 |
| 1.9 | Leggibilità nei due temi | ho guardato le immagini in `shots/pop/` (1440 e 390, scuro e chiaro) e misurato il contrasto (5.1) | ✅ |
| 1.10 | Il link «Nella guida ↗» apre la sezione giusta: l'ancora esiste, è visibile e arriva in cima | `bottoni.cjs` controlla l'href e l'ancora; `ancore.cjs` apre `guida.html#…` per tutte le 39 ancore (data-guide, link nei riquadri, «Fonti e note») a 1440 e 390 | ✅ 78 su 78; titolo a 12 px dall'alto, nessuna ancora dentro un `<details>` chiuso, guida senza scorrimento orizzontale |
| 1.11 | Guida rapida (?) | `interazioni.cjs` e immagine `shots/int/guida-rapida-1440-scuro.png` | ✅ sezioni «Le viste», «Stati dei settori», «Glossario», «Comandi e tasti»; 666 parole; nessun «i» dentro, ma dice dove trovarli («riquadro «i» accanto ai titoli dei pannelli») |
| 2.1 | «i» in un'intestazione di tabella non ordina la colonna | conteggio di `th button.info` in tutte le viste | — non applicabile: nessun «i» sta in un `th`. Controllato al posto suo il «i» dei Massimi accanto ai bottoni d'ordine: ordine e righe non cambiano ✅ |
| 2.2 | «i» in un `<summary>` non apre né chiude il riquadro piegato | #XLK, #SOXX, #idx, 2 riquadri ciascuno, partendo chiusi e aperti; clic, Invio e Spazio (1440), tocco (390, 360) | ✅ e il clic sul titolo apre ancora il riquadro piegato. Nota in M5 sui tocchi vicini |
| 2.3 | Esc con lo zoom: il primo chiude il riquadro, il secondo lo zoom | trascinamento su #vxChart, #ts, #ixTs, #emChart, #athChart | ✅ 5 su 5 |
| 2.4 | Scorrendo la pagina | aperto con un clic e poi rotella; telefono con scrollBy | ✅ il riquadro segue il bottone e passa sopra o sotto secondo lo spazio. Esce dallo schermo con il bottone e torna con lui. Aperto col solo mouse, la rotella lo chiude (`hover-rotella.txt`) |
| 2.5 | Cambio vista con un riquadro aperto | clic su una scheda, tocco su una scheda, comando VIX nella barra, tasto Indietro, tasto numerico | ✅ i primi quattro. ❌ **tasto numerico 1–9/0: il riquadro resta aperto (D1)** |
| 2.6 | Guida rapida aperta con «?» mentre un riquadro è aperto | `interazioni.cjs` | ✅ il riquadro si chiude e il primo Esc chiude la guida |
| 3.1 | Nessuno scorrimento orizzontale, nessun elemento fuori schermo, «i» non sovrapposti, non tagliati e non a capo da soli | `pagina.cjs`: 6 larghezze (1440, 1280, 1024, 768, 390, 360) × 2 temi × 11 viste | ✅ 540 su 540 |
| 3.2 | Testi tagliati o sovrapposti, a occhio | immagini a pagina intera in `shots/pagina/` (guardate: Monitor, Settore, VIX, Bottom Map, Rotazione a 1024) | ✅ niente di nuovo. Già nella 1.12.0: la tabella del Monitor a 1440 scorre in orizzontale dentro il pannello (colonne dopo «1G») |
| 3.3 | Console senza errori | tutti gli script | ✅ 0 errori (con i dati presenti) |
| 3.4 | Dati mancanti: 404 su `data/vix.json`, `data/ath.json`, `data/emerging.json` | `dati-mancanti.cjs`, 1440 e 390, tutte le viste | ✅ ogni vista lo dice («Dati del VIX non disponibili (data/vix.json: HTTP 404).» e così per le altre due); le altre viste funzionano e i loro «i» si aprono; in console solo i 3 «Failed to load resource» del 404 |
| 4.1 | Viste più leggere | `vecchia.cjs` → `confronto.md`; immagini affiancate in `shots/confronto/` | ✅ prosa visibile a 1440: VIX 1224→225, Titoli 832→175, Emergenti 727→165, Massimi 345→140, Indici 410→255, SOXX 396→266, Bottom Map 111→64. Altezza a 390: VIX 5562→3776 px, Emergenti 4283→3191, Titoli 3778→2600 |
| 4.2 | In pagina resta quello che serve per usare la vista | lettura delle immagini | ✅ restano istruzioni d'uso brevi («clic per il dettaglio», «Solo contesto: non cambia stati né alert», date dei dati, «Conta gli episodi, non i giorni», stato dei dati, riga «Fonti e note»). ⚠️ M3 |
| 4.3 | Chi apre l'app per la prima volta capisce dove sono le spiegazioni | presentazione senza `sm.introSeen` (`accessibilita.cjs`, `shots/a11y/prima-apertura-*.png`) | ⚠️ **la presentazione non nomina i «i» (D3)**; li nomina solo la guida rapida |
| 5.1 | Contrasto | colori calcolati (WCAG) | ✅ bottone a riposo 6,1:1 (scuro e chiaro); bottone aperto o col mouse sopra 10,3:1; testo del riquadro 9,3:1 (scuro) e 10,2:1 (chiaro); link «Nella guida» 13,4:1 e 6,9:1; bordo del riquadro 10,3:1 e 6,3:1; anello del focus visibile (`shots/a11y/focus-*.png`) |
| 5.2 | aria-label e aria-expanded | tutte le viste, a riposo e aperti | ✅ tutti con `type=button`, «Spiegazione: …», aria-expanded che cambia giusto. ⚠️ M6 |
| 5.3 | Area di tocco al telefono | elementFromPoint dal centro a ±10, 14, 16 e 20 px | ✅ 32×32 px (16 disegnati + 8 per lato), sopra i 24 px di WCAG 2.5.8; ⚠️ sotto i 44/48 px consigliati (M5) |

## Rilievi

### Bloccanti
Nessuno.

### Da correggere

**D1. Con i tasti 1–9 e 0 il riquadro resta aperto sopra la nuova vista.**
Passi: #mon a 1440, clic sul «i» di «Come si legge lo stato», poi tasto **3**. La Bottom Map compare, ma il riquadro con le regole degli stati resta aperto sopra il grafico. Il suo bottone, ora nascosto, ha ancora `aria-expanded="true"`. Immagine: `shots/int/cambio-vista-tasto-3.png`.
Causa: `setView` cambia l'indirizzo con `history.pushState`, che non manda `hashchange`, e `js/info.js` chiude il riquadro solo su `hashchange`. Con clic e tocco sulle schede non succede, perché il clic fuori chiude già il riquadro; anche il comando nella barra e il tasto Indietro lo chiudono.
Correzione possibile: chiudere il riquadro dentro `setView` (oppure esportare `close` da info.js), o chiuderlo anche su `popstate` e quando il bottone corrente non è più visibile.

**D2. Al telefono i riquadri lunghi coprono quasi tutto lo schermo, anche il loro bottone, e non hanno un ×.**
Passi: 360×740, #mon, tocco sul «i» di «Come si legge lo stato». Il riquadro occupa 12–348 × 16–732 px, cioè il 97% dell'altezza. Il contenuto (854 px) scorre dentro, e il link «Nella guida ↗» si vede solo in fondo. Toccare il riquadro non lo chiude, e il suo bottone è coperto, quindi un secondo tocco è impossibile. Lo chiude solo un tocco nei 12 px di margine ai lati o in alto. Succede anche con «Grandi contro piccoli» (716 px su 740). A 390 «regole degli stati» copre l'86% dell'altezza.
Immagini: `shots/int/riquadro-lungo-360.png`, `shots/pop/390-scuro_mon_1.png`. Esito in `telefono-lungo.txt`. Lo script `bottoni.cjs` segna anche il caso «il bottone resta toccabile con il suo riquadro aperto» come ❌ a tutte le larghezze.
Correzione possibile: un × in alto nel riquadro, oppure un tocco sul riquadro che lo chiude; al telefono, un'altezza massima più bassa (per esempio 70% dello schermo) con un segno che il testo continua.

**D3. La presentazione della prima apertura non dice dove sono finite le spiegazioni.**
Nella 1.13.0 la presentazione dice soltanto «Leggi lo stato dei settori. Clic su un settore per il dettaglio. In 2 Rotazione gli ETF in euro.» Nella 1.12.0 le spiegazioni erano già in pagina. Ora sono dietro i «i», e chi apre l'app la prima volta non lo sa finché non apre la guida rapida (?). Immagine: `shots/a11y/prima-apertura-1.13.0-1440.png`.
Correzione possibile: una riga nella presentazione, per esempio «Le spiegazioni sono nei bottoni ⓘ accanto ai titoli; fonti e note in fondo a ogni vista».

### Minori

**M1. Dalla tastiera il link dentro il riquadro non si raggiunge.** Invio sul «i» apre il riquadro, ma Tab lo chiude e passa all'elemento dopo nella pagina (nel VIX, la prima riga della tabella). Così «Nella guida ↗», «come usarlo», «Spiegazione completa ↗» e gli altri link restano fuori dalla tastiera. Il riquadro sta in fondo al `body`. La riga «Fonti e note» compensa solo in parte. Esito in `interazioni.txt`.

**M2. Al computer i riquadri alti possono coprire il loro bottone.** Succede quando sopra e sotto il bottone non c'è posto: per esempio «regole degli stati» (730 px), «Grandi contro piccoli» (675 px a 1280), asset reali (470), scatter del VIX (434), Cali forti (385 a 1280). Allora un secondo clic sul bottone non chiude il riquadro: si chiude con un clic fuori o con Esc. Inoltre basta passare col mouse sul «i» del Monitor per aprire un riquadro di 730 px. Elenco completo con `grep "copre il bottone" bottoni-*.txt`.

**M3. Alcuni pannelli hanno perso la nota senza ricevere un «i».**
- «Episodi con il VIX a 40 o più»: la legenda del mini-grafico «Andamento del VIX» (linea tratteggiata = soglia, punto pieno = primo giorno…) ora è solo nella guida.
- «VIX e indice nel tempo»: corretto in `cfe68dd`, non provato.
- Tabella principale del Monitor: la nota «Il drawdown conta i dividendi come reinvestiti… Solo prezzo…» ora è solo nel glossario della guida rapida e nella guida.

Elenco dei titoli con e senza «i» in `titoli-senza-i.txt`.

**M4. Il segno «ⓘ» non è cliccabile.** Nella riga «ⓘ Cali forti: allerta al …» di «Perché questo stato» (viste 4 e 6) il segno somiglia ai nuovi bottoni «i» ma è solo testo (`js/cap-view.js:73`); si vede in `shots/int/scroll-telefono-390.png`.

**M5. Area di tocco di 32 px.** Basta per WCAG 2.5.8 (24 px), ma è sotto i 44/48 px consigliati da Apple e Google. Nel titolo dei riquadri piegati, un tocco fino a circa 16 px a sinistra del «i» apre il riquadro «i» invece di aprire o chiudere il riquadro piegato: a 22 px o più apre il riquadro piegato come deve (`tocco-vicino.txt`). È accettabile, ma il bersaglio è più largo del disegno.

**M6. Lettori di schermo.** Il contenuto del riquadro ha `role="status"`, quindi ogni apertura viene letta come annuncio, anche quella al passaggio del mouse, e i testi lunghi diventano annunci lunghi. Il bottone non è legato al riquadro con `aria-controls` o `aria-describedby`. Non impedisce l'uso.

### Osservazioni (non regressioni)
- A 1440 la tabella del Monitor scorre in orizzontale dentro il pannello: le colonne dopo «1G» sono tagliate con la sfumatura. Era uguale nella 1.12.0 (`shots/confronto/mon-1440-1.12.0.png`).
- Il controllo dell'autore (`ricerca/qa/browser/v1130.cjs`) non prova il cambio vista da tastiera (D1), le aperture al telefono che coprono lo schermo (D2), la presentazione (D3) né il Tab dentro il riquadro (M1).

## File
- Script: `lib.cjs`, `inventario.cjs`, `bottoni.cjs`, `interazioni.cjs`, `pagina.cjs`, `dati-mancanti.cjs`, `accessibilita.cjs`, `ancore.cjs`, `vecchia.cjs`, `titoli-senza-i.cjs`, `tocco-vicino.cjs`, `telefono-lungo.cjs`, `hover-rotella.cjs`.
- Esiti: `bottoni-1440.txt`, `bottoni-1280.txt`, `bottoni-390.txt`, `bottoni-360.txt`, `interazioni.txt`, `pagina.txt`, `dati-mancanti.txt`, `accessibilita.txt`, `ancore.txt`, `confronto.md`, `titoli-senza-i.txt`, `tocco-vicino.txt`, `telefono-lungo.txt`, `hover-rotella.txt`, `inventario.json`. `bottoni.log` è l'esecuzione unica interrotta a 360 dal problema D2; le esecuzioni buone sono le quattro `bottoni-<larghezza>.txt`.
- Immagini: `shots/pop/` (ogni riquadro a 1440 e 390, scuro e chiaro), `shots/int/` (interazioni), `shots/pagina/` (pagine intere), `shots/confronto/` (1.12.0 contro 1.13.0), `shots/mancanti/`, `shots/a11y/`, `shots/guida/`. In tutto circa 88 MB.
