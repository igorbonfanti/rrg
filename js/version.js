/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.7.1';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Il pulsante «Nuova versione» riscarica tutti i file dell\'app prima di ricaricare',
  'Numero di versione e avviso quando il browser usa file vecchi',
  'Avvicinamento al livello blu anche nella scheda di dettaglio; KOSPI 200 tra gli indici principali',
];
