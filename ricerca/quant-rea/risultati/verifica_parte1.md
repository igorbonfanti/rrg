# Verifica indipendente — Fascicolo Quant Rea, Sezioni 1–21 (TVC:SPX)

**Dati usati**: ^GSPC giornaliero dal 1927-12-30 (solo prezzo, niente dividendi; prima del 1962 high/low = close), NDX dal 1985. Data di riferimento del fascicolo: **8 luglio 2026** (giorno di borsa 128 del 2026). Script: `ricerca/quant-rea/script/verifica_parte1.py`. Output numerici: `risultati.json`, `sec4_7_oos_analoghi.csv`, `sec9_nuovi_massimi.csv`, `sec10_troughs.csv`, `sec12_shuffle.csv`.

## 0. Problema trasversale: TVC:SPX mescola barre mensili e giornaliere

- La Sez. 29 dichiara **19.965 barre "mensili" dal feb-1871, di cui 19.288 dal 1950**. 19.288 barre in 76,5 anni sono barre **giornaliere** (noi contiamo 19.249 giorni di borsa 1950 → 8/7/2026). Restano quindi **677 barre prima del 1950**: con questa numerosità possono essere solo mensili (≈56 anni di mesi), non giornaliere. La Sez. 17 ("19.972 barre giornaliere dal 1871") descrive lo stesso storico in modo sbagliato.
- Le barre pre-1950 sono quasi certamente **medie mensili di Shiller**. Abbiamo ricostruito una serie ibrida dello stesso tipo (medie mensili 1928–49 + giornaliero dal 1950). Su questa serie ritroviamo esattamente le stranezze della Sez. 19: R(t+1) massimo **+51,1%** e minimo **−26,5%** (Rea: "+50%/−27%"). Sui soli dati giornalieri i valori sono +9,1% e −20,5%. Sempre sulla serie ibrida, E[R+1|UP] = **+0,10%** ed E[R+1|DOWN] = **−0,03%** (Rea: +0,11/0,12% e −0,03%), contro +0,08% e −0,01% sul solo giornaliero.
- Mediare i prezzi dentro il mese genera un'autocorrelazione spuria dei rendimenti (effetto Working, 1960). In simulazione, su un random walk mediato su 21 giorni otteniamo ACF(1) = 0,235. Sui nostri dati, l'ACF(1) dei rendimenti mensili è 0,27 con le medie mensili e 0,08 con le chiusure di fine mese. Con le medie, P(up|up) sale al 67%. I "P(Up|Up) 55–65% stabili nella prima metà del '900" della Sez. 19.12 vengono da qui: una finestra rolling di 252 barre mensili copre 21 anni, quindi la curva è liscia per costruzione. Sui dati **giornalieri 1928–49** non c'è alcun momentum: P(up|up) 51,4% < P(up|down) 52,2%.
- Effetti anche sulla Sez. 16 (minimo del 1949 = 6,36%, impossibile con dati giornalieri) e sulla Sez. 17 (gli orizzonti sono contati in barre, quindi "3 mesi" = 63 barre = 5,25 anni sulle barre mensili).

---

## Sez. 1–3 — Percorso mediano, bande, stagionalità a 10 anni

| | Rea | Noi |
|---|---|---|
| YTD 2026 all'8/7 (giorno 128) | ~5–10%, dentro la banda 25–75 | **+9,31%**, 64° percentile 1950–2025 (P25 −1,8%, P50 +6,2%, P75 +13,6%) |
| Ampiezza banda 10–90 a fine anno | >40 pp | 39,5 pp (P10 −12,4%, P90 +27,1%) |
| Flessione 2026 | "attorno al giorno 100" (Sez. 1), "marzo–aprile" (Sez. 3) | minimo −7,3% il **30/3 (giorno 60)**: ha ragione la Sez. 3, non la Sez. 1 |
| Stagionalità 10 anni al giorno 128 | 2026 sopra la media | media +6,6%, dev. std 11,2%: 2026 sopra la media, entro 1σ |

