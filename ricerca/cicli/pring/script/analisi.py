"""analisi.py — Pring/Murphy sulla storia lunga: obbligazioni, poi azioni, poi materie prime? (ricerca, non tocca l'app)

Uso: python3 -I ricerca/cicli/pring/script/analisi.py [--rip 2000]
  Legge ricerca/cicli/pring/cache/ (scaricata da scarica.mjs) e scrive ricerca/cicli/pring/risultati.json.
Metodo e definizioni: metodo.py e sintesi.md. Criteri: ricerca/cicli/domanda.md (decisi prima dei risultati).
"""
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dati  # noqa: E402
import metodo as M  # noqa: E402

RIP = int(sys.argv[sys.argv.index('--rip') + 1]) if '--rip' in sys.argv else 2000
SEED = 20261122
ORDINE = ['obbligazioni', 'azioni', 'mp']  # ordine di Pring
NOMI_TIPO = {+1: 'massimi', -1: 'minimi'}
LIVELLI = ['bassa', 'media', 'alta']
# soglie (dichiarate prima dei risultati): azioni e materie prime 15/20/30% come in domanda.md; tassi in punti
# 0,75/1/1,5; dollaro 10/15/20% (si muove meno)
SOGLIE = {
    'azioni': ('pct', [0.15, 0.20, 0.30]),
    'mp': ('pct', [0.15, 0.20, 0.30]),
    'ppiaco': ('pct', [0.15, 0.20, 0.30]),
    'metalli': ('pct', [0.15, 0.20, 0.30]),
    'petrolio': ('pct', [0.15, 0.20, 0.30]),
    'rame': ('pct', [0.15, 0.20, 0.30]),
    'imf': ('pct', [0.15, 0.20, 0.30]),
    'obbligazioni': ('abs', [0.75, 1.0, 1.5]),
    'dollaro': ('pct', [0.10, 0.15, 0.20]),
    'wb_nonen': ('pct', [0.15, 0.20, 0.30]),
    'wb_metalli': ('pct', [0.15, 0.20, 0.30]),
}
META = 1986 * 12 - 1900 * 12  # primo mese della seconda metà: 01/1986
DAL2000 = (2000 - 1900) * 12
FINESTRA_M2 = 18
FINESTRA_M1 = 24
FINESTRA_UTILE = 18
ANTICIPO_MIN = 3

S = dati.carica()
SER = dict(S)
SER['obbligazioni'] = S['tassi']


def punti(nome, definizione, livello=None):
    modo, th = SOGLIE[nome]
    inv = nome == 'obbligazioni'
    return M.punti_serie(SER[nome], definizione, th[livello] if definizione == 'soglia' else None, modo, inv)


def periodo(nomi):
    inizio = max(M.mese(SER[n].index[0]) for n in nomi) + 12
    fine = min(M.mese(SER[n].index[-1]) for n in nomi)
    return inizio, fine


def nber():
    r = S['rec']
    v = r.values
    m = [M.mese(t) for t in r.index]
    picchi = [m[i] for i in range(1, len(v)) if v[i] == 1 and v[i - 1] == 0]
    minimi = [m[i] for i in range(len(v) - 1) if v[i] == 1 and v[i + 1] == 0]
    return picchi, minimi


PICCHI_NBER, MINIMI_NBER = nber()


def pts_periodo(nomi, definizione, livello, inizio, fine):
    out = {}
    for n in nomi:
        out[n] = [(m, t) for m, t, c in punti(n, definizione, livello) if inizio <= m <= fine]
    return out


def calcola(pts, ordine, raggr, inizio, fine):
    """Statistiche per massimi e minimi. pts: dict serie -> [(mese, tipo)]."""
    res = {}
    for tipo in (+1, -1):
        pt = {k: M.per_tipo(v, tipo) for k, v in pts.items()}
        if raggr == 'M2':
            cic = M.cicli_m2(pt, tipo, FINESTRA_M2)
        else:
            anc = [a for a in (PICCHI_NBER if tipo == +1 else MINIMI_NBER) if inizio <= a <= fine]
            cic = [c for c in M.cicli_m1(pt, anc, FINESTRA_M1)]
        res[tipo] = (cic, M.statistiche(cic, ordine))
    return res


def piatto(res, ordine):
    """Statistiche numeriche per il modello nullo."""
    out = {}
    for tipo, (cic, st) in res.items():
        out[f'{tipo}:F'] = st['friedman']
        out[f'{tipo}:nperf'] = st['perfetti']
        out[f'{tipo}:nacc'] = st['netto_accordo']
        for cp, v in st['coppie'].items():
            out[f'{tipo}:{cp}'] = v['netto']
    return out


