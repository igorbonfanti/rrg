# Confronto con il grafico «Cap-Weighted vs Equal-Weight» di Rea (16/10/2026, 3 mesi)

Analisi del 17/10/2026, solo lettura. Ho letto i pallini di Rea da uno screenshot (precisione di lettura ±0,1 punti) e li ho riprodotti con i nostri prezzi, provando varie combinazioni di metodo (`script/confronto_rea.mjs`).

## Il metodo di Rea, ricostruito

| | Rea | Noi (vista 7 Titoli) |
|---|---|---|
| Inizio di «3 mesi» | 3 mesi di calendario: primo prezzo il 17/07 | 63 sedute: primo prezzo il 20/07 |
| Equal-weight | media semplice dei rendimenti dei membri di oggi | indice simulato con i membri di ogni data, ribilanciato ogni trimestre come gli indici S&P |
| Cap-weighted | media dei rendimenti pesata con la capitalizzazione di oggi (fine periodo), probabilmente totale (Yahoo) | rendimento dell'indice: pesi di inizio periodo che seguono i prezzi, azioni del flottante (holdings IVV) |
| Prezzi | solo prezzo | solo prezzo |

**Equal-weight.** Media semplice con partenza il 17/07: scarto medio 0,21 punti. Coincidono Sanità, Energia, Tecnologia, Materiali, Discrezionali, Utility e Real Estate. Restano fino a 0,6 punti in Industriali, Staples, Finanza e Comunicazione: probabilmente la lista dei membri è diversa.

**Cap-weighted.** Con i pesi di oggi lo scarto medio è 0,68 punti. Coincidono Tecnologia (8,16 contro 8,14), Energia, Utility, Real Estate e Staples. Resta circa 1 punto dove contano le doppie classi di azioni e i grandi azionisti stabili (Comunicazione, Finanza, Materiali): coerente con la capitalizzazione totale invece del flottante.

## Perché i pesi di fine periodo non sono il rendimento di un indice

Pesare con la capitalizzazione di oggi dà più peso, a posteriori, ai titoli saliti di più: il risultato è sempre almeno pari al rendimento vero di un indice a capitalizzazione, e più alto quanto più i rendimenti sono dispersi.

| 3M dal 17/07 | Cap di Rea | Cap reale (buy-and-hold) | ETF SPDR |
|---|---|---|---|
| Tecnologia | 8,14 | 5,81 | 4,49 |
| Sanità | 12,86 | 9,89 | 9,70 |
| Materiali | 5,14 | 2,40 | 0,77 |

Due settori cambiano chi è davanti: Tecnologia (Rea −1,2, cioè guidano i grandi; noi +0,4) e Industriali (Rea −0,7; noi +0,4).

## Decisione (17/10/2026)

Si tiene il nostro metodo (rendimento reale degli indici, verificato sugli ETF RSP* e SPDR) e si aggiunge nella vista una nota che spiega la differenza (opzione 1 di 3; le altre erano allineare solo le date o aggiungere un interruttore «come Rea»).
