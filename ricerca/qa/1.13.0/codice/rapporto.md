# QA indipendente del codice: 1.13.0 «note più corte»

Confronto tra `0c253bb` (1.12.0, pubblicata) e `2e33ad3` (1.13.0), il 23/11/2026. Siti serviti da worktree separati
(`/tmp/qa-k-new` porta 8831, `/tmp/qa-k-old` porta 8832) con la stessa cartella `data/`; Chromium di Playwright,
`localStorage['sm.introSeen']='true'` prima del caricamento. Nessun file dell'app modificato, nessun commit.

Script e uscite in questa cartella:

| file | cosa fa |
|---|---|
| `ids.mjs` → `ids.out.txt` | ogni `$('id')`/`getElementById` dei js contro index.html (con il prefisso `sec`/`ix` di cap-view.js) e contro gli id creati dai js; id tolti e aggiunti; id duplicati |
| `anchors.mjs` → `anchors.out.txt` | ogni `guida.html#…` (index.html e js), ogni `data-guide`, ogni `href="#…"` interno della guida contro gli id di guida.html; bilancio dei tag |
| `mutazioni.sh` | 10 errori introdotti uno alla volta in una copia, per vedere se `test/info.test.js` li prende |
| `viste.cjs` → `viste-dirette.out.txt`, `viste-dirette.json`, `viste-mancanti.out.txt`, `viste-mancanti.json` | ogni vista aperta dal suo indirizzo a 1440 e 390 px sulle due versioni; ogni file di `data/` in 404 a turno con tutte le viste e un clic su un «i» |
| `info-probe.cjs` → `info-probe.out.txt` | comportamento di `js/info.js` oltre a v1130 (Esc con la crisi del VIX e la guida rapida, `bindInfo` ripetuto, `data-src` mancante, XSS da `data-info`, `<summary>`, tastiera, id duplicati) |
| `browser-runs/` | uscite dei controlli di `ricerca/qa/browser/` sulle due versioni |
| `shots/` | `riquadro-resta-dopo-tasto-8.png` (rilievo R1), `stati-390.png` |

## Controlli

