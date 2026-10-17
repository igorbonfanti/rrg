/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.3';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Episodi a confronto: dopo una seduta qualsiasi e, per i settori, SPY negli stessi giorni (viste 4, 5 e 6)',
  'Conteggi «5 su 6» al posto delle percentuali sui pochi casi',
  'Managed futures («Trend») nella rotazione Asset class, con peso 0 nel portafoglio',
];
