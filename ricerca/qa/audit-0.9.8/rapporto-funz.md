# Sector Monitor · prova funzionale nel browser (audit 0.9.8)

- **Versione provata**: 0.9.8 (ramo `claude/great-noether-2f1ude`, commit `9a81dd8`), dati EOD al 19/10/2026 (indici al 20/10/2026).
  Durante la prova il ramo è passato alla 0.9.9 (`1befba6`…`4932869`, pubblicati da altre sessioni): rispetto a `9a81dd8` cambiano solo `js/version.js`, `version.json`, i dati del 20/10 e la pipeline. Il codice dell'app (`js/`, `css/`, `index.html`, `guida.html`) è identico, quindi gli esiti valgono per la 0.9.8; le prove sulla versione leggono il numero da `version.json` e hanno controllato quello in uso.
- **Data**: 20/10/2026. Server statico con gzip: `node ricerca/qa/server/gzserve.mjs /home/user/rrg 8805`.
- **Browser**: Chromium headless (Playwright), locale it-IT, fuso Europe/Rome.
- **Profili**: computer 1440×900 con il mouse e telefono 390×844 con il tocco (isMobile, hasTouch), tema scuro e chiaro; la matrice delle viste (`s1`) anche su portatile 1280×720 e tablet 820×1180.
- **Script**: `ricerca/qa/audit-0.9.8/funz/` (script principale `run.cjs`, libreria `lib.cjs`, prove `s1`…`s15`). Esiti grezzi in `funz/res/*.json`, riassunto in `funz/res/sintesi.json`. Screenshot fuori dal repository (variabile `SHOTS`).
  Per rilanciare: avviare il server sulla porta 8805, poi `NODE_PATH=$(npm root -g) node ricerca/qa/audit-0.9.8/funz/run.cjs` (circa 30 minuti; `run.cjs s14` lancia solo le prove che contengono «s14»; `run.cjs --sintesi` rifà solo il riassunto).
- **Repository non modificato** fuori da `ricerca/qa/audit-0.9.8/`. Nessuna richiesta a TradingView: dei link si controllano solo gli indirizzi.

## Sintesi

**2.002 verifiche automatiche, 49 fallite.** Delle fallite, 18 sono falsi positivi già noti dall'audit della 0.9.0 (spiegati in fondo); le altre 31 corrispondono a 4 problemi (F1, F2, F4, F6); altri 5 (F3, F5, F7, F8, F9) li ho trovati provando a mano le frasi della guida. In tutto **9 problemi**: **nessuno bloccante per la 1.0**, **3 da correggere**, **6 minori** (uno è solo un suggerimento). Tutti e tre i problemi da correggere si vedono solo quando un file di dati non arriva o non è leggibile, oppure sono frasi della guida che non corrispondono all'app: nell'uso normale, con i dati presenti, non ho trovato errori.

Funzionano su computer e telefono, in tutti e due i temi, senza errori in console, senza NaN/undefined/Infinity nel testo e senza scorrimento orizzontale della pagina:

