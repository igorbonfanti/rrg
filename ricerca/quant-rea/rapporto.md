# Le analisi di Quant Rea: verifica, classifica e cosa portare nell'app

18/10/2026. Solo ricerca, nessuna modifica all'app. Fonte: il fascicolo di un utente con 34 analisi della piattaforma (catalogo in `catalogo.md`). Ho rifatto i calcoli con i nostri dati: S&P 500 giornaliero dal 1928, Nasdaq-100 dal 1985, VIX dal 1990, e i membri storici dell'S&P 500 dal 1996 con i titoli usciti dall'indice. Tre agenti hanno cercato in rete la piattaforma, gli studi pubblicati e gli strumenti equivalenti. Dettagli in `risultati/`, script in `script/`.

**Il tuo profilo, come lo intendo.** Investi in euro con ETF su un portafoglio multi-asset, con un orizzonte di mesi e anni. Compri i minimi di settori e indici quando l'ampiezza scende sotto il livello blu, e scegli con la rotazione relativa. Non fai trading giornaliero. Quindi conta ciò che aiuta a capire in che fase è un calo, quanto può durare e se c'è capitolazione. Le statistiche sul giorno dopo contano poco.

## In breve

1. **I numeri del fascicolo sono riproducibili.** Abbiamo ricostruito gli algoritmi di Rea quasi sempre alla seconda cifra decimale: correzioni del NDX, GARCH, VIX sopra 30, bull e bear, anni analoghi Pearson e Kendall, entropia. I calcoli sono fatti come dichiarato. Il problema è il metodo, non l'aritmetica.
2. **Gli errori sono gli stessi in quasi tutte le analisi:**
   - il rendimento dopo un segnale non è confrontato con quello di un giorno qualsiasi;
   - un episodio è contato tante volte quanti sono i suoi giorni;
   - a volte si usa il minimo, che si conosce solo dopo;
   - si usano i membri di oggi;
   - prima del 1950 l'S&P 500 di TradingView ha barre mensili, mescolate a quelle giornaliere.
3. **Delle 34 analisi:**

   | Giudizio | Quante | Sezioni |
   |---|---|---|
   | fuorvianti o sbagliate | 15 | 4–7, 10, 11, 12, 14, 18, 21, 23, 24, 25, 30, 33 |
   | valide come descrizione, con riserve | 19 | tutte le altre |

   Nessuna delle analisi «predittive» ha un vantaggio che regga a una baseline e al conteggio per episodi. Fa eccezione, ma è debole, il conteggio dei titoli in forte calo (capitolazione).
4. **Da portare nell'app, rifatti bene:**
   - il contesto del calo in corso (episodi passati e probabilità di andare più giù);
   - la capitolazione come conferma;
   - le fasi toro e orso con i tempi di recupero;
   - il VIX letto per episodi;
   - due righe nuove nel confronto storico degli episodi.

   Nessuna di queste cambia le regole del semaforo.
5. **Da lasciare fuori:**
   - le proiezioni con anni analoghi (prevedono peggio della media);
   - entropia, «ergodicità», Poisson, GARCH, serie di giorni consecutivi;
   - i segnali di ampiezza con la «soglia dinamica».

## Come lavora Rea

- **Piattaforma.** Quant-Rea.com di Massimo Rea, circa 87 analisi (il fascicolo ne copre 34), da 5 € al mese più IVA. È un'app Plotly Dash su Heroku. Le fonti dichiarate nei Termini sono TradingView e FRED. Il fascicolo cita la libreria `tvDatafeed`.
- **Cosa non dice.** Non c'è documentazione pubblica dei metodi: niente sui membri storici o di oggi, niente sulle soglie. I Termini vietano l'esportazione dei dati e lo scraping: da qui prendiamo idee, non numeri.
- **I dati.** TVC:SPX ha barre mensili fino al 1949 e giornaliere dopo. La prova: le «19.288 barre dal 1950» della Sez. 29 sono sedute; una serie ibrida costruita allo stesso modo riproduce il «+50% in un giorno» della Sez. 19 (+51,1%) e la sua autocorrelazione (0,055 contro 0,056).
- **Le soglie di drawdown.** Spesso confrontano la chiusura massima con il minimo intraday, quindi un calo del 19% in chiusura diventa un bear. Così nascono i bear del 1990, 1998 e 2025, e il «secondo drawdown» del 1987 nella stessa settimana del crollo.
- **I membri.** Le analisi sui singoli titoli usano verosimilmente la lista di oggi: lo ammette per la dashboard della Sez. 30.

