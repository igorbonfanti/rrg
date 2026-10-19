# Sector Monitor

App web per seguire la **rotazione relativa** dei settori S&P 500, dei titoli MAG7 e di quattro universi globali di ETF in euro (asset class, fattori, regioni, paesi), e per individuare i **possibili bottom** dei settori e dei principali indici azionari, combinando il drawdown degli ETF con la breadth (% di titoli del settore sopra la media a 200 sedute) e un **livello blu** per settore.

Idee ispirate al lavoro di Massimo Rea ([quant-rea.com](https://quant-rea.com/it/)): se vi interessano gli studi completi, li trovate lì. Questo è un mio strumento di studio, con calcoli miei su dati gratuiti: non sostituisce le sue analisi e i numeri possono differire.

Strumento di studio: non è consulenza finanziaria né una raccomandazione di investimento.

🔗 Live: https://igorbonfanti.github.io/rrg/

**Guida**: `guida.html` spiega ogni vista e ogni funzione per chi usa l'app; si apre dalla guida rapida (tasto `?` o pulsante GUIDA) alla sezione della vista in uso, oppure direttamente con `guida.html#btm`, `#sec`, `#tit`…

## Viste
- **1 Monitor**: gli 11 settori ordinati per stato.
  - Stato: Normale, Attenzione, Zona blu, Trigger, Fallito, Cooldown.
  - % di titoli sopra la media 200 contro il livello blu, con il valore di un mese fa e, sotto, quanti titoli su quanti (5/31).
  - Drawdown dal massimo a 52 settimane: in rosso se più profondo dell'80% della storia del settore.
    - Si calcola sulle chiusure rettificate per i dividendi, come se le cedole fossero reinvestite: è la perdita di chi ha tenuto l'ETF ed è la base di segnali e percentili.
    - Accanto, **Solo prezzo** è lo stesso calcolo sulle chiusure senza la rettifica per i dividendi, come sul grafico di TradingView: stesse sedute, stessa chiusura più alta, quindi i due valori differiscono solo per le cedole staccate dopo il massimo e coincidono per chi non ne paga. Al 29/09/2026 XLU è a −15,1% con i dividendi e a −16,8% sul solo prezzo; GLD a −22,8% in tutte e due.
    - Il «massimo a 52 settimane» della scheda di TradingView è il picco intraday, che dopo una seduta con un forte rovescio sta più in alto della chiusura (GLD il 29/01/2026: 509,70 contro 495,90). La nota lo riporta a parte.
    - Passando sopra le intestazioni e i valori compare la spiegazione, con la chiusura più alta, la sua data e il picco intraday. Di cedole la nota parla solo per chi ne paga: per oro, bitcoin o un ETF ad accumulazione riporta solo il massimo.
  - Quadrante di rotazione contro SPY.
  - Accanto, i settori da osservare con il motivo e cosa manca al prossimo stato (es. «per la zona blu: −3 titoli, 2 chiusure»).
  - In alto, **cosa è cambiato dall'ultima visita**: il browser tiene la fotografia dell'ultima visita con i dati di un altro giorno (stato e breadth di ogni settore) e mostra i cambi di stato e le breadth mosse di almeno 5 punti. Ricaricando nello stesso giorno la striscia resta.
  - Sul telefono e sul tablet (fino a 900 px) ogni settore è una scheda (breadth, livello blu, drawdown, rotazione, 1G/1M), come nel tabellone degli indici; sul telefono i settori da osservare vengono prima. Le spiegazioni si aprono al tocco, anche quelle dei valori nelle schede (il nome apre il settore).
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
    | 1 Asset class | World SWDA, Emergenti EIMI, titoli di Stato area euro 1-3 EM13, 7-10 EM710 e 15+ anni EM15, Oro SGLD, REIT IWDP, Commodity CMOD, Bitcoin in euro, Trend (managed futures, DBMFE.PA a Parigi, peso 0) | il portafoglio stesso (World 40, EM 10, Gov 1-3 10, Gov 7-10 10, Gov 15+ 10, Oro 10, REIT 5, Commodity 3, BTC 2, Trend 0; ribilanciato a fine mese), oppure liquidità € (XEON) o MSCI World |
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
  - **Data scorrevole**: con il cursore (o PLAY, una settimana alla volta fino a oggi) la mappa torna a una settimana passata dal 2005; sette scorciatoie portano ai minimi delle crisi (nov 2008, minimo della breadth: il prezzo tocca il fondo il 09/03/2009; ott 2011, feb 2016, dic 2018, mar 2020, ott 2022, apr 2025). A quella data coda, colore dello stato, anello dell'avvicinamento (con la soglia calcolata sulla storia fino a lì) e distanze dal livello blu sono quelli di allora; l'asse verticale resta fisso, così il replay non salta. I livelli blu sono quelli di oggi, scelti conoscendo anche quelle crisi.
  - In orizzontale la profondità del drawdown (percentile della storia del settore), in verticale la distanza dal livello blu.
  - In basso a sinistra la zona blu.
  - Accanto, quanti punti e quanti titoli mancano al livello blu.
  - **Avvicinamento** (anello tratteggiato; anche nel Monitor e tra i settori da osservare): breadth sotto la soglia del settore, cioè il livello blu più il calo forte (90° percentile) della sua breadth in 10 sedute (`approachLevel` in `js/signals.js`). In un calo deciso il livello è a circa due settimane. Nel campione dal 2005 (regola scelta sulla stessa storia): anticipo mediano circa un mese, 59 tocchi del livello su 73 avvisati, ma meno della metà degli avvicinamenti arriva al livello (`ricerca/attenzione/`, ramo di sviluppo). Non è uno stato: non cambia la macchina a stati né gli alert.
- **4 Settore**: prezzo con la media 200, drawdown e breadth (a 200 e 50 sedute) sullo stesso asse del tempo (3 anni, 10 anni o dal 2005), con le zone blu e i trigger del passato.
  - **Perché questo stato**: le condizioni della macchina a stati con ✓/✗ (`explainState` in `js/signals.js`, che usa le stesse funzioni di `runMachine`, e un test controlla che non la contraddica mai). In zona blu: la breadth da raggiungere in titoli e le quattro conferme; dopo il trigger: il prezzo sotto cui il segnale fallisce e fino a quando, riarmo e cooldown. Lo stesso riquadro c'è nella vista 6 per gli indici.
  - Livello blu regolabile (vale nel browser, con "Copia configurazione" per portarlo nel repository).
  - Titoli del settore dal più sopra al più sotto la media 200: si vede chi sta per attraversarla.
  - Storico degli episodi con i rendimenti a 1/3/6 mesi e il peggior calo, e sotto una tabella **per confronto** (`signalContext` in `js/signals.js`): mediane dopo ogni trigger (anche quelli poi falliti), dall'ingresso in zona blu, dopo una seduta qualsiasi della stessa storia e, per i settori, di SPY negli stessi giorni e del settore meno SPY; quante volte positivo scritto come «5 su 6», non in percentuale. Lo stesso confronto (senza SPY) nella vista 6 per gli indici, e in sintesi nella vista 5 Alert.
  - Link al grafico dell'ETF e della serie breadth su TradingView.
- **5 Alert**: registro dei cambi di stato dal 2005 con statistiche riassuntive, regole e stato delle notifiche Telegram.
- **6 Indici**: la stessa analisi su 22 indici azionari; vedi «Indici» sotto.
  - Di partenza si vedono i 10 principali (`"main": true` in `config/indices.json`: S&P 500, Nasdaq-100, Dow Jones, Russell 2000, STOXX Europe 600, DAX, FTSE MIB, Nikkei 225, KOSPI 200, MSCI Emerging Markets). Nel riquadro «Indici mostrati», raggruppato per area, un clic aggiunge o toglie un indice; «Principali» e «Tutti» sono le due scelte rapide. La scelta resta nel browser.
  - Tabellone ordinato per stato, Bottom Map degli indici e distanza dal livello blu.
  - Dettaglio con lo stesso grafico dei settori (zone blu e trigger), livello blu regolabile nel browser, situazione, qualità della storia ed episodi con i rendimenti a 3, 6 e 12 mesi.
  - **Avvicinamento** come per i settori: anello tratteggiato sulla Bottom Map e voce nel tabellone quando la breadth è sotto il livello blu + il calo forte dell'indice in 10 sedute. Sui 22 indici, nel campione: anticipo mediano 20 sedute (9 con la fascia fissa di 10 punti), 96 tocchi del livello su 134 avvisati, 47% degli avvicinamenti arriva al livello.
  - La Bottom Map degli indici ha la stessa data scorrevole della vista 3 (cursore, PLAY, «Oggi», crisi passate) su una griglia di venerdì: a quella data ogni indice usa la sua ultima seduta fino a lì; gli indici che non hanno ancora dati non compaiono e la nota li elenca.
  - I dati si scaricano alla prima apertura della pagina: prima i 10 principali (`data/indices.json`, circa 300 KB compressi), poi in sottofondo gli altri (`data/indices_more.json`). Chiusure e conteggi sono scritti come differenze dalla seduta prima: stessi numeri, file più piccolo di un quarto (formato in `js/indexdata.js`, che legge anche i file nel formato precedente).
- **7 Titoli**: dentro i settori; il settore scelto è lo stesso della vista 4 (che ha un pulsante «7 Titoli →»).
  - **Grandi contro piccoli**: per ogni settore e per l'S&P 500, rendimento cap-weighted (pallino pieno) ed equal-weight (pallino vuoto) a 1, 3, 6 mesi, da inizio anno e 12 mesi. La barra è la divergenza: verde acqua se è davanti l'equal-weight, viola se guidano i grandi; le 3 più ampie hanno un anello sul pallino di chi è davanti. A destra la divergenza e come è cambiata in 1 mese. La scia, in secondo piano come nel grafico di Rea, segna con pallini grigi della stessa forma, sempre più piccoli, dove erano i due valori 1 settimana, 1 mese e 3 mesi fa, con una freccia sottile per l'ultima settimana (verde se sale, rossa se scende) (per tutti i settori, per quello scelto o per nessuno). Clic su una riga per scegliere il settore.
  - **Storia della divergenza** del settore scelto: la stessa divergenza del dumbbell (equal − cap sul periodo scelto) alla fine di ognuna delle ultime 52 settimane, area verde acqua sopra lo zero e viola sotto, con l'S&P 500 tratteggiato; sopra il grafico da quante settimane dura il segno di oggi («davanti l'equal-weight da 7 settimane»), anche nel riquadro di ogni riga del dumbbell. Dati in `hist` di `data/sector_members.json`, calcolati dalla stessa simulazione dei valori di oggi.
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

**Tasti**: `1`–`7` viste, `←` `→` periodo, `Spazio` animazione, `Esc` toglie l'evidenza, `?` guida; con il focus sulle schede le frecce passano da una vista all'altra. Le scorciatoie da un tasto si spengono dalla guida. Il pulsante **CVD** mostra su/giù in blu/rosso invece che verde/rosso.

**Tema chiaro**: l'interruttore **Chiaro** accanto a CVD passa al fondo bianco del sistema «Terminale ambra», come in Bond Ladder. Cambia solo il CSS (attributo `data-theme` su `<html>`), non i calcoli; la scelta resta nel browser con la chiave `antigravity-theme`, condivisa con le altre app del sito, e uno script nel `<head>` la applica prima del primo disegno. In stampa la pagina esce sempre nero su bianco.

Sul telefono i grafici si disegnano alla larghezza dello schermo; un tocco su un punto mostra i suoi numeri (sulla Bottom Map il secondo tocco apre il settore) e un tocco fuori li chiude.

## Ricerca dei bottom
**Breadth.** Per ogni settore GICS e per l'S&P 500 si conta la % di membri che chiudono sopra la propria media a 20, 50 e 200 sedute.
- Chiusure rettificate per gli split ma non per i dividendi, come le serie S5TH, SUTH… di Barchart/TradingView.
- Storico dal 2005 ricostruito con la composizione dell'indice di allora. I settori dei titoli usciti vengono dalle versioni storiche della lista dei costituenti, disponibili dal dicembre 2012, riportati alla classificazione GICS attuale: chi è uscito prima non ha un settore e conta solo nella breadth dell'S&P 500. I settori coprono quindi meno titoli dell'S&P 500 nei primi anni: con i prezzi, 292 membri su 500 nel 2005 (58%), 378 su 500 nel 2009 (76%), 434 su 500 a fine 2012 (87%).
- Verifica sui valori pubblicati:
  - Utilities (SUTH): 42,85 (27/04/2018), 82,75 (27/07/2018) e 3,57 (22/05/2020), identici;
  - S&P 500 (S5TH): scarto tra −0,1 e +0,4 punti su 9 sedute del 2018 e del 22/05/2020.
- Una parte dei titoli usciti non ha prezzi disponibili: la copertura dei membri dell'S&P 500 va dal 65% nel 2005 all'80% nel 2009, supera il 90% dal 2014 e il 99% dal 2021 (per i settori, vedi sopra). I valori dei primi anni vanno letti con cautela.

**Stati** (`js/signals.js`; parametri e livelli blu in `config/thresholds.json`):
- **Attenzione**: breadth entro 10 punti dal livello blu, oppure drawdown più profondo dell'85% della storia del settore.
- **Zona blu**: breadth ≤ livello blu per 2 chiusure e drawdown oltre il 70° percentile.
- **Trigger**: la breadth risale di almeno max(5 punti, 2 titoli) sopra il livello blu, e di almeno 2 titoli sopra il minimo della zona blu, con una conferma:
  - spinta di breadth (a 20 sedute da ≤15% a ≥70% in 15 sedute, o a 50 sedute da ≤10% a ≥50% in 20);
  - prezzo sopra una media 20 crescente;
  - divergenza prezzo/breadth (prezzo più basso, breadth più alta).

  Le conferme richieste diventano due se la zona blu dura più di 60 sedute o dopo un segnale fallito. Il rimbalzo a V, cioè la breadth di nuovo sopra il livello di riarmo, basta da solo.
- **Fallito**: il prezzo chiude sotto il minimo della zona blu meno un'escursione media giornaliera entro 20 sedute dal trigger, oppure più tardi, finché la breadth non è tornata al livello di riarmo, con la breadth di nuovo sotto il livello blu; si torna in zona blu con due conferme richieste. Il giorno del fallimento conta come nuovo minimo della zona blu, per la soglia del fallimento successivo e per la divergenza (dal 19/10/2026: cambiano XLY nel 2008, il trigger SPX dal 12/10 al 10/10/2011 e quello UKX dall'01/04 al 04/04/2008; confronto in `ricerca/qa/audit-0.9.0/a1/`). Il controllo tardivo (dal 16/10/2026) serve ai mercati orso lunghi: prima, un rimbalzo fallito nascondeva le capitolazioni successive (ottobre 2008 – marzo 2009, fine 2002).
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

