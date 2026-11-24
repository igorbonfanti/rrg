# La nostra rotazione e la RRG di Bloomberg (11/11/2026)

Fase di ricerca: l'app non cambia.

**Domanda dell'utente.** La nostra rotazione dei settori «si parla» con la RRG ufficiale di Bloomberg (`RRG <GO>`, assi «JdK RS-Ratio» e «JdK RS-Momentum»)?

**Riferimento.** Uno screenshot di Bloomberg dell'11/11/2026, preso da un video pubblico di BNP Paribas. Impostazioni:
- Index SPXL1: gli 11 indici settoriali S&P 500, cioè S5COND, S5CONS, S5ENRS, S5FINL, S5HLTH, S5INDU, S5INFT, S5MATR, S5RLST, S5TELS e S5UTIL;
- Base SPXL1 Index, cioè l'S&P 500;
- Weekly, Range 4, Today.

L'immagine è delle 09:57 italiane dell'11/11: l'ultima seduta USA chiusa era quella del 10/11.

**Dati Bloomberg.** Sono licenziati: le coordinate lette dallo screenshot restano fuori dal repository, in un file privato. Qui ci sono solo conclusioni qualitative (quadranti, direzioni, ordini), statistiche di sintesi e i nostri numeri. La lettura ha un errore stimato di ±0,1 sui punti ben separati. Le code di XLC, XLY e XLRE sono incerte, perché i punti si sovrappongono.

**Criterio deciso prima.** «Si parlano» se almeno 9 settori su 11 cadono nello stesso quadrante e se la correlazione di rango (Spearman) è almeno 0,8 su entrambi gli assi.

## File

