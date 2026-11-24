# Credito: la soglia dei 350 punti base (verifica)

12/11/2026, ramo `claude/great-noether-2f1ude`. Solo ricerca: l'app non è stata toccata.
Dati: S&P 500, VIX e HYG/IEF da `data/vix.json` (fino al 10/11/2026); HY OAS fino al 09/11/2026.

Tutti i numeri escono da `script/backtest.mjs`, che scrive `risultati.json` e usa le funzioni dell'app (`js/vix.js`: `vxSeries`, `align`, `onDates`, `context`, `quantile`, `crisisOf`).
`script/verifica.py` rifà i conti da zero senza importare `js/vix.js`. Risultato: **644 controlli, 0 differenze** (`verifica.json`). I controlli coprono i segnali di tutte le 24 regole, i criteri (a) e (b), i sottoperiodi, gli eventi, gli esiti dei 7 segnali dei 350 pb, la tabella delle crisi e la mappa tra le due serie.

```
node ricerca/credito-soglia/script/scarica.mjs        # HY OAS in cache/ (esclusa da git)
node ricerca/credito-soglia/script/backtest.mjs       # → risultati.json
python3 -I ricerca/credito-soglia/script/verifica.py  # ricalcolo indipendente → verifica.json
```

## In breve

- **I 350 pb non sono un segnale affidabile per l'S&P 500.** Dal 1997 lo spread ha superato 350 pb, dopo almeno 63 sedute sotto, solo **7 volte**. In 4 casi su 7 è seguito un calo di almeno il 10% entro 6 mesi, contro il 26,7% di tutte le sedute. Però:
  - lo spread è stato sopra 350 nel **74%** delle sedute;
  - tra il 24/07/2007 e il 26/11/2021 non c'è stato **nessun segnale nuovo**;
  - dei 27 cali dell'S&P 500 di almeno il 10%, solo **6** hanno avuto un segnale nuovo in tempo; dei 6 cali di almeno il 20%, solo **2**.
- **Sul nostro HYG/IEF non c'è una soglia equivalente.** Le due serie si muovono quasi insieme: la correlazione è −0,90 sui livelli e −0,89 sulle variazioni a 21 sedute. Però i 350 pb non corrispondono a un calo fisso di HYG/IEF: −1,3% in mediana a tutti gli attraversamenti, da −3,0 a −4,2% ai 3 segnali dal 2008. Nessuna soglia da −3% a −10%, e nessun percentile, supera il criterio.
- **Verdetto: resta contesto.** Non si aggiunge un segnale e non si aggiunge una linea dei «350 pb» al grafico di HYG/IEF.

## Domanda e criterio (decisi prima dei numeri)

**Idea.** Un analista (Francesco Caruso) indica i 350 pb dello spread high yield come «segnale affidabile che qualcosa scricchiola». Si verificano due cose:

1. Sull'HY OAS ufficiale (ICE BofA US High Yield, FRED `BAMLH0A0HYM2`): il superamento di 350 pb, o di 300, 400 e 500, o un aumento di X pb in N sedute, anticipa i cali dell'S&P 500?
2. Sul rapporto HYG/IEF dell'app esiste una soglia che si comporta come i 350 pb? La soglia può essere sul calo dal massimo di 252 sedute o sul suo percentile, calcolato sulla storia fino a quel giorno.

**Regola esatta.** Il segnale è la prima seduta in cui la condizione è vera dopo almeno **63 osservazioni valide** con la condizione falsa, come negli episodi del VIX dell'app. «Supera» vuol dire ≥, come nell'app. Gli esiti partono dalla **chiusura della seduta dopo il segnale**, perché la serie si conosce a fine giornata.

**Esiti.**
- Calo massimo dell'S&P 500 entro 63, 126 e 252 sedute.
- Rendimenti a 21, 63, 126 e 252 sedute.
- VIX massimo nelle 126 sedute.
- Base: tutte le sedute dello stesso periodo, con lo stesso ingresso.

**Eventi.** Sono i cali dell'S&P 500 sulle chiusure, trovati con uno zigzag con soglia θ (10% o 20%). Un massimo è confermato quando l'indice scende di θ, un minimo quando risale di θ. Così dal 1997 ci sono **27 cali ≥ 10%** e **6 ≥ 20%**.
- I 6 cali ≥ 20%: 2000-01, 2002, 2007-08, inizio 2009, 2020 e 2022.
- Il 2018 (−19,8%) e il 2025 (−18,9%) restano sotto il 20%.

