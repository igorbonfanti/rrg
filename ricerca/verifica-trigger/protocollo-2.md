# Protocollo di verifica, secondo giro: metà al tocco della zona blu, metà al trigger

Congelato il 26 settembre 2026, prima di calcolare la regola. Vale tutto quanto previsto da `protocollo.md`, salvo quanto scritto qui.

## Perché è un giro esplorativo

L'ipotesi nasce dai risultati del primo giro. Lì comprare all'ingresso in zona blu aveva reso di più del trigger (in media 21,5% contro 16,3%), ma con più rischio. La nuova regola usa quindi gli stessi 48 episodi da cui è nata: anche un esito positivo va confermato sulle prossime zone blu, a partire da XLU, prima di cambiare l'app.

Il primo giro permette già di prevedere il risultato a grandi linee. Se nessuna delle due metà incontra un fallimento, il rendimento di un episodio è la media tra l'ingresso in zona blu e il trigger. Le differenze per periodo dovrebbero quindi avere lo stesso segno di quelle dell'ingresso in zona blu, che era migliore del trigger in 5 periodi su 7.

## Regola C7

- **Prima metà:** si compra alla chiusura successiva al primo giorno di zona blu (T0).
- **Seconda metà:** si compra alla chiusura successiva al trigger attuale, identico all'app.
- **Fallimento:** se entro 20 sedute dal trigger il prezzo chiude sotto il minimo della zona blu meno un'escursione giornaliera media, si esce da tutta la posizione, entrambe le metà. Al trigger successivo, che richiede due conferme, si rientra con tutta la posizione.
- **Prima del trigger** la prima metà non ha stop.
- **Il resto è invariato:** finestre, esecuzione, costi, misure (punto 6) e precisazioni (punto 11). Per la quota di rimbalzo persa e le false partenze conta il primo acquisto, cioè quello in zona blu.

## Criteri

C7 si giudica come una regola a ingresso unico, cioè con i criteri 1–5 del punto 7, perché punta ad aumentare il rendimento senza aumentare troppo il rischio. Il test con date casuali si corregge per 8 regole, contando anche le 7 del primo giro.

Si riportano anche, solo come informazione, il caso peggiore, il rendimento mediano e il confronto con C4 e con l'ingresso in zona blu.

## Robustezza

Si controlla che il risultato regga in questi casi:

- un giorno di ritardo nell'esecuzione;
- con stop, applicato come nel punto 11.11 e solo dopo il trigger;
- pesi diversi: un terzo in zona blu e due terzi al trigger, oppure due terzi e un terzo;
- togliendo un periodo alla volta;
- togliendo insieme 2008–09 e 2020;
- in entrambe le metà del campione.

## Esito possibile

- **Se C7 passa:** resta un risultato esplorativo, da seguire dal vivo sulle prossime zone blu prima di cambiare l'app.
- **Se non passa per la sola coerenza tra i periodi:** la scelta diventa una preferenza tra rendimento e rischio, da prendere sapendolo, non un miglioramento dimostrato.
