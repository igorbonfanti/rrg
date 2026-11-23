# Controllo 3: per ogni approssimazione dichiarata, dove compare nella 1.12.0 e nella 1.13.0, per scenario:
# V = testo visibile della vista (innerText), A = attributi (title…), I = riquadro «i» aperto, H = nascosto nel DOM (textContent).
import json, re, sys
old, new = json.load(open('old.json')), json.load(open('new.json'))
PAT = {
 'membri di oggi': r'(membri|titoli) di oggi', 'copertura': r'copertura', 'DBMF 28/04/2025': r'28/04/2025|DBMF',
 'ultimo prezzo noto': r'ultimo prezzo|prezzo ricopiato|seduta prima', 'bitcoin mezzanotte': r'mezzanotte UTC',
 'CPI a gradini': r'CPI', 'solo prezzo': r'[Ss]olo prezzo', 'dividendi': r'dividendi', 'provvisorio': r'provvisori',
 'errori di stampa': r'errori di stampa|errore di stampa', 'Taiwan noCap': r'dividendi in azioni',
 'cambio Fed stesso giorno': r'cambio (della Fed )?dello stesso giorno|mezzogiorno di New York',
 'asterisco 3 mesi $': r'\*', 'livelli blu di oggi (storico)': r'livelli blu (di oggi|attuali)', 'ricostruit': r'ricostruit',
 'in-sample': r'nel campione', 'una stima (pesi)': r'una stima',
}
N = lambda s: re.sub(r'\s+', ' ', s or '')
rows = []
for sc in old:
    for nm, p in PAT.items():
        def where(d):
            w = ''
            if re.search(p, N(d['vis'])): w += 'V'
            if re.search(p, ' '.join(d['attrs'])): w += 'A'
            if re.search(p, ' '.join((x or {}).get('t', '') for x in d.get('infoText', []))): w += 'I'
            if not w and re.search(p, N(d['all'])): w += 'H'
            return w or '-'
        a, b = where(old[sc]), where(new[sc])
        if a != '-' or b != '-':
            rows.append((sc, nm, a, b, '  <-- CAMBIA' if a != b else ''))
for r in rows: print(f'{r[0]:20} {r[1]:30} 1.12.0:{r[2]:4} 1.13.0:{r[3]:4}{r[4]}')
