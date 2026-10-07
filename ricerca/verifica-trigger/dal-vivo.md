# Registro dal vivo: metà al tocco della zona blu, metà al trigger

Aggiornato con i dati al 25/09/2026. Le regole sono quelle congelate in `protocollo-2.md` e `protocollo.md`, senza modifiche.

Nell'app non cambia nulla, perché gli avvisi esistenti coincidono già con i passi di C7:
- **Zona blu:** si compra la prima metà alla chiusura della seduta successiva.
- **Trigger:** si compra la seconda metà.
- **Fallito:** si esce da tutta la posizione.

Qui si segna cosa avrebbe fatto la regola nelle zone blu iniziate dal 25/09/2026, fuori dal campione usato per sceglierla.

| Settore | Inizio zona blu | Stato | Acquisti C7 | Prossimo passo | Trigger | Fallimenti | C7 finora | Trigger attuale finora | Tutto in zona blu finora |
|---|---|---|---|---|---|---|---|---|---|
| XLU | 25/09/2026 | aperto | — | prima metà alla chiusura della seduta dopo l'inizio della zona blu | — | — | +0,0% | +0,0% | +0,0% |

I rendimenti «finora» vanno dall'inizio della zona blu all'ultima chiusura disponibile, o alla fine della finestra di un anno. Si resta liquidi finché la regola non entra, e ogni acquisto o vendita costa 10 punti base.

Per aggiornare: `git fetch origin main && node dal_vivo.mjs` in questa cartella.
