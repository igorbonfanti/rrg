# Avvicinamento «in risalita dopo l'Attenzione»

Ricerca del 31/10/2026, dati al 30/10/2026. Non modifica l'app. Numeri da `ricerca/avvicinamento-uso/script/risalita.mjs`, risultati in `risalita.json`.

## Domande e criteri (fissati prima)

La regola dell'avvicinamento (stato Normale e breadth sotto la soglia del giorno) misura la distanza dal livello blu, non la direzione. Dopo un minimo, mentre la breadth risale dalla fascia di Attenzione verso la soglia, l'app segnala di nuovo avvicinamento. Esempio: XLRE dal 20/10/2026 (breadth 10 il 19/10 in Attenzione, poi 23,3 in stato Normale, sotto la soglia di 39,8: avvicinamento e «risalita» in 8 delle 9 sedute fino al 30/10).

**Condizione «risalita» in una seduta t**: t è in avvicinamento; nelle K sedute prima (t−K…t−1) lo stato è stato almeno una volta diverso da Normale (watch, setup, trig, fail o cool); la breadth in t è almeno X punti sopra il minimo della breadth in quelle K sedute. Principale K = 20, X = 10. Sensibilità: K = 10 e 40, X = 5 (tutte e 6 le combinazioni).

- **Domanda 1.** La nota «probabile risalita» è sostenuta se P(la breadth tocca il livello blu entro 126 sedute) nei casi «risalita» è al massimo 0,67 volte quella degli «altri», in entrambe le metà (2005–2015 e 2016–oggi), sui settori. Il criterio si applica agli ingressi in avvicinamento (unità principale, casi meno dipendenti tra loro); lo stesso confronto si riporta anche su tutte le sedute in avvicinamento. Gli indici (storie dal 2001) servono da verifica fuori campione.
- **Domanda 2.** La variante «avvicinamento acceso solo se la risalita è falsa» è migliore se soddisfa tutte queste condizioni: perde al massimo 2 tocchi avvisati, sia da sola sia insieme all'Attenzione; la quota di ingressi che arrivano al livello non scende; riduce la quota di sedute accese di almeno il 20% oppure la quota di episodi di 1–2 sedute di almeno un terzo.

Definizioni come in `ricerca/attenzione/script/avvicinamento_pit.mjs`. La regola attuale dello script rifà esattamente i numeri di quel file: settori 158 ingressi, 50 arrivano, anticipo 30, tocchi 33/63, con l'Attenzione 50/63; indici 330, 40%, 27, 83/132, 89/132. La condizione «risalita» è ricalcolata con un secondo codice: 0 sedute diverse su 1.213.554 confronti. Gli esiti dei 158 ingressi coincidono con `casi_varianti.json` (50 su 152 arrivano). Nella domanda 1, P(tocco) e P(zona blu) escludono i casi recenti che non hanno ancora 126 sedute dopo e non sono arrivati («senza esito»). La zona blu è lo stato `setup`: la macchina ci entra sempre passando da lì.

## Domanda 1: «probabile risalita»

### Settori (dal 2005; XLC dal 2019, XLRE dal 2016), K = 20, X = 10

| Unità | Gruppo | Casi | Tocca il livello entro 126 | Zona blu entro 126 | ETF a 63 sedute, mediana (positivi) |
|---|---|---|---|---|---|
| Ingressi | risalita | 25 | 9/25 = 36,0% | 8/25 = 32,0% | +0,5% (14/25) |
| Ingressi | altri | 133 (6 senza esito) | 41/127 = 32,3% | 29/127 = 22,8% | +5,3% (94/127) |
| Ingressi | **rapporto** | | **1,11** | 1,40 | |
| Sedute | risalita | 517 (10 senza esito) | 98/507 = 19,3% | 74/507 = 14,6% | +5,3% (393/507) |
| Sedute | altri | 1173 (29 senza esito) | 305/1144 = 26,7% | 230/1144 = 20,1% | +4,6% (805/1126) |
| Sedute | **rapporto** | | **0,72** | 0,73 | |

