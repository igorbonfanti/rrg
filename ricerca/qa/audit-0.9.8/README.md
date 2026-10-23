# Audit della versione 0.9.8 (20/10/2026)

Cinque controlli indipendenti prima della release 1.0, sul commit `9a81dd8` con i dati al 19/10/2026 (passo 4 del piano).

| Rapporto | Cosa controlla | Bloccanti | Da correggere | Minori |
|---|---|---|---|---|
| `rapporto-dati.md` | numeri ricalcolati dalle fonti (Yahoo, FRED), breadth titolo per titolo, stati, alert, rotazione, cali forti, 1.816 valori letti nel browser | 0 | 2 | 9 |
| `rapporto-testi.md` | 116 affermazioni con un numero in app, guida, README e Telegram | 2 | 7 | 11 |
| `rapporto-codice.md` | codice dell'app, script e workflow | 0 | 3 (corretti nella 0.9.9) | 6 |
| `rapporto-grafica.md` | 7 viste e guida a 1440/820/390/360, chiaro e scuro, CVD, contrasto | 0 | 5 | 13 |
| `rapporto-funz.md` | prova funzionale nel browser (2.002 verifiche) | 0 | 3 | 6 |

I due «bloccanti» dei testi sono ricontrollati a mano: «6 casi su 13» (sono 6 su 12, `testi/output.txt` [T1]) e «nov 2008, minimo della breadth» (il 20/11/2008 la breadth dell'S&P 500 è 1,0%, il minimo è 0,8% il 02/03/2009). I tre problemi del codice (checkout di una corsa in coda, registro degli alert dopo un invio fallito, riprova di un evento annullato) sono corretti nella 0.9.9 (`codice/prova_alert.mjs` dopo la correzione: 0 messaggi doppi).

Script: ogni cartella (`dati/`, `testi/`, `codice/`, `grafica/`, `funz/`) ha gli script del suo controllo; `funz/run.cjs` rilancia la prova funzionale.
