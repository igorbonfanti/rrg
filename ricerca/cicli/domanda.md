# C'è un pattern nel susseguirsi dei cicli degli asset? · domanda e criteri

Fase di ricerca del 22/11/2026 (sola lettura sull'app). Richiesta dell'utente: «Il mio obiettivo è capire se c'è un pattern
nel susseguirsi dei cicli degli asset. Studiaci approfonditamente.» Le traiettorie sovrapposte (`ricerca/rotazione-bolle/traiettorie/`)
non sono piaciute: resta la linea del tempo a punti della 1.12.0.

Lo studio precedente (`ricerca/rotazione-bolle/backtest.md`) guardava solo i massimi, solo attorno ai cali dell'S&P 500
dal 2000. Qui si allarga: massimi **e** minimi, senza ancorarsi all'S&P 500, con modelli nulli, e con la storia lunga per
l'ipotesi classica dei mercati collegati (Pring/Murphy: tassi, poi azioni, poi materie prime, ai massimi e ai minimi).

Criteri decisi **prima** dei risultati (22/11/2026):

1. **Ordine che si ripete** (concordanza): in un insieme di cicli comuni, l'ordine dei punti di svolta dei mercati è più
   simile da un ciclo all'altro di quanto accadrebbe per caso. Modello nullo: ogni serie spostata nel tempo di una
   quantità casuale (spostamento circolare dei punti di svolta o della serie), che conserva quanti cicli ha e quanto durano
   ma rompe gli allineamenti. Regge se p < 0,05 per i massimi e per i minimi, ad almeno 2 soglie su 3 (15, 20, 30%).
2. **Coppia guida-seguace**: per la coppia (A, B), B gira dopo A nello stesso verso in almeno il 75% dei casi, con almeno
   8 casi, p < 0,05 contro il modello nullo dopo la correzione per i test multipli (Benjamini-Hochberg), e vale in
   entrambe le metà del campione.
3. **Fuori campione**: l'ordine stimato sulla prima metà del campione prevede quello della seconda meglio del caso.
4. **Utilità**: quando il «guida» gira, il «seguace» gira entro la finestra prevista più spesso della frequenza di base,
   con un anticipo (dal giorno in cui la svolta del guida è confermata) che lascia tempo per agire.

Un pattern che passa 1-3 ma non 4 è descrittivo, non un segnale. Ogni numero da uno script in `ricerca/cicli/`.

- `lead-lag/`: i 9 mercati del pannello (dal 2000, più lunghi dove ci sono), massimi e minimi, coppie e ordine globale.
- `pring/`: storia lunga (dal secondo dopoguerra dove possibile), tassi, azioni, materie prime, dollaro, recessioni NBER.
