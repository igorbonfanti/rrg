# Breadth a 50 sedute sugli indici: c'è un pattern per un'allerta? (31/10/2026)

Domanda di Igor: sui grandi indici il livello blu (breadth a 200) si tocca solo nelle crisi, mentre i minimi locali sembrano
segnalati dalla breadth a 50 sedute. C'è un pattern utilizzabile come allerta? Nessuna modifica all'app.

## Verdetto: no

Cinque regole fissate prima (`pattern.md`), calibrazione 2001–2013 e verifica 2014–oggi, 22 indici e 11 settori: nessuna
supera il criterio. Ricalcolo separato della regola principale (`script/verifica_r1.mjs`): 443 segnali (439 nello script
dell'agente; differenza nell'inizio delle 500 sedute), nel 2001–2013 positivi a 63 sedute 62,5% contro 62,6% della base,
nel 2014–oggi 71,1% contro 63,4%; calo massimo a 63 sedute dopo il segnale più profondo della base in entrambi i periodi
(−6,1 contro −4,4; −4,5 contro −3,7). La breadth a 50 bassa segna fasi agitate, non minimi: funziona nei rimbalzi a V
(2015-16, 2025) e scatta di continuo nei mercati orso (2008: 45 segnali su 47 seguiti da altri cali, mediana −40,7%).

## Dati (`dati.md`)

Breadth a 50 e 20 sedute usabili (ricalcolo dai prezzi identico per DAX, CAC, SMI, Dow d'epoca; S&P 500 vicino a una fonte
esterna). Problemi: EEM nelle feste cinesi (68 sedute), indici con pochi titoli (SMI), membri di oggi (bias sulla 50 circa
metà di quello sulla 200).

## Da correggere nell'app (proposto a Igor)

La cifra «+4,5 punti» del bias dei membri di oggi (tooltip della vista Indici, README) viene da una prova che escludeva dal
denominatore i titoli con meno di 200 chiusure, mentre l'app li conta «sotto». Con la regola dell'app (stessi prezzi,
`ricerca/indici/script/membri_oggi_ndx_regola_app.mjs`): +3,6 in media (3,56; 3,5 senza la pulizia dei prezzi `clean()` che l'app applica), mediana 3,6, da −6,4 a +17,2; +1,1 nelle 5 date
con la breadth sotto il 20%. Ricalcolo separato dell'agente dei dati: +3,6 (`script/bias.mjs`).
