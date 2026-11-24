// Controllo: il simulatore con la regola C0 deve riprodurre trigger e fallimenti dell'app dentro ogni finestra.
import { EPIS, PERIODS, D, simulate } from './motore.mjs';
let ok = 0, bad = [];
for (const e of EPIS) {
  const sim = simulate(e, {});
  const mine = [...sim.log.trig.map((x) => `trig@${x.t}`), ...sim.log.fail.map((t) => `fail@${t}`)].sort();
  const app = e.appEvents.filter((x) => x.code !== 'setup').map((x) => `${x.code}@${x.t}`).sort();
  if (JSON.stringify(mine) === JSON.stringify(app)) ok++; else bad.push(`${e.s} ${D[e.t0]}: app ${app.join(',')} · sim ${mine.join(',')}`);
}
console.log(`episodi ${EPIS.length} · periodi ${PERIODS.map((p) => `${p.lab} (${p.n})`).join(', ')}`);
console.log(`C0 uguale all'app in ${ok}/${EPIS.length} episodi`);
bad.forEach((x) => console.log('  diverso:', x));
