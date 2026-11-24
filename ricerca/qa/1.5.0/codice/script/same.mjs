// due file di dati uguali a parte `generated`? (onlyStamp di scripts/keep_unchanged.js)  Uso: node same.mjs <worktree> <a.json> <b.json>
import fs from 'node:fs';
const [wt, a, b] = process.argv.slice(2);
const { onlyStamp } = await import(wt + '/scripts/keep_unchanged.js');
console.log('onlyStamp', onlyStamp(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8')));
