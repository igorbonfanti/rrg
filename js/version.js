/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.9';
export const RELEASE = '2026-10-20';
export const NOTES = [
  'Aggiornamento notturno più robusto: una corsa partita in coda usa i dati appena pubblicati; il registro degli alert si salva anche se un invio Telegram fallisce, e un evento annullato non viene più rimandato',
  'Dati USA più presto la mattina: corse di recupero ogni ora nelle prime ore, che si fermano se la seduta c\'è già; testi con gli orari reali dell\'aggiornamento',
  'Settore e Indici: «Episodi in zona blu» richiudibile; grafico dei cali forti sulle stesse date del grafico principale, linea del cursore in tutti i grafici, scala tagliata sui picchi (▲ con il valore)',
  'Indici: link a TradingView per tutti i 22; CAC nella barra dei comandi apre l\'indice',
];
