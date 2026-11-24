# Piano: avvicinamento in «risalita dopo un minimo» (A nota, B regola)

31/10/2026 · fase 1, agente «Inserimento nel codice» · sola lettura, nessuna modifica all'app.
Base: ramo `claude/great-noether-2f1ude` al commit `4e894f8` (app 1.3.3). Le righe citate sono di quel commit.

Le due modifiche:

- **A, nota senza cambio di regola**: avvicinamento acceso come oggi; se è in risalita, scheda, riquadro dei valori e
  tooltip dicono «probabile risalita dopo un minimo» al posto di «in un calo deciso il livello blu è a circa due
  settimane». Il badge resta «Avvicinamento».
- **B, cambio di regola**: in risalita l'avvicinamento non si accende (badge, anello, tratto giallo, voce nel Monitor),
  per settori e indici.

Condizione di «risalita» alla seduta t: nelle 20 sedute prima lo stato è stato almeno una volta diverso da Normale, e la
breadth di t è almeno 10 punti sopra il minimo della breadth in quelle 20 sedute.

---

## 1. Dove va il calcolo

### 1.1 Definizione esatta (da fissare uguale nel backtest)

| Punto | Scelta proposta | Perché |
|---|---|---|
| Finestra | sedute t−20 … t−1 della serie (indici di posizione, non date di calendario), troncata a 0 all'inizio | «le 20 sedute prima». Includere t non cambia niente: t è Normale per costruzione (l'avvicinamento lo chiede) e, se b[t] fosse il minimo, la differenza sarebbe 0 < 10 |
| Sedute di una serie | quelle della serie: per i settori le date di `sectors.json` (fino a `NOW`), per ogni indice le sue date (`S[k].dates`, fino a `NOW[k]`) | come `approachSeries` e `stateAt` |
| Stato di un giorno senza calcolo (`days[t] == null`) | l'ultimo calcolato prima; prima del primo stato «normal» | identico a `stateAt` (bottom.js:270, indices.js:258) e ad `apprDays` (bottom.js:144) |
| «Diverso da Normale» | qualsiasi codice ≠ `normal`: `watch`, `setup`, `trig`, `fail`, `cool` | il testo dell'idea dice «diverso da Normale». Nota: conta anche il `cool` (le 63 sedute dopo un trigger), quindi nelle 20 sedute dopo la fine del cooldown la condizione può essere vera; per questo il testo deve dire «dopo un minimo», non «dopo l'Attenzione» |
| Minimo della breadth | minimo dei valori non nulli in t−20 … t−1 | un buco nei dati non deve creare un minimo finto |
| Nessuna breadth nella finestra | condizione **falsa** | senza dati non c'è prova di risalita; con B l'avvicinamento resta acceso (si sbaglia mostrando, non nascondendo) |
| Breadth di t nulla | condizione falsa (e comunque niente avvicinamento) | |
| Soglia dei 10 punti | `b[t] − min ≥ 10 − 1e-9` | **necessario**: la breadth è `100·a/n` in virgola mobile e una differenza di 10 punti esatti spesso esce 9,999999999999998 (per esempio n = 30, 3 titoli). Nel controllo veloce sui settori la tolleranza cambia l'esito in 2 sedute in avvicinamento. Il backtest deve usare la stessa tolleranza, o i conteggi non coincideranno |
| Prima seduta con uno stato | la finestra cade su sedute senza stato, contate come Normale: condizione falsa, a meno che nelle sedute con uno stato ce ne sia una non Normale | coerente con `stateAt` |
| Livello blu | la condizione dipende dal livello solo attraverso gli stati (la breadth non dipende dal livello): si calcola insieme agli stati della macchina dello stesso livello | |
| Dati futuri | nessuno: usa `days[0..t-1]` e `b[0..t]`; `runMachine` è sequenziale e `approachSeries` è seduta per seduta | da provare con un test (§4) |

### 1.2 Funzioni nuove in `js/signals.js` (dopo `approachSeries`, riga 115)

