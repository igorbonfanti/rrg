# VIX: come vanno S&P 500 e Nasdaq-100 dopo i picchi di volatilità

Fase di verifica, l'app non è stata toccata. Dati scaricati il 06/11/2026, ultima seduta chiusa il 05/11/2026.
Tutti i numeri escono da `script/regimi.mjs`, che scrive `risultati.json`. `script/verifica.py` li ricalcola da zero per l'S&P 500 alle soglie 30, 40 e 50 e trova **0 differenze** su 67 controlli.

```
node ricerca/vix/regimi/script/scarica.mjs        # una volta: cache in ricerca/vix/cache/ (non versionata)
node ricerca/vix/regimi/script/regimi.mjs         # → risultati.json + tabelle a schermo
python3 -I ricerca/vix/regimi/script/verifica.py  # ricalcolo indipendente
```

## Domanda

L'idea viene da un grafico di Massimo Rea (quant-rea). È uno scatter con una riga per ogni seduta in cui il VIX chiude sopra 30: in ascissa il VIX, in ordinata il rendimento dell'S&P 500 nell'anno dopo. Sopra 50 quasi tutti i punti sono positivi. Dalla piattaforma di Rea non è stato preso nessun dato: qui si usa solo l'idea.

Quello scatter conta **giorni**. I giorni si sovrappongono e si raggruppano in poche crisi. La domanda è se la stessa lettura regge quando si contano **episodi indipendenti**, e se una tabella del genere può stare in un pannello VIX dell'app, solo come contesto.

## Metodo (deciso prima di vedere i risultati)

- **Dati.** VIX: FRED `VIXCLS` dal 1990, fonte principale. VXN: FRED `VXNCLS` dal 2001. Come seconda fonte Yahoo `^VIX` e `^VXN`. Indici: Yahoo `^GSPC` e `^NDX`, solo prezzo. `^SP500TR`, cioè con i dividendi, serve come sensibilità. `^XNDX` su Yahoo non ha storia (una sola barra), quindi per il Nasdaq-100 manca la versione con i dividendi.
- **Calendario.** Si usano le sedute dell'indice. I giorni in cui FRED pubblica il VIX a borsa chiusa (34 dal 1990, quasi tutti feste dal 2022) si scartano. Nessun giorno mancante viene riempito.
- **Episodio** (soglia X = 20, 25, 30, 40, 50). Inizia alla prima chiusura con VIX ≥ X dopo almeno **63 sedute** tutte sotto X. Le sensibilità usano 21 e 126 sedute. Finisce all'ultima chiusura ≥ X prima che ne parta uno nuovo.
- **Esiti.** Rendimento dell'indice dalla chiusura del giorno del segnale a 21, 63, 126 e 252 sedute (1, 3, 6 e 12 mesi). Come sensibilità si parte dalla chiusura del giorno dopo.
  - *Calo successivo*: di quanto l'indice scende sotto il prezzo del segnale nelle 252 sedute dopo.
  - *Sedute al minimo*: quante sedute passano dal segnale alla chiusura più bassa.
- **Base.** Tutte le sedute dal 02/01/1990 (dal 02/02/2001 per il VXN): mediana, quota di positivi e 10° percentile (quantile lineare, come numpy).
- **Criterio per mostrare una soglia.** Servono tre condizioni:
  1. almeno 8 episodi con 12 mesi completi;
  2. mediana a 12 mesi di almeno 5 punti sopra la base, **oppure** quota di positivi di almeno 15 punti sopra la base;
  3. differenza nella stessa direzione in almeno 2 dei sottoperiodi 1990-2007, 2008-2015 e 2016-oggi che hanno episodi.

  Se il criterio passa con 30 episodi o più si mostra. Se passa con 8-29 episodi si mostra con avvertenza. Se non passa non si mostra.
- **Nasdaq-100 separato** se alla stessa soglia la mediana a 6 o 12 mesi differisce da quella dell'S&P 500 di almeno 5 punti, oppure se il calo mediano è più profondo di almeno 5 punti.

## Risultati: S&P 500 con il VIX (1990-2026)

Tra parentesi i casi positivi sul totale. Calo: mediana, tra parentesi il peggiore. Δ base: differenza dalla base a 12 mesi, per la mediana e per la quota di positivi, in punti.

