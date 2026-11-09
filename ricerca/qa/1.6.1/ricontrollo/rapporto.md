# Ricontrollo grafici e usabilità · versione 1.6.1 · commit 571a400

Verdetto: **GO**. Non restano bloccanti né punti «da correggere». Tutti e cinque i «da correggere» del primo giro sono stati corretti davvero e i controlli lo confermano. Restano 8 punti minori: alcuni sono vecchi e corretti solo in parte, altri sono nuovi e piccoli.

L'app è stata servita con `node ricerca/qa/server/gzserve.mjs . 8804` e provata in Chromium (Playwright) in 10 configurazioni:
- computer: 1440 e 1280 px, chiaro e scuro;
- tablet: 1024 px con il tocco, chiaro e scuro;
- telefono: 390 e 360 px con il tocco, chiaro e scuro.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore (corretto in parte: minore 6 del primo giro dei grafici) | Riquadro dei valori dello scatter | Il testo del riquadro viene scritto al `pointerdown`, prima che il clic selezioni la crisi. Così, dopo il **primo** tocco su un punto (o dopo un clic senza muovere il mouse), la crisi è già evidenziata ma il riquadro dice ancora «Clic o tocco per evidenziare la crisi.». Il testo diventa giusto («Crisi evidenziata: clic su un punto vuoto per togliere.») solo al tocco successivo. Sul telefono il riquadro copre ancora la parte bassa a destra dei punti appena accesi. | 360 px: tocco su un punto della crisi 2007-09 con nessuna crisi selezionata | `ricontrollo.log`, righe «OSS … dopo il primo tocco» (in tutte le 10 configurazioni); `shots/360-chiaro-tocco-2007.png` |
| 2 | minore (corretto in parte: minore 4 del primo giro di usabilità) | Clic su una riga della tabella degli episodi | La pagina scorre fino allo scatter solo se se ne vedono meno di 120 px circa. Quando lo scatter è già visibile per il 30-68%, la pagina non scorre e la parte bassa resta fuori dallo schermo. Lì però può stare proprio l'alone della crisi: per esempio 2007-09 sotto 0% dopo il clic sulla riga del 02/07/2008 alla soglia 25. Quando lo scatter era fuori schermo o quasi (0-27% visibile), dopo il clic è sempre visibile al 100%: 112 clic su 112. | 1280 chiaro, soglia 25, riga 02/07/2008 al centro dello schermo | `ricontrollo.log` («OSS … 36 clic su righe con lo scatter già visibile in parte (34-66%)»); `shots/1280-chiaro-SPX-riga-scatter-parziale-34.png` |
| 3 | minore (nuovo) | Tavolozza nuova, tema scuro | La nuova tavolozza distingue molto meglio i colori, ma alcuni sono più scuri. Sul fondo nero #000, con il colore pieno, il minimo è 3,07:1 (prima era 6,09:1). I punti piccoli hanno opacità 0,75, e così scendono a 2,1-2,2:1 per tre crisi: «2000-03 bolla internet» #96412c, con 174 punti (il secondo gruppo per numero di punti); «1997 Asia» #731af9; «2018 volatilità/Fed» #aa186f. Negli screenshot i punti si vedono, ma i marroni e i viola scuri si leggono meno degli altri. In chiaro il minimo è 3,03:1 pieno e 2,27:1 con l'opacità (prima 3,67 e 2,57). Una possibile correzione è dare opacità 1 ai punti piccoli, o alzare la luminosità minima dei candidati in `tavolozza.py`. | `python3 ricerca/qa/1.6.1/ricontrollo/colori.py` | `colori.log` (tabella del contrasto e confronto tra la tavolozza vecchia e la nuova); `shots/1440-scuro-nessuna.png` |
| 4 | minore (peggiorato: minori 4 e 10 del primo giro) | Elenco delle crisi sul telefono | I pulsanti ora sono alti 30 px (prima 20 px): per il dito è meglio. L'elenco però è lungo 410 px, contro i 290 di prima, e lo scatter è alto 260 px. Lo scatter resta tutto visibile anche toccando l'ultima voce, ma la scritta «nessun episodio» finisce appena sotto il bordo dello schermo quando la voce toccata è in fondo. | 390 o 360 px, vista VIX, soglia 40, tocco su «1990 Golfo» dopo averlo portato in fondo allo schermo | `ricontrollo.log` («elenco delle crisi alto 410 px»), `telefono.log`, `shots/390-scuro-golfo-scritta40.png` |
| 5 | minore (da discutere con l'utente: è una conseguenza della regola nuova) | Riga 01/12/2021 della tabella (soglia 30) e gruppo «Altro episodio · 12/2021» | La riga dell'episodio iniziato il 01/12/2021 (VIX max 36,5) accende solo 2 punti, quelli dell'1-3/12/2021. Le altre 32 sedute dello stesso episodio, dal 25/01 al 21/06/2022, compreso il massimo di 36,45 del 07/03/2022, ora sono in «2022 inflazione/tassi», come chiede la regola. Nel riquadro questi punti dicono «2022 inflazione/tassi · Episodio iniziato il 01/12/2021», e questo è coerente. Chi clicca la riga, però, si aspetta di vedere l'episodio intero. | Soglia 30, clic sulla riga 01/12/2021 | `gruppi.log` («ep:2021-12-01 → 2022 inflazione/tassi: 32») |
| 6 | minore (nuovo, testi) | Nota sotto lo scatter, guida, README | Testi: «Per togliere: clic o tocco su un punto vuoto o di nuovo sulla stessa crisi». Si può capire che basta toccare di nuovo un punto della stessa crisi, ma quel tocco ora la lascia accesa, come deciso. Il riquadro invece dice la cosa giusta. Una formulazione più chiara sarebbe «di nuovo sulla stessa crisi nell'elenco o sulla stessa riga». | Leggere `index.html` (nota dello scatter), `guida.html` (#vix «Scatter»), README (sezione 8 VIX) | — |
| 7 | minore (nuovo, fuori tema: accessibilità) | Righe cliccabili degli episodi | Le righe hanno `role="button"` su un `tr`. Così perdono il ruolo di riga di tabella e un lettore di schermo legge l'intera riga come il nome di un pulsante, senza le intestazioni delle colonne. | Lettura del DOM | `js/vix-view.js:123` |
| 8 | minore (aperto, già dichiarato in `docs/sviluppo.md`) | Esc | Con la guida aperta e una crisi selezionata, Esc chiude la guida e toglie anche la selezione. | 1440: selezionare il Covid, aprire «? Guida», premere Esc | `ricontrollo.log` («Esc con la guida aperta → guida chiusa, selezione tolta») |

Il minore 8 del primo giro dei grafici (linee 40 e 50 sbiadite in chiaro) non è stato toccato e resta com'era. Anche il minore 7 dei grafici (colori ripetuti al 17° gruppo) resta aperto, ed è dichiarato in `docs/sviluppo.md`.

## Cosa ho verificato e passa

**Gruppi ricalcolati dai dati** (`gruppi.mjs`). Ho rifatto io, senza la funzione dell'app, gli episodi a 30 e i gruppi con la regola nuova: la crisi della data, altrimenti quella dell'episodio, altrimenti «Altro episodio · MM/AAAA».
- S&P 500 e Nasdaq-100: 734 punti ciascuno, con 0 scarti da `V.scatter` (date, rendimenti, episodio, inizio). Ci sono 15 gruppi con punti; il gruppo del 03/2026 non ha punti.
- 2022: tutte le 48 sedute del 2022 sono in «2022 inflazione/tassi», comprese le 32 dal 25/01 al 21/06/2022 dell'episodio iniziato il 01/12/2021.
- Gli altri casi citati nel primo giro non cambiano gruppo, perché le loro date non cadono in nessuna crisi: 10 sedute di gennaio-febbraio 1999 restano con «1998 Russia/LTCM»; il 7-8/07/2009 con «2007-09»; 4 sedute dal 27/01 al 01/02/2021 con «2020 Covid»; l'1-3/12/2021 con «Altro episodio · 12/2021».

**Nel browser** (`ricontrollo.cjs`): **3345 controlli OK, 0 FAIL**.
- Su 1440 scuro e 1280 chiaro i controlli sono completi, per entrambi gli indici. Sulle altre 8 configurazioni il controllo è ridotto, solo sull'S&P 500.
- Punti: per ognuno dei 734, gruppo, colore calcolato (`--gN` del tema), dimensione e posizione rispetto agli assi sono quelli attesi.
- Elenco delle crisi: 15 voci in ordine, con le etichette attese («Altro episodio · 10/2009» e «· 12/2021», nessun «Fuori dalle crisi elencate») e 15 colori diversi.
- Alone: per ogni gruppo, a ogni soglia, un cerchio per ogni punto della crisi e nessuno in più, del colore della crisi, ritagliato sul riquadro. Sono accesi solo i suoi punti ed è premuto un solo pulsante.
- Righe evidenziate: alle soglie 20, 25, 30, 40 e 50 sono quelle attese per ognuno dei 15 gruppi, con `aria-pressed` coerente. La scritta compare solo quando non ci sono righe. Dice «… nella tabella sopra non ci sono episodi del VIX sopra X in questa crisi / in questo periodo». Sta tra l'elenco e la nota, sotto lo scatter, e lo scatter non si sposta mai (0 px).
- Righe cliccabili: 6, 13, 20, 10 e 3, come atteso. Solo queste hanno il puntino colorato del loro gruppo e `tabindex`. La riga del 27/03/2026 alla soglia 30 c'è, non è cliccabile e il clic non cambia nulla. Il clic su ogni riga cliccabile accende la sua crisi e il secondo clic la toglie. Anche il secondo clic sulla stessa voce dell'elenco toglie la selezione.
- Punti: un tocco o un clic su un punto (anche grande) della crisi accesa la lascia accesa. Un tocco su un punto di un'altra crisi passa a quella. Un tocco su una zona vuota toglie la selezione. Esc la toglie sul computer. Il cursore sul grafico è a manina.
- Nessuno scorrimento orizzontale e console senza errori in tutte le 10 configurazioni.

**I controlli possono fallire**:
- `ricontrollo.cjs` sulla 4d75669 (servita a parte, stessi dati): **946 FAIL** (`fallisce-su-4d75669.log`). Fallisce su gruppi del 2022, etichette, riga del 27/03/2026, tocco che spegne, scritta sopra lo scatter che lo sposta di 37 px, alone di 34 cerchi per un gruppo di 2 punti, scatter fuori schermo dopo il clic su una riga.
- `v161.cjs` sulla 4d75669: 20 FAIL (`v161-su-4d75669.log`).

**Regressioni**:
- `v150.cjs`: 108 OK.
- `v161.cjs`: 76 OK, sia sul ramo sia sulla copia con i dati nuovi.
- `v160.cjs`: 87 OK, su una copia `git archive 571a400` servita sulla 8805, con `data/vix.json` rigenerato da `scripts/fetch_vix.js` (VIX3M e HYGIEF al 06/11/2026).
- `npm test`: 142 superati, 1 saltato, 0 falliti.

**Colori** (`colori.py`, funzioni riscritte e provate sui valori di riferimento CIEDE2000 di Sharma 2005):
- `tavolozza.py` riproduce esattamente le due tavolozze di `css/style.css`.
- Distanza minima tra le crisi (ΔE2000), nuova tavolozza contro vecchia:

| Visione | Scuro | Chiaro |
|---|---|---|
| normale | 13,6 (era 8,0) | 12,5 (era 5,8) |
| deuteranopia | 10,7 (era 2,7) | 7,9 (era 1,2) |
| protanopia | 11,7 (era 3,1) | 8,4 (era 0,3) |

- Coppie sotto ΔE 10 con deuteranopia e protanopia: in scuro 0 (erano 17 e 14), in chiaro 3 e 5 (erano 24 e 21).
- La tritanopia resta debole: minimo 5,8 in scuro e 4,0 in chiaro.
- Il pulsante CVD non cambia la tavolozza.

**Screenshot guardati**: 1440, 1280, 1024, 390 e 360 px, chiaro e scuro. Per ogni configurazione: senza selezione, con Covid, 2022, bolla e Golfo (con la scritta alla soglia 40), la tabella a 30 con il 2022, lo scatter dopo il clic su una riga e il tocco su 2007-09. In più il CVD a 1440 scuro e 1280 chiaro. Le etichette non si sovrappongono, l'alone resta nel riquadro e l'elenco va a capo bene.

## Cosa non ho potuto verificare e perché

- Safari e iOS reali, e telefoni fisici: ho usato solo Chromium con l'emulazione del tocco.
- Daltonismo: solo con la simulazione numerica (Machado 2009), non con persone che ce l'hanno.
- Lettori di schermo reali.

## Script e screenshot

Tutto in `ricerca/qa/1.6.1/ricontrollo/`:
- `gruppi.mjs`: scrive `atteso.json` e `gruppi.log`.
- `ricontrollo.cjs`: si usa con `--shots` (e `--quick` per i soli 1440 e 1280). Log in `ricontrollo.log` e `fallisce-su-4d75669.log`.
- `telefono.cjs`: `telefono.log`.
- `colori.py`: `colori.log`, con `tavolozza.log`.
- Log delle regressioni: `v150-8804.log`, `v161-8804.log`, `v161-8805.log`, `v161-su-4d75669.log`, `v160-8805.log`.
- Screenshot: `shots/`, 83 file.

Uso: `node ricerca/qa/server/gzserve.mjs . 8804 &`, poi `node ricerca/qa/1.6.1/ricontrollo/gruppi.mjs`, poi `BASE=http://127.0.0.1:8804/ NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/ricontrollo/ricontrollo.cjs --shots`.