Per ogni evento si cerca il **segnale nuovo**: il primo segnale tra 126 sedute prima del massimo e il giorno prima del minimo. Si misurano:
- l'**anticipo**, in sedute dal massimo (negativo = prima del massimo);
- la **quota del calo già avvenuta** all'ingresso: 0 se l'ingresso è prima del massimo.

**Criterio di successo.**
- (a) La quota di segnali seguiti da un calo ulteriore ≥ 10% entro 6 mesi (126 sedute) supera quella della base di almeno **15 punti**.
- (b) La mediana della quota già avvenuta è **sotto il 50%**, sia sui cali ≥ 10% sia su quelli ≥ 20%. Un evento senza segnale nuovo prima del minimo conta 100%: l'avviso non è arrivato in tempo.
- (c) Il risultato regge:
  - (a) e (b) valgono anche alle soglie vicine: per i 350 pb sono 300 e 400; per HYG/IEF le soglie adiacenti nell'elenco;
  - (a) vale in ciascun sottoperiodo con almeno 3 segnali. Per l'HY i sottoperiodi sono 1997-2009 e 2010-oggi; per HYG/IEF 2008-2016 e 2017-oggi.

Con meno di 8 segnali il risultato è «indicativo».

**Soglia di HYG/IEF «equivalente».** È scelta senza guardare gli esiti: la soglia dell'elenco più vicina alla mediana del calo di HYG/IEF negli attraversamenti dei 350 pb dal 2008.

**Aggiunte mie, decise prima dei numeri.**
- «HY sopra il minimo di 252 sedute di almeno X pb», che è lo stesso tipo di misura del calo dal massimo di HYG/IEF.
- Il percentile del livello dell'HY.

**Aggiunte dopo il primo calcolo, solo descrittive.**
- La mediana (b) contando come avviso anche l'allarme già acceso al massimo.
- La tenuta alle soglie vicine di due varianti che passano (a) e (b).
- La probabilità binomiale.
- Le sedute in allarme contro quelle fuori allarme.

## Dati

**HY OAS.** Da aprile 2026 FRED pubblica solo gli ultimi 3 anni (oggi dal 13/11/2023) e ALFRED è tagliato allo stesso modo (`ricerca/vix/struttura/dati/dati.md`).
- La storia dal 31/12/1996 viene da **8 copie del CSV di FRED** salvate negli anni in repository pubblici di GitHub. Le copie finiscono tra il 19/08/2016 e il 17/03/2026; l'elenco è in `script/scarica.mjs`.
- **Tutte le copie coincidono tra loro e con FRED di oggi in ogni data comune: 0 differenze.** La copia del 2016 e quella del 2026 hanno 5.126 date in comune.
- La serie usata è FRED dove c'è, altrimenti la copia più lunga. Va dal 31/12/1996 al 09/11/2026.
- Sedute dell'S&P 500 senza valore dal 1997: **30/08/2013 e 16/01/2015**, più il 10/11/2026, che FRED non ha ancora pubblicato. Restano senza valore.
- **Licenza ICE**: la serie non si può ripubblicare. Resta in `cache/` (esclusa da git) e nei risultati non c'è nessun livello dello spread: solo date, variazioni, correlazioni ed esiti dell'S&P 500.

**HYG/IEF.** È la serie dell'app (Yahoo, chiusure rettificate). Parte l'11/04/2007; il calo dal massimo c'è dal 09/04/2008 e il suo percentile dal 07/04/2009.

## 1. HY OAS: i 350 pb e le varianti (1997-2026)

Le colonne della tabella:
- **calo ≥10% in 6 mesi**: segnali seguiti da un calo ulteriore ≥ 10% entro 126 sedute, contro la stessa quota per tutte le sedute (base).
- **p**: probabilità di fare almeno così per caso se ogni segnale avesse la quota della base. È solo indicativa.
- **in allarme**: quota di sedute con la condizione vera.
- **eventi**: segnali nuovi in tempo / eventi, con la mediana della quota del calo già avvenuta.