Dopo ogni aggiornamento la Action invia solo i nuovi cambi di stato (zona blu, trigger, fallito) e li registra in `data/alerts.json`. Le ultime sedute si ricalcolano: se un evento già inviato si sposta di data, il nuovo messaggio dice «Rettifica: spostato dal … al …»; se non risulta più, parte un messaggio «Rettifica … annullato». Il registro della vista Alert lo indica accanto all'evento.

## Versioni
Il numero è in alto accanto al nome (`js/version.js`), con le novità al passaggio del mouse. A ogni pubblicazione si cambia insieme a `version.json`, che il browser legge sempre senza cache: se i due numeri non coincidono, il browser sta usando file vecchi e in alto compare «Nuova versione: ricarica». Schema `0.vista.correzione`: 0 finché l'app è in prova, la cifra di mezzo sale con una funzione nuova, l'ultima con le correzioni.

- **0.9.5** (19/10/2026): viste 4 Settore e 6 Indici. «Episodi in zona blu» diventa richiudibile come «Cali forti», chiuso di default; per tutti e due il browser ricorda se sono aperti (`sm.opened`). Il grafico dei cali forti usa le stesse sedute e la stessa larghezza del grafico principale (le date cadono negli stessi pixel) e la linea verticale del cursore compare in tutti i grafici della vista (`syncX`/`emitX` in `js/format.js`). La scala dei cali forti si ferma a 1,3 volte la soglia di allerta più alta del periodo quando un picco la supera di molto: il valore dei picchi tagliati è scritto in alto (▲557 (ott 2008)), così si leggono anche gli episodi minori (S&P 500 nel periodo MAX: la scala arriva a circa 500 invece di 1.170, e il picco del 2022, 106 titoli, occupa un quinto del pannello invece di un undicesimo). Prova nel browser: `ricerca/qa/browser/v095.cjs` (ramo di sviluppo).
- **0.9.4** (19/10/2026): due decisioni dell'utente sui punti aperti dell'audit. Il giorno del segnale fallito conta come nuovo minimo della zona blu (prima il minimo restava quello di prima del fallimento): cambiano XLY nel 2008 (dopo il trigger del 03/04 una sola zona blu dal 07/10/2008 con trigger il 02/01/2009, al posto di due segnali falliti e due trigger), il trigger SPX dal 12/10 al 10/10/2011 e quello UKX dall'01/04 al 04/04/2008; tra i risultati storici degli indici, l'ultimo trigger di ogni episodio dal 2005 passa a una mediana di +20,6% a 12 mesi. Telegram: rettifica quando il ricalcolo sposta o annulla un evento già inviato.
- **0.9.3** (19/10/2026): robustezza dell'aggiornamento notturno, dalla revisione del codice dell'audit della 0.9.0. `check_fresh.js` controlla anche i prezzi della rotazione, ogni singolo indice e ogni serie dei cali forti; se il prezzo di un indice non arriva il workflow lo segnala; la barra della seduta in corso si scarta anche senza l'orario di contrattazione di Yahoo; ogni richiesta ha un timeout di 30 secondi e il workflow di 45 minuti; un JSON non valido non si pubblica; Telegram parte dopo il push dei dati; azioni fissate per SHA; la breadth pubblica solo sedute NYSE; avvisi per ticker esclusi, sedute degli ETF senza barra e prezzi USA sospetti; prezzi ricopiati segnati anche per i ticker USA. Nell'app: «—» invece di «—%» per i valori mancanti, valori mancanti in fondo agli ordinamenti, cache delle date (la pagina Indici si apre più in fretta) e della soglia di avvicinamento nel replay.
- **0.9.2** (18/10/2026): grafica e telefono, dal controllo grafico e dalla prova funzionale dell'audit della 0.9.0. Tabellone degli indici a schede come il Monitor fino a 900 px (anche sul tablet); grafici disegnati alla larghezza reale sul telefono (testo di circa 10 px invece di 7,7-9); tooltip al tocco su tutti i grafici, sulla Bottom Map primo tocco i valori e secondo tocco apre, spiegazioni al tocco anche nelle schede; Bottom Map con i colori degli stati del Monitor (trigger, fallito, cooldown), «Zoom sulla zona» con gli assi fissi ed etichette che evitano i nomi delle aree; «Perché questo stato» subito dopo il grafico su una colonna; colonne secondarie nascoste sul telefono (detto nelle note); focus da tastiera visibile su pulsanti premuti e schede; fasce della mappa e dei grafici più visibili, sedute fuori dalla zona blu a righe; contrasto dei «5 sed.» dei cali forti; testi della freccia con CVD; scala Adatta/Massima salvata; altri ritocchi (titoli dei pannelli sul telefono, soglia dei cali forti con il valore, intestazioni degli episodi su due righe).
- **0.9.1** (18/10/2026): correzioni dopo l'audit completo della 0.9.0 (cinque controlli indipendenti, rapporti e script in `ricerca/qa/audit-0.9.0/`, ramo di sviluppo).
  - Numeri: il filtro degli errori di stampa dei cali forti scartava cali veri nei giorni di panico seguiti da un rimbalzo (10/10/2008, S&P 500 a −7%: 46 titoli invece di 5, verificato con un conteggio indipendente), storia ricostruita; mediana con un numero pari di casi come media dei due centrali; percentile dei cali forti come quota delle sedute con una somma più bassa (con 0 cali vale 0); i titoli degli indici con una seduta mancante nella fonte spark si riscaricano dall'endpoint chart (FTSE 100 al 16/10: 67 titoli sopra la media a 20, non 66); CSI 300 con 4 decimali (1G del 16/10 −0,14%, non 0,00%); barre «segnaposto» di Yahoo scartate (Milano 13-20/09/2022, Xetra 04-06/12/2023); crisi passate alla settimana che contiene il minimo; storia della divergenza all'ultima seduta di ogni settimana; statistiche di XLRE e XLC dalla prima seduta con il percentile.
  - Avvertenze: prezzi ricopiati dalla seduta prima segnati con un asterisco nella tabella Prezzi; calendario di Milano e bitcoin a mezzanotte UTC; copertura dei settori prima del 2013; copertura iniziale degli indici d'epoca; ticker esclusi dall'aggiornamento; prezzi anomali corretti anche negli asset reali; cali forti, indici o titoli non arrivati detti invece di «…» o pagine vuote.
  - Testi: durata dell'allerta dei cali forti con i dati (mediana di 31,5 sedute in 12 mesi nel 2007-2009, 12 nel 2020, 5 nell'aprile 2025); livelli di Rea e 3° percentile; membri di oggi (+4,3 punti in media); ore dell'aggiornamento; 9 indici nell'universo 6; comandi DAX e SMI al dettaglio dell'indice; altri punti minori.
