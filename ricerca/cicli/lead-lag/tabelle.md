# Tabelle complete · lead-lag dei cicli dei 9 mercati

Generato da `script/tabelle.mjs` da `risultati.json` (dati fino al 20/11/2026) e `sintetico.json`. Metodo in `sintesi.md`.

## T1. Punti di svolta per mercato e soglia (dal 01/01/1999 o da un anno dopo l'inizio della serie)

| Mercato | Da | Massimi 15% | 20% | 30% | Minimi 15% | 20% | 30% |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 17/09/2015 | 22 | 17 | 8 | 6 | 5 | 4 |
| Oro | 30/08/2001 | 8 | 6 | 2 | 6 | 4 | 4 |
| Argento | 30/08/2001 | 16 | 10 | 8 | 14 | 10 | 8 |
| Rame | 30/08/2001 | 15 | 10 | 5 | 9 | 7 | 6 |
| Petrolio WTI | 23/08/2001 | 19 | 13 | 9 | 18 | 17 | 12 |
| Nasdaq-100 | 01/01/1999 | 12 | 6 | 3 | 14 | 12 | 8 |
| S&P 500 | 01/01/1999 | 8 | 4 | 3 | 13 | 10 | 7 |
| Semiconduttori | 13/07/2002 | 16 | 11 | 7 | 13 | 12 | 9 |
| KOSPI | 01/01/1999 | 16 | 12 | 7 | 13 | 11 | 8 |
| **Totale** |  | 132 | 89 | 52 | 106 | 88 | 66 |

Controlli: massimi uguali a `cyclePeaks` di `js/peaks.js` in 27 casi su 27 (mercato × soglia); date dei massimi del petrolio uguali con e senza il 20/04/2020: sì.

## T2. Concordanza e fuori campione (criteri 1 e 3)

| Tipo | Soglia | Punti | Cicli comuni (≥ 3 mercati) | Coppie di cicli | ρ medio | Nullo: mediana [5%, 95%] | p | Fuori campione: cicli dal 2013 | ρ fuori campione | p nullo | p permutazione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| massimi | 15% | 132 | 23 | 121 | 0,143 | −0,006 [−0,127, 0,144] | 0,051 | 11 | 0,299 | 0,064 | 0,078 |
| massimi | 20% | 89 | 15 | 46 | 0,222 | 0,008 [−0,227, 0,290] | 0,102 | 6 | 0,161 | 0,276 | 0,234 |
| massimi | 30% | 52 | 9 | 16 | 0,321 | 0,000 [−0,600, 0,750] | 0,289 | 4 | 0,025 | 0,498 | 0,470 |
| minimi | 15% | 106 | 19 | 74 | 0,043 | 0,028 [−0,200, 0,294] | 0,458 | 10 | 0,183 | 0,212 | 0,235 |
| minimi | 20% | 88 | 14 | 52 | 0,029 | 0,060 [−0,231, 0,400] | 0,571 | 7 | 0,098 | 0,386 | 0,395 |
| minimi | 30% | 66 | 10 | 31 | 0,184 | 0,107 [−0,255, 0,500] | 0,359 | 5 | 0,237 | 0,260 | 0,284 |

Ripetizioni del modello nullo: 5000 (concordanza e fuori campione), 10000 permutazioni.

### T2s. Sensibilità (solo descrittiva; 2000 ripetizioni)

| Variante | massimi 15%: ρ (p) · fuori campione (p) | massimi 20%: ρ (p) · fuori campione (p) | massimi 30%: ρ (p) · fuori campione (p) | minimi 15%: ρ (p) · fuori campione (p) | minimi 20%: ρ (p) · fuori campione (p) | minimi 30%: ρ (p) · fuori campione (p) |
| --- | --- | --- | --- | --- | --- | --- |
| gruppo ≤ 182 giorni | 0,185 (0,114) · 0,194 (0,190) | 0,307 (0,205) · 0,032 (0,486) | −0,033 (0,809) · −0,226 (0,846) | 0,078 (0,427) · 0,283 (0,178) | 0,002 (0,522) · 0,541 (0,088) | 0,301 (0,442) · 0,323 (0,355) |
| gruppo ≤ 548 giorni | 0,143 (0,024) · 0,299 (0,049) | 0,222 (0,059) · 0,161 (0,271) | 0,321 (0,123) · 0,025 (0,499) | 0,002 (0,563) · 0,223 (0,118) | 0,014 (0,556) · 0,098 (0,344) | 0,155 (0,308) · 0,237 (0,214) |
| senza Nasdaq-100 | 0,158 (0,054) · 0,241 (0,127) | 0,201 (0,135) · 0,091 (0,372) | 0,356 (0,269) · 0,096 (0,460) | −0,036 (0,645) · −0,080 (0,647) | −0,014 (0,662) · −0,232 (0,840) | 0,104 (0,524) · −0,042 (0,649) |
| cicli con ≥ 4 mercati | 0,166 (0,042) · 0,346 (0,050) | 0,234 (0,141) · 0,161 (0,330) | 0,285 (0,477) · −0,029 (0,756) | 0,041 (0,461) · −0,015 (0,567) | −0,017 (0,632) · −0,106 (0,697) | 0,074 (0,556) · −0,164 (0,746) |
| nullo con spostamento ≥ 730 giorni | 0,143 (0,050) · 0,299 (0,060) | 0,222 (0,119) · 0,161 (0,264) | 0,321 (0,273) · 0,025 (0,520) | 0,043 (0,458) · 0,183 (0,202) | 0,029 (0,569) · 0,098 (0,388) | 0,184 (0,354) · 0,237 (0,253) |

## T3. Rango medio nei cicli comuni (0 = primo, 1 = ultimo), tutti i cicli

**Soglia 15%**

| Mercato | Massimi: rango medio (cicli) | stima fino al 2012 | dal 2013 | Minimi: rango medio (cicli) | stima fino al 2012 | dal 2013 |
| --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 0,29 (13) | — | 0,29 (13) | 0,40 (4) | — | 0,40 (4) |
| Oro | 0,65 (7) | 0,69 (3) | 0,63 (4) | 0,17 (4) | 0,20 (1) | 0,16 (3) |
| Argento | 0,63 (14) | 0,57 (6) | 0,68 (8) | 0,40 (11) | 0,75 (4) | 0,20 (7) |
| Rame | 0,44 (14) | 0,43 (7) | 0,44 (7) | 0,64 (9) | 0,56 (4) | 0,71 (5) |
| Petrolio WTI | 0,73 (13) | 0,67 (7) | 0,81 (6) | 0,72 (13) | 0,78 (5) | 0,69 (8) |
| Nasdaq-100 | 0,60 (12) | 0,61 (6) | 0,59 (6) | 0,39 (12) | 0,36 (8) | 0,44 (4) |
| S&P 500 | 0,54 (8) | 0,45 (4) | 0,64 (4) | 0,53 (13) | 0,44 (8) | 0,68 (5) |
| Semiconduttori | 0,31 (15) | 0,13 (5) | 0,40 (10) | 0,53 (12) | 0,45 (7) | 0,65 (5) |
| KOSPI | 0,43 (14) | 0,45 (7) | 0,40 (7) | 0,42 (10) | 0,42 (5) | 0,42 (5) |

**Soglia 20%**

