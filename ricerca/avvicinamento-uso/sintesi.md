# Avvicinamento: serve? (31/10/2026)

Ricerca nata dalla domanda di Igor: il segnale di avvicinamento ha un uso pratico e preventivo? Nessuna modifica all'app.
Due agenti indipendenti (`backtest.md`, `casi_varianti.md`) e due ricalcoli separati (`script/verifica_uso.mjs`,
`script/verifica_regole_uso.mjs`). Settori S&P 500, dalla prima seduta con uno stato (XLC dal 2019, XLRE dal 2016),
regola esatta dell'app (soglia del giorno, solo in stato Normale), 158 ingressi in 23 periodi distinti.

## Verdetti (criteri fissati prima)

| Uso | Verdetto | Numeri |
|---|---|---|
| Preavviso della zona blu | incerto, utile come promemoria | zona blu entro 63 sedute 17,1% contro 3,7% delle sedute normali (×4,6), entro 126 23,3% contro 9,2% (×2,5); regge nelle due metà ma in 6 settori su 10; precisione come l'Attenzione ma circa 2 settimane prima (33 sedute alla zona blu contro 17,5) |
| Avviso di rischio sul prezzo | non utile | calo massimo mediano a 63 sedute −3,3%, uguale alle sedute normali |
| Zona d'acquisto | non utile | +4,8% a 63 sedute contro +3,0% (base) e +5,1% (trigger); quando arriva davvero al bottom, al trigger il prezzo è più basso (−5,2% in mediana) e in mezzo il calo è −14% |

Ricalcolo separato: stessi 158 ingressi, 26/152 e 35/150 in zona blu, base 3,7% e 9,2%, calo −3,3% contro −3,3%. Differenze
solo di convenzione (mediana di un numero pari di valori: 4,6 contro 4,8; rapporto 4,58 contro 4,62 per il conteggio
della base). Corretto un errore dello script del backtest sulla quota di sedute (XLRE 12,1%, non 46,4%).

## Regole d'uso che reggono al ricalcolo

1. Alla terza seduta dall'ingresso, se il settore è già in Attenzione il livello blu arriva entro 126 sedute nel 46% dei
   casi (17/37; 46% in entrambe le metà), contro circa il 28% se è ancora in avvicinamento (16/58) o tornato sopra la soglia
   (15/55). Lo script dell'agente dava 45/23/31%: la distinzione tra «ancora giallo» e «tornato sopra» non regge al
   ricalcolo, il passaggio in Attenzione sì.
2. Se il settore ha toccato il livello blu nelle 126 sedute prima, l'avvicinamento è una risalita dopo un bottom: 5/24
   (21%) contro 43/126 (34%). Pochi casi e nel 2005–2015 solo 5: indicativo (caso tipico: XLRE da aprile a ottobre 2025. Correzione del 31/10/2026: XLRE oggi non rientra, perché a ottobre 2026 la breadth è scesa al 10% il 19/10 senza toccare il livello 8%; l'ultimo tocco è del 10/04/2025).

## Testi dell'app da correggere

Le statistiche dei testi (1.3.1) contano anche i tocchi del livello di XLC prima del 2019 e di XLRE prima del 2016, quando
l'app non ha uno stato. Sul periodo che l'app mostra (ricalcolo separato): settori, avvicinamento da solo 33/63, con
l'Attenzione 50/63 (anticipo mediano 24 sedute), sola Attenzione 43/63 (12 sedute), circa uno su tre arriva al livello;
indici, 83/132 da solo, 89/132 con l'Attenzione (23 sedute), sola Attenzione 83/132 (13 sedute), 40% arriva al livello.
