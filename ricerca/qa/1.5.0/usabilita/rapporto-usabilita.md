# Controllo usabilità e funzioni · versione 1.5.0 · commit a801454

Verdetto: **GO**. Non ci sono bloccanti. Il punto 1 andava corretto prima della pubblicazione: nel commit successivo `00dacc5` il testo risulta già corretto, ma l'ho controllato solo leggendo il file, non nel browser.

Copia controllata: `http://127.0.0.1:8798/` (qa150site). Ho confrontato i file con `git show a801454:…` (index.html, guida.html, css, js/app.js, js/vix.js, js/vix-view.js) e coincidono. Confronto con la 1.4.1 pubblicata (`origin/main` 4153729), servita su `:8799`. Browser: Chromium di Playwright, headless.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Guida rapida dentro l'app (`?` o `HELP`), index.html:862 | Dice «Tasti: 1–8 viste» e non elenca il comando VIX tra MON, ROT… EMG: il tasto 9 (Alert) e il comando nuovo non compaiono. guida.html invece dice 1–9. **In `00dacc5` il testo è «1–9» e il comando VIX c'è** (solo lettura del file). | Su qualsiasi vista premi `?` | `risultati-desktop.json` → `d*.help`, `d*.helpcmd` (4 configurazioni su 4) |
| 2 | minore | guida.html:427, paragrafo «Indirizzi» | Elenca `#mon … #emg` ma non `#vix` (il README sì). **In `00dacc5` `#vix` c'è** (solo lettura del file). | guida.html#comandi | `risultati-percorso.json` → `path.guideaddr` |
| 3 | minore | README.md:72 | «in sintesi nella vista 8 Alert»: ora Alert è la 9. **In `00dacc5` è corretto.** | — | grep |
| 4 | minore | Vista 8 sul telefono (390, 360) | La tabella «Dopo i picchi» è più larga dello schermo (506 px in 330 a 390 px, +206 px a 360) anche senza le colonne 1 mese, 6 mesi e minimo. Le colonne che rispondono alla domanda («12 mesi», «calo dopo») si vedono solo scorrendo la tabella di lato. Aiutano la prima colonna fissa e l'ombra a destra. Anche gli episodi sforano (+69 e +99 px): a 360 la colonna 12 mesi è tagliata. La pagina invece non scorre di lato. | 390×844 con tocco, scheda 8 | `shots/m390-tabella-regimi.png`, `m390-tabella-regimi-scorsa.png`, `m360-episodi-30.png`; `m*.tablecols`, `m*.epsfit` |
| 5 | minore | Vista 8, righe della tabella dei regimi | Righe con `tabindex=0` ma senza ruolo né stato ARIA (`aria-selected`/`aria-pressed`): un lettore di schermo non dice che si possono attivare né quale soglia è scelta. La tastiera funziona bene (Invio e Spazio, il focus resta sulla riga). Le righe attivabili del Monitor sono fatte allo stesso modo: non è un peggioramento. | Tab fino a una riga, ispeziona gli attributi | `d*.rowrole` |
| 6 | minore | Vista 8 tra 601 e 1100 px (768, 820, 1024, 1100) | La griglia dei riquadri ha 5 colonne fisse (style.css:823) ma i riquadri sono 4, quindi a destra resta una cella grigia vuota. | 1024×900, `#vix` | `shots/w1024-dark-vix.png`, `w768-light-vix.png` |
| 7 | minore | Vista 8, file con le serie a `null` | Se `data/vix.json` ha `series` e `asOf` ma le serie sono vuote, compaiono titoli e pannelli vuoti senza dire che i dati mancano. Mancante, irraggiungibile, incompleto e illeggibile invece danno un messaggio chiaro. È improbabile: `scripts/fetch_vix.js` esce con errore se manca una serie. | route di `data/vix.json` con `{"series":{"VIX":null,…}}` | `shots/miss-serie-vuote-1440.png`; `miss-serie-vuote-*` |
| 8 | minore (suggerimento) | Percorso «il VIX è alto, cosa è successo di solito dopo?» | Oggi il VIX è a 28,18 (fascia «paura», quindi la riga che vale oggi è 25), ma all'apertura è scelta la soglia 40, quella «robusta». Chi arriva deve capire da solo quale riga corrisponde a oggi: nessun legame tra il riquadro VIX e la tabella. Si potrebbe segnare la riga dell'ultima soglia superata oggi. È una scelta di presentazione: non l'ho segnata come errore. | `#vix` a freddo | `risultati-percorso.json` → `path.today` |

