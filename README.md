# Sector Monitor

App web per seguire la **rotazione relativa** dei settori S&P 500 (e di azioni e asset) e per individuare i **possibili bottom settoriali**, combinando il drawdown degli ETF con la breadth (% di titoli del settore sopra la media a 200 sedute) e un **livello blu** per settore.

🔗 Live: https://igorbonfanti.github.io/rrg/

## Viste
- **1 Monitor**: gli 11 settori ordinati per stato.
  - Drawdown dal massimo a 52 settimane: in rosso se più profondo dell'80% della storia del settore.
  - % di titoli sopra la media 200 contro il livello blu, con il valore di un mese fa.
  - Quadrante di rotazione e stato: Normale, Attenzione, Zona blu, Trigger, Fallito, Cooldown.
  - Accanto, gli alert attivi con la spiegazione.
- **2 RRG**: grafico di rotazione relativa ridisegnato per la leggibilità.
  - L'etichetta identifica il titolo, il colore indica il quadrante. La palette resta distinguibile anche per chi è daltonico.
  - Code dritte e neutre; passando sopra un titolo gli altri si attenuano, con un clic lo si fissa.
  - Scala uguale sui due assi e centrata su 100 (adattata alle code oppure fissa sull'intero periodo). Il punto della settimana in corso è vuoto perché provvisorio.
  - Tabella di rotazione: quadrante, RS-Ratio/RS-Momentum con variazione, direzione in gradi bussola, velocità, distanza dal centro, durata nel quadrante, quadrante precedente.
  - L'interruttore **Prezzi** mostra variazioni, drawdown e distanza dalla media 200 per tutto l'universo scelto (settori, MAG7, asset e regioni).
  - Performance base 100 del periodo (3M/6M/1A/2A) con il benchmark e il titolo in evidenza.
- **3 Bottom Map**: ogni settore è un punto, con la coda delle ultime 8 settimane.
  - In orizzontale la profondità del drawdown (percentile della storia del settore), in verticale la distanza dal livello blu.
  - In basso a sinistra la zona blu.
  - Accanto, quanti punti e quanti titoli mancano al livello blu.
- **4 Settore**: prezzo con la media 200, drawdown e breadth (a 200 e 50 sedute) sullo stesso asse del tempo (3 anni, 10 anni o dal 2005), con le zone blu e i trigger del passato.
  - Livello blu regolabile (vale nel browser, con "Copia configurazione" per portarlo nel repository).
  - Titoli del settore dal più sopra al più sotto la media 200: si vede chi sta per attraversarla.
  - Storico degli episodi con i rendimenti a 1/3/6 mesi e il peggior calo.
  - Link al grafico dell'ETF e della serie breadth su TradingView.
- **5 Alert**: registro dei cambi di stato dal 2005 con statistiche riassuntive, regole e stato delle notifiche Telegram.

**Comandi** (barra in alto, oppure `/`):
- un ETF settoriale (es. `XLU`) apre il dettaglio;
- un altro ticker (es. `NVDA`) lo evidenzia nella rotazione, anche cambiando universo;
- `MON`, `RRG`, `BTM`, `SEC`, `ALRT`, `HELP` aprono le viste e la guida;
- l'indirizzo `#XLU` apre direttamente un settore.

**Tasti**: `1`–`5` viste, `←` `→` periodo, `Spazio` animazione, `Esc` toglie l'evidenza, `?` guida. Il pulsante **CVD** mostra su/giù in blu/rosso invece che verde/rosso.

## Ricerca dei bottom
**Breadth.** Per ogni settore GICS e per l'S&P 500 si conta la % di membri che chiudono sopra la propria media a 20, 50 e 200 sedute.
- Chiusure rettificate per gli split ma non per i dividendi, come le serie S5TH, SUTH… di Barchart/TradingView.
- Storico dal 2005 ricostruito con la composizione dell'indice di allora. I settori dei titoli usciti vengono dalle versioni storiche della lista dei costituenti, riportati alla classificazione GICS attuale.
- Verifica sui valori pubblicati:
  - Utilities (SUTH): 42,85 (27/04/2018), 82,75 (27/07/2018) e 3,57 (22/05/2020), identici;
  - S&P 500 (S5TH): scarto tra 0 e +0,4 punti.
- Prima del 2008 una parte dei titoli usciti non ha prezzi disponibili (copertura dal 64% al 78%): quei valori vanno letti con cautela.

**Stati** (`js/signals.js`; parametri e livelli blu in `config/thresholds.json`):
- **Attenzione**: breadth entro 10 punti dal livello blu, oppure drawdown più profondo dell'85% della storia del settore.
- **Zona blu**: breadth ≤ livello blu per 2 chiusure e drawdown oltre il 70° percentile.
- **Trigger**: la breadth risale di almeno max(5 punti, 2 titoli) sopra il livello blu e sopra il minimo, con una conferma:
  - spinta di breadth (a 20 sedute da ≤15% a ≥70% in 15 sedute, o a 50 sedute da ≤10% a ≥50% in 20);
  - prezzo sopra una media 20 crescente;
  - divergenza prezzo/breadth;
  - ritorno sopra il livello di riarmo (rimbalzo a V).

  Le conferme richieste diventano due se la zona blu dura più di 60 sedute o dopo un segnale fallito.
- **Fallito**: entro 20 sedute dal trigger il prezzo rompe il minimo della zona blu.
- **Cooldown**: 63 sedute senza nuovi segnali. Una nuova zona blu richiede prima che la breadth torni sopra max(40%, livello + 25).

**Livelli blu di default** (quant-rea, "200 LEVEL SETTORI"):

| Settore | Livello blu |
|---|---|
| Technology (XLK) | 6% |
| Communication Services (XLC) | 5% |
| Consumer Discretionary (XLY) | 8% |
| Consumer Staples (XLP) | 11% |
| Energy (XLE) | 1% |
| Financials (XLF) | 6% |
| Health Care (XLV) | 11% |
| Industrials (XLI) | 5% |
| Materials (XLB) | 10% |
| Real Estate (XLRE) | 8% |
| Utilities (XLU) | 5% |

Il sistema serve a dirigere l'attenzione, non è una regola di trading validata: gli episodi per settore sono pochi e la breadth bassa arriva spesso in anticipo sul minimo (2008).

**Notifiche Telegram**
1. Crea un bot con @BotFather e scrivigli un messaggio.
2. Ricava il chat id da `https://api.telegram.org/bot<TOKEN>/getUpdates`.
3. Aggiungi al repository i segreti `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` (Settings → Secrets and variables → Actions).

Dopo ogni aggiornamento la Action invia solo i nuovi cambi di stato (zona blu, trigger, fallito) e li registra in `data/alerts.json`.

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
- **Sito statico** su GitHub Pages: HTML, CSS e moduli JavaScript nativi, senza build step e senza librerie di grafici. I grafici sono SVG disegnati da `js/rrg-chart.js`, `js/perf-chart.js`, `js/bottom-map.js` e `js/sector-chart.js`.
- **Moduli condivisi**: `js/engine.js` (rotazione), `js/signals.js` (breadth e stati), `js/metrics.js` e `js/calendar.js` (calendario NYSE). Girano sia nel browser sia negli script della GitHub Action.
- **Dati**, aggiornati da `.github/workflows/update-data.yml` dopo la chiusura USA e due volte in recupero (Yahoo pubblica alcune chiusure con ore di ritardo):
  - `scripts/fetch_data.js` → `data/prices.json`: prezzi rettificati dei ticker di `universe.json`. Si pubblica solo l'ultima seduta presente per tutti i ticker e mai dati più vecchi di quelli già pubblicati.
  - `scripts/fetch_breadth.js` scarica circa 500 titoli (circa 2 minuti) e aggiorna:
    - `data/breadth.json`: conteggi per settore;
    - `data/breadth_latest.json`: fotografia titolo per titolo;
    - `data/sectors.json`: storia degli ETF dal 2004;
    - `data/sp500_members.json`: lista dei membri con i cambi giorno per giorno.

    Una seduta si pubblica solo con i prezzi di almeno il 99% dei membri; le ultime 5 sedute si ricalcolano.
  - `scripts/send_alerts.js` → notifiche Telegram e `data/alerts.json`.
  - `scripts/backfill_breadth.py`: ricostruzione una tantum dello storico della breadth; istruzioni nel file.
- Nell'intestazione dell'app un badge indica se i dati sono indietro rispetto all'ultima seduta chiusa.

## Personalizzare
- Universo della rotazione: modifica `universe.json` (gruppi, ticker, benchmark di default). La Action lo userà dalla corsa successiva.
- Livelli blu e parametri degli stati: `config/thresholds.json`, usato sia dall'app sia dagli alert.

## Sviluppo locale
```bash
node scripts/fetch_data.js      # prezzi (Node 20+)
node scripts/fetch_breadth.js   # breadth ed ETF settoriali
node scripts/send_alerts.js     # registra/invia i nuovi cambi di stato
npx serve .                     # oppure un qualsiasi server statico
npm test                        # test (node --test)
```
