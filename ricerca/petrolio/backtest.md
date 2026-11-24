# Petrolio e cali dell'S&P 500: backtest (12/11/2026)

Fase di ricerca: **nessuna modifica all'app**. Tutti i numeri vengono da `script/backtest.mjs` (risultati in
`risultati.json`), sono ricalcolati in modo indipendente da `script/verifica.py` (`verifica.json`, **0 differenze**) e le
tabelle sono stampate da `script/tabelle.py`. Dati in `cache/` (esclusa da git), scaricati da `script/scarica.mjs`.

## In breve

- **La domanda.** Francesco Caruso (Cicli&Mercati) sostiene che il petrolio è «il trigger per eccellenza»: un Brent
  stabilmente sopra 95-100 $ porterebbe stagflazione e forti cali azionari, come nel 1973-74 (S&P −50%).
- **Il 1973-74 è vero solo a metà.** L'S&P è sceso del 48,2% (11/01/1973 → 03/10/1974), ma il massimo è arrivato
  **7 mesi prima** del primo segnale del petrolio (agosto 1973) e 9 mesi prima dell'embargo. Al primo segnale l'S&P era
  già il 13,3% sotto il massimo dei 12 mesi precedenti; da lì è sceso di un altro 32,9%. Il petrolio ha accompagnato e
  aggravato il ribasso, ma non lo ha anticipato.
- **Nessuna delle 48 regole decise prima supera il criterio.** Le regole erano 3 famiglie con le loro varianti
  (decise prima, non adattate). Il problema principale sono i **pochi casi**: un livello di 95-100 $ in dollari
  correnti non è mai esistito prima del 2008. Le regole con più casi danno poco o niente:
  - la regola di Hamilton classica (WTI sopra il massimo dei 12 mesi) ha 9 segnali su 30 seguiti da un calo ≥10%
    entro 12 mesi, contro **280 mesi su 910 (30,8%)** per un mese qualsiasi: nessun vantaggio;
  - la variante a 36 mesi arriva a 9 su 20 (+14,2 punti), sotto la soglia di +15 punti decisa prima, e prima del 1990
    si ferma a +9,2 punti.
- **«Brent stabilmente sopra 100 $»** ha dato 3 segnali con esito noto (04/2008, 03/2011, 04/2022), tutti seguiti da un
  calo ≥10%. Però sono 3 casi, e nel 2008 e nel 2022 l'S&P era già oltre il 10% sotto i massimi. Se si contano tutti
  i mesi con il Brent sopra 100 $ per 2 mesi di fila (lo «stato», non solo l'inizio), il calo ≥10% entro 12 mesi
  segue 13 mesi su 50 (26%), **meno** della base del 30,8%.
- **I grandi ribassi non vengono dal petrolio.** Dal 1950 ci sono stati 13 cali ≥20% dell'S&P:
  - le regole sul livello (R3) ne avvisano 1 su 13;
  - le regole sugli shock (R1, R2) al massimo 4 su 13, non più di quanto darebbe il caso (39,1% per la regola più
    frequente).
- **Dove il petrolio conta davvero: le recessioni.** Gli aumenti del WTI sopra il massimo dei 12 o dei 36 mesi hanno
  preceduto **7 delle 11 recessioni USA dal 1950**. Dopo un segnale a 36 mesi è seguita una recessione entro 12 mesi
  9 volte su 20 (45%), contro il 25,7% di un mese qualsiasi. È il risultato noto di Hamilton. Il legame con le
  recessioni però non si traduce in un vantaggio sui cali di borsa.
- **Oggi.** Il Brent ha avuto in media 114,16 $ a settembre e 123,93 $ a ottobre 2026, quindi la condizione «sopra
  100 $ per 2 mesi» è vera. Il segnale vero e proprio era partito ad aprile 2026: da allora l'S&P è salito del 5,7%.
  Il «calo del 22-23% dai massimi di fine ottobre» citato nel video riguarda il **petrolio** (Brent futures: 117,64 $
  il 30/10, 91,49 $ il 10/11, −22,2%), **non** l'S&P, che è il 2,6% sotto il massimo del 6/10/2026 (−5,9% al
  minimo del 5/11).
- **Verdetto: solo contesto, non un segnale.** Non lo consiglio come allarme nell'app. Se l'utente lo vuole come
  contesto, sotto c'è una proposta.

## 1. Domanda e criterio (decisi prima di guardare i numeri)

Gli shock petroliferi hanno anticipato i cali dell'S&P 500? E in che forma un segnale regge?

**Regole.** La condizione si calcola sul mese t ed è nota a fine mese. Il segnale è l'inizio: il primo mese in cui la
condizione diventa vera dopo almeno 6 mesi in cui era definita e falsa.

| Famiglia | Condizione | Varianti decise prima |
|---|---|---|
| R1 «net oil price increase» (Hamilton) | prezzo del mese > massimo dei L mesi precedenti × (1 + X%) | L = 12 o 36; X = 0, 10, 20; nominale e reale |
| R2 variazione annua | prezzo / prezzo di 12 mesi prima − 1 ≥ Y | Y = +50%, +100%; nominale e reale |
| R3 livello «stabilmente» | media del mese > S $ per K mesi di fila | S = 95, 100; K = 2, 3; nominale e reale (dollari di oggi) |

Ogni regola è calcolata sul WTI (FRED WTISPLC, dal 1946) e sul Brent (FRED MCOILBRENTEU, dal 05/1987). In tutto sono
48 regole. Per la sensibilità si sono aggiunte soglie vicine, segnate a parte e non usate per il verdetto: R2 +30% e
+75%; R3 80, 90, 110 e 120 $.

**Esiti.** Si misurano dalla chiusura dell'S&P nell'ultima seduta del mese del segnale:
- calo massimo nei 6, 12 e 18 mesi, cioè la chiusura giornaliera più bassa rispetto all'ingresso (0 se l'S&P non
  scende sotto l'ingresso);
- rendimenti a 3, 6 e 12 mesi;
- recessione NBER entro 12 mesi.

Si usano solo finestre complete. La base è formata da tutti i mesi dello stesso periodo.

**Eventi.**
- Cali dell'S&P ≥20% e ≥10% sulle chiusure giornaliere dal 1950, con il metodo «zigzag» simmetrico: un calo di X% dal
  massimo apre l'evento, un rialzo di X% dal minimo lo chiude.
- Un calo è «avvisato» se un segnale (data di fine mese) cade nei 12 mesi prima del massimo.
- Una recessione è avvisata se un segnale cade nei 12 mesi prima del suo primo mese.
- La **copertura a caso** è la quota di sedute con un segnale nei 12 mesi precedenti: è la quota di eventi che la
  regola «avviserebbe» anche se i massimi cadessero in giorni qualsiasi.

**Criterio di successo.**
- (a) La quota di segnali seguiti da un calo ≥10% entro 12 mesi supera la base di almeno 15 punti.
- (b) Lo stesso vale sia nel 1950-1989 sia dal 1990, con più di 5 segnali per periodo; altrimenti il risultato è
  «troppo pochi casi» e (b) non è superato.
- (c) Tutte le varianti adiacenti della stessa regola (un passo di X, L, S, K o della soglia annua) hanno almeno
  +10 punti sulla base.

## 2. Dati e controlli

| Serie | Copertura | Controllo |
|---|---|---|
| WTI mensile FRED WTISPLC | 01/1946 – 10/2026, 970 mesi, nessun buco | contro MCOILWTICO (EIA): differenza mediana 0,04%, massima 1,22% (09/2001), 483 mesi su 490 sotto l'1% |
| Brent mensile FRED MCOILBRENTEU | 05/1987 – 10/2026, 474 mesi, nessun buco | contro la media dei giornalieri DCOILBRENTEU: mediana 0,01%, massima 5,81% (09/2001) |
| WTI giornaliero DCOILWTICO / Yahoo CL=F | 1986 / 2000 – 12/11/2026 | medie mensili FRED contro CL=F: mediana 0,12%, massima 14,76% (04/2020, prezzo negativo dei futures) |
| Brent giornaliero DCOILBRENTEU / Yahoo BZ=F | 1987 / 2007 – 12/11/2026 | medie mensili FRED contro BZ=F: mediana 1%, massima 30,98% (04/2020); solo 117 mesi su 232 sotto l'1%, perché spot e future del mese dopo differiscono |
| S&P 500 Yahoo ^GSPC | giornaliero dal 1945 (usato dal 1946) al 11/11/2026 | identico a `data/vix.json` (9283 sedute dal 1990, differenza massima 0%); contro FRED SP500 (10 anni): 2512 sedute, differenza massima 0,119%; l'unica variazione giornaliera oltre il 12% è il 19/10/1987 (−20,5%) |
| CPI FRED CPIAUCSL | 1947 – 10/2026 | **manca 10/2025**: il dato non è mai uscito per la chiusura del governo USA. Per 11/2025 si usa l'ultimo CPI pubblicato (09/2025), cioè quello noto allora, senza riempire il buco |
| Recessioni FRED USREC | 1854 – 10/2026 | 11 recessioni iniziate dal 1950 |

**Prezzo reale.** Il prezzo del mese t è moltiplicato per CPI(10/2026) / CPI(t−1). Si usa il CPI del mese prima
perché quello del mese t esce solo a metà del mese dopo: così non entra nessun dato futuro. Ultimo mese completo:
10/2026.

### Perché un livello fisso in dollari correnti non è confrontabile nel tempo

100 $ di oggi (CPI di ottobre 2026) valevano:
- 13,72 $ a gennaio 1974;
- 22,79 $ a gennaio 1980;
- 39,26 $ a ottobre 1990;
- 63,77 $ a giugno 2008;
- 86,32 $ a giugno 2022.

Il WTI del 1973-74, lo shock che Caruso cita, ha toccato al massimo 11,16 $ (10/1974), pari a **74,43 $ di oggi**. In
termini reali il massimo storico del WTI è 210,02 $ (06/2008), e a ottobre 2026 il WTI valeva 102,43 $ di oggi.

Una soglia di 95-100 $ in dollari correnti quindi:
1. prima del 2008 non scatta mai, nemmeno nel 1974 e nel 1980, quando il petrolio in termini reali era
   rispettivamente sotto e sopra i livelli di oggi;
2. con l'inflazione scatta sempre più facilmente.

Per confrontare epoche diverse serve il prezzo reale. Anche così, il peso del petrolio sull'economia è cambiato (meno
petrolio per unità di PIL, Stati Uniti esportatori netti), ma questo il backtest non lo misura.

