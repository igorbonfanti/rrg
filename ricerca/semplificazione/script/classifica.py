"""Classifica i testi «di nota» dell'inventario e scrive inventario.csv, inventario.json e riepilogo.json.

Legge inventario_grezzo.json (script/inventario_dom.cjs, poi script/sorgente.py) ed extra.json (script/extra.cjs).
Le decisioni sono scritte a mano qui sotto, una per testo: tipo, proposta, destinazione e testo proposto.
Le parole «dopo» contano solo il testo che resta scritto nella pagina (non quello dei tooltip né della guida).
Uso: python3 ricerca/semplificazione/script/classifica.py
"""
import csv, json, os, re
from collections import OrderedDict, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..')
D = json.load(open(os.path.join(OUT, 'inventario_grezzo.json')))
X = json.load(open(os.path.join(OUT, 'extra.json')))

def words(t):
    return len(re.findall(r"[\w][\w'’.,%/-]*", t or ''))

# tipi
OP, MET, LIM, FON, STA, AVV = 'istruzione d\'uso', 'metodo', 'approssimazione o limite', 'fonte e citazione', 'stato dei dati', 'avviso'

# Decisioni: (vista, pezzo del selettore, inizio del testo) -> (tipo, proposta, destinazione, testo proposto, nota)
# proposta: TENERE, ACCORCIARE, TOOLTIP, GUIDA, TOGLIERE. «testo proposto» è ciò che resta nella pagina (per TOOLTIP: il testo del tooltip).
DEC = [
    # ---------- testata, piè di pagina, guida rapida ----------
    ('globale', '#srcLine', 'Dati di fine', FON, 'ACCORCIARE', 'piè di pagina + guida.html#fonti (nuova)',
     'Dati di fine giornata (Yahoo Finance e altre fonti: Fonti e note ↗) · livelli blu e idee di Massimo Rea (quant-rea.com), dove trovate gli studi completi: i numeri di questa app possono differire.',
     'unisce srcLine e il primo disclaimer; la citazione di Rea resta visibile su ogni pagina'),
    ('globale', 'span.discl', 'Idee ispirate', FON, 'TOGLIERE', 'unita alla riga sopra', '', 'citazione di Rea conservata nella riga unica'),
    ('globale', 'span.discl', 'Strumento di studio', AVV, 'TENERE', 'piè di pagina', '', 'avviso legale breve: resta'),
    ('globale', '#genLine', 'versione', STA, 'TENERE', '', '', ''),
    ('globale', 'p.note', 'Idee ispirate', FON, 'TOGLIERE', 'piè di pagina e guida.html#limiti', '', 'ripetuta nel piè di pagina'),
    ('globale', 'p.note', 'La versione in uso', OP, 'ACCORCIARE', 'guida rapida',
     'Se compare «Nuova versione: ricarica» il browser usa file vecchi: clic sul pulsante o Ctrl+F5.', ''),
    ('globale', 'p.note', 'Strumento di studio', AVV, 'ACCORCIARE', 'guida rapida; il resto in guida.html#limiti',
     'Strumento di studio, non consulenza finanziaria.', 'tabella di Rea, regole dell\'app e marchio RRG Research sono già in guida.html#limiti'),
    ('globale', 'p.guide-link', 'Guida completa', OP, 'TENERE', '', '', ''),
    ('globale', 'div.pb.help > p', 'Sector Monitor segue', OP, 'ACCORCIARE', 'guida rapida',
     'Sector Monitor segue i possibili bottom dei settori S&P 500 (breadth contro il livello blu) e la rotazione relativa. Dati di fine giornata.', ''),
    ('globale', 'ul > li', '1 Monitor', OP, 'ACCORCIARE', 'guida rapida; dettagli in guida.html#mon', '1 Monitor: lo stato degli 11 settori e del SOXX; clic su un settore per il dettaglio.', ''),
    ('globale', 'ul > li', '2 Rotazione', OP, 'TENERE', '', '', ''),
    ('globale', 'ul > li', '3 Bottom Map', OP, 'TENERE', '', '', ''),
    ('globale', 'ul > li', '4 Settore', OP, 'ACCORCIARE', 'guida.html#sec', '4 Settore: grafico, livello blu da provare con + e −, titoli, episodi e cali forti.', ''),
    ('globale', 'ul > li', '5 Titoli', OP, 'ACCORCIARE', 'guida.html#tit', '5 Titoli: grandi contro piccoli in ogni settore, bolle dei titoli e i più in pena.', ''),
    ('globale', 'ul > li', '6 Indici', OP, 'ACCORCIARE', 'guida.html#idx (le statistiche «89 tocchi su 132» vanno lì)',
     '6 Indici: la stessa analisi su 22 indici azionari; «Indici mostrati» sceglie quali vedere.', 'statistica nel campione: da riportare nella guida con lo script che la ricalcola'),
    ('globale', 'ul > li', '7 Emergenti', OP, 'ACCORCIARE', 'guida.html#emg', '7 Emergenti: lo stato della vista 6 con valuta, dollaro e forza relativa (solo contesto).', ''),
    ('globale', 'ul > li', '8 VIX', OP, 'ACCORCIARE', 'guida.html#vix', '8 VIX: come sono andati gli indici dopo i picchi del VIX (solo contesto).', ''),
    ('globale', 'ul > li', '9 Alert', OP, 'TENERE', '', '', ''),
    ('globale', 'ul > li', 'Avvicinamento', MET, 'ACCORCIARE', 'guida.html#avvicinamento (c\'è già)', 'Avvicinamento: breadth vicina al livello blu dopo un calo veloce; promemoria, non uno stato.', 'statistiche 50 su 63 già nella guida'),
    ('globale', 'ul > li', 'Attenzione', MET, 'TENERE', '', '', ''),
    ('globale', 'ul > li', 'Zona blu', MET, 'TENERE', '', '', ''),
    ('globale', 'ul > li', 'Trigger', MET, 'ACCORCIARE', 'guida.html#stati', 'Trigger: la breadth risale sopra il livello blu con una conferma.', ''),
    ('globale', 'ul > li', 'Fallito', MET, 'ACCORCIARE', 'guida.html#stati', 'Fallito: il prezzo torna sotto il minimo della zona blu. Cooldown: 63 sedute senza nuovi segnali.', ''),
    ('globale', 'div.pb.help > p', 'Ogni titolo è confrontato', MET, 'TENERE', '', '', ''),
    ('globale', 'ul > li', 'Improving', MET, 'TENERE', '', '', ''), ('globale', 'ul > li', 'Leading', MET, 'TENERE', '', '', ''),
    ('globale', 'ul > li', 'Weakening', MET, 'TENERE', '', '', ''), ('globale', 'ul > li', 'Lagging', MET, 'TENERE', '', '', ''),
    ('globale', 'div.pb.help > p', 'Universi globali', MET, 'GUIDA', 'guida.html#universi e #formule (ci sono già)', '', ''),
    ('globale', 'div.pb.help > p', 'Chiusure di Yahoo', STA, 'GUIDA', 'guida.html#dati (c\'è già)', '', ''),
    ('globale', 'dl.gloss > dd', '', MET, 'TENERE', '', '', 'glossario: è il posto giusto; la voce «Solo prezzo» si accorcia come in guida.html#drawdown'),
    ('globale', 'div.pb.help > p', 'Nella barra in alto', OP, 'ACCORCIARE', 'guida.html#comandi (c\'è già)',
     'Nella barra in alto scrivi un ticker, un nome o una vista (XLU, ORO, NDX, VIX, HELP). Tasti: 1–9 viste · / comando · Esc toglie lo zoom · ? guida.', ''),
    # ---------- 1 Monitor ----------
    ('mon', '#intro', '', OP, 'ACCORCIARE', 'primo ingresso',
     'Sector Monitor segue i possibili bottom dei settori S&P 500 e la rotazione relativa. 1. Leggi lo stato dei settori. 2. Clic su un settore per il dettaglio. 3. In 2 Rotazione gli ETF in euro.', ''),
    ('mon', 'p.note.pb', 'Il drawdown conta', MET, 'TOGLIERE', 'title delle intestazioni «Drawdown» e «Solo prezzo» (ci sono già) e guida.html#drawdown', '', 'ripetuta nei tooltip delle colonne'),
    ('mon', '#activeMeta', '', STA, 'ACCORCIARE', 'ⓘ sul titolo «Settori da osservare»',
     '2 su 11 · più SOXX', 'criterio (avvicinamento, attenzione, zona blu o dopo un trigger) nel tooltip'),
    ('mon', '#boardMeta', '', STA, 'TENERE', '', '', ''),
    # ---------- 2 Rotazione ----------
    ('rrg', 'span.muted', 'colore = quadrante', OP, 'ACCORCIARE', '', 'passa sopra un punto per isolarlo, clic per fissarlo · ←→ tempo', ''),
    ('rrg', '#provNote', '', STA, 'TENERE', '', '', ''),
    ('rrg', '#rotNote', '', MET, 'TOOLTIP', 'ⓘ sulle intestazioni Direz., Vel., Dist., Prima e sulla colonna della spunta',
     'Direz.: ultimo spostamento in gradi bussola (0° su, 90° destra; in grassetto verso Leading) · Vel.: spostamento dell\'ultimo periodo · Dist.: distanza da 100/100 · Prima: quadrante precedente · spunta: nasconde il titolo dal grafico.',
     'la frase sul telefono si toglie: guida.html#schermo dice già che alcune colonne sono nascoste'),
    ('rrg', '#pxNote', '', LIM, 'TOOLTIP', 'title delle colonne «Drawdown» e «Solo prezzo» + guida.html#drawdown',
     'In rosso se più profondo dell\'80% delle sedute degli ultimi 5 anni (nel Monitor il percentile usa la storia dal 2004).',
     'il limite sul percentile diverso dal Monitor resta nel tooltip della colonna; «clic per ordinare» si toglie'),
    ('rrg', '#fxBox > p.note', '', MET, 'INCLUSO', '', '', 'contato dentro #fxBox'),
    ('rrg', '#fxBox', '', MET, 'GUIDA', 'guida.html#formule (manca: «verificato su 11 letture del 25/09/2026», «0,2 più basso con SPY»)',
     '', 'al posto del riquadro: «?» accanto a «Formula» che apre guida.html#formule; i title dei due pulsanti restano'),
    ('rrg', '#ptfHow', '', OP, 'GUIDA', 'guida.html#portafoglio (quasi tutto c\'è già) + ⓘ sul titolo «Portafoglio di riferimento»',
     '', 'tooltip: «Sposta i cursori o scrivi il peso; i pesi restano in questo browser. Se il totale non fa 100% valgono in proporzione.»'),
    ('rrg', '#ptfWhat', '', MET, 'ACCORCIARE', 'guida.html#portafoglio',
     'Benchmark: un portafoglio di esempio con le 10 componenti qui sotto. Sposta i cursori per adattarlo al tuo.', ''),
    ('rrg', '#ptfFoot', '', AVV, 'ACCORCIARE', 'definizioni di «Obiettivo» e «Oggi» nei title delle intestazioni',
     'Pesi indicativi, non una raccomandazione. Ultimo ribilanciamento: 30/10/2026.', 'la data resta generata dal codice'),
    ('rrg', '#ptfLine', '', STA, 'ACCORCIARE', '', 'Contro un portafoglio di esempio: Azioni 50% · Obbligazioni governative euro 30% · Oro e materie prime 13% · Immobiliare 5% · Cripto 2%.', ''),
    ('rrg', '#mxNow', '', OP, 'ACCORCIARE', 'la spiegazione è già nella riga evidenziata della tabella',
     'Ora il benchmark è Liquidità in dollari (BIL): clic su una riga per cambiarlo.', ''),
    ('rrg', '#mxHow', '', LIM, 'GUIDA', 'guida.html#asset-reali (nuova sottosezione di #universi) + link «Dati e limiti ?» nel titolo del pannello',
     '', 'approssimazioni da tenere raggiungibili: CPI dal giorno di pubblicazione (ottobre 2025 mai uscito), bitcoin e dollar index all\'ultimo prezzo a ogni seduta di New York'),
    ('rrg', '#mxMeta', '', OP, 'TENERE', '', '', ''),
    ('rrg', '#rrgMeta', '', STA, 'TENERE', '', '', ''), ('rrg', '#rotMeta', '', STA, 'TENERE', '', '', ''), ('rrg', '#ptfMeta', '', STA, 'TENERE', '', '', ''),
    # ---------- 3 Bottom Map ----------
    ('btm', 'p.note.pb', 'Differenza tra', MET, 'TOOLTIP', 'ⓘ sul titolo «Distanza dal livello blu»',
     'Punti di breadth che mancano al livello blu e quanti titoli devono ancora scendere sotto la media 200. Un titolo vale 100/N punti: nei settori piccoli 3–5 punti.', ''),
    ('btm', '#bmMeta', '', STA, 'ACCORCIARE', 'la regola delle 2 chiusure è in guida.html#stati', 'settimanale · coda 8 settimane · al 12/11/2026', ''),
    ('btm', 'span', 'avvicinamento: breadth', MET, 'ACCORCIARE', 'ⓘ sulla voce (definizione) e guida.html#avvicinamento', 'avvicinamento', ''),
    ('btm', '#bmIndLeg', '', LIM, 'TENERE', '', '', 'approssimazione (membri di oggi): resta'),
    ('btm', 'span.muted', 'coda = ultime', OP, 'ACCORCIARE', 'il percorso tipico di un bottom va in guida.html#btm', 'coda = ultime 8 settimane · clic per il dettaglio', ''),
    # ---------- 4 Settore ----------
    ('sec', 'p.note.pb.ctx-h', 'Per confronto', OP, 'ACCORCIARE', 'ⓘ sull\'etichetta', 'Per confronto', 'tooltip: «gli stessi rendimenti dopo una seduta qualsiasi e, per i trigger, quelli di SPY negli stessi giorni»'),
    ('sec', '#secEpiBox > p.note.pb', 'Rendimenti del settore', LIM, 'ACCORCIARE', 'guida.html#limiti (copertura 58% e 76% c\'è già) e ⓘ sul titolo «Episodi in zona blu»',
     'Storia ricostruita, incompleta prima del 2013: esempi, non probabilità.', 'la frase sul telefono si toglie'),
    ('sec', '#epiMeta', '', STA, 'ACCORCIARE', '', '4 zone blu dal 03/01/2005 con livello 6% · 7 trigger, 3 falliti', ''),
    ('sec', '#secCapNow', '', STA, 'TENERE', '', '', ''),
    ('sec', '#secCapBase', '', STA, 'TENERE', '', '', ''),
    ('sec', '#secCapNote', '', MET, 'ACCORCIARE', 'guida.html#cali (c\'è già quasi tutto) + ⓘ sul titolo «Cali forti»',
     'Preset «Drop giornaliero cumulato» di Massimo Rea (quant-rea) · allerta sopra il 99° percentile · solo contesto: Come si legge ?',
     'citazione di Rea e limite «errori di stampa esclusi» restano: la prima nella pagina, il secondo in guida.html#cali'),
    ('sec', 'p.note.ck-why', '', OP, 'TENERE', '', '', ''),
    ('sec', 'p.note.capinfo', '', STA, 'ACCORCIARE', '', 'ⓘ Cali forti: nessuna allerta · 9 sedute negli ultimi 3 mesi (solo contesto)', ''),
    ('sec', '#blueSrc', '', FON, 'ACCORCIARE', 'regole dell\'app: guida.html#stati', 'Livello di default: tabella «200 LEVEL SETTORI» di Massimo Rea (quant-rea).', ''),
    ('sec', '#blueInfo', '', STA, 'TENERE', '', '', ''),
    ('sec', 'p.note', 'Le modifiche valgono', OP, 'ACCORCIARE', '', 'Vale solo in questo browser.', ''),
    ('sec', 'details.owner > p.note', '', OP, 'INCLUSO', '', '', 'contato dentro details.owner'),
    ('sec', 'details.owner', '', OP, 'TENERE', '', '', 'già piegato, per chi gestisce il repository'),
    ('sec', 'span', 'fascia di attenzione', MET, 'TENERE', '', '', ''),
    ('sec', 'span', 'sotto il livello, fuori', MET, 'TENERE', '', '', ''),
    ('sec', '#secCapMeta', '', STA, 'TENERE', '', '', ''), ('sec', '#memMeta', '', STA, 'TENERE', '', '', ''),
    ('sec', 'span.meta', 'e cosa manca', OP, 'TENERE', '', '', ''), ('sec', 'span.meta', '% titoli sopra', OP, 'TENERE', '', '', ''),
    # ---------- 5 Titoli ----------
    ('tit', '#titSpreadNote', '', STA, 'ACCORCIARE', 'ⓘ sull\'intestazione dell\'ultima colonna (variazione in un mese)',
     'Equal-weight davanti in 3 settori su 11. Clic su un settore per i suoi titoli.', ''),
    ('tit', '#titHistNote', '', STA, 'TENERE', '', '', ''),
    ('tit', '#titHistPanel > p.note.pb', '', MET, 'TOOLTIP', 'ⓘ sul titolo «Storia della divergenza»',
     'Ogni punto è la divergenza (equal-weight meno cap-weighted, in punti) alla fine di quella settimana sul periodo scelto. Con YTD riparte da zero a gennaio.', ''),
    ('tit', 'p.note.pb', 'Ordine: media', MET, 'TOOLTIP', 'ⓘ sul titolo «I più in pena»',
     'Ordine: media della posizione nel settore per rendimento del periodo e distanza dal massimo a 52 settimane. Chi è in pena non è per forza a sconto.', 'il clic sul ticker è già nel title dei link'),
    ('tit', 'div.pb.how > p.note', 'Grandi contro piccoli', MET, 'TOGLIERE', 'guida.html#tit (c\'è già) + ⓘ sul titolo «Grandi contro piccoli»', '', ''),
    ('tit', 'div.pb.how > p.note', 'Titoli del settore', MET, 'TOGLIERE', 'guida.html#tit (c\'è già) + ⓘ sul titolo delle bolle', '', ''),
    ('tit', 'div.pb.how > p.note', 'Dati.', LIM, 'GUIDA', 'guida.html#tit-dati (nuova) + link «Fonti e note» della pagina',
     '', 'approssimazione da tenere raggiungibile anche nel tooltip del pulsante «Peso»: chi non è nelle holdings pesa come un titolo piccolo (una stima)'),
    ('tit', 'div.pb.how > p.note', 'Perché non coincide', LIM, 'GUIDA', 'guida.html#faq-rea (la FAQ esiste, va allargata con questo testo) + link nel tooltip di «Grandi contro piccoli»', '', ''),
    ('tit', 'span', 'scia: 3 mesi', OP, 'ACCORCIARE', 'guida.html#tit', 'scia: 3 mesi, 1 mese, 1 settimana fa · freccia: ultima settimana', ''),
    ('tit', '#titSizeLeg', '', LIM, 'TENERE', '', '', 'approssimazione del SOXX: resta'),
    ('tit', '#titFlagLeg', '', MET, 'ACCORCIARE', '', 'titolo estero quotato negli USA (bandiera del paese secondo iShares)', ''),
    ('tit', '#titMeta', '', STA, 'TENERE', '', '', ''), ('tit', '#titHistMeta', '', STA, 'TENERE', '', '', ''),
    ('tit', '#titBubbleMeta', '', STA, 'TENERE', '', '', ''), ('tit', '#titPainMeta', '', STA, 'TENERE', '', '', ''),
    # ---------- 6 Indici ----------
    ('idx', 'p.note.pb', 'Stessa analisi dei settori', LIM, 'ACCORCIARE', 'ⓘ sull\'intestazione «Storia» e guida.html#idx',
     'Drawdown sul solo prezzo, nella valuta dell\'indice (MSCI Emerging: ETF EEM in dollari).', 'il rimando alla rotazione degli indici va in guida.html#idx'),
    ('idx', 'p.note.pb', 'Differenza tra', MET, 'TOOLTIP', 'ⓘ sul titolo «Distanza dal livello blu»',
     'Punti di breadth che mancano al livello blu e quanti titoli devono ancora scendere sotto la media 200. Un titolo vale 100/N punti: nello SMI 5, nello STOXX 600 meno di 0,2.', ''),
    ('idx', 'p.note.pb.ctx-h', '', OP, 'ACCORCIARE', 'ⓘ sull\'etichetta', 'Per confronto', ''),
    ('idx', '#ixEpiBox > p.note.pb', 'Rendimenti', LIM, 'ACCORCIARE', 'guida.html#idx (orsi lunghi 2001-2002) + ⓘ sul titolo «Episodi in zona blu»',
     'Storia ricostruita, pochi casi: esempi, non probabilità.', ''),
    ('idx', '#ixCapNow', '', STA, 'TENERE', '', '', ''), ('idx', '#ixCapBase', '', STA, 'TENERE', '', '', ''),
    ('idx', '#ixCapNote', '', MET, 'ACCORCIARE', 'guida.html#cali + ⓘ sul titolo «Cali forti»',
     'Preset «Drop giornaliero cumulato» di Massimo Rea (quant-rea) · allerta sopra il 99° percentile · solo contesto: Come si legge ?', ''),
    ('idx', 'p.note.ck-why', '', OP, 'TENERE', '', '', ''),
    ('idx', '#ixBlueSrc', '', FON, 'ACCORCIARE', '', 'Livello di default dai grafici di Massimo Rea (quant-rea).', ''),
    ('idx', '#ixBlueInfo', '', STA, 'TENERE', '', '', ''),
    ('idx', 'p.note', 'Le modifiche valgono', OP, 'ACCORCIARE', '', 'Vale solo in questo browser.', ''),
    ('idx', '#ixQuality', '', LIM, 'ACCORCIARE', 'fonte della lista nel title', 'Storia con la composizione di ogni data, dal 2005.', 'per gli indici con i membri di oggi resta la frase sul limite'),
    ('idx', 'span', 'avvicinamento: breadth', MET, 'ACCORCIARE', 'ⓘ sulla voce', 'avvicinamento', ''),
    ('idx', 'span', 'sotto il livello, fuori', MET, 'TENERE', '', '', ''),
    ('idx', 'span.muted', 'coda = ultime', OP, 'TENERE', '', '', ''),
    ('idx', '#ixEpiMeta', '', STA, 'ACCORCIARE', '', '4 zone blu dal 03/01/2005 con livello 13% · 6 trigger, 2 falliti', ''),
    ('idx', '#ixPickMeta', '', STA, 'TENERE', '', '', ''), ('idx', '#ixMeta', '', STA, 'TENERE', '', '', ''), ('idx', '#ixMapMeta', '', STA, 'TENERE', '', '', ''),
    ('idx', '#ixCapMeta', '', STA, 'TENERE', '', '', ''), ('idx', 'span.meta', '', OP, 'TENERE', '', '', ''),
    # ---------- 7 Emergenti ----------
    ('emg', 'p.note.pb', 'Lo stato e la breadth', AVV, 'ACCORCIARE', '', 'Stato e breadth dalla vista 6 · valuta, dollaro e forza relativa: solo contesto.', ''),
    ('emg', 'p.note.pb', 'cambio al', STA, 'ACCORCIARE', 'il calendario delle serie va nel tooltip del grafico e in guida.html#emg',
     'cambio al 12/11/2026 (Fed fino al 06/11/2026, poi Yahoo provvisorio) · dollaro FRED al 06/11/2026', 'la parte provvisoria è un\'approssimazione dichiarata: resta'),
    ('emg', '#emRSWrap > p.note', '', MET, 'ACCORCIARE', 'ⓘ sul titolo «Forza relativa» (elenco degli ETF)', 'ETF in dollari contro ACWI, settimanale. Clic su un punto per sceglierlo.', ''),
    ('emg', '#emBody > p.note.pb', 'Fonti', FON, 'GUIDA', 'guida.html#fonti-emg (nuova; #dati ne ha già una parte) + link «Fonti e note ↗» in fondo alla vista',
     'Fonti e note ↗', 'tutte le approssimazioni (cambio di mezzogiorno, Yahoo provvisorio, CSI 300 con l\'ETF 510300, revisioni di DTWEXEMEGS) passano nella guida'),
    ('emg', 'div.emread > p', 'Solo contesto', AVV, 'TOGLIERE', 'detto nella nota della tabella', '', ''),
    ('emg', 'div.emread > p', 'La valuta', MET, 'TOOLTIP', 'ⓘ sull\'intestazione «Valuta contro dollaro» (definizione) + guida.html#emg (statistica 15 su 17)',
     'Ha smesso di scendere: dopo un calo forte, il cambio è sceso di almeno mezza deviazione standard dal massimo delle 13 settimane. Non è un segnale d\'ingresso.', 'la statistica «15 su 17» va nella guida (oggi non c\'è)'),
    ('emg', 'div.emread > p', 'Dollaro contro', MET, 'TOOLTIP', 'title del riquadro «Dollaro contro emergenti» (c\'è già) + guida.html#emg', 'Conferma, non anticipa: è arrivato in genere mesi dopo il minimo delle borse.', ''),
    ('emg', 'div.emread > p', 'Cina e India', LIM, 'TOGLIERE', 'note per indice sotto il grafico (#emNotes) e guida.html#emg (c\'è già)', '', ''),
    ('emg', 'div.emread > p.muted', '', LIM, 'GUIDA', 'guida.html#emg', '', 'ricalcolo e limiti del campione nella guida'),
    ('emg', '#emNotes > li', 'Il cambio CNY', LIM, 'TENERE', '', '', 'nota del solo indice scelto: breve e operativa'),
    ('emg', '#emNotes > li', 'Forza relativa con', FON, 'TENERE', '', '', ''),
    ('emg', 'span', 'dollaro favorevole', MET, 'TENERE', '', '', ''),
    ('emg', '#emMeta', '', STA, 'TENERE', '', '', ''), ('emg', 'span.meta', '', STA, 'TENERE', '', '', ''), ('emg', '#emRSMeta', '', STA, 'TENERE', '', '', ''),
    # ---------- 8 VIX ----------
    ('vix', '#vxMeta', '', STA, 'TENERE', '', '', ''),
    ('vix', 'p.note.pb', 'Ogni riga conta', MET, 'ACCORCIARE', 'ⓘ sul titolo «Dopo i picchi del VIX» (definizione di episodio) + guida.html#vix-picchi',
     'Conta gli episodi, non i giorni. Clic su una riga per i suoi episodi.', ''),
    ('vix', 'p.note.pb.vxsplegend', '', MET, 'TOGLIERE', 'title dell\'intestazione «Andamento del VIX» (c\'è già, stesso testo)', '', 'ripetuta'),
    ('vix', '#vxScNote', '', STA, 'ACCORCIARE', 'guida.html#vix-scatter',
     '734 sedute da 20 episodi (14 su 20 positivi dopo 12 mesi): le crisi lunghe pesano di più, la tabella conta gli episodi.', 'numeri generati dal codice'),
    ('vix', 'p.note.pb', 'Un colore per crisi', OP, 'TOOLTIP', 'ⓘ sul titolo «VIX e rendimento a 12 mesi» + guida.html#vix-scatter (c\'è già)',
     'Un colore per crisi. Clic su un punto, su una crisi o su una riga colorata per evidenziarla; di nuovo (o Esc) per togliere. Linee verticali: soglie 40 e 50.', 'i nomi delle crisi sono etichette scelte a mano: detto nel tooltip'),
    ('vix', '#athNote', '', LIM, 'ACCORCIARE', 'va con il pannello nella nuova vista; future, won e regolamento nel title dell\'intestazione + guida.html#massimi',
     'Solo contesto, nessun segnale. Idea di Francesco Caruso (Cicli&Mercati). Clic su una riga per il grafico.', 'citazione di Caruso resta nella pagina'),
    ('vix', '#athNoteVp', '', LIM, 'GUIDA', 'guida.html#profilo-volumi (c\'è già tutto); la legenda dice già strumento e date e l\'avvertenza «poco stabile»', '', ''),
    ('vix', '#vxBody > p.note.pb', 'Fonti', FON, 'ACCORCIARE', 'guida.html#fonti-vix (nuova, con «© Cboe … con il permesso di Cboe») + link',
     'VIX e VIX3M © Cboe, da FRED · idea di Massimo Rea; struttura a termine e credito da Stefano Serafini · Fonti e note ↗', 'attribuzioni obbligatorie visibili in una riga'),
    ('vix', 'div.emread > p', 'Solo contesto', AVV, 'ACCORCIARE', 'sopra i riquadri', 'Solo contesto: non cambia stati né alert.', ''),
    ('vix', 'div.emread > p', 'Dopo i picchi', MET, 'GUIDA', 'guida.html#vix-picchi (c\'è già) + ⓘ sulla riga «robusto»', '', ''),
    ('vix', 'div.emread > p', 'Lo scatter conta', MET, 'TOGLIERE', 'detto in #vxScNote e in guida.html#vix-scatter', '', ''),
    ('vix', 'div.emread > p', 'VIX contro realizzata', MET, 'GUIDA', 'guida.html#vix-realizzata (c\'è già) + title del riquadro «Premio per la paura»', '', ''),
    ('vix', 'div.emread > p', 'Struttura a termine', MET, 'GUIDA', 'guida.html#vix-struttura (c\'è già) + title del riquadro VIX/VIX3M (c\'è già)', '', ''),
    ('vix', 'div.emread > p', 'Credito high yield', LIM, 'GUIDA', 'guida.html#vix-struttura (c\'è già) + title del riquadro «Credito high yield» (dice già «non è uno spread ufficiale»)', '', ''),
    ('vix', 'div.emread > p.muted', '', FON, 'GUIDA', 'guida.html#vix (aggiungere i percorsi di ricalcolo)', '', ''),
    ('vix', 'span', 'episodi con il VIX', MET, 'ACCORCIARE', '', 'episodi con il VIX a 40 o più, nel colore della crisi', ''),
    ('vix', '#vxTableMeta', '', STA, 'TENERE', '', '', 'dice l\'ingresso alla seduta dopo: limite breve, resta'),
    ('vix', '#vxScMeta', '', STA, 'ACCORCIARE', '', 'S&P 500 · sedute con il VIX a 30 o più · rendimento a 12 mesi', ''),
    ('vix', 'span.athleg-ref', '', STA, 'TENERE', '', '', ''),
    ('vix', 'span', 'a destra: volume', FON, 'TENERE', '', '', ''),
    # ---------- 9 Alert ----------
    ('alr', 'p.note.pb', 'Calcolato nel browser', LIM, 'ACCORCIARE', '', 'Storia dal 2005 ricostruita, con i livelli blu di oggi: non è un backtest.', ''),
    ('alr', '#sentInfo', '', STA, 'TENERE', '', '', ''),
    ('alr', 'div.pb > p.note', 'Le notifiche arrivano', OP, 'ACCORCIARE', '', 'Le notifiche vanno a chi gestisce il repository, dopo ogni aggiornamento dei dati.', ''),
    ('alr', 'details.owner > p.note', '', OP, 'INCLUSO', '', '', 'contato dentro details.owner'),
    ('alr', 'details.owner', '', OP, 'TENERE', '', '', 'già piegato'),
    ('alr', '#alertCount', '', STA, 'TENERE', '', '', ''),
]

