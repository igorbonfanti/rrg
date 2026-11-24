# Profilo dei volumi degli ultimi 12 mesi accanto al grafico · fase 1

Ricerca del 13/11/2026, sola lettura sull'app: nessun file di `js/`, `css/`, `data/`, `scripts/`, `config/`, `test/`, `index.html`, `guida.html` toccato. Dati Yahoo Finance della cache di `ricerca/poc/cache/` (scaricati il 13/11/2026 alle 07:16 UTC da `ricerca/poc/dati.mjs`), fino all'ultima seduta chiusa: 12/11/2026, KOSPI 13/11/2026.

Il criterio e il metodo scelto qui sotto sono stati scritti in questo file **prima** di lanciare il primo calcolo dei profili e non sono stati cambiati dopo.

## Criterio di stabilità (deciso prima di guardare i risultati)

Per ogni mercato il profilo è **mostrabile** se passa tutte e tre le prove:

- **(a) value area**: la value area del 70% (si parte dalla fascia più piena e si aggiunge ogni volta la fascia vicina più piena, finché si arriva al 70% del volume) calcolata con il metodo scelto e con le alternative (giornaliero spalmato e orario spalmato, ciascuno con 50, 100 e 200 fasce: 6 profili) ha il bordo basso entro il 2% (massimo / minimo − 1 ≤ 2%) e il bordo alto entro il 2%;
- **(b) forma**: la sovrapposizione tra il profilo scelto e ognuna delle 5 alternative è almeno 0,85. Sovrapposizione = somma, fascia per fascia, del minimo delle due quote (quota = volume della fascia / volume totale). Fasce comuni: le due griglie hanno gli stessi estremi; quella più fine si somma su quella più grossa (200 → 100 → 50);
- **(c) da un giorno all'altro**: con la finestra mobile di 12 mesi, il profilo del metodo scelto calcolato alla fine di ognuna delle ultime 60 sedute ha sovrapposizione almeno 0,90 con quello della seduta prima (60 coppie; per ogni coppia la griglia è di 100 fasce tra il minimo e il massimo delle due finestre insieme). Passa se lo è in tutte le 60 coppie.

Metodo scelto (deciso prima): **giornaliero spalmato, 100 fasce uguali sulla scala logaritmica** tra il minimo e il massimo dei 12 mesi; strumento e scala dei prezzi per mercato nella sezione del metodo.

## 1. In breve

