# Sviluppo di Sector Monitor: stato, decisioni e prossimi passi

Documento di passaggio per riprendere lo sviluppo senza perdere il filo. Aggiornato al 18/10/2026, versione 0.9.0.
- **Regole di lavoro**: `CLAUDE.md`.
- **Dettaglio tecnico**: `README.md`.
- **Spiegazione per chi usa l'app**: `guida.html`.
- **Ricerche e prove**: `ricerca/`, solo sul ramo di sviluppo `claude/great-noether-2f1ude`.

## 1. A cosa serve

Uno strumento di studio, gratuito e in italiano, per un investitore in euro che costruisce un portafoglio multi-asset con gli ETF e ragiona su mesi e anni. Fa due cose:
1. **Possibili bottom** di settori S&P 500 e indici mondiali, con il metodo di Massimo Rea (quant-rea): la % di titoli sopra la media a 200 sedute scende sotto un **livello blu**, con il drawdown dell'ETF o dell'indice. Una macchina a stati trasforma la lettura in Attenzione → Zona blu → Trigger → (Fallito) → Cooldown.
2. **Rotazione relativa** (stile RRG, con RS-Ratio e RS-Momentum) di settori, MAG7, ETF UCITS in euro (asset class, fattori, regioni, paesi, indici) e asset reali in dollari.

Non è consulenza e non dà ordini: dirige l'attenzione. La regola principale è che ogni numero mostrato sia verificato e verificabile (`CLAUDE.md`).

## 2. Architettura

