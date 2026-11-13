# Controllo Numeri e Testi · versione 1.3.4 · commit 84bdfee

Verdetto: GO (nessun bloccante né «da correggere»; tre minori da decidere)

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | minore | tooltip `js/indices.js:177`, README riga 235, nota 1.3.4, `NOTES` in `js/version.js` | Con la pulizia dei prezzi che l'app applica davvero (`clean()` di `scripts/fetch_indices.js`, la stessa di `backfill_indices.py`) la media dello scarto è 3,56, cioè «3,6», non 3,49 («3,5»). Cambia un solo titolo, KDP: il −82% del 10/07/2018 (fusione Dr Pepper Snapple / Keurig, con dividendo straordinario) viene preso per un errore di scala e la storia prima viene riscalata; cambiano 4 date (2018-07-13, 2018-10-15, 2019-01-15, 2019-04-15, +1,1/1,2 punti l'una). Mediana 3,6, minimo −6,4, massimo +17,2 e +1,1 sotto il 20% restano uguali. Né lo script della ricerca né il README parlano della pulizia. | `node ricerca/qa/1.3.4/ricalcolo_bias.mjs ricerca/qa/1.3.4/prezzi 5` contro `… 5 clean` | `ricalcolo_prezzi_stale5.json`, `ricalcolo_prezzi_stale5_clean.json` |
| 2 | minore | `ricerca/indici/script/membri_oggi_ndx_regola_app.mjs` riga 42 | Lo script della ricerca tiene l'ultimo prezzo fino a 7 giorni; l'app (`STALE_DAYS = 5` in `fetch_indices.js` e `backfill_indices.py`) fino a 5. Sulle 76 date non cambia niente (stessi risultati con 5 e con 7), ma la regola dichiarata «dell'app» non è la stessa. Anche la richiesta di questo controllo parlava di 7 giorni. | argomento `stale` 5 contro 7 | `ricalcolo_*_stale5*.json` = `ricalcolo_*_stale7*.json` |
| 3 | minore | `ricerca/indici/membri_oggi_ndx_regola_app.json`, campo `metodo` | Rimanda a `script/membri_oggi_ndx.mjs` (la prova vecchia, con l'esclusione) invece che a `membri_oggi_ndx_regola_app.mjs`. Non è nell'app. | lettura del file | — |
| 4 | osservazione | tooltip e README, «vicino ai minimi lo scarto è piccolo» | Sulle 5 date sotto il 20% la media è +1,1, ma i singoli scarti vanno da −3,8 a +7,8 (2008-07-15) e una data è 0 contro 0 (2008-10-15). «+1,1 in media» è giusto; «piccolo» vale per la media, non per ogni data. Da valutare se dire «in media». | `righe` con `epoca < 20` nel json | `ricalcolo_prezzi_stale5.json` |
| 5 | osservazione | README riga 164 (nota della 0.9.10) | Resta «membri di oggi sul Nasdaq-100 rifatti con uno script (+4,5 punti in media)». È una nota storica di versione, corretta per quello che diceva allora; si può aggiungere «(3,5 con la regola dell'app dalla 1.3.4)». | `grep -n "+4,5" README.md` | — |
| 6 | nota per chi pubblica | commit 4d5cd85 (non mio) | Il salvataggio automatico del ramo ha messo in git `ricerca/qa/1.3.4/prezzi/` (101 file, 15 MB di chiusure Yahoo). Si rigenera con `scarica_prezzi.mjs`; le altre ricerche tengono la cache fuori dal repository. Va tolto prima del push se non lo si vuole nel repository pubblico (il ramo di sviluppo contiene `ricerca/`). | `du -sh ricerca/qa/1.3.4/prezzi` | — |

## Numeri ricalcolati (script scritto da zero)

Regola seguita (da `countDay`/`sma` in `scripts/fetch_indices.js` e `breadth_for` in `scripts/backfill_indices.py`): nel denominatore ogni membro con l'ultima chiusura al massimo 5 giorni prima della data; «sopra» se la chiusura supera la media semplice delle ultime 200 chiusure; chi ha meno di 200 chiusure è nel denominatore e non è sopra. Breadth d'epoca: `pct200` dell'NDX da `indexSeries` su `data/indices.json`. Membri di oggi: 101 ticker di `data/index_members/NDX.json`. Date: il 15 di gennaio, aprile, luglio e ottobre o la seduta prima (non prima dell'8), dal 2008, con la breadth d'epoca presente: 76 date (2008-01-15 … 2026-10-15).

| | regola app (1.3.4) | regola vecchia (esclusi i titoli con meno di 200 chiusure) | testo 1.3.4 | testo 1.3.3 |
|---|---|---|---|---|
| media | **3,5** (3,49) | 4,5 | 3,5 | 4,5 |
| mediana | **3,6** | 4,8 | 3,6 (README) | 4,8 |
| minimo | **−6,4** (2010-04-15) | −6,1 | −6,4 / «−6» | −6,1 / «−6» |
| massimo | **+17,2** (2016-04-15) | +19,0 | +17,2 / «+17» | +19,0 / «+19» |
| media con epoca < 20% (5 date) | **+1,1** | +1,3 | +1,1 | +1,3 |

- Prezzi: scaricati di nuovo da Yahoo con `fetchDaily` (101/101) e confrontati con la cache della sessione: 483.163 chiusure confrontate, 0 diverse. I risultati sono identici con le due fonti.
- Le 76 righe coincidono con `ricerca/indici/membri_oggi_ndx_regola_app.json` (data, epoca, oggi entro 0,05, numero di titoli coperti): 76 confrontate, 0 diverse.
- Il controllo può fallire: con la regola vecchia lo stesso script dà 4,5 / 4,8 / −6,1 / +19,0 / +1,3, cioè i numeri della 1.3.3. Il controllo del tooltip nel browser, lanciato su `origin/main` (1.3.3), dà `titleUguale: false` in tutte e 4 le combinazioni.

## Testi

- Tooltip (`js/indices.js:177`): «in media 3,5 punti più alta (da −6 a +17 nelle singole date) … (+1,1 in media con la breadth sotto il 20%)»: giusto, arrotondamenti coerenti con il README.
- README riga 235: 3,5, mediana 3,6, −6,4/+17,2, +1,1 nelle 5 date sotto il 20%: giusti. Script e tabella citati esistono; `ricerca/indici-breadth50/script/bias.mjs` contiene la prova trimestrale come ricalcolo separato. Stile: la frase «Con la stessa regola dell'app per i titoli con meno di 200 sedute, che contano «sotto la media»: la prima versione…» è un po' contorta, ma chiara.
- Nota 1.3.4 nel README e `NOTES`: «+3,5 invece di +4,5, da −6 a +17, +1,1»: coerenti col tooltip. `version.js` e `version.json` dicono tutti e due 1.3.4.
- Numeri vecchi in testi visibili: in `js/`, `index.html`, `guida.html` nessun 4,5, +19, +1,3, 4,8 legato a questa prova (l'unico «+4,5» è nella nota di versione che spiega la correzione). Nel README solo la nota storica della 0.9.10 (rilievo 5). `js/indices.js:404` (riquadro Situazione) non ha numeri ed è coerente. `guida.html` non cita lo scarto.

## Browser (`tooltip.cjs`)

- 1440 px mouse e 390 px tocco, tema chiaro e scuro: 4 combinazioni, 3 elementi «membri di oggi» per combinazione (Nikkei 225, STOXX Europe 600, DAX), testo del `title` identico a quello atteso, elemento visibile, dentro la pagina e raggiungibile (nessun livello sopra). Console: 0 errori, 0 richieste fallite.
- Telefono: il riquadro del tocco mostra il testo intero (257 caratteri, con «(Tocca il nome per aprire.)»), 320×106 px dentro lo schermo 390×844, senza testo tagliato (scrollHeight = clientHeight), leggibile in chiaro e in scuro.
- Computer: il tooltip è quello nativo del browser e non si può fotografare; verificati il testo del `title` e che l'elemento sia raggiungibile col mouse.
- `npm test`: 112 passano, 0 falliscono.

## Cosa ho verificato e passa
5 numeri del README e 3 del tooltip ricalcolati con 2 fonti di prezzi e 2 finestre (8 varianti); 76 righe della tabella; 4 combinazioni nel browser × 3 elementi; ricerca dei numeri vecchi in 5 file; versione in 2 file; test automatici.

## Cosa non ho potuto verificare
La resa del tooltip nativo su computer (non fotografabile); 1280 e 360 px non richiesti.

## Script e output
- `ricerca/qa/1.3.4/scarica_prezzi.mjs` (prezzi in `prezzi/`)
- `ricerca/qa/1.3.4/ricalcolo_bias.mjs` → `ricalcolo_<fonte>_stale<5|7>[_clean].json`
- `ricerca/qa/1.3.4/tooltip.cjs` → `tooltip_risultati.json`, `screenshot/`
