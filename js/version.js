/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.2';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Managed futures («Trend», DBMFE.PA) nella rotazione Asset class, con peso 0 nel portafoglio: si prova con i cursori',
  'Tornano i nomi RS-Ratio e RS-Momentum nella rotazione',
  'Perché questo stato e cosa manca; cambi dall\'ultima visita; Monitor a schede sul telefono',
];