| VIX ≥ | episodi (12 m completi) | 1 mese | 3 mesi | 6 mesi | 12 mesi | calo dopo | sedute al minimo (mediana) | Δ base 12 m | verdetto |
|---|---|---|---|---|---|---|---|---|---|
| base (ogni seduta) | 9.028 sedute | +1,2 (64%) | +3,2 (70%) | +5,8 (75%) | +11,9 (81%) | −4,8 | — | — | — |
| 20 | 24 (23) | +3,5 (20/23) | +6,3 (21/23) | +9,9 (21/23) | +17,7 (22/23) | −1,5 (−30,6) | 6 | +5,8 / +14,8 | con avvertenza, ma fragile |
| 25 | 22 (21) | +2,1 (13/22) | +4,8 (14/22) | +4,5 (14/22) | +11,6 (16/21) | −11,9 (−46,4) | 82 | −0,3 / −4,6 | non mostrare |
| 30 | 21 (20) | +2,9 (14/21) | +4,7 (15/21) | +7,6 (16/21) | +15,3 (14/20) | −11,0 (−43,3) | 91,5 | +3,5 / −10,8 | non mostrare |
| 40 | 10 (10) | +6,0 (7/10) | +9,2 (9/10) | +15,3 (9/10) | +22,9 (8/10) | −4,3 (−38,9) | 39 | +11,0 / −0,8 | **con avvertenza** |
| 50 | 3 (3) | −3,2 (1/3) | +17,7 (2/3) | +24,8 (2/3) | +36,8 (2/3) | −18,5 (−36,0) | 10 | +24,9 / −14,1 | non mostrare (3 casi) |

10° percentile della base: −4,5 a 1 mese, −6,8 a 3 mesi, −8,0 a 6 mesi, −11,9 a 12 mesi.

**Sottoperiodi, 12 mesi.** Positivi sul totale, tra parentesi la differenza della mediana dalla base del periodo.

| VIX ≥ | 1990-2007 | 2008-2015 | 2016-oggi |
|---|---|---|---|
| 20 | 8/9 (+3,4) | 6/6 (+6,8) | 8/8 (+2,9) |
| 30 | **4/8 (−11,2)** | 4/5 (+4,0) | 6/7 (+7,1) |
| 40 | 2/3 (+10,8) | 3/4 (+6,6) | 3/3 (+18,6) |

**Casi in cui l'esito è peggiore della base.**
- VIX 25 è peggiore a 6 mesi (14/22 positivi contro il 75% della base) e a 12 mesi.
- VIX 30: a 12 mesi la quota di positivi è 10,8 punti sotto la base (14/20 contro 81%).
- VIX 50: a 1 mese 1 caso su 3 è positivo.
- A 25 e a 30 l'indice scende di solito ancora **circa l'11%** sotto il prezzo del segnale, contro il −4,8% di una seduta qualsiasi. Il minimo arriva in mediana dopo 82-92 sedute, cioè 4 mesi.

Un VIX tra 25 e 30 quindi **non** segna il minimo: spesso è l'inizio della discesa.

### Sensibilità (12 mesi, S&P 500)

| variante | 20 | 25 | 30 | 40 | 50 |
|---|---|---|---|---|---|
| principale (63 sedute) | passa | no | no | **passa** | no |
| quiete 21 sedute | no (52 ep.) | no | no (35 ep.) | **passa** (13 ep., 11/13) | no |
| quiete 126 sedute | no (9 ep.) | no | no | **passa** (9 ep., 7/9) | no |
| ingresso il giorno dopo | no (Δ +4,5) | no | no | **passa** | no |
| total return (^SP500TR) | passa | no | no | **passa** | no |
| VIX da Yahoo | passa | no | no | **passa** | no |

La soglia 40 passa in tutte le varianti. La soglia 20 passa solo in 3 varianti su 6: sono la principale e le due che toccano soltanto la fonte dei dati, cioè il total return e il VIX da Yahoo. Non passa con la quiete a 21 o a 126 sedute, né con l'ingresso il giorno dopo. Il suo margine è al limite (+5,8 contro +5 richiesti).

## Episodi per crisi (S&P 500)

Rendimento a 12 mesi; tra parentesi il VIX massimo dell'episodio. L'etichetta della crisi viene dalla data d'inizio, con finestre decise prima. «Altro» vuol dire fuori dalle finestre.