def analisi_completa(nomi, definizione, livello, raggr, inizio, fine, rng, rip=RIP):
    pts = pts_periodo(nomi, definizione, livello, inizio, fine)
    obs = calcola(pts, nomi, raggr, inizio, fine)
    nul = M.null_shift(pts, inizio, fine, rip, rng, lambda sp: piatto(calcola(sp, nomi, raggr, inizio, fine), nomi))
    out = {}
    for tipo, (cic, st) in obs.items():
        d = {
            'cicli': st['cicli'], 'completi': st['completi'], 'perfetti': st['perfetti'],
            'quota_perfetti': st['quota_perfetti'], 'W': st['W'], 'accordo': st['accordo'],
            'friedman': st['friedman'], 'netto_accordo': st['netto_accordo'],
            'p_W': M.p_value(st['friedman'], nul[f'{tipo}:F']),
            'p_perfetti': M.p_value(st['perfetti'], nul[f'{tipo}:nperf']),
            'p_accordo': M.p_value(st['netto_accordo'], nul[f'{tipo}:nacc']),
            'null_media_perfetti': float(np.nanmean(nul[f'{tipo}:nperf'])),
            'null_media_friedman': float(np.nanmean(nul[f'{tipo}:F'])),
            'coppie': {},
            'elenco': [{k: (M.data_mese(v) if not k.startswith('_') else M.data_mese(v)) for k, v in c.items()} for c in cic],
        }
        for cp, v in st['coppie'].items():
            d['coppie'][cp] = dict(v, p=M.p_value(v['netto'], nul[f'{tipo}:{cp}']), null_media_netto=float(np.mean(nul[f'{tipo}:{cp}'])),
                                   ritardo_mediano=float(np.median(v['ritardi'])) if v['ritardi'] else None)
        # permutazione dell'ordine dentro i cicli completi (secondo modello nullo, solo per l'ordine perfetto)
        compl = [c for c in cic if all(k in c for k in nomi)]
        if compl:
            mat = np.array([[c[k] for k in nomi] for c in compl], float)
            perm_rng = np.random.default_rng(SEED + 7)
            cnt = 0
            for _ in range(rip):
                q = np.array([r[perm_rng.permutation(len(nomi))] for r in mat])
                perf = (np.diff(q, axis=1) > 0).all(axis=1).mean()
                cnt += perf >= st['quota_perfetti'] - 1e-12  # stessi cicli: quota e numero si equivalgono
            d['p_perfetti_permutazione'] = (1 + cnt) / (1 + rip)
        out[NOMI_TIPO[tipo]] = d
    return out, pts


R = {'generato': pd.Timestamp.now().isoformat(), 'ripetizioni': RIP, 'seme': SEED}
rng = np.random.default_rng(SEED)

# ------------------------------------------------------------------ dati e punti di svolta
INI, FIN = periodo(ORDINE)
R['periodo'] = {'inizio_punti': M.data_mese(INI), 'fine': M.data_mese(FIN), 'mesi': FIN - INI + 1}
R['serie'] = {k: {'nome': dati.NOMI.get(k, k), 'dal': str(v.index[0].date())[:7], 'al': str(v.index[-1].date())[:7], 'mesi': len(v)}
              for k, v in S.items() if k != 'rec'}
R['nber'] = {'picchi': [M.data_mese(m) for m in PICCHI_NBER if m >= INI], 'minimi': [M.data_mese(m) for m in MINIMI_NBER if m >= INI]}

elenco = {}
for n in ['obbligazioni', 'azioni', 'mp', 'ppiaco', 'metalli', 'petrolio', 'rame', 'imf', 'dollaro', 'wb_nonen', 'wb_metalli']:
    elenco[n] = {}
    x = SER[n]
    m0 = M.mese(x.index[0])
    for lv in range(3):
        pts = punti(n, 'soglia', lv)
        elenco[n][LIVELLI[lv]] = [{'mese': M.data_mese(m), 'tipo': 'massimo' if t == 1 else 'minimo',
                                   'valore': round(float(x.iloc[m - m0]), 4), 'conferma': M.data_mese(c)} for m, t, c in pts]
    elenco[n]['bry_boschan'] = [{'mese': M.data_mese(m), 'tipo': 'massimo' if t == 1 else 'minimo',
                                 'valore': round(float(x.iloc[m - m0]), 4)} for m, t, c in punti(n, 'bb')]
R['punti'] = elenco
R['nota_punti'] = ('Per le obbligazioni «massimo» e «minimo» sono nel verso del prezzo (minimo del rendimento = massimo); '
                   'il valore è il rendimento GS10 in %.')

# ------------------------------------------------------------------ controlli dei dati (buchi, raccordi, seconde fonti)
cd = {'buchi': {}}
for k, v in S.items():
    full = pd.date_range(v.index.min(), v.index.max(), freq='MS')
    cd['buchi'][k] = int(len(full.difference(v.index)))
a_, b_ = dati.fred('WPUID62'), dati.fred('WPUSOP1000')
jj_ = pd.concat([a_, b_], axis=1).dropna()
dd_ = (jj_.iloc[:, 0] - jj_.iloc[:, 1]).abs()
cd['WPUID62_contro_WPUSOP1000'] = {'mesi_in_comune': len(jj_), 'scarto_massimo': float(dd_.max()), 'mesi_con_scarto_oltre_0_05': int((dd_ > 0.05).sum()),
                                   'primo_mese_con_scarto': str(dd_[dd_ > 0.05].index.min().date())[:7]}