## 3. Risultati

Tabelle stampate da `script/tabelle.py`. Le tabelle complete, con rendimenti, cali mediani, «stato» e sensibilità,
sono in appendice.

### Base (tutti i mesi)

| Periodo | Mesi con esito | Calo ≥10% entro 12 mesi | Calo ≥20% | Recessione entro 12 mesi | Rend. mediano 12 mesi | Calo max mediano 12 mesi |
|---|---|---|---|---|---|---|
| tutto | 910 | 280 (30.8%) | 107 (11.8%) | 234/910 (25.7%) | 10.8% | -5.4% |
| 1950-1989 | 480 | 148 (30.8%) | 48 (10%) | 159/480 (33.1%) | 9.6% | -5.9% |
| 1990-oggi | 430 | 132 (30.7%) | 59 (13.7%) | 75/430 (17.4%) | 12% | -4.8% |

### Sintesi delle regole decise prima

Nella colonna «Cali ≥20% avvisati», tra parentesi c'è la copertura a caso. Nella colonna del criterio, «pochi» vuol
dire «troppo pochi casi» (5 segnali o meno nel periodo).

| Regola | Segnali (con esito a 12 m) | Seguiti da calo ≥10% entro 12 m | Punti sulla base | 1950-1989 | 1990-oggi | Cali ≥20% avvisati (a caso) | Recessioni avvisate | Mesi in allarme | Criterio a / b (50-89 / 90-oggi) / c |
|---|---|---|---|---|---|---|---|---|---|
| R1 WTI, max 12 mesi, +0% | 31 (30) | 9/30 | -0.8 | 6/14 (+12.1) | 3/16 (-11.9) | 4/13 (39.1%) | 7/11 | 13.7% | no / no / no / no |
| R1 WTI, max 12 mesi, +10% | 16 (15) | 6/15 | +9.2 | 2/4 (+19.2) | 4/11 (+5.7) | 3/13 (20%) | 2/11 | 2.9% | no / pochi / no / no |
| R1 WTI, max 12 mesi, +20% | 4 (3) | 2/3 | +35.9 | 2/2 (+69.2) | 0/1 (-30.7) | 0/13 (4.7%) | 2/11 | 0.7% | sì / pochi / pochi / no |
| R1 WTI, max 36 mesi, +0% | 21 (20) | 9/20 | +14.2 | 4/10 (+9.2) | 5/10 (+19.3) | 3/13 (26.6%) | 7/11 | 8.9% | no / no / sì / no |
| R1 WTI, max 36 mesi, +10% | 10 (10) | 4/10 | +9.2 | 2/4 (+19.2) | 2/6 (+2.6) | 2/13 (13.2%) | 2/11 | 2.1% | no / pochi / no / no |
| R1 WTI, max 36 mesi, +20% | 3 (3) | 2/3 | +35.9 | 2/2 (+69.2) | 0/1 (-30.7) | 0/13 (4%) | 2/11 | 0.5% | sì / pochi / pochi / no |
| R2 WTI, annua ≥ +50% | 13 (12) | 5/12 | +10.9 | 3/3 (+69.2) | 2/9 (-8.5) | 3/13 (16.4%) | 2/11 | 8.9% | no / pochi / no / no |
| R2 WTI, annua ≥ +100% | 4 (4) | 2/4 | +19.2 | 1/2 (+19.2) | 1/2 (+19.3) | 3/13 (5.2%) | 1/11 | 3% | sì / pochi / pochi / no |
| R3 WTI > 95 $, 2 mesi | 5 (4) | 3/4 | +44.2 | — | 3/4 (+44.3) | 1/13 (5.8%) | 0/11 | 3.5% | sì / pochi / pochi / sì |
| R3 WTI > 95 $, 3 mesi | 4 (4) | 3/4 | +44.2 | — | 3/4 (+44.3) | 1/13 (5.2%) | 0/11 | 2.6% | sì / pochi / pochi / sì |
| R3 WTI > 100 $, 2 mesi | 6 (5) | 3/5 | +29.2 | — | 3/5 (+29.3) | 1/13 (6.9%) | 0/11 | 2.6% | sì / pochi / pochi / sì |
| R3 WTI > 100 $, 3 mesi | 5 (5) | 3/5 | +29.2 | — | 3/5 (+29.3) | 1/13 (6.3%) | 0/11 | 1.8% | sì / pochi / pochi / sì |
| R1 WTI reale, max 12 mesi, +0% | 31 (30) | 9/30 | -0.8 | 5/15 (+2.5) | 4/15 (-4.0) | 4/13 (39.8%) | 7/11 | 12.8% | no / no / no / no |
| R1 WTI reale, max 12 mesi, +10% | 12 (11) | 4/11 | +5.6 | 1/3 (+2.5) | 3/8 (+6.8) | 3/13 (14.8%) | 2/11 | 2.3% | no / pochi / no / no |
| R1 WTI reale, max 12 mesi, +20% | 4 (3) | 2/3 | +35.9 | 2/2 (+69.2) | 0/1 (-30.7) | 0/13 (4.7%) | 1/11 | 0.4% | sì / pochi / pochi / no |
| R1 WTI reale, max 36 mesi, +0% | 16 (15) | 7/15 | +15.9 | 4/7 (+26.3) | 3/8 (+6.8) | 3/13 (20.7%) | 5/11 | 6.7% | sì / sì / no / no |
| R1 WTI reale, max 36 mesi, +10% | 6 (6) | 3/6 | +19.2 | 1/2 (+19.2) | 2/4 (+19.3) | 1/13 (8%) | 1/11 | 1.1% | sì / pochi / pochi / no |
| R1 WTI reale, max 36 mesi, +20% | 3 (3) | 2/3 | +35.9 | 2/2 (+69.2) | 0/1 (-30.7) | 0/13 (4%) | 1/11 | 0.3% | sì / pochi / pochi / sì |
| R2 WTI reale, annua ≥ +50% | 12 (11) | 4/11 | +5.6 | 3/3 (+69.2) | 1/8 (-18.2) | 3/13 (15.1%) | 2/11 | 8% | no / pochi / no / sì |
| R2 WTI reale, annua ≥ +100% | 4 (4) | 3/4 | +44.2 | 2/2 (+69.2) | 1/2 (+19.3) | 3/13 (5.2%) | 0/11 | 2.3% | sì / pochi / pochi / sì |
| R3 WTI reale > 95 $, 2 mesi | 5 (4) | 2/4 | +19.2 | 1/1 (+69.2) | 1/3 (+2.6) | 1/13 (5.8%) | 1/11 | 19% | sì / pochi / pochi / no |
| R3 WTI reale > 95 $, 3 mesi | 4 (4) | 2/4 | +19.2 | 1/1 (+69.2) | 1/3 (+2.6) | 0/13 (5.2%) | 1/11 | 18.1% | sì / pochi / pochi / sì |
| R3 WTI reale > 100 $, 2 mesi | 6 (5) | 3/5 | +29.2 | 1/1 (+69.2) | 2/4 (+19.3) | 1/13 (7.1%) | 2/11 | 16.6% | sì / pochi / pochi / sì |
| R3 WTI reale > 100 $, 3 mesi | 5 (5) | 3/5 | +29.2 | 1/1 (+69.2) | 2/4 (+19.3) | 1/13 (6.5%) | 2/11 | 15.6% | sì / pochi / pochi / no |
| R1 Brent, max 12 mesi, +0% | 20 (19) | 3/19 | -15.0 | 0/1 (-30.8) | 3/18 (-14.0) | 3/6 (48.8%) | 2/4 | 19.7% | no / pochi / no / no |
| R1 Brent, max 12 mesi, +10% | 9 (8) | 3/8 | +6.7 | — | 3/8 (+6.8) | 2/6 (22.5%) | 1/4 | 3.7% | no / pochi / no / no |
| R1 Brent, max 12 mesi, +20% | 4 (3) | 1/3 | +2.5 | — | 1/3 (+2.6) | 1/6 (9.8%) | 0/4 | 1.1% | no / pochi / pochi / no |
| R1 Brent, max 36 mesi, +0% | 9 (8) | 3/8 | +6.7 | — | 3/8 (+6.8) | 3/6 (24.7%) | 1/3 | 11.6% | no / pochi / no / no |
| R1 Brent, max 36 mesi, +10% | 5 (4) | 2/4 | +19.2 | — | 2/4 (+19.3) | 0/6 (13.2%) | 1/3 | 2.7% | sì / pochi / pochi / no |
| R1 Brent, max 36 mesi, +20% | 1 (1) | 1/1 | +69.2 | — | 1/1 (+69.3) | 0/6 (2.9%) | 0/3 | 0.7% | sì / pochi / pochi / no |
| R2 Brent, annua ≥ +50% | 12 (11) | 4/11 | +5.6 | 1/1 (+69.2) | 3/10 (-0.7) | 2/6 (30.9%) | 2/4 | 14.5% | no / pochi / no / no |
| R2 Brent, annua ≥ +100% | 2 (2) | 0/2 | -30.8 | — | 0/2 (-30.7) | 2/6 (5.5%) | 0/4 | 1.9% | no / pochi / pochi / no |
| R3 Brent > 95 $, 2 mesi | 4 (3) | 3/3 | +69.2 | — | 3/3 (+69.3) | 1/6 (9.4%) | 0/4 | 12.5% | sì / pochi / pochi / sì |
| R3 Brent > 95 $, 3 mesi | 4 (3) | 3/3 | +69.2 | — | 3/3 (+69.3) | 1/6 (9.1%) | 0/4 | 11.4% | sì / pochi / pochi / sì |
| R3 Brent > 100 $, 2 mesi | 4 (3) | 3/3 | +69.2 | — | 3/3 (+69.3) | 1/6 (9.3%) | 0/4 | 11.2% | sì / pochi / pochi / sì |
| R3 Brent > 100 $, 3 mesi | 4 (3) | 3/3 | +69.2 | — | 3/3 (+69.3) | 1/6 (9.2%) | 0/4 | 10% | sì / pochi / pochi / sì |
| R1 Brent reale, max 12 mesi, +0% | 17 (16) | 4/16 | -5.8 | 0/1 (-30.8) | 4/15 (-4.0) | 3/6 (40.8%) | 2/4 | 17.7% | no / pochi / no / no |
| R1 Brent reale, max 12 mesi, +10% | 9 (8) | 3/8 | +6.7 | — | 3/8 (+6.8) | 2/6 (23.4%) | 1/4 | 3.5% | no / pochi / no / no |
| R1 Brent reale, max 12 mesi, +20% | 3 (2) | 0/2 | -30.8 | — | 0/2 (-30.7) | 1/6 (7.1%) | 0/4 | 0.9% | no / pochi / pochi / no |
| R1 Brent reale, max 36 mesi, +0% | 8 (7) | 4/7 | +26.3 | — | 4/7 (+26.4) | 2/6 (21.8%) | 1/3 | 10% | sì / pochi / sì / no |
| R1 Brent reale, max 36 mesi, +10% | 5 (4) | 2/4 | +19.2 | — | 2/4 (+19.3) | 0/6 (13%) | 1/3 | 2.5% | sì / pochi / pochi / no |
| R1 Brent reale, max 36 mesi, +20% | 0 (0) | 0/0 | — | — | — | 0/6 (0%) | 0/3 | 0.5% | no / pochi / pochi / no |
| R2 Brent reale, annua ≥ +50% | 10 (9) | 2/9 | -8.6 | — | 2/9 (-8.5) | 2/6 (25.9%) | 1/4 | 11.7% | no / pochi / no / no |
| R2 Brent reale, annua ≥ +100% | 2 (2) | 0/2 | -30.8 | — | 0/2 (-30.7) | 2/6 (5.5%) | 0/4 | 1.7% | no / pochi / pochi / no |
| R3 Brent reale > 95 $, 2 mesi | 6 (5) | 2/5 | +9.2 | — | 2/5 (+9.3) | 1/6 (14.6%) | 0/4 | 25.8% | no / pochi / pochi / no |
| R3 Brent reale > 95 $, 3 mesi | 6 (5) | 2/5 | +9.2 | — | 2/5 (+9.3) | 0/6 (14.4%) | 0/4 | 23.7% | no / pochi / pochi / no |
| R3 Brent reale > 100 $, 2 mesi | 6 (5) | 3/5 | +29.2 | — | 3/5 (+29.3) | 1/6 (14.6%) | 1/4 | 23% | sì / pochi / pochi / no |
| R3 Brent reale > 100 $, 3 mesi | 5 (4) | 2/4 | +19.2 | — | 2/4 (+19.3) | 1/6 (11.8%) | 1/4 | 21.2% | sì / pochi / pochi / no |

