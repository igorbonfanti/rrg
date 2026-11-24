# Breadth "% sopra la media a 200 sedute" per gli indici: fonti dati verificate

Ricerca del 15/10/2026. Tutti gli URL marcati **testato** sono stati provati con curl attraverso il proxy della sessione (quindi da un IP "cloud", come quello di una GitHub Action). Nessun file del repo è stato modificato. Script e scaricamenti di prova sono in `/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/indici/` (`ycheck.py`, `sparkstart.py`, `ndx_exp.py`, `dl/`).

---

## 0. In breve

| Qualità | Indici |
|---|---|
| **Buona** (composizione storica gratuita, prezzi quasi completi, serie pronta per validare) | S&P 500 (già fatto), Nasdaq-100 dal 2008, Dow Jones dal ~1993 (completo dal ~2005) |
| **Buona ma solo con i membri di oggi** (storia dal ~2000-2005, distorsione stimabile in +3/+6 punti, minore vicino ai minimi) | Nikkei 225, STOXX Europe 600, FTSE 100, DAX, CAC 40, Euro Stoxx 50, SMI, IBEX 35, TSX 60, ASX 200 |
| **Con limiti forti** | Russell 2000 (manca la composizione storica; i membri di oggi hanno storia solo per il 39% nel 2005 e il 58% nel 2015), FTSE MIB (45% dei membri di oggi ha dati nel 2000), Hang Seng (indice passato da 50 a ~85 titoli dal 2020; 52% dei membri con dati nel 2005), EEM/MSCI EM (composizione cambiata molto: Cina A dal 2018, Arabia dal 2019), KOSPI 200, Ibovespa, Nifty 50, CSI 300 |
| **Da escludere nella forma piena** | KOSPI intero (il portale KRX vuole il login, KIND risponde 403), TAIEX intero (nessuna lista utilizzabile), S&P/TSX Composite intero (holdings di XIC non raggiunte), CSI 300 e KOSPI 200 come *prezzo* dell'indice su Yahoo (nessuno storico: si usa un ETF) |

I numeri di Rea prima del 2000 (S&P dal 1980, Nasdaq-100 e Dow dal 1985, Russell dal 1988) **non si possono rifare con dati gratuiti**: su Yahoo i titoli tolti dal listino non ci sono più, e quelli vivi hanno di rado storia prima del 1985 (Europa e Giappone partono dal 1998-2000). Per farlo servono dati a pagamento (Norgate, CRSP, EODData) o un recupero una tantum da Tiingo con chiave gratuita, solo per gli USA (vedi §2.6).

---

## 1. Fatti trasversali verificati

### 1.1 Yahoo Finance
- **`range=max&interval=1d` NON restituisce dati giornalieri**: Yahoo riduce la granularità a 1mo/3mo (testato: ^GSPC risponde `dataGranularity=3mo`, 169 punti). Per tutto lo storico giornaliero servono `period1=<epoch>&period2=<epoch>&interval=1d`. Per gli indici con `period1` molto vecchio (1928) va bene, ma oltre 100 anni dà errore: con `period1=-1325376000` funziona.
- **Endpoint `v7/finance/spark`** (testato): `https://query1.finance.yahoo.com/v7/finance/spark?symbols=A,B,…&range=1y&interval=1d` accetta **fino a 20 simboli per richiesta** (con 21 risponde 400), senza crumb, e dà chiusure **rettificate per gli split** (NVDA 15/10/2021 = 21,862, uguale a `chart`). Funziona anche con `range=5y` e con `range=max&interval=1mo`. Ho controllato i 1.984 titoli di IWM in **42 secondi**. Per l'aggiornamento serale serve ~20 volte meno richieste che con `chart`.
- Latenza di `chart` (range=2y): 0,21-0,50 s, 33-56 KB per titolo; tutto lo storico giornaliero di AAPL pesa 1,3 MB.
- **Titoli tolti dal listino = nessun dato** (testato: TWTR, ATVI, XLNX, CELG, WBA, FL, X, SIVB, FRC, YHOO, MON, KFT, CBS, EK, 6502.T Toshiba, 9437.T, SHP.L, RDSA.L, ARM.L, DAI.DE, UBI.MI → `Not Found`).
- **Ticker riciclati** (pericolo concreto): BBBY (storia solo da 07/2026, altra società), S (dal 2021), GENZ (dal 2008), DELL (dal 2016), MEDI, SNDK (dal 2025), SPLS, LIN.DE (oggi è Linde plc a Francoforte, dal 2004), HWM (Alcoa→Arconic→Howmet, storia solo dal 2016), 1COV.DE (fermo a 12/2025). Un ticker storico va accettato solo se la sua storia copre il periodo di appartenenza all'indice.
- **Mercati fermi** che Yahoo "risolve" ma che non aggiorna: Russia `.ME` (ultimo dato 07/2022), Egitto `.CA` (07/2024), RICHTER.BD (07/2024), 601198.SS (09/2026). Bisogna scartare i titoli con l'ultimo dato più vecchio di N sedute.
- Gli **indici senza storia su Yahoo** (solo la quotazione del giorno): `^KS200` (KOSPI 200), `000300.SS` (CSI 300). `^TX60`, `^TOPX`, `^SX5E`, `^SXXP`, `^SPE350` non esistono.

