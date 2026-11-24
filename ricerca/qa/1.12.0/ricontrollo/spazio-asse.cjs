// Spazio minimo (px schermo) fra le etichette dell'asse del primo grafico di #pkPanel. 8795 = worktree di 523e952~1, 8794 = 523e952
// Uso: NODE_PATH=$(npm root -g) node ricerca/qa/1.12.0/ricontrollo/spazio-asse.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [base, ws] of [['http://127.0.0.1:8795/', [840, 850, 860, 870, 880]], ['http://127.0.0.1:8794/', [860, 1034, 1040, 1080]]]) for (const vw of ws) {
    const c = await b.newContext({ viewport: { width: vw, height: 900 } });
    await c.addInitScript(() => { localStorage.setItem('sm.introSeen', 'true'); });
    const p = await c.newPage();
    await p.goto(base + '#ath'); await p.waitForSelector('#pkBody .pkep svg .pkdot'); await p.waitForTimeout(300);
    const g = await p.evaluate(() => { const ax = [...document.querySelector('#pkBody svg').querySelectorAll('text.axt')].map((t) => { const r = t.getBoundingClientRect(); return [t.textContent, r.left, r.right]; }).sort((a, b) => a[1] - b[1]); let m = 1e9, w = ''; for (let i = 1; i < ax.length; i++) { const d = ax[i][1] - ax[i - 1][2]; if (d < m) { m = d; w = ax[i - 1][0] + '/' + ax[i][0]; } } return [m.toFixed(1), w]; });
    console.log(base.slice(-5), vw, 'spazio minimo fra etichette dell\'asse:', g[0], 'px', g[1]);
    await c.close();
  }
  await b.close();
})();