```js
// Parametri dell'avvicinamento (non sono in config/thresholds.json: non toccano stati né alert)
export const APPROACH = { h: 10, q: 0.9, reboundSessions: 20, reboundRise: 10, hideRebound: false }; // B: hideRebound: true

/** Stato di ogni seduta: per un giorno senza calcolo l'ultimo calcolato, prima del primo 'normal' (come stateAt). */
export function carryStates(days) { … }                       // (string|null)[] → string[]

/**
 * Risalita alla seduta t: nelle `w` sedute prima (t−w … t−1) almeno uno stato diverso da Normale e la breadth di t
 * almeno `rise` punti sopra il minimo della breadth di quelle sedute. Solo dati fino a t.
 * @returns {null | {min: number, tMin: number, tLast: number, code: string}}  null = condizione falsa;
 *   tMin seduta del minimo, tLast ultima seduta non Normale, code il suo stato (per il testo)
 */
export function reboundAt(b, st, t, w = APPROACH.reboundSessions, rise = APPROACH.reboundRise) { … }

/**
 * Avvicinamento seduta per seduta, con la sola storia fino a ogni seduta.
 * @param b breadth (pct200), L livello blu, days runMachine(...).days con lo stesso livello
 * @returns {{A: (number|null)[], st: string[], below: boolean[], rebound: boolean[], on: boolean[]}}
 *   below = regola di oggi (stato Normale e breadth ≤ soglia); rebound = below e reboundAt ≠ null;
 *   on = below, oppure (con hideRebound) below && !rebound
 */
export function approachDays(b, L, days, { hideRebound = APPROACH.hideRebound } = {}) { … }

/** Testo «perché» dell'avvicinamento, uguale per settori e indici (oggi ripetuto in 4 punti). */
export function approachWhy({ b, A, L, what /* 'del settore' | "dell'indice" */, rebound /* reboundAt(...) | null */, dates }) { … }
```

- `reboundAt` si calcola solo dove `below[t]` è vero: costo O(n·20) solo su quelle sedute, trascurabile.
- `approachDays` usa `approachSeries(b, L, APPROACH.h, APPROACH.q)`: la soglia resta quella di oggi, seduta per seduta.
- Con **A** `hideRebound` resta `false` e `on` coincide seduta per seduta con la regola di oggi (test §4). Con **B** si
  mette `true`. Una sola costante, così app, script di ricerca e test usano la stessa regola.
- `approachWhy` porta in un solo punto la frase che oggi è in bottom.js:154, indices.js:129 e indices.js:184; si può
  provare in Node (oggi `apprWhy` è chiuso dentro `createBottom` e non si può testare).

### 1.3 Uso nelle viste (una cache per serie e livello)

`js/bottom.js`, al posto di `apprCache`/`apprSeries`/`approach`/`apprDays`/`approachAt` (righe 132–150 e 279–283):

```js
const apprCache = new Map();
function appr(s) {               // chiave s:L, come machine(s): con −/+ si calcola la serie del livello nuovo
  const L = st.blue[s], key = s + ':' + L;
  if (!apprCache.has(key)) apprCache.set(key, approachDays(BR[s].pct200.slice(0, NOW + 1), L, machine(s).days.slice(0, NOW + 1)));
  return apprCache.get(key);
}
const approachAt = (s, T) => { const x = appr(s); return { A: x.A[T], on: x.on[T], rebound: x.rebound[T] }; };
const approach = (s) => approachAt(s, NOW);
```

- `approach(s)` oggi usa `stateOf(s).code` (ultimo stato calcolato fino a `NOW`): `carryStates(days)[NOW]` è lo stesso
  valore, quindi il comportamento a `NOW` non cambia (test §4).
- `apprDays(s)` diventa `appr(s).on`; `apprSeries(s)` diventa `appr(s).A`.
- Il replay della Bottom Map legge `appr(s).on[T]`: niente calcoli per fotogramma.