| Regola | Segnali | Calo ≥10% in 6 mesi | Base | Diff. | p | In allarme | Eventi ≥10% | Eventi ≥20% | (a) | (b) |
|---|---|---|---|---|---|---|---|---|---|---|
| HY ≥ 300 pb | 5 (4 con 6 mesi) | 2/4 (50%) | 26,7% | +23,3 | 0,29 | 89,0% | 4/27, 100% | 1/6, 100% | sì | no |
| **HY ≥ 350 pb** | **7** | **4/7 (57,1%)** | 26,7% | **+30,4** | 0,09 | **74,2%** | **6/27, 100%** | **2/6, 100%** | **sì** | **no** |
| HY ≥ 400 pb | 8 | 4/8 (50%) | 26,7% | +23,3 | 0,14 | 60,2% | 9/27, 100% | 2/6, 100% | sì | no |
| HY ≥ 500 pb | 10 | 3/10 (30%) | 26,7% | +3,3 | 0,53 | 39,3% | 9/27, 100% | 3/6, 96% | no | no |
| sale ≥ 50 pb in 21 sedute | 24 (23) | 9/23 (39,1%) | 26,8% | +12,3 | 0,14 | 13,7% | 18/27, 19% | 5/6, 0% | no | sì |
| sale ≥ 100 pb in 21 | 18 | 7/18 (38,9%) | 26,8% | +12,1 | 0,18 | 5,1% | 19/27, 29% | 5/6, 29% | no | sì |
| sale ≥ 150 pb in 21 | 10 | 4/10 (40%) | 26,8% | +13,2 | 0,27 | 2,4% | 16/27, 92% | 6/6, 36% | no | no |
| sale ≥ 50 pb in 63 | 25 (24) | 9/24 (37,5%) | 27,0% | +10,5 | 0,18 | 20,8% | 20/27, 35% | 5/6, 12% | no | sì |
| sale ≥ 100 pb in 63 | 18 | 9/18 (50%) | 27,0% | +23,0 | 0,03 | 12,6% | 23/27, 18% | 6/6, 3% | sì | sì |
| sale ≥ 150 pb in 63 | 14 | 5/14 (35,7%) | 27,0% | +8,7 | 0,32 | 8,1% | 19/27, 56% | 6/6, 12% | no | no |
| ≥ 100 pb sopra il minimo di 252 sedute | 13 | 7/13 (53,8%) | 27,4% | +26,4 | 0,04 | 38,6% | 16/26, 44% | 5/6, 37% | sì | sì |
| ≥ 150 pb sopra il minimo | 13 | 4/13 (30,8%) | 27,4% | +3,4 | 0,50 | 28,5% | 14/26, 83% | 5/6, 38% | no | no |
| ≥ 200 pb sopra il minimo | 11 | 4/11 (36,4%) | 27,4% | +9,0 | 0,36 | 19,2% | 14/26, 100% | 5/6, 52% | no | no |
| percentile del livello ≥ 80 | 7 | 2/7 (28,6%) | 27,4% | +1,2 | 0,61 | 18,3% | 11/26, 100% | 4/6, 48% | no | no |
| percentile del livello ≥ 90 | 7 | 5/7 (71,4%) | 27,4% | +44,0 | 0,02 | 12,7% | 13/26, 96% | 5/6, 42% | sì | no |

I segnali senza 6 mesi completi non entrano nella quota. Le regole sul minimo di 252 sedute e sul percentile partono dal 31/03/1998, quindi hanno 26 eventi ≥ 10%.

### I 7 segnali dei 350 pb

L'S&P 500 al segnale è misurato dal massimo delle 252 sedute prima. Gli esiti partono dalla chiusura del giorno dopo.

| Segnale | Crisi | S&P 500 al segnale | 3 mesi | 12 mesi | Calo entro 6 mesi | Calo entro 12 mesi | VIX massimo in 6 mesi | Calo ≥ 10%? |
|---|---|---|---|---|---|---|---|---|
| 05/08/1998 | 1998 Russia/LTCM | −8,9% | +2,7% | +19,3% | −12,1% | −12,1% | 45,7 | sì |
| 31/03/2005 | — | −3,6% | +1,6% | +10,4% | −3,0% | −3,0% | 17,7 | no |
| 22/09/2006 | — | −0,8% | +6,4% | +15,0% | 0,0% | 0,0% | 19,6 | no |
| 24/07/2007 | 2007-09 | −2,7% | +0,1% | −17,5% | −13,7% | −20,0% | 31,1 | sì |
| 26/11/2021 | (prima del 2022) | −2,3% | −7,5% | −15,0% | −16,2% | −23,2% | 36,5 | sì |
| 02/08/2024 | 2024 carry yen | −5,7% | +10,5% | +22,2% | 0,0% | −3,9% | 38,6 | no |
| 31/03/2025 | 2025 dazi | −8,7% | +10,6% | +16,9% | −11,5% | −11,5% | 52,3 | sì |