| Mercato | Massimi: rango medio (cicli) | stima fino al 2012 | dal 2013 | Minimi: rango medio (cicli) | stima fino al 2012 | dal 2013 |
| --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 0,18 (8) | — | 0,18 (8) | 0,52 (3) | — | 0,52 (3) |
| Oro | 0,51 (6) | 0,57 (3) | 0,46 (3) | 0,35 (4) | 0,50 (1) | 0,30 (3) |
| Argento | 0,28 (8) | 0,24 (5) | 0,34 (3) | 0,34 (9) | 0,68 (4) | 0,06 (5) |
| Rame | 0,44 (10) | 0,40 (5) | 0,49 (5) | 0,69 (7) | 0,57 (4) | 0,85 (3) |
| Petrolio WTI | 0,75 (9) | 0,83 (5) | 0,64 (4) | 0,75 (10) | 0,75 (4) | 0,76 (6) |
| Nasdaq-100 | 0,75 (6) | 0,94 (2) | 0,65 (4) | 0,41 (10) | 0,37 (6) | 0,46 (4) |
| S&P 500 | 0,70 (4) | 0,50 (2) | 0,90 (2) | 0,55 (10) | 0,49 (6) | 0,64 (4) |
| Semiconduttori | 0,47 (10) | 0,24 (5) | 0,71 (5) | 0,48 (11) | 0,46 (6) | 0,52 (5) |
| KOSPI | 0,57 (9) | 0,59 (4) | 0,55 (5) | 0,32 (7) | 0,27 (4) | 0,38 (3) |

**Soglia 30%**

| Mercato | Massimi: rango medio (cicli) | stima fino al 2012 | dal 2013 | Minimi: rango medio (cicli) | stima fino al 2012 | dal 2013 |
| --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 0,10 (5) | — | 0,10 (5) | 0,54 (2) | — | 0,54 (2) |
| Oro | 0,70 (2) | 1,00 (1) | 0,40 (1) | 0,27 (4) | 0,29 (1) | 0,26 (3) |
| Argento | 0,29 (6) | 0,43 (3) | 0,15 (3) | 0,35 (7) | 0,71 (3) | 0,07 (4) |
| Rame | 0,55 (5) | 0,44 (3) | 0,71 (2) | 0,52 (6) | 0,72 (3) | 0,32 (3) |
| Petrolio WTI | 0,87 (6) | 0,88 (3) | 0,87 (3) | 0,85 (9) | 0,77 (4) | 0,92 (5) |
| Nasdaq-100 | 0,56 (3) | 0,71 (2) | 0,25 (1) | 0,45 (7) | 0,25 (4) | 0,71 (3) |
| S&P 500 | 0,51 (3) | 0,33 (2) | 0,88 (1) | 0,63 (7) | 0,60 (3) | 0,65 (4) |
| Semiconduttori | 0,51 (5) | 0,13 (2) | 0,76 (3) | 0,45 (8) | 0,39 (4) | 0,52 (4) |
| KOSPI | 0,53 (6) | 0,21 (2) | 0,68 (4) | 0,29 (7) | 0,25 (4) | 0,33 (3) |

## T4. Cicli comuni (≥ 3 mercati): ordine dei mercati

Data del ciclo = data mediana dei punti. Tra parentesi i giorni dal primo mercato del ciclo. I gruppi con 1 o 2 mercati non sono elencati (conteggio sotto ogni tabella).

### Massimi, soglia 15% (23 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 24/03/2000 | 3 | KOSPI 04/01/2000 (0) → S&P 500 24/03/2000 (+80) → Nasdaq-100 27/03/2000 (+83) |
| 04/06/2002 | 4 | KOSPI 18/04/2002 (0) → Argento 04/06/2002 (+47) → Rame 04/06/2002 (+47) → Petrolio WTI 01/10/2002 (+166) |
| 19/03/2004 | 6 | Semiconduttori 20/01/2004 (0) → Nasdaq-100 26/01/2004 (+6) → Rame 01/03/2004 (+41) → Argento 06/04/2004 (+77) → KOSPI 23/04/2004 (+94) → Petrolio WTI 01/06/2004 (+133) |
| 11/01/2006 | 3 | Petrolio WTI 30/08/2005 (0) → Nasdaq-100 11/01/2006 (+134) → Argento 19/04/2006 (+232) |
| 11/05/2006 | 6 | Semiconduttori 05/05/2006 (0) → Oro 11/05/2006 (+6) → Argento 11/05/2006 (+6) → KOSPI 11/05/2006 (+6) → Rame 23/05/2006 (+18) → Petrolio WTI 14/07/2006 (+70) |
| 20/07/2007 | 3 | Semiconduttori 17/07/2007 (0) → Rame 20/07/2007 (+3) → KOSPI 25/07/2007 (+8) |
| 05/03/2008 | 7 | S&P 500 09/10/2007 (0) → Nasdaq-100 31/10/2007 (+22) → KOSPI 31/10/2007 (+22) → Argento 05/03/2008 (+148) → Oro 18/03/2008 (+161) → Rame 02/07/2008 (+267) → Petrolio WTI 03/07/2008 (+268) |
| 15/04/2010 | 5 | Rame 05/04/2010 (0) → Petrolio WTI 06/04/2010 (+1) → Semiconduttori 15/04/2010 (+10) → Nasdaq-100 23/04/2010 (+18) → S&P 500 23/04/2010 (+18) |
| 29/04/2011 | 8 | Rame 14/02/2011 (0) → Semiconduttori 17/02/2011 (+3) → Argento 29/04/2011 (+74) → Petrolio WTI 29/04/2011 (+74) → S&P 500 29/04/2011 (+74) → KOSPI 02/05/2011 (+77) → Nasdaq-100 22/07/2011 (+158) → Oro 22/08/2011 (+189) |
| 18/08/2015 | 4 | KOSPI 23/04/2015 (0) → Semiconduttori 01/06/2015 (+39) → Nasdaq-100 03/11/2015 (+194) → Bitcoin 15/12/2015 (+236) |
| 06/07/2016 | 3 | Bitcoin 16/06/2016 (0) → Oro 06/07/2016 (+20) → Argento 02/08/2016 (+47) |
| 08/06/2018 | 7 | Bitcoin 16/12/2017 (0) → KOSPI 29/01/2018 (+44) → Semiconduttori 12/03/2018 (+86) → Rame 08/06/2018 (+174) → Nasdaq-100 29/08/2018 (+256) → S&P 500 20/09/2018 (+278) → Petrolio WTI 03/10/2018 (+291) |
| 26/06/2019 | 3 | Semiconduttori 24/04/2019 (0) → Bitcoin 26/06/2019 (+63) → Argento 04/09/2019 (+133) |
| 19/02/2020 | 7 | KOSPI 22/01/2020 (0) → Nasdaq-100 19/02/2020 (+28) → S&P 500 19/02/2020 (+28) → Semiconduttori 19/02/2020 (+28) → Oro 06/08/2020 (+197) → Argento 10/08/2020 (+201) → Bitcoin 17/08/2020 (+208) |
| 08/06/2021 | 4 | Bitcoin 13/04/2021 (0) → Rame 11/05/2021 (+28) → KOSPI 06/07/2021 (+84) → Petrolio WTI 13/07/2021 (+91) |
| 19/11/2021 | 5 | Petrolio WTI 26/10/2021 (0) → Bitcoin 08/11/2021 (+13) → Nasdaq-100 19/11/2021 (+24) → Semiconduttori 27/12/2021 (+62) → S&P 500 03/01/2022 (+69) |
| 06/03/2022 | 4 | Bitcoin 13/03/2021 (0) → Rame 04/03/2022 (+356) → Oro 08/03/2022 (+360) → Petrolio WTI 08/03/2022 (+360) |
| 23/07/2023 | 4 | Argento 04/05/2023 (0) → Bitcoin 13/07/2023 (+70) → Semiconduttori 01/08/2023 (+89) → Petrolio WTI 27/09/2023 (+146) |
| 13/03/2024 | 3 | Semiconduttori 07/03/2024 (0) → Bitcoin 13/03/2024 (+6) → Argento 22/10/2024 (+229) |
| 21/05/2024 | 5 | Bitcoin 08/01/2024 (0) → Argento 20/05/2024 (+133) → Rame 21/05/2024 (+134) → Semiconduttori 10/07/2024 (+184) → KOSPI 11/07/2024 (+185) |
| 19/02/2025 | 5 | Bitcoin 21/01/2025 (0) → Nasdaq-100 19/02/2025 (+29) → S&P 500 19/02/2025 (+29) → Rame 26/03/2025 (+64) → Argento 27/03/2025 (+65) |
| 29/01/2026 | 7 | Rame 23/07/2025 (0) → Bitcoin 06/10/2025 (+75) → Argento 26/01/2026 (+187) → Oro 29/01/2026 (+190) → Semiconduttori 25/02/2026 (+217) → KOSPI 26/02/2026 (+218) → Petrolio WTI 07/04/2026 (+258) |
| 01/08/2026 | 4 | Semiconduttori 22/06/2026 (0) → KOSPI 22/06/2026 (0) → Rame 09/09/2026 (+79) → Nasdaq-100 06/10/2026 (+106) |

