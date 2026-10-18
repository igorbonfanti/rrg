# Audit della versione 0.9.0 (18/10/2026)

Cinque controlli indipendenti prima della release 1.0, fatti su `07a09d7` con i dati al 16/10/2026:

| Rapporto | Cosa controlla |
|---|---|
| `rapporto-dati.md` | ogni numero dell'app ricalcolato da zero dalle fonti (Yahoo chart e spark, FRED, probe point-in-time dell'S&P 500, file pubblicati S5TH/SUTH) |
| `rapporto-testi.md` | ogni affermazione con un numero in app, guida e README; approssimazioni dette o non dette |
| `rapporto-codice.md` | lettura del codice: errori, casi limite, robustezza della pipeline |
| `rapporto-grafica.md` | grafica, telefono, tablet, contrasto, accessibilità |
| `rapporto-funz.md` | prova funzionale nel browser di tutte le viste e dei comandi (1.341 verifiche) |

Script:
- `testi/`: ricalcoli citati nei testi dell'app (livelli blu e 3° percentile, copertura dei membri, Avvicinamento, cali forti, risultati storici, rotazione). Importano i moduli dell'app da `js/` e leggono `data/` e `config/`; l'output del 18/10/2026 è in `testi/output.txt`.
- `dati/`: ricalcoli dei prezzi, della breadth, dei drawdown, della rotazione e del cap/equal. Leggono anche fonti esterne non salvate nel repository (risposte di Yahoo e FRED, probe `jb`, cache dei membri degli indici, file EOD di S5TH e SUTH): i percorsi sono quelli della sessione e vanno adattati.

Le correzioni sono nella 0.9.1 (note in `README.md` e `docs/sviluppo.md`).
