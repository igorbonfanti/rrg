# 1.8.0 — controllo indipendente: usabilità, funzioni e testi dello zoom

Commit 5cfa6d6 (ramo `claude/great-noether-2f1ude`), server locale `http://127.0.0.1:8791/`, Chromium con Playwright, deviceScaleFactor 1.
Computer 1440 scuro e 1280 chiaro; telefono 390 scuro e 360 chiaro (isMobile, hasTouch, trascinamenti con CDP `Input.dispatchTouchEvent`).
Script e screenshot: `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa-uso/` (`desk1-5.cjs`, `mob1-2.cjs`, `vix2.cjs`, `guida.cjs`, `tap.cjs`, `shots/`). `npm test`: 151 su 151.

## Controlli

| Controllo | Esito |
|---|---|
| Trascinamento oltre 5 px: banda con le due date, riquadro dei valori chiuso, linea condivisa dei Cali forti nascosta durante la selezione | ✅ |
| Sotto 10 sedute banda grigia, al rilascio niente (anche dentro uno zoom già stretto, in tutti e 5 i gruppi) | ✅ |
| Trascinamento che esce a destra dal grafico e rilascio fuori dall'svg; rilascio fuori dalla finestra (x negativa) | ✅ zoom fino al bordo, banda tolta |
| Trascinamento che parte dalle etichette a destra o a sinistra del riquadro; tasto destro | ✅ niente |
| Trascinamento lento a zig-zag con uscita e rientro: il riquadro dei valori non riappare | ✅ |
| Mouse premuto dentro, uscita in verticale dall'svg, rilascio fuori (senza trascinamento orizzontale) | ❌ rilievo 1 |
| Due trascinamenti rapidi di seguito | ✅ |
| Zoom, cambio vista (scheda e tasti 1 → 4) e ritorno | ✅ lo zoom resta |
| Resta con settore, indice (10 indici), paese, SPX/NDX e soglia del VIX, livello blu, tema, ridimensionamento a 600 px | ✅ |
| Indice con la storia più corta (SXXP dopo uno zoom 2005-2006 su SPX) | ✅ tratto tagliato alla storia («dal 02/01/2006»), coerente con README e guida |
| × (anche con Invio dalla tastiera) → focus sul pulsante del periodo scelto; doppio clic; Esc; pulsante del periodo già scelto | ✅ |
| Esc: prima lo zoom poi l'evidenza (RRG con titolo fissato, VIX con crisi); con la guida aperta chiude solo la guida | ✅ |
| Esc con la lente accesa e senza zoom | ⚠️ rilievo 4 |
| Lente con la tastiera (Invio, Spazio), aria-pressed; ordine di tabulazione periodo → lente → × | ✅ |
| aria-live «Zoom dal … al …» e aria-label del grafico aggiornati | ✅ |
| Stampa (@media print): etichetta visibile in tutte e 5 le viste, × e lente nascoste | ✅ |
| Testi nei grafici zoomati (asse, «valori al …», «peggiore nel tratto», «soglia … al …»): nessuna sovrapposizione testo-testo, nessun testo fuori dall'svg (5 viste × 2 computer, 7 grafici × 2 telefoni, 600 px) | ✅ |
| Etichette dell'asse nei tratti brevi (03/03 10/03 …; lug 26 ago 26; apr 21 mag 21) | ✅ |
| Telefono senza lente: tocco = riquadro, verticale = la pagina scorre, orizzontale = mirino, niente zoom (7 grafici, 390 e 360) | ✅ |
| Telefono con la lente: banda durante il trascinamento, riquadro chiuso, zoom, lente spenta dopo lo zoom, col secondo tocco e cambiando vista; × al tocco | ✅ |
| Telefono con la lente: scorrimento quasi verticale sul grafico | ⚠️ rilievo 3 |
| Etichetta dentro lo schermo e senza sovrapposizioni nell'intestazione a 390 e 360 | ✅ |
| Dimensione al tocco di × e lente | ⚠️ rilievo 6 |
| Nessuno scorrimento orizzontale della pagina (1440, 1280, 600, 390, 360; guida.html 1280 e 390) | ✅ |
| Console senza errori (tutte le sessioni) | ✅ |
| Regressioni: riquadro della RRG, fissare un titolo, scatter del VIX al clic, linea condivisa grafico ↔ Cali forti (stessa data alla stessa x anche nello zoom) | ✅ |
| «Storia della divergenza» (Titoli), mini-grafici del VIX, Monitor, Bottom Map senza zoom | ✅ |
| Testi: guida.html «Zoom su un tratto» e tasti, guida rapida, README 1.8.0, version.js (1.8.0 = version.json, 2026-11-10) | ⚠️ rilievi 2 e 5 |

## Rilievi

