"""Prototipo «dopo» per le viste 5 Titoli e 8 VIX (più la vista nuova «0 Massimi» con il pannello delle bolle).

Copia index.html in ricerca/semplificazione/prototipo/index.html con <base href="../../../"> (così usa i js, i css e i dati
veri), toglie o accorcia le note secondo inventario.csv e aggiunge le icone ⓘ (prototipo/proto.js e proto.css).
Il codice dell'app non cambia: i testi che i js scrivono in elementi tolti (titData, vxScBig, athNote…) restano in
contenitori nascosti, da cui il popover dell'ⓘ legge il testo (data-src).
Uso: python3 ricerca/semplificazione/script/prototipo.py
"""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'ricerca', 'semplificazione', 'prototipo')
os.makedirs(OUT, exist_ok=True)
H = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

def rep(old, new, count=1):
    global H
    n = H.count(old)
    assert n == count, f'{n} occorrenze invece di {count}: {old[:90]}'
    H = H.replace(old, new)

def cut(start, end):
    """Toglie il testo da `start` (compreso) fino a `end` (escluso); entrambi devono comparire una volta."""
    global H
    i = H.index(start); j = H.index(end, i)
    assert H.count(start) == 1
    H = H[:i] + H[j:]

def info(label, text='', src='', guide=''):
    a = f' data-src="{src}"' if src else ''
    g = f' data-guide="{guide}"' if guide else ''
    t = f' data-info="{text}"' if text else ''
    return f'<button type="button" class="info" aria-label="Spiegazione: {label}" aria-expanded="false"{t}{a}{g}>i</button>'

# ---------- testa: base, stile e script del prototipo ----------
rep('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n  <base href="../../../" />')
rep('<link rel="stylesheet" href="css/style.css" />', '<link rel="stylesheet" href="css/style.css" />\n  <link rel="stylesheet" href="ricerca/semplificazione/prototipo/proto.css" />')
rep('<script type="module" src="js/app.js"></script>', '<script type="module" src="js/app.js"></script>\n<script src="ricerca/semplificazione/prototipo/proto.js"></script>')

# ---------- scheda nuova: 0 Massimi (in coda, tasto 0) ----------
rep('aria-selected="false" tabindex="-1">9 Alert</button>',
    'aria-selected="false" tabindex="-1">9 Alert</button>\n    <button type="button" role="tab" id="tab-ath" data-proto-view="ath" aria-controls="v-ath" aria-selected="false" tabindex="-1">0 Massimi</button>')

# ---------- piè di pagina: una riga di fonti con la citazione di Rea, più l'avviso ----------
i = H.index('<span id="srcLine">'); j = H.index('<span class="discl">Strumento di studio')
H = H[:i] + ('<span id="srcLine">Dati di fine giornata (Yahoo Finance e altre fonti: <a href="guida.html#dati" target="_blank" rel="noopener">Fonti e note ↗</a>) · '
             'livelli blu e idee di Massimo Rea (<a href="https://quant-rea.com/it/" target="_blank" rel="noopener">quant-rea.com</a>), dove trovate gli studi completi: i numeri di questa app possono differire.</span>\n    ') + H[j:]

# ---------- 8 VIX ----------
rep('<p class="note pb vxmeta" id="vxMeta"></p>', '<p class="note pb vxmeta"><b>Solo contesto</b>: non cambia stati né alert · <span id="vxMeta"></span></p>')
i = H.index('<p class="note pb">Ogni riga conta gli <b>episodi</b>'); j = H.index('</p>', i) + 4
EP = H[i:j]
H = H[:i] + '<p class="note pb">Conta gli episodi, non i giorni. Clic su una riga per i suoi episodi.</p>\n        <div hidden id="vxTabHelp">' + EP.replace('<p class="note pb">', '<p>') + '</div>' + H[j:]
rep('<h2>Dopo i picchi del VIX</h2>', '<h2>Dopo i picchi del VIX</h2>' + info('Dopo i picchi del VIX', src='vxTabHelp', guide='vix'))
cut('<p class="note pb vxsplegend">', '<div class="tscroll"><table class="t vxeps"')
i = H.index('<p class="note pb">Un colore per crisi'); j = H.index('</p>', i) + 4
SC = H[i:j]
H = H[:i] + '<div hidden id="vxScHelp">' + SC.replace('<p class="note pb">', '<p>') + '</div>' + H[j:]
rep('<h2>VIX e rendimento a 12 mesi</h2>', '<h2>VIX e rendimento a 12 mesi</h2>' + info('VIX e rendimento a 12 mesi', src='vxScHelp', guide='vix'))
# pannello delle bolle: esce dalla vista 8
i = H.index('<div class="panel" id="athPanel">'); j = H.index('<div class="panel">\n      <div class="ph"><h2>Come leggere il VIX</h2>')
ATH = H[i:j]
H = H[:i] + H[j:]
# «Come leggere il VIX»: nella guida
cut('<div class="panel">\n      <div class="ph"><h2>Come leggere il VIX</h2>', '<p class="note pb">Fonti: VIX di chiusura')
i = H.index('<p class="note pb">Fonti: VIX di chiusura'); j = H.index('</p>', i) + 4
H = H[:i] + ('<p class="note pb srcline">VIX e VIX3M © Cboe, da FRED · idea di Massimo Rea (<a href="https://quant-rea.com/it/" target="_blank" rel="noopener">quant-rea.com</a>); '
             'struttura a termine e credito da Stefano Serafini (Swiss Capital School) · <a href="guida.html#vix" target="_blank" rel="noopener">Fonti e note ↗</a></p>') + H[j:]