`js/indices.js`, al posto di `apprCache` + `approach` (righe 115–121) e di `apprAt` + `approachAt` (righe 265–273):
stessa struttura con chiave `k:L`, `S[k].pct200.slice(0, NOW[k] + 1)` e `machine(k).days.slice(0, NOW[k] + 1)`. Oggi
gli indici calcolano `approachLevel` sulla storia tagliata (a `NOW` e, nel replay, per ogni T con una cache `k:L:T`):
`approachSeries` dà gli stessi numeri (test esistente `test/signals.test.js:95`), e il replay diventa più veloce.
L'import di `approachLevel` (indices.js:7) passa a `approachDays`.

Casi limite da coprire nel codice:
- **Livello blu cambiato con −/+**: chiave `s:L` (e `k:L`) come `machine`; nessuna cache per T da invalidare (sparisce
  `apprAt`). Tornare al livello di default riusa la serie già calcolata.
- **Secondo file degli indici** (`loadMore`, indices.js:75): aggiunge serie nuove, non cambia quelle già in cache.
- **`NOW` < ultima data** (settori: prezzi senza breadth; indici: `NOW[k]`): le serie sono tagliate a `NOW + 1`, come oggi.
- **Breadth nulla a T nel replay**: `on[T]` falso, `A[T]` può esistere (tooltip «Soglia» resta come oggi).

---

## 2. Tutti i punti che leggono l'avvicinamento

Legenda: «=» resta uguale; A e B dicono cosa cambia.

### js/signals.js
| Riga | Cosa | A | B |
|---|---|---|---|
| 81–117 | `approachLevel`, `approachSeries` e commento con le statistiche | = (aggiunte le funzioni §1.2) | = le funzioni; il commento 84–87 cita «50 tocchi su 63 … 33 … uno su tre»: va riscritto con i numeri della regola B |

### js/bottom.js (settori)
| Riga | Cosa | A | B |
|---|---|---|---|
| 7 | import `approachSeries` | → `approachDays`, `approachWhy` | idem |
| 20 | `ORDER.appr = 4.5` | = (badge uguale, stesso posto) | = (i settori in risalita tornano «normal», ordinati con i Normali) |
| 32 | `apprBadge()` | = | = |
| 126–127 | `explain(s)`: `why` = «Avvicinamento: …» | testo con la risalita (via `apprWhy`) | in risalita niente `why` di avvicinamento; proposta: una voce informativa (`ok: null`) nella lista «breadth sotto la soglia di avvicinamento X%, ma in risalita dopo un minimo: avvicinamento non acceso», così il valore «sotto» della Situazione non sembra un errore |
| 132–150 | `apprCache`, `apprSeries`, `approach`, `apprDays` | sostituite da `appr` (§1.3) | idem |
| 152–155 | `apprWhy` con «in un calo deciso il livello blu è a circa due settimane» | in risalita: «… : probabile risalita dopo un minimo» (proposta, con i dati che lo dicono: «la breadth è risalita di N punti dal minimo del gg/mm»); usa `approachWhy` | invariata nel testo (vale solo per gli avvicinamenti accesi, che non sono mai in risalita) |
| 160–161 | `snapCode` per «Dalla tua visita» | = | **attenzione**: la fotografia salvata nel browser con la 1.3.3 ha `appr` per un settore che con B diventa `normal`; con i dati dello stesso giorno la striscia direbbe «XLRE Avvicinamento → Normale» per il cambio di regola. Proposta: salvare `ar: 2` nella fotografia e, se la base non ce l'ha, non mostrare i passaggi `appr` ↔ `normal` (3 righe) |
| 200, 204 | riga del Monitor `appr: approach(s).on`, ordinamento | = | automatico (legge `on`) |
| 210 | badge nella tabella | = | automatico |
| 232 | KPI «Settori in attenzione … in avvicinamento: …» | = (facoltativo: «XLRE (risalita)») | automatico |
| 236–240 | «Settori da osservare»: `active`, schede con `apprWhy` | testo della scheda in risalita | automatico: il settore in risalita esce dalla lista se è Normale |
| 242 | legenda del Monitor (statistiche 50/63, 7, «uno su tre») | = + mezza frase sulla nota | regola nuova + statistiche nuove |
| 270–276 | `stateAt` | = (si può riscrivere con `carryStates`, non necessario) | = |
| 279–285 | `approachAt`, `mapRings` (replay) | sostituite (§1.3) | anello spento in risalita, automatico |
| 357–362 | tooltip della Bottom Map: «Stato: Avvicinamento», «Soglia» | «Avvicinamento · probabile risalita» | = (dice «Normale»; facoltativo: «Normale · sotto la soglia, in risalita») |
| 410 | badge della vista Settore | = | automatico |
| 416 | `drawSector({ appr: apprDays(s), apprA: apprSeries(s) })` | + `apprR: appr(s).rebound` per il tooltip del grafico | `appr` già filtrato; tratto giallo e pallino spariscono, automatico |
| 440 | Situazione, riga «Soglia di avvicinamento» (valore e tooltip con 50/63, 7, 43, 33, «uno su tre») | valore «40% · sotto · probabile risalita»; nel tooltip una frase sulla nota (e la sua statistica, se citata, da script) | valore «40% · sotto, in risalita: non conta»; tooltip con la regola nuova e le statistiche nuove |

