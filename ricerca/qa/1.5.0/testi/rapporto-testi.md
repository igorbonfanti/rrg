# Controllo testi · versione 1.5.0 · commit a801454

Verdetto: **NO-GO**. C'è un rilievo bloccante (n. 1): l'app e il README dicono che solo la soglia 40 supera il criterio deciso prima. Per il Nasdaq-100, con la regola che l'app usa davvero, lo superano anche 20 e 30. Gli altri rilievi sono testi da correggere o minori. Nessun numero calcolato dall'app è risultato sbagliato.

Copia controllata: `http://127.0.0.1:8798/` (versione 1.5.0), dati `data/vix.json` al 05/11/2026 (FRED al 05/11/2026).

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | bloccante | `index.html` «Come leggere il VIX» (paragrafo «Dopo i picchi»); tooltip della pillola «robusto» (`js/vix-view.js`, `renderTable`); `guida.html#vix` (primo punto dell'elenco); `README.md` sezione «8 VIX», punto «Regimi» | I testi dicono che **solo la soglia 40** supera il criterio deciso prima (almeno 8 episodi; +5 punti di mediana o +15 di positivi a 12 mesi; stessa direzione in almeno 2 sottoperiodi su 3). Il tooltip lo ripete anche nella tabella del Nasdaq-100. Con la regola dell'app (ingresso alla chiusura della seduta dopo) questo vale per l'S&P 500. Per il **Nasdaq-100 superano il criterio 20, 30 e 40**: 20 → mediana +5,2 sopra la base, 3 sottoperiodi su 3; 30 → +10,1, 3 su 3. Lo stesso succedeva nella variante principale della ricerca (`regimi.md`: Nasdaq-100 20 e 30 «con avvertenza»). Lì il 40 risulta l'unico «robusto» solo perché regge anche con una quiete di 21 e di 126 sedute: questa condizione non è scritta da nessuna parte nell'app. La variante «Nasdaq-100 con ingresso il giorno dopo» non è in `ricerca/vix/regimi/risultati.json`, e `ricerca/vix/verifica_app.mjs` confronta solo l'S&P 500. Quindi i numeri del Nasdaq-100 nella regola dell'app non hanno un confronto con la ricerca nel repository (c'è solo `test/vix.test.js`, che fissa i valori ma non il verdetto). | `node ricerca/qa/1.5.0/testi/controllo_testi.mjs` → `NDX.criterioPassatoDa = ["20","30","40"]`, `SPX.criterioPassatoDa = ["40"]`. In alternativa: `risultati.json` → `main.NDX_VIX.thresholds.{20,30}.verdict = "mostrare con avvertenza"` | `controllo_testi.json`; `shots/ndx50-1440-scuro.png` (pillola solo sul 40) |
| 2 | da correggere | `index.html`, guida rapida (aiuto, riga «Nella barra in alto scrivi…») | Dice ancora «Tasti: **1–8** viste» e nella lista dei comandi manca `VIX` (MON, ROT, BTM, SEC, ALRT, IDX, TIT, EMG, HELP). | Aprire l'app e premere `?` | `shots_testi.json` → `help` |
| 3 | da correggere | `guida.html#comandi`, paragrafo «Indirizzi» | Manca `#vix`: l'elenco è «#mon #rrg #btm #sec #alr #idx #tit #emg». Il README invece lo ha. | `guida.html#comandi` | `shots/guida-comandi-1440.png`, `shots_testi.json` → `guida-1440.indirizzi` |
| 4 | da correggere | `README.md` riga 72 (dettaglio settore, tabella «per confronto») | «…e in sintesi nella **vista 8 Alert**»: Alert ora è la 9. | `grep -n "vista 8 Alert" README.md` | — |
| 5 | da correggere | `README.md` sezione «Licenza»; Fonti in `index.html` e README | La ricerca chiedeva di aggiungere alla sezione Licenza i dati Cboe ripubblicati in `data/vix.json` (`ricerca/vix/inserimento/inserimento.md`, riga 125). Non è stato fatto: la sezione cita solo Yahoo, il CPI e i font. Inoltre «© Cboe, reprinted with permission» è la nota di FRED, cioè il permesso dato a FRED, non a questa app: così scritta sembra un permesso nostro. | `sed -n 353,360p README.md` | — |
| 6 | da correggere | `index.html`, Fonti della vista: «S&P 500 e Nasdaq-100 di solo prezzo (senza dividendi, circa 2 punti l'anno in meno)» | I 2 punti l'anno sono misurati solo sull'S&P 500 (base +14,2 contro +11,9, `regimi.md`, Limiti 5). Per il Nasdaq-100 la versione con dividendi non c'è (`^XNDX` vuoto) e i dividendi sono più bassi. Il README lo dice giusto («sull'S&P 500»), l'app no. | Leggere la nota Fonti | `regimi.md`, Limiti 5 |
| 7 | minore | `index.html` «Come leggere» e guida: «Tra 25 e 30 il ribasso spesso era appena cominciato» | Si può leggere come «VIX compreso tra 25 e 30». I numeri però sono quelli delle righe «≥ 25» e «≥ 30», che comprendono anche i VIX più alti. Il dato è giusto: calo dopo mediano −12,8% e −11,6% (S&P 500), −13,4% e −10,9% (Nasdaq-100), contro −4,8% e −6,9% di una seduta qualsiasi. | Tabella della vista | `controllo_testi.json` → `caloMediano` |
| 8 | minore | `index.html` «Come leggere»: «Sale insieme ai ribassi, non prima» | Il soggetto è ambiguo: la frase prima parla del premio. La ricerca dice che è il **VIX** (l'implicita) a salire con il primo ribasso. | — | `volatilita.md` §2 |
| 9 | minore | «Come leggere», guida, README: «in media di 3,4 punti»; «12 volte su 204» | 3,41 è la media di VIX − realizzata futura su **tutte** le 5.475 sedute, non lo scarto medio nelle sedute in cui il VIX sta sopra. 204 sono le **accensioni** del segnale (inizi), non sedute. Inoltre «picco della volatilità» non è definito da nessuna parte: nella ricerca è la realizzata a 21 sedute sopra il suo 90° percentile dopo 63 sedute sotto. I numeri sono giusti (ricalcolo: 82,94%, 3,414, 12 su 204, anche con il percentile dell'app). | — | `controllo_testi.json` → `volatilita`, `premio` |
| 10 | minore | Didascalia dello scatter (`vxScNote`) | «le due crisi più lunghe da sole fanno 42% dei punti»: sono i due **episodi** con più sedute (15/09/2008: 186 sedute; 09/07/2002: 123), non due crisi. «vengono da 20 episodi» mentre la riga 30 della tabella ne conta 21: il ventunesimo (27/03/2026) non ha ancora 12 mesi, e la nota lo dice solo alla fine, in termini di sedute. | Vista 8, S&P 500 | `shots/vix-1440-scuro.png` |
| 11 | minore | Scatter, a 1440 e 390 px | Il titolo dell'asse «VIX alla chiusura» si sovrappone alle etichette 90 (1440) e 70, 80, 90 (390): i riquadri dei testi si toccano. | `shots_testi.cjs` → `svgOverlap` | `shots/scatter-390.png` |
| 12 | minore | Tabella «Dopo i picchi» a 390 px | La colonna **12 mesi**, quella a cui si riferiscono «robusto» e i testi, resta fuori schermo (tabella 506 px in un riquadro di 330 px): si vede solo scorrendo di lato. | 390 px, vista 8 | `shots/tabella-390.png` |
| 13 | minore | Riquadri (KPI) e pillola «robusto» | Le spiegazioni sono solo nell'attributo `title`, quindi sul telefono non si possono leggere: il significato di «robusto» arriva solo da «Come leggere». | Telefono, tocco sul riquadro | `tips_testi.cjs` → `kpiTitles`, `robTitle` |
| 14 | minore | Tooltip del riquadro «Volatilità realizzata» | Dice «rendimenti giornalieri», mentre il README, `js/vix.js` e la ricerca dicono «rendimenti logaritmici». | — | `tips_testi.cjs` |
| 15 | minore | Riquadro dei valori del grafico VIX contro realizzata | «S&P 500 7745», senza il punto delle migliaia (in italiano: 7.745). | Passare il mouse sul grafico | `shots/chart-tip-1440.png` |
| 16 | minore | Scatter: «sedute con il VIX sopra 30»; tabella: «VIX chiude sopra» | La regola è ≥. Nessun inizio di episodio cade esattamente su una soglia, ma lo scatter contiene 2 sedute con il VIX esattamente a 30,00. | `node -e` (vedi «Cosa ho verificato») | — |
| 17 | minore | `docs/sviluppo.md` | (a) «128 test»: `npm test` ne conta 134. (b) La riga «Rendimenti degli episodi \| indecisa: … seduta dopo il segnale» sta subito sotto la riga VIX, che dice il contrario: va scritto che riguarda le viste 4 e 6. (c) «Approssimazioni dichiarate», «Fonti» e «Avvio in due tempi» non citano VIX e FRED `VIXCLS`. | `npm test` | — |
| 18 | minore | `index.html` | Il commento `<!-- 5 ALERT -->` ora sta prima della sezione `v-vix`. Non si vede nella pagina. Il link a Rea nelle Fonti della vista è `https://quant-rea.com`, nel resto dell'app è `https://quant-rea.com/it/`. | — | — |

## Frasi corrette proposte

1. Prima di cambiare il testo va **deciso con l'utente** cosa vuol dire «robusto» per il Nasdaq-100: è una regola di lettura. Va anche aggiunta alla ricerca la variante `NDX_VIX_nextDay`, e il Nasdaq-100 a `verifica_app.mjs`. Testo proposto, se si tiene «robusto» = supera il criterio in tutte le varianti provate:
   - «Come leggere»: «**Dopo i picchi.** Nella verifica, con un criterio deciso prima (almeno 8 episodi; a 12 mesi mediana almeno 5 punti sopra una seduta qualsiasi, o quota di positivi almeno 15 punti sopra; in almeno 2 periodi su 3), solo la soglia **40** lo supera in tutte le varianti provate (quiete di 21, 63 o 126 sedute, ingresso lo stesso giorno o quello dopo) ed è segnata «robusto». Per il Nasdaq-100 anche 20 e 30 lo superano con le regole della tabella, ma non con una quiete diversa. Con 10 episodi i numeri restano indicativi.»
   - Tooltip della pillola: «Nella verifica è l'unica soglia che supera il criterio deciso prima (almeno 8 episodi, chiaramente meglio della base, in almeno 2 periodi su 3) in tutte le varianti provate. Pochi casi: numeri indicativi.»
   - README, punto «Regimi»: «Per l'S&P 500 solo la soglia 40 supera il criterio deciso prima (…); per il Nasdaq-100 lo superano 20, 30 e 40, ma solo il 40 regge con una quiete di 21 e di 126 sedute. Solo il 40 è segnato «robusto»; 10 episodi, numeri indicativi.»
2. Aiuto: «…oppure MON, ROT, BTM, SEC, ALRT, IDX, TIT, EMG, VIX, HELP; … Tasti: <kbd>1</kbd>–<kbd>9</kbd> viste · …»
3. Guida: «**Indirizzi**: `#mon` `#rrg` `#btm` `#sec` `#alr` `#idx` `#tit` `#emg` `#vix` aprono una vista, …»
4. README riga 72: «… e in sintesi nella vista 9 Alert.»
5. README, Licenza, nuova voce: «il VIX (`data/vix.json`) è © Cboe Global Markets; la serie VIXCLS viene da FRED, Federal Reserve Bank of St. Louis, che la ripubblica con il permesso di Cboe e chiede di citarla come "Chicago Board Options Exchange, CBOE Volatility Index: VIX [VIXCLS], retrieved from FRED";». Nelle Fonti dell'app: «VIX di chiusura © Cboe, serie VIXCLS di FRED (Federal Reserve Bank of St. Louis), dal 02/01/1990; …». Va chiesto all'utente se la ripubblicazione dei valori nel repository pubblico va bene.
6. Fonti della vista: «S&P 500 e Nasdaq-100 di solo prezzo, senza dividendi (sull'S&P 500 circa 2 punti l'anno in meno; per il Nasdaq-100 la versione con i dividendi non è disponibile), da Yahoo Finance.»
7. «Alle soglie 25 e 30 il ribasso spesso era appena cominciato: guarda il «calo dopo».» (anche nella guida)
8. «… è il premio che si paga per assicurarsi. Il VIX sale insieme ai ribassi, non prima: …»
9. «Dal 2005 il VIX è stato sopra la volatilità poi realizzata nei 21 giorni successivi nell'83% delle sedute, e in media 3,4 punti più alto. … un premio alto (oltre l'80° percentile) si è acceso 204 volte ed è stato seguito da un picco della volatilità (realizzata oltre il suo 90° percentile) entro 21 sedute solo 12 volte.» README: «… seguito da un picco entro 21 sedute 12 volte su 204 accensioni».
10. Didascalia: «… ma vengono da 20 episodi con 12 mesi di dati, positivi 14 su 20, e i due episodi più lunghi da soli fanno il 42% dei punti.»
11. Spostare «VIX alla chiusura» più in basso, o aumentare il margine inferiore (B) dello scatter.
12. A 390 px nascondere anche la colonna «3 mesi» (oppure «episodi»), così che resti visibile la colonna «12 mesi».
13. Riportare le spiegazioni di «robusto» e dei riquadri in testo toccabile, con la sottolineatura a puntini come nel resto dell'app.
14. «Deviazione standard dei rendimenti giornalieri logaritmici delle ultime 21 sedute, ×√252.»
15. Indice nel riquadro dei valori con il separatore delle migliaia: 7.745.
16. «… una seduta con il VIX a 30 o più» / intestazione «VIX chiude a o sopra» (oppure «VIX ≥»).
17. `docs/sviluppo.md`: «134 test»; «Rendimenti degli episodi delle viste 4 e 6 | indecisa …»; aggiungere VIX/FRED `VIXCLS` a Fonti, Approssimazioni (ultima seduta da Yahoo provvisoria, VIX alle 16:15 e indice alle 16:00 con ingresso dalla seduta dopo, solo prezzo) e all'avvio («alla prima apertura della vista 8: `vix`»).
18. Commento `<!-- 8 VIX -->` prima di `v-vix` e `<!-- 9 ALERT -->` prima di `v-alr`; link `https://quant-rea.com/it/`.

## Cosa ho verificato e passa (circa 120 controlli)

- **App contro ricerca, S&P 500** (83): `node ricerca/vix/verifica_app.mjs` → «83 confronti, 0 diversi».
- **Criterio ricalcolato da capo** (10: 5 soglie × 2 indici), in `controllo_testi.mjs`. Usa i dati dell'app e il criterio riscritto dalla descrizione in `regimi.md`, senza importare `regimi.mjs`. S&P 500: passa solo il 40, come dicono i testi (vedi n. 1 per il Nasdaq-100). Il 40 ha 10 episodi su entrambi gli indici.
- **«Tra 25 e 30 il ribasso era appena cominciato»** (4): i cali mediani dopo il segnale sono tutti molto più profondi della base, su entrambi gli indici.
- **«dopo ogni crisi del campione è risalito»** (10): per ogni episodio, a ogni soglia e su entrambi gli indici, l'indice ha poi superato il prezzo d'ingresso (`maiRisalito` vuoto).
- **VIX contro realizzata** (4): 82,94% delle sedute e 3,414 punti (testo: 83% e 3,4); 12 accensioni su 204 seguite da un picco, sia con il percentile interpolato della ricerca sia con il percentile «≥ 80» dell'app.
- **Didascalia dello scatter** (16): 734 sedute; positive 644 (88%) per l'S&P 500 e 656 (89%) per il Nasdaq-100; 20 episodi, positivi 14 e 15 su 20; 42% dei punti nei due episodi più lunghi; sopra 50 75 sedute da 3 episodi; 2 sedute senza 12 mesi. Tutti uguali al ricalcolo.
- **Riquadri di oggi** (6): VIX 28,18 «paura», 89° percentile, realizzata 19,7, premio +8,5 all'88° percentile. Coincidono con il ricalcolo e con `regimi.md`/`volatilita.md` (28,18; 89,5°; 19,72; +8,46; 88°).
- **Stessa informazione ovunque** (24): fasce (`vix.js`, tooltip, guida); definizione di episodio (app, guida, README, `vix.js`); ingresso dalla seduta dopo (intestazione della tabella, intestazione dello scatter, Fonti, guida, README, nota della versione); 16:15 contro 16:00 (app, guida, README); GARCH scartato (app, guida, README, sviluppo).
- **Approssimazioni dichiarate** (14): prezzi senza dividendi, ultima seduta provvisoria (riquadro, Fonti, guida, README), solo mercato USA, soglie tonde, pochi episodi al 40. Tutte presenti in app, guida e README, salvo quanto detto ai n. 6 e 9.
- **Rinumerazione** (12): schede, elenco dell'aiuto, indice e sezioni della guida, panoramica della guida, elenco delle viste nel README, `VIEWS` di `app.js`, tasti 1–9 in guida e README, note della versione, commenti di `check_fresh.js`, workflow e CSS (Emergenti 7). Vista 5 = Titoli giusta in guida e aiuto. Restano sbagliati i punti 2, 3 e 4.
- **Pagina a 1440 e 390 px, chiaro e scuro** (16): nessuno scorrimento orizzontale della pagina, nessun testo HTML tagliato (overflow o ellipsis), nessun errore in console. I riquadri dei valori di scatter e grafico restano dentro il grafico e hanno testi giusti.
- **Linguaggio**: niente promesse di rendimento né linguaggio da segnale operativo («Solo contesto, non un segnale», «non cambia stati né alert»). Rea è citato come fonte dell'idea in app, guida, README e `vix.js`, con «calcoli nostri su dati pubblici». Nessun dato della sua piattaforma nei testi. RS-Ratio e RS-Momentum non toccati.
- `npm test`: 134 su 134.

## Cosa non ho potuto verificare e perché

- **Ora di chiusura del VIX (16:15) e dell'indice (16:00)**: non c'è una fonte primaria nel repository; la frase viene da `inserimento.md` e da `volatilita.md`. Rete verso Cboe non provata (la ricerca riporta un blocco Cloudflare).
- **Termini di Cboe e FRED** per la ripubblicazione di `VIXCLS` in un repository pubblico: è una questione legale, va segnalata all'utente (n. 5). Non ho potuto leggere la pagina di FRED da qui: la richiesta non ha dato risultato.
- **Robustezza del Nasdaq-100 con l'ingresso il giorno dopo e la quiete a 21 o 126 sedute**: non calcolata né dalla ricerca né da me. Il mio controllo copre solo la variante dell'app.
- **Riferimenti alle «analisi 33 e 34 del catalogo»** (README): non ho verificato se il catalogo `ricerca/quant-rea/catalogo.md`, ricavato dal fascicolo di un utente, sia materiale riservato. È un punto da far confermare all'utente, non nuovo di questa versione.
- **Testo provvisorio «Yahoo, provvisorio»**: oggi i dati hanno FRED alla stessa data del VIX (05/11/2026), quindi la variante del riquadro con la seduta provvisoria non compare nella pagina. L'ho controllata solo nel codice (`renderKpis`, riquadro dei valori, `vxMeta`).

## Script e screenshot

- `ricerca/qa/1.5.0/testi/controllo_testi.mjs` → `controllo_testi.json`: criterio, cali, risalita, scatter, 83%, 3,4 punti, 12 su 204, riquadri di oggi.
- `ricerca/qa/1.5.0/testi/shots_testi.cjs` → `shots_testi.json`: testi tagliati o sovrapposti, tabelle, aiuto, guida. Comando: `BASE=http://127.0.0.1:8798/ NODE_PATH=/opt/node-tools/node_modules node …`.
- `ricerca/qa/1.5.0/testi/tips_testi.cjs`: riquadri dei valori, legenda, tooltip dei riquadri e della pillola.
- `ricerca/qa/1.5.0/testi/shots/`:
  - vista intera: `vix-{1440,390}-{scuro,chiaro}.png`;
  - Nasdaq-100 con la soglia 50: `ndx50-*.png`;
  - telefono: `tabella-390.png`, `scatter-390.png`, `grafico-390.png`;
  - riquadri dei valori: `scatter-tip-*.png`, `chart-tip-*.png`;
  - guida: `guida-vix-*.png`, `guida-comandi-*.png`.