### 1.2 iShares: nuovo URL delle holdings (quello vecchio non va più)
Il vecchio `…/1467271812596.ajax?fileType=csv&fileName=IWM_holdings&dataType=fund` ora restituisce **la pagina HTML** (1,5 MB, con `Content-Type: text/csv`!). Il link giusto, preso dalla pagina, è:
- USA: `https://www.ishares.com/us/products/<productId>/<slug>/latest-holdings.csv` (lo slug può essere qualsiasi cosa, es. `x`). **Testato**: IWM 239710, EEM 239637, EWY 239681, EWJ 239665, EWT 239686.
- Regno Unito: `https://www.ishares.com/uk/individual/en/products/<id>/x/latest-holdings.csv`, **testato** per ISF 251795 e EXS1 251464.
- Germania: `https://www.ishares.com/de/privatanleger/de/produkte/<id>/x/latest-holdings.csv`, **testato** per EXSA 251931 e EUN2 251783. Il file è in tedesco: colonne `Emittententicker`, `Anlageklasse` = `Aktien`, `Börse`; numeri con la virgola decimale.
- Lo storico delle holdings (`asOfDate=…`) **non funziona più**: si ottiene sempre l'ultima data.
- iShares Canada (`blackrock.com/ca/…/latest-holdings.csv` per XIC/XIU): 404.

### 1.3 Wikipedia
- `https://en.wikipedia.org/w/index.php?title=<Pagina>&action=raw` (wikitext) non è mai stato limitato. `api/rest_v1/page/html/<Pagina>` e `api.php?action=parse` rispondono spesso **429** dopo poche richieste: servono 6-25 s tra una richiesta e l'altra e uno User-Agent descrittivo. In una Action conviene scaricare poche pagine al giorno, con pause, e tenere l'ultima lista buona (come fa già `fetch_breadth.js`).

### 1.4 Quanto pesa usare solo i membri di oggi: esperimento sul Nasdaq-100
`ndx_exp.py` calcola la breadth a 200 sedute, ogni trimestre dal 2008, in due modi: (a) membri dell'epoca (jmccarrell/n100tickers) che hanno prezzi su Yahoo; (b) i 101 membri di oggi.

| Anno | Copertura dei membri dell'epoca su Yahoo | Scarto medio (b − a) |
|---|---|---|
| 2008 | 55% | +5,0 |
| 2010 | 59% | −0,4 |
| 2012 | 62% | +6,8 |
| 2014 | 67% | +6,8 |
| 2016 | 68% | +9,2 |
| 2018 | 79% | +4,2 |
| 2020 | 87% | +4,2 |
| 2022 | 92% | +0,5 |
| 2024 | 95% | +8,0 |
| 2026 | 98% | +4,4 |

In media **+4,3 punti** (mediana +4,6; da −6,9 a +18,1). **Vicino ai minimi lo scarto è piccolo**: 15/10/2008 0,0; 15/01/2009 +0,5; 15/01/2016 −1,6; 15/10/2022 +2,6; 15/04/2025 +1,7. Per i livelli di Rea (zone basse) la distorsione conta quindi meno che nelle fasi intermedie. Coincide con quanto già scritto nel README dell'app per l'S&P 500 ("con i soli membri attuali la breadth storica risulta 3-6 punti troppo alta"). Nota: lo scarto resta di +4/+8 punti anche nel 2024-2025, quando la copertura è al 95-97%: chi è entrato dopo era di solito un titolo forte (effetto momentum delle inclusioni). La distorsione non è quindi solo un problema di titoli spariti.

### 1.5 Suffissi Yahoo verificati
`.T` Tokyo (codice a 4 cifre) · `.KS` KOSPI, `.KQ` KOSDAQ (6 cifre) · `.L` Londra (`BT.A`→`BT-A.L`, `RR.`→`RR.L`) · `.DE` Xetra · `.PA` Parigi · `.MI` Milano · `.AS` Amsterdam · `.BR` Bruxelles · `.LS` Lisbona · `.SW` SIX · `.ST` Stoccolma (`INVE B`→`INVE-B.ST`) · `.CO` Copenaghen (`NOVO-B.CO`) · `.HE` Helsinki (`NDA-FI.HE`) · `.OL` Oslo · `.MC` Madrid · `.VI` Vienna · `.IR` Dublino · `.WA` Varsavia · `.AT` Atene · `.HK` (codice portato a 4 cifre: `700`→`0700.HK`) · `.SS` Shanghai · `.SZ` Shenzhen · `.NS` NSE · `.BO` BSE · `.TW` TWSE · `.TWO` Taipei Exchange (Gretai) · `.SA` B3 · `.TO` Toronto (`BIP.UN`→`BIP-UN.TO`) · `.AX` ASX · `.SR` Arabia · `.JO` Johannesburg · `.MX` Messico (togliere `*`: `WALMEX*`→`WALMEX.MX`) · `.BK` Bangkok (togliere `.R`) · `.IS` Istanbul (togliere `.E`) · `.QA` Qatar · `.KW` Kuwait · `.AE` Dubai · `.SN` Santiago · `.JK` Giacarta · `.BD` Budapest · `.CL` Colombia · `.PR` Praga · `.CA` Egitto (fermo). **Non funzionano**: `.AD` Abu Dhabi (FAB, ADCB, ALDAR… tutti FAIL), `.PS` Filippine (nessuno), `.KL` Malesia con il nome breve (Yahoo vuole il codice numerico, es. `1295.KL`).

---

## 2. Tabelle per indice

Legenda: "Storia membri di oggi" = quota dei membri attuali con prezzi Yahoo a quella data (fine anno). "Livello Rea" = livello di riferimento dato dal coordinatore, non verificato.

