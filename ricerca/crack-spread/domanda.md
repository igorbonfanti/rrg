# Crack spread 3-2-1 accanto al petrolio · domanda e criteri

Fase di ricerca del 24/11/2026 (sola lettura sull'app). Domanda dell'utente (screenshot di una diretta con il crack spread
`14*(2*RB1!+HO1!)-CL1!` su TradingView): «assieme al petrolio può essere utile monitorare anche il crack spread?»

**Crack spread 3-2-1** (dollari al barile) = (2 × benzina + 1 × gasolio da riscaldamento) × 42 / 3 − WTI, con benzina e
gasolio in dollari al gallone. Dati: FRED (prezzi spot EIA, dominio pubblico) dal 1986; per l'aggiornamento notturno
eventuale Yahoo (RB=F, HO=F, CL=F). Niente TradingView.

Criteri decisi **prima** dei risultati (24/11/2026). Il crack spread entra nell'app come contesto solo se passa almeno uno
dei tre test, in tutte e due le metà del campione (1986-2005 e 2006-oggi) e con un ricalcolo indipendente:

1. **Anticipa i massimi del WTI**: i massimi di ciclo del crack (stessa definizione dell'app, soglie 20 e 30%) vengono
   prima di quelli del WTI in almeno il 70% dei casi, con almeno 8 casi e p < 0,05 contro un modello nullo (spostamenti
   circolari casuali).
2. **Aggiunge qualcosa al petrolio per l'S&P 500**: un crack estremo (sopra il 90° percentile della sua storia fino a quel
   giorno, o un calo di oltre il 40% in 3 mesi) è seguito da un calo dell'S&P 500 di almeno il 10% entro 12 mesi più spesso
   della frequenza di base **e** più spesso della stessa regola applicata al solo WTI; almeno 8 episodi indipendenti.
3. **Spiega il settore energia**: le variazioni a 3 mesi del crack spiegano la forza relativa di XLE contro SPY (o delle
   raffinerie) meglio del solo WTI (aumento di R² di almeno 0,05 fuori campione, cioè stimato su una metà e misurato
   sull'altra).

Se nessun test passa: solo un paragrafo nella guida, o niente, a scelta dell'utente.