**Esiti medi contro la base (1997-2026).** Ogni cella è la mediana, con la quota di positivi tra parentesi.

| | 1 mese | 3 mesi | 6 mesi | 12 mesi | calo entro 3 / 6 / 12 mesi | VIX max in 6 mesi |
|---|---|---|---|---|---|---|
| 350 pb (7 segnali) | −0,5% (3/7) | +2,7% (6/7) | +6,9% (5/7) | +15,0% (5/7) | −7,3 / −11,5 / −11,5 | 36,5 |
| tutte le sedute | +1,3% (63,8%) | +3,3% (68,3%) | +5,7% (72,2%) | +11,7% (77,4%) | −3,3 / −4,5 / −6,1 | 30,7 |

- Dopo il segnale il calo è più profondo che in una seduta qualsiasi.
- Nessuno dei 7 segnali è seguito da un calo ≥ 20% entro 6 mesi; nella base succede nel 7,9% dei casi.
- Entro 12 mesi il calo ≥ 10% arriva in 4 casi su 7 (57,1%), contro il 37,3% della base.
- I rendimenti a 6 e 12 mesi non sono peggiori della base.

### Perché i 350 pb «mancano» quasi tutte le crisi

Il criterio guarda il **segnale nuovo**, cioè l'attraversamento dal basso dopo un periodo calmo. Con i 350 pb succede raramente:

- **Lo spread era già sopra 350 da molto tempo.** Nell'anno prima del massimo dell'S&P 500 era sopra:
  - in 252 sedute su 252 nel 2000, nel 2010 e nel 2011;
  - in 234 su 252 nel 2015;
  - in 243 su 252 nel 2020.
- **Tra il 24/07/2007 e il 26/11/2021 non c'è nessun segnale nuovo:** in quegli anni lo spread non è mai rimasto sotto 350 per 63 sedute di fila.
- **Nel 2018 lo spread è salito sopra 350 il 10/10/2018, dopo il massimo dell'S&P 500.** Però era già stato sopra in 13 delle 63 sedute prima: è rimasto «a cavallo» della soglia e non c'è segnale nuovo.
- **Lo spread passa spesso sopra e sotto la soglia.** Dal 1997 gli attraversamenti dal basso sono stati 45, ma solo 7 dopo 63 sedute sotto. Alle altre soglie: 300 pb 23 e 5; 400 pb 61 e 8; 500 pb 45 e 10.

Contando come avviso anche l'allarme già acceso al massimo, la mediana (b) scende a 0% (variante descrittiva). Ma un allarme acceso nel 74% delle sedute non distingue niente:
- le sedute sopra 350 pb sono seguite da un calo ≥ 10% entro 6 mesi nel **28,7%** dei casi (5.526 sedute);
- quelle sotto, nel **20,7%** (1.921 sedute).

### Crisi per crisi

Il calo considerato va dal massimo più alto al minimo più basso tra i cali ≥ 10% con l'etichetta della crisi. Ogni cella dà la data del segnale nuovo, le sedute dal massimo e la quota del calo già avvenuta.
- «sopra»: nessun segnale nuovo e spread già sopra la soglia al massimo dell'S&P 500.
- «—»: nessun segnale nuovo e spread sotto la soglia al massimo.