### 2.1 S&P 500 (livello Rea 13)
| Voce | Dato |
|---|---|
| Prezzo | `^GSPC` testato, giornaliero dal **1927-12-30** (`^SPX` identico) |
| Lista attuale | `https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv`, già in uso |
| Composizione storica | `github.com/fja05680/sp500`: `S&P 500 Historical Components & Changes (Updated).csv` dal 1996 (README testato; 487-507 nomi al giorno, primi 5 anni forse incompleti) · `Johnbrick123/sp500-data`: membership_intervals + prezzi Yahoo dal 1995, già usato da `backfill_breadth.py`. Copertura dei prezzi dei membri dell'epoca dichiarata nel loro README: 38% nel 1996, 48% nel 2000, 63% nel 2008, 76% nel 2015, 97% nel 2024 |
| Senza distorsione da sopravvivenza? | Sì, dal 2005 (già fatto; scarto da S5TH tra 0 e +0,4) |
| Serie pronte | S5TH (Barchart `$S5TH`, TradingView `INDEX:S5TH`, Investing.com "S&P 500 Stocks Above 200-Day Average"), StockCharts `$SPXA200R` |
| Raccomandazione | **Includere** (riusare quello che c'è; prima del 2005 la copertura scende sotto il 60%) |

### 2.2 Nasdaq-100 (livello Rea 18)
| Voce | Dato |
|---|---|
| Prezzo | `^NDX` testato, dal **1985-10-01** |
| Lista attuale | `https://api.nasdaq.com/api/quote/list-type/nasdaq100` (header da browser + `Origin`/`Referer: https://www.nasdaq.com`) **testato**: 101 righe; coincide al 100% con `en.wikipedia.org/wiki/List_of_NASDAQ-100_companies` (tabella 0, colonna Ticker). 101/101 su Yahoo |
| Composizione storica | **jmccarrell/n100tickers**, testato: `https://raw.githubusercontent.com/jmccarrell/n100tickers/master/src/nasdaq_100_ticker_history/n100-ticker-changes-YYYY.yaml` (2007…2026). Ogni file ha `tickers_on_Jan_1` più `changes` (data → `union`/`difference`); le date sono a volte tra apici singoli, a volte tra doppi. Copertura dichiarata dal 1/2/2007, aggiornato a ottobre 2026; il pacchetto non è su PyPI, si leggono i YAML. Prima del 2007 ci sono solo i comunicati annuali di Nasdaq e la sezione "Yearly changes" di Wikipedia |
| Copertura Yahoo dei membri dell'epoca | 01/2007: 53 su 100 con storia (61 risolti, 8 riciclati). Ticker rinominati da mappare (ERTS→EA, RIMM→BB, SYMC→GEN, IACI→IAC, DISCA→WBD…), che porterebbero la copertura verso il 65%. Poi 60% nel 2010, 67% nel 2015, 87% nel 2020, 98% nel 2026 |
| Senza distorsione da sopravvivenza? | Sì, **dal 2008** (copertura dal 55% in su, quindi con cautela fino al 2015 circa) |
| Serie pronte | TradingView `INDEX:NDTH`, StockCharts `$NDXA200R` |
| Raccomandazione | **Includere** dal 2008 con la composizione dell'epoca; prima del 2008 niente (o i soli membri attuali, dichiarandolo) |

### 2.3 Dow Jones Industrial Average (livello Rea 15)
| Voce | Dato |
|---|---|
| Prezzo | `^DJI` testato, giornaliero solo dal **1992-01-02** (prima di quella data Yahoo non ha dati; stooq vuole JS) |
| Lista attuale | Wikipedia `List_of_Dow_Jones_Industrial_Average_companies` (tabella 0, colonna Symbol) **testato**: 30, 30/30 su Yahoo, 90% con dati nel 2000 |
| Composizione storica | Wikipedia `Historical_components_of_the_Dow_Jones_Industrial_Average` **testato**: tutte le composizioni a ogni cambio dal 1896 (ultimo: 29/06/2026, Alphabet al posto di Verizon). Ha i nomi, non i ticker: la mappatura va fatta a mano (sono ~60 nomi dal 1985) |
| Copertura Yahoo dei membri dell'epoca (stima a mano) | ~70% nel 1992 (mancano AT&T Corp, Bethlehem Steel, Kodak, GM, Sears, Texaco, Union Carbide, Westinghouse, Woolworth/FL), ~87% nel 2000 (mancano AT&T Corp, Kodak, GM, Alcoa: HWM ha storia solo dal 2016), ~97% dal 2009 (manca WBA 2018-2024, ora tolto dal listino) |
| Senza distorsione da sopravvivenza? | Sì dal 1993, con 4-9 titoli mancanti fino al 2004. Con 30 titoli ogni titolo vale 3,3 punti |
| Serie pronte | Barchart `$DITH`, TradingView `INDEX:DITH` ("Dow Indu Stocks Above 200-Day Average") |
| Raccomandazione | **Includere** dal 1993 (dal 2005 di buona qualità) |

### 2.4 Russell 2000 (livello Rea 15)
| Voce | Dato |
|---|---|
| Prezzo | `^RUT` testato, dal **1987-09-10** (`^RUA` Russell 3000 uguale, `^RUI` dal 1992) |
| Lista attuale | IWM: `https://www.ishares.com/us/products/239710/ishares-russell-2000-etf/latest-holdings.csv` **testato** (320 KB, 1.984 righe `Equity`, al 14/10/2026). Ticker con spazio o punto → `-` (`MOG A`→`MOG-A`). 1.967 risolti su Yahoo; gli altri sono righe "-", diritti CVR e simili. 30/30 nel campione casuale |
| Storia dei membri di oggi | 32% nel 2000, **39% nel 2005**, 46% nel 2010, 58% nel 2015, 78% nel 2020 |
| Composizione storica | Nessuna fonte gratuita in formato leggibile da programma. FTSE Russell pubblica le aggiunte e le esclusioni della ricostituzione annuale in PDF. Le holdings storiche di IWM su iShares non si scaricano più. **SEC EDGAR N-PORT** (holdings trimestrali pubbliche di iShares Trust, CIK 1100663, dal 2019): EDGAR risponde (testato, con User-Agent che contiene un'email) ma non ho estratto la serie IWM. I prezzi di chi è uscito comunque mancano su Yahoo |
| Senza distorsione da sopravvivenza? | **No.** Ricambio del 20-30% l'anno; i vincenti passano al Russell 1000 e i perdenti scendono dal Russell 1000, quindi il segno della distorsione non è nemmeno ovvio |
| Serie pronte | TradingView `INDEX:R2TH` (anche R3TH, MMTH) |
| Raccomandazione | **Includere con limiti**: storico con i membri di oggi solo per gli ultimi 2-3 anni, segnato come indicativo e confrontato a vista con R2TH; da subito salvare ogni sera la lista IWM (come `sp500_members.json`) per costruire la composizione storica in avanti. Alternativa da valutare: S&P SmallCap 600 (`^SP600` dal 1989; lista e cambi su Wikipedia, non testati) |

### 2.5 Nikkei 225 (livello Rea 8)
| Voce | Dato |
|---|---|
| Prezzo | `^N225` testato, dal **1965-01-05** |
| Lista attuale | **Ufficiale** `https://indexes.nikkei.co.jp/nkave/archives/file/nikkei_stock_average_weight_en.csv` **testato** (codifica cp932/Shift-JIS, non UTF-8; colonne Date of Data, Code, Company Name, Industrial Classification, Sector, Weight; 225 righe al 30/09/2026). Esiste anche `…_weight_jp.csv`. La pagina HTML `…/en/nkave/index/component?idx=nk225` risponde 403. Ticker = `Code` + `.T`: **225/225** su Yahoo |
| Storia dei membri di oggi | Yahoo Giappone parte da 12/1999 per quasi tutti: 83% nel 2000, 90% nel 2005, 94% nel 2010 |
| Composizione storica | ja.wikipedia `日経平均株価` § 構成銘柄除外および採用の歴史: cambi **per anno dal 1970**, con i nomi (senza codici né date esatte) **testato**; date precise nei comunicati Nikkei. Ricambio basso (3-6 titoli l'anno). I titoli tolti dal listino non hanno dati (6502.T Toshiba FAIL) |
| Senza distorsione da sopravvivenza? | Parziale: si può ricostruire a mano dal 2000. Con i soli membri di oggi stimo +2/+4 punti (ricambio basso) |
| Serie pronte | Nessuna gratuita trovata |
| Raccomandazione | **Includere** dal 2001 (servono 200 sedute dopo gennaio 2000), con i membri di oggi; in un secondo tempo eventualmente la composizione storica da ja.wikipedia |

### 2.6 STOXX Europe 600
| Voce | Dato |
|---|---|
| Prezzo | `^STOXX` testato ("STXE 600 I", Zurigo), dal **2004-04-26** |
| Lista attuale | EXSA: `https://www.ishares.com/de/privatanleger/de/produkte/251931/x/latest-holdings.csv` **testato**: 604 azioni su 18 borse (130 Londra, 68 Parigi, 68 Xetra, 60 SIX, 51 Stoccolma, 40 Milano, 33 Amsterdam, 27 Madrid, 23 Copenaghen, 22 Oslo, 18 Helsinki, 18 Varsavia, 17 Bruxelles, 10 Atene, 8 Vienna, 6 Dublino, 5 Lisbona). Con la mappatura di `exsa_map.py`: **604/604** su Yahoo, nessuno fermo. La tabella di Wikipedia ha solo 467 righe: non usarla |
| Storia dei membri di oggi | 74% nel 2005, 81% nel 2010 (Yahoo Europa parte dal 1998-2000) |
| Composizione storica | Nessuna gratuita (STOXX la vende; Wikipedia ha solo "Recent changes") |
| Senza distorsione da sopravvivenza? | No. Stima +3/+6 punti, come S&P 500 e Nasdaq-100 |
| Raccomandazione | **Includere con limiti** dal 2006 circa, con i membri di oggi; salvare la lista ogni sera |

### 2.7 FTSE 100
| Voce | Dato |
|---|---|
| Prezzo | `^FTSE` testato, dal **1984-01-03** |
| Lista attuale | Wikipedia `FTSE_100_Index` (tabella "Constituents", colonna Ticker) **testato**: 100, `+.L` → **100/100**. In alternativa ISF `https://www.ishares.com/uk/individual/en/products/251795/x/latest-holdings.csv` **testato** |
| Storia dei membri di oggi | 72% nel 2000, 81% nel 2005, 87% nel 2010 |
| Composizione storica | Wikipedia "Past constituents" = solo un elenco di nomi senza date (non utilizzabile); revisioni trimestrali FTSE Russell in PDF |
| Raccomandazione | **Includere con limiti** dal 2001, con i membri di oggi |

### 2.8 DAX (livello Rea 7)
| Voce | Dato |
|---|---|
| Prezzo | `^GDAXI` testato, dal **1987-12-30** |
| Lista attuale | Wikipedia `DAX` (tabella Components, colonna Ticker, già con suffisso) **testato**: 40, 40/40. EXS1 `…/uk/individual/en/products/251464/x/latest-holdings.csv` **testato** |
| Storia dei membri di oggi | 70% nel 2000, 77% nel 2005, 85% nel 2010 |
| Composizione storica | Wikipedia "Former DAX components": **tabella con date dal 03/09/1990** (66 cambi, l'ultimo 27/12/2024; quelli 2025-26 vanno aggiunti a mano). Attenzione: il **DAX è passato da 30 a 40 titoli a settembre 2021** |
| Senza distorsione da sopravvivenza? | La composizione sì, i prezzi in parte (DAI.DE FAIL, 1COV.DE fermo, LIN.DE riciclato) |
| Raccomandazione | **Includere** dal 2001: con i membri di oggi subito, poi composizione storica da Wikipedia (30 titoli fino al 2021) |

### 2.9 CAC 40 (livello Rea 4)
| Voce | Dato |
|---|---|
| Prezzo | `^FCHI` testato, dal **1990-03-01** |
| Lista attuale | Wikipedia `CAC_40` (tabella Composition, colonna Ticker con `.PA`/`.AS`) **testato**: 40/40 |
| Storia dei membri di oggi | 77% nel 2000, 90% nel 2005, 95% nel 2010 |
| Composizione storica | fr.wikipedia `CAC_40` § "Historique de la composition": tabella con data, titolo entrante e uscente (**testato**, cambi fino al 22/12/2025) |
| Raccomandazione | **Includere** dal 2001 |

### 2.10 FTSE MIB (livello Rea 3)
| Voce | Dato |
|---|---|
| Prezzo | `FTSEMIB.MI` testato, dal **1997-12-31** |
| Lista attuale | Wikipedia `FTSE_MIB` (tabella 1, Ticker `.MI`) **testato**: 40/40. Alternativa: holdings di IMIB (iShares FTSE MIB, product id da cercare) |
| Storia dei membri di oggi | **45% nel 2000**, 65% nel 2005, 70% nel 2010 |
| Composizione storica | it.wikipedia `FTSE_MIB` § "Storia della composizione del paniere" dal 1/6/2009 (testato; testo in tabelle, da trascrivere) |
| Raccomandazione | **Includere con limiti** dal 2006 circa |

### 2.11 Euro Stoxx 50
| Voce | Dato |
|---|---|
| Prezzo | `^STOXX50E` testato, giornaliero dal **2007-03-30** |
| Lista attuale | Wikipedia `EURO_STOXX_50` (tabella Ticker con suffisso) **testato**: 50/50. EUN2 `…/de/privatanleger/de/produkte/251783/x/latest-holdings.csv` **testato** |
| Storia dei membri di oggi | 82% nel 2000, 88% nel 2005 |
| Raccomandazione | **Includere con limiti** (facoltativo: si sovrappone a DAX e CAC) |

### 2.12 SMI (livello Rea 3)
| Voce | Dato |
|---|---|
| Prezzo | `^SSMI` testato, dal **1990-11-09** |
| Lista attuale | Wikipedia `Swiss_Market_Index` (tabella 2, Ticker) + `.SW` **testato**: 20/20 |
| Storia dei membri di oggi | 70% nel 2000, 75% nel 2005, 80% nel 2010 |
| Composizione storica | Wikipedia ha una tabella "Date/Event" di 17 righe (parziale) |
| Nota | 20 titoli: ogni titolo vale 5 punti; il livello 3 di Rea vuol dire "0 titoli sopra la media" |
| Raccomandazione | **Includere** (la breadth è a scatti di 5 punti) |

### 2.13 IBEX 35 (livello Rea 6)
| Voce | Dato |
|---|---|
| Prezzo | `^IBEX` testato, dal **1993-07-12** |
| Lista attuale | Wikipedia `IBEX_35` (tabella Ticker `.MC`) **testato**: 35/35 |
| Storia dei membri di oggi | 42% nel 2000, 57% nel 2005, 80% nel 2010 |
| Composizione storica | es.wikipedia `IBEX_35` § "Componentes históricos" (anno d'uscita); PDF BME `https://www.bolsamadrid.es/docs/SBolsas/InformesSB/compoIBEX.pdf` (testato: 3 pagine, scaricabile, non letto) |
| Raccomandazione | **Includere con limiti** dal 2008 circa |

### 2.14 Hang Seng (livello Rea 8)
| Voce | Dato |
|---|---|
| Prezzo | `^HSI` testato, dal **1986-12-31**; `^HSCE` dal 1993-07-15 |
| Lista attuale | Wikipedia `Hang_Seng_Index` (tabella 6, "SEHK: n"; estrarre le cifre e portarle a 4 + `.HK`) **testato**: 85/85. Il sito ufficiale hsi.com.hk risponde 302 (JS). La lista HSCE su Wikipedia è ferma ad agosto 2022 |
| Storia dei membri di oggi | 27% nel 2000, 52% nel 2005, 67% nel 2010 |
| Composizione storica | Nessuna gratuita testata (comunicati trimestrali di Hang Seng Indexes). La riforma del 2020-22 ha portato l'indice **da 50 a ~85 titoli** e verso le società della Cina continentale |
| Raccomandazione | **Includere con limiti** dal 2010 circa |

### 2.15 KOSPI / KOSPI 200
| Voce | Dato |
|---|---|
| Prezzo | `^KS11` testato, dal **1996-12-11**. `^KS200`: **nessuno storico** su Yahoo, si usa `069500.KS` (KODEX 200, dal 2007-01) |
| Lista KOSPI intero (~950) | **Non disponibile**: data.krx.co.kr `getJsonData.cmd` risponde `400 LOGOUT` (ora serve il login); `kind.krx.co.kr/corpgeneral/corpList.do` risponde 403 (Akamai) |
| Lista KOSPI 200 | Wikipedia `KOSPI_200` (tabella "Symbol" a 6 cifre) **testato**: 200 → `.KS` **200/200**. EWY (77) come riserva |
| Storia dei membri di oggi | 45% nel 2000, 59% nel 2005, 70% nel 2010 |
| Composizione storica | Nessuna gratuita |
| Raccomandazione | **KOSPI 200 con limiti** dal 2008 circa; il KOSPI intero va escluso |

### 2.16 MSCI Emerging Markets come in EEM (livello Rea 15)
| Voce | Dato |
|---|---|
| Prezzo | `EEM` (dal 2003-04); nessun indice MSCI su Yahoo |
| Lista | `https://www.ishares.com/us/products/239637/x/latest-holdings.csv` **testato**: 1.187 azioni (242 Shanghai, 173 Shenzhen, 163 India, 152 Hong Kong, 73+4 Corea, 68+6 Taiwan, 42 Brasile, 28 Arabia…) |
| Risolti su Yahoo (tutti provati) | 1.129 su 1.183 (95%) con la mappatura semplice di `eem_map.py`. Mancano Malesia 21 (servono i codici numerici), Filippine 9 (non su Yahoo), Abu Dhabi 9, Messico 4 (`*`), Russia (fermi dal 2022), Egitto (fermi dal 2024). Con le correzioni si arriva al **97% del numero** e a più del 98% del peso |
| Storia dei membri di oggi | **44% nel 2005, 62% nel 2010** (Cina 188/575 nel 2005) |
| Composizione storica | Nessuna (MSCI a pagamento; N-PORT di EEM su EDGAR dal 2019). La composizione è cambiata molto: Cina A dal 2018, Arabia 2019, Kuwait 2020, Russia esclusa 2022 |
| Alternativa più leggera | Le richieste non sono il problema (1.187 titoli = 60 chiamate spark). Lo è la storia: limitare l'indice ai primi ~300 titoli per peso (le large cap hanno storia più lunga) oppure accettare la serie dal 2012 circa |
| Raccomandazione | **Includere con limiti**, dal 2012 circa, con i membri di oggi e un'avvertenza chiara |

### 2.17 Altri indici di paese (richiesta aggiuntiva)
| Indice | Prezzo Yahoo (inizio) | Lista attuale (testata) | Membri risolti | Storia dei membri di oggi (2000 / 2005 / 2010) | Composizione storica | Raccomandazione |
|---|---|---|---|---|---|---|
| **Taiwan** (TAIEX ~1.000 / Taiwan 50) | `^TWII` dal 1997-07-02; `0050.TW` dal 2009-01 | TAIEX intero: nessuna lista (OpenAPI TWSE non utilizzabile da qui). EWT (MSCI Taiwan, 76) `…/products/239686/x/latest-holdings.csv` | 74/76 (`.TW`/`.TWO`) | 50% / 69% / 84% | no | **Con limiti**: usare EWT come lista (somiglia al Taiwan 50) |
| **Corea** | vedi §2.15 | KOSPI 200 Wikipedia | 200/200 | 45% / 59% / 70% | no | KOSPI 200 **con limiti** |
| **Canada** (TSX 60 / Composite) | `^GSPTSE` dal 1979-06-29; `^TX60` non esiste → `XIU.TO` dal 1999-10 | Wikipedia `S&P/TSX_60` (colonna Symbol; `.`→`-`, `+.TO`) | 59/59 | 64% / 76% / 88% | no | TSX 60 **con limiti**; il Composite si esclude (holdings di XIC non raggiunte) |
| **Brasile** (Ibovespa) | `^BVSP` dal 1993-04-27; `BOVA11.SA` dal 2008-11 | **B3 ufficiale**: `https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/<base64 di {"language":"en-us","pageNumber":1,"pageSize":120,"index":"IBOV","segment":"1"}>` → 76 titoli (campo `cod`) | 76/76 (`.SA`) | 34% / 46% / 71% | no | **Con limiti** dal 2010 circa |
| **Cina** (CSI 300) | `000300.SS` **senza storico**; `000001.SS` Shanghai Composite dal 1997-07; `510300.SS` (ETF CSI 300) dal 2012-05 | Wikipedia `CSI_300_Index` (300, "SSE: 600519"→`600519.SS`, "SZSE:"→`.SZ`) | campione 60/60 | 20% / 30% / 51% | Wikipedia ha una tabella "In/Out" di 25 righe | **Con limiti** dal 2012 circa; alternativa HSI/HSCE |
| **India** (Nifty 50) | `^NSEI` solo dal 2007-09-17 (`^BSESN` Sensex dal 1997-07) | Wikipedia `NIFTY_50` (colonna Symbol, `+.NS`) | 50/50 | 35% / 76% / 84% | Wikipedia "List of replacements since 2008" (71 righe, con le date): **composizione storica possibile** | **Includere** dal 2009 |
| **Australia** (S&P/ASX 200) | `^AXJO` dal 1992-11-22 | Wikipedia `S&P/ASX_200` (wikitext, codici di 3 caratteri, al 05/04/2026) | 192/196 (4 usciti) | 43% / 55% / 67% | no | **Con limiti** dal 2008 circa |

---

## 3. Serie pronte (per validare; non le ho scaricate)
- **Barchart / TradingView** ("Stocks Above 200-Day Average", chiusure non rettificate per i dividendi, come già annotato nel README): `S5TH` (S&P 500), `NDTH` (Nasdaq-100), `DITH` (Dow, esiste su Barchart `$DITH` e TradingView `INDEX:DITH`), `R2TH` (Russell 2000), `R3TH`, `MMTH` (tutto il mercato USA), più le varianti 20/50 giorni (`…TW`, `…FI`). Uso ammesso: confronto manuale su qualche data, come già fatto con S5TH e SUTH.
- **Investing.com**: pagina "S&P 500 Stocks Above 200-Day Average (S5TH)".
- **StockCharts**: `$SPXA200R`, `$NDXA200R` (schema `$<indice>A<giorni>R`); usa dati rettificati per i dividendi; la lista completa è visibile solo da loggati; i termini vietano lo scraping.
- **Indici non USA**: non ho trovato serie gratuite "% sopra la media a 200 sedute" per Nikkei, STOXX, FTSE, DAX, HSI, EEM e gli altri. La validazione è possibile solo contro i grafici di Rea.

## 4. Fattibilità nella GitHub Action serale

Universo totale, togliendo i doppioni (tra S&P 500 e Nasdaq-100, Dow e S&P 500, STOXX 600 e gli indici europei, EEM e KOSPI 200/HSI/Nifty/Ibovespa/EWT/CSI 300): **circa 4.500-5.000 titoli** (S&P 500 ~503, Nasdaq-100 extra ~15, Russell 2000 ~1.970, Nikkei 225, STOXX 600 ~604 + ~30 italiani/spagnoli che non ne fanno parte, KOSPI 200, HSI 85, EEM ~1.130, TSX 60, Ibovespa 76, CSI 300, Nifty 50, ASX 200).

| Modo | Richieste | Tempo stimato |
|---|---|---|
| `chart` per titolo (come oggi), 3 in parallelo con 150 ms di pausa (~0,3 s a richiesta → ~6-7 richieste/s) | ~5.000 | **~12-15 min** (Russell 2000 da solo ~5 min, STOXX 600 ~1,5 min, EEM ~3 min) |
| **`spark` con 20 simboli** e `range=1y` (bastano 252 sedute per la media a 200) | ~250 | **~1-2 min** (misurato: 1.984 titoli in 42 s) |
| Ricostruzione storica una tantum (`chart` con `period1`/`period2`, fuori dall'Action come `backfill_breadth.py`) | ~5.000 × 0,3-1,3 MB | 15-20 min, qualche GB scaricato una volta |

- Consiglio: Action serale con **spark** (meno esposta al limite di Yahoo); `chart` solo per i titoli nuovi o per ricalcoli.
- Lo stato da tenere: le ultime ~260 chiusure di ogni membro (~5.000 × 260 numeri, ~10 MB compressi) oppure ricalcolo da spark ogni sera; le serie pubblicate restano conteggi interi come `breadth.json`.
- Indici "più leggeri" consigliati: **KOSPI 200** al posto del KOSPI intero (obbligato); **EWT/Taiwan 50** al posto del TAIEX; **TSX 60** al posto del Composite; per il Russell 2000 resta l'IWM completo (con spark costa ~100 richieste: il limite non è tecnico ma storico). S&P Europe 350 non ha una fonte gratuita di costituenti e non porta vantaggi rispetto a EXSA, che funziona.
- **Titoli usciti senza storia Yahoo**: con la composizione dell'epoca il denominatore va contato solo sui membri con prezzi, e la copertura va pubblicata (come già fa l'app). Con i soli membri di oggi la serie risulta di +3/+6 punti troppo alta nelle fasi intermedie, quasi corretta vicino ai minimi (§1.4). Prima di ~2005 la copertura scende sotto il 50-60% quasi ovunque.
- Fonti fragili da proteggere con "ultima lista buona" e controlli sul numero dei titoli: Wikipedia (429), iShares (ha appena cambiato URL), CSV Nikkei (codifica cp932), API B3, API Nasdaq (header).
- Possibile recupero USA una tantum: Tiingo con chiave gratuita ha i titoli tolti dal listino (lo usa lo script `fetch_delisted_tiingo.py` di Johnbrick123): non testato, da verificare nei termini d'uso.

## 5. ETF per la rotazione RRG (tutti verificati su Yahoo: nome e inizio storia)

| Indice | USA | UCITS in EUR (Milano/Xetra/Parigi) |
|---|---|---|
| S&P 500 | `SPY` (1993) | `CSSPX.MI` iShares Core S&P 500 Acc (2010) — già nell'app |
| Nasdaq-100 | `QQQ` (1999) | `EQQQ.MI` Invesco EQQQ (2007), `CSNDX.MI` / `SXRV.DE` iShares Nasdaq 100 Acc (2009/2010) |
| Dow Jones | `DIA` (1998) | `DJE.MI` / `DJE.PA` Amundi DJIA Dist (2007), `SXRU.DE` iShares DJIA Acc (2010) |
| Russell 2000 | `IWM` (2000) | `R2US.MI` / `ZPRR.DE` SPDR Russell 2000 (2015/2014), `XRS2.DE` / `XRS2.MI` Xtrackers (2015), `SR2000.MI` Invesco (2014) |
| Nikkei 225 | `EWJ` (MSCI Japan, 1996); locale `1321.T` (2008) | `CSNKY.MI` iShares Nikkei 225 (2009), `EXX7.DE` (2007), `XDJP.DE` (2012); l'app usa `SJPA.MI` (MSCI Japan IMI) |
| STOXX 600 | `VGK` (FTSE Europe, 2005), `IEUR` (2014) | `EXSA.DE` / `EXSA.MI` iShares STOXX Europe 600 (2007/2008), `MEUD.PA` Amundi (solo dal 2024) |
| Euro Stoxx 50 | `FEZ` (2002) | `EXW1.DE` (2007), `CSSX5E.MI` / `SXRT.DE` (2010) |
| FTSE 100 | `EWU` (MSCI UK, 1996) | `ISF.MI` iShares Core FTSE 100 Dist (2007) — già nell'app; `CUKX.L` Acc solo in GBp |
| DAX | `EWG` (MSCI Germany) | `EXS1.DE` (2007) — già nell'app; `DAXX.MI` Amundi DAX II (2007) |
| CAC 40 | `EWQ` (MSCI France) | `CACC.PA` Acc (2018) — già nell'app; `CAC.PA` Dist (2007, storia più lunga) |
| FTSE MIB | `EWI` (MSCI Italy) | `XMIB.MI` (2007) — già nell'app; `IMIB.MI`, `ETFMIB.MI` (2007), `SXRY.DE` (2010) |
| SMI | `EWL` (MSCI Switzerland) | `XSMI.MI` Xtrackers Switzerland (2007) — già nell'app; `CSSMI.SW` in CHF |
| IBEX 35 | `EWP` (MSCI Spain) | `LYXIB.MC` Amundi IBEX 35 (2007, Madrid) — già nell'app |
| Hang Seng | `EWH` (MSCI Hong Kong, 1996; ≠ HSI); locali `2800.HK` (2008), `3115.HK` | Nessun UCITS sull'HSI su Milano/Xetra; `HKDE.AS` UBS MSCI Hong Kong (2015); per la Cina `XCS6.DE` |
| KOSPI 200 | `EWY` (2000); locali `069500.KS`, `069660.KS` (2006) | `IQQK.DE` iShares MSCI Korea Dist (2008) — già nell'app. **`IKOR.MI` è fermo da 11/2025: non usarlo** |
| EEM | `EEM` (2003) | `IEEM.MI` iShares MSCI EM Dist (2007); l'app usa `EIMI.MI` (EM IMI, 2014) |
| Taiwan | `EWT` (2000); `0050.TW` | `IQQT.DE` iShares MSCI Taiwan Dist (2007) — già nell'app |
| Canada | `EWC` (1996); `XIU.TO` | `CSCA.MI` iShares MSCI Canada Acc (2009) — già nell'app |
| Brasile | `EWZ` (2000); `BOVA11.SA` | `IBZL.MI` iShares MSCI Brazil Dist (2007) — già nell'app |
| Cina | `FXI` (2004), `MCHI` (2011); `510300.SS` | `XCS6.DE` Xtrackers MSCI China 1C (2011) — già nell'app |
| India | `INDA` (2012); `NIFTYBEES.NS` | `QDV5.DE` iShares MSCI India Acc (2018) — già nell'app |
| Australia | `EWA` (1996); `STW.AX` | `SAUS.MI` iShares MSCI Australia Acc (2014) |

Nomi degli ETF già nel gruppo "4 · Paesi" di `universe.json`, come li riporta Yahoo: CSCA.MI "iShares VII PLC - iShares MSCI Canada ETF USD Acc", IQQK.DE "iShares MSCI Korea UCITS ETF USD (Dist)", IQQT.DE "iShares MSCI Taiwan UCITS ETF USD (Dist)", IBZL.MI "iShares MSCI Brazil UCITS ETF USD (Dist)", XCS6.DE "Xtrackers MSCI China UCITS ETF 1C", QDV5.DE "iShares MSCI India UCITS ETF USD Acc", XSMI.MI "Xtrackers Switzerland UCITS ETF 1D", XMIB.MI "Xtrackers FTSE MIB UCITS ETF 1D", LYXIB.MC "Amundi IBEX 35 UCITS ETF Dist", CACC.PA "Amundi CAC 40 UCITS ETF Acc", EXS1.DE "iShares Core DAX UCITS ETF (DE) EUR (Acc)", ISF.MI "iShares Core FTSE 100 UCITS ETF GBP (Dist)". Seguono indici MSCI di paese, non TAIEX, KOSPI, Ibovespa o Nifty: per la RRG va bene.

## 6. Raccomandazione finale

1. **Subito, buona qualità**: S&P 500 (c'è già), **Nasdaq-100 dal 2008** con la composizione dell'epoca (n100tickers), **Dow dal 1993** con le composizioni di Wikipedia (mappatura a mano di ~60 nomi). Validazione con NDTH/DITH su qualche data.
2. **Subito, con i membri di oggi e un'avvertenza "storico indicativo, +3/+6 punti nelle fasi intermedie"**: Nikkei 225 (dal 2001, lista ufficiale Nikkei), DAX, CAC 40 (anche con la composizione dell'epoca da Wikipedia en/fr), STOXX Europe 600 (EXSA, 604/604), FTSE 100, SMI, Euro Stoxx 50 (facoltativo), TSX 60, Nifty 50 (dal 2009; composizione dell'epoca possibile).
3. **Con limiti dichiarati** (storia breve o composizione molto cambiata): Russell 2000 (storico solo 2-3 anni, poi costruito in avanti salvando IWM ogni sera), FTSE MIB e IBEX (dal 2006-2008), Hang Seng, KOSPI 200, EEM (dal 2012), Ibovespa, ASX 200, Taiwan con EWT, CSI 300 con `510300.SS` come prezzo.
4. **Escludere**: KOSPI intero, TAIEX intero, S&P/TSX Composite intero (nessuna lista gratuita raggiungibile), e qualsiasi tentativo di arrivare al 1980-1990 con Yahoo.
5. Tecnica: passare a **spark (20 simboli a richiesta)** per l'aggiornamento serale; ricostruzione storica una tantum fuori dall'Action; **salvare ogni sera la lista dei membri di ogni indice** (come già per l'S&P 500), così da domani tutti gli indici accumulano una composizione storica vera.
