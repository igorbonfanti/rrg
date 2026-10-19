/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.5';
export const RELEASE = '2026-10-19';
export const NOTES = [
  'Segnale fallito: il giorno del fallimento conta come nuovo minimo della zona blu (cambiano XLY nel 2008, un trigger dell\'S&P 500 nel 2011 e uno del FTSE 100 nel 2008)',
  'Telegram: rettifica quando il ricalcolo delle ultime sedute sposta o annulla un evento già inviato'
];