## Verifica, analisi per analisi

Legenda: ✅ valida · 🟡 valida con riserve · 🟠 fuorviante · ❌ sbagliata. «Loro → noi» = numero dichiarato nel fascicolo → nostro ricalcolo.

| # | Analisi | Come calcola Rea (ricostruito) | Loro → noi | Giudizio |
|---|---|---|---|---|
| 1–3 | Anno contro la mediana, stagionalità | percentili dei percorsi da inizio anno | 2026 al 64° percentile, nella banda centrale | 🟡 descrittiva |
| 2, 8 | Rendimenti annui, mesi, Z-score | anno = prima-ultima chiusura (verificato) | media 6,50% e 8,99% sono due campioni diversi; settembre unico mese sotto il 50% ✓; luglio-anno 0,247 è meccanico (atteso 0,29; luglio contro il resto dell'anno 0,11, non significativo) | 🟡 / 8.5 🟠 |
| 4–7 | Proiezione con anni analoghi | i 5 anni più correlati sui livelli; media del loro rendimento di **anno intero** | Pearson 5,82% ✓, Kendall 8,05% ✓; il riquadro Spearman è una copia di Kendall (il vero dà 4,08%); ignora il +9% già fatto: implica −3% nel secondo semestre. Fuori campione 1960–2025: **R² da −20% a −29%**, cioè peggio della media | 🟠 inutile |
| 9 | Nuovi massimi dell'anno contro il rendimento | conteggio con azzeramento annuale | correlazione 0,84 ✓ ma tautologica; massimi del 1° semestre contro rendimento del 2° semestre: 0,11 dal 1929, non significativo | 🟡 solo descrittiva |
| 10 | Rendimenti dai minimi dei bear | chiusura massima contro minimo intraday ≥20%; minimo = chiusura più bassa | lista di 14 ✓ con questa regola; sulle chiusure sono 11 (1990, 1998 e 2025 non arrivano a −20%); vittorie al 100% solo entrando al minimo esatto. 1 anno: al minimo +40%, alla conferma −20% +14,2%, giorno qualsiasi +9,4%; a 5 anni la conferma fa peggio della media | 🟠 senno di poi |
| 11 | NDX, titoli in rialzo sotto il 2% | media dei segnali | «+11% a 1 anno» contro **+19,4% di un giorno qualsiasi** sul NDX 2010–26: è un risultato sotto la media, presentato come recupero. Sull'S&P 500 con i membri storici, la debolezza estrema dà +3,4 punti dal 2010 (p≈0,07), ma le peggiori sedute dell'indice fanno altrettanto | 🟠 |
| 12 | Shuffle del PAC | blocchi di 12 mesi, 60 shuffle | con un versamento unico l'ordine non conta: misura solo il rischio di sequenza del PAC. «Il reale batte gli shuffle» dipende dalla fine della serie dopo un lungo rialzo: con la fine a feb-2009 il reale scende allo 0,1–8° percentile | 🟠 interpretazione |
| 13 | Senza i giorni migliori e peggiori | 100 + 100 giorni dal 1980 | medie ✓; «senza entrambi ≈ buy & hold» è falso: +71% (118,9× contro 69,3×); nel testo le etichette dei test binomiali sono invertite; la vicinanza dei giorni estremi si spiega con i grappoli di volatilità | 🟡 / 13.6 ❌ |
| 14 | S&P 500, titoli che battono l'indice | conteggio con soglia = media dei massimi mobili | la soglia sta **sopra il dato il 99% dei giorni**: essere sotto è lo stato normale. La sua salita viene da più titoli e da più dispersione, non da «più partecipazione». Nessun potere predittivo | 🟠 |
| 15 | Cap contro equal per settore | membri di oggi, pesi di fine periodo (verificato il 17/10) | il nostro metodo è più corretto | 🟡 |
| 16 | Escursione da inizio anno e ARMA | (max high − min low) / prima chiusura | 2026 19,01% ✓, 1975 39,21% ✓; il minimo del 1949 viene da barre mensili; rumore bianco: l'ARMA restituisce la media | 🟡 ARMA inutile |
| 17 | Comprare ai massimi storici | dal 1871, serie mista | sul giornaliero dal 1950 la differenza fino a 5 anni è al massimo 1 punto l'anno; il divario a 3 mesi è un artefatto delle barre mensili | 🟡 |
| 18 | Distanza dalla media a 200 | giorni oltre ±5% | SPX dal 1950 a 3 mesi: tutti i giorni 2,28%, sopra 2,58%, sotto 2,04%, nessuna differenza significativa (p 0,37–0,84) | 🟠 |
| 19 | Serie di giorni consecutivi | dal 1871, serie mista | dal 1950: P(su dopo su) 55,9% ✓; il momentum c'era nel 1950–79 (prezzi dell'indice non sincroni) ed è **negativo dal 2000**; la vista pre-1950 è un artefatto | 🟡 / pre-1950 ❌ |
| 20 | Poisson dei giorni oltre il 2% | λ mensile, soglia dinamica X=90 | λ 0,95, troppi mesi senza eventi rispetto alla Poisson ✓; i segnali sono 6–11 episodi; contati per episodio p 0,35–0,54 | 🟡 diagnostica, segnale nullo |
| 21 | Entropia | permutation di ordine 3 su 252 sedute; Shannon a istogramma | P33 e P67 ✓ ma sono i valori di una serie casuale (≈0,994); Shannon segue la curtosi (correlazione −0,89): misura i crolli recenti; senza sovrapposizioni p 0,02–0,29, non 0,000 | 🟠 |
| 22 | Drawdown dell'anno contro il rendimento | prima-ultima chiusura | 77 anni, 56 positivi ✓; «nessuna relazione» è falso (correlazione 0,65): oltre −20% nell'anno solo il 35% chiude positivo | 🟡 |
| 23 | Correzioni NDX e probabilità di approfondimento | ogni nuovo passaggio sotto −20% è una correzione; minimo cercato solo nelle 250 sedute dopo | 40 ✓ con questo metodo, ma de-duplicate sono **8**; il minimo del 2000–02 è il 7/10/2002 a −82,9%, non −76% nel 2001; da −20%: −30% nel 50% dei casi (non 80%), −40% nel 12% (non 28%) | ❌ |
| 24 | Giorni in bear | drawdown dal massimo storico oltre −20% | 38,9% ✓, ma l'80% dei giorni «bear» è risalita dopo il minimo; 27 fasi su 40 durano 5 sedute o meno | 🟠 |
| 25 | «Ergodicità» | media mobile a 252 sedute meno media dall'inizio, ±0,0011 | è il rendimento a 12 mesi (correlazione 0,985) con una banda di ±27,7% l'anno; non ha a che fare con l'ergodicità | 🟠 |
| 26 | Bear e secondo drawdown | estremi intraday | date ✓; sulle chiusure: 11 bear dal 1950, 6 con un secondo drawdown; il 1987 è un artefatto | 🟡 |
| 27 | Cali dal massimo dell'anno | minimo del giorno contro il massimo dell'anno | soglia 5%, 63 sedute: 3,33% contro **2,28% di un giorno qualsiasi** (+1 punto, p≈0,03 senza correggere per i circa 15 test) | 🟡 |
| 28 | Mese del massimo annuale | massimo intraday per anno | dicembre 33/77 ✓; con i rendimenti rimescolati dicembre ha il massimo nel 37% dei casi: è la deriva, non la stagione | 🟡 |
| 29 | Dashboard bull e bear | ±20% su estremi intraday | 37 fasi ✓ con questa regola, 23 sulle chiusure; «bull 1990–98 oltre il 65% annuo» è sbagliato: 19,6% | 🟡 / un numero ❌ |
| 30 | Drawdown dei singoli titoli | membri di oggi su tutta la storia | episodi oltre −80% poi recuperati: membri di oggi 83%, tutti i membri dal 1996 63%, usciti dall'indice 46%; CAGR annualizzato su storie brevi (SNDK) | 🟠 sulle conclusioni |
| 31 | Titoli in forte calo, somma su 5 giorni | membri sotto −5% (SPX) e −7% (NDX) | marzo 2020: 1.255 ✓; «2022 oltre 500» falso (343). Con i membri storici, in percentuale e con soglia calcolata solo sul passato: +12,9 punti a 1 anno (10 episodi in 30 anni) | 🟡 utile |
| 32 | Oro, volatilità su più orizzonti | somme di rendimenti semplici | descrittiva | 🟡 |
| 33 | GARCH contro VIX | volatilità realizzata dei 30 giorni **passati** | MAE 1,53 ✓, ma il GARCH «vince» perché ricopia il passato (la realizzata di ieri fa ancora meglio). Sui 21 giorni **successivi**: VIX corretto MAE 4,08 contro GARCH 4,77; nella regressione congiunta il VIX ingloba il GARCH | ❌ |
| 34 | SPX con il VIX sopra 30 | tutti i giorni dal 1990 | 22,35% a 12 mesi ✓ su 734 giorni, che sono **21 episodi**: entrando il primo giorno, media 8,7% (mediana 15,3%), sotto un giorno qualsiasi (10,2%); 70% positivi; peggiori 2000, 2001, 2007–08 | 🟡 senza baseline |

