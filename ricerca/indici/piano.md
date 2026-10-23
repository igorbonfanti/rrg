# Piano: pagina «Indici» (breadth a 200 sedute, livello blu, Bottom Map, RRG)

Proposta del 15/10/2026. Nessuna modifica all'app finché il piano non è approvato.
Materiale di partenza in questa cartella: `livelli-rea.md` (livelli letti dai grafici di Rea), `fonti-dati.md` (fonti dati provate una per una), `script/` (script di prova).

## 0. Cosa non cambia

- La parte Settori resta com'è: file dei dati, viste, soglie, alert e test.
- La pagina Indici è una pagina in più. Usa la stessa macchina a stati (`signals.js`), gli stessi parametri e gli stessi grafici, parametrizzati per universo.
- Prima di toccare il codice si salva un'istantanea di riferimento dei settori: stati, episodi e trigger di tutti gli 11 settori su tutta la storia, più il DOM delle viste Bottom Map e Settore.
- Dopo ogni fase l'istantanea deve risultare identica, e questo controllo diventa un test automatico.
- I dati degli indici si caricano solo quando si apre la pagina, così l'avvio dell'app non rallenta.

## 1. Cosa fa Rea e come lo rifacciamo

Rea usa tre elementi:
- la % dei titoli dell'indice sopra la media a 200 sedute;
- un livello blu per ogni indice;
- il prezzo colorato: verde normale, rosso in drawdown, blu con la breadth sotto il livello.

È lo stesso schema dei settori. Noi aggiungiamo quello che c'è già nei settori:
- la zona blu richiede anche il drawdown oltre il 70° percentile;
- il trigger di uscita richiede risalita e conferme;
- dopo un segnale ci sono il fallimento e il cooldown;
- gli episodi storici sono riportati con i rendimenti successivi.

**Calibrazione dei livelli.** Sulla nostra storia (2005-2026) i livelli di Rea lasciano sotto la soglia una quota di sedute quasi costante:

| Serie | Livello Rea | Sedute sotto il livello |
|---|---|---|
| S&P 500 | 13 | 3,0% |
| Settori (11) | 1-11 | dal 2,4% al 4,0%, mediana 3,2% (XLRE 5,8%) |

Proposta per gli indici senza livello di Rea:
- livello = 3° percentile della breadth dell'indice, arrotondato all'intero;
- controllo a vista sui minimi noti (2008, 2011, 2015-16, 2018, 2020, 2022, 2025).

Gli stessi conti si rifanno sugli indici che hanno il livello di Rea, per vedere se la regola li ritrova.

## 2. Indici

Legenda della composizione:
- «epoca»: si usano i membri di ogni data, quindi niente distorsione da sopravvivenza.
- «oggi»: si usano i soli membri attuali. La storia risulta più alta di 3-6 punti nelle fasi intermedie e quasi corretta vicino ai minimi (verifica sul Nasdaq-100, `fonti-dati.md` §1.4).

### Fase 1: dati buoni

| Indice | Prezzo | Lista membri | Storia breadth | Composizione | Livello |
|---|---|---|---|---|---|
| S&P 500 | ^GSPC | già nell'app (`breadth.json`, serie SPX) | 2005 | epoca | 13 (Rea) |
| Nasdaq-100 | ^NDX | API Nasdaq / Wikipedia | 2008 | epoca (n100tickers) | 18 (Rea) |
| Dow Jones | ^DJI | Wikipedia | 1993 | epoca (Wikipedia, circa 60 nomi da mappare a mano) | 15 (Rea) |
| Nikkei 225 | ^N225 | CSV ufficiale Nikkei | 2001 | oggi | 8 (Rea) |
| DAX | ^GDAXI | Wikipedia / EXS1 | 2001 | oggi; epoca in un secondo tempo (Wikipedia dal 1990) | 7 (Rea) |
| CAC 40 | ^FCHI | Wikipedia | 2001 | oggi; epoca in un secondo tempo (fr.wikipedia) | 4 (Rea) |
| SMI | ^SSMI | Wikipedia | 2001 | oggi | 3 (Rea) |
| STOXX Europe 600 | ^STOXX | holdings EXSA (604/604 su Yahoo) | 2006 | oggi | regola del 3% |
| FTSE 100 | ^FTSE | Wikipedia / ISF | 2001 | oggi | regola del 3% |

### Fase 2: con limiti dichiarati

