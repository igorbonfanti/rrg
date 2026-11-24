# Sector Monitor: revisione del codice e robustezza della pipeline

Revisione del 18/10/2026 sul ramo `claude/great-noether-2f1ude` (commit `07a09d7`, versione 0.9.0).
Lavoro fatto su una copia (`qa1/codice/repo`): `/home/user/rrg` non è stato toccato. Nessun download reale: la pipeline è stata provata con `fetch` simulato.

**Legenda**
- **[NUMERI]**: il difetto può far vedere all'utente un numero sbagliato, o un numero vecchio presentato come attuale.
- **[SILENZIO]**: un guasto che non si vede né nell'app né nell'esito del workflow.
- Gravità: **bloccante**, **alta**, **media**, **bassa**.
- I file e le righe si riferiscono al commit `07a09d7`.

**Esito di `npm test`**: 98 test, 98 passati. Con gli 11 test di prova aggiunti in questa revisione: 109 test, 99 passati, 10 falliti. I 10 falliti sono quelli che confermano i difetti qui sotto (elenco in fondo).

---

## Riepilogo

| # | Gravità | Tipo | Dove | In breve |
|---|---|---|---|---|
| B1 | bloccante | [NUMERI] | `js/signals.js:223`, `js/bottom.js:38` | La «mediana» di un numero pari di casi è il valore centrale più basso, non la media dei due centrali. Oggi XLE mostra +3,05% invece di +7,51% |
| A1 | alta | [NUMERI] | `js/signals.js:158-164` | Il giorno del segnale fallito non aggiorna il minimo della zona blu. Ne vengono un «minimo del prezzo» sbagliato e una soglia di fallimento più alta; cambia la storia di XLY 2008, SPX 2011 e UKX 2008 |
| A2 | alta | [SILENZIO] | `scripts/fetch_data.js:220-268` (anche global e macro) | Un ticker che non si scarica sparisce dal file senza avviso e con uscita 0. L'app non mostra `missing` |
| A3 | alta | [NUMERI] [SILENZIO] | `js/app.js:675-682` | I prezzi corretti degli asset reali (valori stimati) non sono segnalati nell'app, al contrario di quanto dice il README |
| A4 | alta | [SILENZIO] | `scripts/check_fresh.js:28-38`, `scripts/fetch_indices.js:300` | `check_fresh` non guarda `prices*.json` né i singoli indici: `indices.asOf` è il massimo, quindi un indice fermo da settimane passa |
| M1 | media | [NUMERI] | `scripts/fetch_indices.js:204`, `backfill_indices.py:365,397`, `js/indexdata.js:439` | Chiusure degli indici arrotondate al centesimo: CSI 300 (ETF a circa 4,24) perde fino a ±0,12% a seduta |
| M2 | media | [NUMERI] | `scripts/fetch_indices.js:32,290` | La breadth di un indice si pubblica con fino al 25% dei titoli fermi alla chiusura precedente, e l'app non lo dice |
| M3 | media | [NUMERI] | `js/format.js:287` | La tabella «Per confronto» mostra «−0,0%» |
| M4 | media | [NUMERI] | `js/cap-view.js:351-354`, `js/capitulation.js:140-147` | Cali forti: «Oggi …» senza data, anche quando l'ultima seduta calcolata non è quella del prezzo |
| M5 | media | [SILENZIO] | `scripts/fetch_indices.js:267-275` | Se il prezzo di un indice non arriva, l'indice resta fermo e se ne accorge solo il log |
| M6 | media | [NUMERI] (da verificare) | `scripts/lib/yahoo.js:62-71` | La barra della seduta in corso si scarta solo se Yahoo manda `currentTradingPeriod`; senza, passa |
| M7 | media | pipeline | `.github/workflows/update-data.yml:20-70`, `scripts/lib/yahoo.js:41` | Nessun timeout del job, nessun controllo del JSON prima del commit, Telegram inviato prima del push |
| M8 | media | prestazioni | `js/indexdata.js:403,414-419` | `decodeDates` costa circa 1 µs a data: 0,48 s su computer (circa 2 s su telefono) all'apertura degli Indici |
| L1-L12 | bassa | varie | vedi sotto | Calendario non filtrato, riempimenti non dichiarati, «—%», ordinamenti con i null, CSP, ecc. |

Possono mostrare numeri sbagliati: **B1, A1, A3, M1, M2, M3, M4, M6** (e in parte L2, L3, L9, L10).

---

## Bloccante

### B1 [NUMERI] La «mediana» è il valore centrale più basso
**Dove**: `js/signals.js:223` (`signalContext`, tabelle «Per confronto» delle viste 4 e 6, sintesi della vista 5) e `js/bottom.js:38` (riquadri della vista 5 Alert).

```js
const med = (a) => { const v = …sort(); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
```

Con un numero pari di valori la funzione restituisce il più basso dei due centrali. La mediana è la loro media, ed è così che la calcolano numpy, `statistics` e gli script del repository (`ricerca/verifica-trigger/valuta.mjs:25`). Le statistiche del README e della guida vengono da quegli script, quindi l'app non le ritrova.

**Effetto sui dati di oggi**: «+3M dopo ogni trigger», con il metodo dell'app e con la mediana vera.

