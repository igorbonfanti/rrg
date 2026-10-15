/*
 * members.js — liste dei membri degli indici della pagina Indici, con i simboli di Yahoo.
 * Fonti: tabelle di Wikipedia (wikitext), CSV dei pesi di Nikkei, holdings di iShares (EXSA per lo
 * STOXX Europe 600) e API di Nasdaq per il Nasdaq-100. Ogni lettore restituisce un array di simboli;
 * la validazione (numero di titoli, sovrapposizione con l'ultima lista buona) sta in fetch_indices.js.
 */

// Divide `s` su `sep` fuori da [[...]] e {{...}}
export function splitTop(s, sep) {
  const out = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '[[' || two === '{{') { depth++; cur += two; i++; continue; }
    if ((two === ']]' || two === '}}') && depth > 0) { depth--; cur += two; i++; continue; }
    if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

// Testo di una cella: senza attributi (style=…|), note, link e modelli ({{NYSE link|MMM}} → MMM)
export function cellText(raw) {
  let s = raw.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  const parts = splitTop(s, '|');
  if (parts.length > 1 && /=/.test(parts[0]) && !/[[{]/.test(parts[0])) s = parts.slice(1).join('|');
  else if (parts.length > 1 && parts[0].trim() === '') s = parts.slice(1).join('|');
  s = s.replace(/\{\{([^{}]*)\}\}/g, (m, inner) => { const p = inner.split('|'); return p.length > 1 ? p[p.length - 1] : ''; });
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  return s.replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Colonna `col` (regex sull'intestazione) della prima tabella di wikitext che la contiene.
 * @returns {string[]|null}
 */
export function wikiColumn(text, col) {
  const tables = text.split(/^\{\|/m).slice(1).map((t) => t.split(/^\|\}/m)[0]);
  for (const t of tables) {
    const rows = t.split(/^\|-.*$/m).map((r) => r.split('\n').filter((l) => /^[|!]/.test(l)));
    let header = null, idx = -1;
    const out = [];
    for (const lines of rows) {
      if (!lines.length) continue;
      const cells = [];
      for (const l of lines) {
        const body = l.slice(1).replace(/^\|/, '');
        const sep = l[0] === '!' && l.includes('!!') ? '!!' : '||';
        for (const c of splitTop(body, sep)) cells.push(c);
      }
      if (!header && lines.every((l) => l[0] === '!')) {
        header = cells.map(cellText);
        idx = header.findIndex((h) => col.test(h));
        if (idx < 0) break;
        continue;
      }
      if (header && cells.length > idx) out.push(cellText(cells[idx]));
    }
    if (idx >= 0 && out.length) return out;
  }
  return null;
}

const dash = (s) => s.replace(/\./g, '-');
export const PARSERS = {
  // Dow Jones: colonna Symbol, {{NYSE link|MMM}}
  DJI: (text) => wikiColumn(text, /^Symbol$/i).map((s) => dash(s.toUpperCase())),
  // DAX: {{FWB link|ADS.DE}}, già con il suffisso di Yahoo
  DAX: (text) => wikiColumn(text, /^Ticker$/i).map((s) => s.toUpperCase()),
  // CAC 40: AC.PA, MT.AS
  CAC: (text) => wikiColumn(text, /^Ticker$/i).map((s) => s.toUpperCase()),
  // SMI: {{SWX3|NOVN}} → NOVN.SW
  SMI: (text) => wikiColumn(text, /^Ticker$/i).map((s) => dash(s.toUpperCase()) + '.SW'),
  // FTSE 100: BT.A → BT-A.L, RR. → RR.L
  UKX: (text) => wikiColumn(text, /^Ticker$/i).map((s) => dash(s.toUpperCase().replace(/\.$/, '')) + '.L'),
};

// Nikkei 225: CSV ufficiale dei pesi (Shift-JIS), colonna Code → 7203.T
export function parseNikkei(buf) {
  const text = new TextDecoder('shift_jis').decode(buf);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  const k = head.indexOf('Code');
  if (k < 0) return null;
  return lines.slice(1).map((l) => l.split(',')[k].replace(/"/g, '').trim()).filter((c) => /^[0-9A-Z]{4}$/.test(c)).map((c) => c + '.T');
}

// STOXX Europe 600: holdings di iShares EXSA (CSV tedesco), azioni con il suffisso della borsa
const EXSA_SUFFIX = {
  'London Stock Exchange': '.L', 'Nyse Euronext - Euronext Paris': '.PA', 'Xetra': '.DE', 'SIX Swiss Exchange': '.SW',
  'Nasdaq Omx Nordic': '.ST', 'Borsa Italiana': '.MI', 'Euronext Amsterdam': '.AS', 'Bolsa De Madrid': '.MC',
  'Omx Nordic Exchange Copenhagen A/S': '.CO', 'Oslo Bors Asa': '.OL', 'Nasdaq Omx Helsinki Ltd.': '.HE',
  'Warsaw Stock Exchange/Equities/Main Market': '.WA', 'Nyse Euronext - Euronext Brussels': '.BR',
  'Athens Exchange S.A. Cash Market': '.AT', 'Wiener Boerse Ag': '.VI', 'Irish Stock Exchange - All Market': '.IR',
  'Nyse Euronext - Euronext Lisbon': '.LS', 'Deutsche Börse AG': '.DE',
};
export function parseExsa(text, parseCSV) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('Emittententicker'));
  if (h < 0) return null;
  const rows = parseCSV(lines.slice(h).join('\n'));
  const out = [];
  for (const r of rows) {
    if (r.Anlageklasse !== 'Aktien') continue;
    const suf = EXSA_SUFFIX[r['Börse']];
    if (!suf) return null; // borsa nuova: meglio tenere l'ultima lista buona
    out.push(r.Emittententicker.trim().replace(/\.$/, '').replace(/ /g, '-').replace(/\./g, '-') + suf);
  }
  return out;
}

// Nasdaq-100: API di nasdaq.com
export function parseNasdaq(json) {
  const rows = json && json.data && json.data.data && json.data.data.rows;
  return Array.isArray(rows) ? rows.map((r) => dash(String(r.symbol).trim().toUpperCase())) : null;
}

export const SOURCES = {
  NDX: { url: 'https://api.nasdaq.com/api/quote/list-type/nasdaq100', kind: 'nasdaq', min: 98, max: 104,
    headers: { Accept: 'application/json', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' } },
  DJI: { wiki: 'List_of_Dow_Jones_Industrial_Average_companies', min: 30, max: 30 },
  N225: { url: 'https://indexes.nikkei.co.jp/nkave/archives/file/nikkei_stock_average_weight_en.csv', kind: 'nikkei', min: 225, max: 225 },
  SXXP: { url: 'https://www.ishares.com/de/privatanleger/de/produkte/251931/x/latest-holdings.csv', kind: 'exsa', min: 580, max: 620 },
  UKX: { wiki: 'FTSE_100_Index', min: 99, max: 102 },
  DAX: { wiki: 'DAX', min: 40, max: 40 },
  CAC: { wiki: 'CAC_40', min: 40, max: 40 },
  SMI: { wiki: 'Swiss_Market_Index', min: 20, max: 20 },
};