| Indice | Prezzo | Lista membri | Storia breadth | Limite | Livello |
|---|---|---|---|---|---|
| Russell 2000 | ^RUT | holdings IWM (circa 1.970) | affidabile solo 2-3 anni | nessuna composizione storica gratuita; da domani si salva la lista ogni sera | 15 (Rea) |
| FTSE MIB | FTSEMIB.MI | Wikipedia | 2006 | storia dei membri di oggi scarsa prima del 2005 | 3 (Rea) |
| IBEX 35 | ^IBEX | Wikipedia | 2008 | come sopra | 6 (Rea) |
| Hang Seng | ^HSI | Wikipedia | 2010 | l'indice è passato da 50 a circa 85 titoli dal 2020 | 8 (Rea) |
| MSCI EM (EEM) | EEM | holdings EEM (circa 1.130) | 2012 | composizione molto cambiata (Cina A, Arabia) | 15 (Rea) |
| KOSPI 200 (Corea) | ^KS11 | Wikipedia | 2008 | ^KS200 non ha storico su Yahoo | regola del 3% |
| TSX 60 (Canada) | ^GSPTSE | Wikipedia | 2005 | prezzo del Composite, breadth dei 60 | regola del 3% |
| Taiwan | ^TWII | holdings EWT (76) | 2006 | il TAIEX intero non ha lista | regola del 3% |
| Ibovespa (Brasile) | ^BVSP | API B3 | 2010 | | regola del 3% |
| Nifty 50 (India) | ^NSEI | Wikipedia | 2009 | composizione di epoca possibile | regola del 3% |
| CSI 300 (Cina) | 510300.SS (ETF) | Wikipedia | 2013 | l'indice non ha storico su Yahoo | regola del 3% |
| ASX 200 (Australia) | ^AXJO | Wikipedia | 2008 | | regola del 3% |
| Euro Stoxx 50 | ^STOXX50E | Wikipedia / EUN2 | 2008 | facoltativo: si sovrappone a DAX e CAC | regola del 3% |

### Esclusi

- KOSPI intero, TAIEX intero e S&P/TSX Composite intero: non c'è nessuna lista gratuita raggiungibile.
- La storia prima del 2000 (Rea arriva al 1980-1988): sui dati gratuiti mancano i titoli tolti dal listino.

## 3. Regole

**Parametri.** Sono gli stessi dei settori, senza eccezioni: watchBand 10, ddSetup 70, ddWatch 85, setupCloses 2, minRecoveryPoints 5, minRecoveryStocks 2, slowSetupSessions 60, failWindow 20, cooldown 63, resetFloor 40, resetAbove 25.

**Indici piccoli.** I settori hanno già universi di 21-25 titoli (XLE 21, XLC 23, XLB 25), quindi SMI (20), Dow (30) e gli indici da 40 titoli stanno nello stesso intervallo e la regola «almeno 2 titoli» resta valida. Due esempi:
- SMI: livello 3 vuol dire 0 titoli sopra la media. Il trigger chiede almeno 3+10 = 13%, cioè 3 titoli su 20.
- Dow: il trigger chiede 15 + 2 titoli (6,7 punti), cioè circa 22%.

**Percentile del drawdown.** Si calcola sul prezzo dell'indice dal 2000, oppure dal primo dato se è più recente. Così è confrontabile tra indici e non dipende dalla storia breve della breadth (per il Russell 2000 bastano 2-3 anni di breadth, ma il prezzo ha 25 anni).

**Drawdown.** Gli indici sono di solo prezzo, quindi c'è un solo valore di drawdown, quello che si vede su TradingView. Si usa la stessa definizione già adottata: chiusura più alta delle ultime 252 sedute.

**Metodo della breadth.** È lo stesso di `breadth.json`:
- la condizione è chiusura > media della chiusura a N sedute, contando solo i titoli con almeno N sedute;
- le chiusure sono rettificate per gli split, non per i dividendi;
- si registrano 20, 50 e 200 sedute, servono per le spinte di breadth.

**Valuta.** Il prezzo è in valuta locale, come fa Rea. La breadth non dipende dalla valuta.

## 4. Dati e pipeline

**Nuovi file.**
- `config/indices.json`: per ogni indice il simbolo del prezzo, la fonte e il parser dei membri, la mappatura dei suffissi, il livello, la data d'inizio, la qualità (epoca / oggi / storia breve) e l'ETF per la RRG.
- `config/thresholds_indices.json`: livelli e parametri usati dagli alert, separati da quelli dei settori.
- `data/index_breadth.json`: stesso formato di `breadth.json` (date, members, n, a20, a50, a200 per indice) più la copertura.
- `data/indices.json`: prezzi degli indici con max52.
- `data/index_members/<indice>.json`: la lista dei membri salvata ogni sera. Da domani ogni indice accumula così una composizione storica vera.