| Settore | Trigger | App | Mediana |
|---|---|---|---|
| XLE | 6 | +3,05% | +7,51% |
| XLI | 4 | +7,94% | +11,10% |
| XLP | 4 | +5,01% | +6,51% |
| XLV | 6 | +4,60% | +5,02% |
| XLY | 6 | +3,70% | +3,85% |
| XLU | 8 | +3,13% | +3,47% |

I valori sono sempre spostati verso il basso. Lo stesso vale per la riga «seduta qualsiasi» e per gli indici.

**Patch**: una sola funzione per tutte e due i file.
```diff
--- a/js/signals.js
+++ b/js/signals.js
@@
+// mediana: con un numero pari di valori, la media dei due centrali (come numpy e ricerca/)
+export const median = (a) => {
+  const v = a.filter((x) => x != null).sort((x, y) => x - y), k = v.length;
+  return !k ? null : k % 2 ? v[(k - 1) / 2] : (v[k / 2 - 1] + v[k / 2]) / 2;
+};
 export function signalContext(close, at, from, horizons, bench = null, key = 1) {
-  const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
+  const med = median;
--- a/js/bottom.js
+++ b/js/bottom.js
-import { breadthSeries, …, SECTOR_KEYS } from './signals.js';
+import { breadthSeries, …, SECTOR_KEYS, median } from './signals.js';
-const median = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
```
Test di prova: `QA signals: la «mediana» di un numero pari di casi…`. Oggi fallisce: −5 invece di +2,5.

---

## Alta

### A1 [NUMERI] Il giorno del segnale fallito non aggiorna il minimo della zona blu
**Dove**: `js/signals.js:158-164`.

Il segnale fallisce quando la chiusura scende sotto `setup.pmin − escursione`, cioè per definizione su un nuovo minimo. Il ramo del fallimento però fa `continue` prima del blocco `st === 'setup'` (righe 172-174), che aggiorna `pmin`, `tp`, `bmin` e `tb`. Il minimo del giorno del fallimento va così perso, con tre conseguenze:
- «Perché questo stato» scrive un «minimo del prezzo» più alto del vero. Nello scenario di prova: 86,0 il 12/01, mentre il minimo è 85,0 il giorno del fallimento.
- La soglia del fallimento successivo si calcola da un minimo troppo alto, quindi il segnale fallisce più facilmente.
- La conferma «divergenza» usa `tp` sbagliato.

**Sui dati reali**, con la patch cambiano gli eventi di 3 serie:
- **XLY**: oggi la sequenza 2008 è trigger 03/04 → fallito 26/06 → trigger 22/07 → fallito 06/10 → trigger 17/03/2009. Con la patch diventa trigger 03/04 → zona blu 07/10/2008 → trigger 02/01/2009.
- **SPX**: il trigger del 12/10/2011 passa al 10/10/2011.
- **UKX**: il trigger dell'01/04/2008 passa al 04/04/2008.

La patch tocca la storia degli episodi, quindi secondo le regole del progetto **va decisa con l'utente**. La parte che riguarda il testo («minimo del prezzo») è invece un errore puro.

**Patch**:
```diff
@@ js/signals.js:161
         setup.fails++; setup.trig = null; setup.strict = true; trig = null; st = 'setup';
+        if (c[t] < setup.pmin) { setup.pmin = c[t]; setup.tp = t; } // il giorno del fallimento è un nuovo minimo
         days[t] = 'fail';
         continue;
```
Aggiornare anche `bmin` non cambia altri eventi sui dati di oggi. Test di prova: `QA signals: dopo il segnale fallito…` e `QA signals: «Perché questo stato» riporta il vero minimo…`. Oggi falliscono tutti e due.

### A2 [SILENZIO] Un ticker che non si scarica sparisce dal file senza avviso
**Dove**: `scripts/fetch_data.js:220-268` (USA), `488-577` (globali), `680-791` (asset reali).

Se fallisce meno del 20% dei ticker e la data avanza, il ticker fallito non entra nel nuovo file. Finisce solo in `payload.missing`, il log scrive un `console.warn` senza `::warning::` e l'uscita è 0. L'app non legge mai `missing` (`grep missing js/` trova solo il portafoglio). `moreComplete` protegge solo il caso della stessa data.

**Prova con fetch simulato** (`qa1/mockfetch.mjs`): file pubblicato al 15/10, Yahoo restituisce 404 per XLC.

```
FALLITO XLC: HTTP 404
Scritto data/prices.json (233 KB): 1255 date, 21 ticker, dati al 2026-10-16 …   exit=0
nuovo asOf 2026-10-16 · XLC presente: false · missing: ['XLC']
```

Una notte XLC sparisce dalla rotazione dei settori e dalla colonna «Rotazione» del Monitor, senza nessuna nota nell'app e con il workflow verde. Lo stesso succede per un ETF globale delistato o rinominato da Yahoo.