Gruppi con meno di 3 mercati: 17.

### Massimi, soglia 20% (15 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 24/03/2000 | 3 | KOSPI 04/01/2000 (0) → S&P 500 24/03/2000 (+80) → Nasdaq-100 27/03/2000 (+83) |
| 15/04/2004 | 4 | Semiconduttori 20/01/2004 (0) → Argento 06/04/2004 (+77) → KOSPI 23/04/2004 (+94) → Petrolio WTI 22/10/2004 (+276) |
| 11/05/2006 | 5 | Semiconduttori 05/05/2006 (0) → Oro 11/05/2006 (+6) → Argento 11/05/2006 (+6) → Rame 23/05/2006 (+18) → Petrolio WTI 14/07/2006 (+70) |
| 09/10/2007 | 5 | Semiconduttori 17/07/2007 (0) → Rame 20/07/2007 (+3) → S&P 500 09/10/2007 (+84) → Nasdaq-100 31/10/2007 (+106) → KOSPI 31/10/2007 (+106) |
| 10/05/2008 | 4 | Argento 05/03/2008 (0) → Oro 18/03/2008 (+13) → Rame 02/07/2008 (+119) → Petrolio WTI 03/07/2008 (+120) |
| 06/04/2010 | 4 | Argento 02/12/2009 (0) → Rame 05/04/2010 (+124) → Petrolio WTI 06/04/2010 (+125) → Semiconduttori 15/04/2010 (+134) |
| 29/04/2011 | 6 | Rame 14/02/2011 (0) → Semiconduttori 17/02/2011 (+3) → Argento 29/04/2011 (+74) → Petrolio WTI 29/04/2011 (+74) → KOSPI 02/05/2011 (+77) → Oro 22/08/2011 (+189) |
| 25/04/2018 | 6 | Bitcoin 16/12/2017 (0) → KOSPI 29/01/2018 (+44) → Semiconduttori 12/03/2018 (+86) → Rame 08/06/2018 (+174) → Nasdaq-100 29/08/2018 (+256) → Petrolio WTI 03/10/2018 (+291) |
| 05/02/2020 | 6 | Bitcoin 26/06/2019 (0) → Argento 04/09/2019 (+70) → KOSPI 22/01/2020 (+210) → Nasdaq-100 19/02/2020 (+238) → S&P 500 19/02/2020 (+238) → Semiconduttori 19/02/2020 (+238) |
| 10/08/2020 | 3 | Oro 06/08/2020 (0) → Argento 10/08/2020 (+4) → Bitcoin 08/01/2021 (+155) |
| 19/11/2021 | 5 | Petrolio WTI 26/10/2021 (0) → Bitcoin 08/11/2021 (+13) → Nasdaq-100 19/11/2021 (+24) → Semiconduttori 27/12/2021 (+62) → S&P 500 03/01/2022 (+69) |
| 04/03/2022 | 5 | Bitcoin 13/04/2021 (0) → KOSPI 06/07/2021 (+84) → Rame 04/03/2022 (+325) → Oro 08/03/2022 (+329) → Petrolio WTI 08/03/2022 (+329) |
| 15/06/2024 | 4 | Bitcoin 13/03/2024 (0) → Rame 21/05/2024 (+69) → Semiconduttori 10/07/2024 (+119) → KOSPI 11/07/2024 (+120) |
| 19/02/2025 | 3 | Bitcoin 21/01/2025 (0) → Nasdaq-100 19/02/2025 (+29) → Rame 26/03/2025 (+64) |
| 29/01/2026 | 7 | Rame 23/07/2025 (0) → Bitcoin 06/10/2025 (+75) → Argento 26/01/2026 (+187) → Oro 29/01/2026 (+190) → Petrolio WTI 07/04/2026 (+258) → Semiconduttori 22/06/2026 (+334) → KOSPI 22/06/2026 (+334) |

Gruppi con meno di 3 mercati: 13.

### Massimi, soglia 30% (9 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 24/03/2000 | 3 | KOSPI 04/01/2000 (0) → S&P 500 24/03/2000 (+80) → Nasdaq-100 27/03/2000 (+83) |
| 23/05/2006 | 3 | Argento 11/05/2006 (0) → Rame 23/05/2006 (+12) → Petrolio WTI 14/07/2006 (+64) |
| 31/10/2007 | 7 | Semiconduttori 17/07/2007 (0) → S&P 500 09/10/2007 (+84) → Nasdaq-100 31/10/2007 (+106) → KOSPI 31/10/2007 (+106) → Argento 05/03/2008 (+232) → Rame 02/07/2008 (+351) → Petrolio WTI 03/07/2008 (+352) |
| 29/04/2011 | 5 | Rame 14/02/2011 (0) → Semiconduttori 17/02/2011 (+3) → Argento 29/04/2011 (+74) → Petrolio WTI 29/04/2011 (+74) → Oro 22/08/2011 (+189) |
| 04/04/2018 | 4 | Bitcoin 16/12/2017 (0) → KOSPI 29/01/2018 (+44) → Rame 08/06/2018 (+174) → Petrolio WTI 03/10/2018 (+291) |
| 22/01/2020 | 5 | Bitcoin 26/06/2019 (0) → Argento 04/09/2019 (+70) → KOSPI 22/01/2020 (+210) → S&P 500 19/02/2020 (+238) → Semiconduttori 19/02/2020 (+238) |
| 13/04/2021 | 3 | Argento 01/02/2021 (0) → Bitcoin 13/04/2021 (+71) → KOSPI 06/07/2021 (+155) |
| 27/12/2021 | 5 | Bitcoin 08/11/2021 (0) → Nasdaq-100 19/11/2021 (+11) → Semiconduttori 27/12/2021 (+49) → Rame 04/03/2022 (+116) → Petrolio WTI 08/03/2022 (+120) |
| 04/03/2026 | 6 | Bitcoin 06/10/2025 (0) → Argento 26/01/2026 (+112) → Oro 29/01/2026 (+115) → Petrolio WTI 07/04/2026 (+183) → Semiconduttori 22/06/2026 (+259) → KOSPI 22/06/2026 (+259) |

