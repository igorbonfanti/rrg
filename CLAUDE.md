# Sector Monitor: regole del progetto

App statica in italiano (GitHub Pages) per i possibili bottom di settori e indici (breadth contro livello blu) e la rotazione relativa. Documentazione per chi la usa: `guida.html`. Documentazione tecnica: `README.md`. Stato dello sviluppo, decisioni e prossimi passi: `docs/sviluppo.md`.

## Regola principale: solo numeri verificati

- Ogni numero mostrato all'utente deve venire da dati reali e da un calcolo riproducibile. Niente valori stimati, interpolati o inventati presentati come dati.
- Dove un'approssimazione è inevitabile, va **detta nell'app** (nota, tooltip o guida) e descritta nel README. Esempi: storia ricostruita con i membri di oggi, DBMF americano prima del 28/04/2025, ultimo prezzo noto in un giorno di festa di una borsa.
- Le statistiche scritte nei testi (per esempio «59 tocchi su 73», «nel campione dal 2001») devono essere ricalcolabili con uno script del repository, che va citato o salvato in `ricerca/`.
- Se un dato manca, si mostra «—» o si dice che manca: mai un valore di riempimento.
- Prima di pubblicare, ogni numero nuovo si confronta con una fonte indipendente o con un ricalcolo separato.

## Come si lavora

- **Regole e formule** (stati, livelli, soglie, formule della rotazione): prima di cambiarle se ne parla con l'utente.
- **Fasi di ricerca**: non modificano l'app.
- **Piani**: prima di implementare si propone un piano. Prima di cambiare qualcosa si salva il lavoro.
- **Ramo di sviluppo**: `claude/great-noether-2f1ude`, che contiene anche `ricerca/`.
- **Pubblicazione**:
  1. commit sul ramo di sviluppo;
  2. si copiano i file cambiati su `origin/main` (worktree a parte, senza `ricerca/`);
  3. `npm test`;
  4. push su `main`;
  5. merge di `main` nel ramo di sviluppo;
  6. controllo che i file su GitHub Pages coincidano con quelli di `main` (sha1).
- **Versione**: `js/version.js` e `version.json` si cambiano insieme. Lo schema è 0.vista.correzione prima della 1.0, poi semver. La nota della versione va nel README.
- **Test**: `npm test`, più i controlli nel browser con Playwright (`ricerca/qa/`), su computer e telefono, tema chiaro e scuro.

## Vincoli

- Non chiedere né incollare mai il token del bot Telegram.
- Le letture di StockCharts restano private e non si fa scraping di StockCharts né di TradingView.
- Quant-Rea (Massimo Rea): i livelli blu di partenza e le idee vanno sempre citati. Niente dati estratti dalla piattaforma: i suoi Termini vietano export e scraping.
- Il repository è pubblico: niente materiale riservato di terzi (per esempio il fascicolo degli utenti di quant-rea).
- Discord e email: si preparano solo bozze, le pubblica o le invia l'utente.
- RS-Ratio e RS-Momentum restano con questi nomi (scelta dell'utente).
- Il tema lo sceglie l'utente: nessun cambio automatico.
