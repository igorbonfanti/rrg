# Capitolazione sui 22 indici della vista 6: la prova

18/10/2026. Solo ricerca, l'app non cambia. Script: `../../script/capitolazione_indici.py` (cache dei prezzi dei membri da `scripts/backfill_indices.py prices`; S&P 500 dalla sonda con i membri di ogni data).

**Misura.** Preset di Rea: % dei membri con un calo giornaliero di almeno il 7%, sommata sulle ultime 5 sedute.

**Segnale.**
- La somma supera il 99° percentile delle sedute precedenti, con almeno 3 anni di storia.
- Ci sono almeno 5 cali nella somma.
- Un episodio = segnali distanti meno di 10 sedute; si entra il primo giorno.

**Confronto.** Rendimento dell'indice (solo prezzo) dopo l'episodio, contro una seduta qualsiasi dello stesso periodo. Accanto, lo stesso calcolo con il **solo prezzo**: le 5 sedute peggiori dell'indice, sotto il 1° percentile delle precedenti. Serve a vedere se i titoli aggiungono qualcosa al prezzo.

**Pulizia.** Si scarta un calo che il giorno dopo si riprende quasi tutto mentre l'indice era tranquillo (errore di stampa di Yahoo). Errori tolti: 1–3% dei cali, ASX 200 6,7%, Russell 2000 5,5%.

## Indice per indice (12 mesi, in %)

| Indice | Titoli con prezzi | Episodi | 12 mesi dopo | Giorno qualsiasi | Eccesso | Solo prezzo, eccesso | Oggi (percentile) |
|---|---|---|---|---|---|---|---|
| S&P 500 | 492 | 4 | +22,1 | +10,4 | +11,6 | +3,8 | 44° |
| Nasdaq-100 | 86 | 7 | +32,6 | +19,8 | +12,8 | +1,6 | 97° |
| Dow Jones | 30 | 7 | +21,3 | +8,8 | +12,5 | +7,5 | 77° |
| Nikkei 225 | 219 | 11 | +20,4 | +11,1 | +9,3 | −4,6 | 97° |
| STOXX Europe 600 | 549 | 8 | −1,1 | +4,4 | **−5,5** | −1,5 | 74° |
| FTSE 100 | 94 | 6 | +27,7 | +5,0 | +22,6 | +4,7 | 41° |
| DAX | 38 | 4 | +9,8 | +11,0 | **−1,2** | +2,5 | 70° |
| CAC 40 | 39 | 5 | +16,9 | +5,7 | +11,2 | +3,9 | 67° |
| SMI | 16 | 5 | +17,6 | +5,2 | +12,3 | −0,3 | 86° |
| Russell 2000 | 1.302 | 2 | +44,4 | +13,3 | +31,1 | +4,1 | 95° |
| S&P/TSX 60 | 59 | 4 | +9,2 | +8,3 | +0,9 | +4,3 | 61° |
| Euro Stoxx 50 | 47 | 2 | +30,0 | +6,1 | +23,9 | +6,1 | 77° |
| FTSE MIB | 37 | 9 | +15,2 | +4,0 | +11,2 | −4,0 | 68° |
| IBEX 35 | 33 | 3 | +31,7 | +4,8 | +26,9 | +6,7 | 68° |
| Hang Seng | 64 | 4 | +22,4 | +2,6 | +19,8 | +5,9 | 39° |
| CSI 300 | 256 | 1 | +3,2 | +5,1 | −1,9 | +5,0 | 68° |
| KOSPI 200 | 170 | 5 | +49,1 | +12,0 | +37,2 | +30,3 | 98° |
| Taiwan (MSCI) | 73 | 22 | +19,4 | +12,0 | +7,4 | +3,9 | 99° |
| Nifty 50 | 47 | 1 | +53,5 | +11,9 | +41,6 | +41,6 | 69° |
| S&P/ASX 200 | 169 | 1 | +16,5 | +4,7 | +11,8 | +4,8 | 39° |
| MSCI Emerging | 869 | 8 | +15,8 | +5,2 | +10,6 | +12,3 | 93° |
| Ibovespa | 64 | 1 | +35,4 | +9,1 | +26,4 | +7,2 | 87° |

Note sulla tabella:
- La prova parte da quando la copertura dei membri lo consente: Nasdaq-100 dal 2011, Russell 2000 dal 2019, MSCI Emerging dal 2014, gli altri tra il 2003 e il 2010. Le date di ogni indice sono nel CSV.
- Gli episodi del 2026 non hanno ancora 12 mesi: contano nel numero degli episodi, non nella media.
- **Taiwan**: i 22 episodi includono falsi cali nel 2005–07. Per esempio a dicembre 2005 otto titoli a −7% con l'indice a +2,5%: verosimilmente stacchi di dividendi in azioni, che la chiusura di Yahoo non rettifica. Prima di usarla serve la chiusura rettificata.