def find(x):
    for d in DEC:
        v, s, t = d[:3]
        if v == x['view'] and s in x['sel'] and x['text'].startswith(t):
            return d
    return None

# correzioni a mano del file:riga quando il frammento cercato compare prima in un altro testo uguale
SRC_FIX = {('rrg', '#pxNote'): 'index.html:282', ('rrg', '#mxNow'): 'js/app.js:771', ('globale', 'Idee ispirate', 'nota'): 'index.html:894',
           ('globale', 'Strumento di studio', 'nota'): 'index.html:896', ('idx', 'Differenza tra'): 'index.html:589', ('idx', 'Le modifiche valgono'): 'index.html:666',
           ('sec', '#secCapBase'): 'js/cap-view.js:143', ('idx', '#ixCapBase'): 'js/cap-view.js:143', ('idx', 'Rendimenti'): 'index.html:628',
           ('tit', '#titHistNote'): 'js/titles.js', ('vix', '#vxMeta'): 'js/vix-view.js:90', ('vix', '#vxScNote'): 'js/vix-view.js:263'}

def fix_src(x):
    for k, v in SRC_FIX.items():
        if k[0] != x['view']: continue
        if len(k) == 3:
            if x['text'].startswith(k[1]) and x['kind'] == k[2]: return v
        elif k[1] in x['sel'] or x['text'].startswith(k[1]): return v
    return x.get('src', '')