| Crisi | Calo S&P 500 | 350 pb | 400 pb | 500 pb | sale ≥ 100 pb in 63 sedute | ≥ 100 pb sopra il minimo |
|---|---|---|---|---|---|---|
| 1998 Russia/LTCM (17/07 → 31/08/1998) | −19,3% | 05/08/1998 (+13; 42%) | 21/08/1998 (+25; 43%) | — | 21/08/1998 (+25; 43%) | 04/08/1998 (+12; 46%) |
| 2000-02 bolla (24/03/2000 → 09/10/2002) | −49,1% | sopra | sopra | sopra | 30/03/2000 (+4; 4%) | 29/03/2000 (+3; 5%) |
| 2007-09 (09/10/2007 → 09/03/2009) | −56,8% | **24/07/2007 (−54; 0%)** | 26/07/2007 (−52; 0%) | 09/11/2007 (+23; 14%) | 25/07/2007 (−53; 0%) | 23/07/2007 (−55; 0%) |
| 2010 (23/04 → 02/07/2010) | −16,0% | sopra | sopra | sopra | 08/06/2010 (+31; 83%) | 12/02/2010 (−48; 0%) |
| 2011 (29/04 → 03/10/2011) | −19,4% | sopra | sopra | — | 24/06/2011 (+39; 32%) | 16/06/2011 (+33; 35%) |
| 2015-16 (21/05/2015 → 11/02/2016) | −14,2% | sopra | sopra | 30/06/2015 (+27; 18%) | 10/08/2015 (+55; 16%) | sopra |
| 2018 (20/09 → 24/12/2018) | −19,8% | — (a cavallo) | 15/11/2018 (+40; 34%) | 20/12/2018 (+63; 89%) | 07/12/2018 (+54; 51%) | 16/11/2018 (+41; 41%) |
| 2020 Covid (19/02 → 23/03/2020) | −33,9% | sopra | — | 28/02/2020 (+7; 26%) | 06/03/2020 (+12; 56%) | 27/02/2020 (+6; 38%) |
| 2022 (03/01 → 12/10/2022) | −25,4% | **26/11/2021 (−25; 0%)** | 07/03/2022 (+43; 51%) | 16/06/2022 (+114; 92%) | 11/05/2022 (+89; 71%) | 07/03/2022 (+43; 51%) |
| 2025 dazi (19/02 → 08/04/2025) | −18,9% | 31/03/2025 (+28; 44%) | 03/04/2025 (+31; 92%) | — | 03/04/2025 (+31; 92%) | 03/04/2025 (+31; 92%) |

**Quando i 350 pb danno un segnale nuovo, di solito arriva in tempo.** È successo in 4 crisi:
- **2007**: 54 sedute prima del massimo;
- **2022**: 25 sedute prima del massimo;
- **1998 e 2025**: con meno di metà del calo già fatto (42% e 44%).

Il credito qui non è solo coincidente. Ma succede in 4 crisi su 10, e i 3 segnali «a vuoto» (2005, 2006, 2024) sono quasi metà del totale.

### Verdetto sui 350 pb: non passa (indicativo, 7 segnali)

- **(a) passa.** 4 su 7 contro il 26,7%, cioè +30,4 punti. Passa anche nei due sottoperiodi:
  - 1997-2009: 2 su 4 contro il 33,2% (+16,8);
  - 2010-oggi: 2 su 3 contro il 21,7% (+45,0).

  Però con 7 casi una quota così si otterrebbe per caso con una probabilità di circa 9% (0,087).
- **(b) non passa.** Solo 6 dei 27 cali ≥ 10% e 2 dei 6 cali ≥ 20% hanno un segnale nuovo in tempo; la mediana è 100%.
- **(c) non passa.** A 300 e 400 pb la (b) fallisce allo stesso modo. A 500 pb fallisce anche la (a): 3 su 10, +3,3 punti.

**Due varianti passano (a) e (b), ma non reggono alle soglie vicine.** L'ho controllato dopo averle viste, quindi è solo descrittivo.
- **«Sale di almeno 100 pb in 63 sedute»** (18 segnali, 9 seguiti da un calo ≥ 10%). Le vicine non passano la (a):
  - 50 pb: +10,5;
  - 150 pb: +8,7;
  - 100 pb in 21 sedute: +12,1.
- **«Almeno 100 pb sopra il minimo di 12 mesi»** (13 segnali, 7 seguiti da un calo ≥ 10%). A 150 pb scende a +3,4.

Nei due sottoperiodi tengono:
- sale di 100 pb in 63 sedute: 1997-2009 5 su 8, +28,6; dal 2010 4 su 10, +18,3;
- 100 pb sopra il minimo: 1997-2009 3 su 5, +24,5; dal 2010 4 su 8, +28,3.