## Classifica di utilità per te

Voto da 0 a 5. Pesa due cose: quanto aiuta a leggere un minimo o una fase di mercato, e se regge alla verifica.

| Pos. | Analisi (rifatta bene) | Voto | Perché |
|---|---|---|---|
| 1 | Correzioni e probabilità di approfondimento (23), de-duplicate | 5 | risponde alla domanda che conta in zona blu: «siamo a −X%, quanto spesso è andata peggio, quanto è durata?» |
| 2 | Capitolazione: % di membri sotto −5% su 5 giorni (31) | 4 | unica misura di ampiezza con un vantaggio su baseline e per episodi; utile come conferma, non da sola |
| 3 | Rendimenti dai bear, alla conferma e non al minimo (10) | 4 | dà aspettative oneste e mostra quanto vale il senno di poi |
| 4 | Fasi toro e orso con tempi di recupero, sulle chiusure (29) | 4 | inquadra la fase di indici e settori; la durata dei recuperi cambia molto da un episodio all'altro |
| 5 | Ritorno sotto il minimo dopo il primo rimbalzo (26) | 3,5 | riguarda il nostro stato «fallito»: quanto spesso un minimo viene bucato |
| 6 | VIX sopra 30 per episodi (34) | 3,5 | contesto di paura; il primo giorno sopra 30 non è un segnale d'ingresso |
| 7 | Calo dell'anno contro il rendimento (22) | 3 | tara le aspettative: un calo del 10–14% nell'anno è normale |
| 8 | Cap contro equal per settore (15) | 3 | lo facciamo già meglio nella vista 7 |
| 9 | Cali dal massimo dell'anno (27) | 2,5 | +1 punto a 3 mesi, fragile |
| 10 | Comprare ai massimi (17); giorni migliori e peggiori (13) | 2 | educative: tengono investiti, ma non servono a scegliere |
| 11 | Giorni in bear (24), se separa caduta e risalita | 2 | così com'è è fuorviante |
| 12 | Anno contro la mediana, stagionalità, mesi (1–3, 8) | 1,5 | descrittive; esistono già gratis (Equity Clock) |
| 13 | Shuffle del PAC (12) | 1,5 | utile solo come lezione sul rischio di sequenza |
| 14 | Escursione da inizio anno (16), mese del massimo (28), nuovi massimi (9), oro (32) | 1,5 | descrittive, nessuna decisione |
| 15 | Dashboard dei singoli titoli (30) | 1,5 | ottimista per i membri di oggi; per noi basta la lista dei titoli più colpiti della vista 7 |
| 16 | Titoli in rialzo / che battono l'indice (11, 14) | 1 | fuorvianti; la nostra ampiezza con i membri storici è già migliore |
| 17 | Poisson (20), distanza dalla media a 200 (18), GARCH contro VIX (33) | 1 | nessun vantaggio dimostrato, o target sbagliato |
| 18 | Serie di giorni consecutivi (19), «ergodicità» (25), entropia (21) | 0,5 | rumore giornaliero o rinomina di misure note |
| 19 | Anni analoghi (4–7) | 0 | fuori campione prevedono peggio della media |

