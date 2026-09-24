/*
 * calendar.js — calendario delle sedute NYSE (festività di borsa regolari).
 * Modulo condiviso: lo usano sia il browser sia gli script della GitHub Action.
 *
 * Serve per sapere qual è l'ultima seduta chiusa "attesa" in un certo istante e
 * quante sedute mancano ai dati scaricati. Le chiusure straordinarie (lutti
 * nazionali, eventi eccezionali) non sono prevedibili: in quei giorni il ritardo
 * risulta di una seduta in più, ed è solo un avviso.
 */

const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const utc = (iso) => new Date(iso + 'T00:00:00Z');
const toIso = (dt) => dt.toISOString().slice(0, 10);
const weekday = (iso) => utc(iso).getUTCDay(); // 0 = domenica

// Pasqua (algoritmo gregoriano anonimo)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(y, month, day);
}

// n-esimo giorno della settimana `wd` del mese (n = -1 per l'ultimo)
function nthWeekday(y, m, wd, n) {
  if (n > 0) {
    const first = weekday(isoDate(y, m, 1));
    return isoDate(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7);
  }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lw = weekday(isoDate(y, m, last));
  return isoDate(y, m, last - ((lw - wd + 7) % 7));
}

// festività fissa spostata: sabato → venerdì prima, domenica → lunedì dopo
function observed(y, m, d) {
  const iso = isoDate(y, m, d), wd = weekday(iso);
  const dt = utc(iso);
  if (wd === 6) dt.setUTCDate(dt.getUTCDate() - 1);
  if (wd === 0) dt.setUTCDate(dt.getUTCDate() + 1);
  return toIso(dt);
}

const cache = new Map();
export function holidays(y) {
  if (cache.has(y)) return cache.get(y);
  const set = new Set();
  // Capodanno: se cade di sabato la borsa non recupera il venerdì precedente
  if (weekday(isoDate(y, 1, 1)) !== 6) set.add(observed(y, 1, 1));
  set.add(nthWeekday(y, 1, 1, 3)); // Martin Luther King Jr. Day
  set.add(nthWeekday(y, 2, 1, 3)); // Washington's Birthday
  const gf = utc(easter(y)); gf.setUTCDate(gf.getUTCDate() - 2); set.add(toIso(gf)); // Venerdì santo
  set.add(nthWeekday(y, 5, 1, -1)); // Memorial Day
  if (y >= 2022) set.add(observed(y, 6, 19)); // Juneteenth
  set.add(observed(y, 7, 4)); // Independence Day
  set.add(nthWeekday(y, 9, 1, 1)); // Labor Day
  set.add(nthWeekday(y, 11, 4, 4)); // Thanksgiving
  set.add(observed(y, 12, 25)); // Natale
  cache.set(y, set);
  return set;
}

export function isTradingDay(iso) {
  const wd = weekday(iso);
  return wd !== 0 && wd !== 6 && !holidays(+iso.slice(0, 4)).has(iso);
}

export function prevTradingDay(iso) {
  const dt = utc(iso);
  do dt.setUTCDate(dt.getUTCDate() - 1); while (!isTradingDay(toIso(dt)));
  return toIso(dt);
}

// La seduta successiva a `iso` cade nella stessa settimana? (settimana in corso, dato provvisorio)
export function weekHasMoreSessions(iso) {
  const dt = utc(iso);
  const wd = dt.getUTCDay();
  for (let k = 1; k <= 6 - wd; k++) {
    const n = new Date(dt); n.setUTCDate(dt.getUTCDate() + k);
    if (isTradingDay(toIso(n))) return true;
  }
  return false;
}

// Data e ora correnti a New York
export function nyNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: +parts.hour * 60 + +parts.minute };
}

// Ultima seduta chiusa attesa: oggi se è una seduta ed è passata l'ora di pubblicazione, altrimenti la precedente.
export function expectedSession(now = new Date(), publishAfterMinutes = 16 * 60 + 30) {
  const { date, minutes } = nyNow(now);
  if (isTradingDay(date) && minutes >= publishAfterMinutes) return date;
  return prevTradingDay(date);
}

// Sedute tra `from` (esclusa) e `to` (inclusa)
export function sessionsBetween(from, to) {
  if (from >= to) return 0;
  let n = 0;
  const dt = utc(from);
  while (true) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    const iso = toIso(dt);
    if (iso > to) return n;
    if (isTradingDay(iso)) n++;
  }
}