- **VIX ≥ 50** (3 episodi):
  - 06/10/2008, crisi finanziaria: −0,2% (80,9);
  - 09/03/2020, Covid: +41,1% (82,7);
  - 08/04/2025, dazi: +36,8% (52,3).
- **VIX ≥ 40** (10 episodi, 8 positivi a 12 mesi):
  - 31/08/1998, Russia/LTCM: +37,9;
  - 17/09/2001: **−15,9**;
  - 22/07/2002: +20,5;
  - 29/09/2008: **−4,1**;
  - 07/05/2010: +20,6;
  - 08/08/2011: +25,2;
  - 24/08/2015: +15,5;
  - 28/02/2020: +32,1;
  - 28/10/2020: +40,5;
  - 04/04/2025: +33,7.
- **VIX ≥ 30** (21 episodi, uno ancora aperto): i 6 negativi a 12 mesi sono 2000 (due volte), 2001, 2007, 2008 e dicembre 2021. Tutti sono arrivati all'inizio o a metà di un mercato ribassista, non alla sua fine.

L'elenco completo, con date, VIX, rendimenti e calo, è in `risultati.json` → `main.SPX_VIX.thresholds.<X>.episodes`.

Attenzione: alla soglia 20 un episodio può durare anni. Quello del 12/12/1996 finisce il 02/10/2003, quello del 02/08/2024 finisce il 29/07/2026. In quei casi il «VIX massimo» comprende più crisi.

## Giorni contro episodi (12 mesi, S&P 500)

| VIX ≥ | giorni | ep. | giorni: mediana | giorni positivi | giorni: 10° pct | episodi: mediana | episodi positivi | quota dei giorni nelle 2 crisi più lunghe |
|---|---|---|---|---|---|---|---|---|
| 20 | 3.427 | 24 | +13,4 | 72% | −20,6 | +17,7 | 22/23 | 67% |
| 25 | 1.600 | 22 | +18,1 | 78% | −15,5 | +11,6 | 16/21 | 34% |
| 30 | 736 | 21 | +22,5 | **87%** | −6,6 | +15,3 | **14/20 (70%)** | 42% |
| 40 | 208 | 10 | +30,8 | 96% | +13,6 | +22,9 | 8/10 | 76% |
| 50 | 75 | 3 | +27,0 | **99% (74/75)** | +9,9 | +36,8 | **2/3** | 99% |

Lo scatter di Rea è corretto sui giorni: sopra 50, 74 sedute su 75 sono seguite da un anno positivo. Però quelle 75 sedute vengono quasi tutte (99%) da due sole crisi, il 2008 e il 2020, e gli episodi indipendenti sono 3. Sopra 30 i giorni dicono 87% positivi, gli episodi 70%: i giorni pesano di più le crisi lunghe, nelle quali chi compra tardi, vicino al minimo, ha molti giorni buoni. Chi vede il VIX passare 30 per la prima volta non sa se è al primo giorno o all'ultimo.

## Nasdaq-100

**Con il VIX (1990-2026).** Base a 12 mesi: +18,6 di mediana, 84% positivi, calo mediano −6,9.

| VIX ≥ | ep. | 6 mesi | 12 mesi | calo (peggiore) | Δ base 12 m | verdetto |
|---|---|---|---|---|---|---|
| 20 | 24 (23) | +13,6 (20/23) | +25,9 (22/23) | −4,7 (−23,0) | +7,3 / +11,9 | con avvertenza |
| 25 | 22 (21) | +5,9 (16/22) | +17,7 (17/21) | −12,8 (**−63,6**) | −1,0 / −2,8 | non mostrare |
| 30 | 21 (20) | +14,5 (17/21) | +26,6 (15/20) | −9,7 (**−62,5**) | +7,9 / −8,8 | con avvertenza (fragile: no con la quiete a 21 sedute) |
| 40 | 10 (10) | +21,5 (9/10) | +32,9 (9/10) | −4,4 (−31,6) | +14,3 / +6,3 | **con avvertenza** (passa con 21, 63 e 126 sedute) |
| 50 | 3 (3) | +46,2 (2/3) | +47,0 (3/3) | −12,0 (−26,6) | +28,3 / +16,3 | non mostrare (3 casi) |

