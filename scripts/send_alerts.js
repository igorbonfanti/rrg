#!/usr/bin/env node
/*
 * send_alerts.js — dopo l'aggiornamento dei dati, individua i nuovi cambi di stato dei settori
 * (ingresso in zona blu, trigger, segnale fallito) e li invia su Telegram.
 *
 * Usa le stesse regole dell'app (js/signals.js) con i livelli di config/thresholds.json.
 * Telegram è attivo solo se esistono i segreti TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID;
 * altrimenti gli eventi vengono solo registrati in data/alerts.json.
 * Alla prima esecuzione registra lo stato senza inviare lo storico.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breadthSeries, priceSeries, runMachine, SECTOR_KEYS } from '../js/signals.js';

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

export function formatMessage(e) {
  return `<b>${LABEL[e.code]}</b> · ${e.sector} ${escHtml(NAMES[e.sector] || '')}\n${dIT(e.date)} · ${escHtml(e.text)}\n${APP_URL}#${e.sector}`;
}

async function sendTelegram(token, chat, text) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`Telegram HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

async function main() {
  const breadth = read('data/breadth.json'), sectors = read('data/sectors.json'), cfg = read('config/thresholds.json');
  const file = path.join(ROOT, 'data', 'alerts.json');
  const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
  const asOf = [breadth.asOf, sectors.asOf].sort()[0];
  const events = collectEvents(breadth, sectors, cfg).filter((e) => e.date <= asOf);
  const fresh = newEvents(events, state, sectors.dates, asOf);
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  const sent = [];
  if (!state) console.log(`Prima esecuzione: registro lo stato al ${asOf} senza inviare lo storico.`);
  for (const e of fresh) {
    console.log(`${e.date} ${e.sector} ${e.code}: ${e.text}`);
    if (token && chat) {
      try { await sendTelegram(token, chat, formatMessage(e)); sent.push(e); } catch (err) { console.error(err.message); }
    }
  }
  if (fresh.length && !(token && chat)) console.log('Telegram non configurato (segreti TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID): eventi solo registrati.');
  const log = (state ? state.log : []).concat(fresh.map((e) => ({ ...e, telegram: sent.includes(e) }))).slice(-200);
  fs.writeFileSync(file, JSON.stringify({ checkedThrough: asOf, thresholds: cfg.blue, log }, null, 1));
  console.log(`Alert: ${fresh.length} nuovi eventi (${sent.length} inviati), controllato fino al ${asOf}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(1); });
}
