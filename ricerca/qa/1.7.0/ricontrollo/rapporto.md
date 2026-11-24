# Ricontrollo vista 8 VIX · versione 1.7.0 · commit e94ff75

Verdetto: **GO**

Tutti e 7 i «da correggere» dei due controlli precedenti sono corretti. Lo stesso vale per i minori che il commit 13ceccb dichiara corretti. Le correzioni non rompono niente. Restano solo minori, quasi tutti di testo.

Il servizio: `node ricerca/qa/server/gzserve.mjs . 8809`. Per i controlli che devono fallire ho servito la 8796e55 (prima delle correzioni) sulla porta 8810 e la 1.6.2 (8151601) sulla porta 8811, con gli stessi `data/`. Dalla e94ff75 a HEAD i file dell'app non cambiano (`git diff` vuoto su js, css, html, README, data).

## Rilievi precedenti: esito

| Rilievo | Esito | Prova |
|---|---|---|
| NG1 / UT-minore: colori degli episodi senza crisi (ambra, simile a g0 e g7) | **corretto**. Righe, mini-grafici e fasce `gnone` sono in `--ink-3`: #626262 in chiaro, #8a8a8a in scuro. Sul colore pieno il ΔE minimo da una crisi è 21,9 in chiaro e 28,9 in scuro; l'ambra di prima stava a 6,6 e 11,8. Le fasce sono composte sullo sfondo con l'opacità vera. La fascia grigia sta a ΔE 7,1 dalla crisi più vicina in chiaro e a 12,4 in scuro. È più di quanto distino le due crisi più vicine tra loro (4,6 e 8,0) e più dell'ambra di prima (2,6 e 5,2). Ci sono 58 righe grigie e ognuna ha la fascia dello stesso colore. Una riga è grigia solo se la sua crisi non è nello scatter. La legenda spiega il grigio. | `ui_ricontrollo.cjs` §3, `shots/grafico-SPX-{20,25}-MAX-1440-*.png` |
| NG2 / UT4: riquadro con il Nasdaq-100, titolo stretto | **corretto**. Il riquadro mostra «Realizzata S&P 500, 21 sedute» e «Premio per la paura (S&P 500)». Il valore coincide in 90 sedute su 90 con la realizzata dell'S&P 500, che ho ricalcolato nello script dalle chiusure. A 390 e 360 il titolo stretto è «VIX E REALIZZATA S&P 500 (21 SEDUTE)» e sta dentro il grafico. | `browser_numeri_grafici.cjs`, `ui_ricontrollo.cjs` §2 e §4, `shots/tel-grafico-*.png` |
| NG3 / UT1: tabella tagliata a 1280 e 1024 | **corretto**. La tabella sta intera a 1440, 1410, 1366, 1280, 1100 e 1024 px, chiaro e scuro, 2 indici × 5 soglie (120 misure). Esempi: 1220/1220 a 1280 e 964/964 a 1024, come nella 1.6.2. «Calo dopo» resta visibile. | `ui_log.txt`, `shots/episodi-SPX-{20,40}-{1440,1366,1280,1024}-*.png` |
| UT2: telefono senza massimo, fine e sedute | **corretto**. A 390 e 360, chiaro e scuro, il riassunto «massimo X il … · fino al … / in corso · N sedute» è visibile sotto la crisi in tutte le righe. È a 11 px, dentro la cella, con un contrasto di almeno 4,5:1. Il testo coincide con il ricalcolo in 162 righe su 162. La prima colonna ferma ora è larga 79 px invece di circa 170. Senza scorrere si vede il 100% del mini-grafico a 390 (prima il 72%) e il 69% a 360 (prima il 40%). | `ui_ricontrollo.cjs` §2, `shots/tel-episodi-*.png` |
| UT3: episodio in corso | **corretto**. Nel riquadro: «Nell'episodio a 20 o più iniziato il 02/11/2026, ancora in corso», con il VIX «25,64 provv.». Nella tabella: «06/11/2026* provv.». Nel title del mini-grafico: «episodio in corso, ultimo giorno a 20 o più finora il 06/11/2026 (provvisorio)». Sul telefono: «in corso». Gli episodi in corso sono solo quelli a 20 e 25, nella prima riga. | `browser_numeri_grafici.cjs`, `ui_log.txt` |
| NG7 / UT7a: mini-grafico deformato | **corretto**. `preserveAspectRatio="none"` è tolto. Il mini-grafico disegnato misura 150×38 sopra 1400 px, 110×27,9 fino a 1024 e 92×23,3 sul telefono, sempre nel rapporto del viewBox (scarto < 0,05). | `ui_ricontrollo.cjs` §1–2 |
| NG8: «provv.» mancante | **corretto** (vedi UT3). Il 06/11/2026 provvisorio (25,64) coincide con il file di Cboe (`VIX_History.csv`) e con Yahoo ^VIX. | download di oggi |
| NG4: fasce scure in tema scuro | **corretto**. L'opacità in scuro è .34, in chiaro resta .28 (misurato). In scuro la fascia di crisi meno visibile sullo sfondo ha ΔE 18,7. | `ui_ricontrollo.cjs` §3 |
| NG5 / UT5: riquadro con la crisi del primo giorno | **corretto togliendo il nome**: ora il riquadro dice solo «iniziato il …, finito il …». | |
| UT6: nessuna legenda visibile del mini-grafico | **corretto**. La riga `.vxsplegend` è visibile a tutte le larghezze e corrisponde al disegno (tratteggio, punto pieno, cerchio, tacca, asterisco). | §1 |
| UT8: nota di versione | **corretto**. La nota dice «“VIX massimo” con la data, l'ultimo giorno alla soglia o più». | `js/version.js` |
| UT9: aria-label | **corretto**. | `index.html` |
| UT10: «VIX massimo» | **corretto**. L'intestazione è «VIX massimo» in 140 tabelle su 140. | §1 |
| UT11: «a X o più» | **corretto nella guida** (#vix, due frasi). Restano due frasi in `index.html`, vedi #3 sotto. | |
| NG6: bordo sinistro a 3A/10A | non toccato, non dichiarato corretto. Oggi nessun episodio attraversa il bordo (controllato dallo script). | |

## Rilievi rimasti

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore | Riassunto sul telefono (`.vxmob`) | «1 sedute» negli episodi di una seduta: 4 righe a 20, 2 a 30 e a 40, 1 a 25 e a 50, per indice. Correzione: «1 seduta». | 360 px, soglia 20 | `shots/tel-episodi-SPX-20-360-scuro.png` |
| 2 | minore | Nota sotto la tabella delle soglie (`index.html`) e guida #vix | Dicono che la data del massimo è «nella colonna visibile sul computer». Ora si vede anche sul telefono, sotto il nome della crisi. La guida dice «Sul telefono alcune colonne sono nascoste» ma non nomina il riassunto. | — | `index.html` riga 447, `guida.html` righe 384 e 390 |
| 3 | minore (già prima) | `index.html` | «Dopo un VIX sopra 25 o 30» (riga 476) e l'intestazione «VIX chiude a (o sopra)» (`js/vix-view.js` riga 126): la regola è «a X o più». La guida è corretta, la vista no. | — | — |
| 4 | minore | Righe grigie, mini-grafico | Nelle 58 righe senza crisi i tratti a X o più hanno lo stesso colore della linea (`--ink-3`). Si distinguono solo per lo spessore (1,8 contro 1 px). La legenda dice «colorati i tratti alla soglia o più». A 110 px (1366-1024) la differenza si vede appena. | 1280, soglia 20, righe «—» | `shots/episodi-SPX-20-1280-chiaro.png` |
| 5 | minore | Legenda del grafico in fondo e guida | La legenda dice ancora «realizzata delle ultime 21 sedute», senza S&P 500 (titolo del pannello e riquadro invece lo dicono). La guida (riga 394) dice «nel colore della loro crisi» e non dice del grigio, né che il colore è quello della crisi del primo giorno. | Nasdaq-100, grafico in fondo | `ui_log.txt` (legenda) |
| 6 | minore (latente) | «VIX massimo» e riassunto per il telefono | Se il massimo cadesse nella seduta provvisoria, accanto alla sua data non comparirebbe «provv.». Oggi non succede: i massimi degli episodi in corso sono del 05/11/2026, già su FRED. | — | dal codice |
| 7 | minore (già prima) | Tablet 820 px | La tabella degli episodi scorre nel suo riquadro: 896-948 px in 760. Succedeva già nella 1.6.2 (944-951) e succede anche alla tabella delle soglie (878 in 760). Non peggiora. | 820 px | `ui_log.txt` |
| 8 | minore | README, nota 1.7.0 | Non dice che la colonna «VIX massimo dell'episodio» ora si chiama «VIX massimo». Lo dice `js/version.js`. | — | `README.md` riga 170 |

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), da correggere, minore.

