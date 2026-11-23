// QA 1.13.0: ancore della guida. Ogni guida.html#x in index.html e nei js, ogni data-guide e ogni href="#x" interno
// di guida.html deve avere il suo id in guida.html. Controlla anche tag non chiusi nelle parti cambiate in modo semplice
// (bilancio di <div>, <p>, <details>, <summary>, <span>, <button>, <table> nelle due pagine).
// Uso: node anchors.mjs <cartella del worktree>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const rd = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const guide = rd('guida.html');
const ids = new Set([...guide.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const files = ['index.html', ...fs.readdirSync(path.join(dir, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
const bad = [];
let n = 0;
for (const f of files) {
  const t = rd(f);
  for (const m of t.matchAll(/guida\.html#([\w-]+)/g)) { n++; if (!ids.has(m[1])) bad.push(`${f}: guida.html#${m[1]}`); }
  for (const m of t.matchAll(/data-guide="([\w-]+)"/g)) { n++; if (!ids.has(m[1])) bad.push(`${f}: data-guide=${m[1]}`); }
}
for (const m of guide.matchAll(/href="#([\w-]+)"/g)) { n++; if (!ids.has(m[1])) bad.push(`guida.html: #${m[1]}`); }
console.log(`riferimenti controllati: ${n}; senza ancora: ${bad.length}`);
for (const b of bad) console.log('  ' + b);
// bilancio dei tag
for (const f of ['index.html', 'guida.html']) {
  const t = rd(f).replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const out = [];
  for (const tag of ['div', 'p', 'details', 'summary', 'span', 'button', 'table', 'section', 'ul', 'ol', 'li', 'dl', 'h2', 'h3', 'a']) {
    const o = (t.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length, c = (t.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (o !== c && !['p', 'li'].includes(tag)) out.push(`${tag}: ${o} aperti, ${c} chiusi`);
    else if (o !== c) out.push(`${tag}: ${o} aperti, ${c} chiusi (chiusura facoltativa)`);
  }
  console.log(`${f}: ${out.length ? out.join('; ') : 'tag bilanciati'}`);
}
