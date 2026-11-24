// Prove di scripts/send_alerts.js con Telegram simulato (mock-telegram.mjs): nessun token vero, nessuna rete.
// Uso: node ricerca/qa/audit-0.9.8/codice/prova_alert.mjs [cartella di lavoro]
// Copia in una cartella temporanea lo script, i moduli che usa e i dati di oggi, poi esegue due scenari.
//
// Scenario A (registro non pubblicato dopo un invio fallito): sera 1 con due eventi nuovi, il primo invio fallisce.
//   send_alerts esce con 1 → nel workflow steps.alerts.outcome = 'failure' → il passo «Commit registro degli alert»
//   (if: steps.alerts.outcome == 'success') non parte: la sera dopo il runner riparte dall'alerts.json di main.
// Scenario B (evento annullato ma rinviato): nel registro c'è un invio fallito di un evento che dopo il ricalcolo
//   non esiste più. reconcile() lo segna come annullato, ma il ciclo dei «riprova» lo rimanda lo stesso.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const WORK = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'qa-alert-')));
const FILES = ['scripts/send_alerts.js', 'js/signals.js', 'js/metrics.js', 'data/breadth.json', 'data/sectors.json', 'config/thresholds.json'];

function sandbox(name, alerts) {
  const dir = path.join(WORK, name);
  fs.rmSync(dir, { recursive: true, force: true });
  for (const f of FILES) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(dir, f)); }
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(dir, 'data/alerts.json'), JSON.stringify(alerts, null, 1));
  return dir;
}
function night(dir, label, fail = '') {
  const log = path.join(dir, `telegram-${label}.jsonl`);
  fs.writeFileSync(log, '');
  let code = 0;
  try {
    execFileSync(process.execPath, ['--import', path.join(HERE, 'mock-telegram.mjs'), path.join(dir, 'scripts/send_alerts.js')], {
      env: { ...process.env, TELEGRAM_BOT_TOKEN: 'token-finto', TELEGRAM_CHAT_ID: '1', MOCK_LOG: log, MOCK_FAIL: fail }, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) { code = e.status; }
  const sent = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(`  ${label}: uscita ${code}`);
  for (const s of sent) console.log(`    chiamata ${s.chiamata} (${s.esito}): ${s.testo}`);
  return { code, sent };
}

const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/alerts.json'), 'utf8'));

console.log('Scenario A: un invio fallito, il registro non si pubblica, la sera dopo il messaggio già arrivato riparte');
{
  const before = { checkedThrough: '2026-09-24', thresholds: real.thresholds, log: [] }; // XLU zona blu 25/09 e trigger 12/10 da inviare
  const dir = sandbox('A', before);
  const n1 = night(dir, 'sera 1 (prima chiamata HTTP 500)', '1');
  const after1 = JSON.parse(fs.readFileSync(path.join(dir, 'data/alerts.json'), 'utf8'));
  console.log(`  registro scritto dalla sera 1: ${after1.log.map((e) => `${e.date} ${e.sector} ${e.code} telegram=${e.telegram}${e.failed ? ' failed' : ''}`).join('; ')}`);
  console.log(`  il workflow non lo pubblica (uscita ${n1.code} → outcome 'failure'): la sera 2 riparte dal registro di main`);
  fs.writeFileSync(path.join(dir, 'data/alerts.json'), JSON.stringify(before, null, 1));
  const n2 = night(dir, 'sera 2 (Telegram funziona)');
  const twice = n1.sent.filter((s) => s.esito === 'ok').filter((s) => n2.sent.some((t) => t.testo === s.testo));
  console.log(`  ESITO A: ${twice.length} messaggi arrivati due volte${twice.length ? ': ' + twice.map((s) => s.testo).join(' / ') : ''}`);

  // controprova: con il registro della sera 1 pubblicato, la sera 2 riprova solo l'invio fallito
  fs.writeFileSync(path.join(dir, 'data/alerts.json'), JSON.stringify(after1, null, 1));
  const n3 = night(dir, 'controprova: sera 2 con il registro della sera 1');
  console.log(`  controprova: ${n3.sent.length} messaggi: il trigger già arrivato non riparte (la zona blu fallita del 25/09 è fuori dalle 5 sedute dei riprova)`);
}

console.log('\nScenario B: invio fallito di un evento poi annullato dal ricalcolo');
{
  const ghost = { date: '2026-10-16', sector: 'XLK', code: 'setup', text: 'evento che il ricalcolo ha tolto', telegram: false, failed: true };
  const dir = sandbox('B', { ...real, log: [...real.log, ghost] });
  const n = night(dir, 'sera con Telegram funzionante');
  const after = JSON.parse(fs.readFileSync(path.join(dir, 'data/alerts.json'), 'utf8'));
  const g = after.log.find((e) => e.date === ghost.date && e.sector === ghost.sector);
  console.log(`  registro: ${JSON.stringify(g)}`);
  console.log(`  ESITO B: ${n.sent.length} messaggi per un evento che non esiste più (atteso: 0, non era mai stato inviato)`);
}
