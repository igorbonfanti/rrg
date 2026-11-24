// Casi limite di athStats / windowStart (js/ath.js), con risultati attesi calcolati a mano.
// Uso: node ricerca/qa/1.10.0/numeri/casi_limite.mjs   (dalla radice del repository)
import { athStats, windowStart, athRows } from '../../../../js/ath.js';
let ok = 0, ko = 0;
const eq = (name, got, exp) => { const g = JSON.stringify(got), e = JSON.stringify(exp); if (g === e) ok++; else { ko++; console.log(`NO  ${name}: atteso ${e}, ottenuto ${g}`); } };

// finestra
eq('29/02 -> 28/02', windowStart('2028-02-29'), '2025-02-28');
eq('28/02 bisestile', windowStart('2027-02-28'), '2024-02-28');
eq('01/03', windowStart('2027-03-01'), '2024-03-01');
eq('29/02 -> 29/02 (12 anni)', windowStart('2028-02-29', 12), '2016-02-29');
eq('31/12', windowStart('2026-12-31'), '2023-12-31');
// massimo esattamente al primo giorno della finestra (incluso) e il giorno prima (escluso)
let s = athStats(['2023-11-10', '2023-11-11', '2025-01-02', '2026-11-11'], [200, 150, 120, 100]);
eq('massimo al primo giorno', [s.from, s.refDate, s.ref, s.distPct, s.ath, s.athDate], ['2023-11-11', '2023-11-11', 150, -33.33, 200, '2023-11-10']);
s = athStats(['2023-11-10', '2023-11-13', '2026-11-11'], [200, 150, 100]);
eq('massimo il giorno prima (fuori)', [s.refDate, s.ref], ['2023-11-13', 150]);
// 29/02: ultima seduta 29/02/2028, massimo 28/02/2025 dentro, 27/02/2025 fuori
s = athStats(['2025-02-27', '2025-02-28', '2028-02-29'], [300, 200, 100]);
eq('29/02 finestra', [s.from, s.refDate, s.days], ['2025-02-28', '2025-02-28', 1096]);
// parità: la prima data; il minimo a parità: la prima data
s = athStats(['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'], [100, 120, 90, 120, 90, 95]);
eq('parità massimo e minimo', [s.refDate, s.cycleLowDate, s.days, s.cycleLowPct, s.fromLowPct], ['2026-01-05', '2026-01-06', 4, -25, 5.56]);
// chiusura = 0 e < 0 dopo il massimo
s = athStats(['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], [10, 12, 0, 6]);
eq('chiusura zero', [s.belowZero, s.cycleLow, s.cycleLowPct, s.fromLowPct, s.distPct], ['2026-01-06', null, null, null, -50]);
// chiusura negativa PRIMA del massimo ma dentro la finestra: il calo si calcola
s = athStats(['2024-04-20', '2025-01-02', '2025-06-02', '2026-11-11'], [-37, 80, 60, 70]);
eq('negativa prima del massimo', [s.belowZero, s.cycleLow, s.cycleLowPct, s.distPct], [null, 60, -25, -12.5]);
// nuovo massimo all'ultima seduta
s = athStats(['2026-01-02', '2026-01-05'], [100, 101], [102, 101.5]);
eq('massimo all\'ultima seduta', [s.distPct, s.days, s.cycleLow, s.cycleLowDate, s.fromLowPct, s.intradayRef, s.intradayRefDate], [0, 0, null, null, null, 102, '2026-01-02']);
// valori null: ultima chiusura null (si usa la precedente), chiusura null in mezzo, massimo della seduta null
s = athStats(['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], [100, null, 90, null], [105, null, null, 120]);
eq('null', [s.lastDate, s.last, s.ref, s.refDate, s.cycleLow, s.intradayRef], ['2026-01-06', 90, 100, '2026-01-02', 90, 105]);
// prima chiusura null: start dovrebbe essere la prima seduta con un prezzo?
s = athStats(['2026-01-01', '2026-01-02', '2026-01-05'], [null, 100, 90]);
eq('start con la prima chiusura null', s.start, '2026-01-02');
// massimo della seduta in un giorno senza chiusura
s = athStats(['2026-01-02', '2026-01-05', '2026-01-06'], [100, null, 90], [101, 130, 91]);
eq('massimo seduta in un giorno senza chiusura', [s.intradayRef, s.intradayRefDate], [101, '2026-01-02']);
// serie più corta di 3 anni
s = athStats(['2025-06-02', '2025-07-01', '2026-11-11'], [50, 80, 60]);
eq('serie corta', [s.from, s.start, s.refDate, s.athDate, s.distPct], ['2023-11-11', '2025-06-02', '2025-07-01', '2025-07-01', -25]);
eq('vuota', athStats([], []), null);
eq('tutte null', athStats(['2026-01-02'], [null]), null);
// ordinamento con stats null e parità
eq('athRows', athRows([{ id: 'a', stats: null }, { id: 'b', stats: { distPct: -1, refDate: '2026-01-01' } }], 'date').map((x) => x.id), ['b', 'a']);
console.log(`casi limite: ${ok} passano, ${ko} no`);
