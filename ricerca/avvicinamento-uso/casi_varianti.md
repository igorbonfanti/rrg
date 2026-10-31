# Avvicinamento: casi, lettura e varianti (settori S&P 500)

Analisi del 31/10/2026, dati al 30/10/2026. Script: `script/casi_varianti.mjs`, risultati: `casi_varianti.json`. Fase di ricerca: l'app non cambia.

## Domanda
Il segnale «Avvicinamento» (stato Normale e breadth sotto la soglia del giorno, cioè livello blu più il 90° percentile dei cali in 10 sedute calcolato fino a quel giorno) serve davvero? Come va letto? Qui si guardano gli episodi uno per uno, i casi in cui il segnale «salta», XLRE e XLU e alcune varianti. Il backtest statistico generale è in `backtest.md`.

## Criterio deciso prima dei risultati
Il criterio è scritto nello script prima della prima esecuzione. Una variante è **migliore** della regola attuale se valgono tutte queste condizioni:
1. tocchi del livello blu avvisati (da 5 a 126 sedute prima) non meno di quelli attuali meno 2;
2. quota di avvisi che arrivano al livello entro 126 sedute non più bassa;
3. anticipo mediano di almeno 15 sedute (più della sola Attenzione, che ne dà 12);
4. almeno una di queste: sedute in allarme ridotte di almeno il 20%, oppure quota di episodi di 1–2 sedute ridotta di almeno un terzo.

**Limite dichiarato.** Le varianti a–e sono state pensate guardando questi grafici. Le varianti f ed e+f sono state aggiunte **dopo** aver visto i risultati, per verificare un'ipotesi su XLRE. Tutti i numeri sono nel campione.

## Metodo
- **Regola esatta dell'app**: `approachSeries` e `runMachine` importate da `js/signals.js`. La condizione è copiata da `apprDays` di `js/bottom.js`.
- **Periodo**: per ogni settore, dalla prima seduta con uno stato della macchina, lo stesso inizio del grafico (`rangeStart`). Per XLC è il 20/06/2019 e per XLRE il 07/10/2016, un anno dopo il lancio dell'ETF. Per gli altri è il 03/01/2005.
- **Definizioni**: sono le stesse di `ricerca/attenzione`. Un episodio inizia con la prima seduta in avvicinamento dopo almeno 20 sedute senza. Un tratto è una serie di sedute in avvicinamento consecutive. Un episodio «arriva» se tocca il livello blu entro 126 sedute. Un tocco è la breadth al livello blu o sotto, dopo almeno 60 sedute sopra.
- **Esito di un episodio**: è lo stato più grave raggiunto dall'ingresso fino a 20 sedute dopo l'ultima seduta in avvicinamento. In ordine di gravità: zona blu, Attenzione per breadth (breadth ≤ livello + 10), Attenzione per solo drawdown, Normale (la breadth torna sopra la soglia).
- **Rendimento**: ETF dalla chiusura del giorno d'ingresso a 63 sedute dopo. La base sono tutte le sedute del periodo.
- **Controlli indipendenti** (nel JSON, voce `controlli`):
  - la soglia del giorno coincide con `approachLevel` calcolata sulla storia troncata in 649 sedute campione (0 differenze);
  - un conteggio separato delle sedute in avvicinamento, con lo stato preso senza riporto e la soglia ricalcolata con un ordinamento completo, dà 0 differenze su 53.810 sedute;
  - la regola C di `ricerca/attenzione/avvicinamento_pit.mjs`, calcolata sulla storia intera, torna a 42/73.

### Nota sul conteggio dell'app: «da sola 42 su 73»
Il numero viene da un calcolo sulla storia intera. Comprende 8 tocchi avvisati in XLC prima del 2019 (5) e in XLRE prima del 2016 (3). In quei periodi l'ETF non c'era, la macchina non ha uno stato e il grafico non mostra il giallo: `apprDays` porta avanti lo stato «normal» della seduta 0. Sul periodo che l'app mostra davvero, la regola avvisa **33 tocchi su 63**. Insieme all'Attenzione (D) sono 50/63, contro i 59/73 citati. Per cambiare il testo dell'app serve l'ok dell'utente.

