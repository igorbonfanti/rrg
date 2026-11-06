// Sostituisce fetch per le prove di send_alerts.js: nessuna richiesta esce dal computer.
// MOCK_LOG = file dove scrivere i messaggi «inviati»; MOCK_FAIL = numeri delle chiamate che rispondono HTTP 500 (es. "1").
import fs from 'node:fs';

let n = 0;
globalThis.fetch = async (url, opt = {}) => {
  if (!String(url).startsWith('https://api.telegram.org/')) throw new Error(`rete non permessa nella prova: ${url}`);
  n++;
  const body = JSON.parse(opt.body);
  const fail = (process.env.MOCK_FAIL || '').split(',').filter(Boolean).map(Number).includes(n);
  fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ chiamata: n, esito: fail ? 'HTTP 500' : 'ok', testo: body.text.split('\n').slice(0, 2).join(' | ') }) + '\n');
  return fail ? new Response('{"ok":false,"description":"prova"}', { status: 500 }) : new Response('{"ok":true}', { status: 200 });
};
