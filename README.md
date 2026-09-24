# Sector Monitor

App web per seguire la **rotazione relativa** dei settori S&P 500 (e di azioni e asset) e, nella seconda fase, per individuare i **possibili bottom settoriali** combinando drawdown e breadth (% di titoli sopra la media a 200 giorni).

🔗 Live: https://igorbonfanti.github.io/rrg/

## Viste
- **1 Monitor**: una riga per titolo dell'universo scelto.
  - Colonne: prezzo, variazioni 1G/1S/1M/3M/YTD, drawdown dal massimo a 52 settimane (in rosso se più profondo dell'80% delle sedute degli ultimi 5 anni), distanza dalla media a 200 giorni, quadrante con direzione e da quanto tempo ci si trova.
  - Accanto, i titoli raggruppati per quadrante.
- **2 RRG**: grafico di rotazione relativa ridisegnato per la leggibilità.
  - L'etichetta identifica il titolo, il colore indica il quadrante. La palette resta distinguibile anche per chi è daltonico.
  - Code dritte e neutre; passando sopra un titolo gli altri si attenuano, con un clic lo si fissa.
  - Scala uguale sui due assi e centrata su 100 (adattata alle code oppure fissa sull'intero periodo). Il punto della settimana in corso è vuoto perché provvisorio.
  - Tabella di rotazione: quadrante, RS-Ratio/RS-Momentum con variazione, direzione in gradi bussola, velocità, distanza dal centro, durata nel quadrante, quadrante precedente. Una spunta nasconde un titolo.
  - Performance base 100 del periodo (3M/6M/1A/2A) con il benchmark e il titolo in evidenza.

Comandi (barra in alto, oppure `/`): un ticker (es. `XLU`) lo evidenzia, anche cambiando universo; `MON`, `RRG`, `HELP`. Tasti: `1` `2` viste, `←` `→` periodo, `Spazio` animazione, `Esc` toglie l'evidenza, `?` guida. Il pulsante **CVD** mostra su/giù in blu/rosso invece che verde/rosso.

## Metodo della rotazione
Due formule selezionabili, entrambe calcolate solo sui dati passati:

```
Nuova (default)
  lr          = ln(prezzo / benchmark)
  σ           = volatilità di lr (media esponenziale dei quadrati, emivita 26 barre)
  X           = (EMA10(lr) − EMA30(lr)) / (σ·√10)
  RS-Ratio    = 100 + 2,5·X
  RS-Momentum = 100 + 2,5·√8·(X − EMA8(X))

Classica (prima versione dell'app)
  RS-Ratio    = 100 + zscore(SMA(prezzo/benchmark, 10), 26)
  RS-Momentum = 100 + zscore(RS-Ratio − RS-Ratio[−4], 26)
```

La formula nuova distingue un trend relativo forte da uno debole: il più forte finisce più a destra. Inoltre non produce salti quando un vecchio dato esce dalla finestra mobile. Direzione, velocità e distanza seguono le convenzioni JdK: gradi bussola sull'ultimo spostamento, 0° = su, 90° = destra.

È un'approssimazione indipendente in stile RRG ("Relative Rotation Graphs" è un marchio di RRG Research). Serve a leggere il grafico, non è un segnale operativo.

## Architettura
- **Sito statico** su GitHub Pages: HTML, CSS e moduli JavaScript nativi, senza build step e senza librerie di grafici. Tutti i grafici sono SVG disegnati da `js/rrg-chart.js` e `js/perf-chart.js`.
- **Dati**: `scripts/fetch_data.js` (Node, nessuna dipendenza) scarica da Yahoo Finance le chiusure rettificate dei ticker di `universe.json` e scrive `data/prices.json`.
  - Si pubblica solo l'ultima seduta presente per **tutti** i ticker: niente prezzi ricopiati dal giorno prima.
  - Un file già pubblicato non viene mai sostituito con dati più vecchi.
  - Nell'intestazione dell'app, un badge indica se i dati sono indietro rispetto all'ultima seduta chiusa (calendario NYSE in `js/calendar.js`).
- **Aggiornamento**: la GitHub Action `.github/workflows/update-data.yml` gira dopo la chiusura USA e due volte in recupero, perché Yahoo pubblica alcune chiusure con ore di ritardo. Committa i dati indicando nel messaggio la data a cui si riferiscono.
- Il calcolo della rotazione avviene nel browser (`js/engine.js`): cambiando universo, benchmark, timeframe o formula si ricalcola al volo.

## Personalizzare l'universo
Modifica `universe.json` (gruppi, ticker, benchmark di default) e lancia `node scripts/fetch_data.js`. La GitHub Action userà il file aggiornato dalla corsa successiva.

## Sviluppo locale
```bash
node scripts/fetch_data.js   # aggiorna data/prices.json (Node 20+)
npx serve .                  # oppure un qualsiasi server statico
npm test                     # test (node --test)
```
