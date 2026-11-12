/*
 * version.js — versione dell'app che il browser sta eseguendo. Va cambiata a ogni pubblicazione insieme a
 * version.json (che il browser legge sempre fresco): se le due non coincidono, il browser sta usando file vecchi
 * e l'app lo dice in alto. Dalla 1.0.0 semver: la prima cifra per un cambio che
 * rompe qualcosa (regole, formati dei dati), la seconda per una funzione nuova, l'ultima per le correzioni. Prima della 1.0
 * lo schema era 0.vista.correzione.
 */
export const VERSION = '1.10.0';
export const RELEASE = '2026-11-12';
export const NOTES = [
  'VIX (vista 8): nuovo pannello «Distanza dal massimo storico», solo contesto: Bitcoin, oro, argento, rame, petrolio, Nasdaq-100, S&P 500, semiconduttori e KOSPI, quanto sono sotto il massimo di chiusura, da quando e il calo più profondo; ordinabile per distanza o per data del massimo, dettaglio al clic. Idea da una slide di Francesco Caruso (Cicli&Mercati)',
  'Guida: lo spread high yield a 350 punti base e il petrolio come innesco dei ribassi, verificati sui dati: non anticipano i cali dell\'S&P 500 meglio del caso',
  'Titoli (vista 5) del SOXX: bandiera del paese e anello per i titoli esteri quotati negli Stati Uniti (TSMC, ASML, SK hynix…); spiegato che la bolla è il peso nell\'ETF, con i tetti dell\'indice, non la capitalizzazione',
  'Semiconduttori (SOXX) come industria accanto agli 11 settori: Monitor, Bottom Map (rombo), vista Settore (scrivi SOXX o SEMI), Titoli e rotazione; livello blu 3% di Massimo Rea, breadth con i membri di oggi, alert Telegram',
  'Guida: come confrontare la rotazione con Bloomberg e StockCharts (Medie semplici, settimanale)',
  'Zoom su un tratto nei grafici con il tempo (Performance relativa, Settore e Indici con i Cali forti, Emergenti, VIX): sul computer trascina sul grafico, sul telefono tocca prima la lente; si torna al periodo con ×, doppio clic, Esc o un pulsante del periodo',
  'VIX: nella tabella degli episodi il mini-grafico del VIX (salita, primo giorno, massimo, fine), «VIX massimo» con la data, l\'ultimo giorno alla soglia o più e le sedute; sotto il VIX il grafico dell\'indice scelto con gli episodi colorati',
  'VIX: i punti grandi dello scatter sono il primo giorno dell\'episodio alla soglia scelta nella tabella (prima sempre a 30); colonne «Primo giorno a X o più», «VIX quel giorno», «VIX massimo dell\'episodio» con la sua data; spiegato quanto dura un episodio e che i nomi delle crisi sono etichette di periodo',
  'VIX: scatter a tutta larghezza, un colore per crisi; clic su un punto, sull\'elenco delle crisi o su una riga degli episodi per evidenziare la crisi con un alone, anche nella tabella',
  'VIX: struttura a termine (VIX / VIX3M, backwardation da 1 in su) e credito high yield (HYG contro IEF, distanza dal massimo di 12 mesi), solo contesto, idea di Stefano Serafini; l\'ultima seduta del VIX ora dal file ufficiale di Cboe quando c\'è (altrimenti Yahoo), con la fonte indicata',
  'Nuova vista 8 VIX, solo contesto: come sono andati S&P 500 e Nasdaq-100 dopo che il VIX ha superato 20, 25, 30, 40 o 50 (per episodi, dalla seduta dopo), lo scatter in stile Rea e il VIX contro la volatilità realizzata; Alert passa alla 9',
  'Schede in un nuovo ordine, dal settore ai suoi titoli e poi al resto del mondo: 5 Titoli subito dopo 4 Settore, 6 Indici, 7 Emergenti, 8 Alert per ultima; indirizzi e comandi invariati, cambiano solo i tasti 5, 7 e 8',
  'Nuova vista Emergenti, solo contesto: per CSI 300, Nifty 50, Ibovespa, KOSPI 200, Taiwan, Hang Seng ed EEM lo stato della vista 6 con la valuta (in calo forte o che ha smesso di scendere), il dollaro contro le valute emergenti e la forza relativa contro ACWI; cambi della Federal Reserve (gli ultimi giorni da Yahoo, provvisori); nessuna regola nuova e nessun alert',
  'Dati: le chiusure di Yahoo sono datate nel fuso della borsa con l\'ora legale di quel giorno; dal 26/10 (cambi) e dal 2/11 (dollaro) erano sbagliati il dollaro (DXY_INV) e la storia di DBMFE.PA prima del 28/04/2025',
  'Indici: bias dei membri di oggi ricalcolato con la regola dell\'app (in media +3,6 punti nella prova sul Nasdaq-100, non +4,5)',
  'Avvicinamento: statistiche sul periodo che l\'app mostra (settori: con l\'Attenzione 50 tocchi del livello su 63, 7 più della sola Attenzione; da solo 33) e, nella guida, come usarlo',
  'Settore: nessun pallino d\'ingresso sul bordo sinistro quando l\'avvicinamento era già iniziato prima del periodo mostrato',
  'Settore: la linea della breadth diventa gialla nelle sedute in avvicinamento, con un pallino all\'ingresso e la soglia di quel giorno nel riquadro dei valori',
  'Settore: tolta la linea tratteggiata della soglia di avvicinamento di oggi',
  'Settore: nel grafico della breadth una fascia gialla dal livello blu a 10 punti sopra, la parte di breadth dello stato Attenzione',
];