Base: tutte le 53.117 sedute del periodo, ETF a 63 sedute +3,3% (67,8% positive).

Per metà (rapporto del tocco, risalita/altri):

| | 2005–2015 | 2016–oggi |
|---|---|---|
| Ingressi | 6/15 (40,0%) contro 10/44 (22,7%): **1,76** | 3/10 (30,0%) contro 31/83 (37,3%): **0,80** |
| Sedute | 50/229 (21,8%) contro 73/390 (18,7%): **1,17** | 48/278 (17,3%) contro 232/754 (30,8%): **0,56** |

Per periodo di crisi, ingressi (tocca entro 126, risalita | altri): lug 2007–giu 2009 1/2 | 2/3; mag 2011–gen 2012 1/3 | 5/9; **giu 2015–giu 2016 3/3 | 3/10**; set 2018–gen 2019 1/1 | 3/6; 2022 2/6 | 7/13; feb–giu 2025 0/1 | 3/6; fuori dalle crisi 1/9 | 16/69. Sulle sedute il rapporto basso viene da più periodi: feb–giu 2025 (0/33 contro 12/76), 2022 (8/33 contro 24/48) e fuori dalle crisi (25/230 contro 152/689). In giu 2015–giu 2016 invece le sedute «risalita» arrivano spesso al livello (37/77 contro 53/107): dopo il calo di agosto 2015 c'è stato il nuovo minimo di gennaio–febbraio 2016.

I 25 ingressi «risalita» sono in `risalita.json` (`settori.K20_X10.domanda1.ingressi.elencoRisalita`). Toccano il livello: XLY 30/03/2022, XLE 08/10/2015, XLF 26/08/2015, XLV 12/08/2011, XLB 08/10/2015, XLB 16/10/2018, XLU 30/06/2008, 18/05/2015 e 21/07/2022.

### Indici (22, dal 2001 o dall'inizio della storia), K = 20, X = 10

| Unità | Risalita | Altri | Rapporto | 2001–2015 | 2016–oggi |
|---|---|---|---|---|---|
| Ingressi, tocco | 14/34 = 41,2% | 119/289 = 41,2% | **1,00** | 0,90 | 1,12 |
| Ingressi, zona blu | 12/34 = 35,3% | 94/289 = 32,5% | 1,09 | | |
| Ingressi, indice a 63 sedute | +4,4% (24/34) | +2,4% (177/292) | | | |
| Sedute, tocco | 288/725 = 39,7% | 1030/2542 = 40,5% | **0,98** | 1,02 | 0,79 |

Base degli indici: +2,3% a 63 sedute (62,1% positive).

### Sensibilità (rapporto del tocco: totale · prima metà · seconda metà)

| K, X | Settori, ingressi | Settori, sedute | Indici, ingressi | Indici, sedute |
|---|---|---|---|---|
| **20, 10** | 1,11 · 1,76 · 0,80 | 0,72 · 1,17 · 0,56 | 1,00 · 0,90 · 1,12 | 0,98 · 1,02 · 0,79 |
| 10, 10 | 1,26 · 2,62 · 0,58 | 0,94 · 1,35 · 0,77 | 1,01 · 0,92 · 1,09 | 1,00 · 1,07 · 0,84 |
| 40, 10 | 0,90 · 1,76 · 0,55 | 0,73 · 1,61 · 0,48 | 0,82 · 0,72 · 0,96 | 0,99 · 1,03 · 0,85 |
| 20, 5 | 1,02 · 1,61 · 0,75 | 0,78 · 1,29 · 0,64 | 1,04 · 0,92 · 1,19 | 1,02 · 0,97 · 1,17 |
| 10, 5 | 0,92 · 1,93 · 0,42 | 0,94 · 1,47 · 0,77 | 1,08 · 0,96 · 1,22 | 0,97 · 1,01 · 0,94 |
| 40, 5 | 0,86 · 1,48 · 0,62 | 0,80 · 1,63 · 0,65 | 0,92 · 0,79 · 1,11 | 0,96 · 0,91 · 1,17 |

