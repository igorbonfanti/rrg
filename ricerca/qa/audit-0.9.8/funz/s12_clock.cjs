// Badge di freschezza dei dati con l'orologio simulato
const L = require('./lib.cjs');
const R = new L.Rec('s12_clock');
(async () => {
  const b = await L.launch();
  for (const [t, want] of [
    // dati EOD al 19/10/2026 (lunedì): la seduta USA si attende dalle 20:30 di New York (02:30 a Roma)
    ['2026-10-20T02:00:00+02:00', /Aggiornato/], ['2026-10-20T10:00:00+02:00', /Aggiornato/], ['2026-10-20T23:00:00+02:00', /Aggiornato/],
    ['2026-10-21T03:00:00+02:00', /1 seduta indietro/], ['2026-10-21T12:00:00+02:00', /1 seduta indietro/], ['2026-10-22T10:00:00+02:00', /2 sedute indietro/],
    ['2026-10-24T12:00:00+02:00', /4 sedute indietro/]]) {
    const { ctx, page, log } = await L.open(b, 'desktop');
    await page.clock.setFixedTime(new Date(t));
    await L.goto(page, 'mon', 1200);
    const c = await page.textContent('#clock');
    await page.goto(L.BASE + '#rrg'); await page.waitForTimeout(1200);
    await page.selectOption('#groupSel', '1 · Asset class'); await page.waitForTimeout(600);
    const g = await page.textContent('#rrgMeta');
    R.add('F1', 'freschezza', `orologio ${t}: badge «${want.source}»`, want.test(c), `${c} · globali: ${g}`);
    await ctx.close();
  }
  R.save(); await b.close();
})();
