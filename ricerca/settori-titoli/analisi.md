# Grandi contro piccoli e titoli del settore: analisi, dati, progetto

Stato: analisi, verifica dei dati e demo fatte (17/10/2026). In attesa di conferma prima di implementare.
Demo: `demo.html` (dati veri al 16/10/2026, si apre nel browser).

## Cosa si vuole

Il percorso dell'utente è questo:
1. studiare i settori con Rotazione e Bottom Map;
2. scegliere un settore;
3. confrontare grandi e piccoli (cap-weighted contro equal-weight) per capire chi si muove per primo e in che direzione;
4. scendere ai singoli titoli con una bubble per trovare quelli più in pena (3M, 6M, YTD).

## Best practice studiate

**Rea, "Cap-Weighted vs Equal-Weight" (analisi 74, Premium).**
- La pagina non è leggibile senza abbonamento (HTTP 500 senza login) e non c'è una descrizione pubblica del metodo.
- Le uniche specifiche sono gli screenshot:
  - un dumbbell per settore;
  - periodi da YTD a 10A;
  - una scia a 1S/1M/3M fa;
  - in evidenza le divergenze maggiori.

**Finviz Bubbles (letto dal codice JavaScript pubblico della pagina).**
- Assi a scelta: 69 metriche, tra cui perf 1W/4W/13W/26W/52W/YTD, distanza da SMA20/50/200 e dal massimo/minimo a 52 settimane.
- Grandezza delle bolle in radice quadrata della capitalizzazione.
- Etichette con controllo delle sovrapposizioni.
- Cursori per tagliare gli outlier.
- Nessuna linea dello zero e nessun quadrante.
- Settori Morningstar, non GICS.

**Indicazioni prese per noi.**
- Ordinare per divergenza con segno.
- Freccia o scia dal vecchio al nuovo.
- Colore della barra secondo chi è davanti, con coppia leggibile dai daltonici: verde acqua e viola, non rosso e verde.
- Mettere in evidenza i primi 3.
- Bolle: linea dello zero, riferimenti del settore, quadrante "in pena" in basso a sinistra.
- Etichette sui peggiori.
- Outlier fermati al bordo con una freccia.
- Lista ordinata accanto al grafico.

## Verifica dei dati (script/)

**Pesi.**
- Fonte: holdings dell'ETF iShares IVV, `https://www.ishares.com/us/products/239726/x/latest-holdings.csv`, stessa forma degli altri file iShares che già leggiamo.
- I 503 membri della nostra lista sono tutti presenti.
- Il settore GICS coincide per tutti.
- Usiamo il Market Value, non il Weight, perché il Weight ha solo 2 decimali.

**Prezzi.** fetch_breadth.js scarica già ogni sera 2 anni di prezzi di tutti i membri, che bastano per 1A più la scia a 3 mesi.

**Composizione dell'epoca.**
- Fonte: tabella dei cambi di en.wikipedia "Historical components of the S&P 500", con 37 cambi da giugno 2025.
- Dei titoli usciti, 23 hanno ancora prezzi su Yahoo.
- Non li hanno CTRA, HOLX, DAY, K, IPG, WBA, HES, ANSS e JNPR, tutti acquisiti.

**Confronto con gli ETF** (rendimenti solo prezzo al 16/10/2026):

| Metodo | Risultato |
|---|---|
| Membri di oggi, media semplice | Fino a 3M va bene. Su YTD e 1A l'equal-weight è troppo alto: Tecnologia +14 punti su 1A rispetto a RSPT. È la sopravvivenza: entrano nell'indice i titoli che sono già saliti. |
| Ribilanciamento trimestrale con i membri di oggi | Spiega Health Care ma non Tecnologia, Staples e Industrials. |
| **Indice simulato giorno per giorno con la composizione dell'epoca** (entrate dalla data di ingresso, uscite fino alla data di uscita, equal-weight riportato a pesi uguali dopo il 3° venerdì di mar/giu/set/dic) | **Equal-weight entro 0–3 punti da RSPT, RSPC, …, RSPU anche su 1A.** Cap-weighted uguale agli SPDR XL* (±0,5) tranne XLK, XLC e XLY. |

