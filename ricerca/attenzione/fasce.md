# Fascia di attenzione sopra il livello blu (settori S&P 500)

Analisi del 17/10/2026 (`script/fasce.mjs`), solo lettura: nessuna modifica all'app.

Domanda: a che distanza dal livello blu conviene «attivarsi»? Livello fisso, percentile della storia o caso per caso?

## Metodo
Breadth dei settori dal 2005, livelli blu di config/thresholds.json.
- **Allarme:** la breadth scende sotto la soglia dopo almeno 20 sedute sopra.
- **Arrivati:** quanti allarmi toccano il livello blu entro 6 mesi, e con quanto anticipo.
- **Tocchi avvisati:** quanti dei 73 tocchi del livello blu (dopo almeno 60 sedute sopra) erano stati preceduti da un allarme iniziato almeno 5 sedute prima.
- **Sedute in fascia:** quota di sedute sotto la soglia ma sopra il livello blu.
- **ETF a 3 mesi:** rendimento mediano dell'ETF del settore nei 3 mesi dopo l'allarme.

## Risultati

| Regola | Allarmi | Arrivano al blu | Anticipo mediano | Tocchi avvisati | Sedute in fascia | ETF a 3 mesi |
|---|---|---|---|---|---|---|
| fisso +10 punti (oggi) | 168 | 60% | 7 sedute | 50/73 | 4,4% | +6,5% |
| fisso +15 punti | 193 | 47% | 12 | 56/73 | 7,2% | +5,6% |
| 3 titoli sopra il livello | 151 | 61% | 5 | 41/73 | 4,0% | +6,5% |
| 10° percentile della storia | 194 | 47% | 9 | 54/73 | 6,7% | +5,8% |
| 15° percentile della storia | 240 | 35% | 22 | 57/73 | 11,8% | +4,6% |
| velocità: calo forte (q90) in 10 sedute | 224 | 41% | 23 | 59/73 | 12,2% | +4,6% |
| velocità: calo forte (q90) in 20 sedute | 251 | 33% | 30 | 61/73 | 17,0% | +4,2% |
| velocità 10 sedute + drawdown oltre il 50° pct | 205 | 38% | 24 | 51/73 | 10,7% | +4,6% |
| +10 punti + drawdown oltre il 50° pct | 150 | 57% | 8 | 45/73 | 4,0% | +6,5% |

## Conclusioni
- **La breadth scende in fretta.** Con la fascia di oggi (+10 punti) l'anticipo mediano è di 7 sedute; nei settori con pochi titoli (Real Estate, Utilities, Sanità, Industriali) è di 2–3 sedute.
- **Più anticipo vuol dire più falsi allarmi.** Nessuna regola fa meglio su tutto.
- **Il percentile misura quanto è rara la breadth, non quanto è vicina al livello blu.** Dà soglie molto diverse tra settori (Staples 33, Energia 9) senza un motivo legato al livello.
- **Un livello fisso è troppo stretto per i settori piccoli.** In Utilities e Real Estate un titolo vale 3–5 punti, quindi la breadth attraversa la fascia in pochi giorni.
- **La velocità del settore dà una soglia per settore calcolata dai dati, non scelta a mano.** Vuol dire livello blu più il calo forte (q90) della breadth in 10 sedute: da lì in un calo forte si arriva al blu in circa due settimane. Anticipo mediano circa un mese e 59 tocchi del blu su 73 avvisati, ma solo il 41% degli allarmi arriva al blu.
- **Il filtro sul drawdown non aiuta:** la breadth crolla prima che il drawdown diventi profondo.
- **Entrare in fascia non è un segnale di vendita:** a 3 mesi l'ETF sale in mediana.

## Proposta (da confermare)
Due fasce sulla Bottom Map:
1. **Avvicinamento** (nuova, per settore): livello blu + calo forte in 10 sedute. Serve per la watchlist: guardare viste 4 e 7. Soglie al 16/10/2026:
   XLK 26, XLC 26, XLY 26, XLP 30, XLE 30, XLF 28, XLV 28, XLI 26, XLB 33, XLRE 40, XLU 36.
2. **Attenzione** (quella di oggi, +10 punti): attivarsi.

Al 16/10/2026: XLRE è in Attenzione (17 contro 18), XLU in Avvicinamento (16 contro 36).

## Indici (pagina 6), 17/10/2026
Stessa prova sui 22 indici (`script/indici.mjs`):

| Regola | Arrivano al blu | Anticipo mediano | Tocchi avvisati |
|---|---|---|---|
| fisso +10 punti | 57% | 9 sedute | 83/134 |
| velocità del settore/indice (10 sedute) | 47% | 20 sedute | 96/134 |

Ricalcolato il 18/10/2026 dopo la correzione dello script (prima leggeva solo `data/indices.json`, cioè i 10 principali, e dava 46/62): stessi valori. La statistica usa la storia di ogni indice, la più lunga dal 2000 (Dow e S&P/TSX 60).

La regola tiene anche sugli indici. È applicata come per i settori: anello e voce «Avvicinamento», senza stati né alert.

## Rifatta il 31/10/2026: soglia del giorno e stato Normale (`script/avvicinamento_pit.mjs`)
La prova sopra usa una soglia unica calcolata su tutta la storia, cioè anche con dati futuri, e conta ogni discesa sotto la soglia in qualsiasi stato. Dalla 1.3.0 l'app calcola la soglia di ogni seduta con la sola storia fino a lì e mostra l'avvicinamento solo in stato Normale. Stesse definizioni di sopra, settori dal 2005 (`avvicinamento_pit.json`):

| Regola | Allarmi | Arrivano al blu | Anticipo mediano | Tocchi avvisati | ETF a 3 mesi (positivi) |
|---|---|---|---|---|---|
| A. soglia su tutta la storia (la prova di sopra) | 224 | 41% | 23 sedute | 59/73 | +4,6% (68%) |
| B. soglia fino a quel giorno | 228 | 41% | 25 | 62/73 | +4,6% (69%) |
| C. B solo in stato Normale (quello che l'app colora) | 180 | 36% | 27 | 42/73 | +4,6% (71%) |
| D. C oppure stato Attenzione | 278 | 31% | 23 | 59/73 | +5,2% (74%) |
| E. solo stato Attenzione | 213 | 31% | 12 | 44/73 | +5,8% (78%) |
| Tutte le sedute (base) | 53.621 | | | | +3,3% (68%) |

- La soglia senza dati futuri non peggiora la regola (B contro A).
- Da sola, come la mostra l'app (C), l'avvicinamento avvisa 42 tocchi su 73: gli altri arrivano quando il settore è già in Attenzione o con crolli da breadth alta (agosto 2011, marzo 2020, dicembre 2018), che nessuna fascia anticipa.
- Insieme all'Attenzione (D) i tocchi avvisati sono 59 su 73 con un anticipo mediano di 23 sedute, contro 44 e 12 sedute della sola Attenzione: l'avvicinamento raddoppia circa l'anticipo e aggiunge 15 tocchi, al prezzo di più allarmi (278, il 31% arriva al blu).
- Il rendimento dopo l'allarme è poco sopra quello di tutte le sedute: non è un segnale operativo.
- Limiti: la regola (q90 a 10 sedute) è stata scelta tra nove su questa stessa storia; i livelli blu sono quelli di oggi; i tocchi si concentrano in poche crisi (2008, 2011, 2020, 2022), quindi non sono 73 casi indipendenti.
- I testi dell'app che citano «59 tocchi su 73» riportano la prova A, non la regola che l'app mostra: correzione proposta all'utente.