Gruppi con meno di 3 mercati: 7.

### Minimi, soglia 15% (19 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 04/04/2001 | 3 | Nasdaq-100 04/04/2001 (0) → S&P 500 04/04/2001 (0) → KOSPI 10/04/2001 (+6) |
| 15/10/2001 | 6 | KOSPI 17/09/2001 (0) → Nasdaq-100 21/09/2001 (+4) → S&P 500 21/09/2001 (+4) → Rame 07/11/2001 (+51) → Petrolio WTI 15/11/2001 (+59) → Argento 26/11/2001 (+70) |
| 05/08/2002 | 3 | S&P 500 23/07/2002 (0) → Nasdaq-100 05/08/2002 (+13) → Semiconduttori 05/08/2002 (+13) |
| 09/10/2002 | 4 | Nasdaq-100 07/10/2002 (0) → S&P 500 09/10/2002 (+2) → Semiconduttori 09/10/2002 (+2) → KOSPI 17/03/2003 (+161) |
| 21/07/2006 | 3 | Nasdaq-100 21/07/2006 (0) → Semiconduttori 21/07/2006 (0) → Petrolio WTI 18/01/2007 (+181) |
| 27/10/2008 | 6 | Rame 24/10/2008 (0) → KOSPI 24/10/2008 (0) → Nasdaq-100 27/10/2008 (+3) → S&P 500 27/10/2008 (+3) → Semiconduttori 27/10/2008 (+3) → Argento 28/10/2008 (+4) |
| 20/11/2008 | 6 | Argento 16/09/2008 (0) → Oro 13/11/2008 (+58) → Nasdaq-100 20/11/2008 (+65) → S&P 500 20/11/2008 (+65) → Semiconduttori 20/11/2008 (+65) → Petrolio WTI 05/12/2008 (+80) |
| 19/12/2008 | 5 | Nasdaq-100 10/03/2008 (0) → Semiconduttori 10/03/2008 (0) → Petrolio WTI 19/12/2008 (+284) → Rame 24/12/2008 (+289) → S&P 500 09/03/2009 (+364) |
| 04/10/2011 | 6 | KOSPI 26/09/2011 (0) → S&P 500 03/10/2011 (+7) → Semiconduttori 03/10/2011 (+7) → Petrolio WTI 04/10/2011 (+8) → Rame 20/10/2011 (+24) → Argento 28/06/2012 (+276) |
| 17/01/2015 | 4 | Argento 06/11/2014 (0) → KOSPI 06/01/2015 (+61) → Petrolio WTI 28/01/2015 (+83) → Rame 29/01/2015 (+84) |
| 24/08/2015 | 3 | Petrolio WTI 24/08/2015 (0) → KOSPI 24/08/2015 (0) → Argento 26/08/2015 (+2) |
| 01/01/2016 | 4 | Argento 14/12/2015 (0) → Oro 17/12/2015 (+3) → Rame 15/01/2016 (+32) → Petrolio WTI 20/01/2016 (+37) |
| 11/02/2016 | 4 | Nasdaq-100 09/02/2016 (0) → Petrolio WTI 11/02/2016 (+2) → S&P 500 11/02/2016 (+2) → Semiconduttori 11/02/2016 (+2) |
| 20/12/2018 | 8 | Rame 15/08/2018 (0) → Oro 16/08/2018 (+1) → Argento 13/11/2018 (+90) → Bitcoin 15/12/2018 (+122) → Petrolio WTI 24/12/2018 (+131) → Nasdaq-100 24/12/2018 (+131) → S&P 500 24/12/2018 (+131) → Semiconduttori 24/12/2018 (+131) |
| 19/03/2020 | 5 | Argento 18/03/2020 (0) → Petrolio WTI 18/03/2020 (0) → KOSPI 19/03/2020 (+1) → Rame 23/03/2020 (+5) → S&P 500 23/03/2020 (+5) |
| 17/06/2022 | 6 | Argento 29/09/2021 (0) → Nasdaq-100 16/06/2022 (+260) → S&P 500 16/06/2022 (+260) → Bitcoin 18/06/2022 (+262) → Semiconduttori 01/07/2022 (+275) → Rame 14/07/2022 (+288) |
| 30/09/2022 | 5 | Argento 01/09/2022 (0) → Bitcoin 06/09/2022 (+5) → KOSPI 30/09/2022 (+29) → S&P 500 12/10/2022 (+41) → Semiconduttori 14/10/2022 (+43) |
| 10/12/2022 | 4 | Oro 03/11/2022 (0) → Bitcoin 21/11/2022 (+18) → Nasdaq-100 28/12/2022 (+55) → Petrolio WTI 17/03/2023 (+134) |
| 09/04/2025 | 3 | Semiconduttori 08/04/2025 (0) → KOSPI 09/04/2025 (+1) → Petrolio WTI 05/05/2025 (+27) |

Gruppi con meno di 3 mercati: 12.

### Minimi, soglia 20% (14 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 15/10/2001 | 6 | KOSPI 17/09/2001 (0) → Nasdaq-100 21/09/2001 (+4) → S&P 500 21/09/2001 (+4) → Rame 07/11/2001 (+51) → Petrolio WTI 15/11/2001 (+59) → Argento 26/11/2001 (+70) |
| 05/08/2002 | 3 | S&P 500 23/07/2002 (0) → Nasdaq-100 05/08/2002 (+13) → Semiconduttori 05/08/2002 (+13) |
| 09/10/2002 | 4 | Nasdaq-100 07/10/2002 (0) → S&P 500 09/10/2002 (+2) → Semiconduttori 09/10/2002 (+2) → KOSPI 17/03/2003 (+161) |
| 21/07/2006 | 3 | Nasdaq-100 21/07/2006 (0) → Semiconduttori 21/07/2006 (0) → Petrolio WTI 18/01/2007 (+181) |
| 02/11/2008 | 6 | Nasdaq-100 10/03/2008 (0) → Semiconduttori 10/03/2008 (0) → Argento 16/09/2008 (+190) → Petrolio WTI 19/12/2008 (+284) → Rame 24/12/2008 (+289) → S&P 500 09/03/2009 (+364) |
| 13/11/2008 | 7 | Rame 24/10/2008 (0) → KOSPI 24/10/2008 (0) → Argento 28/10/2008 (+4) → Oro 13/11/2008 (+20) → Nasdaq-100 20/11/2008 (+27) → S&P 500 20/11/2008 (+27) → Semiconduttori 20/11/2008 (+27) |
| 04/10/2011 | 6 | KOSPI 26/09/2011 (0) → S&P 500 03/10/2011 (+7) → Semiconduttori 03/10/2011 (+7) → Petrolio WTI 04/10/2011 (+8) → Rame 20/10/2011 (+24) → Argento 28/06/2012 (+276) |
| 01/01/2016 | 4 | Argento 14/12/2015 (0) → Oro 17/12/2015 (+3) → Rame 15/01/2016 (+32) → Petrolio WTI 20/01/2016 (+37) |
| 11/02/2016 | 4 | Nasdaq-100 09/02/2016 (0) → Petrolio WTI 11/02/2016 (+2) → S&P 500 11/02/2016 (+2) → Semiconduttori 11/02/2016 (+2) |
| 24/12/2018 | 7 | Oro 16/08/2018 (0) → Argento 13/11/2018 (+89) → Bitcoin 15/12/2018 (+121) → Petrolio WTI 24/12/2018 (+130) → Nasdaq-100 24/12/2018 (+130) → S&P 500 24/12/2018 (+130) → Semiconduttori 24/12/2018 (+130) |
| 19/03/2020 | 5 | Argento 18/03/2020 (0) → Petrolio WTI 18/03/2020 (0) → KOSPI 19/03/2020 (+1) → Rame 23/03/2020 (+5) → S&P 500 23/03/2020 (+5) |
| 18/06/2022 | 5 | Argento 29/09/2021 (0) → Nasdaq-100 16/06/2022 (+260) → Bitcoin 18/06/2022 (+262) → Semiconduttori 01/07/2022 (+275) → Rame 14/07/2022 (+288) |
| 24/10/2022 | 8 | Argento 01/09/2022 (0) → KOSPI 30/09/2022 (+29) → S&P 500 12/10/2022 (+41) → Semiconduttori 14/10/2022 (+43) → Oro 03/11/2022 (+63) → Bitcoin 21/11/2022 (+81) → Nasdaq-100 28/12/2022 (+118) → Petrolio WTI 17/03/2023 (+197) |
| 09/04/2025 | 3 | Semiconduttori 08/04/2025 (0) → KOSPI 09/04/2025 (+1) → Petrolio WTI 05/05/2025 (+27) |