KINDS = {'nota', 'lettura', 'riquadro', 'intro', 'piè di pagina', 'guida rapida', 'meta', 'legenda'}
rows, missing = [], []
for i, x in enumerate(D):
    if x['kind'] not in KINDS: continue
    d = find(x)
    short = (x['words'] < 9 and x['kind'] == 'meta') or (x['words'] < 13 and x['kind'] == 'legenda')
    if d is None:
        if short or x['kind'] == 'nota' and x['words'] <= 6:
            d = (x['view'], '', '', STA if x['kind'] == 'meta' else OP if x['kind'] == 'nota' else 'legenda', 'TENERE', '', '', 'breve (automatico)')
        else:
            missing.append((i, x['view'], x['sel'], x['text'][:60])); continue
    tipo, prop, dest, testo, nota = d[3:]
    if prop == 'INCLUSO': continue
    after = x['words'] if prop == 'TENERE' else words(testo) if prop == 'ACCORCIARE' else words(testo) if (prop == 'GUIDA' and testo) else 0
    tip = words(testo) if prop == 'TOOLTIP' else 0
    rows.append(OrderedDict(id=len(rows) + 1, vista=x['view'], tipo_elemento=x['kind'], posizione=x['sel'], sorgente=fix_src(x), pannello=x['panel'],
                            visibile='sì' if x['visible'] else 'no (condizionale)', piegato='sì' if x['folded'] else '', parole=x['words'], tipo=tipo, proposta=prop,
                            destinazione=dest, testo_proposto=testo, parole_dopo=after, parole_tooltip=tip, nota=nota, testo_oggi=x['text']))