## Cosa portare nell'app

In ordine di priorità. Sono solo contesto e numeri: **non cambiano il semaforo né le regole**. Se qualcosa un domani dovesse entrare nelle regole (per esempio la capitolazione come conferma), prima lo testiamo come in `ricerca/verifica-trigger/` e ne parliamo.

1. **Contesto del calo** nel dettaglio di settori e indici, e nell'Alert. Contiene:
   - il drawdown di oggi dal massimo in chiusura;
   - gli episodi passati de-duplicati (≥10% e ≥20%), con profondità, sedute al minimo e sedute di recupero;
   - la tabella «già a −X%: quante volte si è arrivati a −Y%», sempre con *n*;
   - il rendimento a 1 anno entrando alla conferma.

   I dati ci sono già (prezzi di ETF e indici). Lavoro medio.
2. **Capitolazione**:
   - cosa misura: % dei membri di quella data con un calo giornaliero ≤ −5%, sommata su 5 giorni;
   - come si legge: percentile calcolato solo sul passato;
   - dove va: nella lista «Perché questo stato» come voce informativa («conferma di capitolazione: sì/no»), e sulla Bottom Map come indicatore.

   Si fa per i settori S&P 500 con i membri storici che abbiamo; per gli indici solo dove scarichiamo i prezzi dei membri. Lavoro medio. Da sapere: dal 2010 sono 4 episodi, e l'80% cade a ridosso di un episodio di ampiezza sotto il 10% sulla media a 20 giorni, che già vediamo.
