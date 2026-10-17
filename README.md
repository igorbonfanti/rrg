# Sector Monitor

App web per seguire la **rotazione relativa** dei settori S&P 500, dei titoli MAG7 e di quattro universi globali di ETF in euro (asset class, fattori, regioni, paesi), e per individuare i **possibili bottom** dei settori e dei principali indici azionari, combinando il drawdown degli ETF con la breadth (% di titoli del settore sopra la media a 200 sedute) e un **livello blu** per settore.

Idee ispirate al lavoro di Massimo Rea ([quant-rea.com](https://quant-rea.com/it/)): se vi interessano gli studi completi, li trovate lì. Questo è un mio strumento di studio, con calcoli miei su dati gratuiti: non sostituisce le sue analisi e i numeri possono differire.

Strumento di studio: non è consulenza finanziaria né una raccomandazione di investimento.

🔗 Live: https://igorbonfanti.github.io/rrg/

## Viste
- **1 Monitor**: gli 11 settori ordinati per stato.
  - Stato: Normale, Attenzione, Zona blu, Trigger, Fallito, Cooldown.
  - % di titoli sopra la media 200 contro il livello blu, con il valore di un mese fa.
  - Drawdown dal massimo a 52 settimane: in rosso se più profondo dell'80% della storia del settore.
    - Si calcola sulle chiusure rettificate per i dividendi, come se le cedole fossero reinvestite: è la perdita di chi ha tenuto l'ETF ed è la base di segnali e percentili.
    - Accanto, **Solo prezzo** è lo stesso calcolo sulle chiusure senza la rettifica per i dividendi, come sul grafico di TradingView: stesse sedute, stessa chiusura più alta, quindi i due valori differiscono solo per le cedole staccate dopo il massimo e coincidono per chi non ne paga. Al 29/09/2026 XLU è a −15,1% con i dividendi e a −16,8% sul solo prezzo; GLD a −22,8% in tutte e due.
    - Il «massimo a 52 settimane» della scheda di TradingView è il picco intraday, che dopo una seduta con un forte rovescio sta più in alto della chiusura (GLD il 29/01/2026: 509,70 contro 495,90). La nota lo riporta a parte.
    - Passando sopra le intestazioni e i valori compare la spiegazione, con la chiusura più alta, la sua data e il picco intraday. Di cedole la nota parla solo per chi ne paga: per oro, bitcoin o un ETF ad accumulazione riporta solo il massimo.
  - Quadrante di rotazione contro SPY.
  - Accanto, i settori da osservare con il motivo (quanti punti o chiusure mancano alla zona blu).
- **2 Rotazione**: grafico di rotazione relativa ridisegnato per la leggibilità.
  - L'etichetta identifica il titolo, il colore indica il quadrante. La palette resta distinguibile anche per chi è daltonico.
  - Code dritte e neutre; passando sopra un titolo gli altri si attenuano, con un clic lo si fissa.
  - Scala uguale sui due assi e centrata su 100 (adattata alle code oppure fissa sull'intero periodo). Il punto della settimana in corso è vuoto perché provvisorio.
  - Tabella di rotazione: quadrante, RS-Ratio/RS-Momentum con variazione, direzione in gradi bussola, velocità, distanza dal centro, durata nel quadrante, quadrante precedente.
  - L'interruttore **Prezzi** mostra variazioni, drawdown (con i dividendi e sul solo prezzo) e distanza dalla media 200 per tutto l'universo scelto.
  - Performance base 100 del periodo (3M/6M/1A/2A) con il benchmark e il titolo in evidenza.
- **Universi della rotazione**:
  - USA, in dollari: settori S&P 500 (contro SPY) e MAG7 (contro QQQ).
  - Globali, ETF UCITS in euro quotati in Europa, su cinque livelli:

    | Livello | Contenuto | Benchmark |
    |---|---|---|
    | 1 Asset class | World SWDA, Emergenti EIMI, titoli di Stato area euro 1-3 EM13, 7-10 EM710 e 15+ anni EM15, Oro SGLD, REIT IWDP, Commodity CMOD, Bitcoin in euro | il portafoglio stesso (World 40, EM 10, Gov 1-3 10, Gov 7-10 10, Gov 15+ 10, Oro 10, REIT 5, Commodity 3, BTC 2; ribilanciato a fine mese), oppure liquidità € (XEON) o MSCI World |
    | 2 Fattori | Value IWVL, Quality IWQU, Momentum IWMO, Min Vol MVOL, Small Cap ZPRS, Growth EQQQ (Nasdaq-100: non esiste un ETF UCITS MSCI World Growth), High Div VHYL, Eq Weight MWEQ (dal 2024) | MSCI World (SWDA) oppure ACWI |
    | 3 Regioni | USA CSSPX, Europa SMEA, Giappone SJPA, Pacifico ex-Giappone CSPXJ, Emergenti EIMI | MSCI ACWI (IUSQ, mondo con emergenti) oppure World |
    | 4 Paesi | USA, Canada, Giappone, UK, Svizzera, Germania, Francia, Italia, Spagna, Olanda, Cina, India, Taiwan, Corea, Brasile | MSCI ACWI oppure World |
    | 6 Indici | gli indici della pagina Indici: S&P 500 SXR8, Nasdaq-100 CSNDX, Dow Jones SXRU, Nikkei 225 CSNKY, STOXX Europe 600 EXSA, FTSE 100 XUKX, DAX DBXD, CAC 40 CAC; per la Svizzera MSCI Switzerland XSMI (sullo SMI non c'è un ETF quotato in euro) | MSCI ACWI oppure World |

    Il livello 6 usa quotazioni diverse da quelle del livello 4 anche quando l'indice è lo stesso (SXR8 e CSSPX sono lo stesso fondo): nell'app l'etichetta di un ETF vale per tutti i gruppi, e così i Paesi restano con i loro nomi.

    Nel livello 1, sotto il grafico, il pannello **Portafoglio di riferimento** spiega contro cosa si confronta: le classi (Azioni 50%, Obbligazioni governative euro 30%, Oro e materie prime 13%, Immobiliare 5%, Cripto 2%), i pesi obiettivo di ogni componente e i pesi di oggi, spostati dai prezzi dall'ultimo ribilanciamento. Passando sopra una riga la componente si evidenzia nel grafico. I pesi obiettivo si cambiano con i cursori (o scrivendo il numero): il portafoglio si ricalcola su tutta la storia e grafico, tabelle e performance si aggiornano subito. Se il totale non fa 100% i pesi valgono in proporzione («Porta a 100%» riscrive i numeri). I pesi scelti restano nel browser (`localStorage`) e «Ripristina l'esempio» torna a quelli di `universe.json`.

    Sul grafico gli ETF globali hanno un nome breve (World, Gov 1-3, Oro…); ticker e nome completo sono in tabella. Bitcoin in euro come il resto: nel rapporto con il benchmark conta solo la valuta comune, e per chi investe in euro il rendimento è quello in euro.
  - **5 Asset reali**, in dollari su calendario NYSE: Oro GLD, Argento SLV, Rame CPER, Petrolio USO, Commodity DBC, Bitcoin, TIPS TIP, con Treasury 7-10 IEF e S&P 500 SPY come riferimento. Le grandezze macro entrano come prezzi, perché un tasso o un rendimento non si può mettere al denominatore:

    | Benchmark | Cosa mostra |
    |---|---|
    | Liquidità in dollari (BIL, predefinito) | chi rende più dei T-bill: in pratica il trend assoluto; vale anche per il tasso Fed |
    | Inflazione USA (CPI) | chi guadagna potere d'acquisto; il CPI entra dal giorno di pubblicazione |
    | Senza dollaro (1/DXY) | prezzi nelle valute del paniere del dollar index |
    | Treasury 7-10 anni (IEF) | reale contro nominale |
    | Azioni USA (SPY) | materie prime contro Borsa |
    | Oro (GLD) | tutto misurato in oro |

    Contro liquidità e inflazione, serie lisce, il grafico legge soprattutto il trend assoluto; informazione in più viene dai benchmark che oscillano. Sotto il grafico il pannello **Come leggere i benchmark** spiega ogni scelta (clic su una riga per cambiarla). Gli ETF sono indicatori in dollari; per chi investe in euro l'app cita equivalenti UCITS e l'universo 1.
- **3 Bottom Map**: ogni settore è un punto, con la coda delle ultime 8 settimane.
  - In orizzontale la profondità del drawdown (percentile della storia del settore), in verticale la distanza dal livello blu.
  - In basso a sinistra la zona blu.
  - Accanto, quanti punti e quanti titoli mancano al livello blu.
  - **Avvicinamento** (anello tratteggiato; anche nel Monitor e tra i settori da osservare): breadth sotto la soglia del settore, cioè il livello blu più il calo forte (90° percentile) della sua breadth in 10 sedute (`approachLevel` in `js/signals.js`). In un calo deciso il livello è a circa due settimane. Dal 2005: anticipo mediano circa un mese, 59 tocchi del livello su 73 avvisati, ma meno della metà degli avvicinamenti arriva al livello (`ricerca/attenzione/`, ramo di sviluppo). Non è uno stato: non cambia la macchina a stati né gli alert.
- **4 Settore**: prezzo con la media 200, drawdown e breadth (a 200 e 50 sedute) sullo stesso asse del tempo (3 anni, 10 anni o dal 2005), con le zone blu e i trigger del passato.
  - Livello blu regolabile (vale nel browser, con "Copia configurazione" per portarlo nel repository).
  - Titoli del settore dal più sopra al più sotto la media 200: si vede chi sta per attraversarla.
  - Storico degli episodi con i rendimenti a 1/3/6 mesi e il peggior calo.
  - Link al grafico dell'ETF e della serie breadth su TradingView.
- **5 Alert**: registro dei cambi di stato dal 2005 con statistiche riassuntive, regole e stato delle notifiche Telegram.
- **6 Indici**: la stessa analisi su 22 indici azionari; vedi «Indici» sotto.
  - Di partenza si vedono i 9 principali (`"main": true` in `config/indices.json`: S&P 500, Nasdaq-100, Dow Jones, Russell 2000, STOXX Europe 600, DAX, FTSE MIB, Nikkei 225, MSCI Emerging Markets). Nel riquadro «Indici mostrati», raggruppato per area, un clic aggiunge o toglie un indice; «Principali» e «Tutti» sono le due scelte rapide. La scelta resta nel browser.
  - Tabellone ordinato per stato, Bottom Map degli indici e distanza dal livello blu.
  - Dettaglio con lo stesso grafico dei settori (zone blu e trigger), livello blu regolabile nel browser, situazione, qualità della storia ed episodi con i rendimenti a 3, 6 e 12 mesi.
  - I dati (`data/indices.json`) si scaricano alla prima apertura della pagina.
- **7 Titoli**: dentro i settori; il settore scelto è lo stesso della vista 4 (che ha un pulsante «7 Titoli →»).
  - **Grandi contro piccoli**: per ogni settore e per l'S&P 500, rendimento cap-weighted (pallino pieno) ed equal-weight (pallino vuoto) a 1, 3, 6 mesi, da inizio anno e 12 mesi. La barra è la divergenza: verde acqua se è davanti l'equal-weight, viola se guidano i grandi; le 3 più ampie hanno un anello sul pallino di chi è davanti. A destra la divergenza e come è cambiata in 1 mese. La scia, in secondo piano come nel grafico di Rea, segna con pallini grigi della stessa forma, sempre più piccoli, dove erano i due valori 1 settimana, 1 mese e 3 mesi fa, con una freccia sottile per l'ultima settimana (verde se sale, rossa se scende) (per tutti i settori, per quello scelto o per nessuno). Clic su una riga per scegliere il settore.
  - **Titoli del settore**: una bolla per titolo (area proporzionale al peso nell'S&P 500, oppure tutte uguali); in verticale il rendimento del periodo, in orizzontale la distanza dalla media 200 (predefinito), dal massimo a 52 settimane o il rendimento nel periodo precedente. Linee del settore cap ed equal; in rosso e con l'etichetta gli 8 più in pena, valori estremi fermati al bordo con una freccia.
  - **I più in pena**: i 12 titoli con la media più bassa delle posizioni nel settore per rendimento del periodo e distanza dal massimo; ticker con il link a TradingView.
  - I dati (`data/sector_members.json`) si scaricano alla prima apertura; periodo, scia, ordine, asse e bolle restano nel browser.
  - **Rispetto al grafico di Rea** i numeri sono vicini ma non uguali: per noi 3 mesi sono 63 sedute (per lui 3 mesi di calendario); il suo cap-weighted pesa i rendimenti con la capitalizzazione di oggi (più peso a chi è già salito: valori più alti del rendimento reale di un indice), il nostro usa i pesi di inizio periodo; il suo equal-weight è la media semplice dei membri di oggi, il nostro l'indice con i membri di ogni data e il ribilanciamento trimestrale. Confronto del 16/10/2026 in `ricerca/settori-titoli/confronto-rea.md` (ramo di sviluppo).

**Comandi** (barra in alto, oppure `/`):
- un ETF settoriale (es. `XLU`) apre il dettaglio;
- un altro ticker (es. `NVDA`, anche senza borsa: `SWDA`), un nome breve (es. `ORO`, `INDIA`) o una parola del nome (es. `TESLA`) lo evidenzia nella rotazione, anche cambiando universo; se è il benchmark attuale si passa a un altro benchmark;
- un benchmark (`SPY`, `QQQ`, `ACWI`, `PTF`) apre la rotazione contro di lui;
- `MON`, `ROT` (o `RRG`), `BTM`, `SEC`, `ALRT`, `IDX`, `TIT`, `HELP` aprono le viste e la guida;
- un indice della pagina Indici (`NDX`, `N225`, `SMI`…), se non è anche un ticker della rotazione, apre il suo dettaglio;
- `CHIARO` o `SCURO` scelgono il tema, `TEMA` lo inverte;
- l'indirizzo `#XLU` apre direttamente un settore, `#mon` `#rrg` `#btm` `#sec` `#alr` `#idx` `#tit` una vista; funziona anche il tasto Indietro.

**Tasti**: `1`–`6` viste, `←` `→` periodo, `Spazio` animazione, `Esc` toglie l'evidenza, `?` guida; con il focus sulle schede le frecce passano da una vista all'altra. Le scorciatoie da un tasto si spengono dalla guida. Il pulsante **CVD** mostra su/giù in blu/rosso invece che verde/rosso.

**Tema chiaro**: l'interruttore **Chiaro** accanto a CVD passa al fondo bianco del sistema «Terminale ambra», come in Bond Ladder. Cambia solo il CSS (attributo `data-theme` su `<html>`), non i calcoli; la scelta resta nel browser con la chiave `antigravity-theme`, condivisa con le altre app del sito, e uno script nel `<head>` la applica prima del primo disegno. In stampa la pagina esce sempre nero su bianco.

Sul telefono i grafici si disegnano alla larghezza dello schermo e un tocco su un punto lo fissa.

## Ricerca dei bottom
**Breadth.** Per ogni settore GICS e per l'S&P 500 si conta la % di membri che chiudono sopra la propria media a 20, 50 e 200 sedute.
- Chiusure rettificate per gli split ma non per i dividendi, come le serie S5TH, SUTH… di Barchart/TradingView.
- Storico dal 2005 ricostruito con la composizione dell'indice di allora. I settori dei titoli usciti vengono dalle versioni storiche della lista dei costituenti, riportati alla classificazione GICS attuale.
- Verifica sui valori pubblicati:
  - Utilities (SUTH): 42,85 (27/04/2018), 82,75 (27/07/2018) e 3,57 (22/05/2020), identici;
  - S&P 500 (S5TH): scarto tra 0 e +0,4 punti.
- Una parte dei titoli usciti non ha prezzi disponibili: la copertura dei membri va dal 65% nel 2005 all'80% nel 2009, supera il 90% dal 2014 e il 99% dal 2021. I valori dei primi anni vanno letti con cautela.

**Stati** (`js/signals.js`; parametri e livelli blu in `config/thresholds.json`):
- **Attenzione**: breadth entro 10 punti dal livello blu, oppure drawdown più profondo dell'85% della storia del settore.
- **Zona blu**: breadth ≤ livello blu per 2 chiusure e drawdown oltre il 70° percentile.
- **Trigger**: la breadth risale di almeno max(5 punti, 2 titoli) sopra il livello blu, e di almeno 2 titoli sopra il minimo della zona blu, con una conferma:
  - spinta di breadth (a 20 sedute da ≤15% a ≥70% in 15 sedute, o a 50 sedute da ≤10% a ≥50% in 20);
  - prezzo sopra una media 20 crescente;
  - divergenza prezzo/breadth (prezzo più basso, breadth più alta).

  Le conferme richieste diventano due se la zona blu dura più di 60 sedute o dopo un segnale fallito. Il rimbalzo a V, cioè la breadth di nuovo sopra il livello di riarmo, basta da solo.
- **Fallito**: il prezzo chiude sotto il minimo della zona blu meno un'escursione media giornaliera entro 20 sedute dal trigger, oppure più tardi, finché la breadth non è tornata al livello di riarmo, con la breadth di nuovo sotto il livello blu; si torna in zona blu con due conferme richieste. Il controllo tardivo (dal 16/10/2026) serve ai mercati orso lunghi: prima, un rimbalzo fallito nascondeva le capitolazioni successive (ottobre 2008 – marzo 2009, fine 2002).
- Nel grafico del dettaglio le bande blu chiare sono le sedute con la breadth sotto il livello ma fuori dalla zona blu (dopo un trigger, prima del riarmo, una sola chiusura sotto il livello o drawdown poco profondo): il motivo è nel tooltip.
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

## Indici
Stesso metodo, stessi parametri e stessa macchina a stati dei settori; cambiano solo l'universo e i livelli blu (`config/indices.json`). Ricerca, fonti e validazione in `ricerca/indici/` (ramo di sviluppo).

| Indice | Livello blu | Storia della breadth | Composizione |
|---|---|---|---|
| S&P 500 | 13% (Rea) | dal 2005 | di ogni data (serie SPX della pagina settori) |
| Nasdaq-100 | 18% (Rea) | dal 2008 | di ogni data (github.com/jmccarrell/n100tickers) |
| Dow Jones | 15% (Rea) | dal 2000 (ricostruita dal 1993) | di ogni data (Wikipedia, composizioni storiche) |
| Nikkei 225 | 8% (Rea) | dal 2001 | membri di oggi (CSV ufficiale Nikkei) |
| STOXX Europe 600 | 9% (3° percentile) | dal 2006 | membri di oggi (holdings iShares EXSA) |
| FTSE 100 | 12% (3° percentile) | dal 2001 | membri di oggi (Wikipedia) |
| DAX | 7% (Rea) | dal 2001 | membri di oggi (Wikipedia) |
| CAC 40 | 4% (Rea) | dal 2001 | membri di oggi (Wikipedia) |
| SMI | 3% (Rea) | dal 2001 | membri di oggi (Wikipedia) |

**Indici con limiti** (F4): storia con i membri di oggi, che parte dal mese dopo la prima seduta in cui almeno il 60% dei membri di oggi ha 200 sedute di prezzi. Il motivo dei limiti di ciascuno è in `config/indices.json` (`note`) e nell'app.

| Indice | Prezzo | Livello blu | Storia della breadth | Membri |
|---|---|---|---|---|
| Russell 2000 | ^RUT | 15% (Rea) | dal 09/2017 | holdings iShares IWM (circa 1.970) |
| S&P/TSX 60 | ETF XIU | 23% (3° percentile) | dal 2000 | Wikipedia |
| Euro Stoxx 50 | ^STOXX50E | 7% (3° percentile) | dal 2007 | Wikipedia |
| FTSE MIB | FTSEMIB.MI | 3% (Rea) | dal 2005 | Wikipedia |
| IBEX 35 | ^IBEX | 6% (Rea) | dal 2007 | Wikipedia |
| Hang Seng | ^HSI | 8% (Rea) | dal 2008 | Wikipedia |
| CSI 300 | ETF 510300 | 14% (3° percentile) | dal 2012 | Wikipedia |
| KOSPI 200 | ^KS11 (KOSPI) | 15% (3° percentile) | dal 2006 | Wikipedia |
| Taiwan (MSCI) | ^TWII | 8% (3° percentile) | dal 2003 | holdings iShares EWT |
| Nifty 50 | ^NSEI | 10% (3° percentile) | dal 2007 | Wikipedia |
| S&P/ASX 200 | ^AXJO | 14% (3° percentile) | dal 2008 | Wikipedia |
| MSCI Emerging Markets | ETF EEM | 15% (Rea) | dal 2011 | holdings iShares EEM (circa 1.180; Malesia, Filippine e Abu Dhabi senza prezzi su Yahoo) |
| Ibovespa | ^BVSP | 11% (3° percentile) | dal 2008 | B3 |

Esclusi: KOSPI e TAIEX interi e S&P/TSX Composite (nessuna lista gratuita dei membri).

- **Livelli**: dove esiste, quello letto dai grafici di Massimo Rea; altrimenti il 3° percentile della storia dell'indice. Sui nostri dati i livelli di Rea lasciano sotto la soglia circa il 3% delle sedute (S&P 500 3,0%, settori dal 2,4% al 4%), e la regola ritrova i suoi livelli su S&P 500, Nikkei, CAC e SMI.
- **Membri di oggi**: dove la composizione storica non è disponibile gratis, il passato è ricostruito con i membri attuali; nelle fasi intermedie la breadth risulta 3-6 punti più alta, vicino ai minimi lo scarto è piccolo (verifica sul Nasdaq-100).
- **Prezzo**: indice di solo prezzo in valuta locale; il percentile del drawdown usa la storia dal 2000.
- **Calendari**: le medie si calcolano sulle sedute di ogni titolo; un titolo conta con la sua ultima seduta se è al massimo di 5 giorni prima (lo STOXX 600 mette insieme 17 borse).
- **Risultati storici** (livelli qui sopra, regola del «fallito» tardivo), sui 9 indici della prima fase: contando tutti i trigger, compresi quelli poi falliti, 75 dal 2001 con rendimento mediano a 12 mesi +14,8% e 49 positivi; contando solo l'ultimo trigger di ogni episodio, dal 2005 39 episodi con mediana +18,7% e 34 positivi. Sui 13 indici con limiti, 54 episodi con trigger, mediana +23,4% e 46 positivi, ma con storie che partono quasi tutte dopo il 2007 e quindi senza i mercati orso del 2001-2002. I trigger nei mercati orso lunghi (2001-2002, prima metà del 2008) sono stati spesso rimbalzi falliti: un filtro per questi casi è tra le cose da studiare.

## Metodo della rotazione
Nella pagina Rotazione si sceglie tra due formule: la nuova (predefinita) e quella a medie semplici, che riproduce i valori di StockCharts. Sotto il grafico una nota apribile spiega come si calcolano e cosa cambia. La classica, della prima versione, resta in `js/engine.js` per confronto. Tutte usano solo i dati passati:

```
Nuova (default)
  lr          = ln(prezzo / benchmark)
  σ           = volatilità delle variazioni di lr da una barra all'altra
                (media esponenziale dei quadrati, emivita 26 barre)
  X           = (EMA10(lr) − EMA30(lr)) / (σ·√10)
  RS-Ratio    = 100 + 2,5·X
  RS-Momentum = 100 + 2,5·√8·(X − EMA8(X))

Medie semplici (come StockCharts)
  rs          = prezzo / benchmark
  RS-Ratio    = 100·SMA10(rs) / SMA30(rs)
  RS-Momentum = 100·RS-Ratio / SMA9(RS-Ratio)

Classica (prima versione dell'app)
  RS-Ratio    = 100 + zscore(SMA(prezzo/benchmark, 10), 26)
  RS-Momentum = 100 + zscore(RS-Ratio − RS-Ratio[−4], 26)
```

La formula nuova distingue un trend relativo forte da uno debole: il più forte finisce più a destra. Inoltre non produce salti quando un vecchio dato esce dalla finestra mobile. Divide per la volatilità, quindi mette sulla stessa scala titoli tranquilli e agitati.

La formula a medie semplici non normalizza: la distanza da 100 è uno scarto percentuale, e i titoli con forza relativa più volatile disegnano code più lunghe. È la ricostruzione pubblica dello script AmiBroker «RRG 2.1» di WiseStockTrader, con le medie 10 e 30 che un utente indicava come coincidenti con Refinitiv Eikon. Il 25/09/2026 l'abbiamo confrontata con 11 valori letti su StockCharts (10 settori SPDR in settimanale e XLC in giornaliero): con l'indice S&P 500 come benchmark, come su StockCharts, coincide al centesimo in tutti. Con SPY, il benchmark predefinito dell'app, l'RS-Ratio settimanale esce circa 0,2 più basso per tutti i settori, per via dei dividendi. Sui settori S&P 500 contro SPY, dal 2022, mette un settore nello stesso quadrante della nuova circa tre volte su quattro. Quasi tutta la differenza viene dal tipo di media: esponenziale nella nuova, semplice in questa.

Direzione, velocità e distanza seguono le convenzioni JdK: gradi bussola sull'ultimo spostamento, 0° = su, 90° = destra.

È un'approssimazione indipendente in stile RRG ("Relative Rotation Graphs" è un marchio di RRG Research). Serve a leggere il grafico, non è un segnale operativo.

## Architettura
- **Sito statico** su GitHub Pages: HTML, CSS e moduli JavaScript nativi, senza build step e senza librerie di grafici. I grafici sono SVG disegnati da `js/rrg-chart.js`, `js/perf-chart.js`, `js/bottom-map.js` e `js/sector-chart.js`.
- **Moduli condivisi**: `js/engine.js` (rotazione), `js/signals.js` (breadth e stati), `js/metrics.js`, `js/portfolio.js` (portafoglio sintetico del livello 1, ribilanciato a fine mese) e `js/calendar.js` (calendari NYSE e Borsa Italiana, con l'orario di pubblicazione dei dati). Girano sia nel browser sia negli script della GitHub Action.
- **Font** IBM Plex serviti dal sito (licenza SIL OFL in `fonts/`): nessuna richiesta a terzi.
- **Dati**, aggiornati da `.github/workflows/update-data.yml` dopo la chiusura USA e due volte in recupero (Yahoo pubblica alcune chiusure con ore di ritardo):
  - `scripts/fetch_data.js` → prezzi rettificati dei ticker di `universe.json`, in tre file indipendenti (un ritardo su una borsa, o di FRED, non blocca gli altri). Si pubblica solo l'ultima seduta presente per tutti i ticker e mai dati più vecchi di quelli già pubblicati. Con un argomento aggiorna solo un file: `node scripts/fetch_data.js macro`.
    - `data/prices.json`: universi USA, calendario NYSE.
    - `data/prices_global.json`: universi globali in euro, calendario di Borsa Italiana.
      - Una data entra nel calendario se quota la maggioranza degli ETF attivi; un ETF senza prezzo quel giorno prende l'ultimo prezzo noto.
      - Yahoo inserisce la chiusura europea nella serie solo il giorno dopo: per l'ultima seduta si usa il prezzo finale della quotazione.
      - Il bitcoin quota sempre: si prende il suo ultimo prezzo a ogni seduta di Milano, e si esclude se è fermo da più di 4 giorni.
      - I ticker non in euro si convertono con il cambio.
      - Un prezzo isolato palesemente sbagliato si corregge, si registra nel file e si segnala nell'app. È un salto rispetto al mercato (mediana delle variazioni di tutti gli ETF) che rientra la seduta dopo, molto oltre la normale oscillazione relativa, come il prezzo in dollari al posto di quello in euro visto su alcuni ETF il 24/10/2025.
    - `data/prices_macro.json`: asset reali in dollari, calendario NYSE.
      - ETF USA e bitcoin da Yahoo; bitcoin e dollar index (DX-Y.NYB) quotano fuori dall'orario NYSE, quindi si usa il loro ultimo prezzo a ogni seduta e non contano per la data dei dati.
      - «Senza dollaro» è 10000/DXY, calcolato nella pipeline.
      - «Inflazione USA» è il CPI destagionalizzato (CPIAUCSL, fonte U.S. Bureau of Labor Statistics via [FRED](https://fred.stlouisfed.org/series/CPIAUCSL)), a gradini: ogni mese vale dal giorno in cui è stato pubblicato. Le date di uscita fino ad agosto 2026 vengono dalle vintage ALFRED (`config/cpi_releases.json`); per i mesi successivi la pipeline registra il giorno in cui il dato compare su FRED. Ottobre 2025 non è mai stato pubblicato (shutdown). Se FRED non risponde restano i valori già pubblicati.
      - Stesse regole degli altri file per prezzi anomali, ticker fermi e file già pubblicati.
    - Se risponde meno dell'80% dei ticker, o più del 20% è fermo, resta il file già pubblicato. Una lacuna della fonte non cancella un prezzo già pubblicato.
    - Per ogni ticker, `max52` serve alla colonna «Solo prezzo»: chiusura più alta e ultima chiusura senza la rettifica per i dividendi, sulle stesse 252 sedute del drawdown rettificato (la chiusura pubblicata divisa per il fattore di rettifica di Yahoo), quante cedole ci sono state nel periodo e dopo il massimo (così la nota parla di dividendi solo per chi ne paga) e il massimo intraday per la nota. Il bitcoin quota tutti i giorni: per lui contano anche i fine settimana, nei due valori.
  - `scripts/fetch_breadth.js` scarica circa 500 titoli (circa 2 minuti) e aggiorna:
    - `data/breadth.json`: conteggi per settore;
    - `data/breadth_latest.json`: fotografia titolo per titolo;
    - `data/sectors.json`: storia degli ETF dal 2004, rettificata per i dividendi, più `max52` per la colonna «Solo prezzo», calcolato alla seduta della breadth (`max52At`);
    - `data/sp500_members.json`: lista dei membri con i cambi giorno per giorno;
    - `data/sp500_history.json`: tabella dei cambi con la data di efficacia (Wikipedia, «Historical components of the S&P 500», dal giugno 2024, ricaricata ogni sera) e nome e settore di chi esce;
    - `data/sector_members.json` (vista 7 Titoli, `scripts/lib/capeq.js`): indici cap ed equal-weight di ogni settore simulati giorno per giorno con la composizione dell'epoca (equal-weight ribilanciato dopo il 3° venerdì di marzo, giugno, settembre e dicembre ai prezzi della data di riferimento, come gli indici S&P; cap-weighted con i valori di mercato delle holdings dell'ETF iShares IVV, senza il taglio dei giganti degli ETF SPDR) e i numeri di ogni titolo. Verifica del 16/10/2026: equal-weight in media a 0,5 punti dagli ETF Invesco RSP* su 3M, 6M, YTD e 1A. Se le holdings non arrivano restano i pesi della sera prima; i titoli usciti senza più prezzi (acquisiti) restano fuori e sono elencati nel file.

    Una seduta si pubblica solo con i prezzi di almeno il 99% dei membri; le ultime 5 sedute si ricalcolano.
  - `scripts/fetch_indices.js` aggiorna `data/indices.json` (pagina Indici; formato in `js/indexdata.js`) e le liste in `data/index_members/`. Gira dopo la breadth dei settori, in un passo che non blocca gli altri: circa 4.600 titoli in meno di 3 minuti.
    - Liste dei membri da Wikipedia, dal CSV di Nikkei, dalle holdings iShares (EXSA, IWM, EEM, EWT), dall'API Nasdaq e da B3 (`scripts/lib/members.js`): una lista nuova si accetta solo se il numero di titoli è plausibile e almeno l'80% coincide con l'ultima buona; i cambi si registrano nel file della lista.
    - Prezzi dall'endpoint spark di Yahoo (20 titoli a richiesta); chi ha sedute mancanti si riscarica dall'endpoint chart.
    - Una seduta si pubblica se almeno il 75% dei titoli quotati ha la chiusura di quel giorno; le ultime 5 si ricalcolano.
  - `scripts/backfill_indices.py`: ricostruzione una tantum dello storico degli indici (composizioni in `config/index_history.json`).
  - `scripts/send_alerts.js` → notifiche Telegram e `data/alerts.json`.
  - `scripts/backfill_breadth.py`: ricostruzione una tantum dello storico della breadth; istruzioni nel file.
- Nell'intestazione dell'app un badge indica se i dati sono indietro rispetto all'ultima seduta chiusa.

## Personalizzare
- Universi della rotazione: modifica `universe.json`. La Action lo userà dalla corsa successiva: nomi, etichette e gruppi si aggiornano anche quando i prezzi restano quelli già pubblicati.
  - `groups`: universi USA (ticker Yahoo senza suffisso, benchmark comuni in `benchmarks`).
  - `global`: universi in euro, con simboli Yahoo completi di borsa (`.MI` Milano, `.DE` Xetra, `.PA` Parigi, `.AS` Amsterdam, `.MC` Madrid), nome breve (`label`), benchmark ammessi per gruppo e, per il portafoglio, i pesi (`portfolio.weights`, somma 100) e le classi mostrate nella spiegazione (`portfolio.classes`: ogni componente in una sola classe). Il benchmark `PTF` è il portafoglio sintetico, calcolato nell'app.
  - `macro`: universi in dollari su calendario NYSE, come `global` ma con benchmark sintetici calcolati nella pipeline: `"synthetic": "cpi"` (serie FRED a gradini dal giorno di pubblicazione, `source` = id FRED) e `"synthetic": "inverse"` (inverso di una serie Yahoo, `source` = simbolo).
- Livelli blu e parametri degli stati: `config/thresholds.json`, usato sia dall'app sia dagli alert. I livelli degli indici sono in `config/indices.json` (i parametri restano quelli di `config/thresholds.json`).

## Sviluppo locale
```bash
node scripts/fetch_data.js      # prezzi (Node 20+)
node scripts/fetch_breadth.js   # breadth ed ETF settoriali
node scripts/fetch_indices.js   # pagina Indici
node scripts/send_alerts.js     # registra/invia i nuovi cambi di stato
npx serve .                     # oppure un qualsiasi server statico
npm test                        # test (node --test)
```

## Licenza
Il codice è rilasciato con licenza [MIT](LICENSE): puoi usarlo, modificarlo e ridistribuirlo, anche per scopi commerciali, a condizione di mantenere la nota di copyright e il testo della licenza. È fornito così com'è, senza garanzie.

La licenza copre il codice, non i dati né i font:
- i prezzi in `data/` vengono da Yahoo Finance e restano soggetti alle sue condizioni d'uso;
- il CPI viene dal Bureau of Labor Statistics degli Stati Uniti tramite [FRED](https://fred.stlouisfed.org/series/CPIAUCSL), che chiede di citare la fonte;
- i font IBM Plex hanno la loro licenza, la SIL Open Font License (`fonts/LICENSE-IBM-Plex.txt`).

Proposte e modifiche sono benvenute: apri una issue o una pull request.
