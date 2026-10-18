/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.2';
export const RELEASE = '2026-10-18';
export const NOTES = [
  'Telefono e tablet: tabellone degli indici a schede come il Monitor, testo dei grafici più grande, «Perché questo stato» subito dopo il grafico',
  'Al tocco: i grafici mostrano i numeri del punto toccato, la Bottom Map al primo tocco i valori e al secondo apre; spiegazioni anche dentro le schede',
  'Bottom Map: colori degli stati come nel Monitor, «Zoom sulla zona» per le crisi passate, etichette che non si sovrappongono',
  'Focus da tastiera visibile, fasce di sfondo più leggibili, scala della rotazione salvata'
];
