# Verifiche nel browser e misure dei tempi

Script usati per controllare le versioni 0.7.2–0.8.9 prima di pubblicarle (ramo di sviluppo, non pubblicati).

- `server/gzserve.mjs <cartella> <porta>`: server statico con gzip, come GitHub Pages.
- `server/cacheserve.mjs <cartella> <porta> <dir>`: come Pages anche nella cache (max-age=600, ETag); serve
  `data/sector_members.json` dal file indicato in `<dir>/which.txt` per simulare una pubblicazione.
- `browser/*.js`: Playwright (Chromium già installato; `npm i playwright` in una cartella a parte), contro
  `http://127.0.0.1:8780` o `8790`:
  - `v072.js`, `v080.js`: regressione di navigazione, comandi, Bottom Map, checklist, telefono, temi;
  - `lazy.js`: avvio in due tempi (universo salvato, apertura diretta della rotazione, indici non principali);
  - `ctx.js`, `hist.js`, `bmt.js`, `ixbm.js`, `mf.js`, `guide.js`, `cache.js`: le singole funzioni;
  - `perf.js`, `perf2.js`, `prof.js`: tempi su telefono simulato (6 Mbit/s, CPU ×4), sequenza dei file e profilo CPU.
