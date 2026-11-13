# Controllo numeri e dati · versione 1.5.0 · commit a801454

Verdetto: **NO-GO**, ma solo per il punto 1. Riguarda un'etichetta e una frase («robusto», «solo la soglia 40»), non un calcolo. Tutti i numeri che la pagina mostra coincidono con il mio ricalcolo indipendente fatto sui dati grezzi. Basta correggere il testo, oppure rifare la verifica del Nasdaq-100 con l'ingresso alla seduta dopo. Il punto 1 tocca una regola, quindi va deciso con l'utente.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Pillola «robusto» e il suo tooltip; «Come leggere» («solo la soglia 40 ha dato un risultato robusto»); README riga 98 («Solo la soglia 40 ha superato il criterio deciso prima») | **S&P 500**: l'affermazione regge. Con l'ingresso alla seduta dopo passa solo la soglia 40 (8/10, mediana +21,8 contro +11,9 della base, Δ +9,9; tutti e 3 i sottoperiodi sono sopra la base). Passa anche con la quiete a 21 e a 126 sedute. La soglia 20 cade (Δ +4,5). **Nasdaq-100**: il criterio scritto nel tooltip (almeno 8 episodi, chiaramente meglio della base, in 2 periodi su 3) è soddisfatto **anche da 20 e da 30**, con i numeri mostrati in tabella. Soglia 30: 15/20, mediana +28,7 contro +18,6, Δ +10,1, 3 sottoperiodi su 3. Soglia 20: 22/23, +23,8, Δ +5,2. Con l'ingresso alla seduta dopo, la soglia 30 del Nasdaq-100 passa anche con la quiete a 21 sedute (Δ +7,1) e a 126 (Δ +12,0). Supera quindi le stesse varianti della 40. La ricerca la chiamava «fragile» solo perché cadeva con la quiete a 21 sedute e l'ingresso nello stesso giorno (Δ +4,7, che rifaccio identico). La sensibilità «ingresso il giorno dopo» in `regimi.md` è stata fatta solo sull'S&P 500. Il README è sbagliato anche sulla ricerca stessa: nella variante principale la soglia 20 dell'S&P 500 aveva superato il criterio ed era stata scartata come «fragile». | `python3 -I ricalcolo.py RAW data/vix.json OUT.json`, chiave `robusto.NDX.ingresso_dopo` / `quiete_21` / `quiete_126` / `quiete_21_stesso_giorno` | `shots/desk-light-NDX.png` (riga 30: 15/20 +28,7% contro 84% +18,6% della base, senza la pillola) |
| 2 | minore | Tabella degli episodi del Nasdaq-100, soglia 30, riga 06/08/1990, colonna 3 mesi | L'app mostra −10,9%. Con le chiusure di Yahoo a precisione piena viene −10,952%, cioè −11,0%. Nel 1990-1993 Yahoo quota il ^NDX in ottavi (204,625). `data/vix.json` lo salva al centesimo (`ps` 100), quindi 12 chiusure differiscono di 0,005. È l'unica cella che cambia, e solo nell'ultima cifra. | `ricalcolo.py`: `controlli.NDX_vs_yahoo.esempi`; confronto di `tabella.NDX` contro `tabella_json.NDX` | `confronto.txt` (unico KO, uguale su computer e telefono) |
| 3 | minore | Grafico VIX contro realizzata (MAX) e riquadro dei valori, inizio 1990 | Il percentile del premio si calcola fin dal primo valore, senza una storia minima. Il 16/02/1990 il riquadro dice «15°» su circa 11 valori, e anche le fasce rosse dei primi mesi del 1990 poggiano su pochi dati. Il calcolo è giusto e senza dati futuri, ma il numero è poco significativo. Proposta: «—» finché la storia ha meno di 252 valori, da decidere con l'utente. | `bordo.mjs` (MAX, bordo sinistro sul telefono) | output di `bordo.mjs`: «16/02/1990 … Percentile del premio 15°» |
| 4 | minore | «Come leggere», guida, README: «12 volte su 204» | Il numero si rifà: 12 su 204, sia con la definizione della ricerca (premio sopra l'80° percentile interpolato) sia con quella delle fasce rosse dell'app (percentile di rango ≥ 80). Però 204 non sono sedute: sono gli **inizi** del segnale dal 2005 che hanno 21 sedute dopo (207 in tutto con i dati di oggi, 206 nella ricerca). Le sedute rosse dal 2005 sono il 16,9%, circa 930. Il testo dell'app non dice «dal 2005» per questo numero e non dice cos'è un «picco»: la realizzata a 21 sedute sopra il suo 90° percentile, dopo almeno 63 sedute sotto. Chi legge può pensare a 204 sedute rosse. | `ricalcolo.py`: `testi.inizi`, `valutabili`, `seguiti`, `sedute_rosse_app_pct` | — |
| 5 | minore | Episodi della soglia 25, riga 05/11/2026 (tutti e due gli indici), colonna «calo dopo» | La cella mostra «—*». Il «—» è giusto, perché la seduta d'ingresso (06/11) non c'è ancora. L'asterisco però ha il tooltip «calo fino a oggi», che qui non esiste. | Clic sulla riga 25 | `dom.json` → `tables.SPX.eps.25.rows[0]` |
| 6 | minore | Riquadro «Volatilità realizzata», solo se il VIX resta indietro di una seduta rispetto all'indice | Ho simulato un VIX fermo al 04/11 con l'S&P 500 al 05/11. Il riquadro mostra la realizzata del 04/11 (12,6), allineata al VIX, mentre la riga sotto dice «S&P 500 al 05/11/2026». La realizzata non ha una data sua. Il numero è coerente, ma la data può confondere. | `provvisorio.mjs` caso B | `shots/simulazione-B.png` |

## Cosa ho verificato e passa

Il ricalcolo è indipendente: non importa né `js/vix.js` né gli script di `ricerca/vix/`. Usa Python sui file grezzi scaricati oggi:
- FRED VIXCLS;
- il file ufficiale di Cboe `VIX_History.csv`;
- Yahoo chart v8 per ^GSPC, ^NDX e ^VIX, escludendo la barra aperta del 06/11.

I numeri dell'app li ho letti nel DOM con Playwright, su computer (1440 px) e su telefono (390 px). La copia servita coincide con il commit: sha1 uguale per `data/vix.json`, `js/vix.js`, `js/vix-view.js` e `index.html`.

- **Dati (`data/vix.json` contro le fonti)**:
  - S&P 500: 9.280 sedute, stesse date di Yahoo, 0 chiusure diverse.
  - Nasdaq-100: 9.280 sedute, stesse date; solo le 12 differenze di arrotondamento del punto 2.
  - VIX: 9.277 valori, uguali a FRED in tutte le 9.277 sedute dell'S&P 500. 0 differenze anche con Cboe, che non ha soltanto il 31/12/1999 (FRED e Yahoo lo danno entrambi a 24,64).
  - Giorni di borsa chiusa: i 34 giorni in cui FRED pubblica il VIX senza seduta (2004-06-11 e 33 festività dal 2022) sono scartati, come dichiarato.
  - Sedute senza VIX: le 3 sedute senza VIX su FRED (01/03/1991, 31/01/1997, 26/11/1997) restano vuote, senza riempimento.
  - Ultima seduta: `fred` = `asOf.vix` = 05/11/2026 (28,18, uguale su FRED, Cboe e Yahoo), quindi oggi non c'è niente di provvisorio. Yahoo ^VIX contro FRED: 12 date diverse di oltre 0,01 su 9.279. Tra queste il 06/02/2026, 20,37 contro 17,76: è il motivo per cui Yahoo è giustamente solo la coda.
- **Riquadri** (2 viste × 6 controlli): VIX 28,18, «paura · al 05/11/2026»; percentile 89° (89,49); realizzata 19,7; premio +8,5 all'88° percentile (88,18); riga delle date.
- **Tabella dei regimi**: ogni cella della riga base e delle 5 soglie, per S&P 500 e Nasdaq-100, su computer e telefono (24 righe).
- **Episodi**: tutti gli episodi di tutte e 5 le soglie, per tutti e due gli indici e tutte e due le viste (10 tabelle per vista, 81 episodi per indice, 162 per vista). Coincidono data, VIX, VIX massimo, i 4 rendimenti, il calo e l'asterisco dei parziali. Fa eccezione la sola cella del punto 2.
- **Scatter**: la didascalia per tutti e due gli indici. Per l'S&P 500: 734 sedute, 644 positive (88%), 20 episodi, 14 positivi su 20, 42%, sopra 50 75 sedute da 3 episodi, 2 sedute aperte. Per il Nasdaq-100: 656 positive (89%), 15 su 20. Ho controllato anche il rendimento nel riquadro dei valori di 5 punti per indice.
- **Riquadro del grafico**: 33 date per vista (3A, 10A e MAX, 11 posizioni ciascuno), più i bordi destro e sinistro in tutti i periodi. Per ognuna coincidono S&P 500, VIX, realizzata, premio e percentile del premio. L'ultima seduta (05/11/2026) coincide con i riquadri.
- Totale `confronta.py`: **400 controlli su 402 passano**. I 2 che non passano sono la stessa cella del punto 2, vista su computer e su telefono. Contro i dati del json passano **402 su 402**, quindi le formule dell'app coincidono con le mie.
- **Nessun dato futuro**:
  - Ho dato all'app `vix.json` tagliato a 5 date passate (20/09/2001, 24/10/2008, 08/08/2011, 16/03/2020, 08/04/2025). I riquadri coincidono con i valori di quelle date calcolati sulla storia completa: 5 su 5. Percentili e premio usano quindi solo il passato.
  - Episodi e scatter partono dalla chiusura della seduta dopo il segnale, verificato cella per cella. La base usa lo stesso ingresso.
  - Il caso provvisorio, simulato con `fred` al 04/11, mostra «Yahoo, provvisorio» nel riquadro, nella riga delle date e nel riquadro del grafico.
  - Il caso del VIX mancante mostra «—» nel riquadro del grafico.
- **Statistiche dei testi**:
  - «83%»: 82,94% delle 5.475 sedute dal 03/01/2005 al 07/10/2026.
  - «3,4 punti»: media VIX − realizzata dei 21 giorni dopo = 3,41.
  - «12 su 204»: 12 inizi seguiti da un picco su 204 valutabili, con le due definizioni di percentile; vedi il punto 4 per la formulazione.
- **«Robusto»** per l'S&P 500: regge con i dati di oggi e con l'ingresso alla seduta dopo, sia nella variante principale sia con la quiete a 21 e a 126 sedute. Rifaccio anche i numeri della ricerca con l'ingresso nello stesso giorno: soglia 40 Δ +11,0, soglia 30 sottoperiodi −11,2/+4,0/+7,1, soglia 20 con l'ingresso alla seduta dopo Δ +4,5. Per il Nasdaq-100 vedi il punto 1.
- Nessun errore JavaScript nella console in nessuna delle due viste.

## Cosa non ho potuto verificare e perché

- **Il caso provvisorio con dati veri.** Oggi FRED aveva già pubblicato il 05/11, quindi l'ho solo simulato. Non ho rieseguito `scripts/fetch_vix.js` (scriverebbe `data/vix.json`); ne ho letto la logica di `splice` e `pickSeries`, che usa FRED fino al suo ultimo valore e poi Yahoo solo per le date successive.
- **Temi chiaro e scuro.** Il contesto Playwright chiede `prefers-color-scheme`, ma l'app usa il tema scelto dall'utente, quindi tutti gli screenshot sono nel tema predefinito (scuro). Per i numeri il tema non conta.
- **Il valore «vero» del Nasdaq-100 nel 1990** (ottavi o centesimi), per il punto 2: non c'è una seconda fonte gratuita per quegli anni.

## Script e screenshot

In `/home/user/rrg/ricerca/qa/1.5.0/numeri/`:
- `ricalcolo.py`: ricalcolo indipendente. Uso: `python3 -I ricalcolo.py <cartella dati grezzi> /home/user/rrg/data/vix.json <out.json>`. I dati grezzi sono stati scaricati da FRED, Cboe e Yahoo con gli URL scritti in testa al file.
- `dom.mjs`: lettura del DOM su computer e telefono, scrive `dom.json` e gli screenshot.
- `confronta.py`: confronto cella per cella. L'output è in `confronto.txt`.
- `bordo.mjs`: riquadro del grafico ai bordi.
- `troncato.mjs`: prova dei dati futuri con il file tagliato.
- `provvisorio.mjs`: simulazioni con FRED in ritardo e con il VIX mancante.
- `dom.json`: i numeri letti nel browser.
- `shots/`: `desk-light-SPX.png`, `desk-light-NDX.png`, `phone-dark-SPX.png`, `phone-dark-NDX.png`, `simulazione-A.png`, `simulazione-B.png`.
