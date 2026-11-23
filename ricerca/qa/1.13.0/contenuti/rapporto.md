# QA indipendente dei contenuti, 1.13.0 «note più corte»

Controllo del 23/11/2026. Versione controllata: commit `2e33ad3` (1.13.0); confronto: commit `0c253bb` (1.12.0, pubblicata). Stessi file in `data/` nelle due copie (copiati da `/home/user/rrg/data/`, `diff -r` vuoto; anche `config/` uguale). Stesse scelte: 1440×900, tema scuro, `sm.introSeen=true`, contesto del browser pulito per ogni scenario. Nessun file dell'app è stato modificato e non c'è nessun commit.

## Come rifare il controllo

```
git worktree add /tmp/qa-c-new 2e33ad3 && git worktree add /tmp/qa-c-old 0c253bb
for d in /tmp/qa-c-new /tmp/qa-c-old; do rm -rf $d/data && cp -r data $d/data; done
(cd /tmp/qa-c-new && python3 -m http.server 8811 --bind 127.0.0.1 &) ; (cd /tmp/qa-c-old && python3 -m http.server 8812 --bind 127.0.0.1 &)
cd ricerca/qa/1.13.0/contenuti && export NODE_PATH=$(npm root -g)
node estrai.cjs http://127.0.0.1:8812/ old.json && node estrai.cjs http://127.0.0.1:8811/ new.json
python3 confronta_blocchi.py old.json new.json > blocchi.txt      # controllo 1: tabelle, SVG, kpi, fatti, liste, meta, legende
python3 confronta_id.py old.json new.json > id.txt                # controllo 1 bis: numeri di ogni elemento con id
python3 conserva_qa.py old.json new.json /tmp/qa-c-new/guida.html /tmp/qa-c-old/guida.html   # controllo 2 -> conserva_qa.txt, guida_tolte.txt
python3 approssimazioni.py > approssimazioni.txt                  # controllo 3
python3 citazioni.py                                              # controllo 4
```

`estrai.cjs` apre 27 scenari in tutte e due le versioni: 1 Monitor (anche alla prima visita), 2 Rotazione (settori, settori con Prezzi, MAG7, Asset class, Asset class con Prezzi, Fattori, Paesi, Asset reali, Medie semplici), 3 Bottom Map, 4 Settore XLK, SOXX e XLRE (riquadri richiudibili aperti), 5 Titoli XLK e SOXX, 6 Indici SPX, DAX, KOSPI 200 e S&P/TSX 60 (riquadri aperti), 7 Emergenti (iniziale e CSI 300), 8 VIX, 9 Alert, 0 Massimi (con una riga aperta), guida rapida. Per ogni scenario legge il testo visibile, il testo intero (anche nascosto), `title`/`aria-label`/`data-info`, la riga di fonti e il testo di ogni riquadro «i» **aperto davvero con un clic**. Console senza errori in tutti i 54 caricamenti.

Il controllo 2 non usa l'inventario né `ricerca/semplificazione/conserva.cjs`. Parte dal testo intero della pagina 1.12.0, lo divide in frasi (1.287) e cerca ogni frase che non c'è più identica, numero per numero e parola per parola, a tre livelli: L0 = stessa vista della 1.13.0 (con i contenitori nascosti e i riquadri aperti), L1 = L0 più le sezioni della guida aperte dai «i» della vista e dal suo link «Fonti e note», L2 = tutta la guida. Le 94 frasi segnalate (`conserva_qa.txt`, «DA GUARDARE») le ho lette a mano.

## Tabella dei controlli

