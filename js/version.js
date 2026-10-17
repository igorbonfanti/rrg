/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.8.0';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Perché questo stato e cosa manca al prossimo: condizioni con ✓ e ✗ nelle viste 4 e 6 e nei settori da osservare',
  'Cosa è cambiato dall\'ultima visita, in cima al Monitor',
  'Monitor a schede sul telefono, spiegazioni al tocco; forza relativa e momentum relativo al posto dei nomi registrati',
];
