#!/usr/bin/env node
/*
 * send_alerts.js — dopo l'aggiornamento dei dati, individua i nuovi cambi di stato dei settori e delle industrie
 * (ingresso in zona blu, trigger, segnale fallito) e li invia su Telegram.
 *
 * Usa le stesse regole dell'app (js/signals.js) con i livelli di config/thresholds.json.
 * Telegram è attivo solo se esistono i segreti TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID;
 * altrimenti gli eventi vengono solo registrati in data/alerts.json.
 * Alla prima esecuzione registra lo stato senza inviare lo storico.
 *
 * Industrie (config/industries.json, oggi il SOXX): stessi eventi e stesse regole, sul calendario e con la seduta di
 * data/industries.json; nel messaggio il nome «Semiconduttori (SOXX, industria)» e il link #SOXX. Ogni industria ha la
 * sua data di controllo in alerts.json (industries.<chiave>.checkedThrough): la prima volta che compare si registra lo
 * stato senza inviare gli eventi passati. Se industries.json manca o non ha la serie, l'industria si salta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breadthSeries, priceSeries, runMachine, SECTOR_KEYS } from '../js/signals.js';
import { decodeDates } from '../js/indexdata.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf-8'));
const APP_URL = process.env.APP_URL || 'https://igorbonfanti.github.io/rrg/';
const NAMES = {
  XLK: 'Technology', XLC: 'Communication Services', XLY: 'Consumer Discretionary', XLP: 'Consumer Staples',
  XLE: 'Energy', XLF: 'Financials', XLV: 'Health Care', XLI: 'Industrials', XLB: 'Materials', XLRE: 'Real Estate', XLU: 'Utilities',
};
const LABEL = { setup: '▼ ZONA BLU', trig: '▲ TRIGGER', fail: '✕ SEGNALE FALLITO' };
const dIT = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const escHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Tutti gli eventi di tutti i settori, in ordine di data
export function collectEvents(breadth, sectors, cfg) {
  const out = [];
  for (const s of SECTOR_KEYS) {
    const m = runMachine(priceSeries(sectors.adjclose[s]), breadthSeries(breadth, s, sectors.dates), cfg.blue[s], cfg.params);
    for (const e of m.events) out.push({ date: sectors.dates[e.t], sector: s, code: e.code, text: e.text });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Nome di un'industria nei messaggi: «Semiconduttori (SOXX, industria)»
export const industryTitle = (k, conf) => `${(conf && conf.label) || k} (${k}, industria)`;

// Eventi delle industrie sul calendario di data/industries.json (prezzo dell'ETF rettificato e breadth del file)
export function collectIndustryEvents(ind, cfg, keys) {
  const dates = decodeDates(ind.dates.d0, ind.dates.gaps), out = [];
  for (const k of keys) {
    const x = ind.series && ind.series[k];
    if (!x || cfg.blue[k] == null) continue;
    const m = runMachine(priceSeries(x.adjclose), breadthSeries({ dates, series: { [k]: x.breadth } }, k, dates), cfg.blue[k], cfg.params);
    for (const e of m.events) out.push({ date: dates[e.t], sector: k, code: e.code, text: e.text });
  }
  return { dates, events: out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)) };
}

// La breadth delle ultime sedute viene ricalcolata (fetch_breadth.js, RECOMPUTE = 5): un evento può
// comparire con una data già controllata. Si confrontano quindi gli eventi delle ultime `recheck`
// sedute con quelli già registrati, oltre a quelli successivi all'ultimo controllo.
export function newEvents(events, state, dates, asOf, recheck = 6) {
  if (!state) return [];
  const key = (e) => `${e.date}|${e.sector}|${e.code}`;
  const logged = new Set((state.log || []).map(key));
  const upTo = dates.filter((d) => d <= asOf);
  const from = upTo[Math.max(0, upTo.length - recheck)];
  return events.filter((e) => e.date <= asOf && !logged.has(key(e)) && (e.date > state.checkedThrough || e.date >= from));
}

// Rettifiche: un evento già registrato nelle ultime `recheck` sedute che dopo il ricalcolo non c'è più. Se tra i nuovi
// ce n'è uno dello stesso settore e tipo, l'evento si è spostato di data (il nuovo messaggio lo dice); altrimenti
// è sparito e si manda un messaggio di annullamento. Restituisce gli eventi annullati.
export function reconcile(fresh, events, state, dates, asOf, recheck = 6) {
  if (!state) return [];
  const key = (e) => `${e.date}|${e.sector}|${e.code}`;
  const now = new Set(events.map(key));
  const upTo = dates.filter((d) => d <= asOf), from = upTo[Math.max(0, upTo.length - recheck)];
  const gone = (state.log || []).filter((e) => e.date >= from && e.date <= asOf && !e.retracted && !now.has(key(e)));
  const cancelled = [];
  for (const old of gone) {
    const moved = fresh.find((e) => e.sector === old.sector && e.code === old.code && !e.moved);
    if (moved) { moved.moved = old.date; old.retracted = moved.date; } else { old.retracted = true; cancelled.push(old); }
  }
  return cancelled;
}

// un invio fallito si riprova per 5 sedute, poi resta solo nel registro
export function retryFrom(dates, asOf, sessions = 5) {
  const upTo = dates.filter((d) => d <= asOf);
  return upTo[Math.max(0, upTo.length - sessions)];
}

// title: nome dell'industria (industryTitle); per i settori «XLU Utilities»
const head = (e, title) => (title ? escHtml(title) : `${e.sector} ${escHtml(NAMES[e.sector] || '')}`);
export function formatMessage(e, title) {
  const fix = e.moved ? `\n↻ Rettifica: spostato dal ${dIT(e.moved)} al ${dIT(e.date)} dopo il ricalcolo delle ultime sedute` : '';
  return `<b>${LABEL[e.code]}</b> · ${head(e, title)}\n${dIT(e.date)} · ${escHtml(e.text)}${fix}\n${APP_URL}#${e.sector}`;
}
export function formatCancel(e, title) {
  return `<b>↻ RETTIFICA</b> · ${head(e, title)}\n${LABEL[e.code]} del ${dIT(e.date)} annullato: dopo il ricalcolo delle ultime sedute non risulta più.\n${APP_URL}#${e.sector}`;
}

/**
 * Eventi da inviare, gruppo per gruppo: i settori (calendario di sectors.json, data di controllo checkedThrough) e ogni
 * industria (calendario di industries.json, data di controllo industries.<chiave>.checkedThrough). Ogni gruppo vede
 * solo le righe del registro delle sue chiavi, così le rettifiche di un gruppo non toccano gli eventi degli altri.
 * Un'industria senza data di controllo (prima sera con quella chiave) registra lo stato senza inviare lo storico.
 * @param {object|null} state data/alerts.json pubblicato
 * @param {{keys: string[], industry?: boolean, events: object[], dates: string[], asOf: string}[]} groups
 * @returns {object[]} i gruppi con fresh (nuovi), cancelled (annullati), retry (invii falliti da riprovare), first
 */
