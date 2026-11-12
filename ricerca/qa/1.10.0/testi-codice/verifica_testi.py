# Controllo 1.10.0 (testi): ogni numero dei testi nuovi (guida #credito-petrolio e #massimi, nota del pannello, README,
# note di versione) contro i file dei risultati della ricerca e data/ath.json. Non importa codice dell'app.
# Uso: python3 -I ricerca/qa/1.10.0/testi-codice/verifica_testi.py
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
T = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
cr, pe, bo = J('ricerca/credito-soglia/risultati.json'), J('ricerca/petrolio/risultati.json'), J('ricerca/bolle-rotazione/risultati.json')
cf, ath = J('ricerca/bolle-rotazione/riferimento/confronto.json'), J('data/ath.json')
guida = T('guida.html')
sec = lambda i: re.search(r'<h3 id="%s">.*?(?=<h3 |</section>)' % i, guida, re.S).group(0)
G1, G2 = sec('credito-petrolio'), sec('massimi')
n = bad = 0
def chk(cond, msg):
    global n, bad
    n += 1
    if not cond: bad += 1
    print(('OK   ' if cond else 'FAIL ') + msg)
def has(text, s, where): chk(s in text, f'«{s}» presente in {where}')

# --- credito, 350 pb ---
R = cr['regole']['hy_L350']
chk(R['signals'] == 7 and '<b>7 volte</b>' in G1, f"350 pb: segnali {R['signals']} = «7 volte»")
chk(R['stats']['dd126']['k10'] == 4 and '4 sono state seguite' in G1, f"350 pb: {R['stats']['dd126']['k10']} su 7 con calo ≥10% in 6 mesi")
chk(round(R['alarmShare']) == 74 and 'nel 74% delle sedute' in G1, f"350 pb: in allarme {R['alarmShare']}%")
sig = [x['date'] for x in R['list']]
chk('2007-07-24' in sig and '2021-11-26' in sig and not any('2007-07-24' < d < '2021-11-26' for d in sig) and '24/07/2007' in G1 and '26/11/2021' in G1, 'nessun segnale tra 24/07/2007 e 26/11/2021')
w10 = sum(1 for e in R['events10'] if e.get('warned')); w20 = sum(1 for e in R['events20'] if e.get('warned'))
chk(w10 == 6 and len(R['events10']) == 27 and '6 cali del 10% o più su 27' in G1, f'eventi ≥10% avvisati {w10}/{len(R["events10"])}')
chk(w20 == 2 and len(R['events20']) == 6 and '2 cali del 20% o più su 6' in G1, f'eventi ≥20% avvisati {w20}/{len(R["events20"])}')
chk(all(not (cr['regole'][k]['a']['pass'] and cr['regole'][k]['b']['pass']) for k in ('hy_L300', 'hy_L400', 'hy_L500')) and 'Le soglie vicine (300, 400, 500) non fanno meglio' in G1, 'soglie vicine 300/400/500: nessuna passa insieme (a) e (b)')
dd = {k: v for k, v in cr['verdetti']['crG'].items() if k.startswith('cr_dd')}
chk(len(dd) == 6 and not any(v['a'] and v['b'] for v in dd.values()) and 'tra −3% e −10%' in G1, f'HYG/IEF −3%…−10%: nessuna delle {len(dd)} soglie supera il criterio')
a350 = cr['regole']['hy_L350']['a']
chk(not a350['pass'], f"note di versione «non anticipano i cali dell'S&P 500 meglio del caso»: per i 350 pb la (a) passa ({a350['k']}/{a350['n']} contro {a350['base']}%, +{a350['diff']} punti, p={a350['pBinomiale']}); a non passare è la (b)")
# --- petrolio ---
P = {x['id']: x for x in pe['regole']}; S = {x['id']: x for x in pe['sintesi']}
chk(sum(1 for x in pe['regole'] if not x['sensibilita']) == 48 and 'nessuna delle 48 regole' in G1, '48 regole decise prima')
chk(not any(v['crit'] for v in S.values()), 'nessuna regola supera il criterio')
w = P['R1_WTI_L12_X0']['periodi']['tutto']
chk(w['calo10_12m'] == 9 and w['n_esito12'] == 30 and '9 segnali su 30' in G1, f"WTI sopra il massimo dei 12 mesi: {w['calo10_12m']}/{w['n_esito12']}")
b = pe['base']['tutto']
chk(b['calo10_12m'] == 280 and b['n_esito12'] == 910 and b['quota_calo10'] == 30.8 and '280 mesi su 910 (30,8%)' in G1, 'base 280/910 (30,8%)')
bs = P['R3_Brent_S100_K2']['segnali']
chk(len(bs) == 3, f"«Il Brent sopra 100 dollari per due mesi è successo solo 3 volte (2008, 2011, 2022)»: segnali nei risultati {bs} → {len(bs)} volte, l'ultimo ({bs[-1]}) è quello in corso")
chk(S['R1_WTI_L12_X20']['vant'] < 0 and S['R3_Brent_S100_K2' if 'R3_Brent_S100_K2' in S else 'R1_WTI_L12_X0']['vant'] < 0, f"«nessuna … anticipa meglio di un mese qualsiasi»: WTI +20% sopra il massimo dei 12 mesi +{S['R1_WTI_L12_X20']['vant']} punti, Brent sopra 100 per 2 mesi {S.get('R3_Brent_S100_K2', {}).get('vant')} punti (meglio della base, ma pochi casi: il testo dovrebbe dire «nessuna supera il criterio»)")
e73 = next(e for e in pe['eventi']['calo20'] if e['peak'] == '1973-01-11')
chk(round(-e73['calo']) == 48 and 'ha perso il 48%' in G1, f"1973-74: {e73['calo']}%")
chk(P['R1_WTI_L12_X0']['segnali'][5] == '1973-08' and '7 mesi prima' in G1, 'primo segnale 08/1973, 7 mesi dopo il massimo del 01/1973')
chk(S['R1_WTI_L36_X0']['rec'] == '7/11' and S['R1_WTI_L12_X0']['rec'] == '7/11' and '7 su 11' in G1, 'recessioni 7 su 11')
# --- massimi ---
A = {m['id']: m['stats'] for m in ath['markets']}
chk(A['SPX']['ref'] == 7818.9302 and A['SPX']['refDate'] == '2026-10-06' and '7.818,93 il 06/10/2026' in G2, 'S&P 500 massimo di chiusura 7.818,93 il 06/10/2026')
chk(A['SPX']['intradayRef'] == 7844.52 and '7.844,52' in G2, 'S&P 500 massimo durante la seduta 7.844,52')
chk(A['WTI']['refDate'].startswith('2026-04') and cf['WTI']['3anni'][0] == '2026-04-07' and 'massimo di aprile 2026' in G2, 'petrolio: massimo dei 3 anni ad aprile 2026')
chk(A['BTC']['refDate'] == '2025-10-06' and 'picco di ottobre 2025' in G2, 'bitcoin: picco di ottobre 2025')
chk(cf['BTC']['52sett'][0] == '2025-11-12' and A['BTC']['days'] == 401 and 'di 13 mesi fa' in G2, f"bitcoin: picco di {A['BTC']['days']} giorni fa = 13 mesi, fuori dalle 52 settimane")
chk(round(A['BTC']['fromLowPct']) == 26 and A['BTC']['cycleLowDate'].startswith('2026-06') and 'risalito del 26% dal minimo di giugno' in G2, f"bitcoin +{A['BTC']['fromLowPct']}% dal minimo del {A['BTC']['cycleLowDate']}")
print("NOTA " + f"«sarebbe sembrato quasi intatto»: con la regola del 20% il bitcoin sarebbe a {cf['BTC']['bull20'][1]}% (non «quasi intatto»): da sfumare")
chk(A['WTI']['ath'] == 145.29 and A['WTI']['athDate'] == '2008-07-03' and '2008' in G2, 'massimo di sempre del petrolio nel 2008')
# chiusura contro intraday: «qualche decimo»
print("NOTA " + "«i numeri possono differire di qualche decimo»: S&P 500 −3,44% contro −3,76% (0,32 punti), ma oro GC=F −22,64% contro −26,35% (3,7 punti) in sintesi.md §4: da sfumare")
# --- copie della stessa frase ---
idx, rd, ver = T('index.html'), T('README.md'), T('js/version.js')
for s in ('Francesco Caruso', 'Cicli&'): has(idx, s, 'index.html'); has(rd, s, 'README.md'); has(ver, s, 'js/version.js'); has(G2, s, 'guida #massimi')
has(G1, 'Francesco Caruso', 'guida #credito-petrolio')
has(idx, '0 a −60%', 'nota del pannello'); has(G2, '0 a −60%', 'guida #massimi')
sz = os.path.getsize(os.path.join(ROOT, 'data/ath_history.json'))
chk(320e3 < sz < 360e3 and '~340 KB' in rd, f'README «~340 KB»: data/ath_history.json {sz} byte')
cfg = J('config/ath.json')['markets']
chk([m['maxAge'] for m in cfg if m['id'] == 'KOSPI'] == [12] and all(m['maxAge'] == 4 for m in cfg if m['id'] != 'KOSPI') and 'KOSPI 12' in rd, 'README: maxAge 4, KOSPI 12')
# chiusura contro massimo durante la seduta, sui dati del pannello (data/ath.json)
print('\nDistanza dal massimo di chiusura dei 3 anni contro quella dal massimo durante la seduta (punti percentuali):')
for k, s in A.items():
    di = (s['last'] / s['intradayRef'] - 1) * 100
    print(f"  {k:7s} {s['distPct']:7.2f}  {di:7.2f}  differenza {s['distPct'] - di:5.2f}")
print(f'\n{n} controlli, {bad} falliti')
sys.exit(1 if bad else 0)
