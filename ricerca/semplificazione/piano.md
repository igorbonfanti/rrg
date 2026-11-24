# Semplificazione delle note e vista separata per le bolle (fase 1, nessuna modifica all'app)

Analisi del 21/11/2026 sulla versione 1.11.0 (ramo `claude/great-noether-2f1ude`). Due richieste dell'utente:

- **A.** ridurre molto note, postille e avvertenze in tutte le pagine; spostare quello che serve nella guida o in una spiegazione che si apre al passaggio del mouse (o al tocco) su un titolo, un'intestazione, un campo;
- **B.** togliere dalla vista 8 VIX il pannello «Distanza dal massimo degli ultimi 3 anni · le bolle si sgonfiano a rotazione» (con grafico e profilo dei volumi) e dargli un posto suo.

Niente regole, formule o numeri cambiano: si spostano e si accorciano testi. Le statistiche che restano scritte (in pagina, nei riquadri «i» o nella guida) restano quelle di oggi, con i loro script in `ricerca/`.

## In breve

| | Oggi | Dopo (proposta) |
|---|---|---|
| Parole «di nota» **visibili subito** nelle 9 viste, testata e piè di pagina | **4.976** | **1.271** (−74%) |
| Tutte le parole di nota (anche riquadri piegati, guida rapida, testi che compaiono solo in certi casi) | 8.671 | 2.207 |
| Testi spostati in un riquadro «i» (non più in pagina) | — | 252 parole in 10 riquadri, più i `title` già presenti |
| Pagina 8 VIX a 1440 px (altezza dello screenshot) | 3.828 px | 2.604 px, più la vista nuova «0 Massimi» di 1.145 px |
| Pagina 5 Titoli a 1440 px | 2.433 px | 2.047 px |

Raccomandazioni:
1. **Una sola regola per la pagina**: restano solo istruzioni d'uso brevi, stato dei dati, legende brevi e una riga di fonti e citazioni. Il resto va in un riquadro «i» accanto al titolo o all'intestazione, oppure nella guida (sezione con ancora, raggiungibile dal riquadro).
2. **Un solo meccanismo di spiegazione**: un piccolo bottone «i» accanto a titoli e intestazioni, che si apre al passaggio del mouse e al clic, al tocco, con Invio o Spazio, si chiude con Esc o toccando fuori, e ha il link «Nella guida ↗». Prototipo funzionante in `prototipo/`.
3. **Pannello delle bolle in una vista nuova, «0 Massimi»**, decima scheda in coda con il tasto 0 (le altre schede non cambiano numero). Il nome «Massimi» evita la confusione con le «Bolle» del grafico dei titoli nella vista 5.

## File di questa cartella

| File | Cosa contiene |
|---|---|
| `inventario.csv`, `inventario.json` | 260 testi di nota: vista, tipo di elemento, selettore, file:riga, parole, tipo, proposta, destinazione, testo proposto, parole dopo, testo di oggi |
| `titoli.csv` | i 397 `title` HTML già presenti (unici per vista), con dove stanno |
| `inventario_grezzo.json`, `extra.json` | testi letti dalla pagina, prima della classificazione |
| `riepilogo.json` | parole per vista, oggi e dopo; `conta_parole.json`: ricalcolo separato sul prototipo |
| `prima/` | screenshot di tutte le viste a 1440 px, tema scuro (più guida rapida, Monitor alla prima visita, Rotazione con Asset class e Asset reali, Settore e Indici con i riquadri aperti, VIX con il grafico delle bolle aperto) |
| `prototipo/` | `index.html` (copia della pagina con `<base>` verso la radice, quindi js e dati veri), `proto.js` (riquadro «i», scheda 0 Massimi, accorciamento dei testi generati), `proto.css` |
| `dopo/` | screenshot del prototipo: 5 Titoli, 8 VIX, 0 Massimi a 1440 px; un riquadro aperto col mouse e al tocco; barra con 10 schede a 390, 360, 861 e 1100 px |
| `script/` | `inventario_dom.cjs` (legge i testi dalla pagina disegnata e fa gli screenshot «prima»), `extra.cjs` (legenda degli stati, regole, nota del SOXX), `sorgente.py` (file:riga), `classifica.py` (decisioni e riepilogo), `titoli.py`, `prototipo.py`, `dopo.cjs`, `conta_parole.cjs` |