## Cosa ho verificato e passa

- **Ricalcolo indipendente** (`../numeri-grafici/ricalcolo.py`, rilanciato con FRED e Yahoo scaricati oggi):
  - FRED+Yahoo e il file coincidono per S&P 500 e Nasdaq-100 a tutte le soglie (24/23/21/10/3 episodi);
  - l'unica differenza è la seduta provvisoria del 06/11/2026, attesa e ora dichiarata;
  - il VIX del file è uguale a FRED in tutte le date comuni (0 differenze);
  - i calendari sono uguali (9281 sedute).
- **Pagina contro ricalcolo** (`browser_numeri_grafici.cjs`, adattato): **5089 controlli, 0 FAIL**, console senza errori. Ha controllato 162 righe, 33 300 vertici dei mini-grafici, 11 612 vertici colorati, 244 fasce, 125 480 vertici del prezzo, 135 etichette, 90 riquadri e 90 realizzate.
  - Ho cambiato solo le attese toccate dalle correzioni. In più controlla il riassunto per il telefono, la classe `gnone` di righe e fasce (prima una fascia senza classe passava sempre), il rapporto del mini-grafico disegnato e il valore della realizzata dell'S&P 500.
  - Sulla 8796e55 lo stesso script dà **566 FAIL** (`browser_log_su_8796e55.txt`).