## Cosa ho verificato e passa

Totale: 414 controlli scritti, 385 passano. Dei 29 che non passano, 23 sono i rilievi 1–8 ripetuti su più configurazioni. Gli altri 8 sono falsi allarmi dei miei script, spiegati sotto.

- **Computer 1440 e 1280, tema scuro e chiaro (184 controlli, 172 passano; i 12 che non passano sono i rilievi 1 e 5).**
  - Barra su una riga, 9 schede nell'ordine giusto, nessuna tagliata, niente scorrimento orizzontale.
  - Il tema viene da `antigravity-theme`.
  - `data/vix.json` non si scarica all'avvio, una volta sola alla prima apertura e non di nuovo tornando alla vista.
  - Tasto 8 → `#vix`. Tasti 1–9 aprono le nove viste nell'ordine. Frecce, Home e Fine sulle schede (VIX ↔ Alert).
  - Comandi `VIX`, `vix`, `volatilità`, `ALRT`.
  - 4 riquadri e nessun NaN, undefined o null nel testo.
  - Tabella: riga base più le soglie 20/25/30/40/50, di partenza il 40. Clic sulla riga 30: episodi coerenti con la colonna «episodi» (21 = 21).
  - Nasdaq-100 cambia tabella, scatter ed episodi e tiene la soglia scelta.
  - 3A, 10A e MAX cambiano l'asse degli anni.
  - Ricarica su `#vix`: indice, periodo e soglia sono ricordati.
  - Riquadro dei valori su scatter (anello, «Primo giorno…», dentro lo schermo, sparisce uscendo) e su grafico (linea verticale, dentro anche al bordo destro).
  - Invio e Spazio sulle righe, con il focus che resta; Spazio non scorre la pagina; il focus si vede.
  - Indietro da Alert torna a VIX, poi a Emergenti; Avanti torna a VIX con i dati.
  - Le altre 8 viste sono visibili e senza scorrimento orizzontale.
  - Console senza errori né avvisi.
- **Confronto con 1.4.1 (12 larghezze).**
  - Sopra 600 px altezza della barra e posizione del contenuto sono identiche alla 1.4.1.
  - Sotto 600 px la barra passa da 2 a 3 righe: +31 px di altezza a 390 e 600 px, +17 px a 360. Il contenuto scende di altrettanto, come previsto dal 3×3.
- **Telefono 390 e 360 con tocco, scuro e chiaro (209 controlli insieme a tablet e confini, 193 passano).**
  - Barra 3×3 e nessuna etichetta tagliata.
  - Tocco su 8: la vista si apre senza scorrimento orizzontale della pagina.
  - Riquadri dentro lo schermo.
  - Tocco su una riga: episodi giusti, con il titolo visibile senza scorrere.
  - Tocco su Nasdaq-100.
  - Tocco su un punto dello scatter e sul grafico: riquadro dentro lo schermo. Tocco fuori: si chiude.
  - Testo degli assi a 10,5 px; titoli dei pannelli dentro il grafico; legenda senza scorrimento.
  - Telefono girato (844×390): il grafico si ridisegna alla nuova larghezza, niente scorrimento.
  - Le 9 viste al tocco funzionano.
  - Spiegazioni al tocco: riquadri, pillola «robusto» e asterisco (`u150-taptip.cjs`, 3 su 3).
- **Tablet 820/768 e confini 600/601/860/861/1024/1100, scuro e chiaro.**
  - 3×3 a 600; 5+4 a 601, 768, 820 e 860; una riga a 861, 1024 e 1100.
  - Schede tutte della stessa altezza, nessuna tagliata.
  - Apertura diretta su `#vix`.
  - Tocco su una riga al tablet.
  - Console pulita.
