---
name: sviluppo-app-finanziarie
description: "Metodo di Igor per modificare le sue app finanziarie usate anche da altri (Sector Monitor, igorbonfanti/rrg, e app simili con indici, breadth, livelli, segnali, grafici, rendimenti): prima una verifica con agenti che studiano come inserire l'idea nel codice e la backtestano sui dati reali, poi il codice su un ramo di sviluppo, poi controlli approfonditi e indipendenti di numeri, grafici, testi e usabilità (computer prima, poi telefono) prima di ogni pubblicazione. Usala ogni volta che Igor propone un'idea, una modifica, un nuovo livello, soglia, indicatore, segnale, grafico o vista per una di queste app, chiede «si può fare…?», «aggiungi…», «cambia…», «togli…», segnala un numero che non torna, o chiede di pubblicare una nuova versione, anche se non nomina la skill."
---

# Sviluppo delle app finanziarie di Igor

Queste app le usa Igor, ma anche altre persone (per esempio la stanza Discord), e dai numeri che mostrano qualcuno può prendere decisioni con i propri soldi. Un numero sbagliato, un dato mancante riempito in silenzio o una regola che «suona bene» ma non regge sui dati fanno più danni di una funzione in meno. Per questo ogni modifica segue tre fasi, ognuna con un controllo prima di passare alla successiva:

1. **Verifica preliminare**: agenti che studiano l'idea, come si inserisce nel codice e se regge sui dati (backtest). Non si tocca l'app.
2. **Sviluppo**: il codice, su un ramo di sviluppo, con i test.
3. **Controlli prima della pubblicazione**: agenti indipendenti, che non hanno scritto il codice, cercano errori in numeri, grafici, testi e usabilità. Si pubblica solo quando il verdetto è GO.

Prima di tutto leggi le regole del progetto (`CLAUDE.md`, `docs/sviluppo.md` o equivalenti): vincoli, fonti di dati consentite e procedura di pubblicazione stanno lì. Per Sector Monitor i dettagli pratici sono in `references/sector-monitor.md`. Se una regola del progetto e questa skill dicono cose diverse, vale quella del progetto.

Comunica in italiano, in modo semplice; spiega i termini tecnici la prima volta che servono.

## 0. Rispondere all'idea

Quando Igor propone qualcosa, non partire subito a scrivere codice. Prima dagli una risposta da collega esperto:

- **Cosa ho capito**: riformula l'idea in una frase e lo scopo che ha per chi usa l'app («vedere prima che un settore si avvicina al livello blu»).
- **Esiste già?** Spesso c'è già qualcosa di simile nell'app: dillo e mostra dove.
- **Come la farei**: la soluzione che consigli e, se ce n'è una migliore di quella chiesta, proponila con il motivo. Non elencare tutte le alternative: dai una raccomandazione.
- **Cosa va verificato** prima di farla: le domande che il backtest o l'analisi devono chiarire.
- **Di che tipo è**, perché decide quanto deve essere approfondita la fase 1:

| Tipo | Esempi | Fase 1 |
|---|---|---|
| Regola, formula, livello, soglia, segnale, statistica | nuova soglia di attenzione, filtro sui trigger, «59 tocchi su 73» | completa, con backtest |
| Nuovo dato o fonte, cambio della pipeline | nuovo indice, nuova serie, orari di aggiornamento | completa sui dati (copertura, buchi, seconda fonte) |
| Grafica o usabilità che mostra numeri | evidenziare l'avvicinamento sul grafico, nuova colonna | leggera: i numeri mostrati vanno verificati, la grafica si prova su prototipo e screenshot |
| Solo aspetto o testo senza numeri | colore, etichetta, ordine dei pannelli | minima: niente backtest, solo controllo visivo |
| Correzione di un errore | numero che non torna, pagina che non si apre | riproduci l'errore prima di correggerlo |

Regole e formule (stati, livelli, soglie, calcoli) non si cambiano senza l'accordo di Igor: proponi, poi aspetta.

## 1. Verifica preliminare (nessuna modifica all'app)

Lo scopo è evitare di costruire qualcosa che poi, guardato da vicino, non ha senso: un livello che non anticipa nulla, una statistica che misura una cosa diversa da quella mostrata, un dato che manca proprio dove serve.

Lancia in parallelo, in un solo messaggio, gli agenti che servono (di solito due o tre):