## 1. Mappa degli episodi (regola attuale)
L'elenco completo, episodio per episodio, è in `casi_varianti.json` alla voce `episodi`. Per ogni episodio ci sono: ingresso, ultima seduta, durata, sedute in avvicinamento, tratti, esito e sedute fino all'esito, tocco del blu, ETF a 63 sedute, breadth e soglia all'ingresso, calo in 10 sedute, percentile del drawdown, altri settori in allarme e sedute dall'ultimo tocco.

Legenda delle colonne della tabella:
- **Esiti**: N = la breadth torna sopra la soglia; Att.dd = Attenzione per solo drawdown; Att.br = Attenzione per breadth; ZB = zona blu.
- **In risalita**: quota delle sedute in avvicinamento che cadono entro 126 sedute da un tocco del livello blu, cioè dopo un bottom.

| Settore | Dal | Episodi | Durata mediana (sedute) | Sedute in avv. mediane | % sedute in avv. | Episodi di 1–2 sedute | Tratti di 1–2 sedute | Esiti N / Att.dd / Att.br / ZB | Arrivano al blu | % avv. in risalita | ETF 63 mediano (positivi) | Base 63 (positivi) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| XLK | 2005 | 9 | 12 | 3 | 1,1% | 3 (33%) | 79% | 4 / 0 / 4 / 1 | 2/9 | 5% | +11,5% (9/9) | +4,8% (73%) |
| XLC | 2019 | 5 | 1 | 1 | 0,5% | 4 (80%) | 100% | 4 / 1 / 0 / 0 | 0/3 | 0% | −0,2% (2/4) | +4,7% (68%) |
| XLY | 2005 | 9 | 4 | 3 | 0,8% | 4 (44%) | 70% | 4 / 1 / 4 / 0 | 1/8 | 5% | +10,6% (7/8) | +3,4% (69%) |
| XLP | 2005 | 11 | 5 | 4 | 1,2% | 4 (36%) | 77% | 4 / 3 / 3 / 1 | 2/10 | 2% | +5,1% (9/10) | +2,6% (71%) |
| XLE | 2005 | 19 | 29 | 15 | 8,6% | 3 (16%) | 50% | 4 / 4 / 8 / 3 | 6/19 | 9% | +1,6% (12/19) | +2,7% (60%) |
| XLF | 2005 | 18 | 12,5 | 5 | 2,9% | 4 (22%) | 60% | 10 / 1 / 3 / 4 | 7/18 | 17% | +6,1% (12/18) | +3,1% (66%) |
| XLV | 2005 | 9 | 4 | 3 | 1,3% | 2 (22%) | 61% | 2 / 2 / 3 / 2 | 2/9 | 10% | +6,4% (8/9) | +3,4% (71%) |
| XLI | 2005 | 12 | 4,5 | 2,5 | 1,1% | 6 (50%) | 70% | 5 / 1 / 5 / 1 | 2/12 | 13% | +8,6% (9/12) | +3,7% (69%) |
| XLB | 2005 | 27 | 9 | 4 | 4,1% | 7 (26%) | 70% | 8 / 4 / 9 / 5 (+1 in corso) | 13/26 | 10% | +2,6% (14/26) | +3,1% (65%) |
| XLRE | 2016 | 15 | 14 | 5 | 12,1% | 4 (27%) | 49% | 8 / 1 / 6 / 0 | 5/14 | 57% | +4,2% (9/14) | +2,2% (64%) |
| XLU | 2005 | 24 | 10 | 6 | 4,0% | 6 (25%) | 62% | 9 / 5 / 5 / 5 | 10/24 | 20% | +3,9% (17/23) | +3,0% (68%) |
| **Totale** | | **158** | **10,5** | **5** | **3,1%** | **47 (30%)** | **62%** | **62 / 23 / 50 / 22** | **50/152 (33%)** | | **+4,8% (108/152)** | **+3,3% (68%)** |

