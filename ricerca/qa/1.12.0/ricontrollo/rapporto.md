# Ricontrollo 1.12.0: asse della linea del tempo dei massimi (#pkPanel)

Controllo indipendente del commit `523e952` (ramo `claude/great-noether-2f1ude`), 22/11/2026. Nessun file dell'app modificato.

**Cosa è stato provato davvero.** Le misure sono fatte su un worktree pulito di `523e952` servito su una porta a parte.
Durante il controllo la cartella di lavoro `/home/user/rrg` aveva modifiche non salvate in `js/ath-view.js` e `js/peaks.js`, fatte da altri (cali in corso multipli).
Una prima esecuzione sul server 8794, partita prima di quelle modifiche, ha dato gli stessi esiti.
Le modifiche non salvate **non sono coperte** da questo controllo.

## Metodo

- `asse.cjs` (Playwright, Chromium). Per ogni larghezza da 360 a 1440 px a passi di 20 px, più 390, 768 e 1024 (1280 è già nei passi), in tema scuro e chiaro: 58 larghezze × 2 temi = 116 caricamenti nuovi di `#ath`.
  - Prima del caricamento: `sm.introSeen=true` e `antigravity-theme` = `dark` o `light`. Il tema applicato è verificato con `data-theme`.
  - Finestra alta 900 px e `deviceScaleFactor` 1. Sotto 500 px: `isMobile` e `hasTouch`.
  - Si aspetta il primo punto `.pkdot` e poi altri 400 ms.
- Su tutti i `<text>` non vuoti degli SVG di `#pkPanel` (5 grafici; 115 testi nel formato stretto, 135 nel largo) si misurano i rettangoli `getBoundingClientRect` in pixel dello schermo e si controlla:
  - nessuna coppia di testi si sovrappone di più di 1 px in **entrambe** le direzioni (tutte le coppie, anche fra grafici diversi);
  - nessun testo esce dal rettangolo del suo SVG di più di 1 px;
  - la pagina non scorre in orizzontale (`documentElement.scrollWidth ≤ clientWidth`);
  - il formato (classe `nar`) e la larghezza del `viewBox` coincidono con quelli che si ricalcolano dalla larghezza attuale dell'SVG, con la stessa formula di `chartWidth` e la soglia `W − 118 − 315 < 520`;
  - nessun errore: `console.error`, `pageerror`, richieste fallite o risposte HTTP ≥ 400.
- Ridimensionamento: nella stessa pagina, 1440 → 800 → 400 → 1440 con `setViewportSize` e 500 ms di attesa, con le stesse misure a ogni passo, in tutti e due i temi.
- Confine della soglia: altre 19 larghezze (1000-1004, da 1026 a 1050 a passi di 2, 1080-1088): `asse-confine-523e952.txt`.
- Screenshot: `foto.cjs`, pannello `#pkPanel` in tema scuro a 1440, 860, 760 e 390 px.
- Controllo del controllo: lo stesso `asse.cjs` sul commit precedente `523e952~1` (worktree `/tmp/qa-prev` sulla porta 8795, con i suoi `data/`). Il worktree è stato poi rimosso.

Per ripetere il controllo:

```
BASE=http://127.0.0.1:8794/ OUT=asse-523e952.json NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/ricontrollo/asse.cjs
WIDTHS=1000,1026,1034 node …/asse.cjs   # solo alcune larghezze (senza il ridimensionamento)
BASE=http://127.0.0.1:8794/ NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/ricontrollo/foto.cjs
```

## Esiti per larghezza e tema (523e952)

«OK» vuol dire che la misura c'è stata e ha dato: 0 sovrapposizioni, 0 testi fuori dall'SVG, nessuno scorrimento orizzontale, formato coerente con la soglia e 0 errori.
I dettagli di ogni riga sono in `asse-523e952.txt` e `asse-523e952.json`.
L'ultima colonna dice quante sovrapposizioni trova lo stesso controllo sul commit precedente.

