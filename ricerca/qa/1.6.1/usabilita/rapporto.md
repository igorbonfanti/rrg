# Controllo usabilità e funzioni · versione 1.6.1 · commit 4d75669

Verdetto: **NO-GO** (nessun bloccante, 3 «da correggere»)

Servito con `node ricerca/qa/server/gzserve.mjs . 8802`, Chromium di Playwright, 10 configurazioni: 1440 chiaro e scuro, 1280 chiaro e scuro, 1024 e 820 (tablet, tocco), 390 e 360 (telefono, tocco) chiaro e scuro.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | Tabella «Episodi con il VIX sopra 30», prima riga (27/03/2026, «in corso»), S&P 500 e Nasdaq-100 | Il clic colora la riga ma nello scatter si spengono **tutti** i punti: nessun alone, nessun pulsante premuto nell'elenco, nessuna scritta. Sembra un errore. Causa: `ofRow` assegna la riga al gruppo `ep:2026-03-27`, che non ha punti (le sue sedute non hanno ancora 12 mesi di dati). `groupsOf` lo toglie da `list` ma lo lascia in `byKey`, quindi `select()` lo accetta, e `markRows` scrive la nota solo quando nessuna riga è evidenziata. È la riga più recente, la prima che si vede alla soglia 30. | Vista 8, clic sulla riga «30» della tabella delle soglie, poi sulla prima riga degli episodi | `esplora.log` (punto 8, tutte le configurazioni: «scatter spento true, punti accesi 0, alone 0»); `gruppi.log` («soglia 30: … gruppo senza punti 1»); `shots/*-06-soglia30-riga-recente.png` |
| 2 | da correggere | Scatter, clic o tocco su un punto | Il clic su un punto della crisi già selezionata **toglie** la selezione. Sul telefono il tocco serve anche a leggere i valori, quindi leggendo tre punti del Covid di fila la selezione si accende, si spegne e si riaccende (Covid → nessuna → Covid). Il riquadro dice sempre «Clic per evidenziare la crisi.», anche quando il clic la toglierebbe. Su computer succede lo stesso con tre clic. | Toccare tre punti del Covid uno dopo l'altro | `esplora.log` punto 4 («2020 Covid (riquadro sì) → nessuna (riquadro sì) → 2020 Covid»), in tutte e 10 le configurazioni; `shots/390-scuro-05-tocchi-covid.png` |
| 3 | da correggere | Scritta `#vxEpsNone` («… nessun episodio sopra 40 in questa crisi.») | La scritta compare e sparisce **sopra** lo scatter, quindi quando la fine della tabella è sullo schermo lo scatter salta di 37 px subito dopo il clic: il punto cliccato non è più sotto il puntatore e il riquadro resta nella posizione vecchia. Alla soglia 40 succede con 7 crisi su 15. Se la tabella è tutta fuori dallo schermo (sopra), lo scroll anchoring di Chromium compensa e lo scatter non salta (`salto.log`). Safari non è stato provato e non so se compensa. | Scatter centrato sullo schermo, clic sul pallino d'inizio di «1990 Golfo» (o passare da «2020 Covid» a «1997 Asia») | `esplora.log` punto 3 («lo scatter si sposta di 37 px … sullo schermo», tutte le configurazioni); `shots/1440-scuro-04-golfo-scritta.png` |
| 4 | minore | Clic su una riga degli episodi | Dopo il clic lo scatter non si vede: 0% visibile a 1440×900, 1280×800, 820, 390 e 360; 18% a 1024×768. Si colorano solo le righe, e l'alone si scopre scorrendo. | Clic su una riga del Covid senza scorrere | `esplora.log` punto 1; `shots/*-02-riga-covid.png` |
| 5 | minore | Nota sotto lo scatter, guida (#vix «Scatter»), riquadro dei valori | I testi parlano solo di «clic» ed «Esc». Sul telefono non c'è Esc, e la nota della tabella sopra dice invece «Clic (o tocco)». Non dicono che un secondo clic sulla stessa crisi nell'elenco o sulla stessa riga toglie la selezione, che sul telefono è il modo più semplice per toglierla. A 390 px l'area «vuota» dello scatter, dove un tocco toglie la selezione, è il 40% del grafico (74% a 1440). | Leggere i testi | `index.html:460`, `guida.html:391`, `esplora.log` punto 5 |
| 6 | minore | Elenco delle crisi | Due voci si chiamano «Fuori dalle crisi elencate · 10/2009» e «· 12/2021», ma sono loro stesse dentro l'elenco, quindi il nome si contraddice. In tabella gli stessi episodi hanno «—» nella colonna Crisi. Un nome come «Senza nome · 10/2009» o «Altro episodio · 10/2009» sarebbe più chiaro. | Guardare l'elenco | `shots/1440-scuro-04-golfo-scritta.png`, `esplora.log` (etichette) |
| 7 | minore | Esc | Con la guida aperta («?») e una crisi selezionata, Esc chiude la guida e toglie anche la selezione. Il listener di `vix-view.js:336` non guarda se `#helpModal` è aperto; quello di `app.js:981` invece sì. | Selezionare il Covid, premere «?», poi Esc | `esplora.log` punto 6 |
| 8 | minore | Tabella degli episodi alle soglie 20 e 25 | Alla soglia 20 si cliccano 6 righe su 24, alla 25 13 su 23 (gli episodi che non arrivano a 30 non hanno un gruppo). Le altre righe non reagiscono e non c'è un segno visibile, solo il cursore. La guida dice «un clic … su una riga della tabella degli episodi evidenzia quella crisi» senza eccezioni. | Soglia 20, clic sulla riga del 03/11/2016 | `gruppi.log`; `esplora.log` punto 9 |
| 9 | minore | Scatter su computer | Il cursore sul grafico è «auto», mentre sui pulsanti e sulle righe è «pointer». Che i punti si clicchino lo si scopre solo dal riquadro dei valori. | Passare il mouse sullo scatter | `esplora.log` (cursore) |
| 10 | minore | Elenco delle crisi sul telefono | I pulsanti sono alti 20 px. Passano il minimo WCAG 2.5.8 (24 px) solo grazie ai 4 px di spazio tra uno e l'altro, molto sotto i 44 px consigliati per il dito. A 390 px l'elenco è lungo 290 px. | 390 o 360 px | `esplora.log` (pulsanti); `shots/390-scuro-05-tocchi-covid.png` |
| 11 | minore | Righe cliccabili degli episodi | Sono `tr` con `tabindex` ma senza ruolo né `aria-pressed`: un lettore di schermo non dice che si attivano né che sono selezionate. Lo stesso schema c'è già nella tabella delle soglie. | Lettura del DOM | `js/vix-view.js:142` |
| 12 | minore | `docs/sviluppo.md` | Dice ancora «Aggiornato al 09/11/2026, versione 1.6.0» e «Stato attuale (1.6.0)». Manca la voce 1.6.1. | | `docs/sviluppo.md:3,165` |
| 13 | minore | `ricerca/qa/browser/v161.cjs` | Il controllo «un colore diverso per ogni crisi» passa a vuoto con 0 pulsanti: sulla 1.6.0 stampa OK con «0 crisi nell'elenco». Lo script non copre i punti 1-3. | Lanciarlo sulla 1.6.0 | `v161-on-160.log` |

## Cosa ho verificato e passa
- Script di regressione (log in questa cartella):
  - `v150.cjs` sul ramo: 108 OK, 0 FAIL.
  - `v161.cjs` sul ramo: 60 OK, 0 FAIL. Sulla copia con i dati nuovi: 60 OK, 0 FAIL. Sulla 1.6.0 fallisce come deve (4 FAIL, poi si ferma sul clic all'elenco che manca).
  - `v160.cjs` sulla copia `git archive 4d75669` con `data/vix.json` rigenerato da `scripts/fetch_vix.js` (VIX3M e HYGIEF al 06/11/2026, servita sulla 8803): 87 OK, 0 FAIL. Sul ramo i FAIL sono quelli attesi, perché il `data/vix.json` del ramo non ha VIX3M e HYGIEF (50 OK, 37 FAIL).
- `npm test`: 142 superati, 0 falliti, 1 saltato.
- `esplora.cjs`: 70 controlli OK, 0 FAIL, su 10 configurazioni. Le osservazioni sono nelle righe OSS.
  - Percorso Covid: dall'elenco basta un clic. Alone attorno a 84 punti, gli 84 punti accesi, 2 righe della tabella colorate alla soglia 40.
  - Secondo clic sulla stessa riga o sullo stesso pulsante: toglie la selezione.
  - Esc e clic su un punto vuoto: tolgono la selezione.
  - Tastiera: Tab dalla tabella delle soglie arriva alle righe degli episodi. Invio e Spazio funzionano sulle righe e sui pulsanti, con il contorno del focus visibile.
  - Cambio di soglia con il Covid selezionato: la selezione resta coerente. Una riga alle soglie 20, 30 e 50, due alla 40.
  - La selezione resta con il cambio di indice (Nasdaq-100: alone 84), il cambio di periodo (MAX), il passaggio a Monitor e il ritorno, il ridimensionamento della finestra (−300 px). Sparisce con la ricarica: è voluto, non è salvata e la documentazione non promette il contrario.
  - Tasto Indietro: torna a #mon.
  - Tempi: vista pronta in 366-449 ms, selezione disegnata in 32 ms in media (al massimo 35 ms), cambio di indice in 33-50 ms.
  - Nessuno scorrimento orizzontale, console senza errori.
- `scorri_e_viste.cjs`: 48 OK, 0 FAIL.
  - Sul telefono, passando il dito sullo scatter la pagina scorre: 318 px a 390, 339 px a 360, contro 338 e 360 px sul testo. Il controllo negativo con `touch-action: none` forzato dà 0 px: la prova può fallire.
  - Il trascinamento non seleziona nessuna crisi.
  - Giro delle 9 viste a 1440 e 390, chiaro e scuro: tutte visibili, nessuno scorrimento orizzontale, console pulita, ogni vista in circa 0,55-0,6 s.
- Primo tocco sul telefono: mostra il riquadro e seleziona la crisi nello stesso momento. Di per sé non è un problema, perché il riquadro dice di quale crisi si tratta. Il problema è il tocco successivo (punto 2).
- Testi: nota sotto lo scatter, guida, README (sezione 8 VIX e nota 1.6.1) e `js/version.js` sono coerenti tra loro. Nessun numero nuovo. Non resta nessuna copia del vecchio «un colore per episodio».

## Cosa non ho potuto verificare e perché
- Safari e iOS reali, compreso lo scroll anchoring del punto 3: ho solo Chromium.
- Lettori di schermo reali.
- Telefono fisico: ho usato l'emulazione con il tocco di Playwright e CDP.

## Script e screenshot
- Script: `ricerca/qa/1.6.1/usabilita/esplora.cjs`, `scorri_e_viste.cjs`, `salto.cjs`, `gruppi.mjs`. Ogni file spiega in testa come si usa.
- Log, ignorati da git (`*.log`): `esplora.log`, `scorri_e_viste.log`, `salto.log`, `gruppi.log`, `v150-8802.log`, `v160-8802.log`, `v160-8803.log`, `v161-8802.log`, `v161-8803.log`, `v161-on-160.log`.
- Screenshot: `ricerca/qa/1.6.1/usabilita/shots/`, 92 file: `<config>-01…06-*.png` e `viste-<larghezza>-<tema>-<vista>.png`.