**Con il VXN (2001-2026).** Base a 12 mesi: +16,7 di mediana, 82% positivi.

| VXN ≥ | ep. | 6 mesi | 12 mesi | calo (peggiore) | Δ base 12 m | verdetto |
|---|---|---|---|---|---|---|
| 20 | 14 (14) | +12,8 (13/14) | +20,4 (12/14) | −3,9 (−21,9) | +3,7 / +3,7 | non mostrare |
| 25 | 17 (17) | +6,7 (13/17) | +19,9 (15/17) | −8,3 (−25,9) | +3,2 / +6,2 | non mostrare |
| 30 | 16 (13) | +14,5 (11/15) | +21,2 (10/13) | −8,7 (−42,9) | +4,6 / −5,1 | non mostrare |
| 40 | 8 (8) | +11,4 (6/8) | +30,4 (8/8) | −7,3 (−30,7) | +13,7 / +18,0 | con avvertenza (episodi solo dal 2008) |
| 50 | 3 (3) | −5,2 (1/3) | +20,8 (3/3) | −26,6 (−26,7) | +4,2 / +18,0 | non mostrare |

Con il VXN i giorni ingannano ancora di più. Sopra 50 i giorni positivi a 12 mesi sono il 50% (145/288), sopra 40 il 57%, perché il VXN è rimasto altissimo per tutto il ribasso del 2001-2002.

Le due fonti del VXN non coincidono nel 2001-2003: le chiusure diverse sono 658 e in 644 di queste Yahoo è più alto di FRED (63,75 contro 54,89 il 02/02/2001). Probabilmente sono due metodi di calcolo diversi, ma non è verificato. Con il VXN di Yahoo il verdetto non cambia (passa solo 40).

**Confronto con l'S&P 500.** Con il VIX la mediana a 12 mesi del Nasdaq-100 è 6-11 punti più alta a tutte le soglie (30: +26,6 contro +15,3; 40: +32,9 contro +22,9). In parte è la base, che è più alta di 6,7 punti. Rispetto alla propria base, a 30 il Nasdaq-100 passa (+7,9) e l'S&P 500 no (+3,5). I cali peggiori sono molto più profondi: −62,5% contro −43,3% a 30, nel 2000.

Secondo il criterio 4 il Nasdaq-100 va quindi **mostrato separatamente**, con la sua base. Per il Nasdaq-100 il VIX dà gli stessi verdetti del VXN alla soglia 40, con più storia (dal 1990 e non dal 2001) e più episodi (10 contro 8).

## Oggi (ultimo dato)

