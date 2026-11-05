# Emergenti: sintesi della verifica preliminare e nota di passaggio

Fase 1 (verifica preliminare, nessuna modifica all'app), 05/11/2026, ramo `claude/great-noether-2f1ude`, app alla 1.3.4.
Questa nota è il punto di partenza per la sessione che costruirà la pagina. **Le decisioni segnate «da confermare» spettano all'utente: non implementare prima del suo ok.**

## 1. Da dove nasce l'idea

L'utente ha notato su TradingView che il CSI 300 si muove al contrario del DXY, mentre il cambio yuan/dollaro non segue lo stesso schema, e ha chiesto un pannello per cercare i possibili bottom dei mercati emergenti (Cina, India, Brasile, ecc.).
Sector Monitor calcola già breadth e macchina a stati per CSI 300, Nifty 50, Ibovespa, KOSPI 200, Taiwan, Hang Seng ed EEM (vista 6). La domanda della fase 1 era quindi: **uno strato «macro» (valuta locale contro dollaro e dollaro contro le valute emergenti) migliora i bottom che l'app già trova con la breadth?**

## 2. Cosa è stato fatto

| Lavoro | File | Esito |
|---|---|---|
| Dati: copertura e qualità di cambi, dollaro emergente, ETF in dollari | `dati/dati.md`, `dati/risultati.json`, `dati/script/` | serie utilizzabili con regole precise (§4) |
| Backtest: 5 ipotesi con criteri decisi prima | `backtest/backtest.md`, `backtest/risultati.json`, `backtest/script/` | lo strato macro **non** migliora i segnali (§3) |
| Piano di inserimento nel codice | `inserimento.md` | vista nuova «8 Emergenti» (§5) |

Ricalcoli: lo script `backtest/script/verifica.py` (Python, indipendente dai moduli dell'app) ritrova gli stessi trigger, ingressi in zona blu, falliti, segnali e rendimenti. In più, con un terzo calcolo separato a partire da FRED, il dollaro favorevole sui trigger risulta acceso in 1 caso su 31 con il ritardo di pubblicazione (3 su 31 senza ritardo, che però guarda avanti) e la mediana a 126 sedute risulta +21,8% con la valuta ferma contro +8,0% senza, uguale al backtest.

Per rifare tutto: `node dati/script/scarica.mjs`, `node dati/script/analisi.mjs`, `node backtest/script/scarica.mjs`, `node backtest/script/backtest.mjs`, `python3 -I backtest/script/verifica.py`. Gli script scaricano in `cache/`, che non è salvata nel repository.

## 3. Risultato del backtest

> **Correzione del 05/11/2026 (controlli della 1.4.0).** (1) La pulizia dei cambi toglie anche un salto enorme, oltre 5 volte la soglia, che il giorno dopo rientra per almeno tre quarti: TWD=X a 1,80 il 25/10/2011 e a 3,67 il 31/12/2014, CNY=X a 5,86 il 18/07/2011. Prima non si toglievano perché intanto il cambio si era mosso di circa il 3%, e gonfiavano per tre anni la deviazione standard di Taiwan (e un po' quella dello yuan). I movimenti veri del real nella settimana di Lehman (8 e 10/10/2008, confermati dalla Fed) restano. (2) In H5 il denominatore di F conta anche l'episodio in cui F non si accende mai (TWN 2020): **13 su 15**, non 13 su 14 (campo `F.mai` di `risultati.json`). Uno dei 13 è il KOSPI 2026, con il minimo del 26/10/2026 ancora provvisorio.
> Numeri cambiati dalla correzione (`risultati.json` è aggiornato; le tabelle sotto sono della corsa precedente dove non dette): H1 parziale 11 trigger, +21,3% a 126 sedute, 0/11 falliti (prima 10, +21,7%, 0/10); H2 parziale 5 ingressi, +3,3% contro +20,0% dello zero (prima 4, +3,9% contro +19,0%); H3 dal 2016 pieno − base +2,1 punti (prima +2,0); H4 intermedia (TWD) sulle sedute −0,5 punti, sui segnali −9,2 (prima −0,1 e +18,8); esplorazione F acceso/spento sui trigger +21,3% (0/11 falliti) contro +10,1% (4/9), scarto 11,2 punti (prima 13,7); Yahoo e FRED danno un F diverso in 8 trigger su 20 (prima 7). **I verdetti non cambiano.** H5 (statistiche citate nell'app) non cambia. Ricalcolo indipendente: `script/verifica.py` dà «tutto coincide».

Definizioni (fissate prima di guardare i risultati):
- **F, «la valuta ha smesso di scendere»**: il cambio USD/locale si è deprezzato con forza (variazione a 63 sedute in unità di volatilità propria, z ≥ 1) negli ultimi 126 giorni ed è ora sotto il suo massimo a 63 sedute di almeno 0,5 deviazioni standard.
- **D, «dollaro emergente favorevole»**: FRED DTWEXEMEGS sotto la media a 200 sedute e in calo a 63 sedute.

| Ipotesi | Criterio deciso prima | Risultato | Verdetto |
|---|---|---|---|
| H1 trigger | punteggio pieno almeno +5 punti a 126 sedute, meno falliti, in 2 crisi | punteggio pieno in 0 trigger su 31 (D acceso solo in 1) | scartare |
| H2 zona blu | come H1 | pieno in 0 ingressi su 27; punteggio 1 peggio di 0 (+3,3% contro +20,0%) | scartare |
| H3 punteggio su tutte le sedute | monotono e pieno almeno +5 punti sulla base anche dal 2016 | fino al 2015 non monotono; dal 2016 monotono ma solo +2,1 punti | scartare |
| H4 valute libere contro gestite | F informa di più per BRL e KRW | il contrario: +1,1 punti libere, +5,4 gestite | scartare |
| H5 anticipo sui minimi > 25% | F prima del minimo | F in mediana 4 sedute **dopo** il minimo, ma in 13 episodi su 15 era già acceso nei 6 mesi prima (falsi stop); D in mediana 110 sedute dopo | solo contesto |

Perché D non funziona: nelle crisi degli emergenti il dollaro è forte. Il dollaro debole arriva mesi dopo il minimo: è una conferma, non un anticipo.

Osservazione trovata **dopo** i risultati, non un criterio: i trigger con F acceso hanno fatto +21,3% a 126 sedute con 0 falliti su 11, contro +10,1% e 4 falliti su 9 con F spento (dopo la correzione del 05/11/2026; prima +21,7% e +8,0%). È fragile: con i cambi FRED lo scarto scende a +3,2 punti, con la variazione a 126 sedute diventa −4,0, e Yahoo e FRED danno un F diverso in 8 trigger su 20 (prima 7). **Non va scritta nell'app come statistica.**

Limiti: 7 crisi distinte (percentuali indicative); breadth degli emergenti con i membri di oggi; su Yahoo mancano tutti i cambi dal 31/07 al 26/08/2008 (F manca sui trigger del 2009); TWD su Yahoo differisce da FRED oltre il 3% in 194 date.

## 4. Dati: cosa usare (da `dati/dati.md`)

- **Storia**: FRED DEX* (DEXCHUS, DEXINUS, DEXBZUS, DEXKOUS, DEXTAUS, DEXMXUS, DEXSFUS), DTWEXEMEGS e DFII10, complete dal 2006. Pubblicate una volta a settimana (DTWEXEMEGS oggi arriva al 30/10): mostrare sempre la data dell'ultimo valore.
- **Ultimi giorni**: Yahoo (CNY=X, INR=X, BRL=X, KRW=X, TWD=X) solo dopo l'ultimo dato FRED, con un filtro dei picchi isolati. Yahoo ha errori di stampa grossi (TWD 1,80 contro ~30, BRL −27% in un giorno, INR 50,000 tondo, ZAR −18%) e anni interi sfalsati.
- **Cina**: CNY=X. CNH=X su Yahoo non ha storia giornaliera (solo la barra di oggi); dal 2024 differisce da CNY dello 0,16% in mediana.
- **Hong Kong**: cambio agganciato, non dice nulla: mostrare «agganciato».
- **EEM**: già in dollari, per lui conta solo DTWEXEMEGS.
- **DX-Y.NYB non sostituisce DTWEXEMEGS**: misura il dollaro contro le valute sviluppate (58% euro, niente valute emergenti).
- **Pipeline**: FRED ha risposto 503 per alcuni minuti durante gli scarichi, quindi servono tentativi ripetuti e, se fallisce, si tengono i valori già pubblicati. Il controllo di freschezza deve tollerare almeno 10-14 giorni per FRED.
- ETF in dollari (MCHI, INDA, EWZ, EWY, EWT, EWW, EZA, ACWI, EEM) senza buchi; MCHI dal 2011, INDA dal 2012.

## 5. La pagina (decisa con l'utente il 05/11/2026)

**Decisioni dell'utente** (05/11/2026), dopo la demo in `demo/` (prototipo con dati reali: `node demo/build.mjs`, poi `demo/index.html` dal server locale; screenshot a 1440 e 1280 px su computer e a 390 px su telefono, tema chiaro e scuro):
- solo contesto, nessuna regola;
- tutti e quattro gli elementi qui sotto, compreso il punto 4;
- forza relativa: la scia di 10 settimane solo per l'indice selezionato, gli altri come punti;
- grafico del dollaro emergente: si tengono le fasce «favorevole» anche dove si accendono e spengono spesso.

La demo è il riferimento per layout e contenuti: riquadri in cima, tabella dei 7 indici (a schede sul telefono), dettaglio a 3 anni con quattro grafici sulla stessa scala dei tempi, forza relativa e note a destra. La barretta z e le etichette della valuta («In calo forte», «Ha smesso di scendere», «Normale», «Agganciato», «In dollari») non hanno avuto obiezioni. La demo non è codice dell'app: va riscritta con i moduli dell'app (`inserimento.md`).

**Solo contesto, nessuna regola**: nessun punteggio, nessun alert, nessuna modifica a `runMachine` né a Telegram.
Vista nuova «8 Emergenti» (`#emg`), come da `inserimento.md`, che per ciascun indice emergente mostri:
1. lo stato della macchina e la breadth letti dalla vista 6 (stessa fonte, mai ricalcolati);
2. **valuta**: z a 13 settimane con tre stati, «in calo forte» (z ≥ 1), «ha smesso di scendere» (F) e normale, oppure «—» se manca; per HSI «agganciato», per EEM nessuna valuta;
3. **dollaro contro gli emergenti** (DTWEXEMEGS): sopra o sotto la media a 200 sedute, variazione a 3 mesi, data dell'ultimo valore pubblicato;
4. facoltativo: l'indice in dollari accanto a quello in valuta locale, e la forza relativa dell'ETF paese contro ACWI con la formula della rotazione già presente.

Note obbligatorie nell'app (testi da far rivedere all'utente):
- la valuta «ferma» compare spesso nei rimbalzi falliti prima del vero minimo (13 episodi su 15 nel campione): non è un segnale d'ingresso;
- il dollaro emergente debole arriva in genere mesi dopo il minimo (mediana 110 sedute nel campione): conferma, non anticipa;
- per Cina e India il cambio è gestito dalla banca centrale e si muove poco; per Hong Kong è agganciato;
- i dati FRED escono una volta a settimana.
Ogni numero citato nei testi deve venire da `backtest/script/backtest.mjs` (risultati in `backtest/risultati.json`).

Il piano tecnico completo (file, pipeline `scripts/fetch_emerging.js` → `data/emerging.json`, modulo condiviso `js/emerging.js`, API di `js/indices.js`, test unitari, `ricerca/qa/browser/v140.cjs`, versione 1.4.0, rischi con file:riga) è in `inserimento.md`. Con la scelta «solo contesto» la sezione 3.4 si riduce all'uscita A.

## 6. Decisioni aperte per l'utente

1. ~~Fare la pagina o no~~: decisa, solo contesto (§5).
2. ~~Quali elementi tenere~~: tutti e quattro (§5).
3. Ritardo di FRED: nel backtest il valore settimanale vale dal martedì dopo (eccezione dichiarata alla regola «niente riempimento»). Nell'app si mostra l'ultimo valore pubblicato con la sua data.
4. Errori di stampa Yahoo: un salto isolato che si annulla il giorno dopo diventa un giorno mancante.

## 7. Trovato per caso, fuori da questo lavoro (da verificare a parte)

`scripts/lib/yahoo.js:23` (`barDate`) data le barre con il `gmtoffset` di oggi. Per i cambi (fuso Europe/London) le barre del periodo con l'ora legale hanno il timestamp alle 23:00 UTC del giorno prima: lanciato d'inverno, lo script le etichetta con il giorno precedente. Esempio verificato su EURUSD=X: la barra del 30/06/2025 alle 23:00 UTC, cioè l'1/07 a Londra, risulta datata 30/06. La stessa funzione serve `toCurrency` in `scripts/fetch_data.js:452` (cambi per `prices_global.json`): d'estate la conversione in euro potrebbe usare il cambio della seduta dopo. L'effetto è piccolo (circa una variazione giornaliera del cambio), ma va verificato e corretto in una modifica separata.