Come lo stato più grave di un episodio si collega all'arrivo al blu:
- Normale: 9/59 arrivano;
- Attenzione per drawdown: 2/23;
- Attenzione per breadth: 17/48;
- zona blu: 22/22.

Gli episodi che passano in Attenzione per breadth ci arrivano in una mediana di 7 sedute dall'ingresso, quelli che arrivano in zona blu in 15.

**XLRE nel 2025**: 137 sedute in avvicinamento su 250, con la breadth mediana dell'anno al 34,5% contro una soglia del 41,3%.
- L'episodio del 14/04/2025 (80 sedute su 98) comincia 2 sedute dopo un tocco del livello blu (minimo 6,9%): è la risalita dal bottom di aprile.
- L'episodio dal 08/10/2025 al 03/02/2026 (65 sedute su 81) comincia 124 sedute dopo quel tocco.
- L'episodio di oggi è iniziato il 16/09/2026 (23 sedute su 33): breadth 36,7%, soglia 39,8%.

## 2. Passaggi diretti: quante volte il segnale «salta»
La tabella conta due cose:
- **i passaggi di una seduta** dallo stato Normale con la breadth sopra la soglia a uno stato più grave;
- **gli ingressi nella fascia** livello + 10 (dopo 20 sedute sopra, in qualsiasi stato), con il motivo per cui il giallo è mancato nelle 20 sedute prima.

| Settore | Normale sopra soglia → Attenzione per breadth | → Attenzione per drawdown | → zona blu | Avvicinamento → Attenzione per breadth | Ingressi in fascia | annunciati | già in Attenzione per drawdown | dopo un trigger | salto in un giorno | altro |
|---|---|---|---|---|---|---|---|---|---|---|
| XLK | 2 | 36 | 0 | 6 | 15 | 5 | 8 | 2 | 0 | 0 |
| XLC | 0 | 8 | 0 | 0 | 3 | 0 | 3 | 0 | 0 | 0 |
| XLY | 0 | 37 | 0 | 5 | 13 | 3 | 9 | 1 | 0 | 0 |
| XLP | 1 | 86 | 0 | 2 | 12 | 4 | 7 | 0 | 1 | 0 |
| XLE | 1 | 40 | 0 | 19 | 19 | 15 | 3 | 0 | 0 | 1 |
| XLF | 1 | 25 | 0 | 10 | 12 | 6 | 4 | 1 | 1 | 0 |
| XLV | 2 | 52 | 0 | 7 | 15 | 4 | 7 | 2 | 2 | 0 |
| XLI | 0 | 49 | 0 | 7 | 13 | 6 | 7 | 0 | 0 | 0 |
| XLB | 2 | 19 | 0 | 17 | 20 | 15 | 4 | 0 | 1 | 0 |
| XLRE | 2 | 17 | 0 | 12 | 10 | 7 | 3 | 0 | 0 | 0 |
| XLU | 4 | 37 | 0 | 10 | 17 | 9 | 6 | 1 | 1 | 0 |
| **Totale** | **15** | **406** | **0** | **95** | **149** | **74** | **61** | **7** | **6** | **1** |