**Verdetto 1: la nota «probabile risalita» non è sostenuta.** Sugli ingressi dei settori il rapporto è 1,11: 9 ingressi «risalita» su 25 sono arrivati al livello, contro 41 su 127 degli altri. Nel 2005–2015 il rapporto è 1,76; il criterio non è soddisfatto in nessuna delle 6 combinazioni. Sulle sedute il rapporto totale (0,72) e quello del 2016–oggi (0,56) vanno nella direzione della nota, ma nel 2005–2015 è sopra 1 in tutte le combinazioni. Sugli indici i due gruppi sono uguali (1,00 sugli ingressi, 0,98 sulle sedute). Un avvicinamento in risalita dopo l'Attenzione arriva al livello circa una volta su tre, come gli altri: la risalita spesso precede un nuovo minimo (2008, 2015–2016, 2022). Una nota corretta direbbe al massimo «la breadth sta risalendo da un minimo recente; nel campione questi casi arrivano al livello quanto gli altri».

## Domanda 2: spegnere l'avvicinamento in risalita

### Settori, K = 20, X = 10

| Regola | Ingressi | Arrivano (quota) | Con esito | Anticipo mediano | Tocchi avvisati | Sedute accese | Episodi di 1–2 sedute | ETF a 63 sedute |
|---|---|---|---|---|---|---|---|---|
| Attuale | 158 | 50 (31,6%) | 50/152 (32,9%) | 30 | 33/63 | 3,1% | 47 (29,7%) | +4,8% |
| **Variante** | 153 | 47 (30,7%) | 47/147 (32,0%) | 31 | 32/63 | 2,2% | 57 (37,3%) | +5,3% |
| Attuale oppure Attenzione | 256 | 71 (27,7%) | 71/247 (28,7%) | 24 | 50/63 | 13,8% | 40 (15,6%) | +5,2% |
| Variante oppure Attenzione | 258 | 71 (27,5%) | 71/249 (28,5%) | 24 | 50/63 | 12,8% | 43 (16,7%) | +4,9% |

Criterio: tocchi persi 1 da sola e 0 con l'Attenzione (sì); quota che arriva da 31,6% a 30,7% (**no**: scende); sedute accese −29% (sì); quota di episodi di 1–2 sedute +26% (peggiora). **Non migliore**: la quota che arriva scende e gli episodi brevi aumentano (47 → 57), perché spegnere le sedute in risalita spezza gli episodi.

Tocco perso (da sola): **XLU 05/06/2015**. Era avvisato dall'ingresso del 18/05/2015, che era in «risalita» e viene spento; la variante non ha altri ingressi da 5 a 126 sedute prima del tocco. Con l'Attenzione non si perde nessun tocco: il tocco di XLU resta avvisato da un episodio della regola «oppure Attenzione».

### Indici, K = 20, X = 10 (verifica)

| Regola | Ingressi | Arrivano | Anticipo | Tocchi avvisati | Sedute accese | Episodi di 1–2 sedute |
|---|---|---|---|---|---|---|
| Attuale | 330 | 133 (40,3%) | 27 | 83/132 | 2,9% | 94 (28,5%) |
| Variante | 332 | 137 (41,3%) | 30 | 84/132 | 2,3% | 107 (32,2%) |
| Attuale oppure Attenzione | 367 | 148 (40,3%) | 23 | 89/132 | 8,5% | 63 (17,2%) |
| Variante oppure Attenzione | 378 | 151 (39,9%) | 25 | 90/132 | 7,8% | 67 (17,7%) |