3. **Fasi toro e orso e tempi di recupero** (sulle chiusure) negli indici: fasce sul grafico e una tabellina con durata, profondità e recupero della fase in corso contro le passate. Lavoro medio-piccolo.
4. **VIX**: aggiungere ^VIX ai dati macro. Nell'Alert, «VIX oggi; dal 1990: 21 episodi sopra 30; dal primo giorno, a 12 mesi mediana +15%, positivi il 70%». Lavoro piccolo.
5. **Due righe nel confronto storico degli episodi** (dove già confrontiamo con il benchmark):
   - «dal minimo vero», per mostrare il vantaggio che nessuno può prendere;
   - «nuovo minimo entro 3 mesi dal trigger: k su n», cioè il rischio di un secondo test.

   Lavoro piccolo.
6. **Facoltativo, educativo**: il grafico «calo dell'anno contro rendimento dell'anno» per gli indici, come quello di J.P. Morgan. Lavoro piccolo.

**Da non fare:** anni analoghi; entropia; «ergodicità»; Poisson; GARCH; serie di giorni consecutivi; soglie «dinamiche» = media dei massimi mobili; % di titoli che battono l'indice come segnale.

## Cosa conferma dei nostri metodi

- **Membri di ogni data.** Con i membri di oggi:
  - la quota di titoli che battono l'indice su 63 sedute sale di 2,7 punti in media (fino a +5);
  - le date dei segnali coincidono solo nel 39–54% dei casi;
  - la quota sopra la media a 200 sedute sale di 3,6 punti in media, ma **ai minimi la differenza è 0–2,6 punti** (2002: 2,6 contro 3,9; 2008: 0,8 contro 0,7; 2020: 6,5 contro 7,5).

  Quindi i livelli blu presi da Rea per gli indici, calibrati verosimilmente sui membri di oggi, restano usabili: sotto il 13% sono 92 giorni con i membri storici e 81 con quelli di oggi (1997–2026). Lo script è `script/sopravvivenza_medie.py`.