- **File del VIX in errore, a 1440 e 390.** Per 404, rete giù, file incompleto e file illeggibile:
  - compare il messaggio «Dati del VIX non disponibili (data/vix.json: …)» e non resta acceso «Caricamento…»;
  - le altre 8 viste funzionano;
  - nessun errore JavaScript non gestito.
- **File lento (2,5 s).** Si vede «Caricamento dei dati del VIX…». Nasdaq-100 premuto durante il caricamento viene applicato all'arrivo dei dati.
- **Ultima seduta da Yahoo (FRED fermo al giorno prima, simulato).** «Yahoo, provvisorio» compare nel riquadro, nella riga delle date e nel riquadro dei valori dell'ultimo giorno (`u150-provvisorio.cjs`).
- **Percorso e guida (17 controlli, 16 passano).**
  - La tabella si vede senza scorrere a 1440×900.
  - Solo il 40 è «robusto», 10 episodi come dice la guida.
  - Gli episodi recenti mostrano «in corso» e l'asterisco con la spiegazione.
  - Dalla vista VIX la guida si apre su `guida.html#vix`, e «Apri il VIX →» torna alla vista.
  - Scheda e pannello sono collegati; grafici con `role=img` e descrizione; gruppi di pulsanti con nome.
- **Tempi** (server locale con gzip; `u150-tempi.cjs`, 3 ripetizioni):

  | | Prima apertura | Seconda apertura | Cambio indice |
  |---|---|---|---|
  | Computer | 240–265 ms | 80–110 ms | 85–100 ms |
  | Telefono simulato (CPU 4× più lenta, 4G lento 1,6 Mb/s, 150 ms) | 1,2–1,3 s | 0,2–0,27 s | circa 0,2 s |

  `data/vix.json` pesa 174 kB, 59 kB compresso.

**Falsi allarmi dei miei script (non sono rilievi):**
- Bersaglio delle schede «≥ 44 px» (4 controlli): le schede sono alte 34 px come nella 1.4.1 e sopra il minimo WCAG 2.5.8 di 24 px.
- Pulsanti S&P 500 / Nasdaq-100 «21 px» (4 controlli): in quel contesto headless `pointer: coarse` non era attivo. Rimisurati con il tocco attivo sono 34 px, come gli altri pulsanti dell'app.

## Cosa non ho potuto verificare e perché

- **Telefoni veri e Safari/iOS:** solo Chromium con tocco emulato.
- **Lettori di schermo veri** (VoiceOver, NVDA): ho controllato solo ruoli e attributi.
- **Larghezze frazionarie** (zoom del browser tra 600 e 601 o tra 860 e 861 px, dove nessuna regola CSS si applica): un iframe a 600,5 px arrotonda a 601, quindi non sono riuscito a riprodurle. Lo stesso buco c'era già nella 1.4.1.
- **Il commit nuovo `00dacc5`**, arrivato durante il controllo: ho solo letto i file per i punti 1–3, non l'ho ricontrollato nel browser.
- **`npm test`:** non l'ho lanciato, perché la cartella di lavoro aveva modifiche non mie in corso (`scripts/fetch_vix.js`, `test/vix.test.js`).
- **Esattezza dei numeri:** non è il tema di questo controllo.

## Script e screenshot

Script, tutti in `ricerca/qa/1.5.0/usabilita/`. Si lanciano con `NODE_PATH=$(npm root -g) node <script> [base]`:
- `u150-desktop.cjs`: computer e confronto con la 1.4.1, che legge da `OLD` (predefinito `:8799`).
- `u150-mobile.cjs`: telefono, tablet, confini, file in errore e file lento.
- `u150-percorso.cjs`: percorso, guida, ARIA, larghezze frazionarie.
- `u150-provvisorio.cjs`
- `u150-taptip.cjs`
- `u150-tempi.cjs`

Risultati: `risultati-desktop.json`, `risultati-mobile.json`, `risultati-percorso.json`.

Screenshot: `ricerca/qa/1.5.0/usabilita/shots/` (117 file).