Sono le misure più vicine a HYG/IEF (variazione e distanza dal minimo, non livello). Ma il loro equivalente su HYG/IEF (circa −5%, vedi sotto) non passa la (a).

## 2. HYG/IEF: c'è una soglia «come i 350 pb»?

### Le due serie a confronto (sedute dal 09/04/2008)

| Misura | Correlazione | 2008-2016 | 2017-oggi |
|---|---|---|---|
| livello dell'HY e calo di HYG/IEF dal massimo di 252 sedute | **−0,904** (4.675 sedute) | −0,915 | −0,853 |
| HY sopra il suo minimo di 252 sedute e calo di HYG/IEF | **−0,946** | −0,962 | −0,873 |
| variazione a 21 sedute (pb contro %) | −0,892 (4.905) | −0,889 | −0,899 |
| percentile dell'HY e percentile del calo | +0,46 (4.424) | | |

Le due serie raccontano la stessa cosa giorno per giorno. Ma **misurano cose diverse**:
- i 350 pb sono un **livello assoluto** dello spread;
- HYG/IEF dice **quanto il credito è peggiorato rispetto all'ultimo anno**.

Per questo i 350 pb non hanno un corrispettivo fisso:

| HY OAS | Calo di HYG/IEF quando l'HY attraversa la soglia dal basso (mediana, quartili) | Calo di HYG/IEF ai segnali dal 2008 | Sedute con l'HY sopra la soglia (dal 2008) | Calo di HYG/IEF con la stessa quota di sedute |
|---|---|---|---|---|
| 300 pb | −2,4% (−3,0 / −1,8), 10 volte | 10/03/2025 −3,2; 28/09/2026 −0,3 | 92,2% | −0,1% |
| **350 pb** | **−1,3% (−1,9 / −0,8), 35 volte** | **26/11/2021 −3,0; 02/08/2024 −4,2; 31/03/2025 −3,9** | **77,3%** | **−0,6%** |
| 400 pb | −3,2% (−4,8 / −0,8), 45 volte | da −2,4 a −5,9 (5 segnali) | 60,4% | −1,5% |
| 500 pb | −5,2% (−7,1 / −2,0), 35 volte | da −3,0 a −9,0 (7 segnali) | 36,7% | −4,4% |

La misura dell'HY davvero simile a HYG/IEF è «quanti pb sopra il minimo di 12 mesi». Con l'HY a 100 ± 10 pb sopra il suo minimo, HYG/IEF è in mediana a **−5,1%** dal massimo (quartili −7,0 / −3,7; 226 sedute); a 150 pb è a −7,5% e a 200 pb a −8,2%.

**Soglia equivalente scelta prima: −3%.** È la soglia dell'elenco più vicina alla mediana di −1,3%. Con la mediana dei 3 segnali dal 2008 (−3,9%) sarebbe −4%: la tabella le riporta tutte e due.

### Le soglie di HYG/IEF (dal 2008)

La base è 2008-2026 (eventi con il massimo o il minimo dopo il 09/07/2008, prima seduta in cui un segnale è possibile). I percentili partono dal 08/07/2009.

| Regola | Segnali | Calo ≥10% in 6 mesi | Base | Diff. | p | In allarme | Eventi ≥10% | Eventi ≥20% | (a) | (b) |
|---|---|---|---|---|---|---|---|---|---|---|
| **≤ −3% dal massimo** | 11 (10) | 4/10 (40%) | 23,4% | +16,6 | 0,19 | 43,0% | 5/16, 100% | 1/4, 100% | sì | no |
| ≤ −4% | 8 | 3/8 (37,5%) | 23,4% | +14,1 | 0,28 | 37,9% | 8/16, 98% | 1/4, 100% | no | no |
| ≤ −5% | 9 | 2/9 (22,2%) | 23,4% | −1,2 | 0,66 | 33,1% | 7/16, 100% | 1/4, 100% | no | no |
| ≤ −6% | 9 | 2/9 (22,2%) | 23,4% | −1,2 | 0,66 | 28,4% | 7/16, 100% | 2/4, 92% | no | no |
| ≤ −8% | 7 | 3/7 (42,9%) | 23,4% | +19,5 | 0,21 | 20,6% | 6/16, 100% | 1/4, 100% | sì | no |
| ≤ −10% | 5 | 1/5 (20%) | 23,4% | −3,4 | 0,74 | 14,7% | 5/16, 100% | 1/4, 100% | no | no |
| percentile del calo ≥ 80 | 3 | 1/3 | 21,1% | +12,2 | 0,51 | 3,9% | 3/12, 100% | 1/2, 68% | no | no |
| percentile ≥ 90 | 2 | 1/2 | 21,1% | +28,9 | 0,38 | 1,2% | 2/12, 100% | 1/2, 72% | sì | no |
| percentile ≥ 95 | 1 | 0/1 | 21,1% | −21,1 | 1,00 | 0,1% | 1/12, 100% | 1/2, 100% | no | no |

