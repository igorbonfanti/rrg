/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.3';
export const RELEASE = '2026-10-19';
export const NOTES = [
  'Aggiornamento notturno più robusto: controllo di ogni file e di ogni indice fermo, avvisi per ticker e prezzi mancanti, file troncati mai pubblicati',
  'Telegram parte dopo la pubblicazione dei dati, così una corsa fallita non manda doppioni',
  'Valori mancanti mostrati come «—» ovunque e in fondo agli ordinamenti; pagina Indici più veloce'
];