ult_ = pd.Timestamp(S['tassi'].index[-1])
d10 = dati.mensile(dati.fred('DGS10'), ult_)
tnx = dati.mensile(dati.yahoo('^TNX'), ult_)
jj_ = pd.concat([S['tassi'], d10, tnx], axis=1).dropna()
cd['GS10_contro_DGS10_media_mensile'] = {'mesi': len(jj_), 'scarto_massimo_punti': float((jj_.iloc[:, 0] - jj_.iloc[:, 1]).abs().max())}
cd['GS10_contro_Yahoo_TNX_media_mensile'] = {'scarto_massimo_punti': float((jj_.iloc[:, 0] - jj_.iloc[:, 2]).abs().max()),
                                             'scarto_99_percentile': float((jj_.iloc[:, 0] - jj_.iloc[:, 2]).abs().quantile(0.99))}
old_ = dati.fred('TWEXMMTH')
afe_ = dati.mensile(dati.fred('DTWEXAFEGS'), pd.Timestamp('2019-12-01'))
jj_ = pd.concat([old_, afe_], axis=1).dropna()
cd['dollaro_raccordo'] = {'mesi_in_comune_2006_2019': len(jj_), 'correlazione_variazioni_mensili': float(np.log(jj_).diff().dropna().corr().iloc[0, 1])}
R['controlli_dati'] = cd

# ------------------------------------------------------------------ criterio 1 e domanda 2: tutto il campione
R['principale'] = {}
for definizione, livelli in (('soglia', [0, 1, 2]), ('bb', [None])):
    for lv in livelli:
        chiave = LIVELLI[lv] if definizione == 'soglia' else 'bry_boschan'
        R['principale'][chiave] = {}
        for raggr in ('M2', 'M1'):
            out, _ = analisi_completa(ORDINE, definizione, lv, raggr, INI, FIN, rng)
            R['principale'][chiave][raggr] = out
        print('fatto', chiave, flush=True)

# ------------------------------------------------------------------ stabilità: metà del campione e dopo il 2000
R['meta'] = {}
for nome_p, (a, b) in {'fino_1985': (INI, META - 1), 'dal_1986': (META, FIN), 'dal_2000': (DAL2000, FIN)}.items():
    R['meta'][nome_p] = {}
    for definizione, livelli in (('soglia', [0, 1, 2]), ('bb', [None])):
        for lv in livelli:
            chiave = LIVELLI[lv] if definizione == 'soglia' else 'bry_boschan'
            out, _ = analisi_completa(ORDINE, definizione, lv, 'M2', a, b, rng)
            R['meta'][nome_p][chiave] = out
    print('fatto', nome_p, flush=True)

# correlazione azioni-obbligazioni (rendimenti mensili: log S&P 500 contro −Δ GS10), finestre di 60 mesi
ra = np.log(S['azioni']).diff()
rb = -S['tassi'].diff()
j = pd.concat([ra, rb], axis=1).dropna()
j.columns = ['a', 'b']
roll = j['a'].rolling(60).corr(j['b']).dropna()
R['correlazione_azioni_obbligazioni'] = {
    'fino_1999': float(j.loc[:'1999-12-01'].corr().iloc[0, 1]),
    'dal_2000': float(j.loc['2000-01-01':].corr().iloc[0, 1]),
    '1954_1985': float(j.loc['1954-01-01':'1985-12-01'].corr().iloc[0, 1]),
    '1986_2026': float(j.loc['1986-01-01':].corr().iloc[0, 1]),
    'mobile_60m_primo_negativo_dopo_1995': str(roll[(roll.index >= '1995-01-01') & (roll < 0)].index[0].date())[:7],
    'mobile_60m_quota_negativa_2000_2020': float((roll.loc['2000-01-01':'2020-12-01'] < 0).mean()),
    'mobile_60m_ultimo': float(roll.iloc[-1]), 'mobile_60m_ultimo_mese': str(roll.index[-1].date())[:7],
    'mobile_60m_quota_negativa_fino_1999': float((roll.loc[:'1999-12-01'] < 0).mean()),
}

# ------------------------------------------------------------------ criterio 2: coppie guida-seguace
c2 = []
for lv in range(3):
    for tipo in ('massimi', 'minimi'):
        for cp, v in R['principale'][LIVELLI[lv]]['M2'][tipo]['coppie'].items():
            c2.append({'soglia': LIVELLI[lv], 'tipo': tipo, 'coppia': cp, 'n': v['n'], 'dopo': v['dopo'], 'insieme': v['insieme'],
                       'quota': v['quota'], 'p': v['p'], 'ritardo_mediano': v['ritardo_mediano']})
q = M.bh([x['p'] for x in c2])
for x, qq in zip(c2, q):
    x['q_BH'] = float(qq)
    h1 = R['meta']['fino_1985'][x['soglia']][x['tipo']]['coppie'][x['coppia']]
    h2 = R['meta']['dal_1986'][x['soglia']][x['tipo']]['coppie'][x['coppia']]
    x['meta1'] = {'n': h1['n'], 'dopo': h1['dopo'], 'quota': h1['quota']}
    x['meta2'] = {'n': h2['n'], 'dopo': h2['dopo'], 'quota': h2['quota']}
    x['regge'] = bool(x['quota'] >= 0.75 and x['n'] >= 8 and x['q_BH'] < 0.05 and
                      (h1['quota'] or 0) >= 0.75 and (h2['quota'] or 0) >= 0.75 and h1['n'] > 0 and h2['n'] > 0)
