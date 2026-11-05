// Confronta due versioni di data/emerging.json serie per serie (date, valori diversi, scarto relativo massimo).
// Uso: node confronta_file.mjs <worktree> <vecchio.json> <nuovo.json>
import fs from 'node:fs';
const W=process.argv[2].replace(/\/?$/, '/');
const { emSeries } = await import(W+'js/emerging.js');
const a=JSON.parse(fs.readFileSync(process.argv[3])), b=JSON.parse(fs.readFileSync(process.argv[4]));
for (const s of Object.keys(b.series)) {
  const x=emSeries(a.series[s]), y=emSeries(b.series[s]);
  const m=new Map(x.dates.map((d,i)=>[d,x.val[i]]));
  let diff=0, maxrel=0, onlyB=0, ex=[];
  y.dates.forEach((d,i)=>{ if(!m.has(d)){onlyB++;return;} const r=Math.abs(m.get(d)/y.val[i]-1); if(r>0){diff++; if(r>maxrel){maxrel=r; ex=[d,m.get(d),y.val[i]];}} });
  const onlyA = x.dates.filter(d=>!new Set(y.dates).has(d)).length;
  console.log(s.padEnd(11), 'A', x.dates.length, x.dates[0], 'B', y.dates.length, y.dates[0], 'soloB', onlyB, 'soloA', onlyA, 'diversi', diff, 'maxrel', maxrel.toExponential(2), ex.join(' '));
}
