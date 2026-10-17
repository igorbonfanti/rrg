/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.7.2';
export const RELEASE = '2026-10-17';
export const NOTES = [
  'Comandi «XLK TIT» e indirizzi #tit-XLK; la scelta del settore nella vista 7 entra nella cronologia',
  'Bottom Map: zona blu del colore giusto nel tema chiaro, pallini interi sul bordo; legenda e tabelle più leggibili',
  'Aggiornamento notturno più robusto: avvisi quando una fonte resta ferma, alert Telegram riprovati, niente commit vuoti',
];
