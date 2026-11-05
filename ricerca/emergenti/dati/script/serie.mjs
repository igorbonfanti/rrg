// Elenco delle serie controllate dalla verifica dati della vista «Emergenti» (usato da scarica.mjs e analisi.mjs).
// Fonti ammesse nell'app: Yahoo Finance (prezzi) e FRED. Nessun dato TradingView.

// Cambi su Yahoo: valuta locale per 1 dollaro (CNY=X = yuan per dollaro), salvo DX-Y.NYB (indice del dollaro ICE)
export const YAHOO_FX = ['CNY=X', 'CNH=X', 'INR=X', 'BRL=X', 'KRW=X', 'TWD=X', 'MXN=X', 'ZAR=X', 'HKD=X'];
export const YAHOO_USD = ['DX-Y.NYB'];
// ETF in dollari (NYSE Arca / Nasdaq)
export const YAHOO_ETF = ['EEM', 'MCHI', 'INDA', 'EWZ', 'EWY', 'EWT', 'EWW', 'EZA', 'ACWI'];
// Prezzi degli indici emergenti dell'app (config/indices.json), per il confronto con data/indices*.json,
// più l'indice CSI 300 e lo Shanghai Composite per il problema del CSI 300 fermo
export const YAHOO_APP = ['510300.SS', '^NSEI', '^BVSP', '^KS11', '^TWII', '^HSI', '000300.SS', '000001.SS'];

// FRED: H.10 della Federal Reserve (valuta per dollaro, mezzogiorno di New York), indici del dollaro, rendimento reale
export const FRED = ['DEXCHUS', 'DEXINUS', 'DEXBZUS', 'DEXKOUS', 'DEXTAUS', 'DEXMXUS', 'DEXSFUS', 'DEXHKUS',
  'DTWEXEMEGS', 'DTWEXBGS', 'DFII10'];

// Coppie Yahoo ↔ FRED per lo stesso cambio (stessa quotazione: valuta locale per dollaro)
export const PAIRS = [
  ['CNY=X', 'DEXCHUS'], ['CNH=X', 'DEXCHUS'], ['INR=X', 'DEXINUS'], ['BRL=X', 'DEXBZUS'], ['KRW=X', 'DEXKOUS'],
  ['TWD=X', 'DEXTAUS'], ['MXN=X', 'DEXMXUS'], ['ZAR=X', 'DEXSFUS'], ['HKD=X', 'DEXHKUS'],
];

// Indici emergenti dell'app: chiave in data/indices*.json → simbolo di prezzo (config/indices.json)
export const APP_EM = { CSI300: '510300.SS', NIFTY50: '^NSEI', IBOV: '^BVSP', KOSPI200: '^KS11', TWN: '^TWII', HSI: '^HSI', EEM: 'EEM' };

export const fileName = (sym) => sym.replace(/[^A-Za-z0-9.-]/g, '_');