### js/indices.js
| Riga | Cosa | A | B |
|---|---|---|---|
| 7 | import `approachLevel` | → `approachDays`, `approachWhy` | idem |
| 16 | `ORDER` | = | = |
| 115–121 | `apprCache`, `approach` (approachLevel a `NOW[k]`) | sostituite (§1.3) | idem |
| 129 | `explain(k).why` con «due settimane» | testo con la risalita | come i settori (voce informativa) |
| 162, 166 | righe del tabellone e ordinamento | = | automatico |
| 184 | `title` della cella Stato con «due settimane» | testo con la risalita | automatico (titolo solo se acceso) |
| 203 | KPI «Indici in attenzione … in avvicinamento» | = | automatico |
| 258–264 | `stateAt` | = | = |
| 265–273 | `apprAt` (cache `k:L:T`) e `approachAt` | sostituite: niente più `apprAt` | idem |
| 341 | `rings` della Bottom Map degli indici | = | automatico |
| 366 | badge del dettaglio | = | automatico |
| 368–373 | `drawSector` degli indici: **non** passa `appr`/`apprA` (nessun tratto giallo sugli indici, sector-chart.js:45 «solo settori») | = | = (niente da togliere) |
| 395 | Situazione, «Soglia di avvicinamento» (89/132, 83, 83, 40%) | come i settori | regola e statistiche nuove |
| 448–452 | tooltip della Bottom Map degli indici | come i settori | = |

### js/sector-chart.js
| Riga | Cosa | A | B |
|---|---|---|---|
| 45, 54 | parametri `appr`, `apprA` | + `apprR` (facoltativo) | = |
| 154–162 | tratti `.brappr` e pallino `.apprin` | = | = il codice; cambiano i dati. **Rischio**: con B l'avvicinamento si può accendere a metà di un tratto che oggi è giallo, quando passano 20 sedute dall'ultimo stato non Normale o la breadth scende sotto «minimo + 10»: compare un pallino d'ingresso che non è un calo nuovo (vedi §5) |
| 190 | intestazione del tooltip «· avvicinamento» | «· avvicinamento, probabile risalita» | = |
| 194 | riga «Soglia avvicinamento» | = | = (facoltativo: «sotto, in risalita» se `b ≤ A` e non acceso) |

### js/bottom-map.js
| 31, 93 | `rings` → `.appr-ring` | = | = (riceve meno settori) |

### Altri file controllati
- **Alert Telegram**: `scripts/send_alerts.js` importa solo `breadthSeries, priceSeries, runMachine, SECTOR_KEYS` (riga 14)
  e invia gli eventi della macchina (riga 31). Nessun uso dell'avvicinamento: **non manda alert, né oggi né con A o B**.
  Anche `.github/` non lo cita.
- **`scripts/pine_zone_blu.mjs`**: usa solo `runMachine` (righe 12, 44, 52) e disegna zone blu, trigger e falliti;
  `pine/sector-monitor-zone-blu.pine` non contiene l'avvicinamento. Nessun cambio.
