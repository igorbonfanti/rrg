# Pannello VIX: sintesi della verifica (fase 1, 06/11/2026)

Idea di Massimo Rea (quant-rea, analisi 33 e 34 del catalogo, `ricerca/quant-rea/catalogo.md`): rendimenti dell'S&P 500 quando il
VIX è alto; volatilità implicita contro realizzata contro GARCH. Dati nostri da fonti pubbliche (FRED, Yahoo), nessun dato
della sua piattaforma. GARCH riammesso dall'utente solo per questo test (06/11/2026; prima escluso in `docs/sviluppo.md`).

## 1. Regimi del VIX (`regimi/regimi.md`)

Episodi = prima chiusura del VIX ≥ soglia dopo almeno 63 sedute sotto. Rendimenti dalla chiusura del giorno del segnale.
Ricalcolo indipendente: `regimi/script/verifica.py` (67 controlli, 0 differenze) e uno script separato del 06/11 (stessi
episodi e mediane).

| VIX ≥ | episodi | S&P 500 a 12 mesi | Nasdaq-100 a 12 mesi | verdetto (criterio deciso prima) |
|---|---|---|---|---|
| base (tutte le sedute dal 1990) | — | 81% positivi, mediana +11,9% | mediana +6,7 punti sopra l'S&P 500 | — |
| 20 | 24 | 22/23, +17,7% | | passa di poco, non regge alle varianti: no |
| 25 | 22 | 16/21, +11,6%; calo mediano dopo il segnale −11,9% | | no |
| 30 | 21 | 14/20, +15,3% | 15/20, +26,5% | no (S&P 500); Nasdaq-100 fragile |
| **40** | **10** | **8/10, +22,9%** | **9/10, +32,9%** | **sì, con avvertenza (pochi casi)** |
| 50 | 3 | 2/3, +36,8% | 3/3, +47,0% | no (3 casi) |

Giorni contro episodi: sopra 50, 74 sedute su 75 positive, ma il 99% viene dal 2008 e dal 2020 (3 episodi). Il Nasdaq-100
va mostrato a parte (rendimenti più alti, cali peggiori: −62,5% contro −43,3% nel 2000); il VXN non aggiunge nulla.

## 2. Implicita, realizzata, GARCH (`volatilita/volatilita.md`)

- Il VIX sta sopra la volatilità realizzata dei 21 giorni dopo nell'82,9% delle sedute dal 2005, in media di 3,41 punti
  (ricontrollato con uno script separato il 06/11).
- L'implicita non anticipa in modo utilizzabile: il premio alto precede 5-7 picchi su 10, ma si accende 8-11 volte l'anno e
  solo il 4-6% delle volte segue un picco (S&P 500: 12 su 204); il primo giorno del segnale è sempre un ribasso.
- Il GARCH non anticipa (sale con la volatilità) e prevede il mese dopo meglio del VIX solo sull'S&P 500 e solo per il premio
  del VIX; con il premio medio tolto (calcolato sul passato) il VIX batte il GARCH su entrambi gli indici.
- Il confronto con la realizzata passata (grafico di Rea) favorisce il GARCH per costruzione.
- Verdetto: grafico VIX + realizzata a 21 sedute + premio con percentile; niente GARCH; Nasdaq-100 come riga di confronto.

## 3. Dati e inserimento (`inserimento/inserimento.md`)

- FRED `VIXCLS` = file Cboe (0 differenze su 9.309 sedute); aggiornato la mattina dopo, quindi alla corsa notturna è una
  seduta indietro; Yahoo `^VIX` ha errori (06/02/2026: 20,37 contro 17,76). Cboe da questo ambiente risponde con un blocco
  Cloudflare (06/11): fonte proposta FRED (con `cosd`) più l'ultima seduta da Yahoo, provvisoria, come per i cambi.
- Solo sedute NYSE (Cboe ha valori in 33 giorni di borsa chiusa dal 2022); VXN affidabile solo dal 2009.
- VIX alle 16:15 contro indice alle 16:00: un quarto d'ora di dato futuro se si parte dalla chiusura del giorno del segnale.
  La soglia 40 regge anche partendo dalla chiusura del giorno dopo (variante del backtest).
- Scheda nuova «8 VIX» (Alert al 9), barra delle schede da rivedere per 9 schede; `data/vix.json` circa 63 KB compressi.

## Verdetto per Igor

Procedi con modifiche: scheda VIX con fascia e percentile di oggi, tabella dei regimi per episodi (S&P 500 e Nasdaq-100,
numeri assoluti, base accanto; solo la soglia 40 marcata come robusta), grafico VIX contro realizzata con il premio; niente
GARCH; rendimenti dalla chiusura del giorno dopo il segnale. Da decidere con l'utente prima del codice.