export function planGroups(state, groups) {
  return groups.map((g) => {
    const checked = !state ? null : g.industry ? ((state.industries || {})[g.keys[0]] || {}).checkedThrough : state.checkedThrough;
    const sub = checked ? { checkedThrough: checked, log: (state.log || []).filter((e) => g.keys.includes(e.sector)) } : null;
    const fresh = newEvents(g.events, sub, g.dates, g.asOf);
    const cancelled = reconcile(fresh, g.events, sub, g.dates, g.asOf);
    // invii falliti nelle sere scorse: si riprovano finché l'evento è recente, non un evento annullato dal ricalcolo
    const retry = sub ? sub.log.filter((e) => e.failed && !e.retracted && e.date >= retryFrom(g.dates, g.asOf)) : [];
    return { ...g, fresh, cancelled, retry, first: !checked };
  });
}

async function sendTelegram(token, chat, text) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function main() {
  const breadth = read('data/breadth.json'), sectors = read('data/sectors.json'), cfg = read('config/thresholds.json');
  const file = path.join(ROOT, 'data', 'alerts.json');
  const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
  const asOf = [breadth.asOf, sectors.asOf].sort()[0];
  const groups = [{ keys: SECTOR_KEYS, events: collectEvents(breadth, sectors, cfg).filter((e) => e.date <= asOf), dates: sectors.dates, asOf }];
  // industrie: un file mancante o rotto non ferma gli alert dei settori
  let ind = null, indCfg = {};
  try { indCfg = read('config/industries.json').industries || {}; ind = read('data/industries.json'); } catch (e) { console.log(`::warning::Industrie senza alert: ${e.message}`); }
  if (ind) {
    for (const k of Object.keys(indCfg)) {
      const at = (ind.latest && ind.latest[k] && ind.latest[k].asOf) || ind.asOf;
      if (!ind.series || !ind.series[k] || cfg.blue[k] == null || !at) { console.log(`::warning::${k}: industria senza serie o senza livello blu, nessun alert`); continue; }
      // un file con la struttura sbagliata ferma solo gli alert di quell'industria, non quelli dei settori
      try {
        const { dates, events } = collectIndustryEvents(ind, cfg, [k]);
        groups.push({ keys: [k], industry: true, title: industryTitle(k, indCfg[k]), events: events.filter((e) => e.date <= at), dates, asOf: at });
      } catch (e) { console.log(`::warning::${k}: dati dell'industria illeggibili (${e.message}), nessun alert`); }
    }
  }
  const plan = planGroups(state, groups);
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  const sent = [], fresh = [];
  let failed = 0;
  const send = async (e, text) => {
    try { await sendTelegram(token, chat, text); return true; } catch (err) { console.error(`::warning::Telegram non ha ricevuto ${e.sector} ${e.code} del ${e.date}: ${err.message}`); failed++; return false; }
  };
  if (!state) console.log(`Prima esecuzione: registro lo stato al ${asOf} senza inviare lo storico.`);
  const industries = { ...((state && state.industries) || {}) };
  for (const g of plan) {
    if (g.industry) {
      if (state && g.first) console.log(`${g.keys[0]}: prima volta negli alert, registro lo stato al ${g.asOf} senza inviare lo storico.`);
      industries[g.keys[0]] = { checkedThrough: g.asOf };
    }
    if (token && chat) for (const e of g.retry) if (await send(e, formatMessage(e, g.title))) { e.telegram = true; delete e.failed; console.log(`Inviato in ritardo: ${e.date} ${e.sector} ${e.code}`); }
    for (const e of g.cancelled) {
      console.log(`Annullato dopo il ricalcolo: ${e.date} ${e.sector} ${e.code}`);
      if (token && chat && e.telegram) await send(e, formatCancel(e, g.title)); // si annulla solo ciò che era stato inviato
    }
    for (const e of g.fresh) {
      console.log(`${e.date} ${e.sector} ${e.code}: ${e.text}${e.moved ? ` (spostato dal ${e.moved})` : ''}`);
      if (token && chat && (await send(e, formatMessage(e, g.title)))) sent.push(e);
      fresh.push(e);
    }
  }
  if (fresh.length && !(token && chat)) console.log('Telegram non configurato (segreti TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID): eventi solo registrati.');
  const log = (state ? state.log : []).concat(fresh.map((e) => ({ ...e, telegram: sent.includes(e), ...(token && chat && !sent.includes(e) ? { failed: true } : {}) }))).slice(-200);
  fs.writeFileSync(file, JSON.stringify({ checkedThrough: asOf, thresholds: cfg.blue, ...(Object.keys(industries).length ? { industries } : {}), log }, null, 1));
  console.log(`Alert: ${fresh.length} nuovi eventi (${sent.length} inviati), controllato fino al ${asOf}${Object.keys(industries).length ? `; industrie: ${Object.entries(industries).map(([k, v]) => `${k} al ${v.checkedThrough}`).join(', ')}` : ''}.`);
  if (failed) process.exitCode = 1; // l'esito del workflow lo segnala
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