Gruppi con meno di 3 mercati: 13.

### Minimi, soglia 30% (10 cicli comuni)

| Ciclo | Mercati | Ordine (giorni dal primo) |
| --- | --- | --- |
| 07/11/2001 | 5 | KOSPI 17/09/2001 (0) → Nasdaq-100 21/09/2001 (+4) → Rame 07/11/2001 (+51) → Petrolio WTI 15/11/2001 (+59) → Argento 26/11/2001 (+70) |
| 09/10/2002 | 4 | Nasdaq-100 07/10/2002 (0) → S&P 500 09/10/2002 (+2) → Semiconduttori 09/10/2002 (+2) → KOSPI 17/03/2003 (+161) |
| 21/07/2006 | 3 | Nasdaq-100 21/07/2006 (0) → Semiconduttori 21/07/2006 (0) → Petrolio WTI 18/01/2007 (+181) |
| 20/11/2008 | 8 | KOSPI 24/10/2008 (0) → Argento 28/10/2008 (+4) → Oro 13/11/2008 (+20) → Nasdaq-100 20/11/2008 (+27) → Semiconduttori 20/11/2008 (+27) → Petrolio WTI 19/12/2008 (+56) → Rame 24/12/2008 (+61) → S&P 500 09/03/2009 (+136) |
| 04/10/2011 | 6 | KOSPI 26/09/2011 (0) → S&P 500 03/10/2011 (+7) → Semiconduttori 03/10/2011 (+7) → Petrolio WTI 04/10/2011 (+8) → Rame 20/10/2011 (+24) → Argento 28/06/2012 (+276) |
| 09/02/2016 | 7 | Argento 14/12/2015 (0) → Oro 17/12/2015 (+3) → Rame 15/01/2016 (+32) → Nasdaq-100 09/02/2016 (+57) → Petrolio WTI 11/02/2016 (+59) → S&P 500 11/02/2016 (+59) → Semiconduttori 11/02/2016 (+59) |
| 24/12/2018 | 7 | Oro 16/08/2018 (0) → Argento 13/11/2018 (+89) → Bitcoin 15/12/2018 (+121) → Petrolio WTI 24/12/2018 (+130) → Nasdaq-100 24/12/2018 (+130) → S&P 500 24/12/2018 (+130) → Semiconduttori 24/12/2018 (+130) |
| 23/03/2020 | 5 | Argento 18/03/2020 (0) → KOSPI 19/03/2020 (+1) → Rame 23/03/2020 (+5) → S&P 500 23/03/2020 (+5) → Petrolio WTI 30/03/2020 (+12) |
| 14/10/2022 | 9 | Rame 14/07/2022 (0) → Argento 01/09/2022 (+49) → KOSPI 30/09/2022 (+78) → S&P 500 12/10/2022 (+90) → Semiconduttori 14/10/2022 (+92) → Oro 03/11/2022 (+112) → Bitcoin 21/11/2022 (+130) → Nasdaq-100 28/12/2022 (+167) → Petrolio WTI 17/03/2023 (+246) |
| 09/04/2025 | 3 | Semiconduttori 08/04/2025 (0) → KOSPI 09/04/2025 (+1) → Petrolio WTI 05/05/2025 (+27) |

Gruppi con meno di 3 mercati: 7.

## T5. Coppie guida → seguace (criterio 2)

Test: 432 (72 coppie ordinate × 2 tipi × 3 soglie), 425 con almeno un caso. Nullo principale con spostamento ≥ 730 giorni (10000 ripetizioni); `p0`/`q0`: nullo con spostamento libero. q = p corretto con Benjamini-Hochberg su tutti i test.

**Passano il criterio 2**: peak15 COPPER→WTI, peak20 COPPER→WTI.

### T5a. Le 30 coppie con il p del nullo più basso

