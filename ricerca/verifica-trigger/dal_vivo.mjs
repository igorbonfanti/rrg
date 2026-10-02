// Registro dal vivo del secondo giro (protocollo-2.md): segue C7 (metà al tocco della zona blu, metà al trigger)
// sulle zone blu iniziate dal 25/09/2026, con le regole congelate, accanto al trigger attuale e all'ingresso tutto subito.
// Uso: git fetch origin main && node dal_vivo.mjs   (legge i dati di origin/main; VERIFICA_SNAP sceglie un altro commit)
import fs from 'node:fs';

process.env.VERIFICA_SNAP ||= 'origin/main';
const { SEC, D, simulate } = await import('./motore.mjs');
const START = '2026-09-25';
const RULES = { C7: { staged: { type: 'touch', w1: 0.5 } }, C0: {}, T0: { fixed: 0 } };
const n = D.length, last = D[n - 1];
const it = (d) => d.split('-').reverse().join('/');
const pc = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(100 * v).toFixed(1).replace('.', ',')}%`;

const rows = [];
for (const [s, o] of Object.entries(SEC)) {
  if (!o.m) continue;
  const starts = o.m.setups.map((x) => x.t);
  o.m.setups.forEach((su, k) => {
    if (D[su.t] < START) return;
    const next = k + 1 < starts.length ? starts[k + 1] - 1 : Infinity;
    const we = Math.min(su.t + 252, next, n - 1), e = { s, t0: su.t, we };
    const sim = Object.fromEntries(Object.entries(RULES).map(([r, rule]) => [r, simulate(e, rule)]));
    const c7 = sim.C7.log;
    const buys = c7.buys.map((b) => `${it(D[b.t])} a ${b.price.toFixed(2).replace('.', ',')}`);
    let nextStep = '';
    if (!c7.buys.length) nextStep = 'prima metà alla chiusura della seduta dopo l\'inizio della zona blu';
    else if (!c7.trig.length) nextStep = 'seconda metà al trigger';
    rows.push({
      s, t0: D[su.t], stato: we >= su.t + 252 || next !== Infinity ? 'chiuso' : 'aperto',
      acquisti: buys.join(' · ') || '—', prossimo: nextStep,
      trigger: c7.trig.map((x) => it(D[x.t])).join(', ') || '—', fallimenti: c7.fail.map((t) => it(D[t])).join(', ') || '—',
      C7: sim.C7.value - 1, C0: sim.C0.value - 1, T0: sim.T0.value - 1, fino: D[we],
    });
  });
}

const md = `# Registro dal vivo: metà al tocco della zona blu, metà al trigger

Aggiornato con i dati al ${it(last)}. Le regole sono quelle congelate in \`protocollo-2.md\` e \`protocollo.md\`, senza modifiche.

Nell'app non cambia nulla, perché gli avvisi esistenti coincidono già con i passi di C7:
- **Zona blu:** si compra la prima metà alla chiusura della seduta successiva.
- **Trigger:** si compra la seconda metà.
- **Fallito:** si esce da tutta la posizione.

Qui si segna cosa avrebbe fatto la regola nelle zone blu iniziate dal ${it(START)}, fuori dal campione usato per sceglierla.

| Settore | Inizio zona blu | Stato | Acquisti C7 | Prossimo passo | Trigger | Fallimenti | C7 finora | Trigger attuale finora | Tutto in zona blu finora |
|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.s} | ${it(r.t0)} | ${r.stato} | ${r.acquisti} | ${r.prossimo || '—'} | ${r.trigger} | ${r.fallimenti} | ${pc(r.C7)} | ${pc(r.C0)} | ${pc(r.T0)} |`).join('\n') || '| — | nessuna zona blu nuova | | | | | | | | |'}

I rendimenti «finora» vanno dall'inizio della zona blu all'ultima chiusura disponibile, o alla fine della finestra di un anno. Si resta liquidi finché la regola non entra, e ogni acquisto o vendita costa 10 punti base.

Per aggiornare: \`git fetch origin main && node dal_vivo.mjs\` in questa cartella.
`;
fs.writeFileSync(new URL('./dal-vivo.md', import.meta.url), md);
console.log(md);