**Patch** (minima: rendere visibile il guasto):
```diff
@@ scripts/fetch_data.js updateUS / updateGlobal / updateMacro, dopo la scrittura
-  console.log(`Scritto …`);
+  console.log(`Scritto …`);
+  if (payload.missing.length) console.log(`::warning::${path.basename(OUT)}: senza ${payload.missing.join(', ')} (download fallito o fermi)`);
@@ js/app.js renderRRGView (rrgMeta) e renderPriceTable (rotMeta)
+  const miss = (ds().missing || []).filter((s) => grp().tickers.includes(s));
+  const missTxt = miss.length ? ` · <span class="fresh stale" title="non scaricati nell'ultimo aggiornamento">senza ${esc(miss.map(baseSym).join(', '))}</span>` : '';
-  $('rrgMeta').innerHTML = `${…}` + (isGlobal() ? … : '');
+  $('rrgMeta').innerHTML = `${…}` + (isGlobal() ? … : '') + missTxt;
```
Un'alternativa più prudente: con `asOf` nuovo e un ticker già pubblicato che manca, si tiene il file pubblicato, come fa `moreComplete` alla stessa data. La pubblicazione si ferma, ma `check_fresh` la segnala (vedi A4).

### A3 [NUMERI] [SILENZIO] I prezzi corretti degli asset reali non sono segnalati
**Dove**: `js/app.js:675-682` (`macroFreshness`), da confrontare con `globalFreshness` (righe 663-669).

`repairSpikes` sostituisce un prezzo isolato con la media geometrica dei due vicini, cioè un valore stimato. Lo fa anche nel file degli asset reali (`fetch_data.js:718-727`, campo `repaired`). Per i globali l'app dice «N prezzi anomali corretti» con il dettaglio; per gli asset reali non dice niente. Il README («si corregge, si registra nel file e si segnala nell'app»; «stesse regole degli altri file») promette il contrario. Oggi `repaired` è vuoto in tutti e due i file: il difetto è latente, ma basta un errore di stampa di Yahoo su GLD o USO.

**Patch**:
```diff
@@ js/app.js
-function globalFreshness() {
-  const g = state.global;
+const repairedNote = (g) => {
+  const n = g.repaired ? g.repaired.length : 0;
+  return n ? ` · <span title="${esc(g.repaired.map((r) => `${r.sym} ${dIT(r.date)}: ${r.from} → ${r.to}`).join('\n'))}">${n} ${n === 1 ? 'prezzo anomalo corretto' : 'prezzi anomali corretti'}</span>` : '';
+};
+function globalFreshness() {
+  const g = state.global;
   …
-  const n = g.repaired ? g.repaired.length : 0;
-  const fixed = n ? … : '';
-  return `ETF in euro, dati al ${dIT(g.asOf)}${badge}${fixed}`;
+  return `ETF in euro, dati al ${dIT(g.asOf)}${badge}${repairedNote(g)}`;
 }
@@ function macroFreshness()
-  return `ETF e bitcoin in dollari, dati al ${dIT(m.asOf)}${badge}${cpi}`;
+  return `ETF e bitcoin in dollari, dati al ${dIT(m.asOf)}${badge}${cpi}${repairedNote(m)}`;
```

### A4 [SILENZIO] `check_fresh` non copre tutti i file letti dall'app
**Dove**: `scripts/check_fresh.js:28-38`, `scripts/fetch_indices.js:300`.

Cosa resta fuori dal controllo:
- `data/prices.json`, `prices_global.json` e `prices_macro.json`. Se Yahoo serve dati vecchi, `fetch_data` scrive solo i metadati («più vecchi di quelli pubblicati: non aggiorno»), esce con 0 e il workflow resta verde. L'app segnala il ritardo solo nell'intestazione (USA) o nella riga della rotazione (globali e asset reali).
- **I singoli indici**. `indices.asOf` è il **massimo** delle date della breadth tra tutti gli indici (`fetch_indices.js:300`). Se il prezzo di un indice non arriva più, o la breadth non raggiunge mai il 75%, l'indice resta fermo e il controllo passa. Lo stesso vale per `indices_more.json`, che non è controllato.
- **I cali forti degli indici**. `capitulation.asOf` lo aggiorna solo `fetch_breadth.js:236`, quindi la parte scritta da `fetch_indices` non è controllata.

`data/index_members/*` invece è coperto (limite di 14 giorni), e anche `capitulation.json` per l'S&P 500 e i settori. I limiti esistenti sono ragionevoli: 4 giorni di calendario reggono Thanksgiving e i ponti, 6 la breadth.

Test di prova: `QA check_fresh: prezzi della rotazione fermi…` e `QA check_fresh: un singolo indice fermo…`. Falliscono tutti e due.