| Tipo | Soglia | A → B | Casi | Dopo | Stesso giorno | Quota dopo | Scarto mediano (g) | p binomiale | p nullo | q | p0 | q0 | 2000-2012 | 2013-2025 | Criterio 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| massimi | 15% | Rame → Petrolio WTI | 12 | 11 | 0 | 92% | +68,5 | 0,003 | < 0,001 | 0,021 | 0,001 | 0,319 | 7/7 | 4/5 | **sì** |
| massimi | 20% | Rame → Petrolio WTI | 9 | 8 | 0 | 89% | +52 | 0,020 | < 0,001 | 0,021 | 0,001 | 0,319 | 5/5 | 3/4 | **sì** |
| massimi | 15% | Bitcoin → Rame | 16 | 15 | 0 | 94% | +128,5 | < 0,001 | 0,006 | 0,836 | 0,010 | 1,000 | 0/0 | 15/16 | no |
| massimi | 20% | Bitcoin → Rame | 10 | 9 | 0 | 90% | +193 | 0,011 | 0,009 | 0,977 | 0,018 | 1,000 | 0/0 | 9/10 | no |
| massimi | 20% | Bitcoin → Semiconduttori | 14 | 11 | 0 | 79% | +158 | 0,029 | 0,021 | 1,000 | 0,026 | 1,000 | 0/0 | 11/14 | no |
| massimi | 15% | Semiconduttori → Oro | 6 | 5 | 0 | 83% | +120 | 0,109 | 0,024 | 1,000 | 0,034 | 1,000 | 3/4 | 2/2 | no |
| massimi | 15% | KOSPI → Oro | 6 | 5 | 1 | 83% | +168 | 0,109 | 0,025 | 1,000 | 0,055 | 1,000 | 3/4 | 2/2 | no |
| massimi | 15% | Semiconduttori → S&P 500 | 9 | 7 | 1 | 78% | +71 | 0,090 | 0,026 | 1,000 | 0,031 | 1,000 | 3/3 | 4/6 | no |
| massimi | 15% | Bitcoin → KOSPI | 20 | 16 | 0 | 80% | +127,5 | 0,006 | 0,027 | 1,000 | 0,027 | 1,000 | 0/0 | 16/20 | no |
| massimi | 15% | Nasdaq-100 → Oro | 8 | 7 | 0 | 88% | +129,5 | 0,035 | 0,031 | 1,000 | 0,031 | 1,000 | 3/4 | 4/4 | no |
| massimi | 20% | Bitcoin → KOSPI | 14 | 12 | 0 | 86% | +142,5 | 0,006 | 0,031 | 1,000 | 0,031 | 1,000 | 0/0 | 12/14 | no |
| minimi | 15% | Argento → Bitcoin | 3 | 3 | 0 | 100% | +32 | 0,125 | 0,036 | 1,000 | 0,036 | 1,000 | 0/0 | 3/3 | no |
| massimi | 15% | Bitcoin → Nasdaq-100 | 16 | 12 | 0 | 75% | +244,5 | 0,038 | 0,036 | 1,000 | 0,046 | 1,000 | 0/0 | 12/16 | no |
| massimi | 15% | S&P 500 → Oro | 5 | 5 | 0 | 100% | +161 | 0,031 | 0,037 | 1,000 | 0,059 | 1,000 | 2/2 | 3/3 | no |
| massimi | 15% | Argento → Petrolio WTI | 12 | 9 | 1 | 75% | +82 | 0,073 | 0,044 | 1,000 | 0,049 | 1,000 | 5/6 | 4/6 | no |
| minimi | 20% | KOSPI → S&P 500 | 9 | 8 | 0 | 89% | +12 | 0,020 | 0,045 | 1,000 | 0,050 | 1,000 | 5/6 | 3/3 | no |
| massimi | 20% | Semiconduttori → Oro | 5 | 5 | 0 | 100% | +169 | 0,031 | 0,053 | 1,000 | 0,059 | 1,000 | 3/3 | 2/2 | no |
| minimi | 15% | Argento → Semiconduttori | 9 | 7 | 0 | 78% | +43 | 0,090 | 0,056 | 1,000 | 0,058 | 1,000 | 1/3 | 6/6 | no |
| massimi | 15% | Semiconduttori → KOSPI | 13 | 9 | 0 | 69% | +8 | 0,133 | 0,058 | 1,000 | 0,087 | 1,000 | 4/4 | 5/9 | no |
| minimi | 20% | Argento → Semiconduttori | 7 | 6 | 0 | 86% | +43 | 0,063 | 0,068 | 1,000 | 0,056 | 1,000 | 2/3 | 4/4 | no |
| massimi | 15% | KOSPI → Petrolio WTI | 8 | 6 | 0 | 75% | +51,5 | 0,145 | 0,070 | 1,000 | 0,072 | 1,000 | 4/5 | 2/3 | no |
| massimi | 20% | Bitcoin → Nasdaq-100 | 11 | 10 | 0 | 91% | +256 | 0,006 | 0,073 | 1,000 | 0,065 | 1,000 | 0/0 | 10/11 | no |
| minimi | 30% | Argento → Petrolio WTI | 6 | 5 | 0 | 83% | +46,5 | 0,109 | 0,077 | 1,000 | 0,077 | 1,000 | 1/2 | 4/4 | no |
| massimi | 20% | KOSPI → Oro | 4 | 4 | 0 | 100% | +168 | 0,063 | 0,078 | 1,000 | 0,077 | 1,000 | 2/2 | 2/2 | no |
| minimi | 30% | KOSPI → Petrolio WTI | 6 | 5 | 0 | 83% | +18,5 | 0,109 | 0,078 | 1,000 | 0,102 | 1,000 | 2/2 | 3/4 | no |
| minimi | 15% | Oro → Nasdaq-100 | 4 | 4 | 0 | 100% | +54,5 | 0,063 | 0,084 | 1,000 | 0,124 | 1,000 | 1/1 | 3/3 | no |
| massimi | 15% | Bitcoin → S&P 500 | 13 | 10 | 0 | 77% | +265 | 0,046 | 0,087 | 1,000 | 0,096 | 1,000 | 0/0 | 10/13 | no |
| massimi | 30% | Rame → Petrolio WTI | 5 | 5 | 0 | 100% | +52 | 0,031 | 0,092 | 1,000 | 0,121 | 1,000 | 3/3 | 2/2 | no |
| massimi | 15% | KOSPI → Nasdaq-100 | 11 | 8 | 1 | 73% | +83 | 0,113 | 0,098 | 1,000 | 0,115 | 1,000 | 3/6 | 5/5 | no |
| minimi | 30% | Argento → Semiconduttori | 5 | 4 | 0 | 80% | +41 | 0,188 | 0,102 | 1,000 | 0,129 | 1,000 | 1/2 | 3/3 | no |

### T5b. Quota «dopo» ≥ 75% con almeno 8 casi (prima della correzione)

23 combinazioni su 432.

| Tipo | Soglia | A → B | Casi | Quota | Scarto mediano | q | Metà | Perché non passa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| massimi | 15% | Rame → Petrolio WTI | 12 | 92% | +68,5 | 0,021 | 7/7 · 4/5 | — |
| massimi | 20% | Rame → Petrolio WTI | 9 | 89% | +52 | 0,021 | 5/5 · 3/4 | — |
| massimi | 15% | Bitcoin → Rame | 16 | 94% | +128,5 | 0,836 | 0/0 · 15/16 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 20% | Bitcoin → Rame | 10 | 90% | +193 | 0,977 | 0/0 · 9/10 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 15% | Bitcoin → Nasdaq-100 | 16 | 75% | +244,5 | 1,000 | 0/0 · 12/16 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 15% | Bitcoin → S&P 500 | 13 | 77% | +265 | 1,000 | 0/0 · 10/13 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 15% | Bitcoin → KOSPI | 20 | 80% | +127,5 | 1,000 | 0/0 · 16/20 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 15% | Argento → Petrolio WTI | 12 | 75% | +82 | 1,000 | 5/6 · 4/6 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| massimi | 15% | Nasdaq-100 → Oro | 8 | 88% | +129,5 | 1,000 | 3/4 · 4/4 | q ≥ 0,05 |
| massimi | 15% | Semiconduttori → S&P 500 | 9 | 78% | +71 | 1,000 | 3/3 · 4/6 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| massimi | 15% | KOSPI → Petrolio WTI | 8 | 75% | +51,5 | 1,000 | 4/5 · 2/3 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| massimi | 15% | KOSPI → S&P 500 | 8 | 75% | +78 | 1,000 | 2/4 · 4/4 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| massimi | 20% | Bitcoin → Nasdaq-100 | 11 | 91% | +256 | 1,000 | 0/0 · 10/11 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 20% | Bitcoin → Semiconduttori | 14 | 79% | +158 | 1,000 | 0/0 · 11/14 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 20% | Bitcoin → KOSPI | 14 | 86% | +142,5 | 1,000 | 0/0 · 12/14 | q ≥ 0,05; bitcoin: solo dal 2015 |
| massimi | 20% | Argento → Petrolio WTI | 8 | 75% | +122,5 | 1,000 | 4/5 · 2/3 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| minimi | 15% | Argento → Semiconduttori | 9 | 78% | +43 | 1,000 | 1/3 · 6/6 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| minimi | 15% | Nasdaq-100 → Petrolio WTI | 9 | 78% | +39 | 1,000 | 4/5 · 3/4 | q ≥ 0,05 |
| minimi | 15% | KOSPI → Petrolio WTI | 8 | 75% | +24 | 1,000 | 2/2 · 4/6 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| minimi | 20% | Argento → S&P 500 | 8 | 75% | +32 | 1,000 | 2/4 · 4/4 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| minimi | 20% | Nasdaq-100 → Petrolio WTI | 8 | 75% | +54 | 1,000 | 3/4 · 3/4 | q ≥ 0,05 |
| minimi | 20% | KOSPI → Nasdaq-100 | 8 | 75% | +19 | 1,000 | 4/6 · 2/2 | q ≥ 0,05; una metà sotto il 75% o con meno di 3 casi |
| minimi | 20% | KOSPI → S&P 500 | 9 | 89% | +12 | 1,000 | 5/6 · 3/3 | q ≥ 0,05 |

