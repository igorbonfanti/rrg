// QA 1.13.0 (controllore indipendente): riferimenti agli id nei js contro index.html.
// Uso: node ids.mjs <cartella del worktree> [cartella vecchia]
// Per ogni $('id') / getElementById('id') / $(`...`) letterale dei js elenca gli id che non sono né in index.html
// né creati dai js (id="..." in una stringa o .id = '...'). Con la cartella vecchia elenca anche gli id tolti
// da index.html e ancora usati dai js nuovi, e gli id duplicati in index.html e guida.html.
import fs from 'node:fs';
import path from 'node:path';

const [dir, old] = process.argv.slice(2);
const rd = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');
function scan(d) {
  const html = rd(d, 'index.html');
  const js = fs.readdirSync(path.join(d, 'js')).filter((f) => f.endsWith('.js'));
  const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const made = new Set(), refs = new Map();
  for (const f of js) {
    const t = rd(d, 'js/' + f);
    for (const m of t.matchAll(/id="([A-Za-z][\w-]*)"/g)) made.add(m[1]);
    for (const m of t.matchAll(/\.id\s*=\s*'([^']+)'/g)) made.add(m[1]);
    const add = (id, how) => { if (!refs.has(id)) refs.set(id, new Set()); refs.get(id).add(f + how); };
    if (f === 'cap-view.js') { // $ con prefisso: secCap / ixCap
      for (const m of t.matchAll(/\$\('([^']+)'\)/g)) { add('sec' + m[1], ''); add('ix' + m[1], ''); }
    } else {
      for (const m of t.matchAll(/\$\('([^']+)'\)/g)) add(m[1], '');
    }
    for (const m of t.matchAll(/getElementById\('([^']+)'\)/g)) add(m[1], ' (gEBI)');
  }
  return { html, htmlIds, made, refs };
}
const N = scan(dir);
const dup = (ids) => [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
const out = [];
out.push('id duplicati in index.html: ' + JSON.stringify(dup(N.htmlIds)));
const gIds = [...rd(dir, 'guida.html').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
out.push('id duplicati in guida.html: ' + JSON.stringify(dup(gIds)));
const hs = new Set(N.htmlIds);
const missing = [...N.refs].filter(([id]) => !hs.has(id) && !N.made.has(id));
out.push('id usati dai js senza elemento (né in index.html né creati dai js): ' + missing.length);
for (const [id, fs_] of missing) out.push('  ' + id + '  <- ' + [...fs_].join(', '));
if (old) {
  const O = scan(old);
  const oldIds = new Set(O.htmlIds);
  const removed = [...oldIds].filter((x) => !hs.has(x));
  const added = [...hs].filter((x) => !oldIds.has(x));
  out.push('id tolti da index.html: ' + removed.length + ' ' + JSON.stringify(removed));
  out.push('id nuovi in index.html: ' + added.length + ' ' + JSON.stringify(added));
  const still = removed.filter((x) => N.refs.has(x) && !N.made.has(x));
  out.push('id tolti ma ancora usati dai js nuovi: ' + JSON.stringify(still.map((x) => [x, [...N.refs.get(x)]])));
  // stessi controlli sulla versione vecchia, per distinguere i casi già presenti
  const ohs = new Set(O.htmlIds);
  const omissing = [...O.refs].filter(([id]) => !ohs.has(id) && !O.made.has(id)).map(([id]) => id);
  out.push('(vecchia) id usati senza elemento: ' + JSON.stringify(omissing));
}
console.log(out.join('\n'));
