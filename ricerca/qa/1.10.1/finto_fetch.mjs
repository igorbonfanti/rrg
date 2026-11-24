// Controllo 1.10.1: fa fallire le richieste a Yahoo per i simboli in FAIL (es. FAIL="GC=F,SI=F") e lascia passare le
// altre. Uso: FAIL=GC=F node --import ./ricerca/qa/1.10.1/finto_fetch.mjs scripts/fetch_ath.js (in una copia del repo)
const fail = (process.env.FAIL || '').split(',').filter(Boolean).map(encodeURIComponent);
const real = globalThis.fetch;
globalThis.fetch = async (url, o) => {
  if (fail.some((s) => String(url).includes(`/chart/${s}?`))) throw new TypeError('rete finta: simbolo bloccato per il test');
  return real(url, o);
};