- le 7 viste (aperte dalle schede, dai tasti, dagli indirizzi con # e dalla barra dei comandi);
- **Rotazione**: 8 universi, tutti i 25 benchmark, timeframe, formula (la data resta), coda 4/10/16/26, scala Adatta/Massima (ora **salvata** dopo il ricaricamento, come dice la guida), PLAY/STOP, cursore, ← →, Spazio, Esc, pin con clic e con tocco, spunte, Prezzi con 12 ordinamenti verificati sui valori, asterisco dei prezzi ricopiati con la spiegazione, Performance 3M/6M/1A/2A, portafoglio con cursori, caselle, limite 100, «Porta a 100%», «Ripristina l'esempio», pesi salvati, pannello degli asset reali;
- **Bottom Map** (settori e indici): data scorrevole, PLAY, Oggi, frecce, **Crisi passate alla settimana che contiene il minimo con il pulsante acceso** (7 su 7; nella 0.9.0 tutte e 7 mostravano la settimana prima del minimo), **Zoom sulla zona** (assi fissi, salvato, punti di oggi dentro il grafico anche a marzo 2020), tooltip uguali alla «Distanza dal livello blu» e al tabellone, **al tocco primo tocco i numeri e secondo tocco apre** il settore o l'indice;
- **Settore**: 11 settori, periodo 3A/10A/MAX, livello blu −/+ con i limiti 0 e 60, asterisco nel Monitor, Ripristina, Copia configurazione (con e senza permesso degli appunti), «7 Titoli →», **Episodi e Cali forti chiusi di default e ricordati dopo il ricaricamento** (`sm.opened`), cali forti con soglia 5/7/10, sedute 3/5/10, titoli o %, «Preset di Rea» (il focus non si perde più);
- **linea del cursore condivisa** tra grafico principale e cali forti, nei due sensi, nei tre periodi, nelle viste Settore e Indici, **con il mouse e con il tocco** (scarto sotto 1,5 px), e stesse date agli stessi pixel nei due grafici; scala tagliata sui picchi con «▲557 (ott 2008)» e simili;
- **Alert**, **Indici** (10 principali, «Tutti» 22, «Principali», ultimo che non si toglie, scelta salvata, dettaglio, livello blu, mappa, periodo, cali forti, Taiwan senza scheda con il motivo, **0 cali = 0° percentile**), **Titoli** (periodo, scia, ordine, asse, bolle, scelte salvate, storia della divergenza ora all'ultima seduta di ogni settimana: 47 venerdì su 51 punti, gli altri sono vigilie di festa o la seduta di oggi);
- **link a TradingView**: ETF e breadth degli 11 settori, tutti i titoli dei settori, i 22 indici (con S5TH, NDTH, DITH, R2TH, XIU, 510300, KOSPI, EWT dove servono) e i 12 «più in pena», tutti in una scheda nuova con `rel="noopener"`;
- **barra dei comandi**: tutti gli esempi della guida (XLU, xlk, XLK TIT, XLU SEC, XLU GO, NVDA, SWDA, ORO, TESLA, INDIA, BITCOIN, BTC, GLD, SPY anche da un universo globale, QQQ, PTF, NDX, DAX, SMI, N225, FTSEMIB, TWN, **CAC → CAC 40 nella vista 6, CAC.PA → l'ETF nella rotazione**, anche partendo a freddo dal Monitor; MON ROT RRG BTM SEC ALRT ALERT IDX TIT, HELP, GUIDA, CHIARO, SCURO, TEMA), avviso «non trovato» che sparisce dopo 4 s;
- **tasti** 1–7, /, ?, Esc, frecce/Home/Fine sulle schede, scorciatoie spegnibili; **indirizzi** #mon #rrg #btm #sec #alr #idx #tit #XLU #tit-XLK (anche minuscoli e non validi), cambio a mano, **Indietro/Avanti**;
- **preferenze dopo il ricaricamento**: universo, benchmark, formula, coda, timeframe, scala, tema, CVD, pesi, indici mostrati e indice scelto, periodo e scelte della vista 7, cali forti, zoom, pannelli aperti/chiusi;
- **primo avvio** (intro, «Apri la guida», «Ho capito» con il focus che resta su un elemento, intro che non torna, nessuna striscia dei cambi) e **striscia «cosa è cambiato»** che resta ricaricando lo stesso giorno;
- **avviso dei file vecchi** «Nuova versione» (versione diversa, uguale, `version.json` rotto o irraggiungibile, controllo al ritorno sulla scheda, clic che riscarica e ricarica), **badge di freschezza** con l'orologio simulato (7 casi tra il 20 e il 24/10/2026);
- **guida rapida** e **guida.html** (tutte le ancore, le 26 voci dell'indice, i 7 link «Apri…» e i 2 verso l'app, versione, link «Guida completa» alla sezione della vista);
- **spiegazioni al tocco** anche dentro le schede del Monitor e del tabellone degli indici (prima non si leggevano);
- **file mancanti**: per ognuno dei 14 file che l'app scarica, risposta 404, JSON troncato, file vuoto e `{}`: mai NaN/undefined o valori inventati nelle viste; i quattro file obbligatori danno «Impossibile caricare i dati»; cali forti, indici, titoli, alert, breadth dei membri e configurazione degli indici mancanti sono detti con un messaggio.

### Problemi dell'audit 0.9.0: stato

| # 0.9.0 | Problema | Stato nella 0.9.8 |
|---|---|---|
| B1 | Cali forti assenti: colonna degli indici su «…» | **risolto** (E1, E2) |
| B2 | `indices_more.json` assente: nessun avviso | **non risolto**: vedi F1 (il conteggio ora è giusto, l'avviso non compare) |
| B3 | Prezzi globali/asset reali assenti: universo sostituito in silenzio | **in parte**: l'avviso compare aprendo dal Monitor, non aprendo #rrg (F2) |
| B4 | Percentile alto con 0 cali | **risolto** (CF1) |
| B5 | `DAX`, `SMI` aprivano la Rotazione | **risolto** (K1) |
| B6 | `SPY` da un universo globale | **risolto** (K1) |
| B7 | Crisi passate alla settimana prima | **risolto** (B3, I14) |
| B8 | Storia della divergenza non a fine settimana | **risolto** |
| B9 | Telefono: Monitor senza spiegazioni al tocco | **risolto** (TT2, MO2) |
| B10 | Touch: celle del tabellone indici | **risolto** (TT10, TT11, MO3) |
| B11 | `sector_members.json` senza campi | **risolto** (E9) |
| B12 | Senza `config/indices.json` pagina vuota | **risolto** (E11) |
| B13 | Senza `alerts.json` frase falsa | **risolto** (E12) |
| B14 | Portafoglio a zero: «Contro il tuo portafoglio: .» | **risolto**; resta il ritorno silenzioso all'esempio dopo il ricaricamento (F8) |
| B15 | Focus perso dopo «Preset di Rea» e «Ho capito» | **risolto** (C3b, N2) |
| B16 | Focus dei ticker del registro Alert | **risolto** (A6 su #alr) |
| B17 | `<h2>` dentro `<summary>` | **risolto** (A9) |
| B18 | README «1–6» | **risolto** (README riga 99: «1–7») |
| B19 | `SWDA` «non trovato» suggerisce SWDA | **in parte**: non suggerisce più SWDA, ma non dice perché manca (F4) |
| K13 | Scala non salvata | **risolto** (salvata, e la guida lo dice) |

## Problemi trovati, per gravità

### Bloccanti per la 1.0

Nessuno.

### Da correggere

#### F1 · Indici non principali che non arrivano: «altri 12 in arrivo» per sempre
- **Passi**: in localStorage `sm.ixShown=["SPX","NDX","SMI","TSX60"]` e `sm.ixSel="SMI"`; intercettare `data/indices_more.json` con 404, JSON troncato o richiesta interrotta (`page.route(/indices_more\.json/, …)`); aprire `#idx` e aspettare.
- **Atteso**: un avviso che 12 indici non sono disponibili (il codice ha già il testo: «12 indici non disponibili (dati non arrivati: …)»), e un modo di capire perché SMI e TSX60 non ci sono.
- **Ottenuto**: in alto «2 su 10 mostrati · altri 12 in arrivo» per sempre (anche dopo 6 s e dopo «Tutti»: «10 su 10 mostrati · i principali · altri 12 in arrivo»); 10 chip invece di 22; il dettaglio passa da SMI a SPX senza spiegazione.
- **Causa**: `getJSON('data/indices_more.json', true, true)` (`js/app.js`, riga 244) è «opzionale» e in caso di errore restituisce `null` invece di lanciare; in `loadMore()` (`js/indices.js`, righe 77-82) `if (!data || !data.series) return;` esce senza impostare `moreFailed`, quindi il `.catch` con l'avviso non scatta mai.
- **Esiti**: `res/s9_errors_*` (E3), `res/s15_missing_*` (D4 di `indices_more.json`).

#### F2 · Prezzi globali o asset reali che non arrivano, aprendo direttamente la Rotazione: nessun avviso
- **Passi**: `sm.group="1 · Asset class"` (oppure `"5 · Asset reali"`); intercettare `data/prices_global.json` (oppure `data/prices_macro.json`) con 404, JSON troncato o richiesta interrotta; aprire **direttamente** `index.html#rrg` (succede anche ricaricando la pagina mentre si è sulla Rotazione, o da un preferito).
- **Atteso**: come aprendo dal Monitor, l'avviso accanto a «Universo»: «prezzi non arrivati: ETF in euro · l'universo salvato «1 · Asset class» non è disponibile».
- **Ottenuto**: la Rotazione si apre su «Settori S&P 500 vs SPY» senza alcun avviso (`#grpWarn` nascosto); gli universi globali spariscono dal menu. Aprendo dal Monitor e poi la scheda Rotazione, invece, l'avviso c'è.
- **Causa**: `#grpWarn` si scrive solo in `afterExtras()` (`js/app.js`, righe 105-118), che gira solo quando i prezzi arrivano dopo il primo disegno; con `#rrg` nell'indirizzo i prezzi si aspettano prima di `init()` e si passa da `setExtras()` senza scrivere l'avviso (righe 89-95).
- **Esiti**: `res/s9_errors_*` (E5, apertura da #rrg; da #mon è OK).

#### F3 · Guida: «Clic sulle intestazioni per ordinare» nella tabella di rotazione
- **Passi**: `guida.html#rrg`, paragrafo «Tabelle e performance»: «La tabella di rotazione riporta per ogni titolo: quadrante, RS-Ratio … Clic sulle intestazioni per ordinare.» Poi `#rrg` e clic su «RS-Ratio» o «Quadrante».
- **Atteso**: la tabella si ordina, come quella dei Prezzi.
- **Ottenuto**: le intestazioni della tabella di rotazione (`#rotTable`) non sono pulsanti e non ordinano nulla; solo la tabella Prezzi (`#monTable`) ha i pulsanti di ordinamento (`data-sort`). Da decidere se rendere ordinabile la tabella di rotazione o spostare la frase sulla tabella Prezzi.

### Minori

#### F4 · Barra dei comandi senza i prezzi globali: «SWDA non trovato» senza il motivo
- **Passi**: intercettare `data/prices_global.json` (404 o richiesta interrotta), aprire l'app e scrivere `SWDA` (o `ORO`, `CAC.PA`).
- **Atteso**: «SWDA: prezzi degli ETF in euro non disponibili» o simile.
- **Ottenuto**: «"SWDA" non trovato. Prova un ticker (XLU), un nome (ORO, TESLA), MON, ROT o HELP» (sul telefono «"SWDA" non trovato · prova HELP»): suggerisce ORO, che pure manca. Rispetto alla 0.9.0 non suggerisce più SWDA stesso.

#### F5 · Guida: «Ogni intestazione di colonna … ha una spiegazione»
- **Passi**: `guida.html`, «Per cominciare»: «Ogni intestazione di colonna e ogni voce con la sottolineatura a puntini ha una spiegazione». Passare il mouse sulle intestazioni delle tabelle.
- **Ottenuto**: su computer, con le schede aperte, 85 intestazioni di colonna su 98 non hanno spiegazione al passaggio (Monitor 7 su 10, Prezzi 10 su 12, rotazione 9 su 9, Settore 26 su 28, Indici 31 su 34, Titoli 2 su 5). Molte sono ovvie (Settore, Ultimo, 1G), ma alcune abbreviate no: nella tabella di rotazione «Direz.», «Vel.», «Dist.», «sett.», «Prima»; negli episodi «DD ingresso», «Conferma», «Peggior calo 3M»; nei titoli del settore «vs m.200», «DD 52s». La guida le spiega a parole, l'app al passaggio no.
- **Suggerimento**: spiegazione almeno sulle intestazioni abbreviate, oppure frase della guida limitata alle «voci con la sottolineatura a puntini».

#### F6 · File di dati leggibili ma senza i campi attesi (`{}`): errori non gestiti e messaggi tecnici
Non succede con 404, file vuoto o JSON troncato (tutti gestiti bene); succede solo con un JSON valido ma senza i campi (`{}`), che la pipeline difficilmente produce (`check_fresh.js` controlla i file).
- `data/breadth_latest.json` = `{}`: errore non gestito «Cannot read properties of undefined (reading 'filter')» (`js/bottom.js`, riga 444, `latest.members.filter`); nella vista Settore la Situazione e i titoli del settore non si disegnano.
- `data/prices_global.json` o `data/prices_macro.json` = `{}`: `UNHANDLED_REJECTION` in `addPortfolios`/`addMetrics` (`js/app.js`, righe 130 e 212); restano solo gli universi Settori e MAG7, **senza** l'avviso dei prezzi non arrivati (cadono anche gli asset reali se è rovinato solo l'altro file).
- `config/indices.json` = `{}`: tutta l'app mostra «Impossibile caricare i dati (Cannot convert undefined or null to object)», anche se il file è opzionale.
- `data/indices.json` = `{}`: la vista 6 dice «dati non disponibili (Cannot read properties of undefined (reading 'SPX'))».
- `data/prices.json`, `data/sectors.json`, `data/breadth.json`, `config/thresholds.json` = `{}`: il messaggio «Impossibile caricare i dati» è giusto, ma tra parentesi c'è l'errore di JavaScript («Cannot convert undefined or null to object», «Cannot read properties of undefined (reading 'XLK')»).
- **Passi**: `page.route(/<file>\.json/, r => r.fulfill({status: 200, contentType: 'application/json', body: '{}'}))`, aprire `#mon` e le viste. **Esiti**: `res/s15_missing_*` (modo `{}`).

#### F7 · Asset reali: la guida ne elenca 7, il grafico ne mostra 9
- **Passi**: `guida.html#rrg`, tabella degli universi: «5 · Asset reali: Oro, Argento, Rame, Petrolio, Commodity, Bitcoin, TIPS». Poi `#rrg` → universo «5 · Asset reali».
- **Ottenuto**: 9 punti: oltre ai 7 anche SPY e IEF (sono benchmark e compaiono come punti quando non sono il benchmark scelto). Comportamento sensato, ma la guida potrebbe dirlo («più S&P 500 e Treasury, quando non sono il benchmark»).

#### F8 · Portafoglio con tutti i pesi a zero: dopo il ricaricamento torna l'esempio senza dirlo
- **Passi**: `#rrg` → «1 · Asset class» → benchmark Portafoglio → tutti i cursori a 0 (avviso corretto: «Serve almeno un peso sopra zero…»); ricaricare.
- **Ottenuto**: tornano i pesi dell'esempio (totale 100) senza un messaggio. Comportamento ragionevole (un portafoglio vuoto non si salva), segnalato solo perché la scelta dell'utente sparisce in silenzio.

#### F9 · Nomi degli indici nella barra: solo il nome breve
- `KOSPI` o `Kospi` → «non trovato» (il nome breve è `KOSPI200`); `NIKKEI` apre l'ETF CSNKY.MI nella rotazione e non il Nikkei 225 (che si apre con `N225`). È coerente con la guida («scrivendo il nome breve nella barra (NDX, DAX, N225…)»), ma `KOSPI` è un'abbreviazione naturale e oggi non porta da nessuna parte. Suggerimento, non errore.

## Falsi positivi (contati tra le fallite)

- **A6 (14 casi, `s10_a11y`)**: la casella dei comandi `#cmd` non ha l'anello di focus, ma la barra mostra la linea ambra con `:focus-within`. Già accettato nell'audit della 0.9.0.
- **H1 (4 casi, `s7_help`)**: con Tab nella guida rapida il focus passa per un attimo al documento dopo l'ultimo elemento: è il comportamento nativo di `<dialog>` in Chromium, non esce verso la pagina. Già accettato nell'audit della 0.9.0.

Altre segnalazioni degli script che ho verificato a mano e corretto nelle prove (non contate): I9 sul telefono (nelle schede del tabellone percentuale e «253/503» sono attaccati nel testo, i valori coincidono), Z2 (le code tagliate dallo zoom erano contate come punti fuori dal grafico; le teste sono dentro), D1/D4 sui messaggi (la parola «undefined» nell'errore tecnico, l'avviso `#grpWarn` che sta fuori dalla sezione della vista).

## Elenco delle prove

| Script | Cosa prova | Profili | Verifiche | Fallite |
|---|---|---|---|---|
| `s1_*.cjs` | Matrice: 7 viste × profili × temi (apertura, scroll orizzontale, NaN, console) | computer, portatile, tablet, telefono × scuro/chiaro | 192 | 0 |
| `s2_*.cjs` | Rotazione: universi, benchmark, controlli, tabelle, ordinamenti, portafoglio, asset reali, tooltip | computer, telefono × scuro/chiaro | 308 | 0 |
| `s3_*.cjs` | Bottom Map e Settore: data, crisi, PLAY, tooltip, livello blu, cali forti | computer, telefono × scuro/chiaro | 194 | 0 |
| `s4_*.cjs` | Alert e Indici: registro, indici mostrati, tabellone, dettaglio, mappa, cali forti, ricarica | computer, telefono × scuro/chiaro | 174 | 0 |
| `s5_*.cjs` | Titoli: settori, periodi, scia, ordine, asse, bolle, tooltip, link | computer, telefono × scuro/chiaro | 92 | 0 |
| `s6_*.cjs` | Barra dei comandi, tasti, indirizzi #, Indietro/Avanti, ricarica, Nuova versione, intro, striscia dei cambi | computer, telefono × scuro/chiaro | 376 | 0 |
| `s7_*.cjs` | Guida rapida e guida.html | computer, telefono × scuro/chiaro | 98 | 4 |
| `s8_*.cjs` | Spiegazioni al passaggio e al tocco, coerenza Monitor | computer scuro, telefono scuro/chiaro | 41 | 0 |
| `s9_*.cjs` | File opzionali mancanti: messaggi e scelte salvate | computer scuro, telefono chiaro | 66 | 14 |
| `s10_*.cjs` | Accessibilità di base: id, nomi, aria-pressed, focus visibile | computer scuro, telefono chiaro | 92 | 14 |
| `s11_*.cjs` | localStorage corrotto o bloccato, appunti | computer | 5 | 0 |
| `s12_*.cjs` | Badge di freschezza con l'orologio simulato | computer | 7 | 0 |
| `s14_*.cjs` | Novità 0.9.1-0.9.8: pannelli ricordati, linea del cursore, stesse date, link TradingView, zoom, Bottom Map al tocco, 0 cali | computer, telefono × scuro/chiaro | 190 | 0 |
| `s15_*.cjs` | Ogni file scaricato: 404, troncato, vuoto, {} | computer scuro (14 file), telefono chiaro (cali forti e indici) | 167 | 17 |
| **Totale** | | | **2.002** | **49** |

I singoli casi, con il dettaglio di ogni esito, sono in `funz/res/*.json` (campi `id`, `area`, `test`, `ok`, `detail`); le fallite anche in `funz/res/sintesi.json`.