- **Impaginazione, telefono, colori, riquadro** (`ui_ricontrollo.cjs`): **574 controlli, 0 FAIL**.
  - Larghezze: 1440, 1410, 1366, 1280, 1100, 1024 e 820 px; telefono a 390 e 360 con il tocco; chiaro e scuro.
  - Non c'è mai scorrimento orizzontale della pagina e la console è senza errori.
  - Sulla 8796e55 fallisce: «Massimo», legenda assente, tabella tagliata, riassunto assente (`ui_log_su_8796e55.txt`).
- **Regressioni**:
  - v150: 108 OK, 0 FAIL;
  - v161: 76 OK, 0 FAIL;
  - v162: 56 OK, 0 FAIL;
  - v170: 88 OK, 0 FAIL;
  - `npm test`: 144/144.

## Cosa non ho potuto verificare e perché

- Telefono vero e lettori di schermo: solo emulazione Chromium con il tocco e lettura degli `aria-label`.
- Contrasto delle fasce: valutato con il ΔE dei colori composti e a occhio sugli screenshot, non con uno strumento WCAG (le fasce non sono testo).
- Bordo sinistro a 3A/10A (NG6): non riproducibile con i dati di oggi.

## Script e screenshot

In `ricerca/qa/1.7.0/ricontrollo/`:

- `browser_numeri_grafici.cjs`, con `browser_log.txt`, `browser_esito.json` e `browser_log_su_8796e55.txt`;
- `ui_ricontrollo.cjs`, con `ui_log.txt`, `ui_esito.json` e `ui_log_su_8796e55.txt`;
- `regressioni/*.out`;
- `shots/`. Nota: i file `tel-grafico-NDX-20-*` mostrano in realtà la soglia 40, l'ultima scelta.

Comandi:

- ricalcolo: `python3 -I ricerca/qa/1.7.0/numeri-grafici/ricalcolo.py fred.csv yahoo_gspc.json yahoo_ndx.json data/vix.json ric.json`;
- confronto con la pagina: `BASE=http://127.0.0.1:8809/ RIC=ric.json OUT=. NODE_PATH=$(npm root -g) node browser_numeri_grafici.cjs`;
- impaginazione e colori: `BASE=http://127.0.0.1:8809/ OUT=. NODE_PATH=$(npm root -g) node ui_ricontrollo.cjs`.