R['criterio2'] = c2

# ------------------------------------------------------------------ criterio 3: fuori campione
def ordine_stimato(cicli, nomi):
    """Ordine dato dal rango medio nei cicli completi (a parità resta l'ordine di Pring)."""
    compl = [c for c in cicli if all(k in c for k in nomi)]
    if not compl:
        return None
    R_ = np.array([M.ranghi([c[k] for k in nomi]) for c in compl])
    media = R_.mean(0)
    return [nomi[i] for i in np.argsort(media, kind='mergesort')], media.tolist()


def accordo_con(cicli, pred):
    """Accordo dei cicli completi con l'ordine pred: (quota media di coppie concordi, cicli, netto = concordi − discordi).
    Il test usa il netto (come per le coppie), la quota è descrittiva."""
    compl = [c for c in cicli if all(k in c for k in pred)]
    if not compl:
        return np.nan, 0, 0.0
    acc, net = [], 0.0
    for c in compl:
        s, k = 0.0, 0
        for a in range(len(pred)):
            for b in range(a + 1, len(pred)):
                x, y = c[pred[a]], c[pred[b]]
                s += 1.0 if y > x else (0.5 if y == x else 0.0)
                net += 1.0 if y > x else (0.0 if y == x else -1.0)
                k += 1
        acc.append(s / k)
    return float(np.mean(acc)), len(compl), net


R['criterio3'] = {}
for definizione, livelli in (('soglia', [0, 1, 2]), ('bb', [None])):
    for lv in livelli:
        chiave = LIVELLI[lv] if definizione == 'soglia' else 'bry_boschan'
        R['criterio3'][chiave] = {}
        p1 = pts_periodo(ORDINE, definizione, lv, INI, META - 1)
        p2 = pts_periodo(ORDINE, definizione, lv, META, FIN)
        for tipo in (+1, -1):
            c1 = M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p1.items()}, tipo, FINESTRA_M2)
            est = ordine_stimato(c1, ORDINE)
            c2_ = M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p2.items()}, tipo, FINESTRA_M2)
            if est is None:
                R['criterio3'][chiave][NOMI_TIPO[tipo]] = {'ordine_stimato': None}
                continue
            pred = est[0]
            obs, ncomp, net = accordo_con(c2_, pred)
            obs_pring, _, net_pring = accordo_con(c2_, ORDINE)

            def f(sp, pred=pred, tipo=tipo):
                cc = M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in sp.items()}, tipo, FINESTRA_M2)
                return {'acc': accordo_con(cc, pred)[2], 'pring': accordo_con(cc, ORDINE)[2]}
            nul = M.null_shift(p2, META, FIN, RIP, rng, f)
            R['criterio3'][chiave][NOMI_TIPO[tipo]] = {
                'ordine_stimato_1954_1985': pred, 'ranghi_medi': est[1], 'cicli_completi_1954_1985': sum(1 for c in c1 if all(k in c for k in ORDINE)),
                'cicli_completi_1986_oggi': ncomp, 'accordo_1986_oggi': obs, 'netto_1986_oggi': net, 'p': M.p_value(net, nul['acc']),
                'netto_null_medio': float(np.nanmean(nul['acc'])),
                'accordo_ordine_pring_1986_oggi': obs_pring, 'netto_ordine_pring': net_pring, 'p_ordine_pring': M.p_value(net_pring, nul['pring'])}
print('fatto criterio 3', flush=True)

# ------------------------------------------------------------------ criterio 4: utilità
def utilita(guida, seguace, livello, tipo, a, b):
    pg = [(m, t, c) for m, t, c in punti(guida, 'soglia', livello) if t == tipo]
    ps = [m for m, t, c in punti(seguace, 'soglia', livello) if t == tipo]
    ultimo = b - 24  # servono 18 mesi dopo e il tempo per confermare il punto del seguace
    casi = []
    for m, t, c in pg:
        if not (a <= c <= ultimo):
            continue
        dopo = [s for s in ps if c < s <= c + FINESTRA_UTILE]
        casi.append({'guida': M.data_mese(m), 'conferma': M.data_mese(c),
                     'seguace': M.data_mese(dopo[0]) if dopo else None, 'anticipo': (dopo[0] - c) if dopo else None})
    base_m = [mm for mm in range(a, ultimo + 1)]
    base = np.mean([any(mm < s <= mm + FINESTRA_UTILE for s in ps) for mm in base_m]) if base_m else np.nan
    n = len(casi)
    k = sum(1 for x in casi if x['seguace'])
    from math import comb
    p = sum(comb(n, i) * base ** i * (1 - base) ** (n - i) for i in range(k, n + 1)) if n else np.nan
    ant = [x['anticipo'] for x in casi if x['anticipo'] is not None]
    return {'n': n, 'colti': k, 'quota': k / n if n else np.nan, 'base': float(base), 'p_binomiale': float(p),
            'anticipo_mediano': float(np.median(ant)) if ant else None, 'casi': casi}


