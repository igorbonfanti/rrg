/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Dalla 1.0.0 semver: la prima cifra per un cambio che
 * rompe qualcosa (regole, formati dei dati), la seconda per una funzione nuova, l'ultima per le correzioni. Prima della 1.0
 * lo schema era 0.vista.correzione.
 */
export const VERSION = '1.1.0';
export const RELEASE = '2026-10-31';
export const NOTES = [
  'Settore: nel grafico della breadth una fascia gialla dal livello blu a 10 punti sopra, la parte di breadth dello stato Attenzione',
];