- Altri script (`fetch_*`, `check_fresh`, `need_update`, `keep_unchanged`, `scripts/lib/`): nessun uso.
- `js/app.js`, `js/titles.js` (usa `stateCode`, cioè lo stato della macchina), `js/cap-*.js`, `js/format.js`: nessun uso.
  I pallini dei bottoni dei settori (`sd-${stateOf(k).code}`, bottom.js:406, indices.js:362) usano lo stato, non
  l'avvicinamento: invariati.
- **Script di ricerca che definiscono l'avvicinamento in proprio** (da aggiornare solo con B, per rifare le statistiche):
  `ricerca/attenzione/script/avvicinamento_pit.mjs` (riga 30), `avvicinamento_pit_indici.mjs` (26–27),
  `anticipo_appaiato.mjs` (16), `anticipo_tocchi.mjs` (15), `verifica_pit.mjs` (14–16);
  `ricerca/avvicinamento-uso/script/backtest_uso.mjs` (64), `casi_varianti.mjs` (69), `verifica_uso.mjs` (21),
  `verifica_regole_uso.mjs` (15). Proposta: gli script principali usano `approachDays` dell'app; i due di verifica
  (`verifica_pit.mjs`, `verifica_uso.mjs`) scrivono la risalita a mano, per restare un ricalcolo indipendente.

---

## 3. Testi da aggiornare

### Con A (regola e statistiche invariate)
| Dove | Cosa |
|---|---|
| js/bottom.js:154 (`apprWhy`), js/indices.js:129 e 184 | frase della risalita (da `approachWhy`) |
| js/bottom.js:440, js/indices.js:395 (valore e tooltip) | «· probabile risalita» e una frase su cosa vuol dire |
| js/bottom.js:242 (legenda del Monitor) | mezza frase: «se il settore è appena uscito da una fase non Normale e la breadth risale, la scheda lo dice» |
| js/sector-chart.js:190 | intestazione del tooltip |
| guida.html:161–168 | definizione della nota; **attenzione**: il punto «Dopo un bottom recente vale meno» (167) usa un'altra condizione (livello blu toccato nelle 126 sedute prima, 5/24 = 21% contro 43/126 = 34%, `ricerca/avvicinamento-uso/sintesi.md`). Due «risalite» diverse confondono: o la guida spiega quella dell'app con il numero del nuovo backtest, o dice chiaramente che sono due cose |
| README.md:67 (settori), 79 (indici), 68 (grafico) | la nota e la condizione esatta (finestra t−20…t−1, ≥ 10 punti con tolleranza, stato portato avanti) |
| README.md, note di versione (dopo la riga 155) | voce della versione nuova |
| js/version.js (VERSION, RELEASE, NOTES) e version.json | insieme |
| docs/sviluppo.md:111 (metodi), §5 decisioni, :159 | la nota e la decisione di Igor |
| index.html:728 (aiuto della Bottom Map) | facoltativo: mezza frase |

Ogni numero che A citi (per esempio «in risalita, X su Y arrivano al livello entro sei mesi») deve venire dallo script del
backtest salvato in `ricerca/avvicinamento-uso/`, sulla regola esatta (stessa definizione del §1.1).

### Con B (regola cambiata): tutte le statistiche dell'avvicinamento cambiano
Settori («dal 2005, XLC dal 2019, XLRE dal 2016»):

| Numero citato | Dove |
|---|---|
| con l'Attenzione 50 tocchi su 63, «7 più della sola Attenzione (43)» | js/bottom.js:242, js/bottom.js:440, guida.html:162, index.html:728, README.md:67, js/signals.js:84–87 (commento), docs/sviluppo.md:159, js/version.js NOTES[0] (nota della 1.3.3: storica, si lascia; la nota nuova dice cosa cambia) |
| da solo 33 | js/bottom.js:440, guida.html:162, index.html:728, README.md:67, js/signals.js:86, docs/sviluppo.md:159 |
| «circa uno su tre» / 32% arriva al livello entro sei mesi | js/bottom.js:242, js/bottom.js:440, guida.html:162, index.html:728, README.md:67, js/signals.js:86 |
| 17 su 43 prima con l'avvicinamento, 7 sedute in mediana; 26 uguali; 19 sedute di preavviso dei 7 in più | guida.html:162, README.md:67, docs/sviluppo.md:159 (script `anticipo_appaiato.mjs`) |
| uso pratico: 23% contro 9% (zona blu entro 126 sedute), −3,3%, +4,8% contro +3,0% (+3,3%), calo mediano del 14% fino al trigger, 46% (17/37) contro 27%, XLE/XLF/XLB «uno su tre», XLRE 2/14 (14%) contro 13%, 21% contro 34% su 24 casi | guida.html:163–167, README.md:67 (parte «Uso pratico»), `ricerca/avvicinamento-uso/sintesi.md` |

