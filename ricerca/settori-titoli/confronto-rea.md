# Confronto con il grafico «Cap-Weighted vs Equal-Weight» di Rea (16/10/2026, 3 mesi)

Analisi del 17/10/2026, solo lettura. Il metodo di Rea è stato ricostruito guardando il suo grafico e provando varie combinazioni di metodo con i nostri prezzi (`script/confronto_rea.mjs`). Le letture del suo grafico non sono salvate nel repository (decisione dell'utente del 20/10/2026: niente dati estratti dalla piattaforma); qui restano solo il metodo e i nostri calcoli.

## Il metodo di Rea, ricostruito

| | Rea | Noi (vista 7 Titoli) |
|---|---|---|
| Inizio di «3 mesi» | 3 mesi di calendario: primo prezzo il 17/07 | 63 sedute: primo prezzo il 20/07 |
| Equal-weight | media semplice dei rendimenti dei membri di oggi | indice simulato con i membri di ogni data, ribilanciato ogni trimestre come gli indici S&P |
| Cap-weighted | media dei rendimenti pesata con la capitalizzazione di oggi (fine periodo), probabilmente totale (Yahoo) | rendimento dell'indice: pesi di inizio periodo che seguono i prezzi, azioni del flottante (holdings IVV) |
| Prezzi | solo prezzo | solo prezzo |

**Equal-weight.** La media semplice dei membri di oggi con partenza il 17/07 è la variante più vicina al suo grafico; dove resta una differenza, probabilmente la lista dei membri è diversa.

**Cap-weighted.** I pesi di oggi (fine periodo) sono la variante più vicina al suo grafico; le differenze maggiori restano dove contano le doppie classi di azioni e i grandi azionisti stabili (Comunicazione, Finanza, Materiali), coerente con la capitalizzazione totale invece del flottante.

## Perché i pesi di fine periodo non sono il rendimento di un indice

Pesare con la capitalizzazione di oggi dà più peso, a posteriori, ai titoli saliti di più: il risultato è sempre almeno pari al rendimento vero di un indice a capitalizzazione, e più alto quanto più i rendimenti sono dispersi.

Esempio con i nostri prezzi, 3 mesi dal 17/07 al 16/10/2026, Tecnologia: 8,2% con i pesi di fine periodo, 5,8% con i pesi di inizio periodo (buy-and-hold, il rendimento di un indice), 4,5% l'ETF SPDR XLK.

## Decisione (17/10/2026)

Si tiene il nostro metodo (rendimento reale degli indici, verificato sugli ETF RSP* e SPDR) e si aggiunge nella vista una nota che spiega la differenza (opzione 1 di 3; le altre erano allineare solo le date o aggiungere un interruttore «come Rea»).