# testi che il primo giro non prende (non sono p.note): legenda degli stati, nota della storia del SOXX, asterisco dei prezzi in euro
for k, src, tipo, prop, dest, testo, nota in [
    ('stateLegend', 'js/bottom.js:267', MET, 'ACCORCIARE', 'regola completa nel tooltip di ogni badge e in guida.html#stati; statistiche in guida.html#avvicinamento (ci sono già)',
     'Avvicinamento: breadth vicina al livello blu dopo un calo veloce, promemoria. · Attenzione: breadth entro 10 punti dal livello blu o drawdown molto profondo. · Zona blu: sotto il livello per 2 chiusure con drawdown profondo. · Trigger: la breadth risale con una conferma. · Fallito: il prezzo torna sotto il minimo della zona blu. · Cooldown: 63 sedute senza nuovi alert.',
     'i numeri (10, 2, 63) restano generati dalla configurazione'),
]:
    t = ' '.join(z['text'] for z in X[k])
    w = sum(z['words'] for z in X[k])
    rows.append(OrderedDict(id=len(rows) + 1, vista='mon', tipo_elemento='legenda degli stati', posizione='#' + k, sorgente=src, pannello='Come si legge lo stato',
                            visibile='sì', piegato='', parole=w, tipo=tipo, proposta=prop, destinazione=dest, testo_proposto=testo, parole_dopo=words(testo), parole_tooltip=0, nota=nota, testo_oggi=t))