**Esiti a −3% contro la base (2008-2026).** Le cifre sono mediane.
- Rendimenti a 1, 3, 6 e 12 mesi: +2,5 / +3,7 / +7,6 / +14,2%, contro +1,5 / +3,9 / +7,1 / +14,0%.
- Calo entro 3, 6 e 12 mesi: −2,5 / −4,0 / −8,5, contro −3,0 / −3,9 / −5,6.
- VIX massimo in 6 mesi: 33,6 contro 29,4.

**Verdetto sulla soglia equivalente (−3%): non passa.**
- (a) passa di poco: +16,6, 4 su 10.
- (b) non passa: 5 eventi su 16, mediana 100%.
- (c) non passa:
  - a −4% la (a) scende a +14,1;
  - nel 2008-2016 il segnale fa 1 su 3, +10,1 contro la base;
  - nel 2017-oggi fa 3 su 7, +19,3.

Nessuna soglia di HYG/IEF passa la (b). Come per i 350 pb, il calo resta oltre la soglia per lunghi tratti: −3% nel 43% delle sedute, −5% nel 33%.

**Crisi, HYG/IEF.** Stesso formato della tabella precedente. Per il 2007-09 e il 1998-2002 la serie non c'era ancora.

| Crisi | −3% | −4% | −5% | −8% |
|---|---|---|---|---|
| 2010 | — | 21/01/2010 (−64; 0%) | 22/01/2010 (−63; 0%) | 20/05/2010 (+19; 67%) |
| 2011 | 10/03/2011 (−35; 0%) | 15/03/2011 (−32; 0%) | 16/03/2011 (−31; 0%) | 16/06/2011 (+33; 35%) |
| 2015-16 | sotto | sotto | sotto | 10/12/2014 (−111; 0%) |
| 2018 | 29/10/2018 (+27; 43%) | 19/11/2018 (+42; 50%) | 06/12/2018 (+53; 51%) | 20/12/2018 (+63; 89%) |
| 2020 | sotto | — | — | 27/02/2020 (+6; 38%) |
| 2022 | 19/07/2021 (−117; 0%) | 04/03/2022 (+42; 49%) | 18/05/2022 (+94; 74%) | — |
| 2025 | 03/03/2025 (+8; 32%) | 03/04/2025 (+31; 92%) | 03/04/2025 (+31; 92%) | — |

## Domanda secondaria: il rientro sotto la soglia come ingresso

Il rientro è la prima seduta con la condizione di nuovo falsa dopo almeno 21 sedute di fila con la condizione vera, dentro un episodio iniziato da un segnale. È solo descrittivo.

- **350 pb: 5 rientri.** Sono il 04/11/2004, il 14/07/2005, il 10/06/2014, il 29/03/2022 e il 12/05/2025.
  - A 12 mesi: +5,0% in mediana, 4 positivi su 5, contro +11,7% (77,4%) della base.
  - In 4 casi su 5 il minimo era già stato fatto.
  - Due rientri arrivano anni dopo il segnale (2004 per il segnale del 1998, 2014 per quello del 2007).
  - Il rientro del 29/03/2022 è stato seguito da un calo del 22,3%.
- **HYG/IEF −3%: 5 rientri.** A 12 mesi +13,4% (5 su 5) contro +14,0% (86,3%); minimo già fatto in 4 su 5.

Nessun vantaggio sulla base: come ingresso non serve.

## Oggi

- **HYG/IEF** al 10/11/2026: −2,3% dal massimo di 12 mesi, 50° percentile del calo. Ha superato −3% il 02/11/2026 (segnale) ed è tornato sopra.
- **HY OAS** al 09/11/2026: l'ultimo segnale dei 350 pb resta quello del 31/03/2025. A 300 pb c'è un segnale del 28/09/2026.