**Patch**:
```diff
@@ scripts/check_fresh.js staleData
     ['capitulation.json (cali forti)', d.capitulation && d.capitulation.asOf, B, 4],
+    ['prices.json (rotazione USA)', d.prices && d.prices.asOf, B, 4],
+    ['prices_global.json (ETF in euro)', d.pricesGlobal && d.pricesGlobal.asOf, today, 6],
+    ['prices_macro.json (asset reali)', d.pricesMacro && d.pricesMacro.asOf, B, 4],
   ];
+  // ogni indice con la sua ultima seduta di breadth (le borse chiudono in giorni diversi: 7 giorni)
+  for (const [k, at] of Object.entries(d.indexLast || {})) checks.push([`indici: ${k}`, at, B, 7]);
+  for (const [k, at] of Object.entries(d.capLast || {})) checks.push([`cali forti: ${k}`, at, B, 7]);
@@ main()
+  const { indexSeries } = await import('../js/indexdata.js');
+  const { capSeries } = await import('../js/capitulation.js');
+  const ix = { ...(read('indices_more.json') || {}).series, ...(read('indices.json') || {}).series };
+  const indexLast = Object.fromEntries(Object.entries(ix).map(([k, x]) => { const s = indexSeries(x); let t = s.dates.length - 1; while (t > 0 && s.pct200[t] == null) t--; return [k, s.dates[t]]; }));
+  const cap = read('capitulation.json');
+  const capLast = cap ? Object.fromEntries(Object.entries(cap.series).map(([k, x]) => { const s = capSeries(x); let t = s.dates.length - 1; while (t > 0 && s.n[t] == null) t--; return [k, s.dates[t]]; })) : {};
   const problems = staleData({ …, indexMembers,
+    prices: read('prices.json'), pricesGlobal: read('prices_global.json'), pricesMacro: read('prices_macro.json'), indexLast, capLast,
   }, …);
```
`main` diventa `async`. Gli indici con `noCap` vanno esclusi da `capLast`.

---

## Media

### M1 [NUMERI] Chiusure degli indici arrotondate al centesimo
**Dove**: `scripts/fetch_indices.js:204` (`Math.round(close*100)/100`), `scripts/backfill_indices.py:365,397` (`round(x, 2)`), `js/indexdata.js:439` (`deltaEncode(close, 100)`).

Tre «indici» usano come prezzo un ETF: CSI 300 (510300.SS, circa 4,24 CNY), TSX 60 (XIU, circa 54) ed EEM (circa 63). Per il CSI 300 l'arrotondamento vale fino a ±0,12% a seduta. Yahoo quota 510300 con 3 decimali, quindi l'«Ultimo» mostrato non è la chiusura vera, e drawdown, percentile, «Peggior calo» e soglia del fallimento lavorano su prezzi approssimati. Anche la frase del README «stessi numeri» riferita al formato compatto è vera solo per i prezzi sopra 100.

Test di prova: `QA fetch_indices: le chiusure di un ETF sotto 10…`. Oggi fallisce: 4,24 invece di 4,237.

**Patch**: scala per serie, letta dal file; i file vecchi senza `cs` restano a 100.
```diff
@@ js/indexdata.js
 export function unpackIndex(x) {
   if (!x.cd) return x;
-  const { cd, d20, d50, d200, ...rest } = x;
-  return { ...rest, close: deltaDecode(cd, 100), …
+  const { cd, cs = 100, d20, d50, d200, ...rest } = x;
+  return { ...rest, close: deltaDecode(cd, cs), …
 }
 export function packIndex(x) {
   if (x.cd) return x;
   const { close, a20, a50, a200, ...rest } = x;
-  return { ...rest, cd: deltaEncode(close, 100), …
+  const lo = Math.min(...close.filter((v) => v != null)), cs = lo < 100 ? 10000 : 100; // ETF a pochi euro: 4 decimali
+  return { ...rest, cs, cd: deltaEncode(close, cs), …
 }
@@ scripts/fetch_indices.js:204
-    const d = dates[k], c = Math.round(close[k] * 100) / 100;
+    const d = dates[k], c = Math.round(close[k] * 10000) / 10000;
```
Poi serve un nuovo backfill della storia del CSI 300 (in Python con `round(x, 4)`), altrimenti il passato resta al centesimo.

### M2 [NUMERI] Breadth degli indici pubblicata con fino al 25% dei titoli fermi
**Dove**: `scripts/fetch_indices.js:32` (`MIN_FRESH = 0.75`) e `:290`.

Una seduta si pubblica se il 75% dei titoli ha la chiusura di quel giorno. Il restante 25% conta con l'ultima chiusura degli ultimi 5 giorni (`countDay`). Per lo STOXX 600, con 17 borse e festività diverse, è una scelta sensata e documentata. Per il DAX (40 titoli) o l'SMI (20) vuol dire fino a 10 o 5 titoli con la chiusura di ieri, tipicamente quando Yahoo arriva in ritardo sull'ultima barra. Le 5 sedute ricalcolate correggono il valore la sera dopo, ma nel frattempo la breadth, lo stato e l'Avvicinamento possono cambiare e poi tornare indietro, e l'app non lo dice: il campo `fresh` non viene salvato.

**Patch**: soglia per indice e nota «provvisoria» nell'app.
```diff
@@ scripts/fetch_indices.js
-const RECOMPUTE = 5, STALE_DAYS = 5, MIN_FRESH = 0.75, MIN_OVERLAP = 0.8;
+const RECOMPUTE = 5, STALE_DAYS = 5, MIN_OVERLAP = 0.8;
+const minFresh = (c) => c.minFresh ?? (c.multiExchange ? 0.75 : 0.95); // config/indices.json
@@ :290
-        if (r.n && r.fresh >= r.n * MIN_FRESH) { setCounts(e, d, r); done.push(d); }
+        if (r.n && r.fresh >= r.n * minFresh(cfg[k])) { setCounts(e, d, r); done.push(d); e.freshLast = [d, r.fresh, r.n]; }
```
Con `freshLast` nella serie, `indices.js` può scrivere «breadth provvisoria: 38 di 40 titoli con la chiusura del giorno» quando `fresh < n`.