| File | Cosa fa |
|---|---|
| `scarica.mjs` | Scarica da Yahoo, con lo stesso modulo della pipeline (`scripts/lib/yahoo.js`), i dati in `cache/yahoo.json`: 11 ETF SPDR, SPY e ^GSPC, solo prezzo e con dividendi. Degli indici settoriali (`^SP500-xx`) Yahoo ha la storia solo per il Real Estate (`^SP500-60`): gli altri hanno una barra sola, e l'Energy dà 404. |
| `confronta.mjs` | Calcola la nostra rotazione con `js/engine.js` in tutte le combinazioni: 3 formule; 4 coppie di prezzi e benchmark (ETF con dividendi contro SPY con dividendi, come l'app; solo prezzo contro SPY; solo prezzo contro ^GSPC; con dividendi contro ^GSPC); 3 date finali (settimana in corso fino al 10/11 o al 09/11, settimana chiusa al 06/11). Senza argomenti stampa i nostri valori. Con il file privato delle letture (`node confronta.mjs <letture.json>`) stampa anche: quadranti uguali, Spearman e Pearson sui due assi, fattore di scala (pendenza della retta per (100,100)) e scarto di direzione della coda sulle ultime 3 settimane. |
| `nostri_valori.json` | I nostri valori per tutte le combinazioni (`node confronta.mjs --json nostri_valori.json`). |
| `indice_immobiliare.mjs` | Unico confronto possibile indice contro indice: S&P 500 Real Estate (`^SP500-60`) contro S&P 500 (^GSPC), accanto a XLRE. |
| `verifica.mjs` | Controlli sull'implementazione (sezione «Controlli»). Esce con un errore se un controllo fallisce. |

`cache/yahoo.json` contiene valori degli indici S&P (^GSPC e ^SP500-60) presi da Yahoo: prima di un commit va deciso se tenerla o ignorarla con `.gitignore`. Si rigenera con `scarica.mjs`.

## Risultati

### Riepilogo per formula

Settimana in corso fino al 10/11, come «Today» di Bloomberg.

| Formula e prezzi | Quadranti uguali | ρ asse x | ρ asse y | Scala x | Scala y | Code entro 45° | Si parlano? |
|---|---|---|---|---|---|---|---|
| Nuova, adj/SPY (l'app) | 10/11 (diverso: XLF) | 0,92 | **0,44** | ×4,2 | ×0,9 | 9/11 | **no** (asse y) |
| Medie semplici, adj/SPY | **11/11** | 0,98 | 0,95 | ×1,03 | ×0,99 | 10/11 | **sì** |
| Medie semplici, solo prezzo/^GSPC | 10/11 (XLP sul bordo) | 0,99 | 0,95 | ×1,02 | ×1,01 | 10/11 | **sì** |
| Medie semplici, adj/^GSPC | 11/11 | 0,98 | 0,95 | ×1,03 | ×0,99 | 10/11 | **sì** |
| Classica, adj/SPY | 9/11 (diversi: XLC, XLI) | 0,91 | 0,45 | ×3,0 | ×0,75 | 10/11 | no |

- **Scala**: per quanto va moltiplicata la nostra distanza da 100 per arrivare a quella di Bloomberg.
- **Settimana chiusa al 06/11**: le medie semplici si allontanano da Bloomberg. I quadranti uguali scendono a 9/11 (diversi XLP e XLRE), le code entro 45° a 8/11 e lo scarto quadratico medio sale da circa 0,5 a 0,6-0,8. Con la nuova il risultato è misto: 9-10/11 e ρ y 0,54, comunque sotto il criterio. Bloomberg con «Today» conta quindi la settimana in corso come una barra, come fa l'app.
- **Settimana in corso fino al 09/11** (l'app del 10/11): la nuova dà 9/11, perché anche XLE passa in Weakening.

### Indice contro indice: Real Estate

Con `indice_immobiliare.mjs`, l'S&P 500 Real Estate contro ^GSPC, medie semplici, settimanale con la settimana in corso, coincide con S5RLST di Bloomberg entro l'errore di lettura (0,02 o meno) su tutti e 4 i punti della coda. La testa vale 96,07/100,46.

Con la settimana chiusa al 06/11, la testa (95,48/99,70) coincide con il penultimo punto di Bloomberg.

La formula a medie semplici di `engine.js` (RS-Ratio = 100·SMA10(rs)/SMA30(rs), RS-Momentum = 100·RS-Ratio/SMA9(RS-Ratio)) riproduce quindi la JdK di Bloomberg. Lo fa al centesimo quando i dati sono gli stessi (indice contro indice, solo prezzo). In precedenza la stessa formula aveva già coinciso al centesimo con StockCharts (README principale, 25/09/2026).

### Settore per settore

Settimana in corso fino al 10/11, prezzi con dividendi contro SPY. Rango 1 = valore più alto. Direzione = dalla barra di 3 settimane prima alla testa, in punti cardinali.

| ETF (indice Bloomberg) | Bloomberg: quadrante, direzione | Nuova (app) | Medie semplici |
|---|---|---|---|
| XLP (S5CONS) | Leading, NE; rango x 5, y 1 | 100,32/101,95 Leading, NE; x 3, y 2 | 100,18/102,86 Leading, NE; x 5, y 1 |
| XLE (S5ENRS) | Leading, SE; x 1, y 2 | 100,84/100,03 Leading, S; x 2, **y 9** | 106,68/102,76 Leading, SE; x 1, y 2 |
| XLV (S5HLTH) | Leading, E; x 2, y 4 | 101,41/101,74 Leading, NE; x 1, y 3 | 106,26/102,25 Leading, E; x 2, y 4 |
| XLU (S5UTIL) | Improving, NE; x 11, y 3 | 99,21/101,27 Improving, NE; x 9, y 6 | 94,94/102,69 Improving, NE; x 11, y 3 |
| XLB (S5MATR) | Improving, NE; x 6, y 5 | 99,86/101,22 Improving, NE; x 6, y 7 | 98,02/101,24 Improving, NE; x 6, y 7 |
| XLY (S5COND) | Improving, NE; x 7, y 6 | 99,31/102,50 Improving, NE; x 8, **y 1** | 96,89/101,49 Improving, NE; x 7, y 5 |
| XLRE (S5RLST) | Improving, NE; x 8, y 7 | 99,51/101,17 Improving, NE; x 7, y 8 | 96,30/100,49 Improving, NE; x 9, y 8 |
| XLC (S5TELS) | Improving, **SO**; x 9, y 8 | 98,49/101,33 Improving, **NE**; x 10, y 5 | 96,67/101,29 Improving, **SE**; x 8, y 6 |
| XLF (S5FINL) | **Weakening**, N; x 4, y 9 | 100,23/101,34 **Leading**, NE; x 4, y 4 | 100,57/99,74 Weakening, N; x 3, y 9 |
| XLI (S5INDU) | Lagging, N; x 10, y 10 | 98,42/99,85 Lagging, N; x 11, y 10 | 95,14/99,13 Lagging, N; x 10, y 10 |
| XLK (S5INFT) | Weakening, SO; x 3, y 11 | 100,16/97,76 Weakening, SO; x 5, y 11 | 100,39/97,69 Weakening, SO; x 4, y 11 |

### Scarti residui delle medie semplici

- **XLF, XLV, XLI e XLU**: con ETF solo prezzo contro ^GSPC, lo scarto da Bloomberg è entro 0,1 su entrambi gli assi.
- **XLRE ed XLE**: lo scarto è entro 0,3-0,4.
- **XLC, XLK, XLP e XLB**: lo scarto arriva a 0,5-1,2 su almeno un asse.

Il Real Estate mostra che, a parità di dati, lo scarto sparisce. Gli scarti residui vengono quindi quasi certamente dalla differenza tra l'ETF e l'indice S&P di settore. Gli ETF Select Sector seguono indici con limiti di peso per titolo, e hanno costi e composizione propri. Senza la storia degli altri indici di settore non si può dimostrarlo settore per settore: resta un'ipotesi.

XLC è il caso più evidente: Bloomberg disegna S5TELS in calo verso sud-ovest, mentre XLC (con tutte le formule) gira verso nord-est o sud-est.

## Cause delle differenze, in ordine di peso

1. **La formula.** È la causa principale.
   - La nuova mette la forza relativa in scala di volatilità (σ) e usa medie esponenziali. Per questo comprime l'asse x di circa 4 volte rispetto a Bloomberg.
   - La nuova cambia anche l'ordine sull'asse y. Esempio XLE: per la nuova il trend relativo sta già piegando (RS-Ratio 100,96 al 06/11 e 100,84 al 10/11, RS-Momentum a 100). Per Bloomberg e per le medie semplici XLE ha ancora uno dei momentum più alti (secondo per rango; medie semplici 102,76). XLF e XLY invece hanno per la nuova un momentum più alto.
   - Il quadrante resta quasi sempre lo stesso.
   - La classica è la più lontana.
2. **La settimana in corso.** Bloomberg con «Today» conta la settimana in corso come una barra, come l'app. Con la settimana chiusa al 06/11 le medie semplici si allontanano da Bloomberg.
3. **ETF contro indice.** Spiega gli scarti residui con le medie semplici (vedi sopra).
4. **Dividendi e benchmark (SPY o ^GSPC).** L'effetto è piccolo. Con le medie semplici, SPY con dividendi al posto di ^GSPC abbassa l'RS-Ratio di 0,20-0,21 per tutti i settori, senza cambiare l'ordine. Passare dall'ETF solo prezzo all'ETF con dividendi alza l'RS-Ratio di 0,1-0,7, di più per i settori con dividendi alti (XLRE 0,70, XLU 0,57, XLP 0,56, XLE 0,55). Questo basta a spostare XLP, che è vicino a 100, da un lato all'altro del bordo.
5. **Giorno di chiusura della settimana.** Non è una causa. Tutti e due chiudono la settimana all'ultima seduta prima del sabato: giovedì nelle settimane con il venerdì festivo.

## Cosa si sa pubblicamente della formula JdK

- **Formula proprietaria.** RS-Ratio e RS-Momentum sono marchi di RRG Research e la formula non è pubblicata.
  - Le descrizioni pubbliche dicono solo che l'RS-Ratio misura il trend della forza relativa, normalizzato attorno a 100, e che l'RS-Momentum misura la velocità di variazione (rate of change) dell'RS-Ratio, quindi lo anticipa.
  - Fonti: ChartSchool di StockCharts, «Relative Rotation Graphs (RRG Charts)», e l'articolo ChartWatchers «RRG tails have a story to tell». Le pagine di StockCharts sono state consultate solo tramite i risultati di ricerca, senza scaricarle.
- **Su Bloomberg.** La funzione `RRG <GO>` c'è dal gennaio 2011 ed è fornita da RRG Research / RRG Ltd (Julius de Kempenaer).
- **Settimana in corso.** Gli articoli di de Kempenaer su StockCharts («How Daily and Weekly RRGs Are Aligned», 2020) dicono che il grafico settimanale usa gli ultimi prezzi e che i nodi della coda avanzano di un periodo all'inizio della settimana nuova. È coerente con quanto trovato qui.
- **Formula a medie semplici.** È una ricostruzione pubblica: lo script AmiBroker «RRG 2.1» di WiseStockTrader, con le medie 10 e 30, già citato nel README principale. Non è un documento di RRG Research. Per questo vale la verifica empirica: coincidenza al centesimo con StockCharts (25/09/2026) e con Bloomberg sull'indice Real Estate (11/11/2026).

Indirizzi:
- https://chartschool.stockcharts.com/table-of-contents/chart-analysis/chart-types/relative-rotation-graphs-rrg-charts
- https://my.stockcharts.com/articles/chartwatchers/2021/05/rrg-tails-have-a-story-to-tell-362.html
- https://articles.stockcharts.com/article/articles-rrg-2020-05-how-daily-and-weekly-rrgs-are-869/
- https://www.optuma.com/blog/author/julius-de-kempenaer/ (RRG Research e Bloomberg dal 2011)

## Controlli (`verifica.mjs`): nessun bug trovato

- **Numeri dell'app.** Gli 11 valori letti dall'utente nell'app (settimanale, nuova, SPY, settimana in corso) si riproducono al centesimo dai dati pubblicati su `main` (commit `0c68f51`, dati al 10/11). Gli stessi valori escono dalle serie riscaricate ora da Yahoo, con scarto 0,0000.
- **Settimane.** 262 barre settimanali, tutte all'ultima seduta della settimana domenica-sabato, nessuna settimana spezzata. Le 9 barre non di venerdì sono tutte in settimane con il venerdì festivo (Venerdì santo, 4 luglio, Juneteenth, Natale). La settimana in corso è una barra sola, segnata come provvisoria.
- **Allineamento delle date.** ETF e benchmark hanno lo stesso calendario. `confronta.mjs` lo controlla e si ferma se le date sono diverse.
- **Formula a medie semplici.** Ricalcolata con un codice indipendente, coincide con `engine.js` (scarto 4·10⁻¹³).
- **Nota dell'app su SPY e indice.** La nota «con SPY l'RS-Ratio esce circa 0,2 più basso» è confermata: −0,20 / −0,21 per tutti i settori.

## Conclusione

- **Formula nuova (predefinita).** Contro Bloomberg non supera il criterio. I quadranti sono 10 su 11 e l'ordine sull'asse x è buono (0,92), ma l'ordine sull'asse y no (0,44). La scala orizzontale è circa 4 volte più stretta.
- **Medie semplici.** Supera il criterio con margine: quadranti 11 su 11, ρ 0,98 e 0,95, scala circa 1. Indice contro indice coincide con Bloomberg entro l'errore di lettura.
- **Cosa cambiare.** Nessuna correzione del codice è necessaria. Restano due decisioni per l'utente, perché riguardano le formule: come spiegare la differenza nella guida e se cambiare la formula predefinita o il benchmark.