**1. Da correggere: selezione «appiccicosa» col mouse.**
Passi: vista 4 Settore, 1440 px. Premere il tasto sinistro dentro il pannello del prezzo vicino al bordo alto, salire in verticale fuori dal grafico (meno di 5 px in orizzontale) e rilasciare sopra l'intestazione. Poi ripassare sul grafico senza premere nulla.
Risultato: la banda arancione segue il mouse a tasto rilasciato e il riquadro dei valori non compare più (`shots/1440-dark-sec-sticky.png`). Torna normale solo dopo un clic sul grafico.
Causa: `pointerup` arriva all'svg solo dopo `setPointerCapture`, che parte dal sesto pixel orizzontale. Il mouse non ha cattura implicita, quindi se si rilascia fuori dall'svg prima di quel punto `drag` resta aperto. Nello stato appiccicoso, mentre il mouse si muove, `_zoomDrag` vale true. Rimedio possibile: in `pointermove` chiamare `stop()` se `e.pointerType === 'mouse' && !(e.buttons & 1)`, oppure ascoltare `pointerup` anche su `window`.

**2. Da correggere (testo): struttura della guida.**
In `guida.html` il titolo h3 «Zoom su un tratto» è stato inserito prima dei paragrafi **Tasti** e **Indirizzi** della sezione «Comandi e tasti», che ora stanno sotto il titolo dello zoom (`shots/guida-zoom-1280.png`). L'indice laterale non ha la voce dello zoom. Rimedio: spostare il blocco dello zoom dopo «Indirizzi», oppure dare a Tasti e Indirizzi un loro h3, e aggiungere «Zoom su un tratto» nell'indice.

**3. Minore: telefono con la lente accesa, uno scorrimento quasi verticale crea uno zoom.**
Passi: 390 px, vista Settore, toccare la lente, poi trascinare il dito sul grafico dal basso verso l'alto per 450 px con 8 px di deriva orizzontale.
Risultato: zoom «dal 03/04/2025 al 07/05/2025» e la pagina non scorre. La soglia è di 5 px solo in orizzontale e al telefono 5 px sono circa 11 sedute a 3A.
Effetto pratico: per lo zoom dei Cali forti la lente sta in alto (y ≈ 422) e il grafico dei Cali forti a y ≈ 1876, con in mezzo il grafico principale alto 568 px. Scorrendo con la lente accesa, se il dito parte sul grafico principale non si scorre, oppure si fa uno zoom per sbaglio.
Rimedio possibile: al tocco cominciare la selezione solo se |dx| > |dy|, o con una soglia più alta.

**4. Minore: un solo Esc spegne la lente e toglie anche l'evidenza.**
Passi: Rotazione, fissare un titolo nella tabella, cliccare la lente senza fare zoom, premere Esc.
Risultato: la lente si spegne e nello stesso Esc sparisce anche l'evidenza della RRG, perché il gestore spegne la lente senza segnare `done`. Lo stesso succede con la crisi del VIX. Va deciso se spegnere la lente conta come «primo Esc».

**5. Minore (testi): frasi imprecise.**
- `js/version.js`, nota 1.8.0: «Zoom su un tratto in **tutti** i grafici con il tempo». Non è vero per la Storia della divergenza (Titoli) né per i mini-grafici del VIX. Lo stesso vale per la guida rapida in `index.html` («Nei grafici con il tempo, trascina…»). Il README e la guida invece elencano i grafici.
- `guida.html`: «l'asse del tempo in mesi o giorni». Per i tratti di 2,5 anni o più restano gli anni (`timeTicks`), quindi meglio «in anni, mesi o giorni secondo la lunghezza».
- `guida.html` e README: «valori al …». Sotto i 600 px circa il grafico scrive «al …» (`narrow`). La guida dice anche «in un riquadro vuoto», mentre nella Performance relativa i valori a destra non hanno riquadro (lì il tratto è scritto nella legenda).
- `guida.html` (sezione VIX, riga 392) e la nota nella vista VIX dicono che la crisi si toglie «oppure [con] Esc». Con uno zoom attivo serve un secondo Esc: la sezione Tasti lo dice, la sezione VIX no.

**6. Minore: bersagli al tocco piccoli.**
A 390 px la × dell'etichetta misura 16×17 px e la lente 28×22 px, mentre i pulsanti del periodo misurano 38×34. Sono sotto i 24×24 px consigliati (WCAG 2.5.8), anche se probabilmente rientrano nell'eccezione per spaziatura.

**7. Minore (estetica): una regola CSS non ha effetto.**
`svg .zendt { fill: var(--amber) }` perde contro `.ts .axt` (specificità 0,1,1 contro 0,2,0), quindi «valori al …» è grigio e non ambra. Se il grigio va bene, la regola si può togliere.

## Verdetto

**GO**, con il rilievo 1 da correggere prima della pubblicazione se possibile: la correzione è di una riga e il difetto si vede, perché il riquadro dei valori sparisce finché non si clicca. Vale lo stesso per il rilievo 2, che si sistema solo nel testo. Nessun rilievo è bloccante: le funzioni richieste ci sono tutte, in tutte e 5 le viste, al computer e al telefono, in entrambi i temi, e non ho trovato errori in console, scorrimenti orizzontali o regressioni. I rilievi da 3 a 7 si possono rimandare.