c4 = []
for lv in range(3):
    for tipo in (+1, -1):
        for g, s_ in (('obbligazioni', 'azioni'), ('azioni', 'mp'), ('obbligazioni', 'mp')):
            u = utilita(g, s_, lv, tipo, INI, FIN)
            u1 = utilita(g, s_, lv, tipo, INI, META - 1)
            u2 = utilita(g, s_, lv, tipo, META, FIN)
            c4.append({'soglia': LIVELLI[lv], 'tipo': NOMI_TIPO[tipo], 'coppia': f'{g}>{s_}', **u,
                       'meta1': {k: u1[k] for k in ('n', 'colti', 'quota', 'base')},
                       'meta2': {k: u2[k] for k in ('n', 'colti', 'quota', 'base')}})
q = M.bh([x['p_binomiale'] for x in c4])
for x, qq in zip(c4, q):
    x['q_BH'] = float(qq)
    x['regge'] = bool(x['q_BH'] < 0.05 and x['quota'] > x['base'] and (x['anticipo_mediano'] or 0) >= ANTICIPO_MIN and
                      x['meta1']['n'] > 0 and x['meta2']['n'] > 0 and
                      x['meta1']['quota'] > x['meta1']['base'] and x['meta2']['quota'] > x['meta2']['base'])
R['criterio4'] = c4

# ------------------------------------------------------------------ dollaro contro materie prime (verso opposto)
def dollaro_opposto(lv_mp, lv_dol, a, b, rip, rng, tolleranza=12):
    pm = [(m, t) for m, t, c in punti('mp', 'soglia', lv_mp) if a <= m <= b]
    pd_ = [(m, t) for m, t, c in punti('dollaro', 'soglia', lv_dol) if a <= m <= b]

    def stat(pm_, pd2):
        if not pm_:
            return np.nan
        ok = sum(1 for m, t in pm_ if any(t2 == -t and abs(m2 - m) <= tolleranza for m2, t2 in pd2))
        return ok / len(pm_)
    obs = stat(pm, pd_)
    L = b - a + 1
    nul = np.array([stat(pm, M.sposta(pd_, int(rng.integers(0, L)), a, L)) for _ in range(rip)])
    stesso = sum(1 for m, t in pm if any(t2 == t and abs(m2 - m) <= tolleranza for m2, t2 in pd_)) / len(pm) if pm else np.nan
    return {'punti_mp': len(pm), 'punti_dollaro': len(pd_), 'quota_con_dollaro_opposto_12m': obs, 'p': M.p_value(obs, nul),
            'null_media': float(np.nanmean(nul)), 'quota_con_dollaro_stesso_verso_12m': stesso}


ID, FD = periodo(['mp', 'dollaro'])
R['dollaro'] = {'periodo': [M.data_mese(ID), M.data_mese(FD)], 'soglie': {}}
for lv in range(3):
    R['dollaro']['soglie'][LIVELLI[lv]] = dollaro_opposto(lv, lv, ID, FD, RIP, rng)
lm = np.log(S['mp']).diff(12)
ld = np.log(S['dollaro']).diff(12)
jj = pd.concat([lm, ld], axis=1).dropna()
R['dollaro']['correlazione_var_12m'] = float(jj.corr().iloc[0, 1])
R['dollaro']['correlazione_var_12m_dal_2000'] = float(jj.loc['2000-01-01':].corr().iloc[0, 1])
R['dollaro']['correlazione_var_12m_fino_1999'] = float(jj.loc[:'1999-12-01'].corr().iloc[0, 1])
# p della correlazione con lo spostamento circolare del dollaro (le variazioni a 12 mesi si sovrappongono)
xv, yv = jj.iloc[:, 0].values, jj.iloc[:, 1].values
nulc = np.array([np.corrcoef(xv, np.roll(yv, int(rng.integers(24, len(yv) - 24))))[0, 1] for _ in range(RIP)])
R['dollaro']['p_correlazione_negativa'] = M.p_value(R['dollaro']['correlazione_var_12m'], nulc, maggiore=False)

# ------------------------------------------------------------------ altre serie di materie prime (robustezza)
R['altre_mp'] = {}
for alt in ('ppiaco', 'metalli', 'petrolio', 'imf', 'wb_nonen', 'wb_metalli'):
    nomi = ['obbligazioni', 'azioni', alt]
    a, b = periodo(nomi)
    R['altre_mp'][alt] = {'periodo': [M.data_mese(a), M.data_mese(b)]}
    for definizione, livelli in (('soglia', [0, 1, 2]), ('bb', [None])):
        for lv in livelli:
            chiave = LIVELLI[lv] if definizione == 'soglia' else 'bry_boschan'
            out, _ = analisi_completa(nomi, definizione, lv, 'M2', a, b, rng, rip=min(RIP, 1000))
            for t in out.values():
                t.pop('elenco', None)
            R['altre_mp'][alt][chiave] = out
    print('fatto', alt, flush=True)

