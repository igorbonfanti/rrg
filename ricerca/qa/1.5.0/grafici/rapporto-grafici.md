# Controllo grafici · versione 1.5.0 · commit a801454

Verdetto: **GO**. Non ci sono errori bloccanti: ogni punto, linea, banda e riquadro dei valori coincide con un ricalcolo indipendente in Python. Prima di pubblicare conviene correggere i punti 1-5.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `#vxChart`, bande del premio (tema scuro) e legenda | Nel tema scuro le bande con il premio ≥ 80° percentile quasi non si vedono: sono `--down` con `fill-opacity .12` su nero, cioè rgb(29,8,8), con contrasto 1,09:1 contro lo sfondo. Il quadratino della legenda (`.kb.vxk-high`, `opacity .45`) è molto più acceso: contrasto 1,85:1 e ΔE 37 rispetto alla banda vera. Quindi la legenda non corrisponde a ciò che si vede. Nel tema chiaro il contrasto è 1,21:1 e la banda si vede appena, mentre il quadratino ha contrasto 2,17:1. | Vista 8 VIX, tema scuro, 10A o MAX: guardare il pannello del premio | `shots/zoom-scuro-premio-2020.png`, `shots/1440-scuro-chart-10A.png`, `output-colori.txt` |
| 2 | da correggere | `#vxChart`, asse del premio | Le etichette sono fisse a −10, 0, +10 e +20 (`for (const v of [-10, 0, 10, 20])`), ma la scala arriva a −26,4 (3A) e a −52,3 (10A e MAX). Sotto −10 non ci sono etichette: nel 10A è il 57% dell'altezza del pannello. A 360-390 px il problema è lo stesso. | 10A o MAX: il crollo del 2020 arriva in fondo al pannello senza una scala da leggere | `output-grafici.txt` (30 FAIL «etichette del premio coprono la scala»), `shots/1440-scuro-chart-MAX.png`, `shots/390-scuro-chart-3A.png` |
| 3 | da correggere | `#vxScatter`, anello del punto scelto | L'anello `.vxring` è disegnato sopra il rettangolo che riceve il puntatore e ha `pointer-events: auto`. Quando il puntatore passa sul bordo dell'anello (5,5-6,5 px dal punto), `pointerleave` nasconde il riquadro. Poi il movimento successivo lo riapre: il riquadro lampeggia. Basta `pointer-events: none` sull'anello. | Computer: avvicinarsi lentamente a un punto isolato (per esempio VIX 82,69) | `output-extra.txt`: «0:visibile … 5.5:nascosto 6:nascosto 6.5:nascosto 7:visibile» |
| 4 | da correggere | `#vxTable` nel layout a due colonne (da 1700 px in su) | La tabella dei regimi è larga 837 px ma la colonna ne offre 813. L'ultima colonna, «minimo dopo / sedute», resta tagliata dietro lo scorrimento orizzontale anche a 1920 px. Tra 1024 e 1600 px la tabella entra intera. | 1700 px: la colonna a destra mostra «MINIMO DO…» | `output-tabscroll.txt`, `shots/1700-scuro-vista.png` |
| 5 | da correggere | `#vxScatter`, colori degli episodi (CVD) | I colori si alternano per episodio, ma c2 (verde) e c3 (rosso) sono consecutivi. Con la deuteranopia simulata la differenza è ΔE 8 nel tema scuro e 16 nel chiaro: non si distinguono. La coppia comprende 2008 (186 punti) e 2009, e soprattutto 2018-12 e 2020 Covid. Sopra VIX 50 restano solo il 2008 (verde) e il 2020 (rosso), e per un utente deuteranope sembrano un solo episodio. Il pulsante CVD della barra non cambia questi colori: con `.cvd` sono identici. | Simulazione con le matrici di Machado, oppure attivare CVD e confrontare i colori | `output-colori.txt`, `output-extra.txt` (INFO «con .cvd») |
| 6 | minore | `#vxChart`, asse del pannello VIX e realizzata | Le righe e le etichette sono a 20, 30, 40, 50, 60 e 80: manca il 70, quindi la distanza tra le righe cambia. Mancano anche 0 e 10, anche se nel 3A i valori stanno quasi tutti tra 8 e 20 e quella fascia resta senza riferimento. | 3A: la realizzata scende sotto 10 senza etichetta | `shots/390-scuro-chart-3A.png`, `shots/1440-scuro-chart-MAX.png` |
| 7 | minore | `#vxScatter`, chiaro | Il colore c0 (#b86e00 con opacità .75) ha contrasto 2,73:1 su bianco, sotto il 3:1 consigliato per gli elementi grafici. Gli altri colori vanno da 3,26 a 4,19:1. | Tema chiaro | `output-colori.txt` |
| 8 | minore | `#vxEps`, soglia 25 | L'episodio che inizia il 05/11/2026, cioè l'ultima seduta, non ha ancora un ingresso. La cella mostra «—*» e l'asterisco dice «calo fino a oggi», ma un calo non c'è. Basterebbe l'asterisco solo quando `dd != null`. | Clic sulla riga 25 (S&P 500 o Nasdaq-100) | `output-extra.txt` (2 FAIL) |
| 9 | minore | `#vxEps`, Nasdaq-100, soglia 30, 15/09/2008, colonna 12 mesi | Il valore è −0,02%: la cella mostra «0,0%» in rosso (classe `down`) e il caso è contato tra i non positivi (15/20). Il conteggio è corretto, ma lo «0,0%» rosso confonde. | Nasdaq-100 → riga 30 | `output-extra.txt` |
| 10 | minore | `#vxScatter`, angolo in basso a destra | Il titolo dell'asse «VIX alla chiusura» è a 1 px sotto le etichette 80/90 (da 70 a 90 sul telefono). I riquadri del testo si toccano, ma le lettere non si sovrappongono (verificato con lo zoom ×3). Lo spazio è stretto, il testo resta leggibile. | — | `shots/zoom-scuro-scatter-angolo.png`, `output-grafici.txt` (20 FAIL sui riquadri del testo) |
| 11 | minore | Layout a 1700 px | La colonna dello scatter finisce circa 200 px prima di quella della tabella e lascia un vuoto. La riga sotto il titolo dello scatter va a capo con «dopo» da solo. | 1700 px | `shots/1700-scuro-vista.png` |
| 12 | minore (testo) | Didascalie dello scatter | Il testo dice «VIX sopra 30», ma il criterio è VIX ≥ 30. Due sedute hanno il VIX esattamente a 30,00 e sono disegnate. Allo stesso modo «Sopra 50» conta il VIX ≥ 50 (nessun caso uguale a 50). | — | ricalcolo in `script/riferimento.py` |

## Cosa ho verificato e passa (683 controlli automatici superati, più l'esame degli screenshot)

Il riferimento è `script/riferimento.py`. Decodifica `data/vix.json` in Python, senza codice dell'app, e ricalcola punti, episodi, realizzata a 21 sedute, premio, percentile calcolato solo sulla storia passata e tabelle. Il disegno l'ho letto dal DOM e riportato in valori usando le etichette degli assi, non le formule dell'app.

- **Scatter**: 10 configurazioni (1440, 1280 e 1700 px, 390 e 360 px con tocco, chiaro e scuro), per S&P 500 e Nasdaq-100 (100 controlli):
  - 734 punti per indice, uguali al riferimento. Ascissa = VIX e ordinata = rendimento a 252 sedute dalla chiusura della seduta dopo, entro mezza cifra di arrotondamento delle coordinate.
  - I punti grandi coincidono con i primi giorni degli episodi (0 errori).
  - Un colore per episodio: 20 episodi con punti, nessun episodio misto, nessun episodio con lo stesso colore del precedente.
  - Linee a 40, 50 e 0 al posto giusto. Gli assi coprono tutti i dati (Nasdaq-100 fino a +126%, minimo −58,9%).
  - Nessun punto tagliato: i 17-54 punti che sporgono dal riquadro sono quelli con il VIX a 30,0x, sul bordo sinistro, e restano interi.
- **Riquadro dello scatter**: 18 controlli, sul VIX massimo, sul rendimento peggiore e su un primo giorno di episodio, col mouse e col tocco. Data, VIX, rendimento ed episodio sono esatti e la nota «Primo giorno» compare dove deve.
- **Didascalia dello scatter**: tutti i numeri ricalcolati coincidono: 734 sedute, 644 (88%) / 656 (89%) positive, 20 episodi, 14 su 20 e 15 su 20 positivi, 42% dei punti dalle due crisi più lunghe, 75 sedute sopra 50 da 3 episodi, 2 sedute senza 12 mesi.
- **Grafico VIX e realizzata**: 10 configurazioni × 3 periodi (≈330 controlli):
  - Bordi del periodo esatti per 3A, 10A e MAX.
  - Vertici di VIX, realizzata e premio uguali in numero (per esempio 9277, 9259 e 9256 nel MAX), con i buchi dove manca il VIX: 4 tratti.
  - Valore entro l'arrotondamento e data entro 0,5 giorni.
  - Il pannello 1 parte da 0. Le linee restano dentro i pannelli e lo zero del premio è esatto.
  - Bande ≥ 80° percentile: 37, 118 e 375, uguali per numero e posizione (0 fuori posto) e tutte dentro il pannello.
  - Nessuna etichetta degli anni sovrapposta o tagliata.
- **Riquadro dei valori del grafico**: 75 controlli in 5 posizioni × 3 periodi × 5 configurazioni. Data, S&P 500, VIX, realizzata, premio e percentile sono esatti. Il bordo destro raggiunge l'ultima seduta. Con FRED fermo al 03/11 (simulato) compare «Yahoo, provvisorio» nel riquadro, nella casella e nella riga delle date (3 controlli). Il riquadro mostra la seduta che precede il cursore e non la più vicina: la differenza è sotto 1 px, e la linea verticale segue la seduta mostrata.
- **Riquadri sul telefono**: con tocchi ai 4 bordi e al centro (20 controlli) restano sempre dentro lo schermo.
- **Legenda**: i colori di VIX, realizzata e premio sono uguali a quelli delle linee in tutte e 10 le configurazioni. La banda è il punto 1.
- **Tabelle**: 46 controlli.
  - Riga base e tutte le 5 soglie per S&P 500 e Nasdaq-100 (positivi/n e mediana a 1, 3, 6 e 12 mesi, calo dopo, minimo dopo) uguali al ricalcolo.
  - Tutti gli episodi di ogni soglia (date, VIX, VIX max, rendimenti, calo) uguali, salvo i punti 8 e 9.
  - Colore delle celle su, giù e «in corso» corretto. La riga selezionata segue il clic.
- **Altro**: nessuno scorrimento orizzontale della pagina in nessuna configurazione e nessun errore in console. Contrasto delle linee: VIX 10,3/6,3:1, realizzata 8,8/6,0:1, etichette 6,1:1. VIX e realizzata restano ben distinte anche con daltonismo simulato (ΔE ≥ 80).

## Cosa non ho potuto verificare e perché

- I prezzi e il VIX di `data/vix.json` non li ho confrontati con una fonte esterna (FRED, Cboe, Yahoo): ho controllato il disegno contro il file, non il file contro il mercato. Per esempio la seduta del 05/11/2026, con il VIX a 28,18 e l'S&P 500 da 7569 a 7354 in due sedute, non l'ho controllata fuori dal file.
- Dispositivi touch reali e Safari: solo Chromium di Playwright con emulazione `isMobile`/`hasTouch`.
- Daltonismo: solo simulato numericamente (Machado 2009), senza filtro sull'immagine e senza utenti reali.
- La stampa della vista non l'ho controllata.

## Script e screenshot

- Ricalcolo: `ricerca/qa/1.5.0/grafici/script/riferimento.py` (`python3 -I riferimento.py data/vix.json <out.json>`).
- Controlli nel browser:
  - `script/grafici.cjs` (posizioni, assi, bande, riquadri; 10 configurazioni) → `output-grafici.txt`. I 5 FAIL «1700-chiaro 3A tip» sono un difetto dello script, perché il grafico era fuori dallo schermo: ripetuti in `extra.cjs`, passano.
  - `script/extra.cjs` (tabelle, didascalia, anello, riquadri sul telefono, zoom, CVD) → `output-extra.txt`.
  - `script/provvisorio.cjs` → `output-provvisorio.txt`.
  - `script/tabscroll.cjs` → `output-tabscroll.txt`.
- Colori: `script/colori.py` → `output-colori.txt`. Gli stili misurati sono in `stili-*.json`.
- Comando: `BASE=http://127.0.0.1:8798/ REF=<ref.json> OUT=$PWD/shots NODE_PATH=$(npm root -g) node script/grafici.cjs`.
- Screenshot: `ricerca/qa/1.5.0/grafici/shots/` (73 file): vista intera, scatter S&P 500 e Nasdaq-100, grafico 3A, 10A e MAX per 1440, 1280 e 1700 px e per 390 e 360 px con tocco, chiaro e scuro; riquadri sul telefono; zoom ×3; riquadro provvisorio.