Per rifare tutto (dalla radice del repository, server statico su una porta libera):

```
python3 -m http.server 8871 --bind 127.0.0.1 &
export BASE=http://127.0.0.1:8871/ NODE_PATH=$(npm root -g)
node ricerca/semplificazione/script/inventario_dom.cjs && node ricerca/semplificazione/script/extra.cjs > ricerca/semplificazione/extra.json
python3 ricerca/semplificazione/script/sorgente.py ricerca/semplificazione/inventario_grezzo.json
python3 ricerca/semplificazione/script/classifica.py && python3 ricerca/semplificazione/script/titoli.py
python3 ricerca/semplificazione/script/prototipo.py && node ricerca/semplificazione/script/dopo.cjs && node ricerca/semplificazione/script/conta_parole.cjs
```

Come si contano le parole: sequenze di lettere e cifre (stessa regola nei due script, `\p{L}\p{N}`). I testi generati dai js sono quelli dei dati locali al 12/11/2026. Le legende brevi (meno di 13 parole per voce) e le righe di stato brevi sono tenute in automatico; tutte le altre decisioni sono scritte a mano in `script/classifica.py`.

**Controllo indipendente**: `conta_parole.cjs` riconta nel browser le parole visibili di 5 Titoli e 8 VIX nell'app e nel prototipo, con un selettore diverso. App: 812 e 1.529 (l'inventario: 812 e 1.580, che contano anche la legenda del grafico delle bolle aperto). Prototipo: 205 e 173, più 51 nella vista 0 Massimi (stime dell'inventario: 130, 169 e 85). La differenza sui Titoli è la riga dei dati (`#titData`), che nel prototipo è rimasta intera perché porta un'approssimazione del SOXX: nella fase 2 va nel riquadro «i» della riga SOXX (vedi sotto).

## 1. Inventario riassunto per vista

Parole di nota **visibili subito** (senza riquadri piegati, guida rapida e testi condizionali) e, tra parentesi, tutte.

| Vista | Oggi | Dopo | Cosa pesa di più oggi | Proposta principale |
|---|---|---|---|---|
| Testata e piè di pagina | 116 | 61 | due righe di citazione e una di avvertenza | una riga di fonti con la citazione di Rea e il link «Fonti e note», più l'avvertenza |
| Guida rapida (si apre con ?) | (1.791) | (572) | 6 Indici (252 parole), universi globali (243), avvicinamento (133) | una riga per vista; universi, dati e statistiche nella guida completa |
| 1 Monitor | 440 | 134 | «Come si legge lo stato» (251), introduzione (96), nota sul drawdown (43) | stati in una riga ciascuno, regola completa e statistiche nel riquadro «i» del badge e nella guida |
| 2 Rotazione | 361 (1.158) | 140 | riquadri piegati: formule (279), portafoglio (252), asset reali (214); note delle tabelle (55 e 66) | note delle colonne nei riquadri «i» delle intestazioni; riquadri nella guida (#formule, #portafoglio, #asset-reali) |
| 3 Bottom Map | 135 | 44 | nota della distanza (50) | riquadro «i» sul titolo |
| 4 Settore | 323 (801) | 131 | cali forti (222), episodi (112), nota del SOXX (175, solo SOXX) | una riga con la citazione di Rea; limiti nel riquadro «i» del titolo e nella guida |
| 5 Titoli | 812 | 130 | «Come si legge» (578 in 4 paragrafi) | tolto: i paragrafi diventano riquadri «i» dei titoli; dati e confronto con Rea nella guida |
| 6 Indici | 377 (777) | 183 | come Settore, più la nota del tabellone (96) | come Settore |
| 7 Emergenti | 750 | 144 | Fonti (229), «Come leggere il contesto» (282) | fonti nella guida con un link; definizioni nei riquadri «i» delle intestazioni |
| 8 VIX (senza bolle) | 1.250 | 169 | «Come leggere il VIX» (550), Fonti (195), nota dello scatter (150), tabella (104) | tutto nella guida; una riga di fonti con © Cboe, Rea e Serafini |
| Pannello delle bolle | 330 | 85 | nota del pannello (144), profilo dei volumi (135) | nella vista nuova, una riga sopra e una riga di fonti sotto |
| 9 Alert | 82 (116) | 50 | due note da 28 e 31 parole | accorciate |

Per tipo (260 voci): 88 legende, 49 spiegazioni del metodo, 46 righe sullo stato dei dati, 42 istruzioni d'uso, 19 approssimazioni o limiti, 10 fonti e citazioni, 6 avvisi. Proposte: 169 TENERE (quasi tutte legende brevi e righe di stato), 58 ACCORCIARE, 14 SPOSTARE NELLA GUIDA, 10 SPOSTARE IN TOOLTIP, 9 TOGLIERE (ripetute altrove). Il dettaglio, con il testo proposto, è in `inventario.csv`.

Ripetizioni trovate (si tolgono senza perdere nulla):
- nota sul drawdown del Monitor = `title` delle colonne «Drawdown» e «Solo prezzo» = glossario;
- legenda dei mini-grafici del VIX (`.vxsplegend`) = `title` dell'intestazione «Andamento del VIX»;
- «Solo contesto» del VIX e degli Emergenti scritto due volte nella stessa vista;
- citazione di Rea nel piè di pagina, nella guida rapida e in guida.html#limiti;
- «Come si legge» dei Titoli, «Come leggere il VIX», le formule e il portafoglio: quasi tutto c'è già nella guida.

Testi che **non** sono nella guida e vanno aggiunti prima di toglierli dalla pagina: verifica con StockCharts (11 letture del 25/09/2026) e lo scarto di circa 0,2 con SPY (formule); scarto dagli ETF Invesco RSP (0,47 punti su 60 confronti) e dagli SPDR (1,6-1,7 punti) e il testo completo «Perché non coincide con il grafico di Rea» (Titoli); CPI di ottobre 2025 mai uscito, dollar index inverso, equivalenti europei SGLD ecc. (Asset reali); «15 su 17» della valuta (Emergenti); «89 tocchi su 132» degli indici (guida rapida; script in `ricerca/avvicinamento-uso/`); istruzioni per i segreti di Telegram (restano nel riquadro piegato «Per chi gestisce il repository»).

## 2. Cosa resta nella pagina (regole proposte)

1. **Restano scritte nella pagina**:
   - istruzioni d'uso brevi, accanto al controllo a cui servono («Clic su una riga per il grafico», al massimo 15 parole);
   - stato dei dati: date, «provvisorio», «al …», quante sedute indietro (le righe `.meta`);
   - legende dei grafici, una voce breve per colore o segno (al massimo 12 parole);
   - **una riga di fonti per vista**, in fondo, con le citazioni obbligatorie e il link «Fonti e note ↗» alla guida (vedi sotto);
   - le approssimazioni che cambiano la lettura del numero che si sta guardando, in una frase: «provvisorio», «storia con i membri di oggi», «solo prezzo nella valuta dell'indice», «ultimo prezzo noto» (asterisco).
2. **Vanno nel riquadro «i»** (accanto al titolo del pannello o all'intestazione della colonna): definizioni, come si legge un grafico, perché un numero è fatto così, limiti di un dato specifico. Da 1 a 3 frasi (al massimo 60 parole), più «Nella guida ↗».
3. **Vanno nella guida**: metodo, verifiche e criteri, statistiche del campione con il percorso dello script, fonti complete con le condizioni d'uso, storia delle scelte («scelta dell'utente del …»).
4. **Si tolgono**: ripetizioni, frasi «sul telefono X è nascosta» (lo dice già guida.html#schermo), «clic su un'intestazione per ordinare».
5. **Ogni approssimazione resta a un passo** dal numero: nella pagina, nel riquadro «i» di quel pannello o nella sezione della guida aperta dal riquadro. Nessuna approssimazione solo nel README.
6. Un numero che si sposta nel riquadro o nella guida porta con sé il riferimento al suo script (come oggi «Ricalcolo: ricerca/vix/…»).

### Citazioni obbligatorie: dove restano

| Citazione | Oggi | Dopo |
|---|---|---|
| Massimo Rea (quant-rea): livelli blu e idee | piè di pagina (2 righe), guida rapida, Livello blu, Cali forti, VIX, Titoli | **piè di pagina di ogni vista** in una riga con il link a quant-rea.com; «Livello di default: tabella «200 LEVEL SETTORI» di Massimo Rea» nel riquadro Livello blu (Settore e Indici); «Preset «Drop giornaliero cumulato» di Massimo Rea» nella riga dei Cali forti; «idea di Massimo Rea» nella riga di fonti del VIX |
| Stefano Serafini (Swiss Capital School) | Fonti del VIX, guida | riga di fonti del VIX e guida.html#vix-struttura |
| Francesco Caruso (Cicli&Mercati) | nota del pannello delle bolle, guida | riga di fonti della vista 0 Massimi e guida.html#massimi |
| Cboe (VIX e VIX3M), FRED | Fonti del VIX (195 parole) | «VIX e VIX3M © Cboe, da FRED» nella riga di fonti; il testo completo (con «che la ripubblica con il permesso di Cboe», date d'inizio, ultima seduta provvisoria) in guida.html#fonti-vix |
| Federal Reserve H.10, DTWEXEMEGS | Fonti degli Emergenti (229 parole) | guida.html#fonti-emg; nella pagina restano «Fed fino al …, poi Yahoo provvisorio» e «dollaro FRED al …» |
| Yahoo Finance, iShares, Wikipedia | piè di pagina, note | riga del piè di pagina e guida.html#dati |
| «Relative Rotation Graphs» marchio di RRG Research | guida rapida, guida | guida.html#limiti (c'è già) |

Nella guida serve una sezione nuova **«Fonti e note»** (`#fonti`) con una sottosezione per vista (`#fonti-mon`, `#fonti-rrg`, …, `#fonti-vix`, `#fonti-emg`, `#fonti-ath`): il link «Fonti e note ↗» di ogni vista apre la sua.

## 3. Meccanismo delle spiegazioni

### Cosa c'è già

- **`title` HTML**: 397 diversi (`titoli.csv`). Quasi tutti sono valori di una cella (drawdown sul solo prezzo riga per riga, link a TradingView, «clic per…»): vanno bene così. Quelli che spiegano un'intestazione o un riquadro sono pochi: 3 intestazioni nel Monitor, 2 in Rotazione, 2+3 in Settore, 3 in Titoli, 3+3 in Indici, 5 riquadri in alto negli Emergenti, 6 riquadri e 8 intestazioni nel VIX.
- **`bindTapTips`** (`js/app.js:866-893`): sul telefono un tocco su un elemento con `title` apre il testo in un riquadro `.taptip` (`css/style.css:732`) e un tratteggio sotto segna i valori con spiegazione (`css/style.css:734`). Non funziona dentro bottoni, link, righe e grafici; con la tastiera non si apre; sul computer il `title` compare dopo circa un secondo, con lo stile del sistema.
- **`bindTip`/`placeTip`** (`js/format.js`): riquadri dei grafici, legati al puntatore. Non adatti a un'intestazione.
- **«ⓘ»** come carattere nel testo della riga dei Cali forti (`js/cap-view.js:73`): solo testo, non si apre.
- **Guida**: `guida.html` con ancore (`#stati`, `#formule`, `#massimi`, `#profilo-volumi`, …); la guida rapida apre già la guida completa alla sezione della vista in uso (`js/app.js:861`).

### Proposta: un bottone «i» con un riquadro (prototipo in `prototipo/proto.js`, 70 righe)

```html
<h2>Dopo i picchi del VIX</h2>
<button type="button" class="info" aria-label="Spiegazione: Dopo i picchi del VIX" aria-expanded="false"
        data-src="vxTabHelp" data-guide="vix-picchi">i</button>
<div hidden id="vxTabHelp"><p>Ogni riga conta gli episodi: …</p></div>
```

- **Dove**: dopo il titolo del pannello (fuori dall'`h2`, perché molti titoli sono riscritti dai js con `textContent`), dentro l'intestazione di colonna dopo il pulsante di ordinamento, accanto a una voce di legenda o a un badge di stato. Al massimo uno per titolo.
- **Testo**: `data-info` per un testo fisso breve; `data-src` per leggere l'HTML di un contenitore nascosto. Con `data-src` i js possono continuare a scrivere negli stessi id (`vxScBig`, `titData`, `athNote`…): meno codice da toccare e meno rischi.
- **Apertura**: col mouse al passaggio (dopo 120 ms) e si chiude uscendo, a meno che non si passi sul riquadro (per poter cliccare il link); al clic, al tocco, con Invio o Spazio resta aperto finché non si clicca fuori, si preme Esc (il focus torna sul bottone) o si apre un altro «i». Uno solo aperto per volta. Il bottone in un'intestazione non ordina la tabella (`stopPropagation`).
- **Accessibilità**: è un `<button>` vero (Tab, Invio, Spazio), con `aria-label` e `aria-expanded`; il testo va in una regione `role="status"`, quindi il lettore di schermo lo legge; area di tocco di 32 px con uno pseudo-elemento, senza allargare il disegno; contrasto con i token di colore esistenti, nei due temi.
- **Link alla guida**: «Nella guida ↗» in fondo al riquadro (`data-guide`), che apre `guida.html#ancora` in una scheda nuova come i link di oggi. Un «?» a parte per pannello non serve: diventerebbero due icone per titolo.
- **Riuso**: lo stile di `.taptip`, la posizione di `bindTapTips` (righe 886-890, da estrarre in una funzione comune in `js/format.js`) e la chiusura con il tocco fuori. `bindTapTips` resta per i `title` delle celle; i `title` delle intestazioni e dei riquadri in alto passano al bottone «i» (così si aprono anche con la tastiera).
- **Dove metterlo**: un modulo `js/info.js` (bind una volta in `bind()` di `app.js`, delega degli eventi sul documento, quindi funziona anche per le intestazioni ridisegnate dai js) e 20 righe di CSS.

Verificato nel prototipo (`dopo/`): apertura col mouse a 1440 px, al tocco a 390 px (il riquadro va sopra il bottone se sotto non c'è posto), nessuno scorrimento orizzontale a 390 px, console senza errori. Da verificare nella fase 2: tema chiaro, CVD, lettore di schermo, Esc insieme allo zoom (oggi `js/zoom.js:131` intercetta Esc in cattura solo se c'è uno zoom: il riquadro va chiuso prima).

### Punti da toccare per vista

| Vista | Bottoni «i» nuovi | `title` da passare al bottone | Testi da togliere o accorciare | Peso |
|---|---|---|---|---|
| Testata, piè di pagina, guida rapida | 0 | 0 | 3 righe del piè di pagina, 15 voci della guida rapida | piccolo |
| 1 Monitor | 2 (Settori da osservare, Come si legge lo stato) + 6 badge degli stati | 2 (Drawdown, Solo prezzo) | 4 | medio (legenda degli stati generata in `js/bottom.js:267`) |
| 2 Rotazione | 7 (Direz., Vel., Dist., Prima, spunta, Formula, Portafoglio) + 1 asterisco | 4 (Drawdown, Solo prezzo, Obiettivo, Oggi) | 8 (tre riquadri piegati) | grande (tabelle generate in `js/app.js`) |
| 3 Bottom Map | 2 (Distanza, avvicinamento) | 0 | 3 | piccolo |
| 4 Settore | 4 (Episodi, Per confronto, Cali forti, Livello blu) | 0 | 8, più la nota del SOXX | medio (`js/cap-view.js`, `js/bottom.js`) |
| 5 Titoli | 5 (Grandi contro piccoli, Storia, Titoli, I più in pena, riga SOXX) | 1 (Peso) | 7, più il pannello «Come si legge» | medio |
| 6 Indici | 5 (Storia, Distanza, Episodi, Per confronto, Cali forti) | 0 | 9 | medio (in comune con Settore) |
| 7 Emergenti | 3 (Valuta contro dollaro, Forza relativa, grafico) | 5 riquadri in alto | 7, più il pannello «Come leggere il contesto» | medio |
| 8 VIX | 3 (Dopo i picchi, Scatter, «robusto») | 6 riquadri in alto, 8 intestazioni (restano anche `title`) | 8, più il pannello «Come leggere il VIX» | medio |
| 0 Massimi (nuova) | 2 (titolo, grafico) | 2 intestazioni | 2 | piccolo, dentro il lavoro della parte B |
| 9 Alert | 0 | 0 | 2 | piccolo |

In tutto circa 40 bottoni «i», 30 `title` da spostare, 80 testi da togliere o accorciare (in `index.html` e in 8 file js: `app.js`, `bottom.js`, `cap-view.js`, `indices.js`, `titles.js`, `emerging-view.js`, `vix-view.js`, `signals.js` per «Perché questo stato» che resta com'è), più `guida.html` (sezione Fonti e note, ancore nuove, testi mancanti elencati sopra).

## 4. Pannello delle bolle: dove metterlo

### Opzioni

| Opzione | Pro | Contro |
|---|---|---|
| **A. Vista nuova «0 Massimi», in coda, tasto 0** (raccomandata) | nessuna scheda cambia numero (tasti 1-9, link `#vix`, `#alr`, testi «8 VIX», «9 Alert» restano); il pannello ha tutta la larghezza; si carica solo quando si apre (oggi `data/ath.json` arriva con il VIX anche a chi non guarda le bolle); nome neutro | 10 schede: sul telefono la barra va da 3 × 3 a 5 × 2 (provata a 390 e 360 px: ogni etichetta su due righe, altezza simile a oggi); a 861 px la riga sfora di 3 px (`scrollWidth` 830 su 827): togliere 1 px di margine ai bottoni tra 861 e 1100 px; «0» dopo «9» è un po' insolito |
| A2. Vista «9 Massimi» subito dopo il VIX, Alert diventa «0 Alert» | le viste di contesto vicine | cambia il tasto e il nome della scheda Alert, i testi «9 Alert» di guida e README, l'abitudine di chi la usa |
| B. Dentro 2 Rotazione, universo «5 Asset reali» | tema vicino («a rotazione»), stessi mercati in parte | la Rotazione è la vista più carica; S&P 500, Nasdaq-100, SOXX e KOSPI non sono asset reali; si vedrebbe solo in un universo |
| C. Dentro 6 Indici | indici già lì | metà dei mercati non sono indici (oro, argento, rame, petrolio, bitcoin); la vista è già lunga (2.764 px) |
| D. Sostituire la vista Alert e spostare il registro nel Monitor | resta 3 × 3 | cambia una vista che l'utente non ha chiesto di toccare |

**Nome**: «Massimi» (titolo del pannello: «Distanza dal massimo degli ultimi 3 anni», sottotitolo «Le bolle si sgonfiano a rotazione»). «Bolle» è più evocativo ma si confonde con il controllo «Bolle: Peso / Uguali» e con le bolle dei titoli della vista 5. Comandi: `MASSIMI`, `BOLLE`, `ATH` (non `MAX`, che è anche un ticker). Indirizzo `#ath` (codice di tre lettere come gli altri).

### Piano dei file (fase 2)

1. **`js/ath-view.js`** (nuovo, circa 220 righe tolte da `js/vix-view.js`): `export function createAth({ $, store, loadAth, loadAthHist })` → `{ bind, render }`. Si spostano:
   - stato: `ath`, `athOpen`, `st.athSort`, `st.athRange` (`vix-view.js:33-36`); chiavi del browser `athSort` e `athRange` con lo stesso nome, così le scelte di chi usa l'app restano;
   - caricamento di `data/ath.json`, oggi dentro `ensure()` del VIX (`vix-view.js:42`), con una nota «Caricamento…» sua (`#athLoading`);
   - funzioni `p2`, `W60`, `barW`, `th`, `pv`, `athDetail`, `renderAth`, `athHist…`, `VP_NOTE`, `cap`, `vpOf`, `renderAthChart` (`vix-view.js:406-605`);
   - in `bind()`: pulsanti `#athSort` e `#athRange` e lo zoom `zoomGroup('ath', …)` (`vix-view.js:608-611`);
   - la funzione `el()` (SVG) è copiata in tutti e due i moduli: meglio esportarla da un modulo comune (per esempio `js/format.js`).
   - Da sciogliere: oggi `renderAth` gira solo se i dati del VIX sono arrivati (`if (model) renderAth()` in `bind`, e `render()` esce prima se `vix.json` manca); nel modulo nuovo dipende solo da `ath.json`. Il controllo `!$('v-vix').hidden` dopo il caricamento dello storico (`vix-view.js:484`) diventa `!$('v-ath').hidden`.
2. **`js/vix-view.js`**: togliere import di `ath.js` e `indexdata.js` (se non servono più), `loadAth`/`loadAthHist` dal contesto e `renderAth()` da `render()`.
3. **`index.html`**: scheda `<button role="tab" id="tab-ath" data-view="ath" aria-controls="v-ath">0 Massimi</button>` dopo «9 Alert»; nuova `<section class="view" id="v-ath">` con il pannello `#athPanel` (righe 477-492 di oggi), la riga introduttiva, i riquadri «i» e la riga di fonti; `modulepreload` di `js/ath-view.js` (o caricamento pigro).
4. **`js/app.js`**:
   - `VIEWS` (riga 19) diventa `[…, 'alr', 'ath']`;
   - tasti: `const idx = e.key === '0' ? 9 : +e.key - 1` (riga 999);
   - `createAth(...)` accanto a `createVix` (riga 275) e il suo `bind()` (riga 292); in `renderAll` (riga 392) `else if (state.view === 'ath') state.ath.render()`;
   - comandi `MASSIMI`, `BOLLE`, `ATH` (riga 1015); `routeHash` va bene così (`#ath` non è un settore);
   - segnaposto del comando e `REQUIRED` (riga 82) restano uguali.
5. **`css/style.css`**: telefono `repeat(5, …)` (riga 108), commento «nove schede» (riga 99), margine dei bottoni tra 861 e 1100 px (riga 100). Gli stili del pannello (`.t.ath`, `.athbar`, `.vp…`, righe 996 e seguenti) non dipendono dalla vista e restano.
6. **Testi**: guida rapida (voce «0 Massimi», tasti «0–9»), `guida.html` (sezione `<section id="ath">` «0 Massimi» con dentro `#massimi` e `#profilo-volumi`, che così restano validi; indice; tabella dei comandi; elenco degli indirizzi; zoom), README e `docs/sviluppo.md` (tabella dei moduli: `js/ath-view.js`; vista 0), nota della versione.
7. **Versione**: una vista nuova è una novità senza rotture: 1.12.0 (`js/version.js` e `version.json` insieme).

### Rischi

- **Controlli nel browser**: `ricerca/qa/browser/v1100.cjs`, `v1101.cjs` e `v1110.cjs` aprono `#vix` e aspettano `#athTable` (righe 25, 81; 17; 40): vanno portati su `#ath`. `v1100.cjs:70` e `v1101.cjs:27` cercano nel testo di `#athNote` «Francesco Caruso» e «Oro, argento, rame e petrolio con il future continuo», `v1110.cjs:131-133` il testo di `#athNoteVp`: se le note si accorciano, i controlli vanno riscritti sui riquadri «i» o sulla guida. `v1100.cjs:81-82` controlla che il VIX funzioni anche senza `ath.json`: diventa «la vista 0 dice che i dati mancano e le altre funzionano».
- **Testi scritti dai js in elementi che si tolgono**: `#titData` (`js/titles.js:140`), `#vxScBig` (`js/vix-view.js:151`), `#pxCopied` (`js/app.js:454`), `#athNote`/`#athNoteVp`. Se l'elemento sparisce, `$('…').textContent = …` dà un errore e ferma il disegno della vista. Con `data-src` (contenitore nascosto) gli id restano.
- **Zoom ed Esc**: il gruppo di zoom `'ath'` si sposta con il grafico; Esc funziona sul grafico visibile (`js/zoom.js:125-138`), quindi va bene in una vista sua. Il gestore di Esc delle crisi del VIX (`vix-view.js:612`) resta nel VIX.
- **Link interni**: nessun link porta oggi a `#athPanel`; la guida usa `#massimi` e `#profilo-volumi`, che restano. Chi ha salvato `#vix` per vedere le bolle troverà il VIX senza pannello: una riga nel VIX («Le bolle sono ora nella vista 0 Massimi →») per una o due versioni.
- **Prestazioni**: `ath.json` non si scarica più con il VIX; la vista nuova lo scarica alla prima apertura, come oggi lo storico (`ath_history.json`).
- **Avvio diretto su `#ath`**: la vista non deve dipendere dai dati del Monitor (oggi il VIX non ne dipende: stesso schema).

## 5. Stima del lavoro e ordine proposto

Due rilasci separati, così ognuno si controlla meglio:

1. **1.12.0 · vista 0 Massimi** (parte B): modulo nuovo, scheda, comandi, guida, controlli nel browser aggiornati. Circa mezza giornata con i controlli (computer e telefono, due temi).
2. **1.13.0 · note più corte** (parte A): `js/info.js` e CSS, poi vista per vista nell'ordine dei guadagni: VIX, Titoli, Emergenti, Monitor (con la guida rapida), Rotazione, Indici e Settore insieme (codice in comune), Bottom Map, Alert, piè di pagina. Prima si scrive la guida (sezione Fonti e note, ancore nuove, testi che mancano), poi si tolgono i testi dalla pagina: così nessuna informazione resta senza posto nemmeno per un commit. Circa due giornate, più i controlli.

Controlli prima di pubblicare (oltre a `npm test`):
- per ogni testo tolto, uno script che verifica che il suo contenuto (o il numero) sia nella guida o in un riquadro: si può partire da `inventario.json` (colonna `testo_oggi`) e cercare frasi e numeri in `guida.html` e nei `data-info`;
- tutte le approssimazioni dell'elenco di `docs/sviluppo.md` («Approssimazioni dichiarate») raggiungibili in un passo da ogni vista dove compare il numero;
- riquadri «i» con mouse, tocco e tastiera, temi chiaro e scuro, CVD, 1440, 1280, 390 e 360 px;
- nessun errore in console quando un file di dati manca.

## Domande per l'utente

1. Va bene **«0 Massimi»** in coda con il tasto 0, o preferisci la vista subito dopo il VIX (e Alert che diventa 0)?
2. La riga di fonti in fondo a ogni vista va bene così corta, con il dettaglio nella guida («Fonti e note ↗»), anche per Cboe/FRED?
3. Nel Monitor la legenda «Come si legge lo stato» si può ridurre a una riga per stato, con la regola completa nel riquadro «i» del badge?
4. Nella guida rapida (tasto ?) teniamo solo l'elenco delle viste, gli stati, i comandi e il glossario, con il resto nella guida completa?