| # | Controllo | Esito |
|---|---|---|
| 1a | Riferimenti agli id: nei js nuovi nessun id senza elemento (0); 7 id tolti da index.html (`fxBox`, `fxSum`, `ptfHow`, `mxHow`, `rotNote`, `athNoteVp`, `srcLine`), nessuno ancora usato da js, css o controlli non aggiornati; 32 id nuovi | verde |
| 1b | Modifiche ai js fuori dai testi, una per una (elenco sotto): nessuna tocca calcoli, stati, soglie o dati; ordine di render invariato; un solo gestore nuovo (`bindInfo()` in testa a `bind()`) | verde |
| 2a | `js/info.js`: eventi delegati sul documento, legati una volta (`bound`); `bindInfo()` chiamato altre due volte nella pagina: un solo `#infopop`, un clic apre e il secondo chiude | verde |
| 2b | Esc: in cattura su `window`, prima dello zoom (`document`, cattura) e dei gestori in bolla (VIX, app.js). Crisi del VIX evidenziata + riquadro aperto: il primo Esc chiude il riquadro, il secondo toglie la crisi. Riquadro fissato e «?»: la guida si apre e il riquadro si chiude (focusin), Esc chiude la guida. Zoom: provato da v1130 (passa) | verde, con R3 |
| 2c | XSS: `data-info` entra con `textContent` (provato con `<img onerror>`: nessuno script, nessun `img`); `data-guide` finisce dopo `guida.html#`; `data-src` copia l'`innerHTML` di contenitori della pagina già scritti dai js con `esc()` o `textContent` (`stateHelp`, `secQualityHelp`, `CapHelp`, `pxCopied`, `vxScNoteFull`, `titData`): nessuna strada nuova per contenuto dai dati | verde |
| 2d | `data-src` che non esiste: il riquadro si apre con il solo «Nella guida ↗», nessun errore | verde (riquadro quasi vuoto, accettabile) |
| 2e | Cambio di vista con il riquadro aperto | **rosso: R1** |
| 2f | Id duplicati con il riquadro aperto | giallo: R2 |
| 3a | 14 indirizzi (`#mon` … `#ath`, `#XLK`, `#SOXX`, `#tit-XLE`, `#emg-KOSPI`) × 1440 e 390 px × 2 versioni: vista visibile e disegnata, stessi conteggi nelle due versioni, nessuno scorrimento orizzontale, 0 errori in console e nella pagina | verde |
| 3b | 19 file di `data/*.json` e `data/index_members/` in 404 a turno, 10 viste ciascuno, sulle due versioni: conteggi, viste nascoste ed errori identici tra 1.12.0 e 1.13.0; 0 `pageerror`; nessun «i» vuoto. Senza `breadth.json`, `prices.json` o `sectors.json` l'app non parte in nessuna delle due versioni (già così prima) | verde |
| 4a | `npm test` sulla 1.13.0: 206 test, 206 verdi | verde |
| 4b | `test/info.test.js` può fallire: fallisce con 6 errori su 10 introdotti (margine di `placeBox`, contenitore tolto, `data-guide` senza ancora, contenitore non nascosto, link «Fonti e note» rotto, `data-src` rotto in un js); non vede il `dataset.src` impostato da app.js (`#tableInfo`), il margine in basso di `placeBox`, `fill` che non copia il testo, Esc disattivato (questi ultimi due li prende v1130) | verde, con R6 |
| 5a | Controlli modificati, confrontati con 0c253bb: v1100, v1101, v1110, v150, v162, v190 controllano lo stesso testo di prima, ora letto dal riquadro aperto davvero con un clic o un tocco (`lib-info.cjs` restituisce '' se non si apre, quindi possono fallire); v1100 e v1101 controllano in più la riga corta o la riga di fonti. v1120 e v160 sono un po' più deboli (R5) | verde, con R5 |
| 5b | Eseguiti sulla 1.13.0: v1100, v1101, v1110 (2845 OK), v1120 (250 OK), v160, v162, v190 tutti verdi; v150 fallisce solo su «ordine delle schede» (12 righe), identico sulla 1.12.0 (controllo fermo a 9 schede dalla 1.12.0, R7) | verde |
| 5c | v1130 sulla 1.12.0: fallisce (260 falliti, 90 ok); sulla 1.13.0: 1290 ok, 0 falliti | verde |
| 5d | In più, i controlli non modificati sulle due versioni: v091, v095, v140fix, v161, v170, v191 verdi su entrambe; v130 (1), v140 (9), v180 (2) con gli stessi fallimenti sulla 1.12.0 e sulla 1.13.0 (nessuno nuovo) | verde |
| 6a | `node --check` su tutti i `js/*.js` e `ricerca/qa/browser/*.cjs` | verde |
| 6b | HTML: nessun id duplicato in index.html e guida.html; tag bilanciati; html-validate 8.18.2 con le stesse categorie di avvisi della 1.12.0 (solo stile: `<link/>`, stili in linea, 2 `<th>` senza `scope` in più nella guida) | verde |
| 6c | Ancore: 120 riferimenti (`data-guide`, `guida.html#…` in index.html e js, `#…` interni della guida, compresi i 10 `#fonti-…`), 0 senza ancora | verde |
| 6d | Versione: `js/version.js` 1.13.0 / 2026-11-23 = `version.json`; nota 1.13.0 nel README e nelle `NOTES` | verde |

## Modifiche ai js fuori dai testi (punto 1)

- **app.js**: tolti `FX_SUM` e la scrittura in `#fxBox/#fxSum` (elementi tolti insieme); tolto `$('rotNote').hidden` (elemento tolto); `#pxNote` ora riceve l'asterisco e si nasconde se vuoto (in `renderRRGView` prima `hidden = !px`, poi `renderPriceTable`, chiamata solo con `px`, lo riscrive: ordine corretto, provato in universo USA e in euro); `$('tableInfo').dataset.src` segue la tabella mostrata (provato: «Direzione…» e «Drawdown…»); `title` su «Obiettivo» e «Oggi»; `#mxNow` usa `now.dataset.b` invece di `now.cells[1]` (i `data-b` esistono tutti, `DXY_INV` → «1/DXY»); `bindInfo()` in testa a `bind()`. Nessun calcolo toccato.
- **bottom.js**: `#stateLegend` corta e `#stateHelp` con il testo completo di prima (stessi parametri `P.*`); `#secQuality` corta con un «i» generato e `#secQualityHelp` con il testo di prima; meta più corte. Nessuna logica toccata.
- **cap-view.js**: `#…CapHelp` riceve il testo completo o, nei tre rami d'errore, lo stesso testo di `#…CapNote`; il `$` con prefisso trova `secCapHelp` e `ixCapHelp` (esistono).
- **indices.js**: fonte della lista spostata nel `title` di `#ixQuality`.
- **vix-view.js**: `#vxScNote` corta, `#vxScNoteFull` con il testo di prima (variabile `notDrawn` condivisa, stessi numeri).
- **titles.js**: solo testo.

## Rilievi

**Bloccanti: nessuno.**

