/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Dalla 1.0.0 semver: la prima cifra per un cambio che
 * rompe qualcosa (regole, formati dei dati), la seconda per una funzione nuova, l'ultima per le correzioni. Prima della 1.0
 * lo schema era 0.vista.correzione.
 */
export const VERSION = '1.3.5';
export const RELEASE = '2026-11-05';
export const NOTES = [
  'Dati: le chiusure di Yahoo sono datate nel fuso della borsa con l\'ora legale di quel giorno; dal 26/10 (cambi) e dal 2/11 (dollaro) erano sbagliati il dollaro (DXY_INV) e la storia di DBMFE.PA prima del 28/04/2025',
  'Indici: bias dei membri di oggi ricalcolato con la regola dell\'app (in media +3,6 punti nella prova sul Nasdaq-100, non +4,5)',
  'Avvicinamento: statistiche sul periodo che l\'app mostra (settori: con l\'Attenzione 50 tocchi del livello su 63, 7 più della sola Attenzione; da solo 33) e, nella guida, come usarlo',
  'Settore: nessun pallino d\'ingresso sul bordo sinistro quando l\'avvicinamento era già iniziato prima del periodo mostrato',
  'Settore: la linea della breadth diventa gialla nelle sedute in avvicinamento, con un pallino all\'ingresso e la soglia di quel giorno nel riquadro dei valori',
  'Settore: tolta la linea tratteggiata della soglia di avvicinamento di oggi',
  'Settore: nel grafico della breadth una fascia gialla dal livello blu a 10 punti sopra, la parte di breadth dello stato Attenzione',
];