# ------------------------------------------------------------------ tabella NBER: dove cade ogni serie
tab = []
for tipo, anc in ((+1, PICCHI_NBER), (-1, MINIMI_NBER)):
    for ch in ('media', 'bry_boschan'):
        for c in R['principale'][ch]['M1'][NOMI_TIPO[tipo]]['elenco']:
            a = c['_ancora']
            am = (int(a[:4]) - 1900) * 12 + int(a[5:]) - 1
            row = {'definizione': ch, 'tipo': NOMI_TIPO[tipo], 'nber': a}
            for k in ORDINE:
                row[k] = ((int(c[k][:4]) - 1900) * 12 + int(c[k][5:]) - 1 - am) if k in c else None
            tab.append(row)
R['tabella_nber'] = tab

# ------------------------------------------------------------------ stadi di Pring: storia e oggi
STADI = {(1, -1, -1): 1, (1, 1, -1): 2, (1, 1, 1): 3, (-1, 1, 1): 4, (-1, -1, 1): 5, (-1, -1, -1): 6}


def direzioni_mm12():
    """+1 se sopra la media mobile a 12 mesi (per le obbligazioni: rendimento sotto la media), −1 altrimenti."""
    out = {}
    for k in ORDINE:
        x = SER[k]
        mm = x.rolling(12).mean()
        d = np.sign(x - mm)
        if k == 'obbligazioni':
            d = -d
        out[k] = d
    return pd.concat(out, axis=1, sort=True).dropna()