### Cosa dicono i numeri

1. **Le regole con abbastanza casi non battono la base.**
   - Hamilton a 12 mesi (WTI, 31 segnali): 9 su 30 seguiti da un calo ≥10%, contro il 30,8% della base. I cali ≥20%
     avvisati sono 4 su 13, mentre il caso ne darebbe il 39,1%.
   - La variante a 36 mesi è la migliore tra quelle con più casi: 9 su 20 (+14,2), con 4 su 10 prima del 1990
     (+9,2) e 5 su 10 dopo (+19,3). Non supera (a) e non regge in tutti e due i periodi.
   - In termini reali, a 36 mesi: 7 su 15 (+15,9), cioè 4 su 7 prima del 1990 e 3 su 8 dopo (+6,8). Non regge dal
     1990 e le varianti vicine (+10% e 12 mesi) non hanno +10 punti.
2. **Le regole che superano (a) hanno 1-6 segnali.** Sono le soglie alte di R1, R2 a +100% e tutte le R3 (livello).
   In nessun periodo hanno più di 5 segnali: con 3-5 casi una quota di «3 su 3» non distingue un segnale dal caso.
3. **Il livello «stabilmente sopra 100 $» non funziona come stato.** I mesi con la condizione vera (che si
   sovrappongono, quindi non sono indipendenti) sono seguiti da un calo ≥10% entro 12 mesi:
   - Brent > 100 $ per 2 mesi: 13 su 50, −4,8 punti sulla base;
   - Brent > 95 $ per 2 mesi: 16 su 56, −2,2 punti;
   - WTI reale > 100 $ per 2 mesi: 59 su 152, +8,0 punti.

   I 3 segnali riusciti sono l'inizio di tre episodi diversi. In due (04/2008 e 04/2022) l'S&P era già il 11,5% e il
   13,9% sotto il massimo dei 12 mesi prima.
4. **Recessioni (esito secondario).**
   - Gli aumenti sopra il massimo di 12 o 36 mesi hanno preceduto 7 recessioni su 11.
   - Dopo un segnale R1 a 36 mesi è seguita una recessione entro 12 mesi 9 volte su 20 (45%), contro il 25,7% della
     base.

   Il legame petrolio-recessioni c'è, ma la borsa non lo «sconta» in modo sfruttabile: dopo gli stessi segnali il
   rendimento mediano a 12 mesi è +4,7% (base +10,8%) e il calo massimo mediano a 12 mesi è −9,1% (base −5,4%).
   L'effetto è più debole e più incerto del messaggio «petrolio alto = forte calo».
5. **Sensibilità.** Alzando la soglia di R3 i casi calano fino a 1 (WTI > 110 $ e > 120 $: solo il 2008). Abbassando
   la soglia a 80-90 $ i risultati restano simili ma sempre con 3-5 casi. Nel prezzo reale, il WTI sopra 90 $ di oggi
   per 2 mesi dà 2 casi su 7 (−2,2 punti). Il risultato del livello dipende quindi da pochi episodi, soprattutto dal
   2008.

### Segnali per episodio

| Episodio | Petrolio | Primi segnali | Cali S&P ≥20% (massimo da 12 mesi prima) | Recessione | Esito del primo segnale |
|---|---|---|---|---|---|
| 1973-74 | WTI 3.56 (1973-01) → 11.16 (1974-10) | R1 WTI 12 e 36 mesi: 1973-08, 1974-10; R1 reale 36 mesi: 1973-08, 1974-10; R2 +50% e +100%: 1974-01 | 1973-01-11→1974-10-03 −48.2% | 1973-12 | 1973-08: calo max −32.9%, rend. −30.8%, recessione sì |
| 1979-80 | WTI 14.85 (1978-07) → 39.5 (1980-04) | R1 12/36 mesi: 1979-02; R1 reale 36: 1979-05; R2 +50%: 1979-08; R2 +100%: 1979-11; R3 WTI reale > 100 $: 1979-08 | 1980-11-28→1982-08-12 −27.1% | 1980-02, 1981-08 | 1979-02: calo max 0%, rend. +18.1%, recessione sì |
| 1990 | WTI 16.87 (1990-06) → 35.92 (1990-10); Brent max 36.02 | R1 36 mesi: 1990-01, 1990-08; R1 12 mesi: 1990-08; R2 +50%: 1990-09 | nessuno (07-10/1990: −19.9%) | 1990-08 | 1990-01: calo max −10.2%, rend. +4.5%, recessione sì |
| 2000 | WTI 12.01 (1999-02) → 34.4 (2000-11) | R1 12 mesi: 1999-04; R1 36 mesi: 1999-12; R2 +50%: 1999-08; R2 +100%: 1999-12 | 2000-03-24→2001-09-21 −36.8% | 2001-04 | 1999-04: calo max −6.6%, rend. +8.8%, recessione no |
| 2005-08 | WTI 34.27 (2004-01) → 133.93 (2008-06); Brent max 132.72 | R1: 2004-03, 2006-04, 2007-09; R2 +50%: 2004-09, 2007-11; R3 reale > 100 $: 2005-08, 2007-04; R3 nominale > 100 $: 2008-04 | 2007-10-09→2008-11-20 −51.9% | 2008-01 | 2004-03: calo max −5.6%, rend. +4.8%, recessione no |
| 2011 | WTI 75.31 (2010-09) → 110.04 (2011-04); Brent max 123.26 | R1 12 mesi: 2010-12; R3 Brent > 100 $: 2011-03; R3 WTI > 100 $: 2011-04 | nessuno (04-10/2011: −19.4%) | nessuna | 2010-12: calo max −12.6%, rend. 0%, recessione no |
| 2021-22 | WTI 52 (2021-01) → 114.84 (2022-06); Brent max 122.71 | R1/R2: 2021-02 … 2021-10 (ripresa dopo il Covid); R3 reale: 2022-02; R3 nominale: 2022-04 | 2022-01-03→2022-10-12 −25.4% (inizia prima di R3) | nessuna | 2021-02: calo max −1.1%, rend. +14.8%, recessione no |
| 2026 | WTI 57.97 (2025-12) → 102.13 (2026-05); Brent max 123.93 (2026-10) | R1: 2026-03/04; R2 +50%: 2026-04; R3 Brent > 100 $: 2026-04; R3 WTI > 100 $: 2026-05 | nessuno finora | nessuna (dato NBER a posteriori) | finestra non completa: vedi sotto |

Lettura per episodio:
- **1973-74.** Il massimo dell'S&P (11/01/1973) arriva prima di qualsiasi segnale. Con il primo segnale (08/1973)
  l'S&P era già −13,3% e con R2 (01/1974) −17,3% dal massimo dei 12 mesi. Il petrolio è stato una parte del ribasso,
  non il suo annuncio.
- **1979-80.** Il segnale del 02/1979 è seguito da +18,1% in 12 mesi. Il ribasso arriva a fine 1980 (−27,1%), con i
  tassi di Volcker. R2 a +100% (11/1979) cade nei 12 mesi prima di quel massimo.
- **1990.** I segnali di 08-09/1990 arrivano dopo il massimo del 16/07/1990. Dall'ingresso l'S&P perde ancora l'8,4%,
  poi recupera (+22,6% a 12 mesi dal segnale di 08/1990).
- **2000.** I segnali del 1999 vengono dal rimbalzo da 12 $. Il ribasso del 2000-02 è quello della bolla tecnologica:
  conta come «avvisato» ma per un altro motivo.
- **2005-08.** I segnali del 2004-2006 sono falsi allarmi. Il segnale R1 di 09/2007 è seguito da −27,5% in 12 mesi,
  R3 Brent di 04/2008 da −51,2%: il 2008 è il caso che regge di più, insieme al 1973-74.
