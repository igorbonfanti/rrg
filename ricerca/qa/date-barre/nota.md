# Data delle barre di Yahoo con l'ora legale (5/11/2026)

## Errore

`scripts/lib/yahoo.js` datava ogni barra con `ts + meta.gmtoffset`, cioè con lo scarto dall'ora UTC **di oggi**. Le barre
che Yahoo mette a mezzanotte locale (cambi a Londra, DX-Y.NYB a New York) nel periodo con l'ora legale cadono alle 23:00
UTC (04:00 a New York) del giorno prima: lanciato d'inverno, lo script le datava al giorno precedente. Le barre delle borse
(apertura alle 9:00–10:00 locali) non cambiano giorno.

## Riproduzione (`misura.mjs` → `misura.json`, 5 anni, scaricati il 5/11/2026)

| Simboli | Barre con data spostata | Note |
|---|---|---|
| 6 cambi EURxxx=X | 760 su 1.305 ciascuno | 152 barre finite di domenica |
| DX-Y.NYB | 824 su 1.257 barre con chiusura (997 su 1.521 contando i timestamp con chiusura nulla) | nessuna data doppia fra le barre con chiusura; le 6 date doppie dei 1.521 timestamp cadono su barre nulle (rapporto in `ricerca/qa/1.3.5/codice/`) |
| 47 ETF europei, DBMF, BTC, 9 ETF USA, 22 indici, SPY/XLK/AAPL | 0 | |

## Effetto sui file pubblicati (`effetto.mjs` → `effetto.json`)

La ricostruzione «prima» riproduce i file su `main` del 5/11 (DBMFE.PA entro lo 0,0001%; DXY_INV uguale tranne 14 sedute,
le ultime, con la barra ancora aperta).

- **prices_global.json**: tocca solo DBMFE.PA prima del 28/04/2025, la storia del DBMF convertita in euro con EURUSD=X.
  Il raccordo cade in una data estiva, quindi cambia il fattore (4,5723 → 4,5459): tutta la storia prima del raccordo
  scende dello 0,58% (mediana; massimo 2,25% il 5/07/2022). Rendimenti giornalieri: scarto mediano 0,02 punti, 95° percentile
  1,11, massimo 2,96. Dopo il raccordo nessuna differenza. Gli altri ETF sono in euro e non si convertono.
- **prices_macro.json**: DXY_INV (1/DXY). Con la data vecchia, in 640 sedute su 1.254 il valore era la chiusura della seduta
  **dopo** (un giorno di dato futuro). Scarto di livello: mediana 0,01%, 95° percentile 0,73%, massimo 1,97% (9/04/2025);
  rendimenti giornalieri: mediana 0,13 punti, massimo 3,25.

Il file di `main` è affetto da quando la pipeline gira con l'ora solare: dal 26/10 per i cambi (Londra), dal 2/11 per il
DXY (New York). Prima di quelle date gli stessi file erano corretti (con l'offset estivo le barre invernali restano nel loro giorno).

## A che ora è la «chiusura» (`ora_chiusura.mjs`, barre orarie degli ultimi 3 mesi)

- DX-Y.NYB: la chiusura giornaliera è il prezzo verso le 14:00–15:00 di New York **dello stesso giorno**. Con la data
  corretta DXY_INV della seduta d è il dollaro della seduta d.
- EURUSD=X: la chiusura della barra del giorno d è il prezzo della **sera prima** (19:00–24:00 di Londra; differenza mediana
  0,02%), come in `ricerca/emergenti/dati/dati.md` §5. Con la data corretta, la conversione di toCurrency usa per il DBMF
  (chiusura alle 16:00 di New York del giorno d) il cambio di circa 20 ore prima. Era già così d'inverno; d'estate il codice
  vecchio usava il cambio di circa 3 ore **dopo** la chiusura del DBMF, più vicino nel tempo ma successivo.

## Correzione (sul ramo di sviluppo, non pubblicata)

`barDate(ts, meta)` data la barra nel fuso `meta.exchangeTimezoneName` con l'ora legale di quel giorno (Intl, con una cache
per timestamp: 500 letture di 1.305 barre in 64 ms); senza il nome del fuso resta il `gmtoffset`. Test:
`test/yahoo_dates.test.js` (cambi e DX-Y.NYB scaricati d'estate e d'inverno, più il caso senza fuso); i primi due falliscono
con `yahoo_prima.js` (copia del codice di prima). `npm test`: 115 su 115 (112 di prima più i 3 nuovi).

## Resto dell'app (`membri.mjs` → `membri.txt`)

Campione di 95 simboli: 4 titoli per ognuno dei 21 indici della breadth (21 fusi, Sydney e San Paolo compresi) e gli
11 ETF settoriali USA. Sono 116.766 barre in 5 anni e nessuna cambia data. Con `misura.mjs` (ETF europei, ETF USA,
22 indici, bitcoin) restano toccati solo i cambi e DX-Y.NYB, quindi solo DBMFE.PA (prima del 28/04/2025) e DXY_INV
(benchmark selezionabile nella vista degli asset reali, non predefinito). Avvisi e stati dei settori e degli indici non cambiano.
