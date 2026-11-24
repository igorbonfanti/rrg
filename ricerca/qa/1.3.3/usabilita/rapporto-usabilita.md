# Controllo grafici e usabilità (temi 3 e 4) · versione 1.3.3 · commit fa508e4

Verdetto: NO-GO, per un solo rilievo «da correggere» (n. 1, una parola della guida). Impaginazione, tooltip, telefono, temi e regressioni passano. Corretto il n. 1, la versione è GO; i minori possono andare in `docs/sviluppo.md`.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | guida.html#avvicinamento, elenco «Come usarlo» (voci 1–3) | L'avvicinamento viene chiamato «giallo» («Il settore diventa giallo», «se è ancora giallo», «il giallo è spesso la risalita»), ma nel Monitor e nella Bottom Map il giallo pieno è lo stato **Attenzione** (badge `#ffc400` pieno, punto giallo). L'avvicinamento è solo un contorno; nel tema chiaro è ocra (`#825e00`), non giallo. La voce 2 mette a confronto proprio «già in Attenzione» con «ancora giallo»: chi guarda l'app capisce il contrario. Il «giallo» della vista 4 (tratto della breadth) viene spiegato più avanti nella guida, nella sezione #sec. | Aprire #mon nel tema chiaro e guardare «Come si legge lo stato»: AVVICINAMENTO ha il contorno ocra, ATTENZIONE è giallo pieno. Poi leggere guida.html#avvicinamento. | shots/v-mon-legenda-360-chiaro.png, shots/guida-360-chiaro.png |
| 2 | minore | Monitor (settori da osservare) contro la guida | Oggi l'unico settore in avvicinamento è XLRE. La scheda dice «in un calo deciso il livello blu è a circa due settimane», ma la guida dice che in XLRE l'avvicinamento «non distingue nulla» e che dopo un bottom recente «il giallo è spesso la risalita» (la sintesi della ricerca cita proprio «XLRE nel 2025 e oggi»). Chi resta nell'app non trova questa avvertenza: legenda, scheda e tooltip non rimandano a «Come usarlo». | #mon a 1440: a destra la scheda XLRE AVVICINAMENTO; poi #XLRE, riga «Soglia di avvicinamento» = «40% · sotto». | shots/v-mon-1440-scuro.png, shots/sec-XLRE-tip-360-scuro.png |
| 3 | minore | Note della pagina (riquadro «? Guida», voce Avvicinamento) | «(vedi la guida)» è testo semplice, senza link a guida.html#avvicinamento. Il link «Guida completa ↗» in cima al riquadro apre la sezione della vista in uso (#mon), non l'avvicinamento. | Tasto «? Guida», sezione «Stati dei settori». | shots/note-1440-scuro.png |
| 4 | minore | Testi dell'avvicinamento, tutte le copie | Il messaggio non è uguale ovunque. «È un promemoria, non un segnale» compare nelle note e nella guida, ma non nella legenda del Monitor né nei tooltip della Situazione (settori e indici). «XLC dal 2019, XLRE dal 2016» compare nella guida e nelle note, ma non nella legenda né nel tooltip dei settori, che dicono solo «Dal 2005». Il tooltip degli indici dice «dal 2000», mentre il README precisa «dalla prima seduta con uno stato», cioè la correzione stessa della 1.3.3. | Confrontare js/bottom.js:242 e :440, js/indices.js:395, index.html:728, guida.html:162. | diff della 1.3.3 |
| 5 | minore | guida.html#avvicinamento, «Come usarlo» | Tre percentuali diverse senza dire perché: «circa un avvicinamento su tre arriva al livello» (senza orizzonte), «zona blu entro sei mesi 23%», «il livello blu arriva 46%/27%» (orizzonte non detto: 126 sedute), «34%». Chi non conosce l'app non sa che «arrivare al livello» e «entrare in zona blu» sono cose diverse, né su quale periodo si contano. | Leggere i due paragrafi e l'elenco di seguito. | shots/guida-1440-scuro.png |
| 6 | minore | guida.html#avvicinamento, frase d'apertura di «Come usarlo» | «Il prezzo non scende più del solito, e chi compra lì prima di un vero bottom sopporta in mezzo un calo mediano del 14%» sembra contraddirsi. Il −14% vale solo per i casi in cui poi arriva davvero il bottom, ed è misurato dall'ingresso al minimo e non sulle 63 sedute (la sintesi della ricerca lo dice meglio). Inoltre «alla terza seduta» (di cosa?), «il giallo è spesso la risalita» e «non distingue nulla» sono gergo: per esempio «tre sedute dopo l'ingresso», «la breadth sta risalendo da un bottom», «non avvisa più di una seduta qualsiasi». | Lettura. | — |
| 7 | minore | Legenda del Monitor sul telefono (360–390 px) | Il badge occupa metà della riga, quindi il testo dell'avvicinamento va in una colonna di 138–168 px e prende 17 righe. Si legge, non è tagliato né sovrapposto, ma è un muro di testo. La griglia c'era già prima della 1.3.3. | #mon a 360 px, «Come si legge lo stato». | shots/v-mon-legenda-360-chiaro.png |
| 8 | minore | Note di versione (tooltip in alto) | «indici: 89 e 83 su 132» non dice che 83 è l'avvicinamento da solo; anche la sola Attenzione vale 83, quindi la lettura è doppiamente ambigua. | Passare il mouse o toccare «v1.3.3». | shots/versione-tip-390-scuro.png |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

