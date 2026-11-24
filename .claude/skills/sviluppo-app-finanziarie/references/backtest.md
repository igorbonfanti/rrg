# Backtest e validazione di un'idea

Da leggere prima di lanciare l'agente del backtest nella fase 1. Lo scopo non è «dimostrare» che l'idea funziona, ma capire se fa davvero quello che vogliamo che faccia, quanto bene e con quali limiti.

## 1. Scrivere la domanda prima di guardare i dati

Prima di calcolare qualsiasi cosa, scrivi:

- **cosa deve fare la modifica**, in termini misurabili (per esempio «avvisare prima che la breadth tocchi il livello blu»);
- **come si misura** (per esempio «tocchi avvisati almeno 5 sedute prima, anticipo mediano, quota di avvisi che arrivano al livello»);
- **il confronto**: rispetto a cosa deve essere migliore (la regola di oggi, nessuna regola, tutte le sedute);
- **cosa conta come successo** e cosa come fallimento.

Se decidi il criterio dopo aver visto i numeri, finisci per scegliere quello che fa tornare l'idea.

## 2. Misurare la regola esatta che l'app mostrerà

Il backtest deve usare la stessa condizione che l'app mostrerà, con tutti i filtri (stato del settore, giorni validi, dati minimi), non una versione semplificata. Se la regola cambia durante lo sviluppo, il backtest si rifà. Il modo più sicuro è usare le stesse funzioni dell'app (importarle dallo script) e in più un ricalcolo indipendente scritto a parte.

## 3. Niente dati del futuro

Ogni valore usato in una data deve essere calcolabile con i soli dati disponibili quel giorno:

- soglie, percentili, medie e livelli si calcolano sulla storia fino a quella seduta (finestra crescente o mobile), non su tutta la storia;
- i rendimenti si misurano dalla chiusura del giorno del segnale (o del giorno dopo, se il segnale si conosce solo a mercato chiuso: dillo);
- i membri di un indice dovrebbero essere quelli di allora; se si usano quelli di oggi, è un'approssimazione da misurare e dichiarare;
- i livelli scelti oggi (per esempio i livelli blu di Rea) sono «col senno di poi»: dichiaralo nei limiti.

## 4. Confronto con una base

Un numero da solo non dice niente. Metti sempre accanto:

- la regola attuale (o le alternative ragionevoli);
- la base senza regola: per esempio il rendimento a 3 mesi di tutte le sedute, non solo di quelle dopo il segnale.

Se il risultato dopo il segnale è simile alla base, il segnale non aggiunge informazione su quel rendimento: va detto.

## 5. Quanto è robusto

- **Nel campione o fuori**: se la regola o i suoi parametri sono stati scelti guardando la stessa storia, i numeri sono «nel campione» e dal vivo andrà peggio. Quando è possibile, verifica su un periodo tenuto da parte (per esempio scegli fino al 2015 e verifica dopo) o lasciando fuori un settore o un indice alla volta.
- **Sensibilità**: cambia di poco i parametri (per esempio percentile 85, 90, 95; 5, 10, 20 sedute). Se il risultato cambia molto, la regola è fragile.
- **Casi indipendenti**: molti eventi cadono nelle stesse crisi (2008, 2011, 2020, 2022). Conta anche gli episodi distinti e guarda i risultati per crisi, non solo il totale.
- **Pochi casi**: con meno di una trentina di episodi indipendenti, le percentuali sono indicative. Riporta i numeri assoluti («42 su 73»), non solo le percentuali.
- **Per gruppo**: guarda i risultati per settore o indice; una media buona può nascondere gruppi dove la regola non funziona (per esempio i settori con pochi titoli).

## 6. Falsi allarmi e costo

Una regola che avvisa prima avvisa anche più spesso a vuoto. Riporta sempre insieme:

- quanti avvisi in tutto e quanti «arrivano» (veri);
- quanti eventi importanti sono stati avvisati e quanti persi, con l'elenco dei persi e il motivo;
- quanto tempo l'utente passa «in allarme» (quota di sedute).

## 7. Dati

- Controlla la copertura: date di inizio, buchi, festività, sospensioni, valori ricopiati.
- Un dato che manca resta mancante nel calcolo, non si riempie.
- Quando esiste una fonte indipendente, confronta un campione di valori (per esempio la breadth con una serie pubblica, i prezzi con un'altra fonte).

## 8. Cosa consegnare

- uno **script nel repository** (`ricerca/<tema>/script/...`) che rifà tutti i numeri, con in testa metodo e uso;
- un **file di risultati** (JSON) scritto dallo script;
- una **nota** (`ricerca/<tema>/<nome>.md`) con domanda, metodo, tabella dei risultati, conclusioni e limiti;
- il **ricalcolo indipendente** dei numeri che finiranno nei testi dell'app;
- il **verdetto**: procedi / procedi con modifiche / scarta, con il motivo.

Tabella tipo per confrontare regole:

| Regola | Avvisi | Arrivano | Anticipo mediano | Eventi avvisati | Persi | Base di confronto |
|---|---|---|---|---|---|---|

## 9. Brief tipo per l'agente del backtest

> Obiettivo: verificare se [modifica] fa [scopo] sui dati reali di [app], dal [anno].
> Ipotesi da verificare: [...]. Criterio di successo, deciso prima: [...]. Confronto con: [regola attuale, base].
> Regola esatta da misurare, come la mostrerà l'app: [condizione completa, con filtri]. Nessun dato futuro: [cosa va calcolato seduta per seduta].
> File: [funzioni dell'app da importare, file di dati, config]. Già escluso: [...].
> Fai anche: sensibilità ai parametri [valori], risultati per [gruppo] e per crisi, elenco degli eventi persi.
> Consegna: script in [percorso], risultati in JSON, nota con tabella, limiti e verdetto. Numeri solo da script, nessuna stima. Non modificare l'app.
