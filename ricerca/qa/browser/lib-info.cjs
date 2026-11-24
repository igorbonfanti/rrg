// 1.13.0: testo di un riquadro «i» (js/info.js), aperto davvero con un clic (o un tocco) e poi chiuso con Esc.
// Restituisce '' se il bottone non c'è o il riquadro non si apre: i controlli che lo usano possono quindi fallire.
async function infoText(p, sel, touch = false) {
  const b = p.locator(sel).first();
  if (!(await b.count())) return '';
  await b.scrollIntoViewIfNeeded().catch(() => {});
  if (touch) await b.tap().catch(() => {}); else await b.click().catch(() => {});
  await p.waitForTimeout(150);
  const t = await p.evaluate(() => { const x = document.getElementById('infopop'); return x && !x.hidden ? x.textContent : ''; });
  await p.keyboard.press('Escape');
  return t;
}
module.exports = { infoText };