## Tutti gli indici insieme (Taiwan esclusa)

| | Episodi | Eccesso a 3 mesi | Eccesso a 12 mesi | Positivi a 12 mesi | Media per evento (35 mesi) | Senza marzo 2020 e aprile 2025 |
|---|---|---|---|---|---|---|
| Capitolazione | 98 | +4,8 | +12,0 | 78% | +2,3 | +2,8 (66 episodi) |
| Solo prezzo | 227 | +1,5 | +3,1 | 73% | −2,1 | −0,1 (206 episodi) |

1. **Nella media di tutti gli episodi la capitolazione aggiunge al prezzo**: +12 punti a 12 mesi contro +3.
2. **Ma pesano due eventi.**
   - Marzo 2020 conta 19 episodi e aprile 2025 ne conta 13.
   - Contando un evento una volta sola, cioè facendo la media per mese, l'eccesso scende a +2,3 punti.
   - Togliendo quei due mesi resta +2,8 punti. Il solo prezzo invece va a zero.
3. **Dove sbaglia.** Fallisce all'inizio dei mercati orso lunghi: i 16 episodi tra agosto 2007 e settembre 2008 hanno dato −28 punti a 12 mesi. È per questo che STOXX 600 e DAX hanno eccesso negativo.

**Filtro del calo precedente.** Chiedendo che l'indice sia già almeno il 20% sotto il massimo a 52 settimane, gli eventi diventano 20 e ne restano 5 negativi. Il risultato per evento sale a +10,5 punti, e a +6,6 senza 2020 e 2025.

Attenzione: questo filtro l'ho scelto dopo aver visto i dati. Prima di usarlo in una regola va trattato come un'ipotesi da verificare. La nostra zona blu fa un lavoro simile, perché richiede già un'ampiezza bassa.

## Capitolazione su tanti mercati insieme

Numero di indici con il segnale attivo nello stesso periodo (massimo del mese, Taiwan inclusa):

| Mese | Indici |
|---|---|
| marzo 2020 | 21 su 22 |
| aprile 2025 | 14 |
| ottobre 2008 | 10 |
| giugno–luglio 2016 (Brexit) | 9 |
| novembre 2008 | 9 |
| settembre 2008 | 6 |
| agosto 2011 | 5 |

Oggi, 16/10/2026: nessun indice è sopra la soglia, tranne Taiwan (dato da verificare). Sono però alti, oltre il 93° percentile: Nasdaq-100, Nikkei, KOSPI, Russell 2000 e MSCI Emerging. Nel 2026 ci sono già stati episodi su KOSPI (marzo e luglio, −15% e −21% in 5 sedute), Nasdaq-100 (febbraio e luglio) e Taiwan.

## Giudizio per l'app

| Gruppo | Indici | Come mostrarla |
|---|---|---|
| Funziona, dati buoni | S&P 500, Nasdaq-100, Dow Jones, Nikkei 225, FTSE 100, CAC 40, FTSE MIB, Hang Seng, KOSPI 200, MSCI Emerging | scheda completa: grafico, percentile, episodi con i rendimenti |
| Funziona, ma pochi titoli | SMI (16 titoli con prezzi), IBEX 35, Euro Stoxx 50 | come sopra, con il minimo di 5 cali e la nota «pochi titoli» |
| Non ha funzionato | STOXX Europe 600, DAX, S&P/TSX 60 | scheda completa: la tabella degli episodi mostra onestamente che qui non ha aiutato (2007–08) |
| Troppo pochi episodi | Russell 2000 (dati dal 2019), CSI 300, Nifty 50, ASX 200, Ibovespa | grafico e percentile; statistiche con l'avviso «1–2 episodi» |
| Dati da pulire | Taiwan | solo dopo aver aggiunto la chiusura rettificata (stacchi di dividendi in azioni) |

Per tutti: la chiusura rettificata va scaricata accanto a quella normale, come per l'S&P 500, così gli stacchi straordinari non diventano cali. Costa poco: è lo stesso download di Yahoo.

## File

- `capitolazione_indici.csv`: tutte le colonne per indice, anche le soglie del −5% e del −10%.
- `episodi.csv`: un episodio per riga, capitolazione e solo prezzo.
- `capitolazione_globale.csv`: quanti indici sono in segnale ogni giorno.
