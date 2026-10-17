/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.5';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Vista 7: storia della divergenza grandi/piccoli nelle ultime 52 settimane e da quante settimane guida',
  'Caricamento più veloce: il Monitor arriva prima, gli indici in due file',
  'Episodi a confronto con una seduta qualsiasi e con SPY',
];