- `u133.cjs` sulla 1.3.3: **320 controlli, 0 FAIL**. Le combinazioni sono 8: 1440, 1280, 390 e 360 px (gli ultimi due con tocco e isMobile), ciascuna nel tema chiaro e scuro, impostato da `antigravity-theme` e verificato su `data-theme`. Per ogni combinazione:
  - #mon: la legenda ha i numeri nuovi; testo non tagliato, senza sovrapposizioni tra badge e testo né tra le 6 voci; nessuno scorrimento orizzontale.
  - Versione in alto: è 1.3.3; il tooltip contiene la nota nuova; al tocco si apre un riquadro di 320×228 px, tutto dentro lo schermo e senza scorrimento interno.
  - #XLRE e #XLV: la riga «Soglia di avvicinamento» c'è; i valori «40% · sotto» e «28% · +56,9 pt» sono interi e non si sovrappongono all'etichetta; nessuna sovrapposizione tra le 16 voci; il tooltip ha i numeri nuovi (453 caratteri); al tocco il riquadro di 320×158 px resta dentro lo schermo; nessuno scorrimento orizzontale.
  - Indici: la stessa riga c'è; il tooltip ha 89/132, 23 contro 13 sedute, 83 e 40%; al tocco il riquadro resta dentro lo schermo.
  - Note «? Guida»: la voce Avvicinamento ha «promemoria» e 50/63 e 33; la voce 6 Indici ha 89/132, 23 e 13, 83; tutto dentro lo schermo.
  - guida.html#avvicinamento: l'elenco ha 4 voci, con dimensione del carattere, interlinea, margini, rientro, punto elenco, colore e font identici a quelli di un altro elenco della guida; voci non sovrapposte e dentro lo schermo; le percentuali ci sono. L'ancora porta al titolo, visibile in alto e non coperto. Nell'indice laterale «Avvicinamento» è evidenziato.
  - Console senza errori su tutte le viste.
- Regressioni sulla 1.3.3: `v091.cjs` 0 FAIL su 88, `v095.cjs` 0 FAIL su 64, `v130.cjs` 0 FAIL su 24.
- **Il controllo può fallire.** Lo stesso `u133.cjs` sulla 1.3.2 (copia di `git archive origin/main`, porta 8798, `EXPECT=1.3.3`) dà **96 FAIL su 280**. Falliscono:
  - legenda, tooltip dei settori e degli indici e note con i numeri vecchi;
  - la voce «promemoria», assente;
  - l'elenco «Come usarlo», assente;
  - la versione, che è 1.3.2.

  Non cambiano, come ci si aspetta, i controlli d'impaginazione, perché la 1.3.2 ha la stessa struttura. Un artefatto dello script: sulla 1.3.2 fallisce anche il controllo dell'ancora, perché senza elenco lo script non legge il campo «sopra».
- Screenshot ripresi a mano e guardati: legenda (360, chiaro), sezione della guida (1440 scuro e 360 chiaro), tooltip toccato di XLRE (360 scuro), Monitor (1440 scuro).

## Cosa non ho potuto verificare e perché

- Sul computer il tooltip della Situazione e della versione è il `title` nativo del browser: Chromium senza schermo non lo disegna. Ho controllato il testo dell'attributo e il passaggio del mouse, non l'aspetto del riquadro del sistema.
- Gli screenshot dei singoli elementi alti (`shots/mon-legenda-390/360-*.png`) escono tagliati in cima: è un limite di Playwright con elementi più alti della finestra, non dell'app. Fa fede `v-mon-legenda-360-chiaro.png`, ripreso sulla finestra.
- Le percentuali della guida (23%, 46%, 27%, 21%, 34%, 14%) non le ho ricalcolate: sono del tema «Numeri». Ho solo controllato che corrispondano a `ricerca/avvicinamento-uso/sintesi.md`, e corrispondono.

## Script e screenshot

- `ricerca/qa/1.3.3/usabilita/u133.cjs` (controllo principale); `vista.cjs` (screenshot della finestra su un elemento).
- Log: `u133-1.3.3.log`, `u133-1.3.2.log`, `reg-v091.log`, `reg-v095.log`, `reg-v130.log`.
- Screenshot: `ricerca/qa/1.3.3/usabilita/shots/` (54 file).
- La copia della 1.3.2 (`app-132/`) è stata cancellata; i server sulle porte 8797 e 8798 sono fermi.
