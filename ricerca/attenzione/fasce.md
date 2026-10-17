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
