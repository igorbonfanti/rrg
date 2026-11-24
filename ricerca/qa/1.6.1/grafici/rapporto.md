# Controllo grafici · versione 1.6.1 · commit 4d75669

Verdetto: **NO-GO** (nessun bloccante: ogni punto è al posto giusto e del colore giusto; due punti «da correggere» nel collegamento tra crisi, punti e tabella)

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Tabella «Episodi con il VIX sopra 30», riga 27/03/2026 (S&P 500 e Nasdaq-100) | La riga è cliccabile (title «Clic per evidenziare la crisi nello scatter»), ma il suo gruppo («Fuori dalle crisi elencate · 03/2026») non ha punti nello scatter: le sue 2 sedute non hanno ancora 12 mesi di dati. Il clic spegne tutti i 734 punti, non disegna nessun alone, nessun pulsante dell'elenco risulta premuto e non compare nessuna scritta: sembra un guasto. Il gruppo esiste in `G.byKey` ma è tolto da `G.list`. | Vista 8 VIX → clic sulla soglia 30 → clic sulla riga 27/03/2026 | `shots/1440-scuro-riga-2026-03.png`; `grafici.log`, riga «riga 27/03/2026 (soglia 30) cliccabile ma la sua crisi ep:2026-03-27 non ha punti: alone vuoto, legenda non premuta, scritta no, punti spenti 734/734» (4 volte: 2 temi × 2 indici) |
| 2 | da correggere (da discutere con l'utente: tocca la regola dei gruppi) | Scatter, gruppo «Fuori dalle crisi elencate · 12/2021» e riquadro dei valori | Le 32 sedute dal 25/01/2022 al 21/06/2022 cadono dentro «2022 inflazione/tassi» (01/01–31/12/2022 in CRISES), ma appartengono all'episodio iniziato il 01/12/2021. Per questo sono colorate ed etichettate «Fuori dalle crisi elencate · 12/2021». Il riquadro del 07/03/2022 scrive «Fuori dalle crisi elencate · 12/2021»; la 1.6.0 scriveva «2022 inflazione/tassi», cioè la crisi della data. Selezionando «2022 inflazione/tassi» si accendono solo 16 punti (settembre-ottobre 2022), non la discesa del primo semestre. La regola annunciata («crisi in cui inizia l'episodio») è applicata in modo coerente, ma la scritta «fuori dalle crisi elencate» accanto a una data che sta dentro una crisi elencata è falsa alla lettera. Altri casi in cui l'etichetta del punto non è la crisi della sua data: 10 sedute di gennaio-febbraio 1999 (sotto «1998 Russia/LTCM»), 2 di luglio 2009 («2007-09 crisi finanziaria»), 4 di gennaio-febbraio 2021 («2020 Covid»), 2 di dicembre 2021. Questi casi ingannano meno. | Passaggio del mouse sul punto VIX 36,45 / −6,1 % (07/03/2022); oppure clic su «2022 inflazione/tassi» nell'elenco | `shots/1440-scuro-tip-2022-03-07.png`, `tip2022.log`; conteggio in questo rapporto (script `gruppi.mjs` + controllo in node, vedi sotto) |
| 3 | minore | Tavolozza delle crisi (`--g0…--g15`) | 15 colori visibili. Le crisi vicine nel tempo si distinguono bene (ΔE2000 ≥ 18,9). Restano coppie quasi uguali tra crisi lontane nel tempo che però si sovrappongono nella zona densa (VIX 30-35): in chiaro «2000-03 bolla internet» e «2022 inflazione/tassi» ΔE 5,8 (#00785a / #00796b), «Fuori · 10/2009» e «2025 dazi» 6,4, «1990 Golfo» e «2015-16» 9,0, «2010» e «2024 carry yen» 9,1; in scuro «1997 Asia» e «2011-12» 8,0, «Fuori · 10/2009» e «2025 dazi» 9,0, «1990» e «2024» 9,9. Il pulsante CVD non cambia questa tavolozza. Con la deuteranopia simulata (Machado) restano 17 coppie sotto ΔE 10 in scuro e 24 in chiaro: per esempio, in chiaro, 1990 e 2024 a 1,2 e 2007-09 e 2010 a 1,6; con la protanopia, 2007-09 e 2024 a 0,3. La tavolozza della 1.6.0 era Okabe-Ito, scelta per il daltonismo. L'alone e l'elenco cliccabile compensano. | `python3 ricerca/qa/1.6.1/grafici/colori.py` | `colori.log`; `shots/1440-chiaro-nessuna.png` (legenda: 2000-03 e 2022 indistinguibili) |
| 4 | minore | Elenco delle crisi su telefono (360 e 390 px) | L'elenco va a capo e si legge, ma è alto 290 px (13 righe di pulsanti), più del grafico (260 px). Le due voci «Fuori dalle crisi elencate · MM/AAAA» occupano una riga intera ciascuna. | 390 px, vista VIX | `shots/390-scuro-nessuna.png`, `extra.log` |
| 5 | minore | Scritta `#vxEpsNone` | È sotto la tabella degli episodi. Selezionando una crisi dall'elenco o dal grafico su telefono, la scritta resta più di 1000 px sopra, fuori dallo schermo. Inoltre per i gruppi «Fuori dalle crisi elencate» dice «nessun episodio sopra 40 in questa crisi», una formulazione contraddittoria. | 390 px: soglia 50, clic su «2024 carry yen» nell'elenco | `shots/390-scuro-tabella50-yen.png` |
| 6 | minore | Riquadro dei valori al tocco | Il riquadro dice «Clic per evidenziare la crisi.» anche dopo il tocco, che ha già evidenziato la crisi; un secondo tocco sullo stesso punto toglie la selezione. Su telefono il riquadro copre la parte centrale dei punti appena accesi. | 360 px, tocco sul punto del 16/03/2020 | `shots/360-chiaro-tocco-bordo.png` |
| 7 | minore | `groupsOf`: colore = posizione % 16 su tutti i gruppi, anche quelli senza punti | Oggi i gruppi sono esattamente 16 e l'ultimo (03/2026) non ha punti. Dal ~03/2027 comparirà in grigio (#bdbdbd / #6b6b6b). Un 17° gruppo, cioè un nuovo episodio fuori dall'elenco, riprenderebbe il colore di «1990 Golfo». | lettura del codice | il controllo «gruppi visibili con colori tutti diversi» di `grafici.cjs` lo segnalerà |
| 8 | minore (c'era già) | Linee tratteggiate delle soglie 40 e 50 | Sono larghe 1 px e cadono su coordinate frazionarie (per esempio x = 376,67 a 1024 px). In chiaro una delle due appare grigia e sbiadita invece che ambra. Il colore calcolato è lo stesso (rgb(154,74,0), opacità 0,7). | 1024 chiaro | `shots/1024-chiaro-yen.png` (la linea a 50 sembra grigia) |

## Cosa ho verificato e passa (977 controlli automatici)

`grafici.cjs`: 970 OK su 1440 scuro e 1280 chiaro, per S&P 500 e per Nasdaq-100:
- **Posizioni**: 734 punti per indice. Ognuno è stato ricalcolato da `data/vix.json` con un mio scatter: VIX ≥ 30, rendimento dalla chiusura del giorno dopo a 252 sedute, 0 scarti rispetto a `V.scatter`. Ognuno è nel posto giusto entro l'arrotondamento a 0,1 della scala ricavata dalle etichette degli assi, e nessuno è fuori dal riquadro.
- **Indice**: lo scatter cambia con l'indice (rendimenti diversi, verificati entrambi). Gruppi e colori restano identici, perché dipendono solo dal VIX.
- **Gruppi**: ho ricalcolato in modo indipendente i gruppi. Episodi a 30: prima seduta ≥ 30 dopo 63 osservazioni sotto. Gruppo: la crisi CRISES della data d'inizio, altrimenti l'episodio da solo. Risultato: 16 gruppi, 15 con punti. Nessun punto con il gruppo, il colore o la dimensione sbagliati (grande = primo giorno dell'episodio, 20 inizi).
- **Legenda**: le 15 voci in ordine di tempo, con le etichette attese; il colore del pallino è uguale a quello dei punti.
- **Alone**: per ognuno dei 15 gruppi, i cerchi dell'alone sono esattamente i punti di quel gruppo, uno per punto e nessuno di altre crisi. L'alone ha il colore della crisi, è ritagliato sul riquadro (clipPath) e sta sotto i punti. Ha un'unica opacità sul gruppo (0,26 in scuro, 0,2 in chiaro). Gli altri punti sono spenti (opacità 0,14) e quelli della crisi accesi (1). Solo il pulsante della crisi risulta premuto. Esc toglie la selezione.
- **Tabella**: alle soglie 20, 25, 30, 40 e 50, per ognuno dei 15 gruppi, le righe evidenziate sono quelle della stessa crisi; per i gruppi fuori dall'elenco, le righe che iniziano dentro l'episodio a 30. La scritta «nessun episodio» compare se e solo se non ci sono righe. Il clic su ogni riga cliccabile (6, 13, 21, 10 e 3 righe) accende l'alone del gruppo giusto.
- **Mouse**: riquadro dei valori su 40 punti isolati (nessun altro punto entro 8 px), con data, crisi e VIX giusti. Il clic su un punto seleziona la sua crisi, il secondo clic la toglie, il clic su una zona vuota la toglie.
- **Tocco a 390 px**: su 12 punti isolati il riquadro e la selezione sono giusti. Nessuno scorrimento orizzontale. Console senza errori.

`extra.cjs`: 7 OK. La selezione resta cambiando soglia (Covid a 50: riga 09/03/2020), indice e periodo. Invio su una riga seleziona la crisi. A 360 e 390 il riquadro del punto più a destra (16/03/2020, VIX 82,69, +57,1 %) resta dentro lo schermo.

**I controlli possono fallire**:
- sulla 1.6.0 (worktree di a1bb76e servito a parte) `grafici.cjs` dà 23 FAIL (`fallisce-su-1.6.0.log`);
- con guasti finti iniettati nella 1.6.1 (MUT=1: colore sbagliato su una crisi, un cerchio d'alone in più) dà 87 FAIL (`fallisce-con-guasti-finti.log`).

**Screenshot guardati**: 1440, 1280, 1024, 390 e 360 px, chiaro e scuro, senza selezione e con 2020 Covid, 2007-09 crisi finanziaria, 2000-03 bolla internet, «Fuori dalle crisi elencate · 12/2021» e 2024 carry yen (60 immagini). Poi la tabella a 30 con la selezione, la tabella a 50 con la scritta, il CVD, il riquadro al bordo e la riga del 2026. Nessuna etichetta sovrapposta o tagliata, l'alone non esce dal riquadro e l'elenco va a capo correttamente a tutte le larghezze.

## Cosa non ho potuto verificare e perché

- Telefoni veri, Safari e Firefox: solo Chromium con emulazione mobile.
- Daltonismo: valutato solo con la simulazione numerica (Machado 2009, gravità 1), non da persone con CVD.
- Lettori di schermo: fuori tema.
- Seconda fonte per i prezzi: fuori tema. I rendimenti sono ricalcolati dagli stessi dati di `data/vix.json`.

## Script e screenshot

Tutto in `ricerca/qa/1.6.1/grafici/`:
- `gruppi.mjs`: ricalcolo dai dati, scrive `atteso.json` e `gruppi.log`;
- `grafici.cjs`: controlli nel browser, `grafici.log`;
- `extra.cjs`: `extra.log`;
- `tip2022.cjs`: `tip2022.log`;
- `colori.py`: `colori.log`;
- `shots.cjs`: `shots/`, 92 immagini.

Uso: `node ricerca/qa/server/gzserve.mjs . 8801 &`, poi `node ricerca/qa/1.6.1/grafici/gruppi.mjs`, poi `NODE_PATH=$(npm root -g) node ricerca/qa/1.6.1/grafici/grafici.cjs`.