**R1 · da correggere · Il riquadro resta aperto cambiando vista con i tasti 1-9 e 0.**
`info.js` si chiude su `hashchange`, ma `setView` (app.js, riga 828) cambia l'indirizzo con `history.pushState`/`replaceState`, che non lo genera. Riproduzione: `#mon`, Tab fino al «i» di «Come si legge lo stato», Invio, poi tasto `8` → la vista VIX si apre con sopra il riquadro delle regole degli stati del Monitor, in alto a sinistra (`shots/riquadro-resta-dopo-tasto-8.png`; anche con `3`, `info-probe.cjs` J3). Si chiude solo con un clic o Esc. Lo stesso con un riquadro aperto al passaggio del mouse e un tasto di vista. Il commento «cambiando vista il riquadro si chiude» è vero solo per i clic. Correzione possibile: esportare una `closeInfo()` e chiamarla in `setView`, oppure in `place()` chiudere se `!cur.getClientRects().length`; aggiungere il caso a v1130.

**R2 · minore · Id duplicati mentre il riquadro è aperto.**
`fill()` copia l'`innerHTML` del contenitore con gli id che contiene: con il riquadro dei prezzi aperto ci sono due `#pxCopied`, con quello dello scatter due `#vxScNoteFull` e due `#vxScBig`, con «Grandi contro piccoli» due `#titData` (`info-probe.cjs` A3, B1). Oggi `getElementById` trova l'originale, perché `#infopop` è in fondo al `body`, ma è HTML non valido e un selettore Playwright rigoroso su quegli id fallirebbe a riquadro aperto. Correzione: dopo la copia, `body.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'))`.

**R3 · minore · Esc su un riquadro aperto al passaggio del mouse sposta il focus.**
`#mon`, scrivere nel comando, passare il mouse su un «i», Esc: il riquadro si chiude e il focus va dal campo del comando al bottone «i» (`info-probe.cjs` G2). `close(true)` dovrebbe riportare il focus solo se il riquadro era fissato (`pinned`) o se il focus era già sul bottone o nel riquadro.

**R4 · minore (testo, da decidere con l'utente) · La frase «le regole di zona blu, trigger e cooldown sono di questa app» non è più nelle viste 1, 4 e 6.**
Prima era in `#blueSrc` (settori e SOXX), in `#ixBlueSrc` e nella guida rapida; ora è solo nella riga di fonti della vista 9 Alert e nella guida. Accanto al livello blu resta «Livello di default: tabella «200 LEVEL SETTORI» di Massimo Rea (quant-rea)»: chi legge può attribuire a Rea anche le regole. Collegato: il «2 chiusure» nel `data-info` della Bottom Map è scritto a mano in index.html, mentre prima veniva da `P.setupCloses` (oggi uguale, 2).

**R5 · minore · Due controlli vecchi un po' più deboli.**
v1120: il controllo della versione passa da «1.12.0» a qualsiasi 1.12–1.19 coerente tra `version.json` e `version.js` (ragionevole per un controllo che deve girare anche dopo); la citazione di Caruso accetta `#srcLine` o `#athSrc`. v160: «VXVCLS» ora si cerca nel sorgente di guida.html (`fonti-vix` … `fonti-alr`), non nel testo visibile, e l'espressione `count + boolean >= 1` è fragile da leggere. Nessuno dei due è diventato impossibile da far fallire.

**R6 · minore · Buchi di `test/info.test.js`.** Non vede i `data-src` impostati dai js (`#tableInfo.dataset.src = 'pxHelp' | 'rotHelp'`) e il comportamento del DOM (copertura lasciata a v1130). Si può aggiungere un controllo che ogni stringa assegnata a `dataset.src` abbia il suo contenitore.

**R7 · minore, già nella 1.12.0 · v150 fallisce su «ordine delle schede»** (aspetta 9 schede); anche v130 (1), v140 (9) e v180 (2) falliscono uguali sulle due versioni. Non dipendono dalla 1.13.0, ma rendono rumoroso il giro dei controlli vecchi.

Osservazione, senza rilievo: le note «Sul telefono … sono nascoste» delle tabelle di rotazione e degli episodi sono passate nella guida; nella pagina del telefono non si dice più quali colonne mancano (scelta di testo).

## Verdetto

**GO**: nessun bloccante. La logica di calcolo non cambia, nessun errore nuovo in console in nessuna vista né con file mancanti, test e controlli verdi. Consiglio di correggere R1 prima della pubblicazione (poche righe, più un caso in v1130); R2 e R3 si possono fare insieme. R4 è una scelta di testo da sottoporre all'utente.
