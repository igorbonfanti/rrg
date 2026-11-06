# Controllo testi (secondo giro, revisore nuovo) · versione 1.3.3 · commit 6885e6c

Verdetto: **NO-GO**. Nessun bloccante: tutti i 30 numeri delle frasi cambiate sono giusti. Resta un rilievo «da correggere»: la descrizione dell'anticipo, cioè «circa due settimane in più» e «invece di 31». La correzione è di testo e costa poco. Ci sono poi 8 minori.

Ricalcolo: `ricalcolo2.mjs`, scritto da zero. Dall'app importa solo runMachine, breadthSeries, priceSeries e indexSeries. La soglia di avvicinamento è calcolata con una funzione propria e poi confrontata con approachSeries (202.259 sedute, 0 differenze) e con approachLevel sulla storia tagliata (1.684 sedute, 0 differenze). Dati al 30/10/2026. Il periodo parte dalla prima seduta con `m.days` non nullo.

## Numeri delle frasi cambiate

| Frase (dove) | Ricalcolo | Numero | Descrizione |
|---|---|---|---|
| settori, insieme all'Attenzione 50 tocchi su 63, sola Attenzione 43, avvicinamento da solo 33 (legenda bottom.js:242, tooltip bottom.js:440, index.html:728, guida:162, README:67, version.js, README:155) | D 50/63, E 43/63, C 33/63 | giusto | ok |
| «primo avviso in mediana circa 40 sedute prima del tocco invece di 31» (stesse copie) e «circa due settimane in più» (guida:162) | D 39,5 su 50 tocchi; E 31 su 43 | giusto | **rilievo 1** |
| «circa un avvicinamento su tre arriva al livello (entro sei mesi / 126 sedute)» | 50/158 = 31,6% (48/150 = 32,0% con la finestra completa) | giusto | ok |
| «Dal 2005 (XLC dal 2019, XLRE dal 2016)» | primo stato: 9 settori 03/01/2005, XLC 20/06/2019, XLRE 07/10/2016 | giusto | ok |
| indici, 89 su 132 con l'Attenzione, 83 con la sola Attenzione, 83 da solo (indices.js:395, index.html:723, README:79) | D 89/132, E 83/132, C 83/132 | giusto | ok (vedi minore 4) |
| indici, primo avviso 63 sedute prima invece di 56 | D 63, E 56 | giusto | stessa radice del rilievo 1, effetto minore (sullo stesso tocco D anticipa in 50 casi su 79) |
| indici, il 40% arriva al livello entro sei mesi | 133/330 = 40,3% | giusto | ok |
| indici «la più lunga dal 2001», «un anno dopo l'inizio della breadth per DJI, TSX60, SX5E, NIFTY50 e CSI300» (README:79) | primo stato DJI, UKX, DAX, CAC 02/01/2001; l'anno di ritardo vale proprio per quei 5 indici | giusto | ok; README:155 no (minore 1) |
| «zona blu entro sei mesi circa una volta su quattro (23%, contro il 9% di una seduta normale qualsiasi)» (guida:165, README:67) | 35/150 = 23,3%; base, cioè sedute Normali fuori dall'avvicinamento, 3651/39638 = 9,2% (uguale anche contando `fail`) | giusto | ok |
| «non scende più del solito», calo massimo a 63 sedute −3,3% contro −3,3% | −3,30 (−3,34 con il valore centrale basso) contro −3,34 | giusto | ok |
| README:67 «+4,6% contro +3,0% delle sedute normali; +3,3% considerando tutte le sedute» | ingressi 4,61 (valore centrale basso) o 4,78 (media dei due centrali, come `median` dell'app); normali 2,97; tutte 3,29 | giusto | minore 3 |
| «chi aveva comprato all'ingresso sopporta fino al trigger un calo mediano del 14%» (guida:163) | 42 episodi, −13,99 (−14,28) | giusto | ok; minore 5 |
| terza seduta: «46%, 17 su 37»; altrimenti «27%», «poco più di una volta su quattro», «entro sei mesi» (guida:166, README:67) | 17/37 = 45,9%; 31/113 = 27,4% (ancora in avvicinamento 16/58, tornato sopra 15/55, altri stati 0) | giusto | ok; «circa metà» accettabile |
| bottom recente: «21% contro il 34%; solo 24 casi» (guida:167) | 5/24 = 20,8%; 43/126 = 34,1% (uguale contando solo le sedute del periodo) | giusto | ok |
| «in XLE, XLF e XLB circa un ingresso su tre arriva in zona blu entro sei mesi» (guida:168) | XLE 6/19 = 31,6%; XLF 5/18 = 27,8%; XLB 9/26 = 34,6%; insieme 20/63 = 31,7% | giusto | ok (per XLF «uno su tre» è un po' generoso) |
| «in XLRE, che ha la soglia più alta, 2 su 14, quanto una seduta qualsiasi» (guida:168) | 2/14 = 14,3%; base di XLRE 12,9%. La soglia di oggi è la più alta (39,8), e lo è anche la mediana del periodo (41,3) | giusto | minore 2 |
| «in un calo deciso il livello è a circa due settimane» | vale per costruzione: soglia = livello + 90° percentile dei cali in 10 sedute | — | ok |
| «la zona blu chiede di più (due chiusure al livello e il drawdown profondo)» (guida:162) | runMachine: `below >= setupCloses (2)` e `dp >= ddSetup (70)`, oltre al riarmo | — | ok |

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | guida.html:162 («circa 40 sedute prima del tocco invece di 31: circa due settimane in più»). Con «invece di 31», senza «due settimane»: legenda js/bottom.js:242, tooltip js/bottom.js:440, index.html:728, js/version.js (nota 1.3.3), README:67 e :155. Fuori dall'app: fasce.md e docs/sviluppo.md:159 («anticipa il primo avviso di circa 9 sedute») | I due numeri sono giusti, ma sono mediane di insiemi diversi: 50 tocchi per D, 43 per E. La frase fa capire che aggiungere l'avvicinamento sposta il primo avviso di circa due settimane prima. **Sugli stessi 43 tocchi avvisati da entrambe le regole, la differenza mediana è 0 sedute.** In 26 tocchi su 43 il primo avviso è lo stesso. In 17 l'avvicinamento arriva prima, di 7 sedute in mediana (media su tutti i 43: 8,5 sedute). In nessun caso arriva dopo. Il vero guadagno sono soprattutto i 7 tocchi in più (50 contro 43), che però hanno un preavviso corto (19 sedute in mediana). È lo stesso difetto del rilievo 3 del primo giro («raddoppio»), solo più piccolo. Proposta: «avvisa 7 tocchi in più (50 su 63 contro 43); sui tocchi che avvisano tutte e due, in 17 su 43 il primo avviso arriva prima (in mediana 7 sedute), negli altri è lo stesso». Nei testi brevi (legenda e tooltip) basta togliere «invece di 31» e «circa due settimane in più» e lasciare «50 su 63 (43 con la sola Attenzione)». | `node ricerca/qa/1.3.3/testi-2/ricalcolo2.mjs`, riga «stesso tocco» | output.txt: «D − E mediana 0 sedute, media 8.5; D prima 17 (guadagno mediano 7), uguale 26, D dopo 0»; «su quei tocchi: primo avviso mediano D 41, E 31»; «solo da D: 7 (primo avviso mediano 19)» |
| 2 | minore | guida.html:168 | «2 su 14, quanto una seduta qualsiasi»: il confronto giusto è con la base di XLRE (12,9%). Ma due voci sopra la guida chiama «seduta normale qualsiasi» la base di tutti i settori (9%), e chi legge confronta 14% con 9%. Proposta: «quanto una seduta qualsiasi di XLRE (13%)». | lettura; output.txt, per settore | XLRE 2/14 = 14,3%, base 12,9% |
| 3 | minore | README.md:67 | «+4,6%» è la mediana con il valore centrale basso (verifica_uso.mjs). Con la mediana dell'app (`median`, media dei due centrali) e in sintesi.md è +4,8%. Il confronto con +3,0% e +3,3% non cambia. | output.txt, riga «rendimento 63» | 4,61 contro 4,78 |
| 4 | minore | README.md:79 («da sola 83»), README.md:155 («indici 89 e 83 su 132») | È lo stesso dubbio del rilievo 8 di usabilità, risolto nell'app ma non nel README. Anche la sola Attenzione vale 83, e «da sola» al femminile fa pensare all'Attenzione. Proposta: «l'avvicinamento da solo 83». | lettura | — |
| 5 | minore | guida.html:163 | Il −14% vale per gli ingressi che arrivano in zona blu e al trigger **entro 252 sedute** (42 episodi). L'orizzonte non è scritto. | output.txt, riga «condizionato» | 42 episodi, −13,99 |
| 6 | minore | README.md:155 (nota 1.3.3) | «per gli indici il conteggio parte un anno dopo l'inizio della breadth» vale solo per 5 indici su 22 (DJI, TSX60, SX5E, NIFTY50, CSI300). Per gli altri 17 lo stato parte dalla prima seduta della breadth, o al più qualche giorno dopo (N225, SMI). README:79 lo dice bene. | output.txt, «prima breadth → primo stato» | — |
| 7 | minore | legenda del Monitor (js/bottom.js:242) | Il rilievo 7 di usabilità non è risolto, anzi peggiora. Il testo dell'avvicinamento passa da 492 a 664 caratteri, nella colonna stretta sul telefono. Il rilievo 1 lo accorcerebbe. | testo senza tag, `git show <rev>:js/bottom.js` | 492 → 664 |
| 8 | minore | js/bottom.js:154 (scheda «Avvicinamento: …» del Monitor) | Il rilievo 2 di usabilità è risolto in parte. La legenda ora porta a «come usarlo», ma la scheda di XLRE dice ancora solo «in un calo deciso il livello blu è a circa due settimane», senza l'avvertenza che in XLRE l'avvicinamento non distingue. | lettura | — |

## Rilievi del primo giro: stato

**Testi (rapporto-testi.md)**

1. Basi mescolate nel README (+3,3%): **risolto**. Ora c'è «+3,0% delle sedute normali; +3,3% considerando tutte le sedute»; resta la questione della mediana (minore 3).
2. «Regge meglio dove ci sono più episodi»: **risolto**. Il testo nuovo regge sui dati; resta la base di XLRE (minore 2).
3. Anticipo degli allarmi che arrivano presentato come anticipo dei tocchi: **risolto in parte**. La metrica ora è quella giusta, il primo avviso prima di ogni tocco. Il confronto «invece di 31: circa due settimane in più» fa però di nuovo pensare a uno spostamento per ogni tocco (rilievo 1).
4. fasce.md con i numeri vecchi: **risolto**. La sezione vecchia è marcata «Superato» e c'è una sezione 1.3.3 con 33/50/43 e 83/89/83. Contiene però «anticipa il primo avviso di circa 9 sedute» (rilievo 1), e i «6 su 132» degli indici sono un saldo: 10 tocchi aggiunti e 4 persi.
5. «Dal 2005» senza XLC e XLRE: **risolto** in legenda, tooltip e commento di signals.js.
6. sviluppo.md e casi_varianti.md: **risolto in parte**. sviluppo.md è aggiornato, ma con «circa 9 sedute prima» (rilievo 1). casi_varianti.md:156 dice ancora 35% (45/128): la differenza è spiegata solo in sintesi.md.
7. Indici «dal 2000»: **risolto** in indices.js:395, index.html:723 e README:79 (README:155 vedi minore 6).
8. «Le decisioni restano quelle della zona blu e del trigger»: **risolto**. Ora c'è «L'avvicinamento non cambia le regole dell'app».
9. Limiti detti solo in parte: **risolto**. Ci sono «entro sei mesi», XLC e XLRE, «solo 24 casi», «17 su 37», «In molti settori i casi sono pochi» e «regole d'uso trovate guardando gli stessi dati».
10. «In mezzo» → «fino al trigger»: **risolto**. L'orizzonte di 252 sedute manca (minore 5).
11. Doppio due punti nel README: **risolto**. In README:67 e :79 ora il primo due punti è dentro la parentesi.

**Usabilità (rapporto-usabilita.md)**

1. «Giallo» per l'avvicinamento nella guida: **risolto**. Nella sezione #avvicinamento non c'è più «giallo»: ci sono «tratto colorato» e «ancora in avvicinamento».
2. XLRE nel Monitor senza avvertenza: **risolto in parte**. C'è il link «come usarlo» nella legenda, la scheda resta com'era (minore 8).
3. «(vedi la guida)» senza link: **risolto**. index.html:728 ha `<a href="guida.html#avvicinamento">`, e l'ancora esiste (guida.html:160).
4. Messaggio non uguale ovunque: **risolto**. «Promemoria» c'è in legenda, nei tooltip dei settori e degli indici, nelle note e nella guida; XLC e XLRE in tutte le copie dei settori; indici «dal 2001 / dalla prima seduta con uno stato».
5. Percentuali senza orizzonte e senza differenza tra livello e zona blu: **risolto**. Ci sono «entro sei mesi (126 sedute)» e «la zona blu chiede di più (due chiusure al livello e il drawdown profondo)».
6. Contraddizione del −14% e gergo: **risolto**. «Quando il settore arriva poi davvero in zona blu e al trigger … fino al trigger», «tre sedute dall'ingresso», «la risalita dopo il minimo», «quanto una seduta qualsiasi».
7. Muro di testo nella legenda sul telefono: **non risolto**, anzi peggiorato (minore 7).
8. «Indici: 89 e 83 su 132» nella nota di versione: **risolto** nell'app, perché la nota non cita più gli indici. Resta nel README (minore 4).

## Coerenza tra le copie

Ho confrontato legenda (bottom.js:242), tooltip dei settori (bottom.js:440), tooltip degli indici (indices.js:395), note (index.html:723 e :728), guida (:162-170), README (:67, :79, :155) e nota di versione (version.js). Gli stessi numeri sono uguali dappertutto: 50/63, 43, 33, circa 40 e 31, «circa uno su tre … entro sei mesi», 89/132, 83, 83, 63 e 56, 40%, «XLC dal 2019, XLRE dal 2016», «dal 2001». Le uniche differenze sono quelle dei rilievi 1, 4 e 6.

Numeri vecchi (59/73, 42/73, 44/73, 92/135, 86/135, 96/134, «un mese», «due settimane e mezzo», 24 o 23 sedute, 36%, 41%, «dal 2000»): nei testi dell'app non ce ne sono più. Restano solo nella nota storica 1.3.1 del README (README:157), che la nota 1.3.3 spiega, e nella sezione di fasce.md marcata «Superato». La nota di versione mostrata nell'app non contiene più la nota della 1.3.1.

## I controlli possono fallire

- `node ricalcolo2.mjs --sbagliata` conta dalla seduta 0 invece che dalla prima seduta con uno stato, e dà numeri diversi (`output_sbagliata.txt`):
  - settori: C 42/73, D 59/73, E 44/73;
  - indici: C 86/135, D 92/135, E 84/135;
  - uso pratico: 180 ingressi, zona blu 36/172 = 20,9% contro 8,4%, terza seduta 18/38 e 44/134, bottom recente 8/29.

  La definizione corretta ridà invece i numeri dei testi.
- Con la definizione dell'anticipo degli allarmi che arrivano, lo stesso script dà 24 contro 12 sedute (settori) e 23 contro 13 (indici), non 39,5 contro 31 e 63 contro 56. La riga «anticipo degli allarmi che arrivano» distingue quindi la metrica vecchia da quella nuova.
- Confronto della soglia: la mia funzione e approachSeries coincidono in 202.259 sedute su 202.259. Ho provato a sbagliare l'indice del quantile in una copia temporanea dello script, cancellata dopo la prova, mettendo `ceil` al posto di `floor`. Il confronto fallisce: 61.209 differenze, e 576 su 1.684 contro approachLevel. Cambiano anche i numeri: C 34/63, 159 allarmi.

## Cosa ho verificato e passa (30 numeri ricalcolati, più i controlli sotto)

- **Settori, 9 numeri**: 50, 43 e 33 su 63; 39,5 e 31; 31,6%; tre date d'inizio.
- **Indici, 8 numeri**: 89, 83 e 83 su 132; 63 e 56; 40,3%; inizio dal 2001; i 5 indici che partono un anno dopo.
- **Uso pratico, 13 numeri**: 23 contro 9; −3,3 contro −3,3; +4,6 (4,8), +3,0 e +3,3; −14; 46 (17/37) e 27; 21 e 34 (24 casi); XLE, XLF e XLB circa uno su tre; XLRE 2/14 con la soglia più alta.
- **Script del repository rilanciati**: `anticipo_tocchi.mjs` e `verifica_pit.mjs` danno gli stessi numeri del mio script.
- **Test**: `npm test`, 0 fail.

## Cosa non ho potuto verificare e perché

- **Testi nella pagina servita**: non li ho controllati nel browser. Sono stringhe fisse nel codice, senza numeri calcolati; il loro aspetto lo ha controllato il tema Usabilità.
- **Seconda fonte esterna**: non esiste per queste statistiche, che sono interne all'app.

## Script e output

`ricerca/qa/1.3.3/testi-2/`:

- `ricalcolo2.mjs`;
- `output.txt`;
- `output_sbagliata.txt`.
