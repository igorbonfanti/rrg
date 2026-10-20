/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.10';
export const RELEASE = '2026-10-20';
export const NOTES = [
  'Correzioni dal controllo prima della 1.0: frasi sbagliate o rimaste indietro (6 casi su 12, minimo di nov 2008, orari, regola del trigger), statistiche ricalcolabili con uno script, valori di Rea tolti',
  'Dati: una riapertura dopo una lunga sospensione resta un calo vero; le chiusure di una borsa appena chiusa si aspettano un\'ora; asterisco anche negli asset reali; lista dell\'ASX 200 in ritardo detta',
  'File mancanti o incompleti detti in chiaro; comandi KOSPI, NIKKEI, NASDAQ, DOW e altri; etichette dei cali forti dentro il grafico; tocco sull\'ultima seduta; testo più grande sul tablet; tabelle del telefono più strette',
];
