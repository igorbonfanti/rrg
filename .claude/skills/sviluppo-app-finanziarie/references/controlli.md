# Controlli prima della pubblicazione

Da leggere prima di lanciare gli agenti della fase 3. Ogni agente ha un tema, lavora sulla versione di sviluppo servita in locale e non riceve le conclusioni di chi ha scritto il codice. Lanciali in parallelo, in un solo messaggio.

## Cosa dare a ogni agente

- ramo e commit da controllare, e come servire l'app in locale (comando del server, porta);
- cosa è cambiato in questa versione e cosa dovrebbe succedere (dal punto di vista di chi usa l'app);
- il tema del controllo (sotto) e le dimensioni dello schermo;
- dove salvare script, screenshot e rapporto (per Sector Monitor `ricerca/qa/<versione>/`);
- il formato del rapporto (in fondo).

Non dare: la tua opinione su cosa funziona, né l'elenco di cosa hai già controllato. Altrimenti l'agente lo conferma invece di cercarlo.

## I cinque temi

### 1. Numeri e dati
- Ricalcola dalle fonti, con uno script indipendente dall'app, i numeri toccati dalla modifica (e un campione degli altri), e confrontali con quelli che la pagina mostra davvero nel browser, non con quelli del modulo JavaScript.
- Ultima data dei dati, sedute mancanti, valori ricopiati, «—» dove manca un dato (mai uno zero o un valore inventato).
- Valori storici calcolati come si vedevano allora (nessun dato futuro).
- Confronto con una seconda fonte quando esiste.

### 2. Testi
- Ogni frase con un numero, in app, guida, README, note di versione, tooltip e messaggi: il numero è giusto, viene da uno script del repository e si riferisce alla regola che l'app mostra.
- La stessa informazione è uguale ovunque (cerca tutte le copie).
- Le approssimazioni sono dichiarate; nessuna promessa di rendimento; avvertenze presenti; fonti e autori citati come chiede il progetto.
- Italiano chiaro, frasi brevi, termini spiegati.

### 3. Grafici
- Ogni elemento nuovo è nel posto giusto: valori alle date giuste, scale, assi, etichette, legenda che corrisponde a quello che si vede.
- Mirino e riquadri dei valori: mostrano i numeri della seduta sotto il puntatore.
- Colori leggibili in tema chiaro e scuro, contrasto, nessuna sovrapposizione di etichette, niente tagliato ai bordi.
- Periodi diversi (breve, lungo, tutta la storia): il grafico resta leggibile anche con molti elementi.
- Bordi del periodo: un tratto, una banda o un evento che inizia prima del periodo mostrato (o finisce dopo) non deve sembrare iniziare (o finire) sul bordo.
- Screenshot a 1440, 1280, 390 e 360 px, chiaro e scuro.

### 4. Usabilità e funzioni
- Percorsi reali di chi usa l'app: «voglio sapere se il settore X è vicino al bottom», «voglio vedere lo storico degli episodi», «apro l'app dal telefono». Si arriva all'informazione in pochi passi? È chiaro cosa significa?
- Clic, tocchi, tastiera, comandi, tasto Indietro, link esterni, pannelli che si aprono e chiudono, scelte ricordate.
- Computer prima (1440 e 1280 px), poi telefono (390 e 360 px, tocco); tablet 820 px se la modifica tocca l'impaginazione.
- Console senza errori, tempi di apertura ragionevoli, comportamento con dati vecchi o mancanti.

### 5. Codice e pipeline
- Lettura del diff: casi limite (dati mancanti, primo e ultimo giorno, serie corte), cache, prestazioni, sintassi di tutti i file.
- Se la modifica tocca l'aggiornamento notturno: cosa succede se una fonte non risponde, se una corsa parte due volte, se il ricalcolo non ha abbastanza storia; nessun dato pubblicato senza controllo.
- Test automatici del progetto e test nuovi per i calcoli nuovi.

## I controlli devono poter fallire

Un controllo che passa anche sulla versione sbagliata non controlla niente. Per ogni controllo nuovo:

- fallo girare anche sulla versione senza la modifica o senza la correzione: deve fallire;
- controlla che i parametri del test siano valori che l'app accetta (un periodo «3Y» dove l'app usa «3A» fa girare il test sul periodo di default e lo fa passare a vuoto);
- conta quanti elementi ha davvero controllato (zero elementi controllati non è un verde).

## Formato del rapporto

```
# Controllo <tema> · versione <x.y.z> · commit <sha>

Verdetto: GO / NO-GO

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|

Gravità: bloccante (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer),
da correggere, minore.

Cosa ho verificato e passa: elenco breve, con il numero di controlli.
Cosa non ho potuto verificare e perché.
Script e screenshot: <percorsi>.
```

## Dopo i rapporti

1. Riproduci tu ogni bloccante e «da correggere» prima di correggerlo (alcuni rilievi si rivelano falsi).
2. Correggi, poi fai ricontrollare i punti corretti, possibilmente dallo stesso tema ma con un agente nuovo.
3. GO quando non restano bloccanti né «da correggere». I minori aperti vanno nella documentazione dello stato del progetto.
4. Salva gli script dei controlli: le regressioni nel browser si rilanciano alla versione dopo.