### M3 [NUMERI] «−0,0%» nella tabella «Per confronto»
**Dove**: `js/format.js:287` (`contextHTML`, funzione `cell`).

`cell` ha una sua formattazione, che non passa da `sgn`: con un valore come −0,03 scrive «−0,0%» in rosso. Ogni altro punto dell'app gestisce lo zero negativo, quindi questo è l'unico rimasto. Test di prova: `QA format: contextHTML…`. Fallisce.
```diff
-  const cell = (v) => (v == null ? '<span class="muted">—</span>' : `<span class="${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1).replace('.', ',')}%</span>`);
+  const cell = (v) => (v == null ? '<span class="muted">—</span>' : pct(v));
```

### M4 [NUMERI] Cali forti: «Oggi» senza data
**Dove**: `js/capitulation.js:140-147` (`today` è l'ultima seduta con una somma), `js/cap-view.js:351-354` e `:312` (cella della tabella degli indici).

Se le ultime sedute della serie non hanno dati (`n` nullo, oppure la breadth dell'indice non è pubblicabile e quindi `fetch_indices` non aggiunge i cali), `today` torna indietro all'ultima somma disponibile. La scheda però scrive «Oggi X nelle ultime 5 sedute» e il riquadro «allerta oggi», senza data. Sopra c'è un prezzo di una seduta più recente.

Test di prova: `QA cali forti: la situazione «di oggi»…`. Fallisce: `today.i` è la penultima seduta.
```diff
@@ js/cap-view.js card()
-    const t = a.today;
+    const t = a.today, tDate = s.dates[t.i], pDate = o.dates[o.dates.length - 1];
+    const when = tDate < pDate ? `Al ${dIT(tDate)}` : 'Oggi';
@@
-      : `Oggi ${val(t.value)} nelle ultime ${opt.win} sedute: …`) +
+      : `${when} ${val(t.value)} nelle ultime ${opt.win} sedute: …`) +
```
Lo stesso va fatto in `info()` e `cell()`: la data è già in `status(k).date`.

### M5 [SILENZIO] Il prezzo di un indice non arriva e l'indice si ferma senza dirlo
**Dove**: `scripts/fetch_indices.js:267-275`.

Se `fetchDaily(cfg[k].price)` fallisce, il log ha solo un `console.warn` e `return`: l'indice non aggiorna né il prezzo né la breadth né i cali forti, e lo script esce con 0. Con A4 non coperto, un ticker di Yahoo rinominato (come succede con alcuni indici asiatici) lascia l'indice fermo per sempre. L'app lo mostra solo nel tooltip «chiusura del …» e nell'intervallo di date sopra il tabellone.
```diff
-    try { return await fetchDaily(cfg[k].price, { range: '1mo', raw: true }); } catch (e) { console.warn(`  ${cfg[k].price}: ${e.message}`); return null; }
+    try { return await fetchDaily(cfg[k].price, { range: '1mo', raw: true }); } catch (e) { console.log(`::warning::${k}: prezzo ${cfg[k].price} non disponibile (${e.message}): indice non aggiornato`); return null; }
```

### M6 [NUMERI] (da verificare) La barra in corso si scarta solo se c'è `currentTradingPeriod`
**Dove**: `scripts/lib/yahoo.js:62-71`.

`parse` riconosce la barra della seduta in corso solo da `meta.currentTradingPeriod.regular`. Se il meta non lo contiene, la barra intraday passa come chiusura. Due casi:
- L'endpoint spark (`fetch_indices.js:112`): non ho verificato in rete che il suo meta abbia sempre `currentTradingPeriod`.
- Un meta ridotto restituito da Yahoo in caso di errore.

Nella corsa delle 11:40 UTC le borse europee sono aperte. Oggi la breadth degli indici è protetta perché il ciclo gira sulle date del prezzo dell'indice (endpoint chart). Restano esposti la `next` del filtro degli errori di stampa nei cali forti e `fetch_breadth`, che non usa `dropAfter`.

Test di prova: `QA yahoo.parse: senza currentTradingPeriod…`. Fallisce: la barra del 16/10 alle 13:40 di Francoforte viene tenuta.
```diff
@@ scripts/lib/yahoo.js parse()
-    const open = reg && ts[i] >= reg.start && nowSec < reg.end;
+    // senza orario di contrattazione: la barra di oggi (nel fuso della borsa) non è sicuramente chiusa
+    const todayLocal = barDate(nowSec, meta.gmtoffset);
+    const open = reg ? ts[i] >= reg.start && nowSec < reg.end : barDate(ts[i], meta.gmtoffset) === todayLocal;
```
In aggiunta, in `fetch_breadth.js:382`, `d <= today` va bene come seconda difesa, perché `today` è `expectedSession()`.

### M7 Workflow: timeout, JSON troncati, Telegram prima del push
**Dove**: `.github/workflows/update-data.yml:20-70`, `scripts/lib/yahoo.js:41`.

- **Timeout**: il job non ha `timeout-minutes`, quindi vale il default di 6 ore. `fetchDaily` non ha `AbortSignal.timeout`: lo spark sì, il chart no. Una connessione appesa blocca il gruppo di concorrenza e le corse successive restano in coda.
- **JSON troncati**: se uno script viene interrotto durante `writeFileSync`, il JSON resta troncato. `keep_unchanged` lo considera cambiato (il parse fallisce) e il commit lo pubblica, e l'app si ferma con «Impossibile caricare i dati». Prima del commit nessun passo controlla che i file siano JSON validi.
- **Telegram prima del push**: `send_alerts` invia prima del commit. Se `git pull --rebase` o `push` falliscono (conflitto su `data/` con una pubblicazione manuale), `alerts.json` non arriva su `main` e la corsa dopo invia di nuovo gli stessi messaggi. Il workflow va in rosso, quindi il guasto si vede, ma i doppioni restano.
- **Commit con passi falliti**: il commit parte anche quando un passo è fallito. È voluto e va bene, perché i file sono indipendenti.
- **Concorrenza e segreti**: `concurrency` senza annullamento va bene. I segreti stanno solo nell'ambiente del passo degli alert, e anche questo va bene.

```diff
@@ jobs.update
     runs-on: ubuntu-latest