- **Il salto vero è raro.** Su 110 passaggi da Normale ad Attenzione per breadth, 95 arrivano da una seduta in avvicinamento e solo 15 da sopra la soglia. Il passaggio diretto in zona blu non può avvenire: servono 2 chiusure sotto il livello, quindi prima c'è almeno una seduta in Attenzione.
- **Il giallo manca soprattutto perché il settore è già in Attenzione per drawdown.** Su 149 ingressi nella fascia, 74 sono annunciati da almeno una seduta in avvicinamento nelle 20 sedute prima. Dei 75 non annunciati, 61 sono avvenuti con il settore già in Attenzione per drawdown (oltre l'85° percentile) quando la breadth ha passato la soglia, e lo stato Attenzione nasconde il giallo. I salti in un giorno sono 6, i casi dopo un trigger 7.
- **XLK, XLC, XLF.** I passaggi «da breadth alta direttamente in Attenzione» che l'utente vede sono quasi sempre passaggi in Attenzione **per drawdown**: in tutto 406 ingressi da Normale, con la breadth ancora sopra la fascia.
  - XLK: degli ingressi nella fascia, 8 su 15 sono avvenuti già in Attenzione per drawdown (2008, 2018, 2020, 2022) e 5 sono annunciati.
  - XLC: 3 su 3 già in Attenzione per drawdown.
  - XLF: 4 su 12 già in Attenzione per drawdown, 6 annunciati.

## 3. Perché XLRE (e in parte XLU) resta a lungo in avvicinamento

| Settore | Titoli | Punti per titolo | Livello blu | Soglia oggi | Calo q90 in 10 sedute (punti / titoli) | Breadth mediana (dal / ultimi 5 anni) | Soglia = percentile della breadth | % sedute sotto soglia (dal / 5 anni) | % sedute in avv. (dal / 5 anni) |
|---|---|---|---|---|---|---|---|---|---|
| XLK | 75 | 1,3 | 6 | 26,0 | 20,0 / 15,0 | 68 / 63 | 11 | 11 / 14 | 1,1 / 0,2 |
| XLC | 22 | 4,5 | 5 | 25,8 | 20,8 / 4,6 | 61 / 52 | 13 | 13 / 16 | 0,5 / 0,8 |
| XLY | 47 | 2,1 | 8 | 25,8 | 17,8 / 8,4 | 61 / 57 | 12 | 12 / 16 | 0,8 / 1,5 |
| XLP | 34 | 2,9 | 11 | 30,4 | 19,4 / 6,6 | 62 / 47 | 8 | 8 / 13 | 1,2 / 4,4 |
| XLE | 21 | 4,8 | 1 | 29,6 | 28,6 / 6,0 | 64 / 70 | 26 | 27 / 9 | 8,6 / 5,6 |
| XLF | 76 | 1,3 | 6 | 27,9 | 21,9 / 16,7 | 71 / 63 | 15 | 14 / 11 | 2,9 / 3,9 |
| XLV | 60 | 1,7 | 11 | 28,1 | 17,1 / 10,3 | 65 / 51 | 9 | 9 / 9 | 1,3 / 3,3 |
| XLI | 82 | 1,2 | 5 | 26,3 | 21,3 / 17,4 | 69 / 64 | 10 | 10 / 8 | 1,1 / 1,0 |
| XLB | 24 | 4,2 | 10 | 33,1 | 23,1 / 5,5 | 64 / 50 | 15 | 19 / 20 | 4,1 / 7,3 |
| XLRE | 30 | 3,3 | 8 | 39,8 | 31,8 / 9,5 | 55 / 45 | 34 | 35 / 42 | 12,1 / 16,4 |
| XLU | 31 | 3,2 | 5 | 36,0 | 31,0 / 9,6 | 74 / 68 | 23 | 23 / 27 | 4,0 / 5,3 |

- **XLRE è l'unico caso estremo.** La soglia (39,8%) sta al 34° percentile della sua breadth. Negli ultimi 5 anni la breadth mediana è stata del 44,8% e il 41,5% delle sedute era sotto la soglia. L'avvicinamento diventa uno stato di fondo: 16,4% delle sedute negli ultimi 5 anni.
- **XLU è meno anomalo di quanto sembri.** È in avvicinamento il 4,0% delle sedute, come XLB (4,1%) e meno di XLE (8,6%).
- **Il numero di titoli conta poco.** La correlazione di rango tra numero di titoli e quota di sedute in avvicinamento è −0,36. Quella tra la posizione della soglia nella distribuzione della breadth e la stessa quota è +0,68. XLC (22 titoli) e XLB (24) sono piccoli come XLRE ma restano in avvicinamento lo 0,5% e il 4,1% delle sedute.
- **Cosa ha di diverso XLRE.** Si sommano tre cose:
  - un calo forte largo in punti (31,8, perché un titolo vale 3,3 punti);
  - un livello blu basso (8%);
  - lunghi periodi con la breadth bassa ma lontana dal livello: mediana del 34,5% nel 2025 e del 44,8% negli ultimi 5 anni.
- **È un difetto parziale della regola.** La regola misura la distanza dal livello, non la direzione. Il 56,5% delle sedute in avvicinamento di XLRE cade entro 126 sedute da un tocco del livello blu: è la risalita dopo un bottom, non l'avvicinamento a un bottom. Negli altri settori la quota va dallo 0 al 20%.
- **Il giallo dopo un bottom serve poco.** Gli episodi che iniziano entro 126 sedute da un tocco arrivano di nuovo al livello 5 volte su 24 (21%), quelli senza un tocco recente 45 su 128 (35%). (Il ricalcolo separato di `script/verifica_regole_uso.mjs`, che esclude gli episodi senza 126 sedute dopo, dà 43 su 126, 34%: è il numero citato nella guida.) Nel 2016–2026 il divario è più netto: 3/19 contro 31/74. Nel 2005–2015 gli episodi in risalita sono solo 5.

## 4. Varianti
Stessi indicatori e stesso periodo per tutte (63 tocchi). D ed E sono solo riferimenti.

| Regola | Allarmi | Arrivano | Anticipo mediano | Tocchi avvisati | % sedute in allarme | Episodi di 1–2 sedute | Tratti di 1–2 | Tocchi 2005–15 / 2016–26 | ETF 63 mediano (positivi) | Migliore secondo il criterio? |
|---|---|---|---|---|---|---|---|---|---|---|
| **attuale (q90)** | 158 | 50/152 (32,9%) | 30,5 | **33/63** | **3,1%** | 47 (29,7%) | 62% | 7/23 · 26/40 | +4,8% (71%) | — |
| a. q85 | 120 | 37/116 (31,9%) | 23 | 26/63 | 2,0% | 44 (36,7%) | 64% | 5/23 · 21/40 | +4,9% (71%) | no: −7 tocchi |
| a. q95 | 199 | 58/191 (30,4%) | 42 | 38/63 | 5,9% | 45 (22,6%) | 57% | 9/23 · 29/40 | +3,9% (67%) | no: arrivano meno, più allarme |
| b. livello + 10 titoli | 172 | 44/166 (26,5%) | 32 | 32/63 | 6,3% | 40 (23,3%) | 58% | 8/23 · 24/40 | +4,3% (70%) | no |
| b. livello + 15 titoli | 233 | 49/226 (21,7%) | 44 | 38/63 | 16,1% | 54 (23,2%) | 50% | 12/23 · 26/40 | +3,7% (69%) | no |
| b. livello + 20 titoli | 252 | 50/251 (19,9%) | 48,5 | 39/63 | 28,8% | 34 (13,5%) | 49% | 14/23 · 25/40 | +4,1% (68%) | no: arriva 1 su 5 |
| c. 2 chiusure di fila | 118 | 37/115 (32,2%) | 28 | 26/63 | 2,2% | 40 (33,9%) | 49% | 6/23 · 20/40 | +5,0% (68%) | no: −7 tocchi |
| d1. in caduta (ogni giorno) | 134 | 43/129 (33,3%) | 30 | 30/63 | 0,8% | 68 (50,7%) | 80% | 5/23 · 25/40 | +5,8% (74%) | no: −3 tocchi |
| d2. in caduta all'ingresso | 134 | 43/129 (33,3%) | 30 | 30/63 | 1,2% | 60 (44,8%) | 69% | 5/23 · 25/40 | +5,8% (74%) | no: −3 tocchi |
| e. anche in Attenzione per drawdown | 222 | 81/216 (37,5%) | 28 | **53/63** | 6,3% | 52 (23,4%) | 59% | 19/23 · 34/40 | +4,6% (67%) | no: il doppio delle sedute in allarme |
| f. senza tocco nelle 126 sedute prima (a posteriori) | 138 | 45/132 (34,1%) | 32 | 31/63 | 2,5% | 44 (31,9%) | 63% | 6/23 · 25/40 | +4,6% (71%) | no: −19% sedute (serviva −20%) |
| e+f (a posteriori) | 189 | 68/183 (37,2%) | 29,5 | 47/63 | 5,0% | 52 (27,5%) | 59% | 15/23 · 32/40 | +4,6% (68%) | no |
| D. attuale oppure Attenzione (riferimento) | 256 | 71/247 (28,7%) | 24 | 50/63 | 13,8% | 40 (15,6%) | 47% | 14/23 · 36/40 | +5,2% (74%) | — |
| E. solo Attenzione (riferimento) | 212 | 65/207 (31,4%) | 12 | 43/63 | 10,7% | 29 (13,7%) | 49% | 12/23 · 31/40 | +5,8% (78%) | — |

**Nessuna variante passa il criterio.** Ecco cosa dicono:
- **Percentile 85 o 95, soglia in titoli**: spostano solo il compromesso. Più tocchi vogliono dire più allarme e meno arrivi. La soglia in titoli non aiuta i settori piccoli, perché in titoli il loro calo forte è già più stretto (9,5 titoli per XLRE contro 15 per XLK).
- **Conferma con 2 chiusure (c)**: perde 7 tocchi su 33. La quota di episodi brevi non scende (33,9% contro 29,7%), perché un episodio breve resta breve, solo un giorno dopo.
- **Solo in caduta (d1, d2)**: le sedute in allarme scendono da 3,1% a 0,8–1,2%, ma si perdono 3 tocchi e gli episodi di 1–2 sedute salgono al 45–51%. Il giallo diventerebbe più raro e più frammentato.
- **Anche in Attenzione per drawdown (e)**: è la variante che cambia di più, e la ragione è la stessa del punto 2. Avvisa 53 tocchi su 63 invece di 33 (20 dei 30 persi), arriva di più (37,5%) e tiene un anticipo mediano di 28 sedute. Il miglioramento vale in entrambi i periodi: 19/23 contro 7/23 e 34/40 contro 26/40. Il costo è il doppio delle sedute in allarme (6,3% contro 3,1%; le sedute in più sono tutte sedute che l'app mostra già in Attenzione). Rispetto alla scala attuale «avvicinamento oppure Attenzione» (D: 50/63, 28,7%, 13,8% di sedute) è meglio su tutti gli indicatori tranne la quota di episodi brevi. Il criterio deciso prima la scarta per le sedute in allarme. Vale come proposta da discutere: mostrare la breadth sotto la soglia anche quando lo stato è Attenzione per drawdown, per esempio come seconda riga del badge. Non va trattata come una regola migliore.
- **f (a posteriori)**: toglie la risalita dopo un bottom. Riduce le sedute di XLRE da 12,1% a 5,3% e lascia invariati i tocchi avvisati di XLRE (4/5). In totale si perdono 2 tocchi e le sedute in allarme scendono del 19%. È al limite e non è stata scelta prima.
- **Tocchi persi anche dalla variante e** (10): XLK 16/03/2020, XLC 12/03/2020, XLY 26/06/2008, XLP 12/03/2020, XLE 24/10/2018, XLV 08/08/2011 e 21/12/2018, XLI 12/03/2020, XLB 04/08/2011, XLU 08/08/2011. Sono crolli da breadth alta (marzo 2020, agosto 2011) che nessuna soglia anticipa di 5 sedute.

## 5. Come usare l'avvicinamento: tre regole proposte
Sono percentuali di arrivo al livello blu entro 126 sedute dall'ingresso, nel campione, con condizioni note il giorno in cui si applicano. In media arriva 1 episodio su 3: 50/152.

1. **Conta il passaggio in Attenzione, non la durata del giallo.** Guarda il settore alla terza seduta dall'ingresso:
   - se è già in Attenzione (o oltre), arriva al livello nel 45% dei casi (20/44);
   - se è ancora in avvicinamento, nel 23% (10/44);
   - se è tornato sopra la soglia, nel 31% (20/64).

   L'ordine tiene nei due periodi: 50% contro 11% e 26% nel 2005–2015, 43% contro 31% e 35% nel 2016–2026. Un tratto giallo lungo non è più pericoloso di uno corto: gli episodi di 1–2 sedute arrivano nel 36% dei casi (16/44), quelli più lunghi nel 31% (34/108). Questo dato è descrittivo, perché la lunghezza si conosce solo dopo. In pratica: all'ingresso il settore va in watchlist; ci si prepara quando passa in Attenzione per breadth (mediana 7 sedute dopo l'ingresso).
2. **Dopo un bottom recente il giallo è risalita, non avviso.** Se il settore ha toccato il livello blu nelle ultime 126 sedute, solo il 21% degli episodi torna al livello (5/24), contro il 35% degli altri (45/128). È il caso di XLRE oggi e per gran parte del 2025: il 56,5% delle sue sedute in avvicinamento cade in risalita, e la soglia sta sopra un terzo della sua breadth storica. In XLRE l'avvicinamento va letto come «breadth debole», non come «bottom vicino».
3. **Non è un segnale di vendita, e manca proprio quando il settore è in Attenzione per drawdown.** Dopo l'ingresso l'ETF a 63 sedute sale in mediana del 4,8% (positivo 108 volte su 152), contro +3,3% e il 68% di positivi di tutte le sedute. Con un settore in Attenzione per drawdown il giallo non si vede: è lì che sono avvenuti 61 dei 75 ingressi nella fascia non annunciati, e lì stanno 20 dei 30 tocchi che la regola perde. Con lo stato Attenzione per drawdown conviene guardare la soglia di avvicinamento nel tooltip del grafico.

**Indicatori che non reggono**, quindi non proposti come regole:
- **Calo veloce all'ingresso**: arriva il 38% contro il 21% (41/108 contro 9/44). Però nel 2005–2015 non c'è differenza (27% contro 28%): tutto viene dal 2016–2026.
- **Numero di altri settori in allarme**: nel 2005–2015 con 5 o più settori in allarme arriva il 43% contro il 14% con 0–1. Nel 2016–2026 il rapporto si inverte: 24% contro 40%.

## Limiti
- Tutto è nel campione. Il q90 a 10 sedute era già stato scelto su questa storia (`ricerca/attenzione/fasce.md`) e le varianti sono nate guardando questi grafici; f ed e+f dopo aver visto i risultati.
- I livelli blu sono quelli di oggi (Quant-Rea), cioè scelti col senno di poi. I membri dei settori sono quelli di oggi e la storia è ricostruita all'indietro, quindi il numero di titoli con dati cambia nel tempo.
- I tocchi si concentrano in poche crisi (2008, 2011, 2015, 2018, 2020, 2022, 2025). I 63 tocchi e i 152 episodi non sono casi indipendenti, e le percentuali sui gruppi piccoli (da 19 a 44 episodi) sono indicative.
- XLC e XLRE hanno una storia corta: 5 e 15 episodi.
- Il rendimento a 63 sedute parte dalla chiusura del giorno d'ingresso. Il segnale si conosce a mercato chiuso, quindi la chiusura stessa non si può comprare.

## Verdetto
- **Segnale**: si tiene, come avviso di watchlist e non come segnale operativo. Avvisa da solo circa metà dei tocchi del blu (33/63) con circa un mese e mezzo di anticipo (30,5 sedute) e il 3,1% di sedute in allarme. Un episodio su tre arriva al livello.
- **Regola**: nessuna delle varianti a–e la batte con il criterio deciso prima.
- **Da discutere con l'utente**:
  1. Rendere visibile la breadth sotto la soglia anche in Attenzione per drawdown (variante e): +20 tocchi avvisati, con l'allarme che resta sotto la metà della scala attuale.
  2. Segnalare nell'app o nella guida che, dopo un tocco recente, l'avvicinamento è risalita (XLRE).
  3. Correggere i testi «42 su 73» e «59 su 73», che contano anche periodi senza stato in XLC e XLRE: sul periodo mostrato sono 33/63 e 50/63.
