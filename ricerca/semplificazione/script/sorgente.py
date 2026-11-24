"""Trova file:riga del testo di ogni voce dell'inventario (index.html o js/*.js), cercando frammenti fissi del testo."""
import html, json, re, glob, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FILES = ['index.html'] + sorted(glob.glob('js/*.js', root_dir=ROOT))
LINES = {}
for f in FILES:
    raw = open(os.path.join(ROOT, f), encoding='utf-8').read().split('\n')
    norm = []
    for l in raw:
        t = re.sub(r'<[^>]+>', '', l)
        t = t.replace("\\'", "'")
        t = html.unescape(t)
        norm.append(re.sub(r'\s+', ' ', t))
    LINES[f] = norm

def frags(text):
    # frammenti senza cifre né segni che cambiano con i dati, lunghi almeno 18 caratteri
    parts = re.split(r'[\d°%€$]+|·|\(|\)|«|»|:', text)
    out = [p.strip() for p in parts if len(p.strip()) >= 18]
    out.sort(key=len, reverse=True)
    return [o[:60] for o in out[:6]]

def locate(text):
    for fr in frags(text):
        for f in FILES:
            for i, l in enumerate(LINES[f]):
                if fr in l:
                    return f'{f}:{i + 1}'
    return ''

if __name__ == '__main__':
    d = json.load(open(sys.argv[1]))
    miss = 0
    for x in d:
        x['src'] = locate(x['text']) if x['kind'] not in ('intestazione', 'titolo') else ''
        if not x['src'] and x['kind'] not in ('intestazione', 'titolo'): miss += 1
    json.dump(d, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
    print('senza sorgente', miss, 'su', len(d))
