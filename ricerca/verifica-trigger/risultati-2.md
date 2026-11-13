# Secondo giro: metà al tocco della zona blu, metà al trigger

26 settembre 2026 · protocollo `protocollo-2.md`, congelato nel commit `2235ee8` · giro esplorativo.

## In breve

**C7 non supera i criteri per un solo motivo: migliora in 5 periodi di crisi su 7, e ne servivano 6.** Tutti gli altri criteri passano:

- il test con date casuali (p corretto per 8 regole sotto 0,001);
- il calo massimo e le false partenze, entro i limiti;
- il rimbalzo perso;
- tutte le prove di robustezza.

| | C0 trigger attuale | C7 metà in zona blu, metà al trigger | C4 due tempi (primo giro) | Tutto in zona blu (paragone) |
|---|---|---|---|---|
| Rendimento medio a 1 anno | 16,3% | 18,6% | 16,7% | 21,5% |
| Rendimento mediano | 18,5% | 19,2% | 18,0% | 18,7% |
| Caso peggiore | −18,7% | −18,7% | −20,7% | −25,2% |
| Calo massimo mediano a 63 sedute | −4,5% | −4,4% | −4,2% | −5,1% |
| False partenze | 29% | 35% | 29% | 35% |

C7 fa meglio del trigger attuale in 35 episodi su 48. Il caso peggiore resta quello del trigger: comprare tutto subito arrivava invece a −25,2%. Il prezzo da pagare sono più false partenze (35% contro 29%) e risultati peggiori nei due periodi in cui aspettare conveniva.

## Differenze per periodo rispetto al trigger attuale

Punti di rendimento a un anno.

| 2008–09 | 2011 | 2015–16 | dic. 2018 | 2020 | 2022–23 | 2025 |
|---|---|---|---|---|---|---|
| −2,6 | +3,3 | +2,1 | +4,8 | +8,2 | +1,8 | −1,4 |

## Robustezza

Il miglioramento medio resta positivo in tutte le prove:

- togliendo un periodo alla volta: da +1,3 a +3,1 punti;
- togliendo insieme 2008–09 e 2020: +2,1;
- nel 2008–2011: +0,3; nel 2015–2025: +3,1;
- con un giorno di ritardo: +2,3;
- con lo stop: +2,3;
- con un terzo in zona blu e due terzi al trigger: +1,5;
- con due terzi in zona blu e un terzo al trigger: +3,1.

## Cosa significa

Il protocollo aveva previsto questo caso: **non è un miglioramento dimostrato, ma una scelta tra rendimento e rischio.**

- **Dove guadagna:** nelle crisi rapide e in quelle moderate, dove la prima metà prende il rimbalzo che il trigger perde.
- **Dove perde:** nei ribassi lunghi, dove la prima metà compra troppo presto.
- **Rischio:** non peggiora il caso peggiore né il calo tipico dei primi tre mesi.

Con 7 crisi, migliorare in 5 capita per puro caso circa una volta su quattro (test del segno, p ≈ 0,23). Inoltre l'ipotesi è nata da questi stessi dati. Per questo la conferma deve arrivare dalle prossime zone blu, a partire da XLU dal 25/09/2026.

## Come riprodurre

`node valuta2.mjs` in questa cartella riscrive `risultati-2.json`, con le misure per episodio. `valuta.mjs` riproduce ancora esattamente il primo giro.