- **Inserimento nel codice**: dove va la modifica, quali file e funzioni tocca, con cosa interagisce (macchina a stati, cache, grafici condivisi, testi che citano gli stessi numeri), rischi e casi limite. Niente codice dell'app: solo un piano con i punti precisi.
- **Backtest / validazione**: verifica sui dati reali che la modifica faccia quello che vogliamo. Il metodo, con gli errori da evitare, è in `references/backtest.md`: leggilo prima di scrivere il brief e passa all'agente le parti che servono.
- **Dati** (quando la modifica usa dati nuovi o li usa in modo nuovo): copertura nel tempo, buchi, festività, sospensioni, revisioni della fonte; confronto con una seconda fonte quando esiste.

Come scrivere il brief di un agente: obiettivo, ipotesi da verificare, criterio di successo deciso prima di vedere i risultati, file da leggere, cosa è già escluso, dove salvare script e risultati (nel progetto: `ricerca/<tema>/`, sul ramo di sviluppo). Dagli il codice e i dati, non la tua conclusione: un agente a cui consegni l'ipotesi tende a confermarla. Chiedi numeri riproducibili da uno script salvato, non stime.

Quando gli agenti tornano:

1. **Ricontrolla** i numeri chiave con un calcolo separato (script diverso o metodo diverso). Se due calcoli non coincidono, la fase non è finita.
2. **Scrivi il verdetto** per Igor in poche righe: *procedi*, *procedi con modifiche* (quali) o *scarta* (perché), con la tabella dei numeri, i limiti (nel campione, pochi casi, livelli scelti col senno di poi) e la tua raccomandazione.
3. **Salva** script e risultati in `ricerca/` con una nota che spiega metodo e conclusioni, e fai commit sul ramo di sviluppo.
4. **Aspetta l'ok di Igor** quando la modifica tocca regole, formule, numeri citati nei testi o la grafica in modo visibile. Per correzioni e piccoli ritocchi senza numeri puoi proseguire, dicendo cosa fai.

Se il backtest dice che l'idea non regge, dillo chiaramente e proponi l'alternativa che i dati sostengono: è il motivo per cui la fase esiste.

## 2. Sviluppo

- **Piano breve** prima di iniziare (file, passi, test), poi salva il lavoro (commit) prima di cambiare.
- **Lavora sul ramo di sviluppo** del progetto, mai direttamente su quello pubblicato.
- **Calcoli nuovi con il loro test**: se una funzione nuova deve dare lo stesso risultato di una vecchia o di uno script di ricerca, scrivi un test che lo confronta seduta per seduta su dati reali.
- **Nessun dato futuro** in quello che l'app mostra per il passato: un valore storico va calcolato con i soli dati disponibili quel giorno, come si vedeva allora. Se non è possibile, l'app lo deve dire.
- **Un dato che manca si mostra come «—»** o si dice che manca, mai un valore di riempimento. Ogni approssimazione inevitabile va scritta nell'app (nota, tooltip o guida) e nella documentazione.
- **Testi insieme al codice**: ogni numero citato in app, guida, README, note di versione e messaggi (Telegram, Discord) deve venire da uno script del repository e riferirsi alla regola che l'app mostra davvero. Cerca con grep tutte le copie di una frase o di un numero: di solito ce ne sono tre o quattro.
- **Versione e note**: cambia il numero di versione secondo lo schema del progetto e scrivi la nota della versione.
- **Prima dei controlli**: test automatici del progetto, poi un giro nel browser su computer e telefono, tema chiaro e scuro, con la console senza errori. I test unitari non caricano tutti i file dell'app: una pagina può non aprirsi anche con tutti i test verdi.
- **Se la modifica è visiva**, fai gli screenshot (computer e telefono, chiaro e scuro) e guardali tu per primo. Quando la grafica è nuova, mandali a Igor prima di pubblicare: una linea o un colore che a lui non piace si scopre meglio adesso che dopo.

## 3. Controlli prima della pubblicazione

Gli agenti di questa fase non hanno scritto il codice e non ricevono le tue conclusioni: ricevono la versione di sviluppo (ramo e commit), cosa è cambiato e cosa dovrebbe succedere, e cercano di romperla. I temi, i brief e il formato dei rapporti sono in `references/controlli.md`.

Quanto controllo serve:

