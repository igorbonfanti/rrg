# Pattern nel susseguirsi dei cicli degli asset · verdetto (22/11/2026)

Criteri in `domanda.md`, decisi prima dei risultati. Dettagli, tabelle e comandi per rifare tutto nelle due cartelle.

**Verdetto: nessun pattern regge.** Nessuno dei 4 criteri è superato da un ordine generale; resta solo descrizione.

- `lead-lag/` (9 mercati del pannello, dal 2000, massimi e minimi a 15/20/30%): concordanza dell'ordine ai massimi
  p = 0,051 / 0,102 / 0,289, ai minimi p = 0,458 / 0,571 / 0,359; fuori campione (fino al 2012 → dal 2013) non significativo.
  Una sola coppia su 72 passa il criterio 2, rame → petrolio ai massimi (11 casi su 12 «dopo» a 15%, mediana +68,5 giorni),
  ma solo con un modello nullo cambiato durante la ricerca, con 2 massimi del petrolio contati due volte (luglio 2008,
  aprile 2010) e 3 casi a 1-4 giorni; inutile come segnale (54% contro 52% di base). Ricalcolo separato:
  `ricontrollo/rame-petrolio.mjs` (stessi numeri). Poca potenza: con un ritardo vero di 30-120 giorni il metodo trova la
  coppia in 43 casi su 155.
- `pring/` (storia lunga dal 1954: decennale, S&P 500, materie prime, dollaro, NBER): l'ordine obbligazioni → azioni →
  materie prime non si ripete più che per caso (cicli completi con le soglie: 1-2; con Bry-Boschan 2 su 5 ai massimi e
  ai minimi, p = 0,17). Ai minimi c'era nel 1954-85 con i metalli (5 su 7), mai dal 1986. Dollaro opposto alle materie
  prime solo come andamento a 12 mesi dal 2000 (correlazione −0,44), non sui punti di svolta. Oggi (ottobre 2026)
  stadio IV di Pring con le tre classificazioni provate, ma fragile.

Conseguenza per l'app: la linea del tempo dei massimi resta solo descrittiva, come oggi. Nessuna modifica proposta.