### T5c. Casi delle coppie che passano il criterio 2

**massimi 15%, Rame → Petrolio WTI** (giorno della svolta di Rame, tra parentesi i giorni fino a quella di Petrolio WTI): 01/03/2004 (+92), 23/05/2006 (+52), 20/07/2007 (+349), 02/07/2008 (+1), 06/01/2010 (+90), 05/04/2010 (+1), 14/02/2011 (+74), 08/06/2018 (+117), 11/05/2021 (+63), 04/03/2022 (+4), 21/05/2024 (−237), 23/07/2025 (+258). Dopo più di 31 giorni (fuori da «insieme» dello studio precedente): 8 su 12.

**massimi 20%, Rame → Petrolio WTI** (giorno della svolta di Rame, tra parentesi i giorni fino a quella di Petrolio WTI): 23/05/2006 (+52), 20/07/2007 (+349), 02/07/2008 (+1), 05/04/2010 (+1), 14/02/2011 (+74), 08/06/2018 (+117), 04/03/2022 (+4), 21/05/2024 (−237), 23/07/2025 (+258). Dopo più di 31 giorni (fuori da «insieme» dello studio precedente): 5 su 9.

## T6. Utilità dal giorno di conferma (criterio 4)

Modo: illustrativo: coppie che passano solo il criterio 2.

**massimi 15%, Rame → Petrolio WTI**: svolte di Rame 13, colpi 7 (54%), base 52%, p 0,561; anticipo mediano dalla conferma alla svolta di Petrolio WTI 68 giorni (alla sua conferma 99). Utile: no.

| Svolta Rame | Conferma | Finestra (g) | Svolta Petrolio WTI dopo la conferma | Anticipo (g) | Base |
| --- | --- | --- | --- | --- | --- |
| 01/03/2004 | 28/04/2004 | 307 | 01/06/2004 | 34 | 50% |
| 23/05/2006 | 08/06/2006 | 349 | 14/07/2006 | 36 | 55% |
| 20/07/2007 | 16/08/2007 | 338 | 03/07/2008 | 322 | 54% |
| 02/07/2008 | 05/08/2008 | 331 | — | — | 53% |
| 06/01/2010 | 04/02/2010 | 336 | 06/04/2010 | 61 | 54% |
| 05/04/2010 | 17/05/2010 | 323 | — | — | 52% |
| 14/02/2011 | 11/05/2011 | 279 | — | — | 47% |
| 08/06/2018 | 11/07/2018 | 332 | 03/10/2018 | 84 | 53% |
| 11/05/2021 | 19/08/2021 | 265 | 26/10/2021 | 68 | 45% |
| 04/03/2022 | 10/05/2022 | 298 | — | — | 49% |
| 21/05/2024 | 27/06/2024 | 328 | — | — | 53% |
| 26/03/2025 | 04/04/2025 | 356 | — | — | 56% |
| 23/07/2025 | 31/07/2025 | 357 | 07/04/2026 | 250 | 56% |

**massimi 20%, Rame → Petrolio WTI**: svolte di Rame 10, colpi 4 (40%), base 40%, p 0,622; anticipo mediano dalla conferma alla svolta di Petrolio WTI 138 giorni (alla sua conferma 179,5). Utile: no.

| Svolta Rame | Conferma | Finestra (g) | Svolta Petrolio WTI dopo la conferma | Anticipo (g) | Base |
| --- | --- | --- | --- | --- | --- |
| 23/05/2006 | 13/06/2006 | 344 | 14/07/2006 | 31 | 47% |
| 20/07/2007 | 19/11/2007 | 243 | 03/07/2008 | 227 | 34% |
| 02/07/2008 | 12/08/2008 | 324 | — | — | 44% |
| 05/04/2010 | 04/06/2010 | 305 | — | — | 42% |
| 14/02/2011 | 22/09/2011 | 145 | — | — | 20% |
| 08/06/2018 | 15/08/2018 | 297 | 03/10/2018 | 49 | 41% |
| 04/03/2022 | 23/06/2022 | 254 | — | — | 35% |
| 21/05/2024 | 29/07/2024 | 296 | — | — | 41% |
| 26/03/2025 | 07/04/2025 | 353 | — | — | 48% |
| 23/07/2025 | 31/07/2025 | 357 | 07/04/2026 | 250 | 49% |

## T7. Oggi (20/11/2026)

| Mercato | Ultima seduta | Massimo di 52 settimane | Distanza | Minimo di 52 settimane | Distanza | Ultimo massimo ≥ 15% (conferma; superato) | Ultimo massimo ≥ 20% | Ultimo minimo ≥ 15% (conferma; rotto) | Ultimo minimo ≥ 20% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bitcoin | 20/11/2026 | 14/01/2026 | −39,3% | 30/06/2026 | +0,4% | 06/10/2025 (04/11/2025; no) | 06/10/2025 (13/11/2025; no) | 30/06/2026 (19/08/2026; no) | 30/06/2026 (20/08/2026; no) |
| Oro | 20/11/2026 | 29/01/2026 | −33,9% | 20/11/2026 | +0,0% | 29/01/2026 (23/03/2026; no) | 29/01/2026 (10/06/2026; no) | 03/11/2022 (09/01/2023; no) | 03/11/2022 (17/03/2023; no) |
| Argento | 20/11/2026 | 26/01/2026 | −64,3% | 20/11/2026 | +0,0% | 26/01/2026 (30/01/2026; no) | 26/01/2026 (30/01/2026; no) | 01/09/2022 (03/10/2022; no) | 01/09/2022 (08/11/2022; no) |
| Rame | 20/11/2026 | 09/09/2026 | −19,5% | 20/11/2025 | +10,4% | 09/09/2026 (18/11/2026; no) | 23/07/2025 (31/07/2025; 05/01/2026) | 14/07/2022 (11/08/2022; no) | 14/07/2022 (11/11/2022; no) |
| Petrolio WTI | 20/11/2026 | 07/04/2026 | −25,6% | 16/12/2025 | +51,9% | 07/04/2026 (08/04/2026; no) | 07/04/2026 (17/04/2026; no) | 16/12/2025 (29/01/2026; no) | 16/12/2025 (19/02/2026; no) |
| Nasdaq-100 | 20/11/2026 | 06/10/2026 | −19,8% | 30/03/2026 | +9,0% | 06/10/2026 (19/11/2026; no) | 19/02/2025 (04/04/2025; 24/06/2025) | 28/12/2022 (01/02/2023; no) | 28/12/2022 (29/03/2023; no) |
| S&P 500 | 20/11/2026 | 06/10/2026 | −11,6% | 30/03/2026 | +8,9% | 19/02/2025 (04/04/2025; 27/06/2025) | 03/01/2022 (13/06/2022; 19/01/2024) | 12/10/2022 (01/02/2023; no) | 12/10/2022 (08/06/2023; no) |
| Semiconduttori | 20/11/2026 | 22/06/2026 | −43,5% | 20/11/2025 | +38,1% | 22/06/2026 (07/07/2026; no) | 22/06/2026 (17/07/2026; no) | 08/04/2025 (09/04/2025; no) | 08/04/2025 (02/05/2025; no) |
| KOSPI | 20/11/2026 | 22/06/2026 | −46,6% | 24/11/2025 | +26,6% | 22/06/2026 (02/07/2026; no) | 22/06/2026 (08/07/2026; no) | 09/04/2025 (14/05/2025; no) | 09/04/2025 (04/06/2025; no) |