- **Perché XLK, XLC e XLY non coincidono.** Gli SPDR applicano regole che tagliano il peso dei giganti. XLC su 1A: noi +8,6%, ETF −4,4%. Per misurare "grandi contro piccoli" il nostro calcolo è più fedele dell'ETF.
- **Perché resta uno scarto.**
  - Titoli acquisiti senza prezzi.
  - Costo degli ETF (0,40% l'anno).
  - RSPC replica un indice "Communication Services Plus", diverso dal settore puro.
- **Periodi 5A e 10A.** Con i costituenti servirebbero i prezzi dei titoli usciti, che Yahoo non ha più (la base storica Johnbrick sì, ma solo nel backfill una tantum). Proposta: non metterli, oppure ricavarli dalle coppie di ETF XL* e RSP* (storia dal 2006; RSPR dal 2015, RSPC dal 2018) con una nota sul taglio dei giganti.

## Progetto proposto

**Dove.**
- Una nuova vista **7 Titoli**, in coda alle altre: tasti, numeri e viste esistenti non cambiano.
- Il settore scelto è lo stesso della vista 4 Settore, in entrambe le direzioni.
- Dalla vista 4 un link "titoli del settore →".
- Comandi: `TIT` oppure `XLK TIT`.

**Pannello 1: Grandi contro piccoli** (tutti gli 11 settori più la riga S&P 500).
- Periodi: 1M, 3M, 6M, YTD, 1A.
- Pallino pieno = cap-weighted, pallino vuoto = equal-weight.
- Barra verde acqua se è davanti l'equal-weight, viola se è davanti il cap-weighted.
- Primi 3 per divergenza in grassetto.
- Colonne a destra: divergenza in punti e variazione rispetto a 1 mese fa (▲ verso l'equal-weight, ▼ verso i grandi).
- Scia (1S, 1M, 3M fa): sul settore scelto / su tutti / spenta.
- Clic su una riga = scelta del settore.

**Pannello 2: Bubble dei titoli del settore scelto.**
- Asse y: rendimento del periodo.
- Asse x, tre preset:
  - distanza dalla media 200 (predefinito);
  - distanza dal massimo a 52 settimane;
  - rendimento nel periodo precedente (deboli da tempo contro cedimenti recenti).
- Bolle grandi secondo il peso nell'S&P 500 (radice quadrata) oppure tutte uguali.
- Linee tratteggiate del settore cap ed equal: le stesse del pannello 1.
- Peggiori 8 in rosso con etichetta.

**Pannello 3: I più in pena.**
- I primi 12 per punteggio: media dei ranghi nel settore di rendimento del periodo e distanza dal massimo.
- Passando sopra una riga si illumina la bolla.

**Dati.**
- Nuovo file `data/sector_members.json` (circa 145 KB, circa 35 KB compresso), scritto ogni sera da fetch_breadth.js con i prezzi che già scarica, più:
  - le holdings IVV (1 richiesta; se fallisce si tengono i pesi del giorno prima);
  - i prezzi dei titoli usciti negli ultimi 16 mesi (circa 25 simboli).
- Per settore: cap ed equal per 5 periodi × 4 date (oggi, 1S, 1M, 3M fa).
- Per titolo: rendimenti, periodo precedente, distanze da max 52 settimane / media 200 / media 50, peso.
- La pagina lo carica solo quando si apre la vista 7.

**Composizione storica.**
- Backfill una tantum dei cambi da giugno 2025 nel registro `changes` di data/sp500_members.json, che fetch_breadth.js aggiorna già ogni sera.
- Va salvato anche il settore dei titoli che escono (oggi il registro non lo conserva).

**Test.**
- Unità: simulazione equal-weight e cap-weighted e finestre YTD.
- Confronto con RSP*/XL* come controllo serale (solo log).
- Snapshot delle viste dei settori per verificare che non cambino.

## Domande aperte per l'utente
1. Vista 7 nuova oppure pannelli dentro la vista 4 Settore?
2. 5A/10A: da omettere, o da aggiungere con le coppie di ETF?
3. Preset predefinito della bubble: distanza dalla media 200 oppure dal massimo a 52 settimane?
4. Va bene la coppia di colori verde acqua (equal davanti) / viola (grandi davanti)?
