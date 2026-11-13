# Controllo testi (secondo giro) · versione 1.6.0 · commit 6fc67a1

Verdetto: **NO-GO**, ma per poco. Gli 11 rilievi del primo giro sono risolti tutti o in parte, e nessun numero mostrato nella vista è sbagliato. Restano due frasi della guida da correggere, una riga ciascuna: un conteggio fatto con una soglia diversa da quella dell'app (478 contro 795) e una data d'inizio sbagliata per lo spread Baa.

## Stato dei rilievi del primo giro

| # (1° giro) | Esito | Nota |
|---|---|---|
| 1 verifica del credito attribuita a HYG/IEF | **risolto** | index, guida e README ora dicono che la verifica è stata fatta con lo spread Baa. Due imprecisioni nuove: rilievi 2 e 3 qui sotto |
| 2 −41% e −29% senza script | **risolto** | `ricerca/vix/struttura/credito_minimi.mjs` dà −41,39 l'11/12/2008 e −29,15 il 23/03/2020; lo stesso risultato con il mio script Python, che non usa il codice dell'app. Lo script è citato nel README, e la riga «Ricalcolo» dell'app rimanda a `struttura/` |
| 3 «equivalenti», «quasi sempre» | **risolto** sulle parole | ora «due misure simili» e «segnala la backwardation meno spesso». Il conteggio però non usa la soglia dell'app: rilievo 1 |
| 4 «poi Cboe» sempre | **risolto** | `fetch_vix.js` registra la fonte (`src`, `asOf.vixSrc` e `asOf.vix3mSrc`) e la riga sotto i riquadri la mostra. Nel browser: «poi Cboe» con il file vero (e Cboe ha davvero 25,64 e 24,60 per il 06/11), «poi Yahoo» con `vixSrc: 'Yahoo'`, «poi Cboe o Yahoo» senza il campo, nessuna parentesi se la seduta non è provvisoria. La versione 06a5360 scriveva «poi Cboe provvisorio» in tutti i casi, quindi il controllo B fallisce su di lei |
| 5 «non batte il segnale del VIX» | **in parte** | index e guida dicono «sopra 30», il README no: rilievo 5 |
| 6 «HYG/IEF dal 09/04/2008» nella fascia | **in parte** | index e guida ora spiegano «distanza dal massimo dal 2008». La scritta nel grafico è la stessa: rilievo 6 |
| 7 «57° percentile» | **risolto** | «57° percentile del calo (alto = più profondo)» |
| 8 sviluppo.md, numero dei test | **risolto** | 143 test (`npm test`: 143 superati); aggiunti `v150.cjs` e `v160.cjs` |
| 9 condizioni d'uso dei file Cboe | **aperto** | rilievo 7 |
| 10 «supera» | **risolto** | «arriva al VIX3M o lo supera», in index e guida |
| 11 «spread» e «USA» | **risolto** | spread spiegato, «titoli di Stato USA» in index, guida e title. Piccola imprecisione nella spiegazione: rilievo 4 |

