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
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  return s.replace(/<[^>]+>/g, ' ').replace(/'''?/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Colonna `col` (regex sull'intestazione) della prima tabella di wikitext che la contiene.
 * @returns {string[]|null}
 */
export function wikiColumn(text, col, raw = false) {
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
      if (header && cells.length > idx) out.push(raw ? cells[idx].trim() : cellText(cells[idx]));
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
  // FTSE MIB e IBEX 35: A2A.MI, ACS.MC (IBEX con il link alla scheda di Borsa di Madrid)
  FTSEMIB: (text) => wikiColumn(text, /^Ticker$/i).map((s) => s.toUpperCase()),
  IBEX: (text) => wikiColumn(text, /^Ticker$/i).map((s) => s.toUpperCase()),
  // Euro Stoxx 50: ADS.DE, ADYEN.AS
  SX5E: (text) => wikiColumn(text, /^Ticker$/i).map((s) => s.toUpperCase()),
  // Hang Seng: {{SEHK|5}} → 0005.HK
  HSI: (text) => wikiColumn(text, /^Ticker$/i, true).map((c) => { const m = c.match(/SEHK\|\s*(\d+)/); return m ? m[1].padStart(4, '0') + '.HK' : null; }).filter(Boolean),
  // KOSPI 200: 090430 → 090430.KS
  KOSPI200: (text) => wikiColumn(text, /^Symbol$/i).filter((s) => /^[0-9A-Z]{6}$/.test(s)).map((s) => s + '.KS'), // anche i codici nuovi alfanumerici (0126Z0)
  // S&P/TSX 60: {{TSX link|BIP.UN}} → BIP-UN.TO
  TSX60: (text) => wikiColumn(text, /^Symbol$/i).map((s) => dash(s.toUpperCase()) + '.TO'),
  // Nifty 50: ADANIENT → ADANIENT.NS (la prima tabella con la colonna Symbol: quella dei membri)
  NIFTY50: (text) => wikiColumn(text, /^Symbol$/i).map((s) => s.toUpperCase() + '.NS'),
  // CSI 300: {{SSE|600519}} → 600519.SS, {{SZSE|000858}} → 000858.SZ
  CSI300: (text) => wikiColumn(text, /^Ticker$/i, true).map((c) => { const m = c.match(/(SSE|SZSE)\|\s*(\d{6})/); return m ? m[2] + (m[1] === 'SSE' ? '.SS' : '.SZ') : null; }).filter(Boolean),
  // S&P/ASX 200: 360 → 360.AX
  ASX200: (text) => wikiColumn(text, /^Code$/i).map((s) => s.split('|').pop().trim().toUpperCase() + '.AX'), // qualche riga è scritta «|FPH|FPH»
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

// Holdings di un ETF iShares USA (CSV): azioni con il simbolo di Yahoo. `suffix`: borsa → suffisso
// (null = titoli USA, dove punti e spazi diventano trattini: BRK.B → BRK-B, MOG A → MOG-A)
const ISHARES_SUFFIX = {
  'Shanghai Stock Exchange': '.SS', 'Shenzhen Stock Exchange': '.SZ', 'National Stock Exchange Of India': '.NS', 'Bse Ltd': '.BO',
  'Hong Kong Exchanges And Clearing Ltd': '.HK', 'Korea Exchange (Stock Market)': '.KS', 'Korea Exchange (Kosdaq)': '.KQ',
  'Taiwan Stock Exchange': '.TW', 'Gretai Securities Market': '.TWO', 'XBSP': '.SA', 'Saudi Stock Exchange': '.SR',
  'Johannesburg Stock Exchange': '.JO', 'Bolsa Mexicana De Valores': '.MX', 'Bursa Malaysia': '.KL', 'Stock Exchange Of Thailand': '.BK',
  'Warsaw Stock Exchange/Equities/Main Market': '.WA', 'Istanbul Stock Exchange': '.IS', 'Qatar Exchange': '.QA',
  'Athens Exchange S.A. Cash Market': '.AT', 'Santiago Stock Exchange': '.SN', 'Abu Dhabi Securities Exchange': '.AD',
  'Dubai Financial Market': '.AE', 'Indonesia Stock Exchange': '.JK', 'Philippine Stock Exchange Inc.': '.PS', 'Kuwait Stock Exchange': '.KW',
  'NASDAQ': '', 'NYSE': '', 'Budapest Stock Exchange': '.BD', 'Bolsa De Valores De Colombia': '.CL', 'Prague Stock Exchange': '.PR',
  'Egyptian Exchange': '.CA', 'Standard-Classica-Forts': '.ME',
};
export function parseIShares(text, parseCSV, foreign = false) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('Ticker,'));
  if (h < 0) return null;
  const out = [];
  for (const r of parseCSV(lines.slice(h).join('\n'))) {
    if (r['Asset Class'] !== 'Equity') continue;
    let t = (r.Ticker || '').trim();
    if (!t || t === '-') continue;
    if (!foreign) { out.push(t.replace(/[ .]/g, '-').toUpperCase()); continue; }
    const suf = ISHARES_SUFFIX[r.Exchange];
    if (suf == null) continue; // borsa senza suffisso noto: il titolo resta fuori
    if (suf === '.HK') t = t.padStart(4, '0');
    if (suf === '.BK') t = t.replace(/\.R$/, '');
    if (suf === '.IS') t = t.replace(/\.E$/, '');
    t = ['', '.SN', '.MX', '.NS', '.BO'].includes(suf) ? t.replace(/[ .]/g, '-').replace(/\*$/, '') : t.replace(/ /g, '-'); // BAJAJ.AUTO → BAJAJ-AUTO.NS
    out.push(t + suf);
  }
  return [...new Set(out)]; // lo stesso titolo può comparire su due righe (es. con un diritto)
}

// Ibovespa: portafoglio del giorno di B3 (campo cod) → ABEV3.SA
export function parseB3(json) {
  const rows = json && json.results;
  return Array.isArray(rows) ? rows.map((r) => String(r.cod).trim().toUpperCase() + '.SA') : null;
}
const B3_QUERY = Buffer.from(JSON.stringify({ language: 'en-us', pageNumber: 1, pageSize: 120, index: 'IBOV', segment: '1' })).toString('base64');

// Nasdaq-100: API di nasdaq.com
export function parseNasdaq(json) {
  const rows = json && json.data && json.data.data && json.data.data.rows;
  return Array.isArray(rows) ? rows.map((r) => dash(String(r.symbol).trim().toUpperCase())) : null;
}

export const SOURCES = {
  NDX: { url: 'https://api.nasdaq.com/api/quote/list-type/nasdaq100', kind: 'nasdaq', min: 98, max: 104,
    // l'API rifiuta gli User-Agent che non sembrano un browser
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' } },
  DJI: { wiki: 'List_of_Dow_Jones_Industrial_Average_companies', min: 30, max: 30 },
  N225: { url: 'https://indexes.nikkei.co.jp/nkave/archives/file/nikkei_stock_average_weight_en.csv', kind: 'nikkei', min: 225, max: 225 },
  SXXP: { url: 'https://www.ishares.com/de/privatanleger/de/produkte/251931/x/latest-holdings.csv', kind: 'exsa', min: 580, max: 620 },
  UKX: { wiki: 'FTSE_100_Index', min: 99, max: 102 },
  DAX: { wiki: 'DAX', min: 40, max: 40 },
  CAC: { wiki: 'CAC_40', min: 40, max: 40 },
  SMI: { wiki: 'Swiss_Market_Index', min: 20, max: 20 },
  // indici con limiti (F4)
  RUT: { url: 'https://www.ishares.com/us/products/239710/x/latest-holdings.csv', kind: 'ishares', min: 1850, max: 2100 },
  EEM: { url: 'https://www.ishares.com/us/products/239637/x/latest-holdings.csv', kind: 'ishares', foreign: true, min: 1000, max: 1400 },
  TWN: { url: 'https://www.ishares.com/us/products/239686/x/latest-holdings.csv', kind: 'ishares', foreign: true, min: 60, max: 100 },
  FTSEMIB: { wiki: 'FTSE_MIB', min: 40, max: 40 },
  IBEX: { wiki: 'IBEX_35', min: 34, max: 36 },
  SX5E: { wiki: 'EURO_STOXX_50', min: 50, max: 50 },
  HSI: { wiki: 'Hang_Seng_Index', min: 75, max: 110 },
  KOSPI200: { wiki: 'KOSPI_200', min: 195, max: 205 },
  TSX60: { wiki: 'S%26P/TSX_60', min: 58, max: 62 },
  NIFTY50: { wiki: 'NIFTY_50', min: 50, max: 51 },
  CSI300: { wiki: 'CSI_300_Index', min: 295, max: 305 },
  ASX200: { wiki: 'S%26P/ASX_200', min: 190, max: 205 },
  IBOV: { url: `https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/${B3_QUERY}`, kind: 'b3', min: 70, max: 95 },
};