- **Confronto con il benchmark ed episodi.** Il confronto storico degli episodi misura già l'eccesso sul benchmark, conta per episodi e parte dal trigger, non dal minimo: è proprio ciò che manca al fascicolo.
- **Chiusure, non estremi intraday.** Nelle soglie dei drawdown evita i bear finti.

## Fonti principali

- **Piattaforma:**
  - https://quant-rea.com/it/
  - https://quant-rea.com/it/tos (fonti dei dati, divieto di scraping)
  - https://quant-rea.com/it/pricing
- **Anni analoghi:** Ernst, Shepp e Wyner (2017) sulla correlazione tra random walk, https://arxiv.org/abs/1608.04120
- **Massimi storici:** J.P. Morgan, rendimenti comprando ai massimi; Maggiulli, https://ofdollarsanddata.com/should-you-invest-in-stocks-at-all-time-highs/
- **Giorni migliori e peggiori:** Estrada (2008), https://blog.iese.edu/jestrada/files/2012/06/BlackSwans.pdf
- **Autocorrelazione giornaliera:** Baltussen, van Bekkum e Da (2018), negativa dal 2000, https://www3.nd.edu/~zda/Indexing.pdf; Working (1960) sulle medie mensili.
- **VIX contro GARCH:**
  - Poon e Granger (2003), https://ideas.repec.org/a/aea/jeclit/v41y2003i2p478-539.html
  - Christensen e Prabhala (1998)
- **Bear market:**
  - tabella Yardeni, https://archive.yardeni.com/pub/sp500corrbeartables.pdf
  - Pagan e Sossounov (2003), https://ideas.repec.org/a/jae/japmet/v18y2003i1p23-46.html
  - Lunde e Timmermann (2004), https://cepr.org/publications/DP4104
- **Capitolazione:**
  - Desmond, 90% days, https://docs.cmtassociation.org/docs/2002DowAwardb.pdf
  - test di CXO sugli indicatori di ampiezza, https://www.cxoadvisory.com/?p=30213
- **Singoli titoli:**
  - J.P. Morgan, «The Agony and the Ecstasy» (2024), https://www.jpmorgan.com/content/dam/jpmorgan/documents/wealth-management/the-agony-and-the-ecstasy-2024.pdf
  - Bessembinder (2018), https://wpcarey.asu.edu/index.php/department-finance/faculty-research/do-stocks-outperform-treasury-bills
- **VIX alto:** Schroders, il segnale non diventa un timing migliore del buy & hold, https://www.schroders.com/pt-pt/pt/investidores-profissionais/perspetivas/how-does-the-stock-market-perform-when-the-vix-fear-gauge-surges/

## File

| File | Contenuto |
|---|---|
| `catalogo.md` | le 34 analisi: domanda, metodo, parametri, numeri dichiarati |
| `risultati/verifica_parte1.md` | Sez. 1–21 |
| `risultati/verifica_parte2.md` | Sez. 22–34 |
| `risultati/verifica_breadth.md`, `risultati/tabelle_breadth.md` | Sez. 11, 14, 30, 31 con i membri storici |
| `script/verifica_parte1.py`, `script/verifica_parte2.py`, `script/verifica_breadth.py`, `script/sopravvivenza_medie.py` | gli script: leggono i dati dalla cartella temporanea della sessione (prezzi Yahoo e sonda dei membri), che non è nel repository |