Sugli indici il criterio è soddisfatto, ma di poco: sedute accese −20,7% contro la soglia del 20%. Gli episodi brevi aumentano anche qui (94 → 107). Il tocco «guadagnato» (FTSEMIB 09/10/2008, e IBEX 16/07/2008 con l'Attenzione) non è un avviso migliore: spegnendo le sedute in risalita si apre una pausa di 20 sedute e la seduta successiva diventa un nuovo ingresso.

### Sensibilità della variante

| K, X | Settori: tocchi da sola / con Attenzione | Arrivano | Sedute accese | Episodi 1–2 (quota) | Migliore? | Indici: migliore? |
|---|---|---|---|---|---|---|
| **20, 10** | 32/63 · 50/63 | 30,7% | −29% | 37,3% | **no** (arrivano) | sì |
| 10, 10 | 32/63 · 50/63 | 31,6% | −16% | 34,8% | no (riduzione) | no |
| 40, 10 | 31/63 · 50/63 | 32,2% | −39% | 37,1% | sì | sì |
| 20, 5 | 29/63 · 50/63 | 29,3% | −45% | 44,0% | no (tocchi, arrivano) | no |
| 10, 5 | 31/63 · 50/63 | 29,6% | −32% | 40,9% | no (arrivano) | sì |
| 40, 5 | 29/63 · 50/63 | 33,1% | −55% | 44,6% | no (tocchi) | no |

Attuale nei settori: 33/63, 50/63, 31,6%, 3,1% di sedute accese, 29,7% di episodi di 1–2 sedute. Tocchi persi nelle varianti (da sola; con l'Attenzione mai nessuno): XLU 05/06/2015 (tutte), XLU 29/09/2022 (K 40 con X 10; K 20 e K 40 con X 5), XLU 17/07/2008 (tutte le combinazioni con X 5), XLE 21/01/2016 (K 20 e K 40 con X 5). Ogni volta l'ingresso che lo avvisava era in «risalita» e veniva spento. Elenco completo con i motivi in `risalita.json` (`domanda2.tocchiPersi`).

**Verdetto 2: la variante non è migliore della regola attuale (scartare).** Con i parametri principali non supera il criterio sui settori: la quota che arriva scende da 31,6% a 30,7%. Lo supera solo in 1 combinazione su 6 (K 40, X 10) e sugli indici con K 20, X 10 per pochi decimi. Toglie molte sedute accese (−29%), ma in quelle sedute la probabilità di toccare il livello non è più bassa in modo stabile (domanda 1). Inoltre aumenta gli episodi di 1–2 sedute in tutte le combinazioni, cioè rende il segnale più intermittente. Insieme all'Attenzione non cambia quasi nulla (50/63 in tutte le combinazioni), perché le sedute «risalita» seguono per costruzione uno stato non Normale.

## Limiti

- La condizione è stata pensata guardando XLRE nel 2025–2026, cioè dentro lo stesso campione. XLRE ha un solo ingresso «risalita» con esito (14/04/2025, non tocca).
- Livelli blu di oggi (per gli indici, la fonte di ciascun livello è nel campo `blueSource` di `config/indices.json`): sono scelti col senno di poi.
- Pochi periodi indipendenti: 25 ingressi «risalita» nei settori, concentrati nel 2006 (4), nel 2015 (5) e nel 2022 (6), e 35 negli indici. Le percentuali sono indicative.
- Le sedute in avvicinamento sono molto dipendenti tra loro: 517 sedute «risalita» stanno in 66 episodi.
- Gli indici hanno storie di lunghezza diversa (dal 2001 al 2017) e, per alcuni, membri di oggi (vedi `config/indices.json`, campo `composition`).
- I rendimenti a 63 sedute sono dalla chiusura del giorno del segnale e non sono uno scopo del segnale. Nei settori, gli ingressi «risalita» hanno una mediana più bassa (+0,5% contro +5,3%); negli indici più alta (+4,4% contro +2,4%). Non c'è un'indicazione coerente.
