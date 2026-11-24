// Controllo 1.11.0: fetch finto per far girare scripts/fetch_ath.js senza rete sulle risposte salvate (ATH_RAW_DIR).
// Uso: REPLAY_DIR=<raw_dir> REPLAY_FAIL='SPY,h:SI=F' node --import ./replay.mjs scripts/fetch_ath.js
// REPLAY_FAIL: simboli che rispondono HTTP 404 (h: = solo le barre orarie); REPLAY_BAD: simboli con una risposta senza barre.
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.env.REPLAY_DIR, FAIL = (process.env.REPLAY_FAIL || '').split(',').filter(Boolean), BAD = (process.env.REPLAY_BAD || '').split(',').filter(Boolean);
globalThis.fetch = async (url) => {
  const u = new URL(url), sym = decodeURIComponent(u.pathname.split('/').pop()), h = u.searchParams.get('interval') === '60m';
  const key = (h ? 'h:' : '') + sym;
  if (FAIL.includes(sym) || FAIL.includes(key)) return { status: 404, ok: false, json: async () => ({}) };
  const f = path.join(DIR, `${h ? 'h' : 'd'}_${sym.replace(/[^A-Za-z0-9.-]/g, '_')}.json`);
  if (!fs.existsSync(f)) return { status: 404, ok: false, json: async () => ({}) };
  const res = JSON.parse(fs.readFileSync(f, 'utf-8')).res;
  if (BAD.includes(key)) { res.indicators.quote[0] = {}; }
  return { status: 200, ok: true, json: async () => ({ chart: { result: [res] } }) };
};
