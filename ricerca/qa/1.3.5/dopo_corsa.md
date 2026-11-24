# 1.3.5 dopo le corse della Action (controllo del 06/11/2026)

Confronto dei file pubblicati su `main` prima della 1.3.5 (commit 2a72c39) e dopo la corsa notturna del 06/11 (97d40a0).

- La correzione è entrata con la prima corsa dopo la pubblicazione (run 195, lanciata a mano il 05/11, commit 78ee076);
  la corsa notturna (run 197, seduta del 05/11) non ha cambiato i valori passati: 0 differenze su 1.253 sedute di DXY_INV
  e su 1.262 di DBMFE.PA rispetto a a2bb08e.
- DXY_INV: 630 sedute su 1.253 diverse da prima della 1.3.5, scarto mediano 0,28%, massimo 1,97%; in 471 il valore nuovo è
  quello che prima era alla seduta precedente (date spostate). Il controllo del codice prevedeva 629 sedute oltre lo 0,01%
  (`codice/rapporto-codice.md`), il README cita 640 sedute con scarto mediano 0,27% (calcolo del controllo dei dati sulla
  serie scaricata, con un'altra soglia).
- DBMFE.PA prima del 28/04/2025: 875 sedute, mediana −0,58%, da −2,25% a +2,20%, come nel README; dal 28/04/2025 nessuna
  differenza.
- Emergenti: `data/emerging.json` del 06/11 con cambi ed ETF al 05/11, Fed al 30/10, nessuna serie mancante; controllo
  `ricerca/qa/browser/v140.cjs` sul sito pubblicato: 0 FAIL.