## Limiti

- **Fonte dell'HY OAS.** Sono copie del CSV di FRED salvate da terzi, non il file di ICE. Sono 8 copie scaricate in anni diversi e coincidono tutte, tra loro e con FRED di oggi. La licenza ne permette l'uso solo per ricerca.
- **Pochi casi.** I segnali dei 350 pb sono 7, quelli di HYG/IEF da 1 a 11. Gli eventi ≥ 20% sono 6 dal 1997 e 4 dal 2008. Le percentuali sono indicative e la probabilità binomiale tratta i segnali come indipendenti.
- **Eventi.** La definizione a zigzag è una scelta. Gli eventi ≥ 10% dentro una stessa crisi contano separatamente: per esempio, la crisi del 2000-02 conta 6 eventi.
- **Criterio (b).** Un calo che arriva con l'allarme acceso da più di 126 sedute conta come mancato. È la regola decisa prima: misura il segnale nuovo, non lo stato. La variante con l'allarme acceso è riportata, ma un allarme acceso 3 sedute su 4 non serve.
- **La base cambia con il periodo.** Dal 1997 contiene il 2000-02 e il 2008: un calo ≥ 10% entro 6 mesi segue il 26,7% delle sedute. Dal 2008 la quota è il 23,4%.
- **HYG/IEF.** Non copre il 2007 (il calo dal massimo parte ad aprile 2008, il percentile ad aprile 2009). Non è uno spread: HYG e IEF hanno durata e composizione diverse.
- **Livello dei 350 pb.** Il livello «normale» dello spread è cambiato nei decenni: prima del 2010 stava sopra 350 per la maggior parte del tempo. Una soglia fissa scelta oggi è «col senno di poi».
- **Orari.** FRED pubblica l'HY OAS la mattina dopo: l'ingresso alla chiusura del giorno dopo è il primo possibile.

## Verdetto

| Domanda | Esito | Verdetto |
|---|---|---|
| 350 pb sull'HY OAS (e 300, 400, 500) | (a) sì, ma con 7 segnali; (b) no: 6 cali ≥ 10% su 27 e 2 ≥ 20% su 6 con un segnale nuovo in tempo; spread sopra 350 nel 74% delle sedute | **non è un segnale affidabile**; quando arriva dopo un periodo calmo di solito arriva in tempo (2007, 2022), ma succede di rado |
| Soglia equivalente su HYG/IEF (−3%, −4%, …, percentile) | nessuna passa (b) né (c) | **resta contesto** |
| Linea «≈ 350 pb» sul grafico di HYG/IEF | i 350 pb corrispondono a cali di HYG/IEF tra −0,6% e −4,2% secondo come si misura | **sconsigliata**: darebbe una precisione che non c'è |
| Rientro sotto la soglia come ingresso | nessun vantaggio sulla base | **scarta** |

**Verdetto complessivo: resta contesto.** Il riquadro e il grafico del credito restano come sono.

**Cosa mostrerebbe l'app se l'utente volesse comunque procedere.** Va deciso con l'utente; io non lo consiglio.
- *Solo testo nella guida* (la più sicura): un paragrafo in «Struttura a termine e credito», con i numeri di `risultati.json`. Proposta:

  > «Alcuni analisti usano i 350 punti base dello spread high yield come soglia di allarme. Dal 1997 lo spread ha superato 350 dopo almeno tre mesi sotto solo 7 volte (4 seguite da un calo dell'S&P 500 di almeno il 10% entro 6 mesi), ma è stato sopra 350 nel 74% delle sedute e tra luglio 2007 e novembre 2021 non ha dato nessun segnale nuovo. Il rapporto HYG/IEF segue lo spread da vicino, ma non ha una soglia equivalente.»

  Fonte: questa ricerca. Per la licenza ICE nessun livello dello spread entra nell'app.
- *Linea di riferimento* (sconsigliata): una linea tratteggiata a −3% (o −4%) nel pannello «Credito high yield» della vista VIX, con la nota «indicativo: ai 3 segnali dei 350 pb dal 2008 HYG/IEF era tra −3,0% e −4,2%». Il riquadro direbbe «sotto la linea dal …». Non passa il criterio, quindi andrebbe detto nel tooltip.
