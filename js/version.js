/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.9';
export const RELEASE = '2026-10-18';
export const NOTES = [
  'Guida completa: ogni vista e ogni funzione spiegata; si apre dalla guida rapida (tasto ?)',
  'Bottom Map di settori e indici: data scorrevole, replay e crisi passate',
  'Vista 7: storia della divergenza grandi/piccoli',
];