def direzioni_zigzag(livello):
    """+1 se l'ultimo punto confermato a quel mese è un minimo (si sale), −1 se è un massimo; nel verso di Pring."""
    out = {}
    for k in ORDINE:
        x = SER[k]
        pts = punti(k, 'soglia', livello)
        idx = x.index
        d = pd.Series(np.nan, index=idx)
        for m, t, c in pts:
            # dal mese di conferma in poi la direzione è quella dopo il punto
            dt = pd.Timestamp(1900 + c // 12, c % 12 + 1, 1)
            d.loc[dt:] = -t
        out[k] = d
    return pd.concat(out, axis=1, sort=True).dropna()


def storia_stadi(D):
    D = D[(D.index >= pd.Timestamp(1900 + INI // 12, INI % 12 + 1, 1))]
    st = [STADI.get(tuple(int(v) for v in r), 0) for r in D.values]
    s = pd.Series(st, index=D.index)
    freq = {str(k): int((s == k).sum()) for k in range(0, 7)}
    # passaggi: avanti di uno (6 → 1 compreso), indietro, salti
    cambi = [(a, b) for a, b in zip(s.values[:-1], s.values[1:]) if a != b]
    avanti = sum(1 for a, b in cambi if a and b and (b - a) % 6 == 1)
    indietro = sum(1 for a, b in cambi if a and b and (a - b) % 6 == 1)
    return s, {'mesi': len(s), 'frequenza': freq, 'cambi': len(cambi), 'avanti_di_uno': avanti, 'indietro_di_uno': indietro,
               'quota_fuori_schema': freq['0'] / len(s)}


R['stadi'] = {}
for nome, D in (('mm12', direzioni_mm12()), ('soglia_media', direzioni_zigzag(1)), ('soglia_bassa', direzioni_zigzag(0))):
    s, info = storia_stadi(D)
    # base: spostamento circolare delle tre direzioni (quota fuori schema e passaggi in avanti)
    Dv = D[(D.index >= pd.Timestamp(1900 + INI // 12, INI % 12 + 1, 1))].values
    nul_fuori, nul_av = [], []
    for _ in range(RIP):
        Z = np.column_stack([np.roll(Dv[:, 0], int(rng.integers(0, len(Dv)))), np.roll(Dv[:, 1], int(rng.integers(0, len(Dv)))), Dv[:, 2]])
        ss = [STADI.get(tuple(int(v) for v in r), 0) for r in Z]
        cambi = [(a, b) for a, b in zip(ss[:-1], ss[1:]) if a != b]
        nul_fuori.append(sum(1 for v in ss if v == 0) / len(ss))
        tot = sum(1 for a, b in cambi if a and b)
        nul_av.append(sum(1 for a, b in cambi if a and b and (b - a) % 6 == 1) / tot if tot else np.nan)
    tot = sum(1 for a, b in zip(s.values[:-1], s.values[1:]) if a != b and a and b)
    info['quota_avanti_tra_cambi_in_schema'] = info['avanti_di_uno'] / tot if tot else None
    info['p_fuori_schema_minore'] = M.p_value(info['quota_fuori_schema'], np.array(nul_fuori), maggiore=False)
    info['p_avanti'] = M.p_value(info['quota_avanti_tra_cambi_in_schema'], np.array(nul_av))
    info['null_fuori_schema_media'] = float(np.mean(nul_fuori))
    info['null_avanti_media'] = float(np.nanmean(nul_av))
    info['ultimi_12_mesi'] = {str(k.date())[:7]: int(v) for k, v in s.iloc[-12:].items()}
    info['direzioni_ultimo_mese'] = {k: int(v) for k, v in D.iloc[-1].items()}
    R['stadi'][nome] = info

# stato di oggi per serie (punti in corso)
oggi = {}
for k in ORDINE + ['dollaro']:
    x = SER[k]
    modo, th = SOGLIE[k]
    st = {}
    for lv in range(3):
        pts, (stato, i_corso) = M.zigzag(x.values.astype(float), th[lv], modo)
        if k == 'obbligazioni':
            stato = -stato
        ult = pts[-1]
        st[LIVELLI[lv]] = {'ultimo_punto': M.data_mese(M.mese(x.index[ult[0]])),
                           'tipo_ultimo': ('massimo' if (ult[1] * (-1 if k == 'obbligazioni' else 1)) == 1 else 'minimo'),
                           'valore_ultimo': float(x.iloc[ult[0]]),
                           'direzione': 'su' if stato == 1 else 'giù',
                           'estremo_in_corso': M.data_mese(M.mese(x.index[i_corso])), 'valore_estremo': float(x.iloc[i_corso]),
                           'ultimo_valore': float(x.iloc[-1])}
    mm = x.rolling(12).mean().iloc[-1]
    st['mm12'] = {'valore': float(x.iloc[-1]), 'media_12m': float(mm),
                  'direzione': ('su' if (x.iloc[-1] > mm) != (k == 'obbligazioni') else 'giù')}
    st['ultimo_mese'] = str(x.index[-1].date())[:7]
    oggi[k] = st
# ultimo dato giornaliero (solo descrizione)
spx_d = dati.yahoo('^GSPC')
dgs = dati.fred('DGS10')
oggi['giornaliero'] = {'sp500_ultima_seduta': str(spx_d.index[-1].date()), 'sp500': float(spx_d.iloc[-1]),
                       'sp500_massimo_2026': float(spx_d.loc['2026-01-01':].max()),
                       'sp500_data_massimo_2026': str(spx_d.loc['2026-01-01':].idxmax().date()),
                       'dgs10_ultimo': str(dgs.index[-1].date()), 'dgs10': float(dgs.iloc[-1]),
                       'dgs10_min_12m': float(dgs.iloc[-260:].min()), 'dgs10_max_12m': float(dgs.iloc[-260:].max())}
R['oggi'] = oggi

# ------------------------------------------------------------------ aggiunte dopo i primi risultati (non entrano nei verdetti)
# (a) sensibilità alla finestra dei cicli comuni M2
R['sensibilita_finestra'] = {}
for fin_ in (12, 24, 36, 48):
    FINESTRA_M2_OLD = FINESTRA_M2
    FINESTRA_M2 = fin_
    R['sensibilita_finestra'][str(fin_)] = {}
    for definizione, lv, chiave in (('soglia', 0, 'bassa'), ('soglia', 1, 'media'), ('bb', None, 'bry_boschan')):
        out, _ = analisi_completa(ORDINE, definizione, lv, 'M2', INI, FIN, rng)
        for t in out.values():
            t.pop('elenco', None)
        R['sensibilita_finestra'][str(fin_)][chiave] = out
    FINESTRA_M2 = FINESTRA_M2_OLD
print('fatto sensibilità', flush=True)

# (b) fuori campione per coppie: il verso prevalente di ogni coppia nel 1954-1985 prevede quello del 1986-oggi?
R['criterio3_coppie'] = []
for definizione, lv, chiave in (('soglia', 0, 'bassa'), ('soglia', 1, 'media'), ('soglia', 2, 'alta'), ('bb', None, 'bry_boschan')):
    p1 = pts_periodo(ORDINE, definizione, lv, INI, META - 1)
    p2 = pts_periodo(ORDINE, definizione, lv, META, FIN)
    for tipo in (+1, -1):
        c1 = M.statistiche(M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p1.items()}, tipo, FINESTRA_M2), ORDINE)
        c2s = M.statistiche(M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p2.items()}, tipo, FINESTRA_M2), ORDINE)

        def f(sp, tipo=tipo):
            st = M.statistiche(M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in sp.items()}, tipo, FINESTRA_M2), ORDINE)
            return {cp: v['netto'] for cp, v in st['coppie'].items()}
        nul = M.null_shift(p2, META, FIN, RIP, rng, f)
        for cp in c1['coppie']:
            verso = 1 if c1['coppie'][cp]['netto'] >= 0 else -1
            oss = verso * c2s['coppie'][cp]['netto']
            R['criterio3_coppie'].append({'definizione': chiave, 'tipo': NOMI_TIPO[tipo], 'coppia': cp,
                                          'prima_meta': {k: c1['coppie'][cp][k] for k in ('n', 'dopo', 'prima')},
                                          'verso_previsto': 'B dopo A' if verso == 1 else 'B prima di A',
                                          'seconda_meta': {k: c2s['coppie'][cp][k] for k in ('n', 'dopo', 'prima')},
                                          'netto_nel_verso_previsto': oss, 'p': M.p_value(oss, verso * nul[cp])})
q = M.bh([x['p'] for x in R['criterio3_coppie']])
for x, qq in zip(R['criterio3_coppie'], q):
    x['q_BH'] = float(qq)

# (c) controllo dell'S&P 500 con il Dow Jones (NBER Macrohistory, 1914-1968): punti a 15 e 20% sul periodo comune
dj = dati.fred('M1109BUSM293NNBR')
sp = S['azioni']
a0, b0 = max(dj.index[0], sp.index[0]), min(dj.index[-1], sp.index[-1])
R['controllo_dow_jones'] = {'periodo': [str(a0.date())[:7], str(b0.date())[:7]]}
for th in (0.15, 0.20):
    pa, _ = M.zigzag(sp.loc[a0:b0].values, th, 'pct')
    pb, _ = M.zigzag(dj.loc[a0:b0].values, th, 'pct')
    ia = [(i, t) for i, t, c in pa]
    ib = [(i, t) for i, t, c in pb]
    match = sum(1 for i, t in ia if any(t2 == t and abs(i2 - i) <= 2 for i2, t2 in ib))
    esatti = sum(1 for i, t in ia if (i, t) in ib)
    R['controllo_dow_jones'][f'{int(th * 100)}%'] = {'punti_sp500': len(ia), 'punti_dow': len(ib), 'entro_2_mesi': match, 'stesso_mese': esatti}

# (d) mese in corso (novembre 2026, parziale): solo descrizione dello stato di oggi
nov = spx_d.loc['2026-11-01':]
mm12_nov = (S['azioni'].iloc[-11:].sum() + nov.mean()) / 12
R['oggi']['novembre_parziale'] = {'sp500_media_sedute': float(nov.mean()), 'sedute': int(len(nov)), 'sp500_mm12_con_novembre': float(mm12_nov),
                                  'dgs10_media_novembre': float(dgs.loc['2026-11-01':].mean()),
                                  'gs10_mm12_con_novembre': float((S['tassi'].iloc[-11:].sum() + dgs.loc['2026-11-01':].mean()) / 12)}

# (e) correzione per i test multipli sulle serie di controllo (ordine perfetto e concordanza) e metà del campione
rob = []
for alt, v in R['altre_mp'].items():
    for ch in LIVELLI + ['bry_boschan']:
        for t in ('massimi', 'minimi'):
            for st_ in ('p_perfetti', 'p_W'):
                rob.append({'serie': alt, 'definizione': ch, 'tipo': t, 'statistica': st_, 'p': v[ch][t][st_],
                            'completi': v[ch][t]['completi'], 'perfetti': v[ch][t]['perfetti']})
q = M.bh([x['p'] for x in rob])
for x, qq in zip(rob, q):
    x['q_BH'] = float(qq)
R['robustezza_BH'] = sorted(rob, key=lambda x: x['p'])[:12]
R['robustezza_BH_numero_test'] = len(rob)
R['altre_mp_meta'] = {}
for alt in ('metalli', 'wb_nonen', 'wb_metalli'):
    nomi = ['obbligazioni', 'azioni', alt]
    a, b = periodo(nomi)
    R['altre_mp_meta'][alt] = {}
    for nome_p, (x0, x1) in {'fino_1985': (a, META - 1), 'dal_1986': (META, b)}.items():
        out, _ = analisi_completa(nomi, 'bb', None, 'M2', x0, x1, rng, rip=min(RIP, 1000))
        R['altre_mp_meta'][alt][nome_p] = {t: {k: out[t][k] for k in ('completi', 'perfetti', 'p_perfetti', 'p_W')} | {'elenco': out[t]['elenco']}
                                           for t in ('massimi', 'minimi')}

# ------------------------------------------------------------------ verdetti
def verdetto_c1(stat):
    out = {}
    for tipo in ('massimi', 'minimi'):
        ps = [R['principale'][lv]['M2'][tipo][stat] for lv in LIVELLI]
        out[tipo] = {'p': ps, 'soglie_sotto_005': int(sum(1 for p in ps if p < 0.05))}
    out['regge'] = bool(all(out[t]['soglie_sotto_005'] >= 2 for t in ('massimi', 'minimi')))
    return out


R['verdetti'] = {
    'criterio1_concordanza_W': verdetto_c1('p_W'),
    'criterio1_ordine_pring_perfetto': verdetto_c1('p_perfetti'),
    'criterio1_accordo_pring': verdetto_c1('p_accordo'),
    'criterio2_coppie_che_reggono': [f"{x['soglia']} {x['tipo']} {x['coppia']}" for x in c2 if x['regge']],
    'criterio3': {lv: {t: (R['criterio3'][lv][t].get('p'), R['criterio3'][lv][t].get('p_ordine_pring')) for t in ('massimi', 'minimi')}
                  for lv in LIVELLI + ['bry_boschan']},
    'criterio4_coppie_che_reggono': [f"{x['soglia']} {x['tipo']} {x['coppia']}" for x in c4 if x['regge']],
}


def pulisci(o):
    if isinstance(o, dict):
        return {str(k): pulisci(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [pulisci(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if np.isnan(o) else round(float(o), 6)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


with open(os.path.join(dati.BASE, 'risultati.json'), 'w') as f:
    json.dump(pulisci(R), f, ensure_ascii=False, indent=1)
print('scritto risultati.json')