**`scripts/fetch_indices.js`** gira ogni sera, in un passo separato dopo `fetch_breadth.js`. Il passo ha `continue-on-error`: se fallisce, i settori si pubblicano lo stesso.
- Liste membri: si accetta una lista nuova solo se il numero di titoli è plausibile. Altrimenti si tiene «l'ultima lista buona», come già si fa per l'S&P 500. Wikipedia si legge con pause e con User-Agent; gli URL di iShares sono quelli nuovi.
- Prezzi dei membri: endpoint `spark` di Yahoo, 20 simboli a richiesta, `range=1y`. Sono circa 230 richieste per circa 4.500 titoli, cioè 1-2 minuti misurati.
- Filtri: si scartano i titoli fermi (ultimo dato vecchio) e i ticker riciclati.

**Ricostruzione storica una tantum:** `scripts/backfill_indices.py`. La lancio io da qui, fuori dall'Action, come `backfill_breadth.py`, e il risultato viene committato.
- Nasdaq-100 con la composizione di epoca da n100tickers.
- Dow con la composizione di epoca da Wikipedia.
- Gli altri con i membri di oggi.

**Peso dei file.** `breadth.json` pesa 650 KB per 12 serie. Per 20-25 indici si stima circa 1-1,5 MB, caricati solo nella pagina Indici.

## 5. La pagina

Nuova scheda **«6 Indici»**: le schede 1-5 e le loro scorciatoie restano uguali. Contiene, con la stessa grafica dei settori:

- **Tabellone.** Una riga per indice, raggruppata per area (USA, Europa, Asia-Pacifico, Emergenti). Colonne:
  - stato;
  - breadth 200, livello e distanza dal livello;
  - drawdown e percentile;
  - giorni in zona blu e ultimo trigger;
  - un'etichetta di qualità dei dati (epoca / membri di oggi / storia breve), con la nota al passaggio del mouse.
- **Bottom Map degli indici.** Lo stesso grafico della Bottom Map dei settori, con gli indici al posto dei settori.
- **Dettaglio indice.** Lo stesso grafico del dettaglio settore:
  - prezzo colorato per stato;
  - pannello della breadth con il livello blu;
  - pannello del drawdown;
  - tabella degli episodi con i rendimenti a 1, 3, 6 e 12 mesi;
  - riga della copertura (quanti membri hanno prezzi).
- **Livelli modificabili nell'app**, come per i settori (restano nel browser finché non li copi nel file di configurazione).

**Tecnica.** I moduli di Bottom Map e dettaglio ricevono l'universo come parametro: settori o indici. È un solo codice, quindi la logica è garantita uguale. Il test di non-regressione del §0 dimostra che i settori non cambiano. L'alternativa sarebbe copiare i moduli: è più semplice subito, ma le due copie poi si separano.

## 6. Rotazione (RRG)

Nuovo gruppo **«6 · Indici»** nell'universo globale in euro: ETF UCITS che replicano gli indici. Benchmark predefinito ACWI (IUSQ.DE), in alternativa World (SWDA.MI).