| Larghezza | Formato | W grafico | Scuro | Chiaro | Commit precedente (sovrapposizioni scuro/chiaro) |
|---|---|---|---|---|---|
| 360 (mobile) | stretto | 288 | OK | OK | stretto: 0 / 0 |
| 380 (mobile) | stretto | 308 | OK | OK | stretto: 0 / 0 |
| 390 (mobile) | stretto | 318 | OK | OK | stretto: 0 / 0 |
| 400 (mobile) | stretto | 328 | OK | OK | stretto: 0 / 0 |
| 420 (mobile) | stretto | 348 | OK | OK | stretto: 0 / 0 |
| 440 (mobile) | stretto | 368 | OK | OK | stretto: 0 / 0 |
| 460 (mobile) | stretto | 388 | OK | OK | stretto: 0 / 0 |
| 480 (mobile) | stretto | 408 | OK | OK | stretto: 0 / 0 |
| 500 | stretto | 428 | OK | OK | stretto: 0 / 0 |
| 520 | stretto | 448 | OK | OK | stretto: 0 / 0 |
| 540 | stretto | 468 | OK | OK | stretto: 0 / 0 |
| 560 | stretto | 488 | OK | OK | stretto: 0 / 0 |
| 580 | stretto | 508 | OK | OK | stretto: 0 / 0 |
| 600 | stretto | 528 | OK | OK | stretto: 0 / 0 |
| 620 | stretto | 540 | OK | OK | stretto: 0 / 0 |
| 640 | stretto | 560 | OK | OK | stretto: 0 / 0 |
| 660 | stretto | 580 | OK | OK | stretto: 0 / 0 |
| 680 | stretto | 600 | OK | OK | stretto: 0 / 0 |
| 700 | stretto | 620 | OK | OK | stretto: 0 / 0 |
| 720 | stretto | 640 | OK | OK | largo: 10 / 10 |
| 740 | stretto | 660 | OK | OK | largo: 10 / 10 |
| 760 | stretto | 680 | OK | OK | largo: 10 / 10 |
| 768 | stretto | 688 | OK | OK | largo: 10 / 10 |
| 780 | stretto | 700 | OK | OK | largo: 10 / 10 |
| 800 | stretto | 720 | OK | OK | largo: 10 / 10 |
| 820 | stretto | 740 | OK | OK | largo: 10 / 10 |
| 840 | stretto | 760 | OK | OK | largo: 10 / 10 |
| 860 | stretto | 780 | OK | OK | largo: 0 / 0 |
| 880 | stretto | 800 | OK | OK | largo: 0 / 0 |
| 900 | stretto | 820 | OK | OK | largo: 0 / 0 |
| 920 | stretto | 840 | OK | OK | largo: 0 / 0 |
| 940 | stretto | 860 | OK | OK | largo: 0 / 0 |
| 960 | stretto | 880 | OK | OK | largo: 0 / 0 |
| 980 | stretto | 900 | OK | OK | largo: 0 / 0 |
| 1000 | stretto | 920 | OK | OK | largo: 0 / 0 |
| 1020 | stretto | 940 | OK | OK | largo: 0 / 0 |
| 1024 | stretto | 944 | OK | OK | largo: 0 / 0 |
| 1040 | largo | 960 | OK | OK | largo: 0 / 0 |
| 1060 | largo | 980 | OK | OK | largo: 0 / 0 |
| 1080 | largo | 1150 | OK | OK | largo: 0 / 0 |
| 1100 | largo | 1173 | OK | OK | largo: 0 / 0 |
| 1120 | largo | 1196 | OK | OK | largo: 0 / 0 |
| 1140 | largo | 1219 | OK | OK | largo: 0 / 0 |
| 1160 | largo | 1242 | OK | OK | largo: 0 / 0 |
| 1180 | largo | 1265 | OK | OK | largo: 0 / 0 |
| 1200 | largo | 1288 | OK | OK | largo: 0 / 0 |
| 1220 | largo | 1311 | OK | OK | largo: 0 / 0 |
| 1240 | largo | 1334 | OK | OK | largo: 0 / 0 |
| 1260 | largo | 1357 | OK | OK | largo: 0 / 0 |
| 1280 | largo | 1380 | OK | OK | largo: 0 / 0 |
| 1300 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1320 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1340 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1360 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1380 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1400 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1420 | largo | 1400 | OK | OK | largo: 0 / 0 |
| 1440 | largo | 1400 | OK | OK | largo: 0 / 0 |

**Totale su 523e952: 116 caricamenti su 116 OK, 0 errori in console.**

Confine della soglia (`asse-confine-523e952.txt`): 38 caricamenti su 38 OK.
- Il formato largo parte da **1034 px di finestra** (W = 954); a 1032 px è ancora stretto (W = 952).
- A 1034 px lo spazio minimo fra due etichette dell'asse è di 20,8 px (−12 m / −9 m).
- Il cambio di scala di `chartWidth` a 1000 px di SVG (circa 1080 px di finestra) non dà sovrapposizioni.

### Ridimensionamento (stessa pagina, 500 ms dopo ogni passo)

| Passo | Scuro | Chiaro |
|---|---|---|
| 1440 (carico) | OK: largo, W 1400 | OK: largo, W 1400 |
| → 800 | OK: stretto, W 720 (atteso 720) | OK: stretto, W 720 |
| → 400 | OK: stretto, W 328 (atteso 328) | OK: stretto, W 328 |
| → 1440 | OK: largo, W 1400 | OK: largo, W 1400 |

A ogni passo: 0 sovrapposizioni, 0 testi fuori, nessuno scorrimento orizzontale, 0 errori.
Il ridisegno si attiva solo se la finestra cambia di più di 40 px (`js/app.js`), come qui.

## Il controllo sa fallire (commit 523e952~1)

