/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Dalla 1.0.0 semver: la prima cifra per un cambio che
 * rompe qualcosa (regole, formati dei dati), la seconda per una funzione nuova, l'ultima per le correzioni. Prima della 1.0
 * lo schema era 0.vista.correzione.
 */
export const VERSION = '1.0.0';
export const RELEASE = '2026-10-20';
export const NOTES = [
  'Versione 1.0: dopo due giri di controlli indipendenti (dati ricalcolati dalle fonti, testi, codice, grafica, prova nel browser) nessun problema bloccante aperto',
  'Ultime correzioni (0.9.10): testi e statistiche ricalcolabili, valori di Rea tolti, riaperture dopo una sospensione, chiusure provvisorie, file mancanti detti in chiaro, etichette e tocco nei grafici, tabelle del telefono',
];
