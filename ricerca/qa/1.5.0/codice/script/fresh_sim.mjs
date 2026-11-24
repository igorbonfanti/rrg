// check_fresh sulla vista VIX: corse delle 22:40 e delle 11:40 UTC dal 06/11/2026 al 31/12/2028, con il modello
// «FRED pubblica ogni mattina dei giorni feriali non festivi (federali USA) la seduta precedente» (caso pessimo: niente
// aggiornamenti nel fine settimana e nelle feste federali, anche quando la borsa è aperta: Columbus Day, Veterans Day)
const W = process.argv[2];
const { staleData } = await import(W + '/scripts/check_fresh.js');
const { isTradingDay, holidays } = await import(W + '/js/calendar.js');
const iso = (t) => new Date(t).toISOString().slice(0, 10), DAY = 864e5;
// feste federali (FRED/Fed chiusa): quelle NYSE + Columbus Day (2° lunedì di ottobre) + Veterans Day (11/11, spostato)
function federal(y) {
  const s = new Set(holidays(y));
  const d = new Date(Date.UTC(y, 9, 1)); let m = 0; while (true) { if (d.getUTCDay() === 1 && ++m === 2) break; d.setUTCDate(d.getUTCDate() + 1); } s.add(iso(d));
  const v = new Date(Date.UTC(y, 10, 11)); if (v.getUTCDay() === 6) v.setUTCDate(10); if (v.getUTCDay() === 0) v.setUTCDate(12); s.add(iso(v));
  return s;
}
const fedOpen = (d) => { const t = new Date(d + 'T12:00:00Z'), w = t.getUTCDay(); return w > 0 && w < 6 && !federal(t.getUTCFullYear()).has(d); };
const prevSession = (d) => { let t = Date.parse(d) - DAY; while (!isTradingDay(iso(t))) t -= DAY; return iso(t); };
const lastSessionLE = (d) => (isTradingDay(d) ? d : prevSession(d));
let fred = '2026-11-05', runs = 0; const bad = [];
for (let t = Date.parse('2026-11-06'); t <= Date.parse('2028-12-31'); t += DAY) {
  const d = iso(t), w = new Date(t).getUTCDay();
  // mattina: FRED aggiunge la seduta precedente (se è un giorno in cui FRED lavora)
  if (fedOpen(d)) { const p = prevSession(d); if (p > fred) fred = p; }
  // corsa delle 11:40 (mar-sab) e delle 22:40 (lun-ven)
  for (const [ok, B] of [[w >= 2 && w <= 6, lastSessionLE(iso(t - DAY))], [w >= 1 && w <= 5, lastSessionLE(d)]]) {
    if (!ok) continue; runs++;
    const p = staleData({ breadth: { asOf: B }, vix: { asOf: { vix: B, spx: B, ndx: B, fred } } }, d);
    if (p.length) bad.push(`${d}: ${p.join(' | ')}`);
  }
}
console.log(`${runs} corse simulate, ${bad.length} segnalazioni`); bad.slice(0, 20).forEach((x) => console.log(' ', x));
