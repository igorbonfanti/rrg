# Controllo numeri e dati · versione 1.4.0 · commit 249d245

Copia controllata: `http://127.0.0.1:8794/`, con codice e dati del commit 249d245 (`data/emerging.json` generato il 05/11/2026 alle 16:43 UTC; cambi della Fed fino al 30/10, Yahoo dal 02/11 al 04/11).

Metodo:
- Ricalcolo indipendente in Python, solo con la libreria standard (`lib2.py`). Non importa nessun modulo dell'app: decodifica i file da sé e riscrive le formule partendo dalle definizioni.
- Valori letti dal DOM con Playwright: Chromium a 1600 px e a 390 px in tema scuro; screenshot anche in tema chiaro.
- Seconde fonti scaricate oggi:
  - FRED H.10 (DEX*, DTWEXEMEGS);
  - cambi di riferimento della BCE, incrociati con EUR/USD;
  - barre giornaliere e orarie di Yahoo;
  - versioni ALFRED di DTWEXEMEGS.

**Verdetto: GO.** Tutti i numeri che la pagina mostra oggi tornano con il ricalcolo. La parte Fed dei cambi coincide valore per valore con FRED, e le due statistiche dei testi tornano. Il punto 1 è da correggere: un errore di conteggio dei KPI che oggi non si vede, ma che ricompare appena un indice emergente passa allo stato «Fallito». Gli altri punti sono minori.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | KPI «Emergenti in zona blu» (`renderKpis` in js/emerging-view.js: `r.state === 'setup'`) | La vista 6 conta in zona blu gli stati `setup` e `fail`; la vista 8 conta solo `setup`. Con KOSPI200 nello stato «Fallito» (simulato al 30/10/2022, l'ultima seduta «fail» del KOSPI) la vista 8 mostra «0 / 7 · nessuno»; la vista 6 mostra «Indici in zona blu 1 / 22 · KOSPI200». Nella stessa vista 8 il tabellone dice «Fallito» e il grafico disegna la zona blu (lì `setup` e `fail` contano tutti e due). L'indice in «Fallito» non entra in nessun KPI. È già successo: CSI300 nel 2018, KOSPI200 nel 2022, TWN nel 2011 (`trova_fail.mjs`) | `node fail_kpi.mjs http://127.0.0.1:8794/ KOSPI200 2022-09-30` (page.route taglia la serie dell'indice a quella data) | `output/fail_kpi.txt`, `shots/kpi-fail-KOSPI200.png` |
| 2 | minore | Coda di Yahoo, KRW=X del 02/11/2026 (riquadro di KOSPI200 e linea «in dollari») | Il riquadro mostra «KRW per dollaro 1325,52 Yahoo, provvisorio». Nella barra giornaliera di Yahoo per quel giorno la chiusura (1325,52) è sotto il minimo della barra stessa (1334,23). Le barre orarie del 30/10 e del 02/11 non scendono mai sotto 1331,1. Altri riferimenti: BCE 1335,27 il 30/10 e 1342,90 il 02/11, Fed 1333,99 il 30/10. È quindi un errore di stampa, che `cleanFx` non toglie perché i salti (−0,64% e +1,44%) restano sotto la soglia del 3%. Effetto: «In dollari (base 100)» del 02/11 è 229,3, con la chiusura oraria delle 00:00 (1338,48) sarebbe circa 227,1; z del giorno −1,70 invece di −1,48; lo stato resta «Ha smesso di scendere». I valori di oggi (04/11) non cambiano. Il dato è segnato provvisorio e la Fed lo sostituirà | `#emg-KOSPI200`, mouse sul 02/11/2026; `python3 -I fonti_confronto.py <sito>` | `output/fonti_confronto.txt`, `output/krw_intraday.txt`, `output/yahoo_barre_coda.txt`, `shots/tip-KOSPI200-2026-11-02-chiaro.png` e `-scuro.png` |
| 3 | minore | Tabellone, «3 mesi in $» con l'asterisco | Il valore è quello richiesto: l'ultima seduta con il cambio, con l'asterisco e la data nel titolo. È uguale al ricalcolo in tutte e due le simulazioni (punto 3 della verifica). Però «locale» resta all'ultima seduta, quindi le due colonne misurano finestre spostate di una seduta. Esempio simulato senza il cambio del 04/11: KOSPI200 mostra «−13,8%» locale e «+6,9%*» in dollari, come se il won si fosse rafforzato del 20%. In realtà alla stessa seduta (03/11) la variazione locale è +1,0%, e lo scarto viene dal +17,9% del KOSPI del 31/07/2026, che entra in una finestra e non nell'altra. TWN: −0,4% locale contro +7,8%* in dollari. Il caso non è raro: la corsa delle 22:40 UTC scarta la barra del cambio di oggi, che resta aperta fino alle 00:59 UTC (`parse` in scripts/lib/yahoo.js, trading period 00:00-23:59 GMT), mentre le borse asiatiche e l'IBOV hanno già la seduta | `node dom2.mjs <url> x.json --drop-last-tail ALL --no-sweep` | `dom2_senza_ultimo_cambio.json`, `output/confronto2_senza_ultimo_cambio.txt`, `shots/emg-senza-cambio-di-oggi.png` |
| 4 | minore | Tabellone, «3 mesi in $» (e linea «in dollari») | Con i cambi della Fed mancano le feste degli Stati Uniti. Quando la seduta di 63 giorni prima cade in una di queste feste, «3 mesi in $» è «—» anche con il cambio di oggi presente. Dal 01/11/2023 succede in 23-29 sedute su circa 700 per ogni indice, cioè circa il 3,5%; per esempio CSI300 l'08/12/2023, con base il 04/09/2023 (Labor Day). Il «—» è corretto per la regola, ma il titolo della cella non dice perché manca. Nel riquadro del grafico, nei giorni di festa americana, sono «—» il cambio, la valuta e l'indice in dollari; la nota spiega solo il dato FRED del dollaro | `python3 -I base_mancante.py <sito>`; mouse sul 07/09/2026 | `output/base_mancante.txt`, `shots/tip-KOSPI200-2026-09-07-telefono-chiaro.png` |
| 5 | minore | Titolo della barretta z nel tabellone | Oggi lo stato e z della valuta si calcolano sul cambio di Yahoo (04/11), che è provvisorio. Il titolo dice «cambio 6,6701 al 04/11/2026» senza «provvisorio», mentre il riquadro del grafico, per lo stesso valore, scrive «Yahoo, provvisorio» | passa il mouse sulla barretta | `dom2.json` → `table[].zTitle` |
| 6 | minore (non visibile) | Commento in testa a js/emerging.js | Dice ancora «in 6 date su 4.650 provate lo stato di un giorno passato visto oggi differisce da quello visto allora». Con la storia della Fed la pulizia vale solo nella coda di Yahoo: ho avuto 0 differenze su 11.693 prove (punto 4 della verifica) | `node causale2.mjs <sito>` | `output/causale2.json` |
| 7 | minore (solo ricerca) | `ricerca/emergenti/backtest/script/backtest.mjs`, `first()` di H5 | Una «accensione» di F si conta anche dopo un giorno nullo, cioè una festa americana sul calendario dell'indice, con F già acceso prima. Per TWN 2020 l'anticipo risulta −103 invece di −33; per TWN 2025 −114 invece di +2 (prima vera accensione da 0 a 1). Le statistiche citate nell'app non cambiano: 15 su 17 con tutte e due le letture. Cambia invece la mediana dell'anticipo, `F.mediana` −104,5, che l'app non cita | `python3 -I h5_indip.py <sito>` (campo `FprimaStretta`) | `output/h5_indip.txt` |

## Cosa ho verificato e passa
In tutto **622.240 confronti** tra il DOM e il ricalcolo, **0 diversi**:
- 393.619 su computer, con 62.961 riquadri dei valori: 7 indici, periodi 3A, 10A e MAX, ogni seduta del periodo;
- 228.621 su telefono in tema scuro, con 36.457 riquadri.

L'arrotondamento è quello di `toFixed` di JavaScript (a metà si arrotonda verso l'alto).

**KPI**
- Dollaro 130,9, «sopra la media 200» (128,617), «+2,0% in 3 mesi», «non favorevole», «FRED al 30/10/2026».
- Valute in calo forte 1/5 (IBOV, z 1,55).
- Valute che hanno smesso di scendere 2/5 (NIFTY50 e KOSPI200).
- Zona blu 1/7 (KOSPI200) e attenzione 2/7 (CSI300, IBOV).

**Tabellone**, per i 7 indici:
- breadth, drawdown a 52 settimane, 3 mesi locale e 3 mesi in dollari;
- stato della valuta, z con 2 decimali, cambio e sua data;
- quadrante e data della forza relativa;
- meta «dal 03/11/2026 al 04/11/2026 · cambi al 04/11/2026 · ETF al 04/11/2026».

**Riquadro dei valori**:
- prezzo (CSI300 con 3 decimali), in dollari base 100, % sopra la media 200;
- cambio con «Yahoo, provvisorio» solo dopo il 30/10, stato della valuta, dollaro FRED;
- nota FRED presente solo dove manca il valore.

**Forza relativa**:
- RS-Ratio e RS-Momentum dei 7 punti (per esempio EWY 99,99 e 98,4, Lagging);
- posizione dei punti nel grafico;
- 70 punti della scia, entro 0,05 unità SVG.

**Cambi contro FRED** (scaricati oggi): 6 serie, 40.359 valori dal 03/01/2000 al 30/10/2026.
- 0 valori diversi, 0 date mancanti, 0 date in più.
- Il campo `fred` (30/10) coincide con l'ultimo valore di FRED.
- DTWEXEMEGS: 5.222 valori su 5.222 identici, ultimo 30/10.

**Coda di Yahoo contro la BCE** (02-04/11), confrontata con la BCE del giorno prima, perché Yahoo con la data t dà il prezzo della sera prima:
- CNY, INR, BRL e HKD entro lo 0,2%;
- KRW, il 02/11, è il punto 2;
- TWD non ha un cambio BCE: le barre di Yahoo sono coerenti.

**«3 mesi in $» con il cambio di oggi mancante** (page.route):
- togliendo l'ultimo giorno a tutti i cambi:
  - NIFTY50 −3,3%*, IBOV −13,2%*, KOSPI200 +6,9%*, TWN +7,8%*, HSI −9,0%*, con il titolo «al 03/11/2026, l'ultima seduta con il cambio»;
  - CSI300 senza asterisco, perché la sua ultima seduta (03/11) ha il cambio;
  - EEM invariato;
  - «cambi al 03/11/2026»;
  - z e stati al 03/11.
- Togliendolo solo a KRW=X: asterisco solo su KOSPI200.
- 188 controlli, 0 diversi.

**Nessun dato futuro** (moduli dell'app, serie tagliate a T contro la serie completa):
- stato e z della valuta: 11.693 date, 0 diverse;
- D, media 200 e variazione a 63 sedute del dollaro: 1.741, 0 diverse;
- forza relativa: 3.051 settimane, 0 diverse.

**Statistiche dei testi**, ricalcolate da zero con i cambi e DTWEXEMEGS scaricati da FRED (non dalla cache del backtest) e con le chiusure di `data/indices*.json`:
- 26 cali oltre il 25% dal massimo storico.
- Valuta: 17 con F per i 5 indici con il cambio; in 15 F era acceso nei 126 giorni prima del minimo, sia con la lettura letterale del testo sia con quella del backtest. Le eccezioni: dopo il minimo KOSPI 2011 (+15), mai IBOV 2004. Uno dei 15 è il KOSPI 2026, minimo il 26/10/2026, −40,0%.
- Dollaro: mediana 110 sedute in 19 cali, con i valori pubblicati il martedì dopo; nel ventesimo (KOSPI 2026) non ancora. Con lo stesso giorno la mediana sarebbe 108.

**Vista 8 uguale alla vista 6**: stato, breadth, livello blu e drawdown dei 7 indici, 28 celle uguali; i KPI coincidono oggi. Con lo stato «Fallito» no: è il punto 1.

**Altri numeri dei testi**:
- DTWEXEMEGS rivisto «fino allo 0,6%»: 0,639% (versioni ALFRED del 08/01/2024, 06/01/2025 e 05/01/2026, sul valore del 28/08/2023);
- file circa 160 KB compressi: 161 KB serviti;
- storie: ASHR dal 2013, INDA dal 2012, ACWI dal 2008, DTWEXEMEGS dal 2006, cambi dal 2000.

**Console**: nessun errore JavaScript in nessuna delle prove.

## Cosa non ho potuto verificare e perché
- La coda di Yahoo per TWD: la BCE non pubblica il dollaro di Taiwan. L'ho confrontata solo con le barre giornaliere e orarie di Yahoo stesso, che sono coerenti.
- Lo stato della macchina giorno per giorno nell'intestazione del riquadro (per esempio «KOSPI200 · zona blu»). Viene dallo stesso oggetto della vista 6 (`snapshot().m`) e non l'ho ricalcolato in modo indipendente: la macchina a stati è fuori dal tema della vista 8.
- Il salto di KOSPI200 (+17,9%) e di TWN (+8,0%) del 31/07/2026 nelle chiusure della vista 6: non ho una fonte indipendente per le chiusure del 2026. Spiega le differenze del punto 3.
- La frase del README «0 differenze su 33.632 valori di F»: non è mostrata nell'app e non l'ho ricalcolata.

## Script e screenshot
Cartella `ricerca/qa/1.4.0/numeri2/`:
- **Ricalcolo e confronto**:
  - `lib2.py`: ricalcolo indipendente;
  - `dom2.mjs`: lettura del DOM, con le opzioni `--drop-last-tail`, `--width` e `--theme`;
  - `confronta2.py`: confronto tra DOM e ricalcolo, con l'opzione `--drop`;
  - `scia2.py`: scia della forza relativa.
- **Fonti**:
  - `fonti_confronto.py`: confronto con FRED e BCE;
  - `fonti/`: FRED, BCE, ALFRED e Yahoo, scaricati il 05/11/2026.
- **Statistiche e altre prove**:
  - `h5_indip.py`: statistiche dei testi;
  - `causale2.mjs`: nessun dato futuro;
  - `fail_kpi.mjs` e `trova_fail.mjs`: punto 1;
  - `base_mancante.py`: punto 4.
- **Uscite**: `dom2*.json` e `output/*` (confronti, `fonti_confronto`, `h5_indip`, `causale2`, `alfred`, `krw_intraday`, `yahoo_barre_coda`, `base_mancante`, `fail_kpi`).
- **Screenshot**: `shots/emg-desktop.png`, `emg-telefono-scuro.png`, `emg-senza-cambio-di-oggi.png`, `kpi-fail-KOSPI200.png`, `tip-KOSPI200-2026-11-02-chiaro.png` e `-scuro.png`, `tip-KOSPI200-2026-09-07-telefono-chiaro.png`.