- **0.9.0** (18/10/2026): **Cali forti (capitolazione)**, dal «Drop giornaliero cumulato» di Quant Rea con il suo preset: quanti titoli perdono almeno il 7% in una seduta, sommati su 5 sedute, con la soglia di allerta al 99° percentile delle sedute precedenti (almeno 5 cali). Scheda richiudibile nel dettaglio di indici e settori (soglia 5/7/10%, 3/5/10 sedute, titoli o %), colonna e riquadro nella tabella degli indici, riga ⓘ in «Perché questo stato» quando c'è stata allerta negli ultimi 3 mesi. Solo contesto: stati, regole e alert non cambiano. Dati in `data/capitulation.json` (`js/capitulation.js`); Taiwan escluso (`noCap`). Prova sui 22 indici in `ricerca/quant-rea/risultati/capitolazione/` (ramo di sviluppo).
- **0.8.10** (18/10/2026): accanto alla breadth, nel Monitor e nel tabellone degli indici, quanti titoli sono sopra la media su quanti (5/31): nei settori piccoli un titolo vale 3 punti. Le statistiche dell'Avvicinamento sono dette «nel campione» (regola scelta sulla stessa storia) nella guida rapida, nella legenda degli stati e nella Situazione.
- **0.8.9** (18/10/2026): guida completa (`guida.html`) con ogni vista e funzione, aperta dalla guida rapida alla sezione della vista in uso.
- **0.8.8** (18/10/2026): data scorrevole, replay e crisi passate anche nella Bottom Map degli indici.
- **0.8.7** (18/10/2026): Bottom Map con la data scorrevole, il replay settimana per settimana e le scorciatoie per le crisi passate.
- **0.8.6** (18/10/2026): la storia della divergenza poteva non comparire perché il browser riusava per 10 minuti la copia vecchia del file dei titoli. I file scaricati dopo l'avvio (titoli, indici, prezzi della rotazione) ora chiedono sempre al server se sono cambiati, e «Nuova versione» riscarica anche i dati.
- **0.8.5** (17/10/2026): vista 7, storia della divergenza grandi/piccoli del settore scelto nelle ultime 52 settimane e da quante settimane guida chi guida. `sector_members.json` ha il campo `hist` (+4 KB compressi); la pipeline lo rigenera subito se manca.
- **0.8.4** (17/10/2026): caricamento più veloce. Il Monitor non aspetta più i prezzi degli universi globali e degli asset reali, che arrivano in sottofondo (aprendo direttamente la rotazione si aspettano, perché l'universo salvato può essere lì); script e piccoli file di configurazione si scaricano subito. Indici divisi in due file e scritti in forma compatta, senza perdita. Su un telefono simulato (6 Mbit/s, processore 4 volte più lento): Monitor da 2,0 a 1,6 s, pagina Indici da 2,7 a 1,7 s dopo il clic, byte da 1,6 a 1,2 MB.
- **0.8.3** (17/10/2026): episodi con il termine di paragone (seduta qualsiasi, SPY negli stessi giorni, settore meno SPY) nelle viste 4, 5 e 6; conteggi «k su n» al posto delle percentuali sui pochi casi. Regole invariate: i rendimenti partono sempre dalla chiusura del giorno del segnale.
- **0.8.2** (17/10/2026): managed futures nella rotazione 1 · Asset class. «Trend» è l'iMGP DBi Managed Futures R EUR UCITS ETF (DBMFE.PA, Euronext Parigi, non coperto dal cambio), con peso 0 nel portafoglio di riferimento: si prova con i cursori. Prima del 28/04/2025 la storia è quella del DBMF americano (stessa strategia) convertito in euro e raccordato al primo prezzo dell'ETF (`history.proxy` in `universe.json`, `spliceHistory` in `scripts/fetch_data.js`). Ricerca in `ricerca/managed-futures/` (ramo di sviluppo).
- **0.8.1** (17/10/2026): tornano i nomi RS-Ratio e RS-Momentum nella rotazione, come prima della 0.8.0.
- **0.8.0** (17/10/2026): «Perché questo stato» con le condizioni ✓/✗ (viste 4 e 6, settori da osservare); cosa è cambiato dall'ultima visita in cima al Monitor; Monitor a schede sul telefono e spiegazioni al tocco; assi e tabella della rotazione con «forza relativa» e «momentum relativo». Regole e numeri invariati.
- **0.7.2** (17/10/2026): correzioni dal giro di prova. Vista 7: comando `XLK TIT`, indirizzo `#tit-XLK`, settore scelto nella cronologia, numeri della riga anche al tocco, etichette uniformi nella lista. Bottom Map: zona blu del colore della legenda nel tema chiaro, pallino intero a drawdown 0. Barra dei comandi: con i settori `SPY` resta il benchmark. Livello blu con i pulsanti spenti ai limiti, ombra sulle tabelle che scorrono di lato. Aggiornamento notturno: una riclassificazione GICS non blocca più la lista dei membri, righe di Wikipedia illeggibili scartate (tabella salvata), avvisi nel workflow quando una fonte resta ferma (`scripts/check_fresh.js`), invii Telegram falliti riprovati per 5 sedute, nessun commit se cambia solo l'ora di generazione (`scripts/keep_unchanged.js`).
- **0.7.1** (17/10/2026): il pulsante «Nuova versione» riscarica pagina, script e stili prima di ricaricare (non serve più Ctrl+F5).
- **0.7.0** (17/10/2026): numero di versione e avviso dei file vecchi; avvicinamento al livello blu (Bottom Map, Monitor, schede di settori e indici); KOSPI 200 tra gli indici principali; vista 7 Titoli in prova (grandi contro piccoli con la scia e le frecce dell'ultima settimana, bolle dei titoli); tasto Indietro tra le viste; crediti a Massimo Rea.

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

**Cali forti (capitolazione).** Per ogni indice e settore, membri con un calo giornaliero di almeno il 5, 7 o 10% (chiusure rettificate per gli split; per l'S&P 500 anche per gli eventi straordinari), con la stessa composizione della breadth. Non contano i cali che la seduta dopo si riprendono quasi tutti quando per gli altri membri quel giorno e il seguente sono tranquilli (mediana entro ±2%: errori di stampa) e i crolli oltre il 60% in giornate normali. L'app somma i conteggi sulle ultime N sedute (preset di Rea: −7% su 5) e segna l'allerta sopra il 99° percentile delle sedute precedenti, dopo 3 anni di storia, con almeno 5 cali. Nella prova sui 22 indici le allerte sono state seguite in media da rendimenti migliori di una seduta qualsiasi, ma quasi tutto il vantaggio viene dai crolli rapidi (2020, 2025); all'inizio dei mercati orso lunghi (2007-2008) sono arrivate presto e si sono ripetute per mesi. Nei 12 mesi dal primo episodio, con i dati dell'app, le serie sono state in allerta 31,5 sedute di mediana nel 2007-2009, 12 nel 2020 e 5 nell'aprile 2025 (`ricerca/quant-rea/script/capitolazione_persistenza.mjs`). Taiwan escluso: la chiusura di Yahoo non rettifica i dividendi in azioni. Nel grafico la scala della somma si ferma a 1,3 volte la soglia di allerta più alta del periodo quando un picco la supera di oltre il 30%: i picchi tagliati hanno il valore scritto in alto e nel tooltip, nessun valore è stimato.

- **Livelli**: dove esiste, quello letto dai grafici di Massimo Rea; altrimenti il 3° percentile della storia dell'indice. Sui nostri dati i livelli di Rea lasciano sotto la soglia circa il 3% delle sedute sull'S&P 500 (3,0%) e sui settori (dal 2,4% al 4%; Real Estate 5,8%). Sugli indici con un livello di Rea il 3° percentile arrotondato coincide su S&P 500 e Russell 2000 ed è a un punto su Nikkei, CAC, FTSE MIB e Hang Seng; è lontano su Nasdaq-100 (11 contro 18), Dow (10 contro 15), DAX (3 contro 7), SMI (0 contro 3), IBEX (4 contro 6) e MSCI Emerging (22 contro 15). Script: `ricerca/qa/audit-0.9.0/testi/livelli.mjs`.
- **Membri di oggi**: dove la composizione storica non è disponibile gratis, il passato è ricostruito con i membri attuali; nella prova sul Nasdaq-100 la breadth risulta in media 4,3 punti più alta (mediana 4,6, da −6,9 a +18,1 nelle singole date), vicino ai minimi lo scarto è piccolo.
- **Prezzo**: indice di solo prezzo in valuta locale; il percentile del drawdown usa la storia dal 2000.
- **Calendari**: le medie si calcolano sulle sedute di ogni titolo; un titolo conta con la sua ultima seduta se è al massimo di 5 giorni prima (lo STOXX 600 mette insieme 17 borse).
- **Risultati storici** (livelli qui sopra, regola del «fallito» tardivo), sui 9 indici della prima fase: contando tutti i trigger, compresi quelli poi falliti, 75 dal 2001 con rendimento mediano a 12 mesi +14,8% e 49 positivi; contando solo l'ultimo trigger di ogni episodio, dal 2005 39 episodi con mediana +20,6% e 34 positivi. Sui 13 indici con limiti, 54 episodi con trigger, mediana +23,4% e 46 positivi, ma con storie che partono quasi tutte dopo il 2007 e quindi senza i mercati orso del 2001-2002. I trigger nei mercati orso lunghi (2001-2002, prima metà del 2008) sono stati spesso rimbalzi falliti: un filtro per questi casi è tra le cose da studiare. Ricalcolo: `ricerca/qa/audit-0.9.0/testi/risultati_indici.mjs`.

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
      - Una data entra nel calendario se quota la maggioranza degli ETF attivi; un ETF senza prezzo quel giorno prende l'ultimo prezzo noto. Il file elenca queste sedute per ogni ETF (`copied`) e la tabella Prezzi le segna con un asterisco quando un prezzo o un rendimento le usa (per esempio lo YTD di CSNDX.MI, che al 30/12/2025 ha il prezzo del 23/12).
      - Yahoo a volte mette barre «segnaposto» al posto delle sedute che non ha: volume 0, apertura, massimo, minimo e chiusura uguali alla chiusura precedente. Si scartano, quindi contano come prezzi mancanti. Per questo mancano le sedute di Milano dal 13 al 20/09/2022 (Yahoo non le ha per la maggior parte degli ETF: il rendimento del 21/09 copre 7 sedute), e dal 04 al 06/12/2023 i 13 ETF di Xetra hanno il prezzo dell'01/12.
      - Il calendario è quello di Milano: per gli ETF di Parigi e Amsterdam lo YTD parte dal 30/12/2025, l'ultima seduta di Milano dell'anno, e la loro seduta del 31/12 finisce nel nuovo anno.
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
    - `data/capitulation.json`, serie SPX e settori: cali forti delle sedute pubblicate (`js/capitulation.js`);
    - `data/sector_members.json` (vista 7 Titoli, `scripts/lib/capeq.js`): indici cap ed equal-weight di ogni settore simulati giorno per giorno con la composizione dell'epoca (equal-weight ribilanciato dopo il 3° venerdì di marzo, giugno, settembre e dicembre ai prezzi della data di riferimento, come gli indici S&P; cap-weighted con i valori di mercato delle holdings dell'ETF iShares IVV, senza il taglio dei giganti degli ETF SPDR) e i numeri di ogni titolo. Verifica del 16/10/2026 (`ricerca/settori-titoli/script/check.mjs`): equal-weight in media a 0,5 punti dagli ETF Invesco RSP* su 3M, 6M, YTD e 1A; il cap-weighted si scosta dagli SPDR soprattutto in Tecnologia, Comunicazioni e Discrezionali, ma al 16/10/2026 di un punto e mezzo anche in Beni di consumo e Materiali su 3 mesi, Real Estate e Materiali su 1 anno. Se le holdings non arrivano restano i pesi della sera prima; i titoli usciti senza più prezzi (acquisiti) restano fuori e sono elencati nel file. Chi non è nelle holdings IVV (uscito senza azioni salvate, appena entrato) pesa come un titolo piccolo del settore, 0,7 volte il 20° percentile dei valori di mercato: è una stima, che sposta i rendimenti al massimo di 0,07 punti (verifica QA del 18/10/2026).

    Una seduta si pubblica solo con i prezzi di almeno il 99% dei membri e solo se è una seduta NYSE; le ultime 5 sedute si ricalcolano con la lista dei membri di oggi (un cambio di composizione sposta quelle sedute di uno o due titoli).
  - `scripts/fetch_indices.js` aggiorna `data/indices.json` e `data/indices_more.json` (pagina Indici; formato in `js/indexdata.js`) e le liste in `data/index_members/`. Gira dopo la breadth dei settori, in un passo che non blocca gli altri: circa 4.600 titoli in meno di 3 minuti.
    - Liste dei membri da Wikipedia, dal CSV di Nikkei, dalle holdings iShares (EXSA, IWM, EEM, EWT), dall'API Nasdaq e da B3 (`scripts/lib/members.js`): una lista nuova si accetta solo se il numero di titoli è plausibile e almeno l'80% coincide con l'ultima buona; i cambi si registrano nel file della lista.
    - Prezzi dall'endpoint spark di Yahoo (20 titoli a richiesta); chi non ha una seduta che ha la maggior parte dei titoli della stessa borsa si riscarica dall'endpoint chart (spark perde sempre le stesse sedute di alcuni titoli). Se il prezzo di un indice non arriva, l'indice non si aggiorna e il workflow lo segnala.
    - Una seduta si pubblica se almeno il 75% dei titoli quotati ha la chiusura di quel giorno; le ultime 5 si ricalcolano.
    - Cali forti degli indici in `data/capitulation.json`, sulle stesse sedute (fuori quelli con `noCap`).
  - `scripts/backfill_indices.py`: ricostruzione una tantum dello storico degli indici (composizioni in `config/index_history.json`).
  - `scripts/backfill_capitulation.py`: ricostruzione una tantum di `data/capitulation.json` (S&P 500 e settori dalla release usata per la breadth, indici dalla cache dei prezzi di `backfill_indices.py`); istruzioni nel file.
  - `scripts/send_alerts.js` → notifiche Telegram e `data/alerts.json`, dopo la pubblicazione dei dati (se il push fallisce non parte nulla, così la corsa dopo non manda doppioni); il registro si pubblica con un secondo commit. Un invio fallito si riprova per 5 sedute e fa fallire l'esito del workflow.
  - `scripts/keep_unchanged.js` (prima del commit): un file che cambia solo per l'ora di generazione non si pubblica. Un file che non è JSON valido (script interrotto durante la scrittura) resta quello pubblicato.
  - Workflow: al massimo 45 minuti, ogni richiesta a Yahoo al massimo 30 secondi (poi si riprova), azioni di GitHub fissate per SHA, credenziali solo nei passi che pubblicano. Un ticker non scaricato o escluso, una seduta di un ETF senza barra e un prezzo USA sospetto (salto isolato rispetto al mercato) compaiono come avvisi nel registro della corsa.
  - `scripts/check_fresh.js` (ultimo passo): se una fonte resta ferma oltre il suo limite (lista dei costituenti 7 giorni, cambi di Wikipedia 7, holdings IVV 10, liste degli indici 14; ETF, prezzi della rotazione USA e degli asset reali, file degli indici e cali forti 4; ETF in euro 6; ogni singolo indice e ogni serie dei cali forti 12, per le feste lunghe delle borse asiatiche) l'esito del workflow fallisce e GitHub manda la mail.
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