Sul commit precedente (`asse-523e952~1.txt`) il controllo segna KO a 720, 740, 760, 768, 780, 800, 820 e 840 px, in tutti e due i temi.
- Ogni volta trova 10 sovrapposizioni: «−12 m»/«−9 m» e «+9 m»/«+12 m» in ognuno dei 5 grafici, per 8,3 × 14 px.
- Nel ridimensionamento il passo «→ 800» è KO, in tutti e due i temi.
- Da 860 a 1024 px i KO vengono solo dal controllo del formato: il vecchio codice usa il formato largo dove la nuova soglia vuole quello stretto. Lì le sovrapposizioni sono 0.

Il commit precedente era stato segnalato per «tra 720 e 880 px». Il controllo, con tolleranza di 1 px, segnala sovrapposizioni solo fino a 840 px. Misura a parte (`spazio-asse.cjs`), solo per le etichette dell'asse:

| Finestra | Spazio fra le etichette |
|---|---|
| 850 px | −2,1 px |
| 860 px | −0,8 px (sotto la tolleranza di 1 px, quindi non segnalato) |
| 870 px | +0,4 px |
| 880 px | +1,6 px |

Fra 860 e 880 px, quindi, le etichette si toccano senza sovrapporsi di oltre 1 px.
Su 523e952 lo spazio minimo è di 136,5 px a 860 px (formato stretto) e di 20,8 px a 1034 px: il margine è ampio.

## Screenshot (tema scuro, deviceScaleFactor 1)

- `pk-1440-scuro.png`, formato largo: si legge bene. Etichette dell'asse ben distanziate e testi a destra allineati, senza tagli; anche la riga più lunga («… sotto zero il 20/04/2020») sta dentro il pannello.
- `pk-860-scuro.png` e `pk-760-scuro.png`, formato stretto: si leggono bene.
  - L'asse mostra solo −12m, −6, 0, +6 e +12m, molto distanziati.
  - Il testo di ogni riga sta sotto la riga, allineato a sinistra, e non tocca i punti.
  - La griglia dei 24 mesi è larga (circa 570-670 px), quindi i punti sono facili da distinguere.
- `pk-390-scuro.png`, telefono: si legge.
  - I testi sotto la riga passano sopra la linea dello zero e sulla fascia «insieme». Restano leggibili grazie al contorno del colore del pannello (`paint-order: stroke`).
  - A sinistra i punti vicini a −12 m sono stretti fra loro (Bitcoin 2022: tre cerchi quasi a contatto), ma separati.
- Nota sullo strumento: a 390 px con `isMobile`, lo screenshot di un elemento più lungo della finestra usciva spostato di circa 45 px in verticale. La posizione del pannello misurata nella pagina era stabile, quindi è un artefatto di Playwright, non dell'app. Per questo `foto.cjs` usa una finestra alta 4200 px.

## Rilievi

**Bloccanti: nessuno.**

**Da correggere: nessuno.**

**Minori**

1. **La legenda dice «a destra: data, giorni, calo» anche nel formato stretto**, dove il testo è sotto la riga (`index.html`, `#pkLegend`). Con la nuova soglia il formato stretto vale per tutte le finestre fino a 1032 px, compresi tablet e portatili piccoli.
   - Per riprodurlo: aprire `#ath` a 860 px e guardare la legenda in fondo a `#pkPanel` (si vede in `pk-860-scuro.png` e `pk-760-scuro.png`).
   - Nel commit 523e952 la guida (`guida.html`, `#linea-massimi`) dice «A destra (sul telefono sotto la riga)». Ora «sul telefono» è impreciso: il formato stretto si vede fino a circa 1030 px di finestra.
   - Nota: la cartella di lavoro ha una modifica non salvata a `guida.html`, non controllata qui.
2. **Il ridisegno dopo un ridimensionamento parte solo se la finestra cambia di più di 40 px** (`js/app.js`, riga 306 circa). Un piccolo ridimensionamento che attraversa la soglia (per esempio da 1020 a 1050 px) lascia il formato vecchio finché non si ricarica la pagina.
   - In quel caso l'SVG si scala con il `viewBox` e non può creare sovrapposizioni nuove, perché il formato stretto sta bene anche su un SVG più largo e quello largo è a W ≥ 954.
   - È un comportamento già noto e non è stato misurato oltre i 4 passi richiesti.

## Verdetto

**GO** per l'asse della linea del tempo dei massimi al commit 523e952:
- 116 caricamenti su 116 senza sovrapposizioni, testi fuori dall'SVG, scorrimento orizzontale o errori in console;
- ridimensionamento corretto in tutti e due i temi;
- il controllo trova le sovrapposizioni attese sul commit precedente.

Restano due rilievi minori: la dicitura «a destra» nella legenda e nella guida per il formato stretto, e la soglia dei 40 px del ridisegno.
