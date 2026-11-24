// Casi limite delle funzioni pure di scripts/fetch_vix.js e js/vix.js (1.6.0). Uso: node casi_puri.mjs
import { parseCboe, mergeTail, ratioSeries, onSessions, assemble } from '../../../../scripts/fetch_vix.js';
import { pickSeries, pack } from '../../../../scripts/fetch_emerging.js';
import * as V from '../../../../js/vix.js';
const show = (m, f) => { try { console.log(m, JSON.stringify(f())); } catch (e) { console.log(m, 'ERRORE', e.message); } };
show('BOM in testa', () => parseCboe('﻿DATE,OPEN,HIGH,LOW,CLOSE\n11/06/2026,1,1,1,25.64\n'));
show('date M/D/YYYY senza zeri', () => parseCboe('DATE,CLOSE\n11/6/2026,25.64\n'));
show('valori tra virgolette', () => parseCboe('"DATE","CLOSE"\n"11/06/2026","25.64"\n'));
show('data ripetuta (nessuna deduplica)', () => parseCboe('DATE,CLOSE\n11/06/2026,25.64\n11/06/2026,99\n'));
show('righe vuote e spazi', () => parseCboe('DATE, CLOSE\n\n11/06/2026, 25.64 \n\n'));
show('NaN e testo', () => parseCboe('DATE,CLOSE\n11/06/2026,n/a\n11/05/2026,28.18\n'));
show('Cboe vuoto dopo le sedute, Yahoo con la seduta: mergeTail', () => mergeTail({ dates: [], val: [] }, { dates: ['2026-11-06'], val: [25] }));
show('onSessions toglie ≤0 e null', () => onSessions({ dates: ['a', 'b', 'c', 'd'], val: [1, 0, -1, null] }, ['a', 'b', 'c', 'd']));
show('ratioSeries b=0 o mancante', () => ratioSeries({ dates: ['a', 'b', 'c'], val: [1, 2, 3] }, { dates: ['a', 'b'], val: [2, 0] }));
// pickSeries: VIX della 1.5.0 contro lo stesso VIX ricalcolato (ps uguale per default)
const d = ['2026-11-04', '2026-11-05', '2026-11-06'], v = [16.61, 28.18, 25.64];
const prev = { ...pack(d, v), last: '2026-11-06', fred: '2026-11-05' };
show('ps di default del VIX', () => prev.ps);
show('pickSeries stessi valori → pubblicata', () => { const r = pickSeries({ ...pack(d, v), last: '2026-11-06', fred: '2026-11-05' }, prev); return { same: !!r.same, kept: r.kept }; });
show('pickSeries valore 2564 (Cboe sbagliato): ps passa a 100 e si pubblica', () => { const f = { ...pack(d, [16.61, 28.18, 2564]), last: '2026-11-06', fred: '2026-11-05' }; const r = pickSeries(f, prev); return { ps: f.ps, kept: r.kept }; });
show('assemble senza prev, VIX3M senza fred', () => { const s = (last) => ({ d0: '2026-01-02', gaps: '', cd: [1], ps: 1, last }); return assemble({ VIX: { ...s('x'), fred: 'x' }, SPX: s('x'), NDX: s('x'), VIX3M: s('x') }, null).out.asOf; });
// context: VIX3M provvisorio in un giorno in cui è provvisorio solo il VIX (etichetta del riquadro dei valori)
const n = 300, dd = Array.from({ length: n }, (_, i) => `2020-${String(i).padStart(4, '0')}`);
const A = { dates: dd, close: dd.map(() => 1), vix: dd.map(() => 20), fred: dd[n - 2] };
const C = V.context(A, { dates: dd, val: dd.map(() => 21), fred: dd[n - 1] }, null);
show('ultimo VIX3M già di FRED ma provisional(i) vero (etichetta «provv.» anche sul VIX3M)', () => ({ v3fred: dd[n - 1], provisional: C.provisional(n - 1) }));
