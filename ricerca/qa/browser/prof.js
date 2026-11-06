const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm.introSeen', 'true'); } catch {} });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await p.goto('http://127.0.0.1:8790/#mon');
  await p.waitForFunction(() => document.querySelectorAll('#boardTable tbody tr').length >= 11, null, { timeout: 60000, polling: 20 });
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, t] of counts) { const n = byId.get(id), f = n.callFrame; const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + t); }
  // tempo totale per funzione (inclusivo) sui file dell'app
  const total = new Map();
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  for (const [id, t] of counts) { const seen = new Set(); let x = id; while (x != null) { const f = byId.get(x).callFrame; const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`; if (/\.js/.test(f.url) && !seen.has(key)) { total.set(key, (total.get(key) || 0) + t); seen.add(key); } x = parent.get(x); } }
  console.log('INCLUSIVO (ms):'); [...total].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, t]) => console.log((t / 1000).toFixed(1).padStart(7), k));
  console.log('SELF (ms):'); [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, t]) => console.log((t / 1000).toFixed(1).padStart(7), k));
  await b.close();
})();