- **Sito statico** (GitHub Pages, `main`): `index.html`, `guida.html`, `css/style.css` e moduli ES in `js/`, senza build e senza librerie di grafici.
- **Moduli condivisi** (li usano sia l'app nel browser sia gli script Node):

  | Modulo | Contenuto |
  |---|---|
  | `js/engine.js` | rotazione |
  | `js/signals.js` | breadth, macchina a stati, `explainState`, `signalContext`, `approachLevel` |
  | `js/metrics.js` | drawdown |
  | `js/portfolio.js` | portafoglio di riferimento |
  | `js/indexdata.js` | formato compatto degli indici |
  | `js/capitulation.js` | cali forti |
  | `js/calendar.js` | calendari |

- **Viste e grafici**:

  | File | Cosa disegna |
  |---|---|
  | `js/app.js` | avvio, comandi, viste, versione |
  | `js/bottom.js` | Monitor, Bottom Map, Settore, Alert |
  | `js/indices.js` | vista 6 |
  | `js/titles.js` | vista 7 |
  | `js/cap-view.js`, `js/cap-chart.js` | scheda Cali forti |
  | `js/rrg-chart.js`, `js/perf-chart.js`, `js/sector-chart.js`, `js/bottom-map.js` | grafici SVG |
  | `js/format.js` | numeri all'italiana, tooltip, checklist |

- **Avvio in due tempi**:
  - prima i file del Monitor (`prices`, `sectors`, `breadth`, `thresholds`, `breadth_latest`, `alerts`, `config/indices`);
  - dopo il primo disegno `prices_global` e `prices_macro`;
  - alla prima apertura della vista: `indices`, poi `indices_more`, `sector_members`, `capitulation`.
  - I file caricati dopo usano `cache: 'no-cache'`.
- **Versione**: `js/version.js` e `version.json` devono coincidere. Se il browser usa file vecchi l'app lo dice e il pulsante «Nuova versione» riscarica tutto.

## 3. Dati e aggiornamento notturno

Workflow `.github/workflows/update-data.yml`, dopo la chiusura USA e due volte in recupero:

| Passo | Script | Scrive |
|---|---|---|
| Prezzi | `scripts/fetch_data.js` | `data/prices.json` (USA), `prices_global.json` (UCITS in euro), `prices_macro.json` (asset reali, CPI da FRED) |
| Breadth settori | `scripts/fetch_breadth.js` | `breadth.json`, `breadth_latest.json`, `sectors.json`, `sp500_members.json`, `sp500_history.json`, `sector_members.json`, `capitulation.json` (SPX e settori) |
| Indici | `scripts/fetch_indices.js` | `indices.json`, `indices_more.json`, `index_members/*.json`, `capitulation.json` (indici) |
| Alert | `scripts/send_alerts.js` | Telegram e `alerts.json`; un invio fallito si riprova per 5 sedute |
| Commit | `scripts/keep_unchanged.js` | non pubblica i file che cambiano solo per l'ora |
| Controllo | `scripts/check_fresh.js` | fa fallire l'esito se una fonte è ferma oltre il suo limite |

**Ricostruzioni storiche una tantum** (istruzioni in testa a ogni file):
- `scripts/backfill_breadth.py`: settori e S&P 500 dal 2005, con la release Johnbrick123/sp500-data e la storia di datasets/s-and-p-500-companies;
- `scripts/backfill_indices.py`: indici dal 2000, con il comando `prices` per la cache dei membri e `build`;
- `scripts/backfill_capitulation.py`: cali forti, che riusa le due ricostruzioni precedenti.

**Fonti**:
- Yahoo Finance per i prezzi;
- Wikipedia per membri e cambi dell'S&P 500 e liste di molti indici;
- holdings iShares (IVV, EXSA, IWM, EEM, EWT);
- API Nasdaq, Nikkei e B3;
- FRED per il CPI.

**Approssimazioni dichiarate** (devono restare scritte nell'app):
- **Composizione**: storia con i membri di oggi per gli indici senza composizione storica gratuita.
- **Copertura**: inferiore al 100% dove Yahoo non ha i prezzi di un titolo uscito dall'indice.
- **DBMFE**: prima del 28/04/2025 è il DBMF americano convertito in euro.
- **Prezzi mancanti**: ultimo prezzo noto nei giorni di festa di una borsa; bitcoin preso alle sedute di Milano.
- **CPI**: a gradini, dal giorno di pubblicazione.
- **Drawdown**: con i dividendi oppure sul solo prezzo.
- **Cali forti**: esclusi gli errori di stampa; Taiwan escluso (`noCap`).

## 4. Metodi (sintesi; i dettagli sono nel README)

- **Breadth**:
  - un titolo è «sopra» se chiude sopra la sua media a N sedute, avendo almeno N sedute;
  - chiusure rettificate per gli split, non per i dividendi;
  - composizione di ogni data per l'S&P 500 e i settori (anche Dow e Nasdaq-100); il denominatore conta i membri quotati.
- **Livelli blu**:
  - settori: tabella «200 LEVEL SETTORI» di Rea (`config/thresholds.json`);
  - indici: livello di Rea dove c'è, altrimenti il 3° percentile della storia (`config/indices.json`, campo `blueSource`).
- **Macchina a stati** (`config/thresholds.json`):

  | Parametro | Valore |
  |---|---|
  | watchBand | 10 |
  | ddSetup | 70 |
  | ddWatch | 85 |
  | setupCloses | 2 |
  | minRecoveryPoints | 5 |
  | minRecoveryStocks | 2 |
  | slowSetupSessions | 60 |
  | failWindow | 20 |
  | cooldown | 63 |
  | resetFloor | 40 |
  | resetAbove | 25 |

  Il trigger chiede una conferma (due se la zona è lenta o dopo un fallito): spinta di breadth, prezzo sopra una media 20 crescente, divergenza, oppure ritorno al livello di riarmo. È verificato in `ricerca/verifica-trigger/`: nessuna delle regole alternative ha superato i criteri.
- **Avvicinamento**: livello blu più il calo forte (90° percentile) della breadth in 10 sedute. Non è uno stato e non manda alert. Le statistiche nel testo sono «nel campione».
- **Rotazione**: formula «Nuova» (predefinita) e «Medie semplici» a confronto. RS-Ratio e RS-Momentum mantengono questi nomi per scelta dell'utente.
- **Portafoglio di riferimento** (Asset class): 50/30/13/5/2, ribilanciato a fine mese, pesi regolabili nel browser. Trend (DBMFE) ha peso 0.
- **Cap contro equal per settore** (vista 7): indici simulati con i membri di ogni data. L'equal-weight si ribilancia ogni trimestre; il cap-weighted usa le azioni delle holdings IVV. I numeri differiscono da quelli di Rea per metodo (`ricerca/settori-titoli/confronto-rea.md`).
- **Cali forti** (0.9.0):
  - membri con un calo giornaliero di almeno il 5, 7 o 10%, sommati su N sedute (preset di Rea: −7% su 5);
  - allerta oltre il 99° percentile delle sedute precedenti, dopo 3 anni di storia, con almeno 5 cali;
  - solo contesto, «un'allerta che si ripete per settimane» è il segno dei mercati orso lunghi;
  - prova sui 22 indici in `ricerca/quant-rea/risultati/capitolazione/`.

## 5. Decisioni prese con l'utente

| Tema | Decisione |
|---|---|
| Nomi della rotazione | RS-Ratio e RS-Momentum restano: i nomi neutri sono stati provati e tolti (0.8.1) |
| Tema | lo sceglie l'utente; nessun tema automatico |
| Fascia pari | no, nella vista 7 |
| Managed futures | DBMFE.PA, peso 0, non coperto dal cambio, scala automatica |
| Cap contro equal | si tiene il nostro metodo (rendimento reale degli indici) con una nota sulle differenze da Rea |
| Cali forti | addon di contesto con il preset di Rea; il filtro «indice già oltre −20% dal massimo» è solo informativo (colonna «Dal max 52s»), non una regola |
| Telegram per gli indici | rinviato fino alla fine del mese in cui gli indici sono solo registrati |
| Discord | permesso di Massimo Rea (email del 18/10/2026) a condividere tutto nella stanza «Codice della Truppa»; il post con le novità è preparato, lo pubblica l'utente |
| Rendimenti degli episodi | indecisa: calcolarli dalla chiusura della seduta dopo il segnale invece che dal giorno stesso (cambio di regola, da decidere con l'utente) |

## 6. Ricerca svolta (`ricerca/`, ramo di sviluppo)

| Cartella | Contenuto |
|---|---|
| `verifica-trigger/` | due protocolli congelati sulle regole d'ingresso dopo la zona blu: resta il trigger attuale |
| `attenzione/` | fascia di attenzione sopra il livello blu, da cui l'Avvicinamento |
| `indici/` | fonti dei membri, livelli di Rea letti dai suoi grafici, validazione F1 |
| `settori-titoli/` | progetto della vista 7 e confronto con il grafico di Rea |
| `managed-futures/` | quanto pesare il trend following e quale ETF |
| `quant-rea/` | catalogo e verifica delle 34 analisi del fascicolo di un utente, classifica di utilità, prova della capitolazione su 22 indici, preset |
| `qa/` | script Playwright e server per le verifiche nel browser |

## 7. Stato attuale (0.9.0)

- 7 viste, 22 indici, 11 settori, 6 universi di rotazione più gli asset reali.
- Test automatici: `npm test`, 98 test.
- Il primo giro notturno con controllo dei dati fermi, salto dei commit inutili, nuovo tentativo di Telegram, file degli indici divisi e cali forti va verificato dopo la notte tra lunedì e martedì.
- Lista dei membri dell'Ibovespa: la fonte B3 ha risposto 403 in una prova; `check_fresh.js` lo segnala dopo 14 giorni.

## 8. Prossimi passi proposti (in ordine)

| Sigla | Proposta | Note |
|---|---|---|
| A | due righe negli episodi: «dal minimo vero» e «nuovo minimo entro 3 mesi dal trigger» | piccolo |
| B | scheda «Il calo in corso»: episodi de-duplicati, «da −X% a −Y%» con *n*, sedute al minimo e al recupero | serve `data/history_long.json` con le chiusure lunghe degli indici, caricato solo all'apertura |
| D | fasce toro/orso sui grafici degli indici, regola del 20% sulle chiusure | riusa B |
| C | VIX per episodi nella vista Alert | `data/vix.json` dal 1990 |
| — | Telegram per gli indici | dopo il mese di prova |
| — | Taiwan nei cali forti | richiede la chiusura rettificata dei membri |

Altri punti:
- Vista 7: titoli usciti senza le azioni (q), effetto di circa 0,1 punti, e ritardo del CSV rispetto alle uscite segnalate su Wikipedia.
- Da non fare, per la ricerca su quant-rea: anni analoghi, entropia, «ergodicità», Poisson, GARCH, serie di giorni consecutivi, soglie «dinamiche».

## 9. Procedure

- **Pubblicare**: vedi `CLAUDE.md`. Si copiano su `main` solo i file dell'app, mai `ricerca/`; i dati su `main` li aggiorna la Action.
- **Verifiche nel browser**: `node ricerca/qa/server/gzserve.mjs <cartella> <porta>`, poi gli script in `ricerca/qa/browser/` con Playwright (Chromium in `/opt/pw-browsers`).
- **Ricostruire i cali forti**:
  1. `python3 scripts/backfill_indices.py prices --cache DIR`
  2. `python3 scripts/backfill_capitulation.py --jb DIR --repo DIR --cache DIR`
- **Controllare un numero**: ricalcolarlo con uno script indipendente (non con il modulo dell'app) e confrontarlo con una seconda fonte quando esiste (FRED, ETF equal-weight, serie pubbliche).
