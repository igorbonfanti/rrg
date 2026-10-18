/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Schema 0.vista.correzione: 0 finché è in prova, la cifra di mezzo sale con una funzione
 * nuova, l'ultima con le correzioni.
 */
export const VERSION = '0.9.0';
export const RELEASE = '2026-10-18';
export const NOTES = [
  'Cali forti (capitolazione): quanti titoli perdono almeno il 7% in una seduta, sommati su 5 sedute, con la soglia di allerta',
  'Scheda nel dettaglio di indici e settori, colonna e riquadro nella tabella degli indici',
  'Riga ⓘ in «Perché questo stato» quando c\'è stata allerta negli ultimi 3 mesi',
];
