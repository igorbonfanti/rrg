# Profilo dei volumi degli ultimi 12 mesi accanto al grafico · fase 1

(bozza: criterio e metodo scritti prima di calcolare qualsiasi profilo; i risultati si aggiungono sotto)

## Criterio di stabilità (deciso prima di guardare i risultati)

Per ogni mercato il profilo è **mostrabile** se passa tutte e tre le prove:

- **(a) value area**: la value area del 70% (si parte dalla fascia più piena e si aggiunge ogni volta la fascia vicina più piena, finché si arriva al 70% del volume) calcolata con il metodo scelto e con le alternative (giornaliero spalmato e orario spalmato, ciascuno con 50, 100 e 200 fasce: 6 profili) ha il bordo basso entro il 2% (massimo / minimo − 1 ≤ 2%) e il bordo alto entro il 2%;
- **(b) forma**: la sovrapposizione tra il profilo scelto e ognuna delle 5 alternative è almeno 0,85. Sovrapposizione = somma, fascia per fascia, del minimo delle due quote (quota = volume della fascia / volume totale). Fasce comuni: le due griglie hanno gli stessi estremi; quella più fine si somma su quella più grossa (200 → 100 → 50);
- **(c) da un giorno all'altro**: con la finestra mobile di 12 mesi, il profilo del metodo scelto calcolato alla fine di ognuna delle ultime 60 sedute ha sovrapposizione almeno 0,90 con quello della seduta prima (60 coppie; per ogni coppia la griglia è di 100 fasce tra il minimo e il massimo delle due finestre insieme). Passa se lo è in tutte le 60 coppie.

Metodo scelto (deciso prima): **giornaliero spalmato, 100 fasce uguali sulla scala logaritmica** tra il minimo e il massimo dei 12 mesi; strumento e scala dei prezzi per mercato nella sezione del metodo.
