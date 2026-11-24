import fs from 'node:fs';
const ids = process.argv.slice(2);
for (const id of ids) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=2000-01-01`, { headers: { 'User-Agent': 'Mozilla/5.0 (sector-monitor data fetch)' } });
      const t = await r.text();
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(`/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/qa1/dati/fred/${id}.csv`, t);
      console.log(id, t.split('\n').length, t.trim().split('\n').at(-1)); break;
    } catch (e) { console.log(id, 'ERR', e.message); await new Promise(r => setTimeout(r, 2000 * (a + 1))); }
  }
  await new Promise(r => setTimeout(r, 1000));
}
