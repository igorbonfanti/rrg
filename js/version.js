/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.6';
export const RELEASE = '2026-10-18';
export const NOTES = [
  'Vista 7: la storia della divergenza compare anche se il browser aveva il file dei titoli vecchio',
  '«Nuova versione» riscarica anche i dati; titoli, indici e prezzi della rotazione sempre aggiornati',
  'Vista 7: storia della divergenza grandi/piccoli nelle ultime 52 settimane',
];