Difetti: le bande sono percentili calcolati giorno per giorno, non percorsi realmente osservati. Una banda ±1σ su 10 anni non ha alcun valore inferenziale. Fuori campione: al 16/10/2026 lo YTD è +11,9%.
**Verdetto: valido (descrittivo), con caveat.**

## Sez. 2 e 8 — Rendimenti annui e mensili

| Campione (prezzo) | Media aritm. | Mediana | Dev. std | CAGR | Hit ratio |
|---|---|---|---|---|---|
| 1928–2025 | 8,10% | 11,6% | 19,0% | 6,27% | 67,3% |
| 1950–2025 | 9,57% | 12,4% | 16,5% | 8,23% | 73,7% |
| 1871–2025 (stima Shiller) | ~6,5% (Rea, Sez. 2) | | | ~4,8% (stima) | |

- **6,50% (Sez. 2) e 8,99% (Sez. 8) non sono in contraddizione aritmetica: vengono da campioni diversi.** Il primo è la media aritmetica 1871–2025 (155 anni, con il pre-1950 mensile). Il secondo (media 8,99%, σ 16,19%) è compatibile con un campione che inizia circa negli anni '40–'50 (1940–2026: 8,94%/16,4%; 1957–2026: 8,84%). Nessuno dei due è il CAGR, che è più basso di 1,3–1,7 pp. Il fascicolo non dice mai quale campione usa.
- Rea calcola l'anno **dalla prima all'ultima chiusura** dell'anno (dimostrato nella Sez. 4: i suoi rendimenti degli anni analoghi coincidono al centesimo con questa definizione). Così si perde il primo giorno di ogni anno: 9,40% contro 9,57% nel 1950–2025.
- 8.9: settembre è l'unico mese sotto il 50% ✓ (44,7% nel 1950–2025, 44,9% nel 1928–2025). Aprile 69,7%, novembre 69,7%, dicembre 72,4% ✓.
- 8.2–8.3 luglio: noi troviamo media 1,31% e σ 3,92% (1950–2025), contro 0,87%/4,06% di Rea. Il campione è di nuovo diverso.
- **8.5 — correlazione luglio/anno 0,247: è meccanica.** Luglio fa parte dell'anno. Se i mesi fossero indipendenti, la correlazione attesa sarebbe √(1/12) = **0,29**; noi misuriamo 0,27 (1950–2025). La correlazione corretta è luglio contro il resto dell'anno (agosto–dicembre): **0,11 (p = 0,34)** nel 1950–2025 e 0,12 (p = 0,23) nel 1928–2025. Non c'è segnale.
**Verdetto: valido con caveat. La 8.5 è fuorviante.**

## Sez. 4–7 — Proiezione con anni analoghi

**Replica 2026** (percorso YTD cumulato, giorni 1–128, anni candidati 1950–2025):

| Metodo | Top-5 Rea | Top-5 nostro | Proiezione Rea | Nostra |
|---|---|---|---|---|
| Pearson | 2007, 1968, 1978, 1957, 1989 | **identico** (ρ 0,88–0,83) | 5,82% | **5,82%** |
| Spearman | 1968, 2007, 1957, 2009, 2003 | 1968, 2007, 1957, 2009, **1978** (2003 è 6°: 0,797 contro 0,800) | 8,05% | 4,08% |
| Kendall | 1968, 2007, 1957, 2009, 2003 | **identico** | 8,05% | **8,05%** |