| Indice | ETF |
|---|---|
| S&P 500 | CSSPX.MI |
| Nasdaq-100 | EQQQ.MI (storia dal 2007) |
| Dow Jones | DJE.MI |
| Russell 2000 | ZPRR.DE |
| Nikkei 225 | CSNKY.MI |
| STOXX 600 | EXSA.DE |
| FTSE 100 | ISF.MI |
| DAX | EXS1.DE |
| CAC 40 | CAC.PA (storia più lunga di CACC.PA) |
| FTSE MIB | XMIB.MI |
| SMI | XSMI.MI (MSCI Switzerland: non c'è un UCITS SMI in euro) |
| IBEX 35 | LYXIB.MC |
| Hang Seng | HKDE.AS (MSCI Hong Kong: non c'è un UCITS HSI) |
| Corea | IQQK.DE (non IKOR.MI, fermo dal 2025) |
| Emergenti | IEEM.MI |
| Taiwan | IQQT.DE |
| Canada | CSCA.MI |
| Brasile | IBZL.MI |
| Cina | XCS6.DE |
| India | QDV5.DE |
| Australia | SAUS.MI |

Gli ETF «MSCI di paese» seguono l'indice MSCI del paese, non l'indice locale: va bene per la rotazione e lo segnalo nella nota.

Facoltativo: lo stesso gruppo in dollari (SPY, QQQ, DIA, IWM, EWJ, VGK, EWU…) con benchmark ACWI.

## 7. Alert

Il formato Telegram è lo stesso, con una sezione «Indici» separata. Gli alert dei settori non cambiano.

Proposta: per il primo mese gli eventi degli indici si scrivono solo nel registro dal vivo, senza invio; l'invio parte dopo la validazione.

## 8. Validazione (prima di accendere la pagina)

1. **Confronto con Rea.** Per ogni indice, la nostra breadth ai minimi del 2008, 2011, 2015-16, 2018, 2020, 2022 e 2025, messa a confronto con i suoi grafici: se scende sotto il suo livello negli stessi momenti.
2. **Serie pronte.** NDTH (Nasdaq-100), DITH (Dow) e R2TH (Russell 2000) su una decina di date. È un controllo a vista che fai tu su TradingView: non scarichiamo nulla da lì.
3. **Episodi.** Per ogni indice: le zone blu e i trigger con i rendimenti successivi e il drawdown dopo il segnale, più la frequenza dei segnali. Lo stesso lavoro fatto per i settori.
4. **Livelli.** La regola del 3% applicata agli indici di Rea, per vedere quanto si discosta dai suoi livelli.

Il rapporto va in `ricerca/indici/` sul ramo di sviluppo.

## 9. Fasi (ogni fase si chiude con un controllo insieme)

| Fase | Contenuto | Tocca l'app? |
|---|---|---|
| F0 | piano e ricerca salvati (questo file) | no |
| F1 | `config/indices.json`, ricostruzione storica degli indici di fase 1, rapporto di validazione, proposta dei livelli. **Stop: ti mostro i numeri** | no |
| F2 | pipeline serale e pagina Indici (tabellone, Bottom Map, dettaglio) per la fase 1; test di non-regressione; pubblicazione | sì, solo aggiunte |
| F3 | gruppo «6 · Indici» nella Rotazione | sì, solo aggiunte |
| F4 | indici di fase 2, con le avvertenze | sì |
| F5 | alert Telegram degli indici, dopo il mese di prova | sì |

## 10. Domande aperte

1. **Elenco.** Va bene la divisione fase 1 / fase 2? Ci sono indici da togliere o da aggiungere (per esempio Euro Stoxx 50, ASX 200, CSI 300)?
2. **Livelli senza Rea.** Va bene la regola del 3° percentile, da confermare dopo aver visto i numeri della F1?
3. **Russell 2000.** Lo teniamo con la storia breve (affidabile solo dal 2023-24, poi cresce ogni sera)? Oppure aggiungiamo anche l'S&P SmallCap 600, che ha la composizione su Wikipedia (non ancora provata)?
4. **RRG.** Solo ETF in euro con benchmark ACWI, oppure anche il gruppo in dollari?
5. **Alert.** Va bene un mese di solo registro prima dell'invio su Telegram?

## Stato e cose da fare più avanti (aggiornato il 15/10/2026)

- F0, F1 e F2 fatte. Livelli confermati dall'utente: quelli di Rea, più 9% per lo STOXX 600 e 12% per il FTSE 100 (3° percentile).
- Grafico come quello dei settori: bande blu per la zona blu e triangoli verdi per i trigger. Il prezzo non si colora per lo stato «attenzione».
- **Da studiare più avanti, su richiesta dell'utente:** un filtro contro i rimbalzi nei mercati orso lunghi. Nel 2001-2002 e nella prima metà del 2008, 19 trigger hanno perso in media il 23% in un anno. Va studiato con lo stesso protocollo usato per i settori: regole decise prima, poi verifica.
- F3 fatta (16/10/2026): gruppo «6 · Indici» nella Rotazione con ETF in euro (SXR8, CSNDX, SXRU, CSNKY, EXSA, XUKX, DBXD, CAC, XSMI per la Svizzera), benchmark ACWI o World.
- F4 fatta (16/10/2026): 13 indici con limiti (Russell 2000, TSX 60, Euro Stoxx 50, FTSE MIB, IBEX, Hang Seng, CSI 300, KOSPI 200, Taiwan MSCI, Nifty 50, ASX 200, EEM, Ibovespa); storia dal mese dopo la prima seduta con il 60% dei membri di oggi con 200 sedute; livelli di Rea o 3° percentile; filtro per area nella pagina.
- Ancora aperti: F5 (alert Telegram per gli indici, dopo un mese di prova).