t = X['soxx'][0]['text']
rows.append(OrderedDict(id=len(rows) + 1, vista='sec', tipo_elemento='nota (solo SOXX)', posizione='#secQuality', sorgente='js/bottom.js:507', pannello='Situazione', visibile='sì (solo SOXX)', piegato='',
                        parole=X['soxx'][0]['words'], tipo=LIM, proposta='ACCORCIARE', destinazione='guida.html#industrie (c\'è già)',
                        testo_proposto='Storia con i 30 titoli di oggi dell\'ETF SOXX, dal 01/08/2001: chi è uscito non c\'è e un titolo vale 3,3 punti. Statistiche indicative: guida ?',
                        parole_dopo=0, parole_tooltip=0, nota='approssimazione obbligatoria: resta nella pagina, più corta', testo_oggi=t))
rows[-1]['parole_dopo'] = words(rows[-1]['testo_proposto'])
pxc = "Sedute di Borsa Italiana: un ETF quotato altrove e chiuso per festa conta con il suo ultimo prezzo; il bitcoin con la sua chiusura giornaliera su Yahoo, a mezzanotte UTC (per l'ultima seduta, il prezzo al momento dell'aggiornamento; se Yahoo non ha la barra del giorno, quello del giorno prima, con l'asterisco)."
rows.append(OrderedDict(id=len(rows) + 1, vista='rrg', tipo_elemento='nota (universi in euro, tabella Prezzi)', posizione='#pxCopied', sorgente='js/app.js:454', pannello='Tabella di rotazione', visibile='no (condizionale)', piegato='',
                        parole=words(pxc), tipo=LIM, proposta='TOOLTIP', destinazione='title sull\'asterisco e sull\'intestazione «Ultimo» + guida.html#limiti (c\'è già in parte)',
                        testo_proposto='* ultimo prezzo noto: borsa chiusa per festa o barra del giorno mancante (bitcoin: chiusura a mezzanotte UTC).', parole_dopo=0, parole_tooltip=0, nota='approssimazione obbligatoria', testo_oggi=pxc))