| Modifica | Controlli |
|---|---|
| Solo aspetto o testo senza numeri | screenshot e regressione nel browser, fatti da te |
| Grafica o usabilità che mostra numeri | 2–3 agenti: numeri e grafici, testi, usabilità computer e telefono |
| Regola, formula, dati o pipeline | tutti e 5 i temi: numeri e dati, testi, grafici, usabilità e funzioni, codice e pipeline |
| Versione importante (prima uscita, molte modifiche insieme) | tutti e 5 i temi su tutta l'app, non solo sulla modifica |

Regole dei controlli:

- **Il verde si guadagna.** Un controllo passa solo se l'agente ha visto il valore giusto con i suoi occhi o con un calcolo; se torna per coincidenza o per un'ipotesi non scritta, è ⚠️, non ✅.
- **Ogni rilievo va riprodotto** prima di correggerlo (passi, screenshot o script) e classificato: *bloccante* (numero sbagliato, dato mancante non dichiarato, pagina che non si apre, errore su computer), *da correggere*, *minore*.
- **Computer prima**: l'esperienza principale è su computer (1440 e 1280 px). Il telefono (390 e 360 px) deve funzionare bene: niente testo tagliato o sovrapposto, tocchi che funzionano, tabelle leggibili.
- **I controlli devono poter fallire**: ogni controllo nuovo si prova anche sulla versione senza la modifica, dove deve fallire (dettagli in `references/controlli.md`).
- **Correggi e ricontrolla** finché non restano bloccanti né «da correggere». Con un bloccante aperto non proporre di pubblicare comunque: un numero sbagliato online è proprio quello che il metodo deve evitare. I minori che restano si scrivono nella documentazione dello stato del progetto e si dicono a Igor.
- Salva script e rapporti nel progetto (per Sector Monitor `ricerca/qa/`), così il controllo si può rifare alla versione dopo.

## 4. Pubblicazione

Segui la procedura del progetto passo per passo (per Sector Monitor è in `references/sector-monitor.md`). Pubblica solo i file dell'app, mai i dati generati dalla pipeline e mai la cartella di ricerca. Dopo la pubblicazione verifica che i file online coincidano con quelli pubblicati.

## 5. Resoconto a Igor

Breve, in italiano semplice:

- cosa è cambiato e dove si vede;
- i numeri nuovi e da dove vengono (script);
- cosa hanno trovato i controlli e cosa è stato corretto;
- cosa resta aperto e i limiti;
- cosa provare lui, con uno o due screenshot se la modifica è visiva.

Se un controllo è stato saltato o è fallito, dillo esplicitamente. Se non hai potuto lanciare agenti indipendenti e i controlli li hai fatti tu, dillo: non hanno lo stesso valore.

## Errori già fatti, da non ripetere

Esempi reali da Sector Monitor; valgono per qualsiasi app di questo tipo.

- **Soglia calcolata su tutta la storia** e poi usata per giudicare il passato: il backtest guardava il futuro. Si calcola seduta per seduta con la sola storia fino a lì.
- **Statistica di una regola diversa da quella mostrata**: «59 tocchi su 73» era della soglia in qualsiasi stato, mentre l'app mostra l'avvicinamento solo in stato Normale (42 su 73). Si misura sempre la regola esatta che l'app mostra.
- **Pubblicazione che ha ricopiato dati vecchi** sopra quelli nuovi della notte: non si copia mai la cartella dei dati.
- **Ricalcolo con una finestra troppo lunga**: senza abbastanza storia la media a 200 sedute non c'era e la breadth è scesa di decine di punti. I ricalcoli hanno un limite e un controllo.
- **Apostrofo in una stringa tra apici singoli**: la pagina non si apriva, ma i test unitari erano verdi perché non caricavano quel file. Controllo della sintassi di tutti i file e prova nel browser prima di pubblicare.
- **Affermazioni non verificate dette a Igor** (per esempio su come funzionano i fork di GitHub, o una causa scritta in una nota): si verifica prima di dirlo, oppure si dice che non è verificato.
- **Elemento disegnato sul bordo del periodo**: il pallino d'ingresso dell'avvicinamento compariva sul bordo sinistro anche quando il tratto era iniziato prima del periodo mostrato. Nei grafici si controllano i bordi.
- **Test che passava a vuoto**: lo script del browser chiedeva il periodo «3Y», che l'app non conosce, e controllava il periodo di default. Un controllo nuovo deve fallire sulla versione vecchia.
- **Grafica pubblicata senza farla vedere**: una linea tratteggiata non è piaciuta ed è stata tolta subito dopo. Se la grafica è nuova, screenshot a Igor prima di pubblicare.