+    timeout-minutes: 45
@@ Commit dati aggiornati
           node scripts/keep_unchanged.js
+          for f in data/*.json data/index_members/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || { echo "::error::$f non è JSON valido"; git checkout -- "$f"; }; done
           git add data/
@@ scripts/lib/yahoo.js:41
-      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' } });
+      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' }, signal: AbortSignal.timeout(30000) });
```
Con `AbortSignal.timeout` l'errore è un `DOMException` di tipo `TimeoutError`, non un `TypeError`. Per riprovare anche in quel caso serve `if (!e.retry && !(e instanceof TypeError) && e.name !== 'TimeoutError') break;`.

Per i doppioni di Telegram: scrivere `alerts.json` e fare commit e push prima dell'invio, oppure segnare gli eventi come `pending` e inviarli alla corsa dopo il push.

### M8 Prestazioni: `decodeDates` lento
**Dove**: `js/indexdata.js:403,414-419`.

`new Date(t).toISOString().slice(0, 10)` per ogni data: circa 1 µs l'una. Aprendo la pagina Indici con la scheda dei cali forti si decodificano 308.727 date (32 serie dei cali forti più 22 indici), cioè **477 ms su questo computer**, plausibilmente 1,5-2 s su un telefono di fascia media. Con una cache, che produce date identiche (verificato su tutte le serie), si scende a **68 ms**.
```diff
 const DAY = 86400000;
-const iso = (t) => new Date(t).toISOString().slice(0, 10);
+const ISO = new Map(); // le stesse date si ripetono in tutte le serie
+const iso = (t) => { let s = ISO.get(t); if (s === undefined) { s = new Date(t).toISOString().slice(0, 10); ISO.set(t, s); } return s; };
```

Altri tempi misurati, tutti accettabili:
- `capAnalysis` sulle 32 serie: 102 ms.
- `runMachine` sui 22 indici: 58 ms.
- `build` giornaliero: 12 ms.
- Replay della Bottom Map degli indici: 18 ms a fotogramma per i 22 indici, perché `approachLevel` riordina tutta la storia a ogni settimana. Vedi L11.

---

## Bassa

**L1. Le sedute candidate della breadth non passano dal calendario NYSE** (`scripts/fetch_breadth.js:382`). Se Yahoo emettesse una barra piatta in un giorno di chiusura per quasi tutti i titoli, la seduta verrebbe pubblicata. Patch: `.filter((d) => d >= from && d <= today && isTradingDay(d))`, importando `isTradingDay` da `calendar.js`. Le chiusure straordinarie, che il calendario non conosce, restano scoperte.

**L2. Riempimenti non dichiarati**. Tre punti riempiono le lacune con l'ultimo prezzo noto senza dirlo nell'app:
- `alignSeries` (`fetch_data.js:65-81`) per i ticker USA. Per i globali il riempimento è documentato, per gli USA no.
- L'allineamento degli ETF in `sectors.json` (`fetch_breadth.js:329-333`).
- La linea del prezzo nel grafico dei cali forti (`cap-view.js:361`).

`keepPublished` limita il caso più frequente. Patch minima: contare i valori riempiti per ticker, scriverli nel file (`filled: {sym: n}`) e stampare un `::warning::` quando riguardano l'ultima seduta.

**L3. «—%» e classi sbagliate con i null**. `pct(NaN)` dà `<span class="down">—%</span>` (`format.js:206`; il test di prova fallisce). Anche `sgn(null) + '%'` scrive «—%» in `app.js:379` (`ddCell`), `bottom.js:429` (`DD 52s` dei titoli) e `indices.js:177`.
```diff
-export const pct = (v, d = 1) => (v == null ? '<span class="muted">—</span>' : …
+export const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? '<span class="muted">—</span>' : …
```
Nelle celle conviene usare `pct(v)` invece di `sgn(v) + '%'`.

**L4. Ordinamenti con i null** (`app.js:355-360`). `a.mt.d1 - b.mt.d1` tratta un valore mancante come 0, quindi un ETF quotato da poco senza YTD finisce in mezzo. Patch: `const num = (k) => (a, b) => (a.mt[k] ?? -Infinity) - (b.mt[k] ?? -Infinity);`.

**L5. Un cambio dei membri riscrive le ultime 5 sedute** (`fetch_breadth.js:383-384`). La breadth ricalcolata usa la lista di oggi anche per le 4 sedute prima, e il cambio si registra con la data in cui viene visto, non con quella di efficacia. Sono scarti di uno o due titoli. Va detto nel README («le ultime 5 sedute si ricalcolano con la lista attuale») oppure i membri vanno filtrati con `sp500_history.json`.

**L6. Alert spostati dal ricalcolo** (`send_alerts.js:137-144`). Se il ricalcolo sposta un evento dal giorno t a t+1, la chiave `data|settore|codice` cambia e Telegram riceve un secondo messaggio con la data nuova, senza rettifica del primo. Si risolve deduplicando su `settore|codice` dentro la finestra di `recheck`.

**L7. XSS e igiene**.
- Le stringhe esterne (nomi da Wikipedia e dalle holdings, ticker) passano da `esc()` o `textContent`. Unica eccezione: `e.sector` di `alerts.json` in `bottom.js:490`, un file scritto dalla pipeline. Patch: `${esc(e.sector)}`.
- Restano senza escape alcune stringhe di configurazione del repository (`r.k` e le chiavi di `config/indices.json`): basso rischio.
- Tutti i link `target="_blank"` hanno `rel="noopener"`.
- Nessun segreto nel repository né nella storia (ricerca di token Telegram vuota).
- Manca una CSP. Consiglio: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'sha256-<hash dello script del tema>'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'">` in `index.html` e `guida.html`. La guida ha uno script modulo inline: va spostato in un file o aggiunto con il suo hash.
- `localStorage` è condiviso da tutte le app di `igorbonfanti.github.io`. I valori letti sono già validati (`store.pick`, `validBlue`, `cleanWeights`), e `dIT(base.date)` scrive al massimo 8 caratteri non scappati: rischio trascurabile.

**L8. Workflow**. Le azioni `actions/checkout@v5` e `setup-node@v5` non sono fissate per SHA. Il permesso `contents: write` vale per tutti i passi, compresi gli script che leggono da Internet. Consiglio: azioni fissate per SHA e `persist-credentials: false` nel checkout, con il push fatto con il token solo nel passo del commit.

**L9. Cambio di ieri sull'ultima seduta** (`fetch_data.js:455-461`). Alle 22:40 UTC la barra del cambio del giorno è ancora aperta e `parse` la scarta, quindi l'ultima seduta si converte con il cambio del giorno prima. Oggi riguarda solo la storia del proxy DBMF (tutti i ticker globali sono in EUR): latente.

**L10. Nessun controllo degli errori di stampa sui prezzi USA**. `repairSpikes` gira solo per globali e asset reali: un prezzo sbagliato di Yahoo su un ETF USA passa così com'è. Almeno un `::warning::` per i salti isolati che rientrano, senza correggere.

**L11. Replay della Bottom Map**: `approachLevel(slice(0, T + 1))` riordina tutta la storia a ogni fotogramma e a ogni cambio di evidenza (`bottom.js:268`, `indices.js:254`). Si può calcolare una volta la serie dei cali e mantenere un array ordinato in modo incrementale, oppure tenere in cache per (serie, T).

**L12. `keep_unchanged.js`**: nessun rischio di nascondere cambi veri. Toglie solo il campo `generated` di primo livello, e un file illeggibile risulta cambiato. L'unico caso critico è quello dei JSON troncati in M7.

---

## Pipeline: scenari richiesti

| Scenario | Cosa succede | Valutazione |
|---|---|---|
| Yahoo fallisce in parte (meno del 20% dei ticker o del 10% dei membri) | Prezzi: il ticker sparisce dal file (A2). Breadth: serve il 99% dei membri e al massimo 1 mancante per settore, altrimenti la seduta aspetta. Indici: si riscarica dall'endpoint chart | prezzi da correggere (A2) |
| 429 o 5xx | `fetchDaily` riprova 3 volte (0,8-3,2 s, alternando query1 e query2); lo spark riprova 4 volte e poi passa al chart. Se mancano troppi dati lo script fallisce in modo visibile | ok; manca il timeout (M7) |
| Risposta vuota o illeggibile | Il JSON non valido non si riprova (`SyntaxError`) e il simbolo risulta fallito. `nessun dato` fa lo stesso | ok |
| Festività | Calendari NYSE e Milano corretti per le feste regolari; le chiusure straordinarie compaiono come «1 seduta indietro» (documentato). La breadth non filtra le date con il calendario (L1) | ok |
| Ora legale | Cron in UTC; `expectedSession` usa `Intl` nel fuso della borsa; 22:40 UTC cade dopo le 16:30 di New York in tutte e due le stagioni | ok |
| Cambio dei membri | S&P: la lista si accetta se ci sono 490-520 titoli, 11 settori e cambi plausibili; le ultime 5 sedute si ricalcolano con la lista nuova (L5). Indici: la lista si accetta con almeno l'80% in comune | ok |
| Date doppie | `parse` tiene l'ultima barra; `encodeDates` lancia un errore su un intervallo di 0 giorni, quindi il guasto si vede | ok |
| Ticker delistato | USA e globali: sparisce in silenzio (A2). Membri dell'S&P: dopo 7 giorni non blocca più. Membri degli indici: dopo 5 giorni non conta più | A2 |
| Ultima barra in ritardo | Prezzi: si pubblica alla data comune più vecchia. Breadth: la seduta aspetta il 99%. Indici: si pubblica con il 75% (M2). Globali: si usa il prezzo della quotazione (documentato) | M2 |
| Valori riempiti o stimati pubblicati in silenzio | Correzioni degli asset reali (A3); riempimenti USA e `sectors.json` (L2); chiusure arrotondate degli indici (M1) | A3, L2, M1 |

---

## Test scritti in questa revisione

File: `qa1/codice/repo/test/qa_probe.test.js`, nella copia. Non è stato fatto nessun commit. Comando: `npm test` nella copia.

| # | Test | Esito | Conferma |
|---|---|---|---|
| 1 | fmt/sgn/pct non mostrano mai «−0,0» | passa | lo zero negativo è gestito in `format.js` |
| 2 | contextHTML non mostra «−0,0%» | **fallisce** | M3 |
| 3 | pct(NaN) non ha la classe «down» | **fallisce** | L3 |
| 4 | mediana di un numero pari di casi | **fallisce** (−5 invece di 2,5) | B1 |
| 5 | dopo il fallimento, `pmin` comprende il giorno del fallimento | **fallisce** (86 invece di 85) | A1 |
| 6 | «Perché questo stato» riporta il vero minimo | **fallisce** | A1 |
| 7 | «oggi» dei cali forti è l'ultima seduta | **fallisce** (898 invece di 899) | M4 |
| 8 | check_fresh segnala `prices*.json` fermi | **fallisce** | A4 |
| 9 | check_fresh segnala un singolo indice fermo | **fallisce** | A4 |
| 10 | `parse` scarta la barra in corso anche senza `currentTradingPeriod` | **fallisce** | M6 |
| 11 | `mergePrices` tiene la terza cifra (4,237) | **fallisce** | M1 |

Prove fuori da `node --test`:
- **`fetch_data.js us` con fetch simulato** (`qa1/mockfetch.mjs`, copia in `qa1/sim/`): XLC risponde 404, lo script esce con 0 e XLC non è più nel file (A2).
- **Impatto di A1 sui dati reali**: script `qa1/patched/cmp.mjs`, che confronta gli eventi di 11 settori e 22 indici con e senza la patch. Cambiano 3 serie.
- **Impatto di B1 sui dati reali**: tabella in B1.
- **Tempi**: `decodeDates` 477 ms → 68 ms con la cache, con date identiche.

**Logica importante senza test**:
- `app.js`, `bottom.js`, `indices.js`, `cap-view.js`, `titles.js`: nessun test con DOM. I numeri del Monitor e dei tabelloni, il routing, la persistenza delle scelte e le cache per opzione non sono verificati. Un test con `linkedom` o `happy-dom` sul Monitor ai dati di un giorno fisso basterebbe a fermare regressioni come B1 e M3.
- Flussi completi di `updateUS`, `updateGlobal`, `updateMacro` e `fetch_indices.main` con fetch simulato: guasti parziali, `moreComplete`, `keepPublished` insieme a `asOf` nuovo.
- `main()` di `check_fresh` (quali file legge davvero) e il passo di commit del workflow.
- `explainState` quando lo stato dell'ultima seduta viene da una seduta precedente (`while (t > 0 && m.days[t] == null) t--`).

---

## Cose verificate e trovate corrette

- **Matematica della rotazione** (`engine.js`):
  - SMA ed EMA con lacune;
  - riscaldamento della formula nuova (`i < first + long`);
  - settimane da domenica a sabato in UTC e settimana provvisoria con il calendario giusto (Milano per i globali);
  - direzione in gradi bussola.
- **Date**: tutte lette come UTC (`T00:00:00Z` o ISO senza ora) e scritte con `toISOString`; nessuna lettura nel fuso locale.
- **Drawdown e percentile** (`metrics.js`): la finestra di 252 sedute è esatta (`q[0] <= i - win`); il percentile usa solo il passato.
- **Portafoglio sintetico**: ribilanciamento alla chiusura dell'ultima seduta del mese e pesi validati.
- **Cache**: le macchine a stati sono in cache per serie e livello blu, i cali forti per serie e scelte; il modello della rotazione si invalida quando cambiano i pesi del portafoglio.
- **Numeri all'italiana**: lo zero negativo è gestito in `fmt`, `sgn`, `pct` e `f1` (l'unica eccezione è M3). Le migliaia non hanno il separatore: 65324,29 invece di 65.324,29. Non è un errore, ma si legge peggio.
