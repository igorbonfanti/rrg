# Controllo testi (e numeri dei testi) · versione 1.3.3 · commit fa508e4

Verdetto: **NO-GO** (nessun bloccante: tutti i numeri sono giusti; restano 4 punti «da correggere», tutti di testo)

Ricalcolo indipendente: `ricalcolo.mjs` (scritto da zero; usa dall'app solo runMachine, breadthSeries, priceSeries,
indexSeries, approachSeries e approachLevel per un controllo a campione). Dati al 2026-10-30.

## Frasi con un numero toccate dal diff

| Dove | Frase | Ricalcolo | Regola e periodo dell'app | Descrizione |
|---|---|---|---|---|
| README 67, guida 162, index.html 728, bottom.js 242 e 440, signals.js 86, version.js 11, README 155 | settori: con l'Attenzione 50 tocchi su 63; da sola 33 | D 50/63, C 33/63 | sì (stato Normale, soglia del giorno, dalla prima seduta con stato: XLC 20/06/2019, XLRE 07/10/2016) | ok |
| README 67, guida 162 | anticipo mediano 24 sedute contro 12 della sola Attenzione; 43 tocchi della sola Attenzione | D 24, E 12, E 43/63 | sì | numero ok, descrizione vedi #3 |
| guida 162, index.html 728, bottom.js 242/440 | «circa un mese di anticipo invece di due settimane e mezzo» | 24 e 12 sedute | sì | ok per la metrica dello script; vedi #3 |
| README 67, guida 162, index.html 728, bottom.js, signals.js | arriva al livello il 32% / «circa un avvicinamento su tre» | 50/158 = 31,6% | sì | ok |
| README 79, index.html 723, indices.js 395, README 155, version.js 11 | indici: con l'Attenzione 89 su 132, anticipo 23 contro 13; da sola 83; 40% arriva | D 89/132 · 23; E 83/132 · 13; C 83/132, 133/330 = 40% | sì (dalla prima seduta con stato; 5 indici partono un anno dopo la breadth) | ok; vedi #7 |
| README 67, guida 166 | zona blu entro 126 sedute (sei mesi) 23% contro 9% delle sedute normali | 35/150 = 23,3%; base (Normale non in avvicinamento) 3651/39638 = 9,2% | sì | «circa una volta su quattro» accettabile |
| README 67, guida 163 | calo massimo a 63 sedute uguale a quello delle sedute normali (−3,3%); «non scende più del solito» | −3,34 contro −3,34 (mediana classica −3,30 / −3,34) | sì | ok |
| README 67 | rendimento a 3 mesi +4,6% contro +3,3% in mediana | +4,61 (mediana bassa; classica +4,78) contro **tutte le sedute** +3,29; contro le **sedute normali** +2,97 | sì | **#1** |
| guida 163 | chi compra prima di un vero bottom: calo mediano del 14% | 42 episodi (zona blu e trigger entro 252 sedute), calo dall'ingresso al trigger −14,0 (mediana bassa −14,3) | sì | ok; vedi #10 |
| README 67, guida 167 | terza seduta in Attenzione 46%; altrimenti 27% («ancora giallo o tornato sopra», «poco più di una su quattro») | 17/37 = 45,9%; 31/113 = 27,4% (16/58 e 15/55) | sì | ok; «circa metà» un po' generoso; vedi #9 |
| guida 168 | tocco del livello negli ultimi sei mesi: 21% contro 34%, pochi casi | 5/24 = 20,8%; 43/126 = 34,1% | sì | ok |
| guida 169 | «regge meglio dove ci sono più episodi (XLE, XLF, XLB); in XLRE, che ha la soglia più alta, non distingue nulla» | ingressi: XLB 27, XLU 24, XLE 19, XLF 18, XLRE 15; R126/R63 ≥ 2 in XLY, XLP, XLE, XLF, XLI, XLB; XLU 1,63; XLRE 1,10/1,30 (2/14 contro 12,9%); soglia di oggi XLRE 39,8 (la più alta) | sì | **#2** |
| guida 162, index.html 728 | XLC dal 2019, XLRE dal 2016 | prima seduta con stato 20/06/2019 e 07/10/2016 | sì | ok |

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | README.md:67 | Nella parte «Uso pratico (`ricerca/avvicinamento-uso/`)» la frase «il calo massimo… è uguale a quello delle sedute normali (−3,3%) e il rendimento a 3 mesi poco sopra (+4,6% contro +3,3% in mediana)» mescola due basi. +3,3% è la mediana di **tutte** le sedute (`avvicinamento_pit.mjs`, base 53.117 sedute); contro le sedute normali, la base della ricerca citata, è +3,0% (e la ricerca stessa scrive +4,8% contro +3,0% in `sintesi.md`). Letta così, la frase dà un numero sbagliato per la base che nomina. | `node ricerca/qa/1.3.3/testi/ricalcolo.mjs`, riga «rendimento 63» | output.txt: ingressi 4,61/4,78; base Normale 2,97; tutte le sedute 3,29 |
| 2 | da correggere | guida.html:169 | «Regge meglio dove ci sono più episodi (XLE, XLF, XLB)» non è sostenuto dai dati. XLU ha 24 ingressi, più di XLE (19) e XLF (18), e non regge (R126 1,63). XLY, XLP e XLI reggono (R ≥ 2 a 63 e 126 sedute) con pochi episodi. Il criterio della ricerca (`backtest.md`:72) dà 6 settori su 10: XLY, XLP, XLE, XLF, XLI, XLB. Proposta: «regge, con più casi, in XLE, XLF e XLB; non regge in XLK, XLV, XLU e XLRE; in XLRE (soglia più alta, 2 zone blu su 14 ingressi) la zona blu arriva come in una seduta qualsiasi». | output.txt, sezione «per settore» | R126 e numero di ingressi per settore |
| 3 | da correggere (c'era già dalla 1.3.1) | guida 162, index.html 728, bottom.js 242 e 440, README 67 | «Ha avvisato 50 tocchi su 63, con circa un mese di anticipo (mediana 24 sedute) invece di due settimane e mezzo (12)». Il 24 e il 12 sono l'anticipo **degli allarmi che arrivano**: dall'allarme al primo tocco, su 71 e 65 allarmi. La frase lega l'anticipo ai **tocchi avvisati**, e misurato lì il vantaggio è molto più piccolo: dal primo allarme della finestra 39 contro 31 sedute, dall'ultimo 23 contro 22. Il numero è giusto per la definizione dello script; la frase fa capire che l'avvicinamento raddoppia il preavviso dei tocchi, e non è così. Proposta: «quando scatta un avviso che poi arriva al livello, il livello arriva in mediana dopo 24 sedute (12 con la sola Attenzione)». In alternativa, citare l'anticipo sui tocchi. | `node ricerca/qa/1.3.3/testi/anticipo_tocchi.mjs` | output_anticipo_tocchi.txt |
| 4 | da correggere | ricerca/attenzione/fasce.md:59-75 (citato in js/signals.js:85 come fonte) | La sezione «Rifatta il 31/10/2026» riporta ancora 59/73, 42/73, 44/73, 224/180/278 allarmi, base 53.621 e indici 86/92/84 su 135, con «l'avvicinamento raddoppia circa l'anticipo». Lo script che ha accanto (`avvicinamento_pit.mjs`) ora dà 50/63, 33/63, 43/63 e 132 per gli indici. La fonte citata dal codice contraddice i testi. | `git show fa508e4:ricerca/attenzione/fasce.md` | grep in testa al rapporto |
| 5 | minore | js/bottom.js:242 (legenda), :440 (tooltip), js/signals.js:85 | Scrivono «Dal 2005» o «nel campione dal 2005» senza «(XLC dal 2019, XLRE dal 2016)», che invece c'è in index.html:728 e in guida.html:162. Il tooltip compare anche nella pagina di XLC e di XLRE. | lettura | — |
| 6 | minore | docs/sviluppo.md:159 (solo sul ramo di sviluppo); ricerca/avvicinamento-uso/casi_varianti.md:156 | sviluppo.md riporta ancora «42 tocchi su 73… 59 su 73… 86 su 135, 92». casi_varianti.md dice 21% contro **35% (45/128)**, la guida 34% (43/126) come il ricalcolo `verifica_regole_uso.mjs`. La differenza è spiegata solo in `sintesi.md`. | lettura | il mio ricalcolo: 43/126 |
| 7 | minore | js/indices.js:395, index.html:723, README.md:155 | Indici «dal 2000» o «la più lunga dal 2000»: il conteggio parte dalla prima seduta con stato, un anno dopo l'inizio della breadth per DJI e TSX60 (2001), SX5E e NIFTY50 (2008) e CSI300 (2013). Il README:79 lo dice, i due testi dell'app no. La nota 1.3.3 spiega la correzione solo con XLC e XLRE, ma il cambio degli indici (135 → 132) viene da questi 5 indici. | `verifica_pit.mjs`, riga «indici con stato dopo l'inizio della breadth» | — |
| 8 | minore | guida.html:170 | «Le decisioni restano quelle della zona blu e del trigger» si può leggere come un'indicazione operativa (comprare in zona blu o al trigger). Più neutro: «Stati e alert restano quelli della zona blu e del trigger». Il resto del testo nuovo non promette rendimenti e dice «promemoria, non un segnale per comprare o vendere»; l'avvertenza generale è in guida.html:413. | lettura | — |
| 9 | minore | guida.html:163-169 | Limiti detti solo in parte. (a) Il punto della terza seduta non dice l'orizzonte (126 sedute, «entro sei mesi»). (b) «Nel campione dei settori dal 2005» non ripete XLC e XLRE. (c) «Pochi casi» c'è solo nel punto del bottom recente: 37 casi per la terza seduta, 14 ingressi e 2 zone blu per XLRE. (d) Le regole d'uso sono state trovate guardando questi dati: la divisione in tre dell'agente non ha retto al ricalcolo (`sintesi.md`). Basta una frase: «osservazioni nel campione, con pochi casi». | lettura; output.txt | — |
| 10 | minore | guida.html:163 | «Chi compra lì prima di un vero bottom sopporta in mezzo un calo mediano del 14%» vale per i 42 ingressi che arrivano in zona blu e al trigger entro 252 sedute, e lo si sa solo dopo. «In mezzo» vuol dire fino al trigger. Proposta: «fino al trigger». | output.txt, riga «condizionato» | −14,0 |
| 11 | minore | README.md:67 e 79 | Doppio due punti: «(…solo in stato Normale come nell'app): dalla prima seduta con uno stato (…): insieme…». | lettura | — |

## Cosa ho verificato e passa (24 numeri ricalcolati, più i controlli sotto)

- **Settori, 7 numeri, tutti uguali**: 50/63, 33/63, 43/63, anticipo 24 e 12, 32% (50/158), periodo XLC e XLRE.
- **Indici, 6 numeri, tutti uguali**: 89/132, 83/132 (C), 83/132 (E), anticipo 23 e 13, 40%.
- **Uso pratico, 11 numeri, tutti uguali**: 23% contro 9%, −3,3 contro −3,3, +4,6, −14%, 46%, 27%, 21%, 34%, soglia di XLRE la più alta (39,8), R126 di XLRE 1,10, 158 ingressi.
- **Controllo della soglia**: 264 sedute a campione, `approachSeries` uguale ad `approachLevel` sulla storia tagliata, 0 differenze.
- **Coerenza**: tutte le copie con 50/63, 33, 89/132, 83, 23/13 e 40% sono uguali in README, guida, index.html, bottom.js, indices.js, signals.js, version.js e sintesi.md. Le eccezioni sono i rilievi 4-7.
- **Numeri vecchi** (59/73, 42/73, 92/135, 86/135, 96/134): nei testi dell'app non ce ne sono più. Restano solo nella nota storica 1.3.1 del README, che la nota 1.3.3 spiega (accettabile), e nei file di ricerca e di sviluppo (rilievi 4 e 6).
- **Riproducibilità**: rilanciati in una copia nella cartella temporanea `avvicinamento_pit.mjs`, `avvicinamento_pit_indici.mjs`, `verifica_pit.mjs`, `backtest_uso.mjs`, `casi_varianti.mjs`, `verifica_uso.mjs` e `verifica_regole_uso.mjs`. I 4 JSON salvati sono identici byte per byte.
- **Versione e codice**: version.js e version.json sono entrambi a 1.3.3; `node --check` è passato sui 4 file JS cambiati.

## I controlli possono fallire

`node ricalcolo.mjs --sbagliata` conta dalla seduta 0: include XLC prima del 2019, XLRE prima del 2016 e il primo anno senza stato dei 5 indici. Così il mio script ridà esattamente i numeri vecchi:

- settori: C 42/73, D 59/73 (anticipo 23), E 44/73;
- indici: C 86/135 (41%), D 92/135 (24), E 84/135.

La definizione corretta dà invece 33/63, 50/63, 43/63 e 83/89/83 su 132. Il controllo distingue la regola dell'app da quella della 1.3.1 (`output_sbagliata.txt`).

## Cosa non ho potuto verificare e perché

- **Testi nel browser**: non li ho confrontati con la pagina servita. Le frasi sono stringhe fisse nel codice, senza numeri calcolati, quindi il codice e la pagina coincidono; il controllo nel browser spetta al tema Usabilità/Grafici.
- **Seconda fonte esterna**: non esiste per queste statistiche, che sono interne all'app.

## Script e output

`ricerca/qa/1.3.3/testi/`:

- `ricalcolo.mjs`, `output.txt`, `output_sbagliata.txt`;
- `anticipo_tocchi.mjs`, `output_anticipo_tocchi.txt`.
