/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.1';
export const RELEASE = '2026-10-18';
export const NOTES = [
  'Numeri verificati con un audit completo: cali forti nei giorni di panico corretti (10/10/2008: 46 titoli), mediane, percentile con 0 cali',
  'Indici: sedute mancanti nella fonte riscaricate, CSI 300 con i decimali giusti; settimane della mappa e della storia della divergenza',
  'Avvertenze nuove: prezzi ricopiati (asterisco nella tabella Prezzi), copertura dei settori prima del 2013, dati non arrivati',
  'Testi corretti dove i dati li smentivano (durata dell\'allerta, livelli di Rea, ore dell\'aggiornamento e altri)',
];