- **2011.** R3 Brent di 03/2011 è seguito da −17,1% (agosto 2011, debito USA e crisi dell'euro), senza recessione.
- **2021-22.** I segnali R1/R2 del 2021 sono il rimbalzo dopo il Covid. Il ribasso del 2022 inizia il 3 gennaio, prima
  dei segnali R3 (02 e 04/2022), che arrivano con l'S&P già −8,8% e −13,9%.

## 4. Situazione attuale (dati fino al 12/11/2026)

**Medie mensili** (nominale, e tra parentesi in $ di ottobre 2026):

| Mese | Brent | WTI |
|---|---|---|
| 03/2026 | 103,13 | 91,38 |
| 04/2026 | 117,29 | 100,32 |
| 05/2026 | 107,14 | 102,13 |
| 06/2026 | 85,40 | 84,81 |
| 07/2026 | 83,76 | 80,46 |
| 08/2026 | 91,08 | 83,90 |
| 09/2026 | 114,16 (115,30) | 97,31 |
| 10/2026 | 123,93 (124,36) | 102,07 (102,43) |

**Stato delle regole a 10/2026.**
- Brent > 95 e > 100 $ per 2 mesi: **vera** (settembre e ottobre). Non è un nuovo segnale, perché dopo l'inizio di
  04/2026 la condizione è restata falsa solo 4 mesi (06-09/2026), meno dei 6 richiesti.
- R2 annua ≥ +50%: vera.
- Hamilton (R1) sul Brent, a 12 e 36 mesi: vera.
- Hamilton (R1) sul WTI: falsa.

**Esito parziale dei segnali del 2026** (finestra non completa, solo descrittivo):

| Segnale | Ingresso | Calo massimo da allora | Rendimento al 11/11/2026 |
|---|---|---|---|
| R1 WTI 03/2026 | 6528,52 | 0% | +16,7% |
| R3 Brent > 100 $ 04/2026 | 7209,01 | −0,1% | +5,7% |
| R3 WTI > 100 $ 05/2026 | 7580,06 | −4,1% | +0,5% |

**Il calo del 22-23% citato nel video**, verificato:
- **Brent futures (Yahoo BZ=F):** 117,64 $ il 30/10/2026, 91,49 $ il 10/11 (**−22,2%**), 92,23 $ il 12/11 (−21,6%,
  seduta in corso).
- **WTI futures (CL=F):** 104,12 $ il 30/10 e 85,93 $ il 12/11 (−17,5%).
- **Brent spot (FRED, fino al 03/11):** il massimo di ottobre è 135,51 $ il 02/10. Il 30/10 valeva 120,15 $ e il 03/11
  107,03 $ (−21% dal massimo del 02/10). Lo spot e il future del mese dopo in questo periodo differiscono di molto (il
  03/11: 107,03 $ contro 103,6 $).
- **S&P 500:** massimo 7818,93 il 06/10/2026, ultimo 7619,38 il 11/11 (−2,6%), minimo 7353,73 il 05/11 (−5,9%).

Quindi il −22% è un calo **del petrolio** (Brent futures, dal 30/10 al 10/11) e non dell'S&P.

## 5. Ricalcolo indipendente

`script/verifica.py` è scritto a parte, in pandas, partendo dalle stesse risposte grezze. Ricalcola:
- la base nei tre periodi;
- 16 regole principali: elenco dei segnali, segnali con esito, cali ≥10%, vantaggio sulla base in ogni periodo e cali
  ≥20% avvisati;
- l'elenco dei 13 cali ≥20%;
- i numeri di oggi (Brent e WTI da ottobre, S&P dal massimo del 2026).

Risultato: **0 differenze** (`verifica.json`). Le fonti indipendenti dei dati sono nella sezione 2.

## 6. Limiti

- **Pochi casi.** Le regole sul livello hanno 3-6 segnali, tutti dopo il 2005 (nominali) o quasi tutti (reali).
  Molti eventi si concentrano nelle stesse crisi.
- **Il WTI prima del 1974** è un prezzo «posted», quasi fisso: gli «shock» del 1953, 1957 e 1969 sono ritocchi del
  5-10%. Hamilton usa la stessa serie, ma questi casi pesano nella parte 1950-1989.
- **Il CPI** è la versione di oggi (rivista), non quella nota allora. Manca il 10/2025 (si usa l'ultimo pubblicato).
- **La soglia 95-100 $** è stata scelta oggi, dopo aver visto il 2008, il 2022 e il 2026: i risultati sul livello
  sono «col senno di poi».
- **S&P solo prezzo**, senza dividendi.
- **Recessioni.** Le date NBER sono decise a posteriori; per gli ultimi 12 mesi l'esito «recessione» può ancora
  cambiare.
- **Lo zigzag** spezza un ribasso lungo in più eventi (per esempio 2007-09 in due cali ≥20%). Per i cali ≥10% gli
  eventi nelle crisi sono molti (57 dal 1950).
- **Spot e futures.** Brent spot (Dated) e future del mese dopo possono differire molto in uno shock (mediana 1%,
  massimo 31% nel 04/2020). Le date delle barre giornaliere Yahoo dei futures sono prese dal timestamp UTC. L'ultima
  barra (12/11) è una seduta in corso.
- **Medie mensili.** Il segnale usa le medie mensili, quindi arriva a fine mese: un picco di pochi giorni non conta.

## 7. Verdetto: solo contesto, non un segnale

- **Come segnale di calo dell'S&P: scarta.** Nessuna regola supera il criterio deciso prima:
  - le regole frequenti non battono la base;
  - quelle che la battono hanno 1-6 casi e non esistono prima del 1990;
  - lo «stato» Brent > 100 $ non è seguito da più cali della media;
  - i grandi ribassi (1973, 2000, 2020, 2022) sono iniziati prima o indipendentemente dagli shock del petrolio.
- **Come contesto: utile, con cautela.**
  - Uno shock del petrolio (soprattutto un nuovo massimo dei 36 mesi) è più spesso seguito da una recessione (9 su 20
    contro 25,7%).
  - Il 1973-74 e il 2008 mostrano che, quando arriva insieme ad altro, il ribasso può essere grande.
  - L'affermazione «petrolio stabilmente sopra 95-100 $ ⇒ forti cali» non è sostenuta dai dati come regola.

**Cosa l'app potrebbe mostrare, se l'utente vuole il contesto e non un allarme.** È una proposta da discutere: non è
una regola.

Nella vista Macro o VIX, una riga «Petrolio» con:
- la media mensile del Brent e del WTI e l'ultimo prezzo (con la fonte e la data);
- il prezzo in dollari di oggi (CPI), confrontato con i massimi reali del 1980 e del 2008;
- la variazione annua;
- lo stato «nuovo massimo dei 36 mesi» (Hamilton);
- una nota fissa: «Gli shock del petrolio dal 1950 hanno preceduto 7 recessioni su 11, ma non hanno anticipato i
  cali dell'S&P meglio di un mese qualsiasi (backtest in ricerca/petrolio)».

Nessun colore di allarme. Le serie servirebbero nel workflow (FRED DCOILBRENTEU e DCOILWTICO, CPIAUCSL), con «—» se
mancano.

## Come rifare

```
node ricerca/petrolio/script/scarica.mjs          # dati in ricerca/petrolio/cache (--refresh per riscaricare)
node ricerca/petrolio/script/backtest.mjs         # → ricerca/petrolio/risultati.json
python3 -I ricerca/petrolio/script/verifica.py    # ricalcolo indipendente → verifica.json, esce con 1 se ci sono differenze
python3 -I ricerca/petrolio/script/tabelle.py     # tabelle di questa nota
```

## Appendice: tabelle complete (da `script/tabelle.py`)

Colonne: «Stato: calo ≥10%» = tutti i mesi con la condizione vera (sovrapposti) seguiti da un calo ≥10% entro 12 mesi, tra parentesi i punti sulla base; «Copertura a caso» come nella sezione 1. I numeri decimali usano il punto perché sono stampati dallo script.

#### Regole decise prima (tutte le colonne)

| Regola | Segnali | Calo ≥10% entro 12 m | vs base | 1950-1989 | 1990-oggi | Rend. med. 3/6/12 m | Calo max med. 6/12/18 m | Recess. entro 12 m | Cali ≥20% avvisati | Cali ≥10% avvisati | Copertura a caso | Recessioni avvisate | Mesi in allarme | Stato: calo ≥10% | a | b | c |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R1 WTI, max 12 mesi, +0% | 31 | 9/30 (30%) | -0.8 | 6/14 (+12.1) | 3/16 (-11.9) | 3.1/5/10.7 | -3.5/-5.8/-6.2 | 9/30 | 4/13 | 25/57 | 39.1% | 7/11 | 13.7% | 47/123 (7.4) | no | no / no | no |
| R1 WTI, max 12 mesi, +10% | 16 | 6/15 (40%) | 9.2 | 2/4 (+19.2) | 4/11 (+5.7) | 1/6/8.8 | -6.5/-8.4/-8.4 | 5/15 | 3/13 | 17/57 | 20% | 2/11 | 2.9% | 12/26 (15.4) | no | troppo pochi casi / no | no |
| R1 WTI, max 12 mesi, +20% | 4 | 2/3 (66.7%) | 35.9 | 2/2 (+69.2) | 0/1 (-30.7) | -1.5/8.9/11.9 | -8.5/-10.2/-10.2 | 3/3 | 0/13 | 4/57 | 4.7% | 2/11 | 0.7% | 3/5 (29.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 WTI, max 36 mesi, +0% | 21 | 9/20 (45%) | 14.2 | 4/10 (+9.2) | 5/10 (+19.3) | 0.5/5.1/4.7 | -5.6/-9.1/-9.1 | 9/20 | 3/13 | 18/56 | 26.6% | 7/11 | 8.9% | 34/79 (12.2) | no | no / sì | no |
| R1 WTI, max 36 mesi, +10% | 10 | 4/10 (40%) | 9.2 | 2/4 (+19.2) | 2/6 (+2.6) | 1/6/8.7 | -7.4/-9/-10.2 | 5/10 | 2/13 | 13/56 | 13.2% | 2/11 | 2.1% | 10/19 (21.8) | no | troppo pochi casi / no | no |
| R1 WTI, max 36 mesi, +20% | 3 | 2/3 (66.7%) | 35.9 | 2/2 (+69.2) | 0/1 (-30.7) | -2.9/4/11.9 | -8.6/-10.2/-10.2 | 3/3 | 0/13 | 4/56 | 4% | 2/11 | 0.5% | 3/5 (29.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R2 WTI, annua ≥ +50% | 13 | 5/12 (41.7%) | 10.9 | 3/3 (+69.2) | 2/9 (-8.5) | 4.6/4/12.4 | -7.6/-8.6/-9.4 | 4/12 | 3/13 | 16/57 | 16.4% | 2/11 | 8.9% | 43/78 (24.3) | no | troppo pochi casi / no | no |
| R2 WTI, annua ≥ +100% | 4 | 2/4 (50%) | 19.2 | 1/2 (+19.2) | 1/2 (+19.3) | 4.5/1.9/1.9 | -8.4/-10.7/-17.3 | 2/4 | 3/13 | 8/57 | 5.2% | 1/11 | 3% | 14/28 (19.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R3 WTI > 95 $, 2 mesi | 5 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | 0/-7.2/1.7 | -14.9/-16.4/-16.4 | 1/4 | 1/13 | 6/57 | 5.8% | 0/11 | 3.5% | 14/30 (15.9) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 95 $, 3 mesi | 4 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | -6.4/-4.3/-0.7 | -15.9/-15.9/-15.9 | 1/4 | 1/13 | 5/57 | 5.2% | 0/11 | 2.6% | 11/24 (15) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 100 $, 2 mesi | 6 | 3/5 (60%) | 29.2 | — | 3/5 (+29.3) | -2/-6.3/2.5 | -13.4/-13.4/-13.4 | 1/5 | 1/13 | 6/57 | 6.9% | 0/11 | 2.6% | 11/23 (17) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 100 $, 3 mesi | 5 | 3/5 (60%) | 29.2 | — | 3/5 (+29.3) | -4.3/-1.3/1.2 | -13.4/-13.4/-13.4 | 1/5 | 1/13 | 4/57 | 6.3% | 0/11 | 1.8% | 8/17 (16.3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R1 WTI reale, max 12 mesi, +0% | 31 | 9/30 (30%) | -0.8 | 5/15 (+2.5) | 4/15 (-4.0) | 3.1/5/11.5 | -2.8/-6.1/-6.3 | 9/30 | 4/13 | 27/57 | 39.8% | 7/11 | 12.8% | 42/115 (5.7) | no | no / no | no |
| R1 WTI reale, max 12 mesi, +10% | 12 | 4/11 (36.4%) | 5.6 | 1/3 (+2.5) | 3/8 (+6.8) | 1/4.6/8.8 | -6.5/-8.4/-8.4 | 4/11 | 3/13 | 13/57 | 14.8% | 2/11 | 2.3% | 8/20 (9.2) | no | troppo pochi casi / no | no |
| R1 WTI reale, max 12 mesi, +20% | 4 | 2/3 (66.7%) | 35.9 | 2/2 (+69.2) | 0/1 (-30.7) | 2.5/10.6/11.9 | -6.1/-10.2/-10.2 | 3/3 | 0/13 | 4/57 | 4.7% | 1/11 | 0.4% | 2/3 (35.9) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 WTI reale, max 36 mesi, +0% | 16 | 7/15 (46.7%) | 15.9 | 4/7 (+26.3) | 3/8 (+6.8) | -1/1.2/-2 | -7.5/-9.9/-12 | 7/15 | 3/13 | 15/56 | 20.7% | 5/11 | 6.7% | 26/60 (12.5) | sì | sì / no | no |
| R1 WTI reale, max 36 mesi, +10% | 6 | 3/6 (50%) | 19.2 | 1/2 (+19.2) | 2/4 (+19.3) | -4.2/-4.4/0.6 | -13.1/-14.7/-14.7 | 4/6 | 1/13 | 8/56 | 8% | 1/11 | 1.1% | 5/10 (19.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 WTI reale, max 36 mesi, +20% | 3 | 2/3 (66.7%) | 35.9 | 2/2 (+69.2) | 0/1 (-30.7) | -2.9/4/11.9 | -8.6/-10.2/-10.2 | 3/3 | 0/13 | 4/56 | 4% | 1/11 | 0.3% | 2/3 (35.9) | sì | troppo pochi casi / troppo pochi casi | sì |
| R2 WTI reale, annua ≥ +50% | 12 | 4/11 (36.4%) | 5.6 | 3/3 (+69.2) | 1/8 (-18.2) | 4.7/4.6/12.8 | -6/-6.4/-8.3 | 4/11 | 3/13 | 15/57 | 15.1% | 2/11 | 8% | 38/71 (22.7) | no | troppo pochi casi / no | sì |
| R2 WTI reale, annua ≥ +100% | 4 | 3/4 (75%) | 44.2 | 2/2 (+69.2) | 1/2 (+19.3) | -0.1/3.3/1.9 | -11.4/-13.8/-19.2 | 2/4 | 3/13 | 7/57 | 5.2% | 0/11 | 2.3% | 11/21 (21.6) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 95 $, 2 mesi | 5 | 2/4 (50%) | 19.2 | 1/1 (+69.2) | 1/3 (+2.6) | -2.2/3.8/7.5 | -6.6/-7.4/-7.4 | 1/4 | 1/13 | 6/57 | 5.8% | 1/11 | 19% | 63/173 (5.6) | sì | troppo pochi casi / troppo pochi casi | no |
| R3 WTI reale > 95 $, 3 mesi | 4 | 2/4 (50%) | 19.2 | 1/1 (+69.2) | 1/3 (+2.6) | 0.6/-0.8/4.8 | -6.9/-6.9/-6.9 | 1/4 | 0/13 | 4/57 | 5.2% | 1/11 | 18.1% | 59/167 (4.5) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 100 $, 2 mesi | 6 | 3/5 (60%) | 29.2 | 1/1 (+69.2) | 2/4 (+19.3) | -0.2/4.5/6.8 | -5.1/-10.2/-10.2 | 2/5 | 1/13 | 6/57 | 7.1% | 2/11 | 16.6% | 59/152 (8) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 100 $, 3 mesi | 5 | 3/5 (60%) | 29.2 | 1/1 (+69.2) | 2/4 (+19.3) | -1.3/-3.2/2.8 | -8.1/-10.2/-10.2 | 2/5 | 1/13 | 6/57 | 6.5% | 2/11 | 15.6% | 56/144 (8.1) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 Brent, max 12 mesi, +0% | 20 | 3/19 (15.8%) | -15 | 0/1 (-30.8) | 3/18 (-14.0) | 3.8/7.4/13.1 | -3.2/-5/-5.6 | 3/19 | 3/6 | 13/28 | 48.8% | 2/4 | 19.7% | 36/88 (10.1) | no | troppo pochi casi / no | no |
| R1 Brent, max 12 mesi, +10% | 9 | 3/8 (37.5%) | 6.7 | — | 3/8 (+6.8) | -0.1/4.9/6.6 | -6.1/-7.3/-7.3 | 2/8 | 2/6 | 8/28 | 22.5% | 1/4 | 3.7% | 6/15 (9.2) | no | troppo pochi casi / no | no |
| R1 Brent, max 12 mesi, +20% | 4 | 1/3 (33.3%) | 2.5 | — | 1/3 (+2.6) | 1.2/9.4/7.7 | -7.3/-8.4/-8.4 | 1/3 | 1/6 | 2/28 | 9.8% | 0/4 | 1.1% | 1/4 (-5.8) | no | troppo pochi casi / troppo pochi casi | no |
| R1 Brent, max 36 mesi, +0% | 9 | 3/8 (37.5%) | 6.7 | — | 3/8 (+6.8) | -1.2/2.3/-0.2 | -5.6/-7.9/-10.7 | 1/8 | 3/6 | 9/27 | 24.7% | 1/3 | 11.6% | 24/48 (19.2) | no | troppo pochi casi / no | no |
| R1 Brent, max 36 mesi, +10% | 5 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | -1.5/4.7/-1.5 | -5.1/-11.7/-11.7 | 1/4 | 0/6 | 5/27 | 13.2% | 1/3 | 2.7% | 4/10 (9.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 Brent, max 36 mesi, +20% | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -16.4/-20.9/-9.3 | -20.9/-21/-21 | 0/1 | 0/6 | 1/27 | 2.9% | 0/3 | 0.7% | 1/3 (2.5) | sì | troppo pochi casi / troppo pochi casi | no |
| R2 Brent, annua ≥ +50% | 12 | 4/11 (36.4%) | 5.6 | 1/1 (+69.2) | 3/10 (-0.7) | 3.2/5/10.2 | -5.6/-8.4/-9 | 3/11 | 2/6 | 10/28 | 30.9% | 2/4 | 14.5% | 34/63 (23.2) | no | troppo pochi casi / no | no |
| R2 Brent, annua ≥ +100% | 2 | 0/2 (0%) | -30.8 | — | 0/2 (-30.7) | 3.3/5.4/4.4 | -2/-2.7/-15.2 | 0/2 | 2/6 | 4/28 | 5.5% | 0/4 | 1.9% | 3/9 (2.5) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent > 95 $, 2 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -3.6/-14.5/-9.3 | -18.3/-21/-21 | 1/3 | 1/6 | 6/29 | 9.4% | 0/4 | 12.5% | 16/56 (-2.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 95 $, 3 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -0.2/-14.7/0.9 | -15.6/-17.1/-17.1 | 1/3 | 1/6 | 5/29 | 9.1% | 0/4 | 11.4% | 13/53 (-6.3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 100 $, 2 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -0.2/-10.5/0.9 | -14.5/-17.1/-17.1 | 1/3 | 1/6 | 6/29 | 9.3% | 0/4 | 11.2% | 13/50 (-4.8) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 100 $, 3 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -4.8/-8.1/1.2 | -19.4/-19.4/-19.4 | 1/3 | 1/6 | 5/29 | 9.2% | 0/4 | 10% | 10/46 (-9.1) | sì | troppo pochi casi / troppo pochi casi | sì |
| R1 Brent reale, max 12 mesi, +0% | 17 | 4/16 (25%) | -5.8 | 0/1 (-30.8) | 4/15 (-4.0) | 3.9/5.1/13.9 | -2.8/-6.1/-6.6 | 3/16 | 3/6 | 11/28 | 40.8% | 2/4 | 17.7% | 34/79 (12.2) | no | troppo pochi casi / no | no |
| R1 Brent reale, max 12 mesi, +10% | 9 | 3/8 (37.5%) | 6.7 | — | 3/8 (+6.8) | -0.1/4.9/6.6 | -6.1/-7.3/-7.3 | 2/8 | 2/6 | 8/28 | 23.4% | 1/4 | 3.5% | 5/14 (4.9) | no | troppo pochi casi / no | no |
| R1 Brent reale, max 12 mesi, +20% | 3 | 0/2 (0%) | -30.8 | — | 0/2 (-30.7) | 2.6/13.8/15.1 | -6.1/-7.3/-7.3 | 1/2 | 1/6 | 1/28 | 7.1% | 0/4 | 0.9% | 0/3 (-30.8) | no | troppo pochi casi / troppo pochi casi | no |
| R1 Brent reale, max 36 mesi, +0% | 8 | 4/7 (57.1%) | 26.3 | — | 4/7 (+26.4) | -0.4/-0.6/-4.2 | -7.6/-13.9/-16.7 | 1/7 | 2/6 | 7/27 | 21.8% | 1/3 | 10% | 21/41 (20.4) | sì | troppo pochi casi / sì | no |
| R1 Brent reale, max 36 mesi, +10% | 5 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | -1.5/4.7/-1.5 | -5.1/-11.7/-11.7 | 1/4 | 0/6 | 5/27 | 13% | 1/3 | 2.5% | 4/10 (9.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R1 Brent reale, max 36 mesi, +20% | 0 | 0/0 (—%) | — | — | — | —/—/— | —/—/— | 0/0 | 0/6 | 0/27 | 0% | 0/3 | 0.5% | 0/2 (-30.8) | no | troppo pochi casi / troppo pochi casi | no |
| R2 Brent reale, annua ≥ +50% | 10 | 2/9 (22.2%) | -8.6 | — | 2/9 (-8.5) | 4.7/5.5/12.8 | -6.3/-6.4/-8.3 | 2/9 | 2/6 | 9/28 | 25.9% | 1/4 | 11.7% | 24/50 (17.2) | no | troppo pochi casi / no | no |
| R2 Brent reale, annua ≥ +100% | 2 | 0/2 (0%) | -30.8 | — | 0/2 (-30.7) | 3.3/5.4/4.4 | -2/-2.7/-15.2 | 0/2 | 2/6 | 4/28 | 5.5% | 0/4 | 1.7% | 2/8 (-5.8) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 95 $, 2 mesi | 6 | 2/5 (40%) | 9.2 | — | 2/5 (+9.3) | 4.4/5/6.8 | -3.1/-4/-4 | 0/5 | 1/6 | 5/29 | 14.6% | 0/4 | 25.8% | 42/119 (4.5) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 95 $, 3 mesi | 6 | 2/5 (40%) | 9.2 | — | 2/5 (+9.3) | 4.4/5.4/8.2 | -4.2/-4.2/-4.2 | 0/5 | 0/6 | 3/29 | 14.4% | 0/4 | 23.7% | 38/111 (3.4) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 100 $, 2 mesi | 6 | 3/5 (60%) | 29.2 | — | 3/5 (+29.3) | 3.1/4.7/6.8 | -4.3/-13.5/-13.5 | 1/5 | 1/6 | 5/29 | 14.6% | 1/4 | 23% | 36/106 (3.2) | sì | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 100 $, 3 mesi | 5 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | 1.4/1.1/-2.8 | -6.2/-10.5/-12.6 | 1/4 | 1/6 | 4/29 | 11.8% | 1/4 | 21.2% | 32/99 (1.5) | sì | troppo pochi casi / troppo pochi casi | no |

#### Sensibilità (soglie vicine, non decise prima)

| Regola | Segnali | Calo ≥10% entro 12 m | vs base | 1950-1989 | 1990-oggi | Rend. med. 3/6/12 m | Calo max med. 6/12/18 m | Recess. entro 12 m | Cali ≥20% avvisati | Cali ≥10% avvisati | Copertura a caso | Recessioni avvisate | Mesi in allarme | Stato: calo ≥10% | a | b | c |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R2 WTI, annua ≥ +30% | 16 | 7/15 (46.7%) | 15.9 | 3/4 (+44.2) | 4/11 (+5.7) | 0.4/5.9/6.3 | -4.9/-9.1/-9.7 | 5/15 | 3/13 | 18/57 | 20.4% | 3/11 | 15.1% | 68/134 (19.9) | sì | troppo pochi casi / no | sì |
| R2 WTI, annua ≥ +75% | 10 | 4/10 (40%) | 9.2 | 3/3 (+69.2) | 1/7 (-16.4) | 0.2/2.3/9.4 | -5.8/-6.8/-10 | 4/10 | 4/13 | 17/57 | 13.1% | 1/11 | 5.3% | 26/49 (22.3) | no | troppo pochi casi / no | sì |
| R3 WTI > 80 $, 2 mesi | 6 | 3/5 (60%) | 29.2 | — | 3/5 (+29.3) | -0.8/2.4/5.6 | -8.9/-13.8/-13.8 | 1/5 | 0/13 | 6/57 | 6.7% | 1/11 | 8.8% | 25/74 (3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 80 $, 3 mesi | 6 | 3/5 (60%) | 29.2 | — | 3/5 (+29.3) | 3.4/5/0 | -1.7/-12.6/-12.6 | 1/5 | 0/13 | 6/57 | 6.6% | 1/11 | 8% | 22/68 (1.6) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 90 $, 2 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -7.6/-10.5/-9.3 | -16.3/-21/-21 | 1/3 | 0/13 | 5/57 | 4.6% | 1/11 | 5.4% | 18/47 (7.5) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 90 $, 3 mesi | 5 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | 0.5/-6.8/-0.8 | -12.7/-15.9/-15.9 | 1/4 | 1/13 | 5/57 | 5.8% | 0/11 | 4.6% | 15/41 (5.8) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 110 $, 2 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -8.4/-36/-34.4 | -46.3/-51.7/-51.7 | 1/1 | 1/13 | 3/57 | 1.3% | 0/11 | 0.4% | 4/4 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 110 $, 3 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -8.9/-29.4/-28.2 | -41.2/-47.1/-47.1 | 1/1 | 1/13 | 3/57 | 1.3% | 0/11 | 0.3% | 3/3 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 120 $, 2 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -8.9/-29.4/-28.2 | -41.2/-47.1/-47.1 | 1/1 | 1/13 | 3/57 | 1.3% | 0/11 | 0.2% | 2/2 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI > 120 $, 3 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -23.6/-34.8/-22.1 | -40.6/-46.6/-46.6 | 1/1 | 1/13 | 3/57 | 1.3% | 0/11 | 0.1% | 1/1 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R2 WTI reale, annua ≥ +30% | 16 | 7/15 (46.7%) | 15.9 | 3/4 (+44.2) | 4/11 (+5.7) | 0.4/4.8/7.7 | -4.9/-8.4/-9.7 | 5/15 | 3/13 | 16/57 | 20.3% | 3/11 | 13.3% | 62/118 (21.7) | sì | troppo pochi casi / no | no |
| R2 WTI reale, annua ≥ +75% | 7 | 3/7 (42.9%) | 12.1 | 2/3 (+35.9) | 1/4 (-5.7) | -1.6/-7.6/-5.3 | -7.6/-8.3/-20.6 | 3/7 | 5/13 | 15/57 | 9.2% | 1/11 | 4% | 19/37 (20.6) | no | troppo pochi casi / troppo pochi casi | no |
| R3 WTI reale > 80 $, 2 mesi | 10 | 4/9 (44.4%) | 13.6 | 1/3 (+2.5) | 3/6 (+19.3) | 5.1/6.4/10.2 | -2.4/-10/-10 | 3/9 | 2/13 | 8/57 | 12.4% | 2/11 | 28% | 87/251 (3.9) | no | troppo pochi casi / sì | no |
| R3 WTI reale > 80 $, 3 mesi | 9 | 3/8 (37.5%) | 6.7 | 1/3 (+2.5) | 2/5 (+9.3) | 2.9/6.8/7.1 | -2.8/-5.6/-5.6 | 2/8 | 1/13 | 7/57 | 11% | 1/11 | 26.5% | 82/238 (3.7) | no | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 90 $, 2 mesi | 8 | 2/7 (28.6%) | -2.2 | 0/2 (-30.8) | 2/5 (+9.3) | 6.9/7.6/13.3 | -3.9/-4.4/-4.4 | 1/7 | 1/13 | 7/57 | 9.9% | 1/11 | 21% | 68/191 (4.8) | no | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 90 $, 3 mesi | 7 | 3/6 (50%) | 19.2 | 1/1 (+69.2) | 2/5 (+9.3) | 1.4/4.5/9.2 | -6.1/-6.9/-6.9 | 1/6 | 0/13 | 5/57 | 8.4% | 1/11 | 19.8% | 65/182 (4.9) | sì | troppo pochi casi / troppo pochi casi | no |
| R3 WTI reale > 110 $, 2 mesi | 6 | 3/6 (50%) | 19.2 | 1/1 (+69.2) | 2/5 (+9.3) | 1.2/-2.9/8.2 | -7.1/-8.4/-8.4 | 2/6 | 1/13 | 6/57 | 7.4% | 2/11 | 13.2% | 49/122 (9.4) | sì | troppo pochi casi / troppo pochi casi | no |
| R3 WTI reale > 110 $, 3 mesi | 5 | 2/5 (40%) | 9.2 | 0/1 (-30.8) | 2/4 (+19.3) | 4.9/-1.3/12.8 | -7.6/-8.3/-8.3 | 2/5 | 1/13 | 5/57 | 6.5% | 2/11 | 12.5% | 46/115 (9.2) | no | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 120 $, 2 mesi | 6 | 3/6 (50%) | 19.2 | 1/1 (+69.2) | 2/5 (+9.3) | -3.3/0.6/13.9 | -7.8/-8.5/-8.5 | 2/6 | 0/13 | 6/57 | 7.3% | 2/11 | 10.1% | 41/93 (13.3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 WTI reale > 120 $, 3 mesi | 3 | 2/3 (66.7%) | 35.9 | 0/1 (-30.8) | 2/2 (+69.3) | 5.4/4.4/0 | -3.5/-12.6/-12.6 | 2/3 | 0/13 | 5/57 | 3.9% | 2/11 | 9.2% | 38/85 (13.9) | sì | troppo pochi casi / troppo pochi casi | no |
| R2 Brent, annua ≥ +30% | 13 | 3/12 (25%) | -5.8 | 1/1 (+69.2) | 2/11 (-12.5) | 1.4/3.5/7.7 | -4/-6.4/-9 | 3/12 | 2/6 | 11/28 | 33.6% | 2/4 | 25.5% | 52/112 (15.6) | no | troppo pochi casi / no | no |
| R2 Brent, annua ≥ +75% | 7 | 1/6 (16.7%) | -14.1 | — | 1/6 (-14.0) | 4.7/5.3/13.4 | -3.7/-4.4/-9 | 2/6 | 3/6 | 9/28 | 16.4% | 0/4 | 5.2% | 11/23 (17) | no | troppo pochi casi / no | no |
| R3 Brent > 80 $, 2 mesi | 4 | 2/3 (66.7%) | 35.9 | — | 2/3 (+36.0) | -0.2/-0.2/-10.7 | -7.1/-21.7/-21.7 | 1/3 | 1/6 | 7/29 | 9.4% | 1/4 | 19.2% | 26/84 (0.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 80 $, 3 mesi | 5 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | 1.4/-3.9/-4.6 | -8.6/-16.8/-16.8 | 1/4 | 0/6 | 5/29 | 11.8% | 1/4 | 17.8% | 23/78 (-1.3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 90 $, 2 mesi | 5 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | 3.9/0.5/-3.6 | -2.3/-17.8/-17.8 | 1/4 | 0/6 | 5/29 | 12% | 1/4 | 14.2% | 21/63 (2.5) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 90 $, 3 mesi | 4 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | 0.9/-8.1/0.9 | -13.4/-17.2/-17.2 | 1/3 | 1/6 | 6/29 | 9.2% | 0/4 | 12.7% | 18/58 (0.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 110 $, 2 mesi | 5 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | -5.3/-3.3/9.9 | -12.4/-12.4/-12.4 | 1/4 | 1/6 | 5/29 | 10.7% | 0/4 | 4.2% | 8/19 (11.3) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 110 $, 3 mesi | 3 | 3/3 (100%) | 69.2 | — | 3/3 (+69.3) | -9.4/-7.3/-2.6 | -18.3/-18.3/-18.3 | 1/3 | 1/6 | 5/29 | 8% | 0/4 | 2.5% | 6/12 (19.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 120 $, 2 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -8.9/-29.4/-28.2 | -41.2/-47.1/-47.1 | 1/1 | 1/6 | 3/29 | 2.6% | 0/4 | 0.4% | 2/2 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent > 120 $, 3 mesi | 1 | 1/1 (100%) | 69.2 | — | 1/1 (+69.3) | -23.6/-34.8/-22.1 | -40.6/-46.6/-46.6 | 1/1 | 1/6 | 3/29 | 2.7% | 0/4 | 0.2% | 1/1 (69.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R2 Brent reale, annua ≥ +30% | 13 | 3/12 (25%) | -5.8 | 1/1 (+69.2) | 2/11 (-12.5) | 1.4/3.5/7.7 | -4/-6.4/-9 | 3/12 | 2/6 | 11/28 | 33.6% | 2/4 | 23.6% | 50/104 (17.3) | no | troppo pochi casi / no | no |
| R2 Brent reale, annua ≥ +75% | 6 | 1/5 (20%) | -10.8 | — | 1/5 (-10.7) | 4.9/2.3/12.8 | -4/-5.3/-9.7 | 2/5 | 3/6 | 8/28 | 13.7% | 0/4 | 3.9% | 8/17 (16.3) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 80 $, 2 mesi | 6 | 1/5 (20%) | -10.8 | — | 1/5 (-10.7) | 6/6.8/12.1 | -1.8/-3.6/-4.4 | 1/5 | 1/6 | 5/29 | 14.7% | 0/4 | 39.5% | 70/180 (8.1) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 80 $, 3 mesi | 6 | 1/5 (20%) | -10.8 | — | 1/5 (-10.7) | 5/8.7/11.6 | -2.8/-2.8/-3.3 | 1/5 | 1/6 | 4/29 | 14.5% | 0/4 | 37.7% | 66/172 (7.6) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 90 $, 2 mesi | 7 | 3/6 (50%) | 19.2 | — | 3/6 (+19.3) | 6.7/5.1/11.4 | -2.2/-8.7/-8.7 | 1/6 | 2/6 | 5/29 | 17.2% | 1/4 | 29% | 45/133 (3) | sì | troppo pochi casi / sì | no |
| R3 Brent reale > 90 $, 3 mesi | 6 | 2/5 (40%) | 9.2 | — | 2/5 (+9.3) | 3.7/4.9/8.2 | -3.6/-3.6/-3.6 | 0/5 | 1/6 | 5/29 | 14.5% | 0/4 | 26.3% | 39/122 (1.2) | no | troppo pochi casi / troppo pochi casi | no |
| R3 Brent reale > 110 $, 2 mesi | 5 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | -1.4/-1.9/-0.4 | -5.9/-11.7/-13.9 | 1/4 | 1/6 | 4/29 | 10.7% | 1/4 | 19% | 32/89 (5.2) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent reale > 110 $, 3 mesi | 4 | 2/4 (50%) | 19.2 | — | 2/4 (+19.3) | 3.2/-4.3/6.8 | -7/-10.9/-10.9 | 1/4 | 1/6 | 4/29 | 10.6% | 1/4 | 18% | 30/85 (4.5) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent reale > 120 $, 2 mesi | 4 | 3/4 (75%) | 44.2 | — | 3/4 (+44.3) | -3.6/-3.3/7 | -13.6/-13.6/-13.6 | 1/4 | 0/6 | 4/29 | 10.6% | 1/4 | 14.2% | 24/67 (5) | sì | troppo pochi casi / troppo pochi casi | sì |
| R3 Brent reale > 120 $, 3 mesi | 3 | 2/3 (66.7%) | 35.9 | — | 2/3 (+36.0) | -4.3/-1.3/1.2 | -13.4/-13.4/-13.4 | 1/3 | 0/6 | 5/29 | 7.9% | 1/4 | 13.1% | 21/62 (3.1) | sì | troppo pochi casi / troppo pochi casi | sì |

#### Segnali delle regole principali

| Regola | Segnale (mese) | Prezzo | S&P già sotto il max 12 m | Calo max 12 m | Rend. 12 m | Recessione entro 12 m |
|---|---|---|---|---|---|---|
| R1 WTI, max 36 mesi, +0% | 1953-06 | 2.82 | -9.5% | -5.9% | 21% | sì |
| R1 WTI, max 36 mesi, +0% | 1957-02 | 3.07 | -12.9% | -9.9% | -5.6% | sì |
| R1 WTI, max 36 mesi, +0% | 1967-02 | 3 | -6.1% | 0% | 3% | no |
| R1 WTI, max 36 mesi, +0% | 1969-03 | 3.25 | -6.3% | -16.2% | -11.7% | sì |
| R1 WTI, max 36 mesi, +0% | 1970-12 | 3.56 | -1.4% | -2.2% | 10.8% | no |
| R1 WTI, max 36 mesi, +0% | 1973-08 | 4.31 | -13.3% | -32.9% | -30.8% | sì |
| R1 WTI, max 36 mesi, +0% | 1974-10 | 11.16 | -31.4% | -12% | 20.5% | sì |
| R1 WTI, max 36 mesi, +0% | 1976-02 | 12.03 | -2.3% | -1.1% | 0.1% | no |
| R1 WTI, max 36 mesi, +0% | 1977-08 | 14.85 | -10.3% | -10.2% | 6.7% | no |
| R1 WTI, max 36 mesi, +0% | 1979-02 | 15.85 | -10% | 0% | 18.1% | sì |
| R1 WTI, max 36 mesi, +0% | 1990-01 | 22.64 | -8.5% | -10.2% | 4.5% | sì |
| R1 WTI, max 36 mesi, +0% | 1990-08 | 27.17 | -12.6% | -8.4% | 22.6% | sì |
| R1 WTI, max 36 mesi, +0% | 1996-03 | 21.36 | -2.4% | -2.9% | 17.3% | no |
| R1 WTI, max 36 mesi, +0% | 1999-12 | 26.08 | 0% | -13.9% | -10.1% | no |
| R1 WTI, max 36 mesi, +0% | 2003-02 | 35.87 | -28.1% | -4.8% | 36.1% | no |
| R1 WTI, max 36 mesi, +0% | 2004-03 | 36.76 | -2.7% | -5.6% | 4.8% | no |
| R1 WTI, max 36 mesi, +0% | 2006-04 | 69.69 | -0.1% | -6.6% | 13.1% | no |
| R1 WTI, max 36 mesi, +0% | 2007-09 | 79.93 | -1.7% | -27.5% | -23.6% | sì |
| R1 WTI, max 36 mesi, +0% | 2018-01 | 63.7 | -1.7% | -16.7% | -4.2% | no |
| R1 WTI, max 36 mesi, +0% | 2021-06 | 71.38 | 0% | -14.7% | -11.9% | no |
| R1 WTI, max 36 mesi, +0% | 2026-03 | 91.38 | -6.4% | — | — | — |
| R2 WTI, annua ≥ +50% | 1974-01 | 10.11 | -17.3% | -35.5% | -20.3% | sì |
| R2 WTI, annua ≥ +50% | 1979-08 | 26.5 | 0% | -10.2% | 11.9% | sì |
| R2 WTI, annua ≥ +50% | 1987-07 | 21.36 | 0% | -29.7% | -14.6% | no |
| R2 WTI, annua ≥ +50% | 1990-09 | 33.69 | -17% | -3.5% | 26.7% | sì |
| R2 WTI, annua ≥ +50% | 1999-08 | 21.26 | -6.9% | -5.5% | 14.9% | no |
| R2 WTI, annua ≥ +50% | 2002-12 | 29.42 | -25% | -9% | 26.4% | no |
| R2 WTI, annua ≥ +50% | 2004-09 | 45.95 | -3.7% | -1.8% | 10.2% | no |
| R2 WTI, annua ≥ +50% | 2007-11 | 94.62 | -5.4% | -49.2% | -39.5% | sì |
| R2 WTI, annua ≥ +50% | 2009-12 | 74.3 | -1.1% | -8.3% | 12.8% | no |
| R2 WTI, annua ≥ +50% | 2017-01 | 52.5 | -0.8% | 0% | 23.9% | no |
| R2 WTI, annua ≥ +50% | 2018-06 | 67.87 | -5.4% | -13.5% | 8.2% | no |
| R2 WTI, annua ≥ +50% | 2021-03 | 62.33 | 0% | 0% | 14% | no |
| R2 WTI, annua ≥ +50% | 2026-04 | 100.32 | 0% | — | — | — |
| R3 WTI reale > 100 $, 2 mesi | 1979-08 | 122.51 | 0% | -10.2% | 11.9% | sì |
| R3 WTI reale > 100 $, 2 mesi | 2005-08 | 112.5 | -2% | -3.6% | 6.8% | no |
| R3 WTI reale > 100 $, 2 mesi | 2007-04 | 105.16 | -0.9% | -14.1% | -6.5% | sì |
| R3 WTI reale > 100 $, 2 mesi | 2009-07 | 100.7 | -24.3% | -0.8% | 11.6% | no |
| R3 WTI reale > 100 $, 2 mesi | 2022-02 | 109.46 | -8.8% | -18.2% | -9.2% | no |
| R3 WTI reale > 100 $, 2 mesi | 2026-05 | 103.69 | 0% | — | — | — |
| R3 Brent > 100 $, 2 mesi | 2008-04 | 109.07 | -11.5% | -51.2% | -37% | sì |
| R3 Brent > 100 $, 2 mesi | 2011-03 | 114.64 | -1.3% | -17.1% | 6.2% | no |
| R3 Brent > 100 $, 2 mesi | 2022-04 | 104.58 | -13.9% | -13.4% | 0.9% | no |
| R3 Brent > 100 $, 2 mesi | 2026-04 | 117.29 | 0% | — | — | — |

#### Episodi

| Episodio | Petrolio (min → max nel periodo) | Primi segnali | Cali S&P ≥20% (massimo da 12 m prima) | Recessione | Esito del primo segnale |
|---|---|---|---|---|---|
| 1973-74 | WTI 3.56 (1973-01) → 11.16 (1974-10) | R1 WTI L12 X0: 1973-08, 1974-10; R1 WTI L36 X0: 1973-08, 1974-10; R1 WTI real L36 X0: 1973-08, 1974-10; R1 WTI L12 X20: 1973-08; R2 WTI Y50: 1974-01; R2 WTI Y100: 1974-01 | 1973-01-11→1974-10-03 -48.2% | 1973-12 | 1973-08: calo max -32.9%, rend. -30.8%, recessione sì |
| 1979-80 | WTI 14.85 (1978-07) → 39.5 (1980-04) | R1 WTI L12 X0: 1979-02; R1 WTI L36 X0: 1979-02; R1 WTI real L36 X0: 1979-05; R1 WTI L12 X20: 1979-08; R2 WTI Y50: 1979-08; R2 WTI Y100: 1979-11; R3 WTI real S100 K2: 1979-08 | 1980-11-28→1982-08-12 -27.1% | 1980-02, 1981-08 | 1979-02: calo max 0%, rend. 18.1%, recessione sì |
| 1990 | WTI 16.87 (1990-06) → 35.92 (1990-10); Brent max 36.02 (1990-10) | R1 WTI L12 X0: 1990-08; R1 WTI L36 X0: 1990-01, 1990-08; R1 WTI real L36 X0: 1990-08; R1 WTI L12 X20: 1990-08; R2 WTI Y50: 1990-09 | nessuno | 1990-08 | 1990-01: calo max -10.2%, rend. 4.5%, recessione sì |
| 2000 | WTI 12.01 (1999-02) → 34.4 (2000-11); Brent max 33.14 (2000-09) | R1 WTI L12 X0: 1999-04; R1 WTI L36 X0: 1999-12; R1 WTI real L36 X0: 2000-01; R2 WTI Y50: 1999-08; R2 WTI Y100: 1999-12 | 2000-03-24→2001-09-21 -36.8% | 2001-04 | 1999-04: calo max -6.6%, rend. 8.8%, recessione no |
| 2005-08 | WTI 34.27 (2004-01) → 133.93 (2008-06); Brent max 132.72 (2008-07) | R1 WTI L12 X0: 2004-03, 2006-04, 2007-09; R1 WTI L36 X0: 2004-03, 2006-04, 2007-09; R1 WTI real L36 X0: 2004-03, 2006-04, 2007-09; R2 WTI Y50: 2004-09, 2007-11; R3 WTI S100 K2: 2008-04; R3 WTI real S100 K2: 2005-08, 2007-04; R3 Brent S100 K2: 2008-04; R3 Brent real S100 K2: 2005-08, 2007-04 | 2007-10-09→2008-11-20 -51.9% | 2008-01 | 2004-03: calo max -5.6%, rend. 4.8%, recessione no |
| 2011 | WTI 75.31 (2010-09) → 110.04 (2011-04); Brent max 123.26 (2011-04) | R1 WTI L12 X0: 2010-12; R3 WTI S100 K2: 2011-04; R3 Brent S100 K2: 2011-03 | nessuno | nessuna | 2010-12: calo max -12.6%, rend. 0%, recessione no |
| 2021-22 | WTI 52 (2021-01) → 114.84 (2022-06); Brent max 122.71 (2022-06) | R1 WTI L12 X0: 2021-02; R1 WTI L36 X0: 2021-06; R1 WTI real L36 X0: 2021-10; R2 WTI Y50: 2021-03; R2 WTI Y100: 2021-03; R3 WTI S100 K2: 2022-04; R3 WTI real S100 K2: 2022-02; R3 Brent S100 K2: 2022-04; R3 Brent real S100 K2: 2022-02 | 2020-02-19→2020-03-23 -33.9%; 2022-01-03→2022-10-12 -25.4% | nessuna | 2021-02: calo max -1.1%, rend. 14.8%, recessione no |
| 2026 | WTI 57.97 (2025-12) → 102.13 (2026-05); Brent max 123.93 (2026-10) | R1 WTI L12 X0: 2026-03; R1 WTI L36 X0: 2026-03; R1 WTI real L36 X0: 2026-04; R1 WTI L12 X20: 2026-03; R2 WTI Y50: 2026-04; R3 WTI S100 K2: 2026-05; R3 WTI real S100 K2: 2026-05; R3 Brent S100 K2: 2026-04; R3 Brent real S100 K2: 2026-04 | nessuno | nessuna | — |

#### Adesso

- brent_giornaliero_FRED_da_ottobre: massimo 135.51 il 2026-10-02; ultimo 107.03 il 2026-11-03 (-21%); minimo dopo il massimo 107.03 il 2026-11-03 (-21%)
- wti_giornaliero_FRED_da_ottobre: massimo 110.01 il 2026-10-19; ultimo 99.64 il 2026-11-03 (-9.4%); minimo dopo il massimo 99.64 il 2026-11-03 (-9.4%)
- brent_Yahoo_BZF_da_ottobre: massimo 117.64 il 2026-10-30; ultimo 92.23 il 2026-11-12 (-21.6%); minimo dopo il massimo 91.49 il 2026-11-10 (-22.2%)
- wti_Yahoo_CLF_da_ottobre: massimo 104.12 il 2026-10-30; ultimo 85.93 il 2026-11-12 (-17.5%); minimo dopo il massimo 85.93 il 2026-11-12 (-17.5%)
- sp500_2026: massimo 7818.93 il 2026-10-06; ultimo 7619.38 il 2026-11-11 (-2.6%); minimo dopo il massimo 7353.73 il 2026-11-05 (-5.9%)
- sp500_da_fine_ottobre: massimo 7757.17 il 2026-10-21; ultimo 7619.38 il 2026-11-11 (-1.8%); minimo dopo il massimo 7353.73 il 2026-11-05 (-5.2%)
- mensile (nominale, reale in $ di 2026-10): {"WTI": [["2026-03", 91.38, 94.18], ["2026-04", 100.32, 102.5], ["2026-05", 102.13, 103.69], ["2026-06", 84.81, 85.7], ["2026-07", 80.46, 81.65], ["2026-08", 83.9, 85.08], ["2026-09", 97.31, 98.28], ["2026-10", 102.07, 102.43]], "Brent": [["2026-03", 103.13, 106.28], ["2026-04", 117.29, 119.84], ["2026-05", 107.14, 108.77], ["2026-06", 85.4, 86.29], ["2026-07", 83.76, 85], ["2026-08", 91.08, 92.36], ["2026-09", 114.16, 115.3], ["2026-10", 123.93, 124.36]]}
- soglia 100 $ di oggi espressa in $ dell'epoca: {'1974-01': 13.72, '1980-01': 22.79, '1990-10': 39.26, '2008-06': 63.77, '2022-06': 86.32} ; massimo reale storico: {'WTI_real': ['2008-06', 210.02], 'Brent_real': ['2008-06', 207.5]}

#### Controlli dei dati

- cpi_mesi_mancanti: ["2025-10"]
- copertura: {"WTISPLC": {"first": "1946-01", "last": "2026-10", "n": 970, "buchi": 0}, "MCOILBRENTEU": {"first": "1987-05", "last": "2026-10", "n": 474, "buchi": 0}, "MCOILWTICO": {"first": "1986-01", "last": "2026-10", "n": 490}, "CPIAUCSL": {"first": "1947-01", "last": "2026-10", "n": 957, "buchi": 1}, "USREC": {"first": "1854-12", "last": "2026-10", "n": 2063}, "DCOILWTICO": {"first": "1986-01-02", "last": "2026-11-03", "n": 9537}, "DCOILBRENTEU": {"first": "1987-05-20", "last": "2026-11-03", "n": 9122}, "GSPC_yahoo": {"first": "1945-01-02", "last": "2026-11-11", "n": 20585}, "CLF_yahoo": {"first": "2000-08-23", "last": "2026-11-12", "n": 6585}, "BZF_yahoo": {"first": "2007-07-30", "last": "2026-11-12", "n": 4803}}
- WTISPLC_vs_MCOILWTICO: {"mesi": 490, "mediana_pct": 0.04, "max_pct": 1.22, "mese_max": "2001-09", "sotto_1pct": 483}
- MCOILWTICO_vs_media_DCOILWTICO: {"mesi": 490, "mediana_pct": 0.01, "max_pct": 3.72, "mese_max": "1999-03", "sotto_1pct": 478}
- MCOILBRENTEU_vs_media_DCOILBRENTEU: {"mesi": 474, "mediana_pct": 0.01, "max_pct": 5.81, "mese_max": "2001-09", "sotto_1pct": 451}
- WTI_FRED_vs_media_Yahoo_CLF: {"mesi": 315, "mediana_pct": 0.12, "max_pct": 14.76, "mese_max": "2020-04", "sotto_1pct": 284}
- Brent_FRED_vs_media_Yahoo_BZF: {"mesi": 232, "mediana_pct": 1, "max_pct": 30.98, "mese_max": "2020-04", "sotto_1pct": 117}
- GSPC_yahoo_vs_vix_json: {"sedute_comuni": 9283, "mancanti_in_yahoo": 0, "max_diff_pct": 0, "data_max": "1995-06-14", "vix_json": {"first": "1990-01-02", "last": "2026-11-10"}}
- GSPC_yahoo_vs_FRED_SP500: {"sedute_comuni": 2512, "mancanti_in_yahoo": 0, "max_diff_pct": 0.119, "data_max": "2021-08-11"}
- GSPC_variazioni_giornaliere_oltre_12pct: [["1987-10-19", -20.5]]
