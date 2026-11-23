# Controllo 4: righe di fonti per vista (1.13.0), citazioni obbligatorie, e ogni ancora guida.html#… usata dalla pagina
# (righe di fonti, data-guide dei «i», link dentro i riquadri, link in index.html e nei js) esiste in guida.html.
import json, re, glob
n = json.load(open('new.json'))
G = open('/tmp/qa-c-new/guida.html').read()
ids = set(re.findall(r'id="([^"]+)"', G))
REQ = {'mon': ['Massimo Rea', 'quant-rea.com'], 'rrg': ['Massimo Rea', 'quant-rea.com'], 'btm': ['Massimo Rea', 'quant-rea.com'],
       'sec': ['Massimo Rea', 'quant-rea.com', 'Drop giornaliero cumulato'], 'tit': ['Massimo Rea', 'quant-rea.com'],
       'idx': ['Massimo Rea', 'quant-rea.com'], 'emg': ['Massimo Rea', 'quant-rea.com', 'Federal Reserve', 'FRED'],
       'vix': ['Massimo Rea', 'quant-rea.com', 'Stefano Serafini', '© Cboe', 'FRED'], 'alr': ['Massimo Rea', 'quant-rea.com'],
       'ath': ['Massimo Rea', 'quant-rea.com', 'Francesco Caruso']}
VIEWOF = {'mon': 'mon', 'rrg': 'rrg', 'btm': 'btm', 'sec': 'sec', 'tit': 'tit', 'idx': 'idx', 'emg': 'emg', 'vix': 'vix', 'alr': 'alr', 'ath': 'ath'}
done = set()
for sc, d in n.items():
    v = sc.split('-')[0]
    if v not in REQ or v in done or not d.get('srcline'): continue
    done.add(v)
    s = d['srcline']
    miss = [r for r in REQ[v] if r not in s['t']]
    links = s['links']; anc = [l.split('#')[1] for l in links if 'guida.html#' in l]
    print(f"{v:4} citazioni mancanti: {miss or 'nessuna'} · link: {links} · ancora attesa fonti-{v}: {'ok' if anc == ['fonti-' + v] and anc[0] in ids else 'NO'}")
print('viste senza riga di fonti:', sorted(set(REQ) - done))
# ancore usate dalla pagina e dai js
src = open('/tmp/qa-c-new/index.html').read() + ''.join(open(f).read() for f in glob.glob('/tmp/qa-c-new/js/*.js'))
used = set(re.findall(r'data-guide="([^"]+)"', src)) | set(re.findall(r"guida\.html#([\w-]+)", src))
print('ancore usate:', len(used), 'mancanti in guida.html:', sorted(a for a in used if a not in ids))
# link interni della guida
gl = set(re.findall(r'href="#([\w-]+)"', G))
print('link interni della guida senza ancora:', sorted(a for a in gl if a not in ids))
# riquadri «i» aperti: hanno testo e link alla guida giusto?
for sc, d in n.items():
    for meta, t in zip(d['infos'], d['infoText']):
        if t is None: continue
        if not t['t'] or (meta['guide'] and not t['g'].endswith('#' + meta['guide'])): print('RIQUADRO SENZA TESTO O LINK', sc, meta)