## T8. Prove su serie sintetiche (`script/sintetico.mjs`)

Prezzi sintetici (non dati di mercato), con le date dei mercati veri. Vedi testa dello script. Ripetizioni: 1000 (concordanza), 10000 (coppie).

**A. Ritardo noto** (mercato k = fattore comune spostato di 30·k giorni + rumore)

| Tipo e soglia | Cicli | ρ | p | Fuori campione | p |
| --- | --- | --- | --- | --- | --- |
| peak15 | 31 | 0,568 | < 0,001 | 0,730 | < 0,001 |
| peak20 | 17 | 0,600 | < 0,001 | 0,732 | < 0,001 |
| peak30 | 12 | 0,756 | < 0,001 | 0,884 | < 0,001 |
| trough15 | 21 | 0,466 | < 0,001 | 0,585 | < 0,001 |
| trough20 | 18 | 0,539 | < 0,001 | 0,654 | < 0,001 |
| trough30 | 13 | 0,659 | < 0,001 | 0,503 | 0,016 |

Coppie in avanti con ritardo vero 30-120 giorni: 155, di cui passano il criterio 2: 43; coppie al contrario che lo passano: 0. Scarto mediano trovato per ritardo vero 30/60/90/120 giorni: 29,5 / 60,0 / 90,0 / 120,0.

| Coppia a 60 giorni | Tipo e soglia | Casi | Quota dopo | Scarto mediano | q | Criterio 2 |
| --- | --- | --- | --- | --- | --- | --- |
| BTC→SILVER | peak15 | 9 | 78% | +60 | 0,216 | no |
| GOLD→COPPER | peak15 | 14 | 71% | +60 | 0,140 | no |
| SILVER→WTI | peak15 | 17 | 71% | +60 | 0,107 | no |
| COPPER→NDX | peak15 | 17 | 76% | +59 | 0,124 | no |
| WTI→SPX | peak15 | 15 | 87% | +61 | 0,001 | sì |
| NDX→SOXX | peak15 | 17 | 76% | +61 | 0,001 | no |
| SPX→KOSPI | peak15 | 15 | 87% | +60 | 0,001 | sì |
| BTC→SILVER | peak20 | 7 | 71% | +60 | 0,489 | no |
| GOLD→COPPER | peak20 | 10 | 80% | +60 | 0,114 | no |
| SILVER→WTI | peak20 | 13 | 85% | +60 | 0,001 | sì |
| COPPER→NDX | peak20 | 9 | 78% | +57 | 0,216 | no |
| WTI→SPX | peak20 | 11 | 82% | +60 | 0,084 | no |
| NDX→SOXX | peak20 | 11 | 82% | +63 | 0,001 | sì |
| SPX→KOSPI | peak20 | 12 | 83% | +60 | 0,009 | sì |
| BTC→SILVER | peak30 | 3 | 67% | +35 | 0,939 | no |
| GOLD→COPPER | peak30 | 4 | 100% | +59 | 0,277 | no |
| SILVER→WTI | peak30 | 8 | 75% | +60 | 0,277 | no |
| COPPER→NDX | peak30 | 6 | 67% | +59,5 | 0,866 | no |
| WTI→SPX | peak30 | 7 | 86% | +60 | 0,126 | no |
| NDX→SOXX | peak30 | 6 | 83% | +62 | 0,198 | no |
| SPX→KOSPI | peak30 | 4 | 50% | −17 | 1,000 | no |
| BTC→SILVER | trough15 | 8 | 63% | +53 | 0,666 | no |
| GOLD→COPPER | trough15 | 12 | 92% | +61 | 0,001 | sì |
| SILVER→WTI | trough15 | 9 | 78% | +55 | 0,150 | no |
| COPPER→NDX | trough15 | 11 | 82% | +78 | 0,018 | sì |
| WTI→SPX | trough15 | 12 | 75% | +60,5 | 0,117 | no |
| NDX→SOXX | trough15 | 11 | 82% | +62 | 0,079 | no |
| SPX→KOSPI | trough15 | 13 | 77% | +39 | 0,096 | no |
| BTC→SILVER | trough20 | 6 | 67% | +60 | 0,564 | no |
| GOLD→COPPER | trough20 | 10 | 100% | +61 | 0,001 | sì |
| SILVER→WTI | trough20 | 9 | 78% | +55 | 0,188 | no |
| COPPER→NDX | trough20 | 9 | 89% | +78 | 0,018 | sì |
| WTI→SPX | trough20 | 10 | 100% | +99 | 0,001 | sì |
| NDX→SOXX | trough20 | 10 | 80% | +61 | 0,117 | no |
| SPX→KOSPI | trough20 | 9 | 89% | +38 | 0,018 | sì |
| BTC→SILVER | trough30 | 4 | 75% | +60 | 0,502 | no |
| GOLD→COPPER | trough30 | 6 | 100% | +63 | 0,083 | no |
| SILVER→WTI | trough30 | 7 | 71% | +55 | 0,407 | no |
| COPPER→NDX | trough30 | 7 | 86% | +78 | 0,164 | no |
| WTI→SPX | trough30 | 7 | 100% | +105 | 0,126 | no |
| NDX→SOXX | trough30 | 10 | 80% | +61 | 0,178 | no |
| SPX→KOSPI | trough30 | 7 | 86% | +38 | 0,046 | no |

**B. Una sola coppia a 60 giorni** («argento» = «oro» spostato di 60 giorni + rumore, gli altri indipendenti)

| Tipo e soglia | Casi | Quota dopo | Scarto mediano | p nullo | q | Criterio 2 |
| --- | --- | --- | --- | --- | --- | --- |
| peak15 | 11 | 91% | +59 | < 0,001 | 0,014 | sì |
| peak20 | 7 | 86% | +59 | 0,108 | 1,000 | no |
| peak30 | 4 | 75% | +60 | 0,332 | 1,000 | no |
| trough15 | 13 | 100% | +61 | < 0,001 | 0,014 | sì |
| trough20 | 8 | 100% | +60,5 | 0,014 | 0,842 | no |
| trough30 | 6 | 100% | +72,5 | 0,169 | 1,000 | no |

Altre coppie che passano il criterio 2 (false): nessuna. Concordanza: peak15 p 0,216, peak20 p 0,584, peak30 p 0,293, trough15 p 0,554, trough20 p 0,944, trough30 p 0,448.

**C. Mercati indipendenti**

20 semi, soglia 20%: concordanza con p < 0,05 in 5 prove su 40, fuori campione in 4 su 40; coppie con p nullo < 0,05 prima della correzione 114 su 2876 (4%); con quota ≥ 75% e ≥ 8 casi 84; che passano il criterio 2: 0.

C2 (100 semi, soglie 15 e 20%, 1000 ripetizioni): concordanza con p < 0,05 in 19 prove su 400 (p < 0,01: 6); fuori campione 15 su 400 (p < 0,01: 4).
