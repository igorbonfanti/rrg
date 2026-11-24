# Controllo grafici · versione 1.6.0 · commit 06a5360

Verdetto: **GO dopo la correzione del punto 1** (un «da correggere» sulle scritte della fascia grigia sui telefoni stretti; nessun bloccante). Valori, date, fasce, assi, mirino, colori e caso «file senza serie nuove» passano.

| # | Gravità | Dove | Cosa succede | Come riprodurlo | Prova |
|---|---|---|---|---|---|
| 1 | da correggere | #vxChart, periodo MAX, telefono ≤ 390 px | Le scritte «VIX3M dal 04/12/2007» e «HYG/IEF dal 09/04/2008» escono dalla fascia grigia: finiscono sopra l'inizio delle linee dei dati e, a 320-360 px, oltre il bordo sinistro del pannello (a 320-340 px la scritta del credito parte da x = −5, tagliata). La condizione `xe - L > 90` di `noData` presume una scritta di 90 unità, ma è lunga 126 (VIX3M) e 139 (credito) unità con il carattere di 10,5 px. A 375 e 390 px (iPhone) esce di 1-5 px la sola scritta del credito; da 412 px in su tutto entra. | `bordi.cjs`, sezione 1 (larghezze 320-1440, MAX) | `bordi.txt` (8 FAIL: 320, 340, 360 entrambe le scritte; 375, 390 il credito); `shots/chart-360-chiaro-MAX.png`, `shots/chart-390-scuro-MAX.png`. Rimedio possibile: misurare la scritta (getComputedTextLength) e disegnarla solo se entra, o accorciarla («dal 12/2007») |
| 2 | minore | pannello VIX/VIX3M, bordo destro | L'ultima fascia di backwardation (05-06/11/2026, 2 sedute) è larga 1-1,4 px e si confonde con il bordo del pannello: da sola non si vede. Lo stato si capisce comunque dal punto pieno e dalla linea sopra l'1 (il punto è spiegato nella guida, non nella legenda). | `bordi.cjs` sezione 2 | `shots/bordo-destro-light-3A.png`, `shots/bordo-destro-dark-10A.png` |
| 3 | minore | pannello VIX/VIX3M, bordo sinistro con 10A | Il tratto di backwardation 02-08/11/2016 inizia prima del periodo: si vede una striscia di 1 px a x = 8,6 (bordo a 8), accanto alla cornice. Non sembra un evento ma neanche una fascia in corso. Stesso comportamento delle fasce del premio della 1.5.0. | `grafici.cjs`, riga «la prima seduta del periodo» | `shots/bordo-sinistro-light-10A.png` |
| 4 | minore (latente) | asse del rapporto | Se il rapporto superasse circa 1,7 (oggi il massimo storico è 1,43), il passo diventerebbe 0,25 e le etichette con un decimale sarebbero sbagliate: 0,75 → «0,8», 1,25 → «1,3». Con i dati di oggi non succede (passo 0,2). | formula `step` con hi−lo = 1,11 | calcolo nel controllo, vedi sotto |
| 5 | minore | riquadro dei valori e riquadro VIX/VIX3M | 43 sedute hanno il rapporto tra 0,995 e 1 e si leggono «1,00 contango» (ultima: 13/03/2026, 0,9967). Il numero arrotondato e lo stato insieme possono confondere. | mirino sul 13/03/2026 | ricalcolo su data/vix.json |
| 6 | minore (dalla 1.5.0) | asse del premio | Le etichette negative del premio usano il trattino «-10», quelle del credito il segno meno «−2». | screenshot a 390 px | `shots/utente-390-dark-3A@2x.png` |
| 7 | minore | telefono | Con il tocco il riquadro dei valori (ora 8 righe) copre quasi tutto il pannello del VIX. Si legge, ma nasconde la linea. | tocco sul pannello in alto a 390 px | `shots/hover-390-scuro-10A.png` |

## Cosa ho verificato e passa (2415 controlli in `risultati.txt` + 12 in `riquadri.txt` + 22 in `bordi.txt` + 606 in `confronto-1.5.0.txt`)

- **Valori alle date giuste**: ricalcolo indipendente in `attesi.mjs` (rapporto, distanza dal massimo di 252 osservazioni, realizzata). La geometria è controllata contro gli assi **disegnati**: anni sull'asse x e etichette sull'asse y, non le formule dell'app. In 30 combinazioni (5 larghezze × 2 temi × 3 periodi) tutti i vertici del VIX, del rapporto e del credito sono alla data e al valore giusti: scarto massimo 0,05 unità SVG. Il numero di vertici è uguale alle sedute con dato nel periodo (per esempio MAX: VIX 9278, rapporto da 04/12/2007, credito da 09/04/2008), e le linee si interrompono solo dove manca il dato.
  - 24/10/2008: rapporto 1,4309 (VIX 79,13 / VIX3M 55,30), credito −33,94%. 16/03/2020: 1,2214, −21,84%. 08/04/2025: 1,2610, −7,12%. 06/11/2026 (ultima, provvisoria): 1,0423, −3,09%.