rows[-1]['parole_tooltip'] = words(rows[-1]['testo_proposto'])

with open(os.path.join(OUT, 'inventario.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
json.dump(rows, open(os.path.join(OUT, 'inventario.json'), 'w'), ensure_ascii=False, indent=1)

# riepilogo per vista: tutte le parole «di nota» nella pagina (visibili o condizionali, piegate a parte)
NAMES = OrderedDict([('globale', 'Testata, piè di pagina, guida rapida'), ('mon', '1 Monitor'), ('rrg', '2 Rotazione'), ('btm', '3 Bottom Map'), ('sec', '4 Settore'),
                     ('tit', '5 Titoli'), ('idx', '6 Indici'), ('emg', '7 Emergenti'), ('vix', '8 VIX'), ('alr', '9 Alert')])
S = OrderedDict((k, defaultdict(int)) for k in NAMES)
for r in rows:
    s = S[r['vista']]
    s['voci'] += 1; s['parole_oggi'] += r['parole']; s['parole_dopo'] += r['parole_dopo']; s['parole_tooltip'] += r['parole_tooltip']; s[r['proposta']] += 1
    if r['piegato']: s['parole_piegate_oggi'] += r['parole']
    if r['vista'] == 'globale' and r['tipo_elemento'] == 'guida rapida':
        s['guida_rapida_oggi'] += r['parole']; s['guida_rapida_dopo'] += r['parole_dopo']
    # «subito visibile»: niente riquadri piegati, niente guida rapida, niente testi condizionali
    if not r['piegato'] and r['tipo_elemento'] != 'guida rapida' and r['visibile'].startswith('sì') and not (r['vista'] == 'globale' and r['posizione'].startswith('#helpModal')):
        s['visibili_oggi'] += r['parole']; s['visibili_dopo'] += r['parole_dopo']
# il pannello delle bolle esce dalla vista 8: le sue parole si contano a parte
ath = [r for r in rows if r['vista'] == 'vix' and ('ath' in r['posizione'] or 'massimo' in r['pannello'])]
out = OrderedDict((NAMES[k], dict(v)) for k, v in S.items())
out['_bolle (oggi dentro 8 VIX)'] = {'parole_oggi': sum(r['parole'] for r in ath), 'parole_dopo': sum(r['parole_dopo'] for r in ath)}
out['_totale'] = {k: sum(v.get(k, 0) for v in S.values()) for k in ('voci', 'parole_oggi', 'parole_dopo', 'visibili_oggi', 'visibili_dopo', 'parole_tooltip')}
json.dump(out, open(os.path.join(OUT, 'riepilogo.json'), 'w'), ensure_ascii=False, indent=1)
for k, v in out.items(): print(k, dict(v))
if missing:
    print('\nSENZA DECISIONE:'); [print(' ', m) for m in missing]