Indici («22 indici, dal 2001 per i più lunghi»):

| Numero citato | Dove |
|---|---|
| con l'Attenzione 89 su 132, sola Attenzione 83, da solo 83, 40% arriva al livello | js/indices.js:395, index.html:723, README.md:79, docs/sviluppo.md:159 |

Testi della regola (senza numeri) da aggiornare con B: definizione in guida.html:161 e 165, index.html:316 e 501
(legende delle due Bottom Map), index.html:357 (legenda del grafico: «breadth in avvicinamento», facoltativo),
index.html:728, README.md:67, 68, 79, js/bottom.js:242 e 440, js/indices.js:395, js/signals.js:81–88, guida.html:266
e 273 (Bottom Map e replay: «l'anello segna l'avvicinamento» resta vero, ma va detto che la risalita non conta),
guida.html:407 (senno di poi: anche la regola della risalita è scelta guardando la stessa storia).

Prima di pubblicare: grep di tutte le copie (`50 tocchi`, `su 63`, `89 tocchi`, `su 132`, `uno su tre`, `33`, `40%`,
`due settimane`, `17 su 43`, `23%`, `46%`, `21%`) e nuovo controllo dei testi come nella 1.3.3
(`ricerca/qa/1.3.3/testi*/`).

Versione: lo schema in `js/version.js` dice «prima cifra per un cambio che rompe qualcosa (regole…)», ma i cambi
dell'avvicinamento finora sono stati 1.1–1.3 perché non è uno stato e non tocca gli alert. Proposta: 1.4.0 sia per A
sia per B; con B da chiedere a Igor se preferisce 2.0.0.

---

## 4. Test

### 4.1 Unitari (`test/signals.test.js` o un nuovo `test/approach.test.js`, con `npm test`)

1. **`carryStates`**: `[null, 'watch', null, 'normal', null]` → `['normal', 'watch', 'watch', 'normal', 'normal']`.
2. **`reboundAt`, serie sintetiche** (ognuno con il caso vero e il caso falso accanto, così il test fallisce se si
   sbaglia il confine):
   - stato non Normale a t−20 → vero; solo a t−21 → falso;
   - breadth +10 esatti con n = 30 (3 titoli: 100·13/30 − 100·10/30 = 9,999…) → vero; +9,9 → falso;
   - minimo con valori nulli nella finestra → li ignora; finestra tutta nulla → falso;
   - t < 20 (finestra corta) e prima seduta con uno stato → falso se non c'è uno stato non Normale prima;
   - stato `cool` nella finestra → vero (conta come non Normale, scelta del §1.1 scritta nel test).