| # | Controllo | Esito | Cosa ho verificato |
|---|---|---|---|
| 1 | Nessun numero mostrato cambia | **verde** | 650 blocchi uguali nelle due versioni (tabelle, SVG con le etichette dei grafici, kpi, elenchi di fatti, schede, liste, testi e `title` delle celle). I 33 blocchi diversi sono solo `.meta` e legende accorciate, senza numeri di dati (`blocchi.txt`). Per elemento con id: 763 uguali, 19 diversi, tutti note accorciate. Ogni numero tolto è ancora nella stessa vista, nel testo o nel riquadro «i» (`id.txt`). Non è cambiata nessuna cella, nessuna etichetta di grafico e nessun kpi. |
| 1a | Differenze spiegate | **verde** | `bmMeta` perde «(in zona blu si entra dopo 2 chiusure)», che è nel «i» della legenda. Le legende «avvicinamento» perdono «10 sedute», che è nel «i» accanto. `epiMeta`/`ixEpiMeta` perdono «rendimenti a confronto sotto la tabella». `vxScMeta`, `vxScNote` e `titSpreadNote` sono accorciate e il testo intero è nel «i». `ixQuality`: la fonte della lista è passata nel `title`. `mxNow` mostra il ticker invece della frase, che resta nella riga evidenziata. `#stateLegend` ha una riga per stato e la regola intera è in `#stateHelp`. `test`: 206/206 verdi. |
| 2 | Nessuna informazione persa | **verde con rilievi** | 633 frasi identiche. Nelle altre, i numeri sono a L0 in 380 casi con numeri, a L1 in 6 e solo in tutta la guida in 14, più 1 perso: la versione «1.12.0 del 22/11/2026», atteso. Le frasi tolte dalla guida vecchia (29) hanno tutte le parole e i numeri nella guida nuova (`guida_tolte.txt`). Le frasi della guida rapida stanno nella guida completa, aperta dal suo link (decisione dell'utente). Restano i rilievi R1, M4, M5 e M8: affermazioni a più di un passo. |
| 3 | Approssimazioni a un passo | **verde con minori** | `approssimazioni.txt`, per scenario: dove compaiono (V visibile, A attributo, I riquadro «i», H nascosto) nelle due versioni. In pagina: provvisorio, «storia ricostruita con i membri di oggi» (Indici, SOXX nella vista 4), «solo prezzo» (Indici, Massimi, VIX nel «i» della tabella), asterisco e riga dell'ultimo prezzo noto (Prezzi; negli universi globali ora visibile, prima più in basso), «livelli blu di oggi» (Alert, Bottom Map storica: codice invariato), «Storia ricostruita, incompleta prima del 2013» (Episodi). Nel «i» del pannello: CPI a gradini e ottobre 2025 (Asset reali), errori di stampa dei Cali forti, cambio della Fed dello stesso giorno e Yahoo provvisorio (Emergenti), «una stima» per i pesi (Titoli). DBMF prima del 28/04/2025 nel `title` della riga, come prima, e in #trend e #fonti-rrg. Copertura nel `title` di Situazione, come prima. Taiwan `noCap` resta nella pagina (codice invariato). Rilievi M2 e M6. |
| 4 | Citazioni obbligatorie | **verde** | Ogni vista ha una riga di fonti con «Massimo Rea» e il link a quant-rea.com. In più: VIX «VIX e VIX3M © Cboe, da FRED» e «Stefano Serafini»; vista 0 «Francesco Caruso»; Emergenti «Federal Reserve» e «FRED»; Settore «Drop giornaliero cumulato». Ogni link porta a `guida.html#fonti-<vista>`, e la sottosezione esiste e ha il testo intero con le stesse citazioni. Le 39 ancore usate dalla pagina e dai js esistono in `guida.html`, e anche tutti i link interni della guida (`citazioni.py`). Ogni «i» aperto ha un testo e il link alla sua ancora. |
| 5 | Testi nuovi nella guida corrispondono alla fonte | **verde con rilievi** | Ricalcolati io: (a) **89/132** e 83/132 degli indici e **40%** che arriva al livello entro 126 sedute (numero nuovo nella guida): `risalita.mjs` rifatto su una copia con i dati di oggi dà 89/132, 83/132 e 40,2% (133/331), come `risalita.json` (40,3%, 133/330) e `sintesi.md`; «6 più della sola Attenzione» = 89−83. (b) **RSP 0,47 su 60**: media di \|eq−rsp\| sulle 60 righe di `ricerca/settori-titoli/confronto_etf.json` = 0,467; **SPDR 1,6-1,7**: XLP 1,65 e XLK 1,63, poi XLB 1,50 e XLY 1,26, gli altri sotto 1. (c) **«15 su 17»** e **mediana 110 su 19**: ricontati dagli episodi di `ricerca/emergenti/backtest/risultati.json` (H5). (d) **CPI di ottobre 2025**: `null` nei mesi e nelle uscite di `data/prices_macro.json`. (e) **StockCharts, 11 letture del 25/09/2026, circa 0,2 con SPY**: uguale al testo vecchio della pagina e al README (riga 300); le letture restano private, come da CLAUDE.md. (f) SOXX al 3% (`config/industries.json`), Taiwan escluso (`noCap`), future GC=F/SI=F/HG=F/CL=F (`config/ath.json`), «YTD da Milano» (guida, Limiti, già c'era), cali di HYG/IEF −41%/−29% (già c'era). Rilievi R2 e M7. |
| 6 | Coerenza e rimandi | **verde con minori** | Nessun rimando a testi tolti: cercati «Come si legge», «Come leggere il VIX/contesto», «vedi la nota», «qui sotto», «sotto la tabella», «come si calcola», «Da sapere», «piè di pagina» in index.html, js, guida, README e docs. Quelli rimasti puntano a cose che ci sono: «Come si legge lo stato», «Come leggere i benchmark», «Come si legge ↗» della linea dei massimi, la «riga sotto i riquadri» del VIX, la nota sotto il grafico degli Emergenti. La nota 1.13.0 del README, `docs/sviluppo.md` e `fase2.md` dicono le stesse cose della pagina, con due eccezioni di dettaglio (M6). La guida rapida rimanda alla guida completa e ai «i». Il title del kpi «Premio per la paura» non rimanda più a «Come leggere» ma alla sezione della guida (senza link: R1). |

## Rilievi

Nessun **bloccante**.

### Da correggere

**R1. VIX: le affermazioni del pannello «Come leggere il VIX» tolto non sono a un passo.** Il pannello «VIX e indice nel tempo · struttura a termine e credito» non ha un bottone «i». Le frasi che nella 1.12.0 stavano nella pagina oggi sono solo nella guida, in `#vix-realizzata` e `#vix-struttura`, e nessun «i» apre queste due sezioni:
- VIX sopra la realizzata nell'83% delle sedute dal 2005, in media di 3,4 punti;
- premio alto acceso 204 volte, picco della volatilità entro 21 sedute solo in 12;
- GARCH provata e scartata;
- dal 2008 tutti gli episodi sopra 30 erano già in backwardation, e il ritorno al contango non è stato un ingresso migliore;
- credito: cosa vuol dire, non è uno spread ufficiale, verifica con il Baa scartata per la licenza.

Dalla pagina ci si arriva solo con «Fonti e note» → `#fonti-vix` → «8 VIX» (`#vix`) e poi scorrendo. Il title del kpi «Premio per la paura» nomina la sezione («guida, «VIX contro volatilità realizzata»») senza link. Le ancore `vix-realizzata` e `vix-struttura`, che `fase2.md` elenca tra quelle «usate dai «i»», non sono usate da nessun `data-guide`.
Per riprodurre: aprire `#vix` e guardare l'intestazione del pannello in fondo (nessun «i»). Poi `grep -n 'data-guide="vix-realizzata"\|data-guide="vix-struttura"' index.html js/*.js` non trova niente. In `conserva_qa.txt` le frasi «Dal 2005 il VIX è stato sopra…» e «Il VIX sale insieme ai ribassi…» risultano «numeri:L2».
Proposta: un «i» sul titolo del pannello, con 2-3 frasi (83%, 204/12, «solo contesto» di struttura e credito) e `data-guide="vix-realizzata"`, oppure due «i» (realizzata e struttura).

**R2. `guida.html#fonti-tit`: l'esclusione dei titoli acquisiti è attribuita al SOXX.** Il testo nuovo dice «SOXX: … Sono esclusi i titoli usciti dall'indice che non hanno più prezzi (acquisiti) …». L'elenco (oggi CTRA, HOLX, DAY, K, IPG, WBA) viene invece da `data/sector_members.json` (`missing`), cioè dai settori S&P 500, mentre `data/industry_members.json` ha `missing: []`.
Per riprodurre: `python3 -c "import json;print(json.load(open('data/sector_members.json'))['missing'], json.load(open('data/industry_members.json'))['missing'])"`.
La stessa ambiguità c'è già nella 1.12.0, nel testo di `#titData`, scritto da `js/titles.js:140`: la frase segue quella del SOXX. Nella guida però è nuova ed esplicita. Proposta: spostare la frase nel paragrafo dei dati S&P 500 («… chi non è nelle holdings …; esclusi i titoli usciti senza più prezzi»).

### Minori

- **M1. Regola dell'avvicinamento riformulata.** La riga di legenda del Monitor e la guida rapida dicono «breadth vicina al livello blu dopo un calo veloce». La regola è: breadth sotto il livello blu più il calo forte, il 90° percentile, in 10 sedute. Quindi la breadth è «a un calo forte dal livello», non «dopo» un calo. È una frase della regola: va sentito l'utente. Proposta: «breadth a un calo forte (10 sedute) dal livello blu: promemoria, non uno stato». Per riprodurre: `js/bottom.js:268` e `index.html` (guida rapida, «Avvicinamento»).
- **M2. Fonte della lista di ogni indice solo nel `title`.** Prima era nel testo di `#ixQuality`; ora è un `title` su un paragrafo senza la sottolineatura a puntini, che con la tastiera non si apre e sul telefono si vede solo toccando un paragrafo qualsiasi. `#fonti-idx` elenca le fonti in generale, ma non nomina `github.com/jmccarrell/n100tickers` (lista storica del Nasdaq-100). Per riprodurre: `#idx`, indice NDX, nota di Situazione.
- **M3. Numero di configurazione scritto a mano.** Il «i» della legenda della Bottom Map dice «In zona blu si entra dopo 2 chiusure»: prima il numero veniva da `${P.setupCloses}`. Oggi coincide (`config/thresholds.json`: `setupCloses` 2), ma non segue la configurazione. Lo stesso nella guida (`#btm`).
- **M4. Emergenti: risultato della verifica lontano dai «i».** La frase «Valuta e dollaro, nella verifica sui dati, non hanno migliorato i segnali della breadth; la forza relativa non è stata provata» c'è solo nell'apertura della sezione `#emg` della guida, sopra le sezioni aperte dai «i» (`#emg-leggere`, `#emg-dettaglio`, `#emg-forza`). In pagina resta «solo contesto».
- **M5. Livello blu: «le regole sono di questa app» non è più nel pannello.** La frase «Le regole di zona blu, trigger e cooldown sono di questa app» non c'è più nella nota del Livello blu (Settore e Indici), che non ha un «i». È in `#sec-livello`, `#fonti-sec` («regole dell'app»), `#fonti-mon` e nella riga di fonti dell'Alert. La citazione di Rea nel pannello resta.
- **M6. SOXX in vista 5: l'approssimazione dei titoli di oggi è solo nel «i».** Che l'equal-weight usi i titoli di oggi e risulti più alto del vero su YTD e 1 anno è scritto solo nel «i» di «Grandi contro piccoli». È il pannello del numero, quindi la regola è rispettata, ma il piano diceva «nel «i» della riga SOXX». `docs/sviluppo.md` e il README dicono che «storia con i membri di oggi» resta nella pagina: vale per la vista 4, non per la 5.
- **M7. 5,7% senza fonte nel file citato (c'era già).** Il «5,7% sulle nostre 63 sedute» di `#faq-rea` era già nella 1.12.0. La guida ora cita `ricerca/settori-titoli/confronto-rea.md`, dove ci sono 8,2% e 5,8% ma non il 5,7%. Va ritrovato lo script, oppure va tolto il numero.
- **M8. Alert: due dettagli a due passi.** «Di solito tra la notte e la mattina» e «solo i nuovi cambi di stato» sono solo nella guida, `#alr`, raggiunta con riga di fonti → `#fonti-alr` → «9 Alert». La vista non ha «i», come da piano.

## Verdetto

**GO condizionato**: nessun bloccante. Pubblicare dopo R1 (un «i» nel pannello del VIX che apre `#vix-realizzata`) e R2 (una frase della guida). I minori si possono fare dopo; M1 tocca il testo di una regola e va prima sentito l'utente. I controlli 1 e 4 sono verdi senza riserve. Questo rapporto non copre usabilità, temi e telefono: lì ho solo fatto girare `npm test` (206/206) e letto la console dei caricamenti a 1440 px.

## File

Script: `estrai.cjs`, `confronta_blocchi.py`, `confronta_id.py`, `conserva_qa.py`, `approssimazioni.py`, `citazioni.py`. Uscite: `old.json`, `new.json`, `blocchi.txt`, `id.txt`, `conserva_qa.txt`, `guida_tolte.txt`, `approssimazioni.txt`. Il ricalcolo di `risalita.mjs` è stato fatto su una copia nella cartella temporanea, con l'uscita fuori dal repository: `ricerca/avvicinamento-uso/risalita.json` non è stato toccato.