- **VIX 28,18 il 05/11/2026** (Yahoo; FRED non l'ha ancora pubblicato). È nella fascia **25-30**, al **89,5° percentile** delle 9.311 chiusure dal 1990 fino a quel giorno, senza dati futuri. L'ultimo dato FRED è 16,61 del 04/11/2026, al 43,8° percentile. Quel giorno l'S&P 500 ha perso il 4,4%, da 7.688,62 a 7.353,73.
- **VXN 38,26** (Yahoo, 05/11), all'88,8° percentile. FRED: 25,08 del 04/11, al 65,7° percentile.
- **Stato per soglia**, con FRED fino al 04/11 e poi Yahoo:
  - VIX ≥ 25: **nuovo episodio iniziato il 05/11/2026**;
  - VIX ≥ 20: dentro l'episodio iniziato il 02/11/2026;
  - VIX ≥ 30: sotto la soglia; l'ultimo episodio è iniziato il 27/03/2026, 154 sedute fa;
  - VIX ≥ 40 e ≥ 50: nessun episodio nelle ultime 252 sedute.

  Il valore di Yahoo va confermato con FRED. Il 06/02/2026 Yahoo dava 20,37 e FRED 17,76, e su 9.278 date comuni le due fonti differiscono 11 volte.
- Per la fascia di oggi la storia dice: dopo un primo VIX ≥ 25, a 12 mesi l'S&P 500 è salito in 16 casi su 21, con una mediana di +11,6, cioè come una seduta qualsiasi. Prima però è sceso in mediana di un altro 11,9%.

## Esplorazione: il VIX ai segnali della vista Indici (solo descrittiva)

Per l'S&P 500 (livello blu 13, breadth dal 2005) i casi sono 4 ingressi in zona blu e 6 trigger. Il VIX all'ingresso ha una mediana di 47,3 (da 31,1 a 75,5), al trigger di 32,4 (da 24,5 a 37,8).

- 5 trigger avevano il VIX ≥ 30: 5/5 positivi a 12 mesi, mediana +20,6; uno è fallito, il 29/08/2011.
- 1 trigger aveva il VIX < 30: il 19/07/2022, con VIX 24,5, che è fallito ed era a −0,2% dopo 6 mesi.

Per il Nasdaq-100 (livello blu 18, dal 2008) i casi sono 5 ingressi (VIX mediano 34,8) e 6 trigger.

- 2 trigger avevano il VIX ≥ 30 (26/03/2009 e 06/04/2020): +52,4% e +68,5% a 12 mesi.
- 4 trigger avevano il VIX < 30: mediana +25,6% a 12 mesi, 4/4 positivi, uno fallito (27/07/2022).

I casi sono troppo pochi per dire che il VIX alto migliori i trigger. Si vede solo che i trigger arrivano quasi sempre con il VIX già sopra 25 e che l'unico trigger dell'S&P 500 con il VIX sotto 25 è fallito.

## Limiti

1. **Pochi casi.** Nessuna soglia arriva a 30 episodi, quindi tutti i numeri sono indicativi. Alla soglia 40 ci sono 10 episodi, alla 50 solo 3.
2. **Un solo mercato, che è sempre risalito.** Negli USA dal 1990 ogni crollo è stato recuperato. In un mercato come il Giappone dopo il 1990 la stessa tabella darebbe altri numeri.
3. **Senno di poi.** Le soglie sono numeri tondi e la tabella dice cosa è successo, non cosa succederà. Il criterio è stato fissato prima, ma la scelta di mostrare solo la soglia che passa è comunque una selezione.
4. **Episodi sovrapposti.** Le soglie non sono indipendenti tra loro: lo stesso crollo compare a 30, 40 e 50.
5. **Solo prezzo.** I dividendi aggiungono circa 2 punti l'anno (S&P 500 total return: base +14,2 contro +11,9) e non cambiano i verdetti. Per il Nasdaq-100 la versione con i dividendi non è disponibile.
6. **Ultimo dato da Yahoo.** Il valore va confermato da FRED il giorno dopo.

## Verdetto

| soglia | S&P 500 (VIX) | Nasdaq-100 (VIX) | nota |
|---|---|---|---|
| 20 | con avvertenza per il criterio, ma **fragile** | con avvertenza | cade con la quiete a 21 o 126 sedute e con l'ingresso il giorno dopo: proposta **non mostrare** come segnale |
| 25 | **non mostrare** | non mostrare | esito come la base e calo successivo mediano dell'11,9% |
| 30 | **non mostrare** | con avvertenza (fragile) | soglia dello scatter di Rea: per episodi l'S&P 500 è solo 3,5 punti sopra la base e meno spesso positivo (70% contro 81%) |
| 40 | **mostrare con avvertenza** | **mostrare con avvertenza** | unica soglia robusta in tutte le varianti: 8/10 positivi a 12 mesi (9/10 per il Nasdaq-100), mediana +22,9 (+32,9) contro una base di +11,9 (+18,6); i due casi negativi sono il 2001 e il 2008 |
| 50 | **non mostrare** come statistica | non mostrare | 3 episodi; si può citare come elenco (2008, 2020, 2025) |

- **Nasdaq-100: separato.** I rendimenti mediani differiscono di 6-11 punti, la base è diversa, a 30 il verdetto cambia e i cali peggiori sono molto più profondi (−62% nel 2000). Per il Nasdaq-100 basta il VIX; il VXN non aggiunge informazione e ha meno storia.
- **Proposta per il pannello**, da discutere: la fascia e il percentile del VIX di oggi; la riga della soglia 40 per S&P 500 e Nasdaq-100 in numeri assoluti («8 su 10»), con la base accanto e l'elenco degli episodi; una nota «giorni contro episodi» che spieghi perché lo scatter dà numeri più belli.
- Per la fascia 25-30 non si mostra un rendimento atteso. Si mostra il dato onesto: dopo un primo VIX a 25-30 l'indice è sceso in mediana di un altro 11% prima di toccare il minimo.
