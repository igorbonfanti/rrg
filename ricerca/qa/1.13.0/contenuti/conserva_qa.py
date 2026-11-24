# Controllo 2 (metodo indipendente da ricerca/semplificazione/conserva.cjs, che parte dall'inventario):
# si parte dal testo INTERO della pagina 1.12.0 (textContent di ogni vista, anche nascosto, più title/aria-label/data-info),
# per ogni scenario di estrai.cjs, diviso in frasi. Ogni frase che non c'è più identica nella 1.13.0 si cerca, numero per
# numero e parola per parola, in tre livelli:
#   L0 = stessa vista della 1.13.0: testo intero (anche contenitori nascosti dei «i»), attributi, riquadri «i» aperti davvero;
#   L1 = L0 + sezioni della guida 1.13.0 aperte dai «i» della vista (data-guide) e dal link «Fonti e note» della vista;
#   L2 = tutta la guida 1.13.0.
# Uscita: conserva_qa.txt con le frasi che perdono un numero a L1 o con poche parole ritrovate (da guardare a mano).
# Uso: python3 conserva_qa.py old.json new.json guida_nuova.html guida_vecchia.html
import json, re, sys, html
from html.parser import HTMLParser
old, new = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
G_NEW, G_OLD = open(sys.argv[3]).read(), open(sys.argv[4]).read()

class P(HTMLParser):
    """Testo della guida per ancora: un elemento con id; un h2/h3 con id vale fino al titolo successivo di pari livello o più alto."""
    def __init__(s):
        super().__init__(); s.stack = []; s.open = {}; s.text = {}; s.heads = []; s.all = []
    def handle_starttag(s, t, a):
        a = dict(a)
        if t in ('h2', 'h3'):
            lvl = int(t[1])
            for h in list(s.heads):
                if h[1] >= lvl: s.heads.remove(h)
            if a.get('id'): s.heads.append((a['id'], lvl)); s.text[a['id']] = ''
        if t in ('br', 'img', 'input', 'meta', 'link', 'hr'): return
        s.stack.append((t, a.get('id')))
        if a.get('id') and t not in ('h2', 'h3'): s.text.setdefault(a['id'], ''); s.open[a['id']] = len(s.stack)
    def handle_endtag(s, t):
        while s.stack:
            tt, i = s.stack.pop()
            if i in s.open and s.open[i] > len(s.stack): del s.open[i]
            if tt == t: break
        if t == 'section':
            s.heads = [h for h in s.heads if h[1] < 2]
    def handle_data(s, d):
        for i in list(s.open) + [h[0] for h in s.heads]: s.text[i] += d
        s.all.append(d)
def guide(src):
    p = P(); p.feed(src); return p
gn, go = guide(G_NEW), guide(G_OLD)
N = lambda s: re.sub(r'\s+', ' ', html.unescape(s or '')).replace('−', '-').replace('’', "'").strip()
GALL = N(' '.join(gn.all))
# tit-dati è uno span vuoto all'inizio del paragrafo: vale il paragrafo di #fonti-tit
def gsec(i):
    t = N(gn.text.get(i, ''))
    if i == 'tit-dati' and not t: t = N(gn.text.get('fonti-tit', ''))
    return t
NUM = re.compile(r'\d+(?:[.,/]\d+)*(?:-\d+(?:[.,]\d+)?)?')
STOP = set('il lo la i gli le un una uno di da in con su per tra fra e o a al allo alla ai agli alle del dello della dei degli delle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle sul sullo sulla sui sugli sulle che non è più come se si ci ne quando anche solo ma quindi poi già sono ha hanno era cosa questo questa quello quella ogni sotto sopra dopo prima fino oppure così'.split())
words = lambda s: [w for w in re.findall(r"[\wàèéìòù]+", s.lower()) if len(w) > 2 and w not in STOP and not w.isdigit()]
def sentences(t):
    t = N(t)
    parts = re.split(r'(?<=[.;!?])\s+(?=[A-ZÀÈÉ«(*])| · ', t)
    return [x.strip() for x in parts if len(words(x)) >= 3]

out, stats = [], {'frasi': 0, 'identiche': 0, 'num_L0': 0, 'num_L1': 0, 'num_L2': 0, 'num_persi': 0}
seen = set()
for sc in old:
    o, n = old[sc], new[sc]
    L0 = N(n['all'] + ' ' + ' '.join(n['attrs']) + ' ' + ' '.join((x or {}).get('t', '') for x in n['infoText']) + ' ' + n.get('footer', ''))
    anchors = sorted({i['guide'] for i in n['infos'] if i['guide']} | ({l.split('#')[1] for l in n['srcline']['links'] if '#' in l} if n.get('srcline') else set()))
    # la riga «Formula» (i in alto, fuori dalla vista) vale per la Rotazione
    if sc.startswith('rrg'): anchors.append('formule')
    L1 = L0 + ' ' + ' '.join(gsec(a) for a in anchors)
    src = o['all'] + ' . ' + ' . '.join(o['attrs']) + (' . ' + o['footer'] if sc == 'mon' else '')
    for s in sentences(src):
        key = (sc.split('-')[0], s)
        if key in seen: continue
        seen.add(key); stats['frasi'] += 1
        if s in L0: stats['identiche'] += 1; continue
        nums = [x for x in NUM.findall(s)]
        miss0 = [x for x in nums if x not in L0]; miss1 = [x for x in miss0 if x not in L1]; miss2 = [x for x in miss1 if x not in GALL]
        ws = words(s); cov1 = sum(1 for w in ws if w in L1.lower()) / max(1, len(ws)); cov2 = sum(1 for w in ws if w in GALL.lower()) / max(1, len(ws))
        verb1 = s in L1; verb2 = s in GALL
        lvl = 'L0' if not miss0 else 'L1' if not miss1 else 'L2' if not miss2 else 'PERSO'
        stats['num_' + ('persi' if lvl == 'PERSO' else lvl)] += 1 if nums else 0
        flag = (lvl in ('L2', 'PERSO')) or (cov1 < 0.8 and not verb1)
        out.append((flag, sc, lvl, verb1, verb2, round(cov1, 2), round(cov2, 2), miss1, miss2, s, anchors))
with open('conserva_qa.txt', 'w') as f:
    f.write(json.dumps(stats) + '\n')
    for fl, sc, lvl, v1, v2, c1, c2, m1, m2, s, an in sorted(out, key=lambda r: (not r[0], r[1])):
        f.write(f"{'DA GUARDARE' if fl else 'ok'} [{sc}] numeri:{lvl} frase in L1:{v1} in guida:{v2} parole L1:{c1} guida:{c2} mancano L1:{m1} mancano guida:{m2}\n   {s[:600]}\n")
print(stats, 'da guardare', sum(1 for r in out if r[0]), 'non identiche', len(out))

# guida vecchia -> guida nuova: frasi tolte dalla guida
gs_old = sentences(' '.join(go.all))
lost = [s for s in gs_old if s not in GALL]
with open('guida_tolte.txt', 'w') as f:
    for s in lost:
        nums = NUM.findall(s); miss = [x for x in nums if x not in GALL]
        ws = words(s); cov = sum(1 for w in ws if w in GALL.lower()) / max(1, len(ws))
        f.write(f"parole:{cov:.2f} numeri mancanti:{miss}\n   {s[:600]}\n")
print('frasi della guida vecchia non più identiche:', len(lost))
