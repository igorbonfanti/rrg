# Sector Monitor (igorbonfanti/rrg)

App statica in italiano su GitHub Pages (https://igorbonfanti.github.io/rrg/): possibili bottom di settori e indici (breadth contro livello blu) e rotazione relativa. Prima di lavorare leggi `CLAUDE.md` e `docs/sviluppo.md` nel repository: sono la fonte aggiornata e prevalgono su questo file.

## Dove stanno le cose

- Ramo di sviluppo: `claude/great-noether-2f1ude` (contiene anche `ricerca/`). Pubblicazione: `main`.
- Regole e calcoli: `js/signals.js` (macchina a stati `runMachine`, `approachLevel`, `approachSeries`), parametri in `config/thresholds.json`, livelli degli indici in `config/indices.json`.
- Viste: `js/bottom.js` (Bottom Map, Monitor, Settore), `js/indices.js`, `js/sector-chart.js`, `js/cap-*.js`, `js/app.js`.
- Dati: `data/*.json`, scritti ogni notte dalla Action `.github/workflows/update-data.yml`. Non si modificano a mano e non si copiano mai su `main`.
- Testi: `index.html` (note in app), `guida.html`, `README.md` (tecnico, con le note di versione), `docs/sviluppo.md` (stato, decisioni, punti aperti).
- Versione: `js/version.js` (VERSION, RELEASE, NOTES) e `version.json` sempre insieme; semver dalla 1.0.0.
- Ricerca e controlli: `ricerca/<tema>/` (script, JSON, note), `ricerca/qa/` (audit, regressioni nel browser).

## Comandi

- Test: `npm test`.
- Server locale come GitHub Pages: `node ricerca/qa/server/gzserve.mjs /home/user/rrg 8791` (ogni tanto si ferma: rilancialo).
- Regressioni nel browser (Playwright già installato):
  `VER=<versione> BASE=http://127.0.0.1:8791/ NODE_PATH=$(npm root -g) node ricerca/qa/browser/v091.cjs` (88 controlli), poi `v095.cjs` (64) e gli script delle versioni successive (`v130.cjs`…). Aggiungi uno script `vXYZ.cjs` per ogni modifica visibile.
- Gli URL `#XLV`, `#SPX`, `#btm` (Bottom Map), `#mon` (Monitor) aprono direttamente una vista; il tema si imposta con `localStorage['antigravity-theme']`.

## Pubblicazione (da CLAUDE.md)

1. Commit e push sul ramo di sviluppo.
2. `git fetch origin main` e merge di `origin/main` nel ramo di sviluppo.
3. Worktree di `origin/main` nella cartella temporanea.
4. Copia dei soli file dell'app cambiati: mai `ricerca/`, `docs/`, `CLAUDE.md`, `data/`.
5. `npm test` nel worktree, poi push su `main`.
6. Merge di `main` nel ramo di sviluppo e push.
7. Attendi che `https://igorbonfanti.github.io/rrg/version.json` mostri la versione nuova, poi confronta lo sha1 di ogni file dell'app online con quello di `main` (0 differenze).

## Vincoli del progetto

- Solo numeri verificati: ogni numero da dati reali e calcolo riproducibile; approssimazioni dette nell'app e nel README; statistiche dei testi ricalcolabili con uno script in `ricerca/`; dati mancanti come «—».
- Regole e formule (stati, livelli, soglie, rotazione) si cambiano solo dopo averne parlato con Igor.
- Livelli blu e idee di Massimo Rea (quant-rea) sempre citati; nessun dato estratto dalla sua piattaforma.
- Niente scraping di StockCharts né di TradingView; i dati di TradingView (connettore MCP) solo per controlli personali, mai salvati nel repository né usati dall'app.
- Il repository è pubblico: niente materiale riservato di terzi.
- Non chiedere né incollare mai il token del bot Telegram.
- Discord ed email: solo bozze, le pubblica Igor.
- RS-Ratio e RS-Momentum restano con questi nomi; il tema lo sceglie l'utente.
- Niente pull request se Igor non le chiede.

## Cose da sapere quando si fa un backtest qui

- Breadth dei settori dal 2005, degli indici dal 2000 circa (storia di ciascuno); i livelli blu sono di oggi.
- Le soglie che dipendono dalla storia si calcolano seduta per seduta (`approachSeries`), come nel replay della Bottom Map.
- Lo stato di un giorno senza calcolo è quello dell'ultimo giorno calcolato (`stateAt` in `js/bottom.js`).
- Script di esempio: `ricerca/attenzione/script/avvicinamento_pit.mjs` (regola dell'app, base di confronto, eventi persi) e `verifica_pit.mjs` (ricalcolo indipendente).