- **Mostrabili (6 su 9)**: S&P 500 (volumi di SPY), bitcoin, argento, rame, petrolio, semiconduttori (SOXX).
- **Non mostrabili (3 su 9)**: oro, Nasdaq-100 (volumi di QQQ), KOSPI. Cadono solo sulla prova (a): la forma del profilo regge (sovrapposizione da 0,936 a 0,945), ma i bordi della value area si spostano dal 2,5% al 4,2% tra il calcolo giornaliero e quello orario. Il motivo è lo stesso della ricerca sul POC: due zone con volume quasi uguale (oro: la seconda ha il 98,5% del volume della prima).
- **La prova (c) passa per tutti**: da un giorno all'altro la sovrapposizione minima va da 0,983 (argento) a 0,991 (bitcoin). La forma è stabile.
- **Ma la value area no**: nelle stesse 60 sedute il bordo della value area salta di oltre il 2% in un giorno 5 volte per l'argento, 4 per l'oro, 2 per SOXX e KOSPI, 1 per il petrolio (fino al 51% per il KOSPI). Conferma che **va mostrata la sola forma, senza value area né livelli**, come deciso dall'utente.
- **Ricalcolo indipendente in Python**: stessi risultati per tutti i 9 mercati (prove, finestre, file dell'app identici; scarti solo di arrotondamento).
- **Pipeline**: per i 6 mercati mostrabili servono **3 richieste in più a Yahoo** ogni notte (SPY giornaliero, SI=F e HG=F orari); il file del profilo pesa **4.436 byte** per 9 mercati (1.830 compressi).

## 2. Metodo

### 2.1 Strumento dei volumi e scala dei prezzi

| Mercato (grafico) | Volumi | Perché |
|---|---|---|
| S&P 500 (^GSPC) | **SPY** | Il volume di ^GSPC è quello di tutta la borsa di New York (ricerca POC). Prezzi di SPY portati sulla scala dell'indice con il rapporto delle chiusure di ogni giorno. |
| Nasdaq-100 (^NDX) | **QQQ** | Il volume di ^NDX è quello del Nasdaq Composite. Stessa scala con il rapporto del giorno. |
| Oro, argento, rame, petrolio | **future GC=F, SI=F, HG=F, CL=F** | Il volume del future è quello del mercato. Prezzi **lasciati come sono** (continuo di Yahoo). |
| Bitcoin | **BTC-USD** | Volume in dollari di Yahoo, somma di più piattaforme (non si sa quali). |
| Semiconduttori | **SOXX** | Volume dell'ETF (giornaliero già rettificato per lo split 3:1 del 05/11/2026). |
| KOSPI (^KS11) | **069500.KS** (KODEX 200) | Stessa borsa e stesso orario dell'indice, una sola quota (niente peso dei titoli da pochi won). Segue il KOSPI 200, non il KOSPI intero: la scala si porta su ^KS11 con il rapporto del giorno. EWY tratta a orari americani e in dollari; il volume di ^KS11 non è verificato. |

**Future: prezzi continui così come sono.** Il grafico disegna il continuo di Yahoo senza correzioni: il profilo deve stare accanto alla linea, all'altezza dove il prezzo è passato. Sulla scala del contratto attuale le zone di 12 mesi fa salirebbero (oro +4,27%, argento +4,42%, rame +4,64%, petrolio +0,38%, da `ricerca/poc/risultati.json`, `rolls12.gapAtStartPct`) e non coinciderebbero più con la linea. La differenza non è piccola: la sovrapposizione tra le due scale è 0,847 (oro), 0,829 (argento), 0,754 (rame), 0,638 (petrolio). Va detto nella guida.

### 2.2 Granularità e fasce

- **Giornaliero spalmato** (scelto): il volume di ogni seduta si divide in parti uguali, sulla scala logaritmica, tra il minimo e il massimo della seduta. Motivi: una richiesta piccola per mercato (o nessuna, se lo strumento è quello del grafico), niente limite dei 730 giorni, niente difetti delle barre orarie (bitcoin con metà delle ore a volume 0, SOXX con i volumi orari non rettificati per lo split, ETF senza l'asta di chiusura nelle ore).
- **Eccezione argento e rame**: lo storico giornaliero di SI=F e HG=F è il contratto del mese più vicino, con pochi scambi (volume giornaliero 0,24% e 2,2% della somma oraria). La regola automatica dello script: se il volume giornaliero è meno della metà della somma oraria (mediana dei 12 mesi), la barra del giorno si costruisce dalle barre orarie (contratto attivo): massimo, minimo, somma dei volumi. Scatta solo per SI=F e HG=F.
- **Volume ricopiato**: un volume giornaliero uguale a quello della seduta prima si scarta (Yahoo ricopia il volume del giorno prima sull'ultima seduta dei future; nella finestra succede il 12/11/2026 per GC=F e CL=F). La notte dopo arriva quello vero.
- **Fasce uguali sulla scala logaritmica**: il grafico è logaritmico, quindi ogni barra del profilo ha la stessa altezza e la lunghezza è il volume per «tratto» di grafico. Con fasce uguali in prezzo, in basso le barre sarebbero più alte che in alto (l'argento va da 48 a 122: 2,5 volte).
- **100 fasce** nel file; sul grafico si uniscono a gruppi (vedi §5).

## 3. Risultati per mercato

Finestra dal 12/11/2025 al 12/11/2026 (KOSPI dal 13/11/2025 al 13/11/2026). «Bordi VA» = scarto massimo del bordo basso / alto della value area tra i 6 profili. «Sovr. min.» = sovrapposizione minima del profilo scelto con le 5 alternative. «Giorno/giorno» = minima / mediana delle 60 coppie di sedute.

| Mercato | Volumi | Sedute | Bordi VA (a) | Sovr. min. (b) | Giorno/giorno (c) | Prove a, b, c | Mostrabile |
|---|---|---|---|---|---|---|---|
| Bitcoin | BTC-USD | 366 | 0,30% / 1,21% | 0,944 | 0,991 / 0,996 | sì sì sì | **sì** |
| Oro | GC=F | 252 | **2,49% / 4,24%** | 0,937 | 0,984 / 0,995 | **no** sì sì | **no** |
| Argento | SI=F | 252 | 0,47% / 0,47% | 0,939 | 0,983 / 0,996 | sì sì sì | **sì** |
| Rame | HG=F | 252 | 0,69% / 0,69% | 0,943 | 0,989 / 0,996 | sì sì sì | **sì** |
| Petrolio WTI | CL=F | 252 | 1,17% / 1,57% | 0,941 | 0,987 / 0,996 | sì sì sì | **sì** |
| Nasdaq-100 | QQQ | 252 | **3,22%** / 0,64% | 0,936 | 0,990 / 0,996 | **no** sì sì | **no** |
| S&P 500 | SPY | 252 | 1,97% / 0,22% | 0,946 | 0,988 / 0,996 | sì sì sì | **sì** |
| Semiconduttori | SOXX | 252 | 1,40% / 0,00% | 0,935 | 0,984 / 0,995 | sì sì sì | **sì** |
| KOSPI | 069500.KS | 245 | **3,65% / 3,65%** | 0,945 | 0,990 / 0,995 | **no** sì sì | **no** |

**Informativi** (non fanno parte del criterio):

| Mercato | Value area (scelto) | Fascia più piena · seconda zona (quota) | Orario alla chiusura | Altri strumenti o scala (sovrapposizione) | Bordo VA salta > 2% in un giorno |
|---|---|---|---|---|---|
| Bitcoin | 68.302–93.931 | 90.332 · 77.261 (98%) | 0,914 | — | 0 su 60 |
| Oro | 4.082–4.838 | 4.377 · 4.074 (98,5%) | 0,918 | scala GCZ26: 0,847 | 4 su 60 |
| Argento | 56,81–87,13 | 76,14 · 58,14 (92%) | 0,906 | scala SIZ26: 0,829 | 5 su 60 (fino al 24%) |
| Rame | 5,836–6,764 | 6,615 · 6,370 (72%) | 0,913 | scala HGZ26: 0,754 | 0 su 60 |
| Petrolio | 68,78–107,15 | 91,36 · 94,25 (81%) | 0,924 | scala CLZ26: 0,638 | 1 su 60 (fino al 22%) |
| Nasdaq-100 | 23.061–29.061 | 24.765 · 25.562 (97%) | 0,886 | NQ=F: 0,879 | 0 su 60 |
| S&P 500 | 6.469–7.463 | 6.836 · 7.701 (52%) | 0,898 | ES=F: 0,863; volume di ^GSPC: 0,858 | 0 su 60 |
| SOXX | 117,75–218,65 | 169,60 · 175,99 (91%) | 0,890 | — | 2 su 60 (fino al 31%) |
| KOSPI | 5.060–7.575 | 6.894 · 5.510 (90%) | 0,903 | EWY: 0,899; volume di ^KS11: 0,874 | 2 su 60 (fino al 51%) |

### Cosa dicono i numeri

- **La prova (b) è più facile di quanto sembri.** Con il volume spalmato, il profilo a 100 fasce sommato a 50 è *identico* a quello a 50 fasce (le fasce logaritmiche si annidano): la sovrapposizione con 50 e 200 fasce dello stesso metodo è 1 per costruzione. Il confronto vero è giornaliero contro orario: da 0,935 (SOXX) a 0,946 (S&P 500). Il numero di fasce conta solo nella prova (a).
- **Perché cadono oro, Nasdaq-100 e KOSPI** (`info.vaSpreadSubsets` nei risultati):
  - **oro**: tra i soli profili giornalieri la value area sta entro il 2% (1,33% e 1,91%); con quelli orari il bordo alto scende da 4.838 a 4.676 (4,24%). Le due zone (4.074 e 4.377) hanno quasi lo stesso volume: la value area cresce verso l'alto o verso il basso a seconda di poche ore;
  - **Nasdaq-100**: i profili giornalieri stanno entro lo 0,32%; il profilo orario a 50 fasce mette il bordo basso a 23.578 contro 22.843 di quello a 100 (3,22%). Senza le 50 fasce passerebbe (0,95%), ma il criterio era deciso prima e le 50 fasce ne fanno parte;
  - **KOSPI**: tra i giornalieri 0,90% e 1,81%; con le ore il bordo basso arriva al 2,73% e quello alto si sposta del 3,65% con 50 fasce.
- **Il profilo è stabile, la value area no.** In tutti i mercati la forma cambia pochissimo da un giorno all'altro (minimo 0,983), ma i bordi della value area saltano anche del 20–50% in un giorno quando la fascia più piena passa da una zona all'altra (argento, petrolio, SOXX, KOSPI). Per questo l'app deve mostrare il profilo intero, senza value area e senza segnare la fascia più piena.
- **Lo strumento conta**: con i future al posto degli ETF (S&P 500, Nasdaq-100) o con EWY per il KOSPI la sovrapposizione scende a 0,86–0,90. I future pesano di più gli ultimi mesi (ricerca POC, `volumeMix`). Il profilo è quello dello strumento scelto, e la legenda lo deve dire.

## 4. Pipeline notturna

### 4.1 Richieste a Yahoo (misurate il 13/11/2026 con una richiesta di 400 giorni)

| Mercato | Richiesta in più | Dimensione della risposta |
|---|---|---|
| Bitcoin, petrolio, SOXX (e oro) | nessuna: le barre giornaliere sono già nella richiesta di `fetch_ath.js` (tutta la storia); servono anche minimo e volume, che `parse` oggi non restituisce | — |
| S&P 500 | SPY giornaliero | 30.565 byte (276 barre) |
| Nasdaq-100 (se un giorno passasse) | QQQ giornaliero | 30.490 byte |
| KOSPI (se un giorno passasse) | 069500.KS giornaliero | 19.143 byte |
| Argento | SI=F orario (`interval=60m`) | 626.024 byte (7.956 barre) |
| Rame | HG=F orario | 634.348 byte (7.956 barre) |

Per i 6 mercati mostrabili: **3 richieste in più** (SPY, SI=F orario, HG=F orario), circa 1,3 MB scaricati. Le barre orarie restano disponibili per 729 giorni (Yahoo rifiuta oltre i 730, ricerca POC): 12 mesi sono coperti.

### 4.2 File del profilo già calcolato

`profilo_app.json` (scritto da `analisi.mjs`) è la prova del formato: per mercato `{vol, from, to, sessions, lo, hi, n: 100, scale: "log", bp: [100 interi]}`, con `bp` la quota di ogni fascia in centesimi di punto percentuale. Per 9 mercati: **4.436 byte, 1.830 compressi**. La somma dei `bp` va da 9.991 a 10.005 per gli arrotondamenti: l'app divide per la somma, non per 10.000.

Proposta: metterlo dentro `data/ath_history.json` (chiave `profiles`), che l'app legge già alla prima apertura del grafico. Niente file né richieste in più per l'utente.

### 4.3 Casi di errore (regole proposte)

1. **Strumento dei volumi non arrivato**: si tiene il profilo pubblicato se finisce entro `maxAge` giorni dall'ultima seduta del mercato, altrimenti `null`. L'app toglie la colonna e scrive nella legenda «profilo dei volumi non disponibile».
2. **Sedute senza chiusura comune** (rapporto di scala, per esempio SPY e ^GSPC in un giorno anomalo): si scartano e si contano; oltre il 5% delle sedute il profilo non si pubblica (avviso nel log).
3. **Volume 0 o mancante**: resta mancante (nessun riempimento); oltre il 10% delle sedute senza volume il profilo non si pubblica.
4. **Volume uguale a quello della seduta prima** (copia di Yahoo sull'ultima seduta dei future): la seduta si toglie; la notte dopo rientra con il volume vero.
5. **Argento e rame**: la regola giornaliero/orario (< 0,5) si ricalcola ogni notte e si scrive nel log. Se le barre orarie partono più di 7 giorni dopo l'inizio della finestra, il profilo non si pubblica.
6. **Prezzi ≤ 0** (il petrolio il 20/04/2020): le fasce logaritmiche non si possono fare; nessun profilo se un minimo nella finestra è ≤ 0.
7. **Split**: i volumi giornalieri di Yahoo sono rettificati (SOXX); le barre orarie si usano solo per argento e rame, che non hanno split.
8. **Date**: il file riporta `from` e `to` del profilo; la legenda li mostra, così un profilo fermo di un giorno si vede.

## 5. Prototipo

Pagina `prototipo/proto.html`: usa `css/style.css` e le funzioni dell'app (`js/format.js`, `js/zoom.js`), con la stessa costruzione di `renderAthChart` più la colonna del profilo (righe segnate «PROFILO»). Dati: `prototipo/dati.mjs` (chiusure dalla cache, `athStats`, profilo da `profilo_app.json`). Immagini con Playwright (`prototipo/shot.cjs`) in `prototipo/shots/`:

- `profilo-1440-scuro-3A.png`, `profilo-1440-chiaro-3A.png`, `profilo-390-scuro-3A.png`, `profilo-390-chiaro-3A.png`;
- le stesse con `-10A` (il periodo predefinito dell'app);
- `profilo-riquadro-1440-scuro.png` e `profilo-riquadro-390-chiaro.png`: riquadro aperto sulla fascia più lunga dell'S&P 500.

Nessuna pagina scorre in orizzontale. L'oro è nel prototipo perché richiesto, ma **non passa il criterio**.

**Spazio.** Una colonna stretta tra il riquadro del prezzo e i valori dell'asse: l'8% della larghezza, tra 44 e 110 px (110 px a 1440, 44 px a 390), 6 px di distacco. Il profilo non tocca mai la linea del prezzo. Le righe della griglia attraversano anche la colonna, così i valori a destra valgono per tutte e due. La scala verticale comprende il minimo e il massimo dei 12 mesi. Una linea tratteggiata verticale segna l'inizio dei 12 mesi. In testa alla colonna: «volumi 12 mesi» (sul telefono «vol. 12m»).

**Barre unite.** Sul grafico i 12 mesi occupano solo una parte dell'altezza: le 100 fasce si uniscono a gruppi (divisori di 100) finché ogni barra è alta almeno 3 px. A 1440 px: 3A 4 fasce per barra (petrolio 2), 10A 10 fasce (petrolio 4). A 390 px: 3A 5 fasce (petrolio 2), 10A 10 fasce (petrolio 5).

**Sul telefono.** La colonna è di 44 px: a 390 px il riquadro del prezzo passa da 296 a 246 unità di larghezza (−17%). La forma si legge (zone lunghe e vuoti), i numeri no. Un tocco sulla colonna apre il riquadro con la fascia e la sua quota: «Prezzi da 6.814,18 a 6.888,38 · 15,3% del volume scambiato dal 12/11/2025 al 12/11/2026 (ETF SPY riportato sulla scala dell'indice)». Con 10A i 12 mesi occupano solo una striscia della colonna (da 32 px per l'S&P 500 a 60 px per il petrolio, a 390 px): meglio 3A.
Attenzione: la quota del riquadro è quella della barra mostrata, quindi cambia con le barre unite. Per la stessa fascia dell'S&P 500 il computer mostra 12,5% (4 fasce) e il telefono 15,3% (5 fasce). Il riquadro dice sempre gli estremi della barra, quindi il numero è giusto per quella barra. In alternativa si può fissare un numero di barre uguale per tutti (da decidere con l'utente).

## 6. Raccomandazione

**Verdetto: procedere con modifiche.** Profilo a lato del grafico per i **6 mercati che passano**: S&P 500, bitcoin, argento, rame, petrolio, semiconduttori. Niente profilo per oro, Nasdaq-100 e KOSPI, con il motivo detto nella nota. Metodo: giornaliero spalmato, 100 fasce logaritmiche, prezzi dei future continui come sono, argento e rame dalle barre orarie. Solo la forma: nessun livello, nessuna value area, nessuna fascia evidenziata (a parte quella sotto il dito o il puntatore).

Se l'utente vuole il profilo anche per oro, Nasdaq-100 e KOSPI, serve un criterio nuovo, e sarebbe scelto dopo aver visto i dati: va detto. L'oro fallisce anche senza le 50 fasce (2,49% e 3,85%).

### 6.1 Testi proposti

- **Legenda** (riga nuova): «a destra: volume per fascia di prezzo, dal 12/11/2025 al 12/11/2026 (ETF SPY riportato sulla scala dell'indice)». Per gli altri: «(future SI=F)», «(volume in dollari di Yahoo, somma di più piattaforme)», «(volume dell'ETF SOXX)»; poi «┆ inizio dei 12 mesi».
- **Riquadro sulla colonna**: «Volume degli ultimi 12 mesi · Prezzi da X a Y · Z% · del volume scambiato dal … al … (strumento)».
- **Nota del pannello** (`#athNote`, frase in più): «Per S&P 500, bitcoin, argento, rame, petrolio e semiconduttori, accanto al grafico c'è il **profilo dei volumi degli ultimi 12 mesi**: la parte del volume dell'anno scambiata a ogni livello di prezzo. Barre lunghe = prezzi dove si è scambiato di più. Non è un livello né un segnale. Per oro, Nasdaq-100 e KOSPI non c'è: con barre giornaliere e orarie le zone principali non coincidono abbastanza.»
- **Guida** (`guida.html`, vista VIX, sotto la distanza dal massimo), paragrafo «Profilo dei volumi»:
  > «Accanto al grafico di alcuni mercati, una colonna di barre orizzontali mostra **dove si è scambiato di più negli ultimi 12 mesi**: ogni barra è una fascia di prezzo, più è lunga più volume è passato a quei prezzi. Si legge con i valori dell'asse a destra, che valgono anche per la colonna; un clic o un tocco su una barra dice la fascia e la sua quota.
  > **Come si calcola.** Barre giornaliere: il volume di ogni seduta si divide in parti uguali tra il minimo e il massimo della seduta (non sono i singoli scambi). Volumi: per l'S&P 500 l'ETF SPY, riportato sulla scala dell'indice con il rapporto delle chiusure di ogni giorno (il volume dell'indice su Yahoo è quello di tutta la borsa di New York); per argento, rame e petrolio i future, con il prezzo continuo come la linea del grafico; per il bitcoin il volume in dollari di Yahoo, somma di più piattaforme non dichiarate; per i semiconduttori il volume dell'ETF SOXX. Il volume è in quote o contratti, non in dollari (tranne il bitcoin).
  > **Limiti.** I future continui salgono a ogni cambio di contratto: i prezzi di 12 mesi fa sono quelli del contratto di allora, circa il 4–5% sotto quello di oggi per argento e rame. Il profilo dice dove si è scambiato, non dove il prezzo si fermerà: nessun livello e nessun segnale. Per oro, Nasdaq-100 e KOSPI non c'è perché con dati giornalieri e orari le zone principali non coincidono abbastanza (verifica in `ricerca/poc/profilo/`, ramo di sviluppo).»

  Le percentuali dei cambi di contratto (oro +4,27%, argento +4,42%, rame +4,64%) vanno ricalcolate alla pubblicazione.

### 6.2 Piano di inserimento (dopo l'accordo dell'utente)

1. **`scripts/lib/yahoo.js`**: `parse` con un'opzione per restituire anche minimo e volume (oggi solo chiusura e massimo); una funzione per le barre orarie con la seduta (dalle 18 di New York al giorno dopo per i future).
2. **`scripts/lib/volprofile.js`** (nuovo, funzioni pure con test): barre sulla scala del grafico, regola giornaliero/orario, volume ricopiato, fasce logaritmiche, profilo spalmato, quote in `bp`, controlli del §4.3. Copiare la logica di `analisi.mjs` (`mapped`, `profile`) e tenere `verifica.py` come ricalcolo indipendente.
3. **`config/ath.json`**: per i 6 mercati `"profile": {"vol": "SPY", "text": "ETF SPY riportato sulla scala dell'indice"}` (bitcoin, argento, rame, petrolio, SOXX con il proprio simbolo).
4. **`scripts/fetch_ath.js`**: dopo le statistiche, per i mercati con `profile` scarica lo strumento (SPY giornaliero; SI=F e HG=F orari), calcola e scrive `profiles[id]` in `data/ath_history.json`. Una `pickProfile` come `pickStats` tiene il profilo pubblicato se quello nuovo manca o è più vecchio.
5. **`js/vix-view.js` · `renderAthChart`**:
   - colonna `PRW` e `PW` ridotto; scala verticale con `lo` e `hi` del profilo;
   - griglia che attraversa la colonna, barre unite (≥ 3 px), linea dell'inizio dei 12 mesi;
   - riquadro sulla colonna, legenda, `aria-label` con «e il profilo dei volumi degli ultimi 12 mesi».
   - **Zoom e periodi**: se il tratto visibile non comprende la fine della serie (`t1` prima di `to` del profilo), la colonna si toglie e il riquadro del prezzo torna largo. Altrimenti la scala dello zoom si allargherebbe ai 12 mesi.
6. **`css/style.css`**: `.ts .vpbar`, `.vpbar.on`, `.vpcol`, `.vpwin`, `.legend .vpk-bar`, `.vpk-win` (nel prototipo, in testa a `proto.html`); controllare il contrasto nel tema chiaro.
7. **`index.html`** (`#athNote`) e **`guida.html`**: testi del §6.1. **README**: metodo, approssimazioni e nota della versione; `js/version.js` e `version.json` insieme (versione minore nuova).
8. **`test/`**: profilo (somma, fasce annidate, volume ricopiato, prezzi ≤ 0), `pickProfile`, formato di `data/ath_history.json`; Playwright in `ricerca/qa/<versione>/` su computer e telefono, chiaro e scuro, 3A, 10A, MAX e zoom.
9. Prima di pubblicare: rifare `analisi.mjs` e `verifica.py` sui dati del giorno e confrontare il file della pipeline con `profilo_app.json` (stessi `bp`).

## 7. Ricalcolo indipendente

`verifica.py` (Python, solo libreria standard, nessun import dagli script Node) rilegge le risposte grezze della cache con codice proprio. Rifà: ultima seduta chiusa, seduta delle barre orarie, scala del grafico, barre dalle orarie per argento e rame, volumi ricopiati, profili, value area, sovrapposizioni, le 60 coppie giorno per giorno, il file dell'app. Risultato in `verifica.json`:

- prove (a), (b), (c), finestre, numero di sedute e intervallo del file dell'app: **uguali in tutti i 9 mercati**;
- `bp` del file dell'app: **identici**;
- scarti massimi: value area 6·10⁻⁸ (relativo), sovrapposizioni 5·10⁻⁵ (arrotondamento a 4 decimali del JSON).

Nella prima versione il ricalcolo dava una prova (c) diversa per i future (minimo 0,978 invece di 0,984 per l'oro). Era un errore di `verifica.py`: datava le barre con lo scarto orario fisso di Yahoo, quello di novembre, e così le sedute estive dei future cadevano di domenica. Corretto usando il fuso della borsa con l'ora legale di ogni giorno, come l'app (`barDate` in `scripts/lib/yahoo.js`). Dopo la correzione tutto coincide.

## 8. Limiti

- **Niente scambi singoli**: barre giornaliere (e orarie per l'alternativa), con il volume spalmato in modo uniforme tra minimo e massimo.
- **Una sola fonte**: Yahoo. Il ricalcolo controlla il calcolo, non i dati. TradingView e StockCharts sono esclusi per regola.
- **Una data sola**: criterio misurato al 12/11/2026 (finestra di 12 mesi e ultime 60 sedute). Un mercato che oggi passa può non passare tra qualche mese. La pipeline potrebbe ricalcolare la prova (a) ogni notte, ma servirebbero le barre orarie per tutti: non lo propongo, va deciso con l'utente.
- **Volumi**: in quote o contratti (bitcoin in dollari). SPY e QQQ non sono l'indice; le ore dei future comprendono la notte.
- **Prova (c) e volume ricopiato**: nella storia i volumi di Yahoo sono già corretti, quindi le 60 coppie non contengono il volume ricopiato dell'ultima seduta che la pipeline vede ogni notte (una seduta su 252, tolta).
- **Bitcoin**: l'alternativa oraria usa ore con volume per circa metà del giorno; il giornaliero è un aggregato di piattaforme non dichiarate.
- **KOSPI**: il volume di ^KS11 non è verificato; 069500.KS segue il KOSPI 200.
- **File non salvati**: tutto in `ricerca/poc/profilo/`, non ancora salvato sul ramo di sviluppo. Le risposte di prova della §4.1 sono in `ricerca/poc/cache/pv_*.json` (esclusa da git).

## 9. File

- `analisi.mjs`: tutti i calcoli; scrive `risultati.json`, `profilo_app.json`, `dimensione.json`.
- `verifica.py`: ricalcolo indipendente; scrive `verifica.json`.
- `prototipo/dati.mjs`, `prototipo/proto.html`, `prototipo/shot.cjs`, `prototipo/dati.json`, `prototipo/shots/*.png`.
- **Rifare**: `node ricerca/poc/profilo/analisi.mjs && python3 -I ricerca/poc/profilo/verifica.py && node ricerca/poc/profilo/prototipo/dati.mjs`, poi dalla radice `python3 -m http.server 8794` e `NODE_PATH=$(npm root -g) node ricerca/poc/profilo/prototipo/shot.cjs`.