- **Mirino**: a ogni data nota, su computer col mouse e sul telefono col tocco, il riquadro mostra la seduta sotto il puntatore (tolleranza di qualche seduta solo dove una seduta è più stretta di 1 px). VIX, VIX3M, rapporto con lo stato e credito sono uguali al ricalcolo. Il mirino è uno solo, dal primo all'ultimo pannello. Prima del 04/12/2007 il riquadro mostra «—» per VIX3M, rapporto e credito; tra il 04/12/2007 e il 09/04/2008 «—» solo per il credito.
- **Fasce di backwardation**: per ogni periodo e larghezza ci sono tante fasce quanti tratti di sedute con rapporto ≥ 1 (3A 18, 10A 58, MAX 133), con bordi alle date giuste e altezza uguale al pannello. Nessuna seduta ≥ 1 resta fuori da una fascia (480 sedute in tutto).
- **Linea a 1 e linea a 0**: alla y giusta. La linea a 1 inizia al 04/12/2007 o al bordo. Lo 0 del credito è in alto e la linea del credito sta tutta sotto, dentro il pannello. Il punto finale è sull'ultimo valore e pieno solo in backwardation. Non tocca le etichette dell'asse.
- **Fascia grigia con MAX**: arriva al 04/12/2007 (VIX3M) e al 09/04/2008 (credito). La scritta c'è e da 412 px in su sta dentro la fascia (punto 1 per i telefoni). Con 3A e 10A la fascia grigia non c'è.
- **Assi e scritte**: anni equidistanti, ogni etichetta con la sua linea in tutti i pannelli. Passo: 1 anno con 3A, 2 con 10A, 4 con MAX; sul telefono 3 etichette. Nessuna scritta sovrapposta o tagliata nell'SVG (a parte il punto 1). Titoli dei pannelli dentro la larghezza. Assi del rapporto 0,8-1,4 a passo 0,2; del credito 0/−2…−6 (3A), 0/−10…−30 (10A), 0/−20/−40 (MAX).
- **Legenda**: 7 voci, con gli stessi colori calcolati delle linee e delle fasce (anche l'opacità della fascia del premio), in chiaro, scuro e CVD.
- **Colori**: tutte le linee hanno contrasto ≥ 3 sullo sfondo (rapporto 6,1 in chiaro e 6,9 in scuro; credito 5,5 e 9,0). La linea del rapporto sopra la fascia ha contrasto 4,1 e 4,0. La fascia sullo sfondo ha contrasto 1,49 e 1,71: si vede, ma le fasce di 1 px in chiaro sono tenui. Scritte degli assi 6,1. Con deuteranopia e protanopia simulate, VIX e realizzata restano ben distinte (ΔE > 100). Rapporto e credito sono vicini (ΔE 14-18 in deuteranopia), ma stanno in pannelli separati e titolati. Il CVD cambia solo il rosso del premio, come prima.
- **Riquadri #vxKpis**: 6 in fila sopra 1100 px (1101, 1120, 1180, 1440, 1920), 3+3 tra 601 e 1100 (601, 768, 820, 1100), 2 colonne fino a 600 (320, 360, 600). Nessun testo esce, nessuno scorrimento orizzontale.
- **Telefono 390/360**: mirino al tocco, riquadro dentro lo schermo, niente scorrimento orizzontale in nessun periodo.
- **File senza VIX3M e HYGIEF** (page.route su data/vix.json): 2 pannelli, legenda di 4 voci, nessun elemento nuovo, nessuna riga nuova nel riquadro, console pulita. L'SVG è **identico carattere per carattere** a quello della 1.5.0 (git archive d962970, stesso file) in 3A, 10A e MAX, a 1440 e 390 px. I due riquadri nuovi mostrano «— · dato non disponibile».
- **Console**: nessun errore né avviso in tutte le combinazioni.

## I controlli possono fallire

- Contro la 1.5.0 vera (porta 8911, con lo stesso data/vix.json) gli stessi controlli falliscono dove devono: 2 pannelli invece di 4, niente VIX3M né credito, legenda di 4 voci, riquadri 4 invece di 6, riquadro dei valori senza le righe nuove.
- `bordi.cjs` ha trovato 8 FAIL reali (punto 1).
- Un mio errore, ripreso: il primo confronto «senza serie nuove contro 1.5.0» andava sulla porta 8795, già occupata da un altro server 1.6.0, e passava a vuoto. Ripetuto sulla 8911 dopo aver controllato `version.json` (1.5.0): è in `confronto-1.5.0.txt`. Le righe corrispondenti di `risultati.txt` sono annotate come non valide.

## Cosa non ho potuto verificare e perché

- Le fasce non sono confrontate con una seconda fonte del VIX3M: uso solo data/vix.json (è compito del tema numeri).
- Telefono reale e Safari: solo Chromium con emulazione mobile e tocco.
- Il caso «fascia di una sola seduta sul bordo destro» non c'è nei dati di oggi (l'ultima fascia è di 2 sedute). Il comportamento è lo stesso: larghezza minima 1 px (punto 2).

## Script e screenshot

- Script: `ricerca/qa/1.6.0/grafici/attesi.mjs` (ricalcolo → `attesi.json`), `grafici.cjs` (controllo completo; `ONLY=1440`, `SHOTS=0`, `OLD=` porta della 1.5.0), `bordi.cjs`, `riquadri.cjs`.
- Risultati: `risultati.txt`, `confronto-1.5.0.txt`, `bordi.txt`, `riquadri.txt`, `colori.json`.
- Screenshot: `ricerca/qa/1.6.0/grafici/shots/` (61 file + 6 ingrandimenti dei bordi). Per l'utente: `utente-1440-dark-MAX@2x.png`, `utente-1280-light-10A@2x.png`, `utente-390-dark-3A@2x.png`.