## Rilievi

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | `guida.html` #vix, punto VIX / VIX3M: «Rispetto al primo contro il secondo future sul VIX segnala la backwardation meno spesso (**478 sedute contro 795** dal 2007)». Stessi numeri in `README.md` riga 101: «i futures segnalano la backwardation più spesso (795 sedute contro 478)» | I conteggi vengono da `dati.mjs`, che conta come backwardation un rapporto **> 1**. L'app invece usa **da 1 in su** (≥ 1): la frase appena prima nella guida, la legenda «VIX ≥ VIX3M» e `termState`. Con la regola dell'app, dal 04/12/2007 al 05/11/2026 (4.761 sedute), le sedute sono **479** per VIX/VIX3M (il 17/09/2015 ha R = 1 esatto) e **821** per VX1/VX2 (26 sedute con VX1 = VX2). La concordanza diventa 90,8% contro 91,1%, quindi «91%» resta giusto. Il senso della frase non cambia, ma il numero non si riferisce alla regola che l'app mostra | `node ricerca/qa/1.6.0/testi2/soglia_uguale.mjs <copia>` (copia `dati.mjs` in una cartella a parte e cambia solo `> 1` in `>= 1`); `python3 -I ricerca/qa/1.6.0/testi2/ricalcolo2.py` (`sedute_R_ge_1` 479, `sedute_R_gt_1` 478) | `soglia_uguale.json`, `ricalcolo2.json` |
| 2 | da correggere | `guida.html` #vix, ultimo punto: «i casi con il credito in tensione (verificati con lo spread delle obbligazioni Baa, **che c'è dal 1990**)» | La serie BAA10Y non comincia nel 1990: è «dal 1986» (`backtest.md`, riga 18). Il 1990 è l'inizio del campione della verifica, perché gli episodi del VIX partono da lì. Il README lo scrive giusto: «verificato con BAA10Y dal 1990» | `grep -n "dal 1986" ricerca/vix/struttura/backtest/backtest.md` | backtest.md §Dati |
| 3 | minore | `index.html` «Come leggere»: «Nella verifica, fatta con lo spread delle obbligazioni Baa **perché HYG/IEF c'è solo dal 2007**»; `README.md` riga 101: «verificato con BAA10Y dal 1990 perché HYG/IEF c'è solo dal 2007» | Il motivo non è documentato. Il backtest ha usato BAA10Y perché allora era la misura da mostrare (`inserimento.md`, riquadro «Spread di credito Baa»). HYG/IEF è arrivato dopo, come ripiego per la licenza (`inserimento.md` riga 325). È vero che HYG/IEF parte dal 2007, ma la frase presenta come una scelta di metodo quello che è successo per ordine di lavoro | `grep -n -i hyg ricerca/vix/struttura/backtest/backtest.md` → 0 righe | inserimento.md r. 325 |
| 4 | minore | `index.html`: «Non è uno spread ufficiale, cioè il rendimento in più chiesto alle obbligazioni high yield: quello non si può ripubblicare.»; `guida.html`: «(il rendimento in più chiesto alle obbligazioni high yield)»; «obbligazioni Baa» (index, guida) | Nella spiegazione manca «rispetto ai titoli di Stato», e il «cioè» si può leggere come se spiegasse HYG/IEF. «Baa» non è spiegato | — | — |
| 5 | minore | `README.md` riga 101: «il ritorno al contango non batte il segnale del VIX» | Non è stato allineato a index e guida, che ora scrivono «del VIX sopra 30» (rilievo 5 del primo giro) | `grep -n "non batte" README.md` | — |
| 6 | minore | grafico a MAX (1440 px): scritta nella fascia grigia «HYG/IEF dal 09/04/2008» | I testi ora spiegano che la distanza dal massimo parte dal 2008, ma la scritta dice ancora «HYG/IEF dal», mentre i dati partono dal 2007. A 390 px la scritta non c'è, perché non entra nella fascia | `#vix`, periodo MAX | `testi_browser2.json` → `1440_A.nodataMax` |
| 7 | minore | `docs/sviluppo.md`, punto aperto per l'utente; `README.md` Licenza: «e l'ultima seduta dai file pubblici di Cboe» | Le condizioni d'uso del sito di Cboe per `VIX_History.csv` e `VIX3M_History.csv` non sono ancora tra i punti da far leggere all'utente (rilievo 9 del primo giro). Nel punto aperto c'è solo FRED | `grep -n "Punto aperto" docs/sviluppo.md` | — |
| 8 | minore | title dei riquadri VIX e VIX / VIX3M: «… fino ad allora il valore viene dal file di Cboe (o da Yahoo) e **la corsa successiva** lo sostituisce» | FRED pubblica verso le 14:40 UTC (`dati.md`). Le corse dalle 01:10 alle 06:10 e quella delle 11:40 UTC vengono prima, quindi se partono non trovano ancora FRED. Il valore lo sostituisce di solito la corsa delle 22:40 UTC del giorno feriale dopo | `.github/workflows/update-data.yml` righe 9-11; `dati.md` riga 50 | — |
| 9 | minore | `README.md` riga 97: «di notte però può succedere, perché **a volte** Cboe aggiorna il file solo dopo le 2 UTC» | Viene da una sola osservazione (Last-Modified di `VIX_History.csv` sabato 07/11 alle 02:11 UTC, `dati.md` riga 53). Last-Modified dice l'ultima modifica, non quando è comparsa la riga. «A volte» dice più di quello che si sa | `dati.md` righe 52-53, 230 | `cache/_scaricato.json` |
| 10 | minore | `docs/sviluppo.md` §7 | I rilievi minori ancora aperti della 1.6.0 non sono nello stato del progetto. Per la 1.5.0 ci sono, e `controlli.md` («Dopo i rapporti», punto 3) lo chiede | — | — |

## Correzioni proposte (testo nuovo)