- Il riquadro Spearman è una **copia di quello Kendall**: numero e anni sono uguali.
- **La "proiezione di fine anno" è la media dei rendimenti di anno intero degli analoghi** (dalla prima all'ultima chiusura). Ignora che all'8/7 il 2026 era già a +9,1% (dalla prima chiusura). Con Pearson ne deriva un secondo semestre implicito di **−3,0%**. La media corretta del resto d'anno degli analoghi vale −1,6% con Pearson e +3,4% con Kendall. Al 16/10/2026 lo YTD (+11,9%) è già sopra tutte e tre le proiezioni.

**Test fuori campione** (per ogni anno 1960–2025, taglio al giorno 128, solo anni precedenti dal 1950 in poi; previsione del resto d'anno = media dei resti d'anno dei 5 o 10 analoghi; previsione naive = media dei resti d'anno di tutti gli anni precedenti; 66 anni):

| Previsore | corr(prev., realizzato) | MAE / MAE naive | R² fuori campione vs naive | Hit del segno |
|---|---|---|---|---|
| Pearson k=5 | −0,08 (p 0,54) | 1,07 | −20% | 68% |
| Spearman k=5 | −0,14 (p 0,27) | 1,09 | −26% | 64% |
| Kendall k=5 | −0,14 (p 0,26) | 1,12 | −29% | 62% |
| Pearson / Spearman / Kendall k=10 | 0,06 / 0,09 / 0,09 | 0,98 / 0,95 / 0,96 | −1,4% / −0,4% / −0,3% | 70–73% |
| Pearson su rendimenti giornalieri k=5 | −0,20 | 1,19 | −32% | 55% |
| 5 anni presi a caso | 0,01 | 1,10 | −17% | 67% |
| Naive | — | 1,00 | 0 | **70%** (= quota di secondi semestri positivi) |

Con la previsione "alla Rea" (media degli anni interi degli analoghi, usata come previsione dell'anno intero) il MAE è 10,6–11,4 pp. Prendere lo YTD noto e aggiungere la media naive del resto d'anno dà un MAE di **7,7 pp**.
**Verdetto: fuorviante.** Il metodo non batte né la previsione naive né cinque anni scelti a caso, e la proiezione ignora lo YTD già realizzato.

## Sez. 9 — Nuovi massimi YTD e rendimento annuo

- Replica: corr(numero di massimi, rendimento dell'anno) = **0,842** ✓ (1950–2025). Il 1995 ha 91 massimi ✓.
- **È una relazione tautologica e osservata a posteriori**: i massimi e il rendimento misurano lo stesso percorso. Nello stesso semestre, corr(massimi H1, rendimento H1) = 0,80.
- Test predittivo, massimi del primo semestre contro rendimento del secondo semestre:
  - 1950–2025: corr **0,27 (p 0,019)**. Il secondo semestre rende 7,9% quando i massimi H1 sono sopra la mediana e 1,8% quando sono sotto.
  - 1929–2025: corr **0,11 (p 0,30)**, Spearman 0,15 (p 0,15). L'effetto **non è robusto** al campione ed è solo in campione.
**Verdetto: valido come descrizione, non predittivo.**

## Sez. 10 — Ritorni dai bottom dei bear market

**Quale regola produce la lista di Rea** (14 trough dal 1950, picco = massimo storico):

| Regola | N | Differenze rispetto a Rea |
|---|---|---|
| Solo chiusure (standard) | 11 | mancano 1990 (**−19,92%**), 1998 (**−19,34%**), 2025 (**−18,90%**) |
| High/low intraday | 15 | in più il 2018 (high→low **−20,21%**) |
| **Max chiusura → min low ≥ 20%, trough = minima chiusura dopo la soglia** | **14** | **identica** |

- La lista è quindi frutto di una **regola ibrida** e non dichiarata: la soglia è misurata sui minimi intraday, ma il trough è datato sulle chiusure (1987 = 4/12, non 20/10; 2025 = 8/4, non 7/4). Con la definizione convenzionale sulle chiusure, 1990, 1998 e 2025 non sono bear market. Con quella intraday andrebbe incluso il 2018 (con una regola "massimo chiusura → minimo low" il 2018 fa −19,93% e resta fuori per soli 0,07 pp).
- Il 2011 (−19,4% in chiusura, −21,6% intraday) è escluso perché il picco di aprile 2011 non era un massimo storico. È coerente con lo schema "dal massimo storico", ma il fascicolo non lo dice.
- Prima del 1962 i minimi intraday non sono affidabili. Gli orizzonti sono di 252 barre: 12 rendimenti a 1 anno su 14 coincidono entro 0,1 pp.

**Rendimenti forward** (orizzonti completi):

| Ingresso | 1 anno: media / mediana / win | 5 anni: media / win | 10 anni: media / win |
|---|---|---|---|
| Esattamente al trough (Rea) | 40,1% / 34,9% / **100%** | 92,8% / 100% | 173,6% / 100% |
| Giorno in cui si supera −20% | 14,2% / 23,9% / 79% | **45,8% / 83%** | 132,6% / 100% |
| +10% dal minimo corrente dopo la soglia | 17,1% / 15,6% / 86% | 50,6% / 92% | 118,7% / 91% |
| +20% dal minimo corrente | 18,5% / 19,4% / 93% | 54,7% / 92% | 124,3% / 91% |
| **Qualsiasi giorno 1950+ (baseline)** | **9,4% / 10,6% / 75%** | **52,6% / 84%** | **122,8% / 93%** |

**Verdetto: fuorviante.** Il 100% di win rate e i rendimenti del 40% a 1 anno dipendono interamente dal conoscere il minimo in anticipo (look-ahead). Entrando con regole conoscibili in tempo reale, a 5 e 10 anni si ottiene circa quanto un giorno qualsiasi, con perdite reali a 1 anno: 1974 −28%, 2008 −29%, 2001 −12%. La baseline incondizionata manca del tutto. N = 11–14 episodi.

## Sez. 11 e 14 — Breadth NDX e S&P 500 (critica di metodo)

Baseline NDX incondizionata 2010 → 8/7/2026:

| Orizzonte (giorni di borsa) | 5 | 21 | 42 | 63 | 126 | 189 | 252 |
|---|---|---|---|---|---|---|---|
| Media | +0,37% | +1,56% | +3,14% | +4,64% | +9,23% | +14,3% | **+19,4%** (win 90%) |

- I segnali di Rea rendono "leggermente negativo" a 5–42 giorni e **"oltre +11%" a 252 giorni**, cioè **sotto la baseline a tutti gli orizzonti** (circa −8 pp a un anno). La lettura "storicamente favorevole" non regge.
- Come confronto: gli 87 giorni con NDX ≤ −3% hanno reso +31% a 252 giorni.
- Altri difetti:
  - survivorship: la breadth è ricostruita sui componenti attuali;
  - i 62 segnali sono concentrati in 2011, 2020, 2022 e 2025, quindi gli episodi indipendenti sono molti meno;
  - la soglia "MA a 1 giorno < 2%" significa al massimo un titolo in rialzo su cento: è arbitraria;
  - la soglia dinamica (media dei massimi rolling) sale per costruzione;
  - le finestre forward si sovrappongono.
- Nella Sez. 14, "titoli che battono l'indice" dipende dalla concentrazione dell'indice; il numero 355/500 va confrontato con una distribuzione storica costruita senza survivorship.
**Verdetto: fuorviante (manca la baseline).**

## Sez. 12 — Shuffle a blocchi annuali (PAC)

- Metodo: permutazione senza reimmissione di blocchi di 12 mesi. **Il capitale finale di un versamento unico è invariante alla permutazione** (il prodotto dei rendimenti non cambia): il test misura solo il rischio di sequenza del PAC. 60 shuffle sono pochi per stimare P10 e P90 (circa 6 osservazioni per coda; errore standard del P10 circa 0,16 pp). Il triangolo IRR mostra la mediana degli shuffle, non la storia reale.
- Nostra replica (2.000 permutazioni, partenze 1950–2021, fine 6/2026): il reale è sopra il P90 solo nel **7%** delle partenze (18% per le partenze dal 2000 in poi). Percentile medio del reale: 0,60 (partenze 1950–99) e 0,72 (dal 2000). Per la partenza 2000: 9,85% contro una mediana di 6,5% (97° percentile). "Quasi sempre nella parte alta o sopra la banda" è un'esagerazione.
- **Effetto del punto finale.** Se la serie termina il 28/2/2009, il percentile del reale per le partenze 1975–1995 crolla allo **0,1–8%**: la storia reale risulta peggiore di quasi tutte le permutazioni. Il vantaggio del reale nel 2026 c'è solo perché la serie finisce dopo un lungo rialzo che termina su un massimo storico: rendimenti alti alla fine pesano su un capitale accumulato più grande. Non è "fortuna della storia".
**Verdetto: fuorviante nell'interpretazione.**

## Sez. 13 — Giorni migliori e peggiori dal 1980

| 2/1/1980 → 8/7/2026 | Multiplo finale | CAGR |
|---|---|---|
| Buy & hold | 69,3× | 9,5% |
| Senza i 100 migliori | 0,84× (sotto il capitale iniziale nel 39% dei giorni) | −0,4% |
| Senza i 100 peggiori | 9.803× | 21,8% |
| Senza entrambi | 118,9× (+71% rispetto al B&H, non "leggermente sopra") | 10,8% |

- μ/σ: migliori 4,52%/1,69% (Rea 4,49/1,71); peggiori −4,80%/2,28% (−4,78/2,29). Giorno successivo: dopo un migliore −0,33%/2,55% (Rea −0,41/2,54), dopo un peggiore +0,29%/3,65% (+0,42/3,77). Replica sostanzialmente corretta.
- **Denominatori 31/63/69/37 della tabella 13.6.** Non sommano a 100 perché ogni colonna è un sottoinsieme diverso. I 100 giorni migliori si dividono in 31 con il peggiore più vicino *dopo* e 69 con il peggiore più vicino *prima* (noi: 34/66). I 100 peggiori si dividono in 63 con il migliore più vicino dopo e 37 con il migliore più vicino prima (noi: 65/35). Le percentuali tra colonne, quindi, non sono confrontabili.
- **Il test binomiale ha i nomi invertiti.** 31% (p = 0,0002) è la quota di giorni *migliori* seguiti da un peggiore. 63% (p = 0,012) è la quota di giorni *peggiori* seguiti da un migliore. Rea scrive l'opposto ("un peggiore seguito da un migliore 31%"). La lettura corretta è coerente: crollo, poi rimbalzo. Il 69% dei migliori viene dopo un peggiore.
- **I p-value sono gonfiati.** I 200 giorni formano solo **49 cluster** (separati da più di 30 giorni): il 2008 ne contiene 39, il 2020 25, il 2009 20. Permutando a caso le etichette migliore/peggiore sulle stesse date si ottiene una distanza mediana di 6,5 giorni, contro i 5–7 osservati. La vicinanza è **interamente spiegata dal clustering della volatilità**, non da un abbinamento specifico migliore↔peggiore.
**Verdetto: 13.1–13.4 valido con caveat. 13.6 sbagliato nelle etichette e con significatività sovrastimata.**

## Sez. 15 — Cap-weight contro equal-weight (solo critica di metodo)

Dati settimanali con una sola fotografia a 3 mesi. Il divario evidenziato in arancione non ha soglia né test, e un singolo titolo grande (es. Servizi di comunicazione) lo domina. Composizione dei settori di oggi (survivorship). **Verdetto: valido come descrizione.**

## Sez. 16 — Escursione YTD high-low e ARMA

- **Definizione individuata**: spread = (massimo high − minimo low) / **prima chiusura dell'anno**, dal 1/1 al 10/7. Riproduce esattamente 2026 = **19,01%** e 1975 = **39,21%** (massimo). Su 1945–2025 la media è 17,08% e la mediana 16,20% (Rea 16,87/16,18). Non è un range vero: con max/min − 1 il massimo sarebbe il 2020 (54,8%), non il 1975.
- Il minimo di Rea (1949 = 6,36%) è incompatibile con i dati giornalieri (nel 1949 risulta ~13–15%): viene dalle barre mensili pre-1950.
- ARMA: già la serie grezza ha Ljung-Box p = 0,39, cioè è rumore bianco. Il miglior AIC (ARMA(2,2) per noi, 584,9) batte il rumore bianco (586,4) di un'inezia. La previsione coincide quindi con la media, e la banda 3–30% è solo ±2σ. Il Ljung-Box sui residui (p = 0,91) è tautologico. Trend: p = 0,16 per noi, 0,088 per Rea, non significativo.
**Verdetto: valido come descrizione. L'ARMA è superfluo.**

## Sez. 17 — Comprare ai massimi storici o in un giorno qualsiasi

| Orizzonte | Rea (1871+, media qualsiasi/ATH) | Giornaliero 1950+ media (qualsiasi/ATH) | Giornaliero 1950+ mediana | Ibrido mensile <1950 (media) |
|---|---|---|---|---|
| 3 mesi | 2,9 / 0,8 | **2,3 / 1,7** | 2,7 / 2,3 | 2,4 / 1,1 |
| 1 anno | — | 9,4 / 8,6 | 10,6 / 10,0 | 9,9 / 8,2 |
| 5 anni | — | 52,6 / 50,9 | 52,2 / 47,5 | 53,9 / 50,5 |
| 10 anni | — | 122,6 / 97,7 | 120,0 / 101,8 | 126,4 / 98,3 |
| 20 anni | mediana 257,4 / 191,4 | 343,1 / 237,3 | **277,4 / 183,6** | 349 / 238 |
| 30 anni | 850,1 / 714,6 | 829,5 / 705,2 | 830,4 / 726,4 | 828 / 698 |

- Giorni di massimo storico: 1.358 (dal 1950), 1.459 (dal 1928); Rea ne conta 1.536 includendo il mensile dal 1871.
- **Il divario di 2,1 pp a 3 mesi è un artefatto del mix di frequenze**: sui soli dati giornalieri è 0,6 pp, e la serie ibrida sposta i numeri nella direzione di quelli di Rea.
- Fino a 5 anni le differenze sono di 1 pp l'anno o meno, nella stessa direzione della letteratura (comprare ai massimi non penalizza in modo sostanziale; alcuni studi lo trovano persino leggermente migliore a breve).
- Il divario a 10–20 anni dipende da pochissimi cluster di massimi (1929, 1972–73, 1999–2000, 2007). Le osservazioni sono giornaliere e sovrapposte, quindi N effettivo ≪ N.
**Verdetto: valido con caveat (direzione corretta, numeri contaminati).**

## Sez. 18 — Distanza dalla SMA 200 (replica su SPX giornaliero 1950+)

| Orizzonte | Tutti i giorni (baseline) | ≥ +5% | ≤ −5% | p Newey-West (≤−5 vs resto / ≥+5 vs resto) |
|---|---|---|---|---|
| 1 settimana | 0,18% (win 56,9%, N 19.244) | 0,21% (58,1%, N 8.702) | 0,23% (54,3%, N 2.598) | 0,67 / 0,40 |
| 1 mese | 0,76% (61,8%) | 0,80% (63,3%) | 0,84% (58,7%) | 0,84 / 0,77 |
| 3 mesi | 2,28% (66,8%) | 2,58% (71,3%) | 2,04% (59,5%) | 0,82 / 0,37 |

- Episodi indipendenti: 167 sotto −5% e 344 sopra +5%, a fronte di migliaia di giorni sovrapposti. Dopo i giorni sotto −5% la volatilità a 21 giorni è 21,7%, contro 13,5% in media.
- Nella tabella GOOG di Rea **manca la baseline**: senza la media incondizionata di GOOG, le differenze di 0,1–1 pp non si possono interpretare e sono compatibili con il rumore.
**Verdetto: fuorviante (nessuna baseline né correzione per la sovrapposizione). La distanza dalla SMA200 informa sulla volatilità, non sul rendimento medio.**

## Sez. 19 — Streak, NBBG, P(up|up)

| Metrica | Rea | Giornaliero 1950+ | Giornaliero 1928–49 | Medie mensili 1928+ |
|---|---|---|---|---|
| P(up\|up) / P(up\|down) | ~55% / ~49% | **55,9% / 50,7%** | 51,4% / 52,2% | 67,3% / 52,0% |
| ACF(1) del segno | 0,056 | 0,052 (ibrido 0,055) | −0,008 | 0,15 |
| E[R+1\|up] / E[R+1\|down] | +0,11–0,12% / −0,03% | +0,08% / −0,01% (ibrido +0,10/−0,03) | 0,01/0,01% | +1,2% / −0,3% |
| Massimo R+1 dopo UP / minimo R+1 dopo DOWN | +50% / −27% | +9,1% / −20,5% | | **+51,1% / −26,5%** |
| Streak UP massimo | 14 (15/4/1971) | 14 (15/4/1971) ✓ | | |
| NBBG massimo | 28 (6/5/1970) | 28 (6/5/1970) ✓; NBBG=0: 5.680 volte | | |
| P(up domani \| k giorni di ribasso, k = 0…5+) | 55, 49, …, >54 | 55,5 / 49,3 / 50,5 / 52,7 / 51,7 / 54,4 ✓ | | |

- Rolling 252 per decennio, P(up|up)/P(up|down): anni '50 60/47, '60 61/45, '70 58/42, '80 54/51, '90 55/52, **2000 48/57, 2010 53/57, 2020 53/58**.
- Il momentum a un giorno è **massimo nel 1950–79** (ACF del segno 0,16, effetto dei prezzi non sincroni dell'indice) e si **inverte dopo il 2000** (−0,05). La narrazione di Rea ("forte nel primo '900, sparisce dagli anni '50") nasce dalle barre mensili ed è sbagliata.
**Verdetto: le statistiche giornaliere aggregate sono valide con caveat. La vista rolling pre-1950 e le code di R(t+1) sono sbagliate (mix di frequenze).**

## Sez. 20 — Poisson dei giorni con |r| ≥ 2% (1950 → 6/2026)

- λ = **0,949** al mese (Rea 0,97). Varianza/media = **4,13**, quindi forte sovradispersione. P(0 eventi) = 63,1% osservato contro 38,7% della Poisson; P(≥4) = 8,0% contro 1,6%. λ rolling a 12 mesi: massimo 8,33 (giugno 2009). ACF(1) dei conteggi = 0,61. La diagnostica qualitativa di Rea è corretta.
- Segnale (soglia = media dei massimi rolling su 90 mesi):
  - soglia statica (con look-ahead): 13 mesi, **6 episodi**;
  - soglia espandente: 24 mesi, **11 episodi**.

| Lift rispetto alla baseline | 1 mese | 3 mesi | 6 mesi | 12 mesi |
|---|---|---|---|---|
| Rea | ~+2 | ~+3 | ~+7 | ~+11 |
| Nostro, statica (mesi) | −2,8 | −2,4 | +2,3 | +13,3 (p NW 0,01) |
| Nostro, espandente (mesi) | −1,7 | −1,0 | +3,2 | +10,1 (p NW 0,003) |
| **Per episodio**, statica (6) / espandente (11) | | | | 18,5% e 13,6% contro baseline 9,4%: **p 0,35 / 0,54** |

L'hit rate del 66,67% equivale a 4 casi su 6. A 1 e 3 mesi il lift nei nostri test è negativo; a 12 mesi il risultato poggia su 6–11 episodi, di cui il 2008–09 da solo pesa 6 mesi.
**Verdetto: diagnostica valida; segnale non significativo una volta contati gli episodi indipendenti.**

## Sez. 21 — Entropia

- **Permutation entropy** (ordine 3, finestra 252): P33 = **0,9905**, P67 = **0,9953**, cioè esattamente i valori di Rea. Per una serie i.i.d. su 250 osservazioni l'atteso è circa 0,994: la variazione è quasi tutta rumore di campionamento. Con i rendimenti forward non c'è relazione (p NW 0,21–0,71).
- **Shannon** (istogramma a 10 bin adattati alla finestra di 63 giorni): P33/P67 = 2,77/2,95, minimo il **19/10/1987** ✓.
  - Correlazione con la curtosi rolling **−0,89** e con max|r|/σ **−0,92**: è un **rilevatore di outlier (crolli)**, non di "ordine".
  - Con bin fissi globali diventa un proxy della volatilità (corr −0,45) e perde ogni potere predittivo (p NW 0,27–0,76).

| Shannon adattivo contro forward | 1 mese | 3 mesi | 6 mesi | 12 mesi |
|---|---|---|---|---|
| r (Rea da −0,09 a −0,19) | −0,07 | −0,14 | −0,16 | −0,12 |
| p naive | ~0 | ~0 | ~0 | ~0 |
| p Newey-West | 0,005 | 0,0002 | 0,0002 | 0,017 |
| p con N effettivo (finestre non sovrapposte) | 0,04 | 0,016 | 0,052 | **0,29** |
| Terzili bassa / media / alta (12 mesi) | | | | 12,3 / 8,6 / 7,2% (Rea 11,9 / 9,7 / 6,1) |

- I "p = 0,000" nascono da circa 19.000 osservazioni giornaliere sovrapposte; a 12 mesi le osservazioni effettive sono circa 75.
- I terzili sono calcolati sull'intera serie, quindi con look-ahead.
- Il fenomeno è lo stesso delle Sez. 10 e 20: dopo un giorno estremo arriva un rimbalzo.
**Verdetto: fuorviante nell'interpretazione ("mercato ordinato"); effetto debole, solo in parte significativo.**

---

## Sintesi dei verdetti

| Sezione | Verdetto | Problema principale |
|---|---|---|
| 1–3 | valido con caveat | flessione al "giorno 100" sbagliata (è il giorno 60) |
| 2 / 8 | valido con caveat (8.5 fuorviante) | campioni diversi (6,50% contro 8,99%); correlazione meccanica |
| 4–7 | **fuorviante** | nessuna capacità fuori campione; la proiezione ignora lo YTD; Spearman copiato da Kendall |
| 9 | valido descrittivo / non predittivo | tautologia a posteriori |
| 10 | **fuorviante** | regola ibrida non dichiarata; look-ahead sul minimo; nessuna baseline |
| 11 / 14 | **fuorviante** | i segnali rendono meno della baseline NDX; survivorship |
| 12 | fuorviante nell'interpretazione | effetto del punto finale |
| 13 | valido con caveat / 13.6 sbagliato | etichette invertite; p-value gonfiati dai cluster |
| 15 | valido descrittivo | nessun test |
| 16 | valido con caveat | metrica non standard; pre-1950 mensile; ARMA = media |
| 17 | valido con caveat | mix di frequenze; sovrapposizione |
| 18 | fuorviante | manca la baseline; differenze non significative |
| 19 | valido con caveat / rolling pre-1950 sbagliato | barre mensili di Shiller (effetto Working) |
| 20 | diagnostica valida / segnale non significativo | 6–11 episodi |
| 21 | fuorviante | entropia = proxy di outlier; N effettivo |
