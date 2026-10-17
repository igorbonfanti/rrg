/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.4';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Caricamento più veloce: il Monitor arriva prima, i prezzi della rotazione in sottofondo',
  'Pagina Indici: prima i 10 principali, poi gli altri; file più leggeri',
  'Episodi a confronto con una seduta qualsiasi e con SPY',
];
