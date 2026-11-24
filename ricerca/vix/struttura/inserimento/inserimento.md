# Struttura a termine e credito nella vista 8 VIX: piano di inserimento (verifica preliminare)

09/11/2026, ramo `claude/great-noether-2f1ude` (versione 1.5.0). Solo verifica: nessun file dell'app modificato, niente commit.
I dati (copertura, seconda fonte) e il backtest li fanno gli agenti in `ricerca/vix/struttura/dati/` e
`ricerca/vix/struttura/backtest/`: qui ci sono il **piano** e un **prototipo** con i dati reali.

**Idea**: nella vista 8, solo come contesto (nessuna regola, nessun alert):
- (a) **struttura a termine** della volatilità, R = VIX / VIX3M; R ≥ 1 «backwardation» (paura immediata), R < 1 «contango» (normale);
- (b) uno **spread di credito**.

Idea vista in un grafico di **Stefano Serafini** (Swiss Capital School) al Morning Trading Show di BNP Paribas: va citata come Massimo Rea.

## File di questa cartella

| File | Cosa fa |
|---|---|
| `scarica.mjs` | scarica da FRED (con `&cosd=`, come `fetchFred`) VIXCLS, VXVCLS, BAA10Y, BAMLH0A0HYM2 in `cache/` e copia `data/vix.json` (S&P 500 e VIX della 1.5.0); `cache/_origine.json` dice da dove viene ogni file (09/11/2026 09:35 UTC: tutto da FRED, ultima osservazione 05/11/2026) |
| `analisi.mjs` | copertura delle serie nuove sulle sedute dell'S&P 500, feste diverse, peso del file; scrive `risultati/analisi.json`. Sono numeri per il **piano**, non statistiche da mostrare |
| `bozza_vix_ctx.js` | bozza delle funzioni nuove per `js/vix.js` (usata dal prototipo) |
| `prototipo.html` | prototipo della vista: CSS e `js/vix.js` veri dell'app più le regole proposte, dati reali da `cache/` |
| `shots.cjs` | screenshot con Playwright, `deviceScaleFactor` 2, in `shots/` (le varianti con l'HY OAS in `cache/shots_hy/`, fuori da git) |

`cache/` è ignorata da git (`ricerca/vix/.gitignore`): così i valori ICE e Moody's non finiscono nel repository pubblico.

Per rifare tutto:
```
node ricerca/vix/struttura/inserimento/scarica.mjs
node ricerca/vix/struttura/inserimento/analisi.mjs
node ricerca/qa/server/gzserve.mjs . 8797 &
NODE_PATH=$(npm root -g) node ricerca/vix/struttura/inserimento/shots.cjs
```

---

## 0. Cosa dicono i dati scaricati (per il piano)

Da `risultati/analisi.json`; sedute di riferimento = date di `^GSPC` in `data/vix.json`.

| Serie | Da | Osservazioni | Sedute S&P 500 senza valore | Valori in giorni senza seduta |
|---|---|---:|---:|---|
| VIXCLS | 02/01/1990 | 9.311 | 3 (1991-03-01, 1997-01-31, 1997-11-26) | 34 (già tolti dalla 1.5.0) |
| VXVCLS (VIX3M) | **04/12/2007** | 4.761 | **0** | 0 |
| BAA10Y | 02/01/1986 | 10.212 | **79**: Columbus Day e Veterans Day (mercato dei titoli di Stato chiuso, NYSE aperta; 37 in ottobre, 32 in novembre), qualche 31/12 e MLK | Venerdì santo, funerali, 14/09/2001… e tutto il 1986-1989 |
| BAMLH0A0HYM2 (HY OAS) | **07/11/2023** | 786 | 0 | 34, anche di **sabato e domenica** (28/02/2026, 31/05/2026) |

- **VIX e VIX3M**: sulle 4.761 sedute dal 04/12/2007 ci sono sempre tutti e due (R calcolabile in tutte).
  - R va da 0,71 (16/03/2012) a 1,43 (24/10/2008).
  - Il 05/11/2026 R = 28,18 / 25,55 = 1,10.
  - Per il disegno: 133 tratti di backwardation, 68 di una sola seduta, il più lungo di 63 sedute. Quindi molte zone sono larghe un pixel.
  - La quota di sedute in backwardation non va citata da qui: è materia del backtest.
- **Credito**: BAA10Y esce su FRED la sera dopo (pagina della serie: «Updated: Nov 6, 2026 4:04 PM CST» per il 05/11, cioè 22:04 UTC del giorno dopo). Alla corsa delle 22:40 UTC del giorno D c'è di solito il D−1, a volte il D−2: il credito è quasi sempre **una seduta indietro** rispetto al VIX.
- **HY OAS**: da aprile 2026 FRED ne tiene solo gli ultimi 3 anni («Starting in April 2026, this series will only include 3 years of observations»), cioè 752 sedute. È troppo poco per un percentile «sulla storia», e la licenza non permette di ripubblicarlo (§3.6).

---

## 1. Pipeline

### 1.1 `scripts/fetch_vix.js`

Oggi (righe 63-84) il blocco del VIX è scritto una volta sola. Proposta:

1. **Funzione comune `fredTail({ key, fredId, since, yahooSym })`** (nuova, al posto delle righe 63-84). Fa la stessa cosa di oggi per una serie:
   - FRED con `fetchFred(..., parseFredDaily)`; se FRED non risponde, la parte FRED pubblicata (`p.x.fred`);
   - `onSessions` sulle sedute dell'S&P 500;
   - coda di Yahoo dopo l'ultimo valore di FRED con `splice`;
   - nota se Yahoo si scosta oltre il 2%;
   - errore se FRED «torna indietro» rispetto a quanto pubblicato.

   Restituisce `{ ...pack(dates, val, 100), last, fred }`. Si usa per:
   - `VIX`: `VIXCLS`, `SINCE`, `^VIX` (come oggi, `pack` con `ps` di default per non riscrivere il file);
   - `VIX3M`: `VXVCLS`, `'2007-12-04'`, `^VIX3M`. Usare `ps` 100: valori a due decimali, 22 KB contro 32.
2. **Corto circuito di FRED** come `fetch_emerging.js:86-90` (`fredDown`). Dopo il primo errore le altre serie non lo richiedono più: con FRED appeso ogni serie costa fino a 2-3 minuti (4 tentativi da 30 s). È già successo il 09/11/2026: curl riceveva «Empty reply» da FRED mentre `fetch` di Node rispondeva.
3. **Credito `BAA10Y`** (nuovo blocco dopo il VIX3M):
   - `fetchFred('BAA10Y', SINCE, parseFredDaily)`, poi `onSessions` sulle sedute dell'S&P 500 (toglie Venerdì santo, funerali, 1986-1989);
   - `pack(..., 100)` con `last`, **senza coda Yahoo e senza campo `fred`**: tutta la serie è di FRED e non c'è una fonte gratuita affidabile per l'ultima seduta;
   - nelle sedute in cui il mercato dei titoli di Stato è chiuso (Columbus Day, Veterans Day) **non si scrive niente**: la seduta manca nella serie e nell'app vale null, cioè «—». Mai l'ultimo valore ricopiato.
   - Se FRED non risponde resta la serie pubblicata (`pickSeries` con `fresh` nullo).
4. **Serie obbligatorie e facoltative.** Oggi `all = ['VIX', 'SPX', 'NDX']` (riga 86): se ne manca una, il file non si scrive.
   - Restano obbligatorie quelle tre.
   - `VIX3M` e `BAA10Y` sono **facoltative**: se mancano e non c'è una serie pubblicata, il file si scrive senza di loro, con `missing: ['VIX3M']` (come `emerging.json`). Un guasto della fonte nuova non deve fermare il VIX.
   - Righe 86-99: `const req = ['VIX', 'SPX', 'NDX'], opt = ['VIX3M', 'BAA10Y']`. Il ciclo `pickSeries` va su tutte; il controllo `missing` resta solo su `req`.
5. **Regola «serie pubblicata tenuta»**: `pickSeries` va già bene per tutte. Tiene la pubblicata se la nuova manca, finisce prima, ha la storia accorciata (inizio oltre 40 giorni dopo o meno del 95% delle righe) o gli stessi valori.
   - Attenzione al confronto `prev.ps === fresh.ps`: se il VIX3M nasce con `ps` 100, deve restare 100.
   - La storia del VIX3M dal 04/12/2007 è corta rispetto al 1990, ma il controllo confronta solo con la pubblicata della stessa serie: nessun problema.
6. **Uscita** (righe 100-105). Aggiungere ad `asOf` `vix3m: series.VIX3M?.last || null`, `fred3m: series.VIX3M?.fred || null` e `credit: series.BAA10Y?.last || null`. Aggiungere a `source`:
   - `vix3m: 'FRED VXVCLS (Cboe; © Cboe, reprinted with permission) dal 04/12/2007; dopo l\'ultimo valore di FRED Yahoo ^VIX3M, provvisorio'`;
   - `credit: 'FRED BAA10Y (Moody\'s Baa meno Treasury 10 anni; © Moody\'s, citazione richiesta da FRED)'`;
   - `missing: [...]`.

   Nessun campo che cambia a ogni corsa oltre a `generated` (`keep_unchanged.js`).
7. **Log** (righe 107-111): stampare anche VIX3M e credito; `::warning title=VIX::` per errori e note come oggi.
8. **Intestazione** (righe 2-17): fonti nuove, regola obbligatorie/facoltative, citazione di Serafini.
9. **Funzione pura da testare**: estrarre `assemble(prev, fresh, now)` → `{ out, missing, errors }` dalle righe 86-105, così il test della pipeline non tocca la rete (oggi solo `onSessions` è testabile).

**Formato di `data/vix.json`** (compatibile: la 1.5.0 legge solo `VIX`, `SPX`, `NDX` e ignora il resto):
```
{ generated, asOf: { vix, fred, spx, ndx, vix3m, fred3m, credit }, source: {…, vix3m, credit}, missing: [],
  series: { VIX, SPX, NDX,
            VIX3M:  { d0: "2007-12-04", gaps, cd, ps: 100, last, fred },
            BAA10Y: { d0: "1990-01-02", gaps, cd, ps: 100, last } } }
```

**Peso** (misurato in `analisi.mjs` con `pack` vero):

| | Oggi | Con VIX3M e BAA10Y |
|---|---|---|
| Non compresso | 211 KB | 265 KB |
| gzip | 65 KB | 79 KB |

Con l'HY OAS si aggiungerebbero 3 KB.

### 1.2 Workflow `.github/workflows/update-data.yml`

- Passo «VIX (vista VIX)» (righe 82-88): `timeout-minutes` da 5 a **8**, come gli Emergenti. Le richieste a FRED passano da 1 a 3, quelle a Yahoo da 3 a 4; con FRED lento il caso peggiore senza corto circuito supera i 5 minuti. Commento: «VIX e VIX3M di FRED (Cboe) con l'ultima seduta da Yahoo, credito BAA10Y di FRED».
- Esito (righe 164-168): niente da cambiare. VIX3M e credito sono facoltativi: un loro errore diventa un `::warning`, non un fallimento del passo. Il fallimento arriva solo se mancano le serie obbligatorie, come oggi.
- **Messaggio di commit** (righe 125-126): **non cambia** («VIX al …»). La data del VIX3M è quella del VIX e il credito è una seduta indietro per costruzione: aggiungerlo allungherebbe un messaggio già lungo senza dire nulla di nuovo. I ritardi veri li segnala `check_fresh.js`.

### 1.3 `scripts/check_fresh.js`

Righe 168-172 (blocco `d.vix`), da aggiungere:
```
['vix.json (VIX3M)', d.vix && d.vix.asOf && d.vix.asOf.vix3m, B, 4],
['vix.json (FRED VIX3M)', d.vix && d.vix.asOf && d.vix.asOf.fred3m, today, 6],
['vix.json (credito BAA10Y)', d.vix && d.vix.asOf && d.vix.asOf.credit, today, 6],
```
più `for (const k of (d.vix && d.vix.missing) || []) checks.push([\`vix.json: ${k} (mancante)\`, null, B, 6])`.

- **Limiti**: il credito esce la sera dopo, e con un lunedì di Columbus Day la corsa del martedì sera ha ancora il venerdì, cioè 4 giorni rispetto a `today`. Dopo Thanksgiving: 3. 6 giorni come FRED VIX.
- **Transizione**: alla prima corsa dopo la pubblicazione della 1.6.0 il file pubblicato non ha ancora i campi nuovi (`undefined`): vengono saltati (riga 177), come oggi per i file nuovi.
- **Riga 81 del test** (`staleData({ ...base, vix: null }) → 4 problemi`): con i tre controlli nuovi diventa 7. Va aggiornata insieme.

### 1.4 Altri script

- `scripts/need_update.js`: non cambia (VIX3M e credito non devono far ripartire le corse di recupero).
- `scripts/keep_unchanged.js`: non cambia.

---

## 2. Calcoli in `js/vix.js`

Bozza funzionante in `bozza_vix_ctx.js` (usata dal prototipo).

### 2.1 Funzioni nuove

Dopo `expandingPct` (riga 147), prima di `today` (riga 155).

| Funzione | Cosa fa |
|---|---|
| `onDates(dates, s)` | valori di una serie `{dates, val}` sulle sedute date; null dove manca; tutto null se `s` è null (file vecchio) |
| `ratio(a, b)` | R = a/b seduta per seduta; **null se manca uno dei due** (VIX presente e VIX3M mancante → null, mai riempito) |
| `termState(r)` | `null` / `'backwardation'` (r ≥ 1) / `'contango'` (r < 1). La soglia 1 è una definizione: da confermare con l'utente (regole e formule) |
| `obsChange(a, h = 21)` | variazione del credito rispetto a **21 osservazioni valide prima**: salta i null, quindi Columbus e Veterans Day non creano buchi e nessun valore viene inventato. Usa solo dati fino a quel giorno |
| `context(A, v3, cr)` | dalla serie allineata `A` di `align()`, con `v3` = `vxSeries(series.VIX3M)` e `cr` = `vxSeries(series.BAA10Y)` (anche null), restituisce `{ has3m, hasCredit, v3, r, rPct, credit, creditCh, creditPct, from3m, fromCredit, now, provisional(i) }` |

Dettagli di `context`:
- **percentili** con `expandingPct(·, 252)`, cioè solo la storia fino a quel giorno e «—» finché ci sono meno di 252 valori. Per R il primo percentile arriva a fine 2008, per il credito a fine 1990;
- **seduta provvisoria**: R di una seduta è provvisorio se la data è **dopo l'ultimo FRED del VIX oppure dopo l'ultimo FRED del VIX3M**;
- **oggi** (`now`):
  - `vixDate`: l'ultima seduta con il VIX;
  - `now.r`: `{ date, vix, v3, r, state, pct, provisional, sameDay }` dell'ultima seduta con R;
  - `now.credit`: `{ date, v, ch, pct, lag }` dell'ultima con il credito.

**Regola per «oggi»**: se all'ultima seduta del VIX manca il VIX3M (`sameDay` falso), il riquadro **non** mostra l'R della seduta prima come se fosse di oggi. Il valore è «—» e il testo sotto dice «VIX3M del 05/11/2026 non ancora arrivato · al 04/11/2026 era 0,88 (contango)».
- Il prototipo l'ha mostrato con i dati veri: il 05/11/2026 il VIX è salito da 16,61 a 28,18 e l'R è passato da 0,88 (contango) a 1,10 (backwardation). L'R del giorno prima direbbe il contrario di oggi.
- Il credito invece è sempre con la sua data (una seduta indietro per costruzione): «al 04/11/2026».

### 2.2 `today(A)`

Non cambia: firma e campi restano gli stessi, così i test della 1.5.0 restano validi. La lettura nuova sta in `context().now`. In alternativa `today(A, X)` con i campi in più, ma tenere separato è più semplice da testare.

### 2.3 Intestazione di `js/vix.js` (righe 1-16)

Aggiungere le definizioni di R, stato, percentile, variazione del credito e seduta provvisoria. Aggiungere la citazione: «Struttura a termine e credito: idea da un grafico di Stefano Serafini (Swiss Capital School), Morning Trading Show di BNP Paribas».

### 2.4 Variante B (statistica)

Se si mostrerà una riga di statistica, la funzione che la calcola deve essere **la stessa regola** che l'app mostra (R ≥ 1 alla chiusura, sedute dell'S&P 500). Va portata dallo script del backtest con un controllo di uguaglianza seduta per seduta, come `ricerca/vix/verifica_app.mjs`. Se è un numero fisso nel testo (come «83%» della 1.5.0) non serve codice, ma serve lo script citato.