# ---------- 0 Massimi: il pannello delle bolle in una vista sua ----------
i = ATH.index('<p class="note pb" id="athNote">'); j = ATH.index('</div>', i)
NOTES = ATH[i:j]
ATH = ATH[:i] + ATH[j:]
ATH = ATH.replace('<h2>Distanza dal massimo degli ultimi 3 anni · le bolle si sgonfiano a rotazione</h2>',
                  '<h2>Distanza dal massimo degli ultimi 3 anni</h2>' + info('Distanza dal massimo', src='athHelp', guide='massimi'))
ATH = ATH.replace('<div class="ph sub"><h3 id="athChartTitle"></h3>', '<div class="ph sub"><h3 id="athChartTitle"></h3>' + info('Grafico e profilo dei volumi', src='athVpHelp', guide='profilo-volumi'))
HELP = NOTES.replace('<p class="note pb" id="athNote">', '<div hidden id="athHelp"><p id="athNote">').replace('</p>\n      <p class="note pb" id="athNoteVp">', '</p></div><div hidden id="athVpHelp"><p id="athNoteVp">') + '</div>'
VIEW = ('\n  <!-- 0 MASSIMI (prototipo) -->\n  <section class="view" id="v-ath" role="tabpanel" aria-labelledby="tab-ath" hidden>\n'
        '    <p class="note pb vxmeta"><b>Le bolle si sgonfiano a rotazione</b>: quanto ogni mercato è sotto il massimo di chiusura degli ultimi 3 anni. Solo contesto, nessun segnale. Clic su una riga per il grafico.</p>\n    '
        + ATH + HELP +
        '\n    <p class="note pb srcline">Idea da una slide di Francesco Caruso (Cicli&amp;Mercati) · prezzi Yahoo Finance, solo prezzo nella valuta di quotazione · <a href="guida.html#massimi" target="_blank" rel="noopener">Fonti e note ↗</a></p>\n  </section>\n')
rep('  <!-- 9 ALERT -->', VIEW + '  <!-- 9 ALERT -->')

# ---------- 5 Titoli ----------
rep('<h2>Grandi contro piccoli · cap-weighted vs equal-weight</h2>',
    '<h2>Grandi contro piccoli · cap-weighted vs equal-weight</h2>' + info('Grandi contro piccoli', src='titHowBig', guide='tit'))
rep('<span><svg class="ka" width="58"', '<span title="Scia: dove erano i due pallini 3 mesi, 1 mese e 1 settimana fa; freccia: movimento dell\'ultima settimana, verde (blu con CVD) se sale, rossa se scende"><svg class="ka" width="58"')
rep('</svg>scia: 3 mesi, 1 mese, 1 settimana fa (pallini sempre più grandi) e freccia dell\'ultima settimana, verde (blu con CVD) se sale, rossa se scende</span>',
    '</svg>scia: 3 mesi, 1 mese, 1 settimana fa · freccia: ultima settimana</span>')
rep('<h2 id="titHistTitle"></h2>', '<h2 id="titHistTitle"></h2>' + info('Storia della divergenza', text="Ogni punto è la divergenza (equal-weight meno cap-weighted, in punti) alla fine di quella settimana sul periodo scelto. Con YTD riparte da zero a gennaio."))
cut('<p class="note pb">Ogni punto è la divergenza del dumbbell', '</div>\n    <div class="grid-tit">')
rep('<h2 id="titBubbleTitle"></h2>', '<h2 id="titBubbleTitle"></h2>' + info('Titoli del settore', src='titHowBub', guide='tit'))
rep('<h2>I più in pena</h2>', '<h2>I più in pena</h2>' + info('I più in pena', text="Ordine: media della posizione nel settore per rendimento del periodo e per distanza dal massimo a 52 settimane. Chi è in pena non è per forza a sconto. Clic sul ticker per il grafico su TradingView."))
cut('<p class="note pb">Ordine: media della posizione', '</div>\n    </div>\n    <div class="panel" style="margin-top:12px">')
rep('title="Area proporzionale al peso nell\'S&amp;P 500 (per il SOXX nell\'ETF)">Peso',
    'title="Area proporzionale al peso nell\'S&amp;P 500 (per il SOXX nell\'ETF). Pesi dalle holdings di IVV; chi non è nelle holdings (uscito, appena entrato) pesa come un titolo piccolo del settore: una stima">Peso')
# «Come si legge»: i paragrafi diventano i testi delle ⓘ; dati e confronto con Rea nella guida, con una riga di fonti
i = H.index('<div class="panel" style="margin-top:12px">\n      <div class="ph"><h2>Come si legge</h2>'); j = H.index('</section>', i)
HOW = H[i:j]
ps = HOW.split('<p class="note">')[1:]
big, bub = ps[0].split('</p>')[0], ps[1].split('</p>')[0]
H = H[:i] + (f'<div hidden id="titHowBig"><p>{big}</p><p><a href="guida.html#faq" target="_blank" rel="noopener">Perché i numeri possono differire dal grafico di Rea ↗</a></p></div>'
             f'<div hidden id="titHowBub"><p>{bub}</p></div>\n'
             '    <p class="note pb srcline">Calcoli nostri sui costituenti, prezzi senza dividendi, membri di ogni data. <span id="titData"></span> '
             '<a href="guida.html#tit" target="_blank" rel="noopener">Fonti e note ↗</a></p>\n    </div>\n  ') + H[j:]

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(H)
print('scritto', os.path.join(OUT, 'index.html'))