3. **A non cambia la regola**: per gli 11 settori e per alcuni indici di `data/indices.json`, con `hideRebound: false`,
   `approachDays(...).on[t]` è uguale seduta per seduta alla formula di oggi scritta a parte (`approachSeries` + stato
   cercato all'indietro come `stateAt`, la stessa di `apprDays`, bottom.js:144–150).
4. **Nessun dato futuro**: per sedute campione t, `approachDays(b.slice(0, t+1), L, runMachine(dati tagliati a t).days)`
   all'ultima seduta = valore della serie intera a t (`on`, `rebound`, `A`), come il test «perché questo stato».
5. **Ricalcolo indipendente della risalita**: implementazione a parte nel test (`Math.min` su `slice`, stato con un
   ciclo all'indietro) uguale a `rebound` seduta per seduta su tutti i settori.
6. **Casi reali a date fisse** (dal controllo veloce di questa fase; da riconfermare quando si scrive il test):
   XLRE 09/05/2025 `below` e `rebound` veri, XLE 09/05/2025 `below` vero e `rebound` falso. Con B:
   `on` falso per XLRE e vero per XLE. Sulla 1.3.3 la regola di oggi dà XLRE acceso: è il caso che fa fallire la versione
   vecchia. Nota: la breadth storica è ricostruita con i membri di oggi e può cambiare un poco; il repository accetta già
   test a date fisse (`test/signals.test.js:57`, XLU al 21/09/2026).
7. **`approachWhy`**: con `rebound` non nullo il testo contiene «probabile risalita» e **non** «due settimane»; senza,
   il contrario (A). Con B: per una seduta con `rebound` vero, `on` è falso.
8. **Statistiche legate al codice**: il conteggio delle sedute in risalita per settore (e, con B, degli ingressi) è uguale
   a quello salvato dal backtest in `ricerca/avvicinamento-uso/*.json` (solo nel ramo di sviluppo: il test va tenuto in
   `ricerca/`, non in `test/`, perché `main` non ha `ricerca/`).
9. **Alert**: un controllo statico che `scripts/send_alerts.js` non importa `approach*` (l'avvicinamento non manda alert).

### 4.2 Nel browser (`ricerca/qa/browser/v140.cjs`, Playwright, come `v130.cjs`)

Il valore atteso si calcola in Node con `js/signals.js` sugli stessi `data/*.json` serviti dal server (non scritto a
mano), così il test regge ai dati nuovi della notte. Computer 1440 e 1280, telefono 390 e 360, tema chiaro e scuro,
console senza errori.

| Controllo | A | B |
|---|---|---|
| Monitor oggi: per ogni settore badge = atteso; schede dei «Settori da osservare» | testo «probabile risalita» dove `rebound`, «due settimane» altrove | i settori con `rebound` non hanno il badge né la scheda; KPI «in avvicinamento: …» uguale all'atteso |
| Bottom Map, settimana del 09/05/2025 (cursore `#bmDate` al valore della settimana, cercata per data) | anello su XLRE e XLE; tooltip di XLRE con la risalita | anello su XLE, **non** su XLRE; `#bm .appr-ring` = numero atteso |
| Replay (PLAY) per 10 settimane da una data scelta: anelli a ogni fotogramma = attesi | = | idem |
| Indici, Bottom Map al 29/07/2022 (DAX e FTSEMIB in risalita nel controllo veloce) | anello e tooltip | niente anello su DAX e FTSEMIB |
| Settore XLRE, 10A: tratti `.brappr` e pallini `.apprin` = segmenti attesi; tooltip su una seduta in risalita | intestazione con la risalita | nessun tratto in quelle sedute; nessun pallino sul bordo sinistro (controllo della 1.3.2) |
| Livello blu: XLRE −1, poi +1, poi «Ripristina» | badge, testo, tratti e anello = attesi per ogni livello (la cache per livello funziona) | idem |
| Situazione, riga «Soglia di avvicinamento» | valore con «probabile risalita» | valore «sotto, in risalita: non conta» se `b ≤ A` |
| «Dalla tua visita»: fotografia salvata con `appr` per un settore che con B è `normal`, stessi dati | — | nessun «Avvicinamento → Normale» falso |

Per renderli capaci di fallire: lanciare `v140.cjs` anche contro la 1.3.3 (worktree di `main` sul server locale) e
salvare l'esito in `ricerca/qa/1.4.0/`: devono fallire almeno i controlli della 09/05/2025 (XLRE), dei testi e degli
indici al 29/07/2022. Se uno passa anche sulla 1.3.3, il controllo è a vuoto e va riscritto. Da rilanciare anche
`v091.cjs`, `v095.cjs`, `v130.cjs` (quest'ultimo chiede `dots > 0` per XLV, XLF, XLE: con B va ricontrollato).

---

## 5. Rischi

1. **Ingressi «finti» con B** (il rischio maggiore). La condizione cambia dentro un tratto già sotto la soglia: quando
   passano 20 sedute dall'ultimo stato non Normale, o la breadth torna sotto «minimo + 10», l'avvicinamento si accende a
   metà della risalita, con il pallino d'ingresso nel grafico e la voce nuova nel Monitor. Controllo veloce di questa
   fase sui settori (script nella cartella temporanea, **non** numeri per i testi): 57 accensioni a metà di un tratto e
   112 cambi della risalita dentro un tratto acceso. Il backtest deve contare questi ingressi come li vedrebbe l'utente.
   Alternativa da proporre a Igor solo se il backtest lo sostiene: risalita «che resta» per tutto il tratto (un tratto
   che inizia in risalita resta spento finché la breadth non torna sopra la soglia). È un'altra regola: decide Igor.
2. **Il testo cambia avanti e indietro con A** per lo stesso motivo (scheda che passa da «risalita» a «due settimane»
   senza che la breadth scenda davvero). Da dire nella guida.
3. **Oggi XLRE è proprio il caso** (36,7% contro una soglia del 39,8% al 30/10/2026, in risalita secondo la condizione):
   con A la sua scheda cambia subito, con B XLRE esce dal Monitor dei settori da osservare. Igor lo vede il giorno stesso.
4. **Virgola mobile**: senza la tolleranza la condizione dipende da come esce `100·a/n` (2 sedute di differenza nei
   settori). Stessa tolleranza nel backtest, nell'app e nel ricalcolo indipendente.
5. **«Dopo l'Attenzione» non è esatto**: conta anche `cool`/`trig`/`setup`. Il testo deve dire «dopo un minimo» o
   «dopo una fase non Normale».
6. **Due «risalite» nella guida** (livello toccato in 126 sedute contro questa): da riconciliare (§3).
7. **Fotografie della visita** salvate con la 1.3.3 (§2, `snapCode`): falso cambio di stato il primo giorno con B.
8. **Statistiche in molte copie** (§3): con B quasi tutti i numeri dell'avvicinamento cambiano in 6–8 file; serve il
   controllo dei testi completo.
9. **Indici**: il cambio di cache (da `approachLevel` per T ad `approachSeries`) è un cambio di codice anche con A; il
   test 3 deve coprire gli indici.
10. **Grafico degli indici** senza tratto giallo: con B «niente tratto colorato» vale solo per i settori (sugli indici
    non c'è). Da non confondere nei testi.
11. **Alert**: nessun rischio (verificato: `send_alerts.js` non usa l'avvicinamento). La regola non va messa in
    `config/thresholds.json`, che finisce negli alert e in «Copia configurazione».

## 6. Dimensione stimata

| File | A | B |
|---|---|---|
| js/signals.js | +55 righe (funzioni, costante, testo) | +55, commento 81–88 riscritto |
| js/bottom.js | ~25 righe cambiate (cache, `apprWhy`, Situazione, tooltip, legenda) | ~30 (+ voce informativa in `explain`, `ar` della visita) |
| js/indices.js | ~20 (cache, 3 testi, tooltip) | ~20 + tooltip con statistiche |
| js/sector-chart.js | ~4 | 0–3 |
| guida.html | 1–2 paragrafi | sezione Avvicinamento (161–170) riscritta, 266, 273, 407 |
| index.html | 0–1 riga | 316, 501, 723, 728 (e facoltativo 357) |
| README.md | 67, 68, 79 + nota di versione | idem, con tutti i numeri |
| docs/sviluppo.md | 111, §5, 159 | idem |
| js/version.js, version.json | 2 file | 2 file |
| test/ | ~90 righe | ~110 righe |
| ricerca/qa/browser/v140.cjs | ~130 righe | ~150 righe |
| script di ricerca | nessuno (solo il backtest nuovo) | 9 script da aggiornare e rilanciare (§2) |

In totale: A circa 7 file dell'app e ~150 righe di codice; B circa 9 file dell'app, ~170 righe di codice, più il
rifacimento delle statistiche e il controllo completo dei testi (fase 3 con tutti e 5 i temi, perché è un cambio di
regola).