---

## 3. Vista (`js/vix-view.js`, `index.html`, `css/style.css`)

Screenshot in `shots/` (sotto, §6). Il prototipo usa il CSS dell'app e aggiunge solo le regole di questa sezione.

### 3.1 Riquadri (KPI): da 4 a 6

`renderKpis()` (righe 61-74) aggiunge due riquadri dopo «Premio per la paura».

**«VIX / VIX3M»**
- Valore: `1,10` più la parola `backwardation` o `contango` (`<span class="vxst">`, color prugna se backwardation).
- Sotto: «VIX 28,18 / VIX3M 25,55 · al 05/11/2026 · 98° percentile», con «· provvisorio» se serve. Se il VIX3M di oggi non c'è, vedi §2.1.
- `title`: spiegazione e «dal 04/12/2007».

**«Spread di credito Baa»**
- Valore: il livello in punti (valore di oggi non riportato: licenza di Moody's).
- Sotto: «+11 pb in un mese · 11° percentile · al 05/11/2026» (pb = punti base, spiegato nel `title`).

**Impaginazione** (misurata nel prototipo):

| Larghezza | Oggi (4 riquadri) | Proposta (6 riquadri) |
|---|---|---|
| sopra 1100 px | `auto-fit` 170 px: 4 in fila | 6 in fila da 229 px a 1440 px |
| 601-1100 px | 4 colonne (`css/style.css:905`) | **3 colonne**: due righe da 3, a 1024 px riquadri da 321 px |
| telefono | 1 colonna: 4 righe, 300 px | **2 colonne** (`repeat(2, minmax(0, 1fr))`): tre righe da 165 px a 390 px e 150 px a 360 px |

Sul telefono `.kpi .v .vxst { display: block }`: a 360 px la parola «backwardation» accanto al numero veniva tagliata («backwardatio»), corretta nel prototipo.

**`vxMeta`** (riga 73): «VIX al … · VIX3M al … · credito al … · S&P 500 al … · Nasdaq-100 al …», con «(FRED al …, poi Yahoo provvisorio)» anche per il VIX3M.

### 3.2 Grafico `#vxChart`: due pannelli in più

`renderChart()` (righe 147-202). Oggi l'array `P` (riga 156) ha due pannelli (230 e 110 px).

Proposta: **un solo grafico con quattro pannelli** e una sola linea verticale condivisa, come il grafico di Serafini (VIX, rapporto, credito uno sotto l'altro):

| Pannello | Altezza | Titolo largo / stretto (sotto 440 px) | Contenuto |
|---|---:|---|---|
| 1 | 230 | come oggi | VIX e realizzata |
| 2 | 110 | come oggi | premio, zone oltre l'80° |
| 3 (nuovo, se `has3m`) | 110 | «STRUTTURA A TERMINE: VIX / VIX3M (DA 1 IN SU BACKWARDATION)» / «VIX / VIX3M» | zone di backwardation (`rect.vxback`, stessa logica di `flush` delle righe 175-177); linea tratteggiata a 1 (`line.vxone`); linea di R (`path.vxr`); **punto sull'ultimo valore** (`circle.vxrdot`, pieno se backwardation): una zona di una sola seduta sul bordo destro è larga 1 px e non si vede, come il 05/11/2026 |
| 4 (nuovo, se `hasCredit`) | 90 | «CREDITO: OBBLIGAZIONI BAA MENO TITOLI DI STATO A 10 ANNI (PUNTI)» / «CREDITO BAA − STATO 10A» | linea `path.vxcr`; asse con passo scelto dai pixel (almeno 22 px fra due etichette): con un passo fisso di 0,5 le etichette si sovrapponevano |

Il grafico passa da 351 a 563 px a 1440 e da 404 a 648 px al telefono.

**Altre modifiche a `renderChart()`**:
- linea verticale e area del puntatore (righe 184-185) da `P[0].y0` a `P.at(-1).y1`, non più `P[1].y1`;
- asse degli anni sotto l'ultimo pannello: già così (`H - 4`);
- la scala di ogni pannello si calcola sulle sole sedute visibili, come oggi (`vis`).

**Periodo**: R c'è dal 04/12/2007, il resto dal 1990.
- Con 3A e 10A il pannello è pieno.
- Con **MAX** la parte prima del 04/12/2007 è una fascia grigia (`rect.vxnodata`) con la scritta «VIX3M dal 04/12/2007», e la linea a 1 parte da lì. Il prototipo mostrava prima la linea tratteggiata anche nella fascia vuota: corretto.
- Il credito c'è da tutto il periodo.
- **Bordo sinistro**: le zone partono dalla prima seduta visibile in backwardation. Se il tratto è iniziato prima del periodo mostrato, la zona comincia al bordo, ed è giusto (è una fascia, non un «ingresso»). Non disegnare segni d'ingresso (errore della 1.3.2).

**Riquadro dei valori** (righe 193-197), righe nuove dopo il premio:
- «VIX3M» (con «provv.» se dopo `fred3m`);
- «VIX / VIX3M» (valore e «backw.» / «contango»; «—» prima del 2007 e dove manca);
- «Credito Baa − 10A» («—» nelle feste del mercato obbligazionario).

Le righe compaiono solo se la serie c'è nel file.

**Legenda** (riga 201), voci nuove:
- «VIX / VIX3M»;
- «backwardation (VIX ≥ VIX3M)», un quadratino con il bordo;
- «credito Baa − Stato 10A».

A 390 px la legenda va su 7 righe (prima 3): accettabile; in alternativa nasconderla sotto 600 px come in altre viste. Non serve: il riquadro dei valori dice tutto.

**Titolo del pannello** (`index.html:462`): «VIX, struttura a termine e credito · S&P 500»; `aria-label` (riga 464) aggiornato.

### 3.3 Colori (Okabe-Ito, come lo scatter)

Variabili nuove in testa al blocco «vista 8 VIX» del CSS:

| Elemento | Scuro | Chiaro |
|---|---|---|
| R (`--vx-r`) | `#cc79a7` (porpora rossiccio Okabe-Ito) | `#9e3f78` |
| zone di backwardation (`--vx-back`) | `rgba(204,121,167,.36)` | `rgba(158,63,120,.26)` |
| credito (`--vx-cr`) | `#2fbf8f` (verde-blu, già `.c5` dello scatter) | `#00785a` |

- Distinti da ambra (VIX), blu chiaro (realizzata), grigio (premio) e rosso (premio alto).
- Le zone del chiaro a 0,16 erano quasi invisibili (screenshot 1024 chiaro): portate a 0,26.
- **CVD** (`.cvd`): su e giù diventano blu e rosso, i colori nuovi non cambiano. Porpora contro verde-blu resta distinguibile con le forme comuni di daltonismo (sono due colori della palette Okabe-Ito).

### 3.4 Telefono (360-390 px)

Provato nel prototipo, senza scorrimento orizzontale:
- riquadri 2 × 3;
- titoli stretti dei pannelli;
- grafico a 648 px;
- riquadro dei valori al tocco.

A 10A sul telefono il pannello di R è fitto (2.500 sedute in 290 px) ma leggibile; le zone di una seduta sono larghe 1 px, come quelle del premio nella 1.5.0. Provato con larghezza minima 2 px: il pannello del premio diventava tutto rosso, quindi si è tornati a 1 px.

### 3.5 Testi nella vista (`index.html` 466-479)

**«Come leggere il VIX»**: due paragrafi nuovi dopo «VIX contro realizzata» (bozza nel prototipo):
- **Struttura a termine**: il VIX misura la paura a 30 giorni, il VIX3M a 3 mesi. Di solito R è sotto 1 (contango); da 1 in su (backwardation) la paura è per i prossimi giorni e succede nei ribassi bruschi. Solo contesto.
- **Credito**: quanto rendono in più delle obbligazioni di Stato a 10 anni le obbligazioni Baa, sale quando si temono fallimenti.

La frase «si muove più lento del VIX e spesso dopo», nella bozza del prototipo, è un'affermazione da **verificare con il backtest** o da togliere.

**Variante B**: una riga in più nel paragrafo, per esempio «Dal 2007 … [numero del backtest] (ricalcolo: `ricerca/vix/struttura/backtest/…`)».
- La riga di ricalcolo in fondo («Ricalcolo: …», riga 476) si allunga con la cartella nuova.
- Niente numeri nei riquadri oltre al percentile.

**Citazione**, dopo quella di Rea: «Idea della struttura a termine e del credito da un grafico di Stefano Serafini (Swiss Capital School) al Morning Trading Show di BNP Paribas; calcoli nostri su dati pubblici.»
- Niente dati né immagini presi dal suo grafico.
- **Da chiedere all'utente**: la data della puntata e se c'è un link pubblico da mettere. Non inventarlo.

**Fonti** (riga 479), testo da aggiungere:
- VIX3M «© Cboe, dalla serie VXVCLS di FRED, dal 04/12/2007; l'ultima seduta da Yahoo, provvisoria»;
- credito «Moody's Seasoned Baa Corporate Bond Yield Relative to Yield on 10-Year Treasury Constant Maturity (BAA10Y), © Moody's, via FRED; solo nelle sedute dell'S&P 500, "—" nei giorni in cui il mercato dei titoli di Stato è chiuso; pubblicato da FRED la sera dopo».

### 3.6 Licenze: cosa permette FRED

Verificato il 09/11/2026 su `fred.stlouisfed.org/legal/` e sulle pagine delle serie. Le copie sono in `ricerca/vix/struttura/dati/cache/page_*.html`; la pagina legale non è salvata nel repository.

**Le tre etichette di FRED**:

| Etichetta | Cosa dice FRED |
|---|---|
| «Copyrighted: Pre-approval required» | «Without first obtaining the express written permission of the copyright holder … these series may only be used for non-commercial educational or personal use. For any other use, you must obtain permission from the copyright holder». FRED non può dare il permesso al posto del titolare |
| «Copyrighted: Citation required» | si possono usare «with proper attribution of the source and acknowledgment that you obtained the data from FRED … when displaying or publishing it» |
| «Public Domain: Citation requested» | uso libero, con la citazione chiesta |

**Le serie**:

| Serie | Etichetta FRED | Note della serie |
|---|---|---|
| VIXCLS, VXVCLS | Citation required | «Copyright, 2016, Chicago Board Options Exchange, Inc. Reprinted with permission.» |
| BAA10Y | Citation required | contiene anche il testo di Moody's: «MOODY'S INFORMATION MAY NOT BE COPIED OR OTHERWISE REPRODUCED, REPACKAGED, FURTHER TRANSMITTED, TRANSFERRED, DISSEMINATED, REDISTRIBUTED OR RESOLD … WITHOUT MOODY'S PRIOR WRITTEN CONSENT» |
| BAMLH0A0HYM2 (HY OAS) | **Pre-approval required** | «Reproduction of this data in any form is prohibited except with the prior written permission of ICE Data Indices … provided for your internal use only and you are not authorized or permitted to publish, distribute or otherwise furnish Top Level Data to any third-party» |

**Termini generali di FRED**, tra i divieti (vale per tutte le serie): «(p) Store, cache, or archive any portion of the FRED® Services or FRED® Content; … or incorporate any FRED® Content in any database, compilation, archive, cache, or other medium», salvo consenso scritto della Banca.

**Conseguenze**:
1. **HY OAS: non usarlo nell'app.** Pubblicarlo in `data/vix.json` (repository pubblico, sito pubblico) vuol dire «publish/distribute» dati ICE senza permesso. In più FRED ne tiene solo 3 anni. Le prove con l'HY OAS restano in `cache/` (ignorata da git); gli screenshot con la sua linea sono in `cache/shots_hy/`, fuori dal repository.
2. **BAA10Y: da far decidere all'utente.**
   - L'etichetta di FRED («Citation required») ne permette la pubblicazione con la citazione, come il VIXCLS della 1.5.0.
   - Il testo di Moody's nelle note è più restrittivo.
   - Se l'utente non vuole rischiare, non c'è un'alternativa giornaliera di pubblico dominio per uno spread societario. Le scelte possibili:
     - (a) BAA10Y con la citazione completa di FRED e di Moody's (consiglio, alla pari di VIXCLS);
     - (b) un'approssimazione da prezzi di ETF (per esempio LQD o HYG contro IEF da Yahoo, già ripubblicato sotto i suoi termini), che però non è uno spread e va detto;
     - (c) solo la struttura a termine, senza credito.
3. **Punto già aperto dalla 1.5.0**, non nuovo: il divieto (p) di «archiviare» contenuti FRED senza consenso riguarda già `data/vix.json` (VIXCLS), `data/emerging.json` (H.10) e il CPI. Dirlo all'utente: non è una novità di questa versione e la decisione è sua.
4. **Testi delle fonti e Licenza del README**: citazione nella forma suggerita da FRED per ogni serie, per esempio «Chicago Board Options Exchange, CBOE S&P 500 3-Month Volatility Index [VXVCLS], retrieved from FRED, Federal Reserve Bank of St. Louis». Per BAA10Y: «Federal Reserve Bank of St. Louis, Moody's Seasoned Baa Corporate Bond Yield Relative to Yield on 10-Year Treasury Constant Maturity [BAA10Y], retrieved from FRED» con «© Moody's».

### 3.7 Tema e scelte dell'utente

- Nessun cambio automatico di tema.
- Periodo (3A/10A/MAX) e indice restano quelli salvati (`vxRange`, `vxIx`); nessuna chiave nuova in `store`.
- La tabella dei regimi e lo scatter non cambiano.

### 3.8 Il punto in `vix-view.js` dove si costruisce il modello

`build()` (righe 34-44): `out.ctx = out.SPX ? V.context(out.SPX.A, V.vxSeries(data.series.VIX3M), V.vxSeries(data.series.BAA10Y)) : null`.

`vxSeries` restituisce già null se la serie manca, quindi con un file vecchio `has3m` e `hasCredit` sono falsi:
- i riquadri dicono «— · dato non disponibile»;
- il grafico ha i due pannelli della 1.5.0;
- nessun errore (screenshot `prototipo-1440-old-scuro.png`).

---

## 4. Rischi, casi limite, test e testi

### 4.1 Rischi e casi limite

| Caso | Cosa deve succedere | Dove si prova |
|---|---|---|
| File della 1.5.0 senza `VIX3M` e `BAA10Y` (la Action non è ancora passata dopo la pubblicazione) | 6 riquadri, i due nuovi con «—»; grafico a 2 pannelli; console pulita | prototipo `?old=1`; `v160.cjs` con il file modificato da `route` |
| Una sola delle due serie nuove | solo il suo pannello e il suo riquadro | unitario `context(A, v3, null)`; `v160.cjs` |
| VIX dell'ultima seduta presente, VIX3M no (FRED VXVCLS in ritardo, Yahoo `^VIX3M` giù) | R di quella seduta null; riquadro «—» con «non ancora arrivato · al … era …»; riquadro dei valori «—» | prototipo `?miss3m=1`; unitario |
| VIX3M provvisorio (Yahoo) e VIX di FRED, o viceversa | R «provvisorio» in tutti e due i casi | unitario con `fred` diversi |
| Coda di Yahoo con una barra piatta o ferma a metà seduta (come `^VIX` il 06/02/2026) | provvisoria, sostituita alla corsa dopo; scarto mediano con FRED negli avvisi | agente dei dati |
| Credito nelle feste del mercato obbligazionario (79 sedute dal 1990) | «—» nel riquadro dei valori; buco nella linea (nessun tratto che scavalca); la variazione a un mese usa le osservazioni valide | unitario `obsChange` |
| Credito di venerdì santo e funerali (mercato obbligazionario aperto, NYSE chiusa) | tolto da `onSessions` | test del file |
| Periodo MAX: R solo dal 2007 | fascia grigia e scritta; linea a 1 solo dal 2007; percentile «—» fino a fine 2008 | prototipo `range=MAX` |
| Bordo destro: backwardation di una sola seduta | punto pieno sull'ultimo valore | screenshot 3A, 10A |
| Bordo sinistro del periodo dentro un tratto di backwardation | la zona parte dal bordo, senza segni d'ingresso | `v160.cjs` a 3A con un inizio scelto dentro un tratto (per esempio marzo 2020 su un periodo che parte lì: serve un periodo diverso, quindi controllo solo visivo) |
| FRED appeso | corto circuito `fredDown`; passo entro 8 minuti; serie pubblicate tenute | rilettura del codice; corsa di prova a mano |
| FRED che torna indietro sul VIX3M | si tiene la pubblicata (stessa regola del VIX) | unitario su `assemble` |
| Cache del browser con la 1.5.0 e il file nuovo | la 1.5.0 ignora le serie nuove | — |
| Nomi | «backwardation» e «contango» restano in inglese (sono i termini d'uso); spiegati in «Come leggere», nel `title` e nella guida | revisione dei testi |

### 4.2 Test unitari

Nuovo file `test/vix_struttura.test.js`: sulla 1.5.0 fallisce subito, perché `V.context` e `V.ratio` non esistono.
1. `ratio`: null se manca uno dei due; mai riempito (VIX presente, VIX3M null → null).
2. `termState`: 1 → backwardation, 0,9999 → contango, null → null.
3. **Nessun dato futuro**: `context` su `A` tagliato a `t` dà gli stessi `rPct[t]`, `creditPct[t]` e `creditCh[t]` della serie intera (modello: `test/vix.test.js:69-78`).
4. `obsChange` con un null in mezzo: la variazione salta il buco e non lo riempie.
5. `provisional`: vero se la data è dopo `A.fred` oppure dopo `v3.fred`; falso se tutte e due sono FRED.
6. `now.r.sameDay` falso quando manca il VIX3M dell'ultima seduta del VIX.
7. `context(A, null, null)`: nessun errore, `has3m` e `hasCredit` falsi, array tutti null.
8. Valori su dati veri, con una fixture piccola: `test/fixtures/vix3m_baa_sample.json`, poche centinaia di sedute del 2008 e del 2012.
   - Valori attesi: R(24/10/2008) = 1,4309 (massimo dal 2007), R(16/03/2012) = 0,7104 (minimo), ricalcolati dallo script del backtest.
   - Attenzione: anche una fixture con valori Moody's nel repository pubblico è una ripubblicazione; in alternativa sintetica più il test sul file vero.
9. File vero (saltato se `data/vix.json` manca o non ha ancora la serie):
   - `VIX3M` dal 2007-12-04, date tutte sedute dell'S&P 500, `fred ≤ last`;
   - `BAA10Y` solo su sedute dell'S&P 500;
   - `asOf.vix3m` e `asOf.credit` coerenti con `last`.

In `test/pipeline.test.js`:
- `staleData` con `vix3m`, `fred3m`, `credit` e `missing`, più i limiti di Columbus Day (4 giorni: passa) e uno vecchio (fallisce);
- la riga 81 diventa 7 problemi;
- `assemble()` di `fetch_vix.js`: serie facoltativa mancante → file scritto con `missing`; obbligatoria mancante → niente file.

### 4.3 Controllo nel browser `ricerca/qa/browser/v160.cjs`

Deve fallire sulla 1.5.0. Sul modello di `v150.cjs`, su 1440 e 1280 (computer), 1024 (tablet), 390 e 360 (telefono), chiaro e scuro:
1. `#vxKpis .kpi` = **6** (la 1.5.0 ne ha 4: fallisce).
2. Riquadro «VIX / VIX3M»: il testo contiene il valore calcolato dai moduli sul file del sito (`V.context` importato come in `v150.cjs:11-17`), formattato all'italiana, e la parola giusta (backwardation o contango).
3. Nessun riquadro con il contenuto più largo del riquadro: per ogni `.kpi .v`, `scrollWidth ≤ clientWidth`. Prende il «backwardatio» tagliato a 360 px.
4. Colonne dei riquadri: 6 a 1440, 3 a 1024, 2 a 390 e 360 (dalle `left` distinte).
5. Grafico: `path.vxr`, `path.vxcr`, `line.vxone`, `circle.vxrdot` presenti; `rect.vxback` più di 0 a MAX.
6. A MAX `rect.vxnodata` c'è, a 10A no. La linea a 1 ha `x1` ≥ la `x` del 04/12/2007.
7. Riquadro dei valori: passando sul pannello di R compaiono «VIX3M», «VIX / VIX3M», «Credito»; a MAX su una data del 2000 R vale «—».
8. **File vecchio**: `route` di `data/vix.json` con il JSON senza `VIX3M` e `BAA10Y` → 6 riquadri, due con «—», 2 pannelli, console pulita.
9. **VIX3M dell'ultima seduta mancante**: `route` con il JSON in cui si toglie l'ultima data del VIX3M → riquadro con «—» e «non ancora arrivato».
10. Nessuno scorrimento orizzontale; console senza errori; Massimo Rea **e** Stefano Serafini citati nel testo di `#v-vix`; «VXVCLS» e «BAA10Y» nelle fonti.
11. Da `v150.cjs`: controllo «4 riquadri» (riga 39) da portare a `>= 4`, oppure si dichiara superato da `v160.cjs`.

### 4.4 Testi da aggiornare

| File | Dove | Cosa |
|---|---|---|
| `guida.html` | `#vix` (righe 377-395): «Riquadri» (381-382), «VIX contro volatilità realizzata» (392-393), fonti (394) | due riquadri nuovi, pannelli nuovi con la spiegazione di backwardation e contango e del credito, citazione di Serafini, fonti nuove; variante B: la riga di statistica con lo script |
| `guida.html` | «Dati e aggiornamenti» (447) | VIX3M da FRED dal 2007 (ultima seduta da Yahoo, provvisoria), credito BAA10Y da FRED (la sera dopo) |
| `guida.html` | «Limiti» (452-460) | R solo dal 2007; credito una seduta indietro e «—» nelle feste del mercato obbligazionario |
| `index.html` | 829 (aiuto, «8 VIX») | «… il VIX contro la volatilità realizzata, la struttura a termine (VIX/VIX3M) e il credito» |
| `index.html` | 462, 464, 466-479 | titolo del pannello, `aria-label`, «Come leggere», fonti, citazione |
| `README.md` | 96-101 (sezione «8 VIX») | dati nuovi, definizioni (R, stato, percentile, variazione), regola «oggi», citazione di Serafini, link agli script di ricerca |
| `README.md` | 305 (architettura) | `fetch_vix.js` con VIX3M e BAA10Y facoltativi, timeout 8 minuti, limiti di `check_fresh` |
| `README.md` | 359 (Licenza) | VXVCLS © Cboe e BAA10Y © Moody's via FRED, con la citazione; HY OAS non usato per licenza |
| `README.md` | Versioni | nota **1.6.0** (funzione nuova: semver minore), con le approssimazioni (R dal 2007, ultima seduta provvisoria, credito in ritardo e con le feste) |
| `js/version.js`, `version.json` | | `1.6.0`, `RELEASE` e la prima nota in `NOTES`, insieme |
| `docs/sviluppo.md` | §2 (`js/vix.js`), §3 (tabella del workflow, riga 65; fonti; approssimazioni), §5 (decisione dell'utente su soglia 1, credito e variante A o B), §6 (`vix/struttura/`), §7 (stato 1.6.0 e controllo `v160.cjs`) | |
| `scripts/fetch_vix.js`, `scripts/check_fresh.js`, `js/vix.js`, `js/vix-view.js` | intestazioni | fonti, regole, citazione |

**Frasi e numeri da cercare con grep prima di pubblicare** (ne esistono più copie):
- `VIX contro volatilità realizzata`, `VIX contro la volatilità realizzata`, `VIX contro realizzata`: `index.html` 462, 475, 829; guida 392; README 100; `js/version.js:11`;
- `Riquadri`, `4 riquadri`, `quattro riquadri`: guida 381; `v150.cjs:39`;
- `VIXCLS` e `Fonti: VIX di chiusura`: `index.html:479`, guida 394, 447, README 97, 305, 359, `fetch_vix.js`;
- `ricerca/vix/` e `Ricalcolo:`: `index.html:476`, README 96;
- `Massimo Rea`: deve restare; aggiungere `Serafini` negli stessi posti (vista, guida, README, nota di versione);
- in variante B, il numero della statistica: in tutte le copie, ricalcolato dallo script citato.

---

## 5. Stima del lavoro

| Parte | Righe circa |
|---|---:|
| `fetch_vix.js` (funzione comune, credito, facoltative, `assemble`), workflow, `check_fresh`, test della pipeline | 120 |
| `js/vix.js` (`context` e funzioni) e `test/vix_struttura.test.js` | 80 + 80 |
| `js/vix-view.js` (riquadri, due pannelli, riquadro dei valori, legenda), HTML, CSS | 120 |
| testi (guida, README, sviluppo, versione) | — |
| `v160.cjs` | 120 |

Circa una giornata e mezza con i controlli. Prima di tutto: una corsa a mano di `fetch_vix.js` dalla Action per vedere `^VIX3M` di Yahoo e FRED VXVCLS dai server di GitHub.

## 6. Screenshot del prototipo (`shots/`)

| File | Caso |
|---|---|
| `prototipo-1440-scuro.png`, `prototipo-1440-chiaro.png` | computer, 10A, riquadro dei valori aperto sul pannello di R |
| `prototipo-1024-scuro.png`, `prototipo-1024-chiaro.png` | tablet: riquadri 3 + 3 |
| `prototipo-390-scuro.png`, `prototipo-390-chiaro.png`, `prototipo-360-scuro.png`, `prototipo-360-chiaro.png` | telefono: riquadri 2 × 3, titoli stretti |
| `prototipo-1440-max-scuro.png`, `prototipo-390-max-scuro.png` | MAX: fascia «VIX3M dal 04/12/2007» |
| `prototipo-1440-3a-scuro.png` | 3A: zone di backwardation larghe, punto pieno sull'ultimo valore |
| `prototipo-1440-miss3m-scuro.png` | ultima seduta senza VIX3M: riquadro «—» con l'R del giorno prima e la sua data |
| `prototipo-1440-old-scuro.png` | file della 1.5.0: due riquadri «—», grafico a 2 pannelli |
| `prototipo-390-stat-scuro.png` | variante B: posto della riga di statistica (segnaposto, nessun numero) |

Correzioni fatte guardando gli screenshot:
- etichette dell'asse del credito sovrapposte (passo dai pixel);
- «backwardation» tagliata a 360 px (va a capo sul telefono);
- linea a 1 disegnata anche prima del 2007 a MAX;
- zone del tema chiaro troppo pallide;
- ultima seduta in backwardation invisibile sul bordo destro (punto);
- R del giorno prima mostrato come se fosse di oggi quando manca il VIX3M (ora «—»);
- zone larghe 2 px sul telefono (tolte: il premio diventava tutto rosso).

Tutti i casi: nessuno scorrimento orizzontale e console pulita.