1. Contare con la regola dell'app: in `dati.mjs`, `>= 1` (oppure una variante salvata accanto), poi nella guida «Rispetto al primo contro il secondo future sul VIX segnala la backwardation meno spesso (479 sedute contro 821 dal 2007, con la stessa soglia: da 1 in su) e non ha i salti alle scadenze dei futures», e nel README «(821 sedute contro 479)». Il «91%» del README e di `docs/sviluppo.md` resta giusto (90,8%). In alternativa si tengono 478 e 795 e si scrive «con il rapporto sopra 1», ma allora la frase usa una regola diversa da quella dell'app.
2. Guida: «(verificati con lo spread delle obbligazioni Baa, sul campione dal 1990)».
3. Index: «Nella verifica il credito è stato provato con lo spread delle obbligazioni Baa (dal 1990), non con HYG/IEF: i casi con il credito in tensione sono troppo pochi per una statistica. Solo contesto.» README: «… verificato con BAA10Y dal 1990, non con HYG/IEF».
4. Index: «Non è uno spread ufficiale (il rendimento in più che le obbligazioni high yield pagano rispetto ai titoli di Stato): quello non si può ripubblicare.» Uguale nella guida. «Obbligazioni Baa» → «obbligazioni societarie di qualità media (Baa di Moody's)».
5. README: «il ritorno al contango non batte il segnale del VIX ≥ 30».
6. Scritta nella fascia: «calo dal massimo dal 09/04/2008» (oppure «HYG/IEF: distanza dal 09/04/2008»).
7. `docs/sviluppo.md`, punto aperto: aggiungere «e le condizioni d'uso del sito di Cboe per `VIX_History.csv` e `VIX3M_History.csv`, non ancora lette».
8. Title: «… e la sostituisce una corsa successiva (di solito quella della sera dopo)».
9. README: «di notte però può succedere: una volta il file di Cboe risultava modificato solo alle 02:11 UTC (`dati.md`)».
10. `docs/sviluppo.md` §7: una riga «1.6.0, rilievi minori aperti (`ricerca/qa/1.6.0/`)» con quelli che restano.

## Cosa ho verificato e passa (31 controlli)

- **Numeri, con gli script del repository rieseguiti** (6):
  - `credito_minimi.mjs` dà −41,39 l'11/12/2008 e −29,15 il 23/03/2020. «Nel 2008» va bene: il minimo della finestra 2008-2009 e di tutta la storia è l'11/12/2008;
  - `dati.mjs`, rieseguito in una copia: 478, 795, 424, 4.336 su 4.761 (0,9107), uguali a `dati.md` e `risultati.json`. Rispetto al file salvato cambiano solo i livelli ICE e Moody's tolti da `ripulisci.mjs` e i pesi in KB;
  - `npm test`: 143 su 143.
- **Numeri, con un ricalcolo indipendente in Python** (`ricalcolo2.py`, senza il codice dell'app) (5):
  - 13 episodi del VIX ≥ 30 dal 04/12/2007, tutti con VIX/VIX3M ≥ 1 alla chiusura del segnale (il più vicino a 1: 01/12/2021, 1,0107);
  - −41,39% e −29,15%, con le stesse date;
  - FRED contro Cboe: 0 differenze, oggi su 9.310 date comuni. Il 9.309 è la fotografia di `inserimento/risultati/verifica_dati.txt`, presa un giorno prima. 34 date comuni non sono sedute dell'S&P 500, quindi «date» è la parola giusta;
  - il salto più grande del VIX citato nel commento di `fetch_vix.js` è ×2,156 il 05/02/2018.
- **Nel browser** (1440 px con 5 varianti dei dati, 390 px) (11):
  - la riga sotto i riquadri nelle varianti A-D;
  - il riquadro del credito con HYG/IEF in ritardo: «— · HYG/IEF del 06/11/2026 non ancora arrivato · al 05/11/2026 era −3,1% dal massimo», come dice la guida;
  - il title del credito e il testo «percentile del calo (alto = più profondo)»;
  - la legenda con «ultimo valore (pieno se in backwardation)» e «backwardation (VIX ≥ VIX3M)»;
  - le scritte delle fasce, la scritta che non entra viene tolta a 390 px;
  - in «Come leggere» i paragrafi Struttura e Credito, il Ricalcolo e le Fonti;
  - la guida #vix;
  - NOTES[0];
  - console senza errori in tutte le 6 pagine;
  - il telefono a 390 px leggibile (screenshot).
- **Coerenza tra le copie** (9):
  - «arriva al VIX3M o lo supera» (index, guida);
  - «sopra 30» e «il giorno del segnale» (index, guida);
  - «titoli di Stato USA a 7-10 anni» (index, guida, title);
  - «9.309 date» (README, commento di `fetch_vix.js`);
  - la fonte dell'ultima seduta (fetch, README, guida, NOTES, nota 1.6.0);
  - «distanza dal massimo dal 2008» (nota delle fonti, guida);
  - «91%» (README, sviluppo.md);
  - Serafini e Rea ancora citati;
  - nessun livello di ICE o Moody's nei testi nuovi.

## Cosa non ho potuto verificare e perché

- Chi ha davvero dato l'ultima seduta nelle corse notturne passate: `data/vix.json` registra solo l'ultima corsa (Cboe, confermato dal file di Cboe di oggi).
- L'ora abituale di pubblicazione di `VIX_History.csv`: c'è una sola osservazione.
- Tema chiaro: non controllato, il tema del controllo sono i testi.

## Script e screenshot

- `ricerca/qa/1.6.0/testi2/ricalcolo2.py` → `ricalcolo2.json`: ricalcolo indipendente.
- `ricerca/qa/1.6.0/testi2/soglia_uguale.mjs` → `soglia_uguale.json`: conteggi di `dati.mjs` con `> 1` e con `>= 1`, su una copia. Serve una cartella con `scripts/`, `js/`, `data/`, i `*.json` della radice e `ricerca/vix/struttura/dati/` con `cache/`.
- `ricerca/qa/1.6.0/testi2/testi_browser2.cjs` → `testi_browser2.json`: testi nel browser con 5 varianti di `data/vix.json` servite con `page.route`, senza toccare file.
- `ricerca/qa/1.6.0/testi2/vix-1440.png`, `vix-390.png`.
