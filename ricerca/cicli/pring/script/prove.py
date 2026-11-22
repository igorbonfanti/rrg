"""prove.py — i test sanno trovare e sanno rifiutare? Serie sintetiche (ricerca/cicli/pring).

Uso: python3 -I ricerca/cicli/pring/script/prove.py [--rip-null 300] [--rip-ind 200] [--rip-rit 40]
Scrive ricerca/cicli/pring/prove.json.

Serie sintetiche mensili lunghe quanto il campione vero (871 mesi), costruite come prezzi:
  z = «ciclo economico» a dente di sega con durate casuali (salita 24-72 mesi, discesa 10-30 mesi), ampiezza 1;
  obbligazioni: rendimento = 6 − 2,0 · z(t + 12) + passeggiata casuale (σ 0,10 punti al mese)  → il prezzo gira 12 mesi prima;
  azioni: log prezzo = 0,006 t + 0,45 · z(t + 6) + passeggiata casuale (σ 0,025)                → 6 mesi prima;
  materie prime: log prezzo = 0,003 t + 0,40 · z(t) + passeggiata casuale (σ 0,02)              → ultime.
Caso A «ritardo noto»: un solo z per le tre serie. Il metodo deve trovare l'ordine obbligazioni → azioni → materie prime,
  con p < 0,05 e ritardi mediani vicini a 6 mesi (obbligazioni-azioni e azioni-materie prime) e 12 (obbligazioni-materie).
Statistiche dei test come in analisi.py: Friedman (concordanza), numero di cicli in ordine perfetto, netto delle coppie.
Caso B «indipendenti»: un z diverso per ogni serie, stessi parametri. Il test deve rifiutare (p < 0,05) in circa il 5% dei
  casi o meno, per W di Kendall, ordine perfetto di Pring e quota «dopo» delle coppie.
Stesse funzioni di analisi.py (metodo.py): zigzag con le tre soglie, Bry-Boschan, cicli M2, spostamento circolare.
"""
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import metodo as M  # noqa: E402

def arg(n, d):
    return int(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d


RIP_NULL = arg('--rip-null', 300)
RIP_IND = arg('--rip-ind', 200)
RIP_RIT = arg('--rip-rit', 40)
T = 871
ORD = ['obbligazioni', 'azioni', 'mp']
SOGLIE = {'obbligazioni': ('abs', [0.75, 1.0, 1.5]), 'azioni': ('pct', [0.15, 0.20, 0.30]), 'mp': ('pct', [0.15, 0.20, 0.30])}


def dente(rng, n):
    z = []
    v = rng.uniform(0, 1)
    su = rng.random() < 0.5
    while len(z) < n:
        d = int(rng.integers(24, 73)) if su else int(rng.integers(10, 31))
        a = v
        b = 1.0 if su else 0.0
        z.extend(np.linspace(a, b, d, endpoint=False))
        v = b
        su = not su
    return np.array(z[:n])


def genera(rng, comune):
    n = T + 24
    zs = [dente(rng, n)] * 3 if comune else [dente(rng, n) for _ in range(3)]
    t = np.arange(T)
    y = 6 - 2.0 * zs[0][12:12 + T] + np.cumsum(rng.normal(0, 0.10, T))
    s = np.exp(0.006 * t + 0.45 * zs[1][6:6 + T] + np.cumsum(rng.normal(0, 0.025, T)))
    c = np.exp(0.003 * t + 0.40 * zs[2][0:T] + np.cumsum(rng.normal(0, 0.02, T)))
    idx = pd.date_range('1953-04-01', periods=T, freq='MS')
    return {'obbligazioni': pd.Series(y, idx), 'azioni': pd.Series(s, idx), 'mp': pd.Series(c, idx)}


def pts(ser, definizione, lv):
    out = {}
    for k in ORD:
        modo, th = SOGLIE[k]
        p = M.punti_serie(ser[k], definizione, th[lv] if lv is not None else None, modo, inverti=(k == 'obbligazioni'))
        out[k] = [(m, t) for m, t, c in p]
    return out


def stat(p):
    o = {}
    for tipo in (+1, -1):
        cic = M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p.items()}, tipo, 18)
        st = M.statistiche(cic, ORD)
        o[f'{tipo}:W'] = st['W']
        o[f'{tipo}:F'] = st['friedman']
        o[f'{tipo}:perf'] = st['quota_perfetti']
        o[f'{tipo}:nperf'] = st['perfetti']
        o[f'{tipo}:completi'] = st['completi']
        for cp, v in st['coppie'].items():
            o[f'{tipo}:{cp}'] = v['quota']
            o[f'{tipo}:{cp}:netto'] = v['netto']
            o[f'{tipo}:{cp}:rit'] = float(np.median(v['ritardi'])) if v['ritardi'] else np.nan
    return o


def prova(ser, definizione, lv, rng):
    p = pts(ser, definizione, lv)
    ini = M.mese(ser['azioni'].index[0]) + 12
    fin = M.mese(ser['azioni'].index[-1])
    p = {k: [(m, t) for m, t in v if ini <= m <= fin] for k, v in p.items()}
    obs = stat(p)
    nul = M.null_shift(p, ini, fin, RIP_NULL, rng, stat)
    res = {}
    for tipo in (+1, -1):
        res[tipo] = {'W': obs[f'{tipo}:W'], 'p_W': M.p_value(obs[f'{tipo}:F'], nul[f'{tipo}:F']),
                     'perf': obs[f'{tipo}:perf'], 'p_perf': M.p_value(obs[f'{tipo}:nperf'], nul[f'{tipo}:nperf']),
                     'completi': obs[f'{tipo}:completi']}
        for cp in ('obbligazioni>azioni', 'azioni>mp', 'obbligazioni>mp'):
            res[tipo][cp] = obs[f'{tipo}:{cp}']
            res[tipo][cp + ':p'] = M.p_value(obs[f'{tipo}:{cp}:netto'], nul[f'{tipo}:{cp}:netto'])
            res[tipo][cp + ':rit'] = obs[f'{tipo}:{cp}:rit']
    return res


def riassumi(lista):
    out = {}
    for tipo in (+1, -1):
        nome = 'massimi' if tipo == 1 else 'minimi'
        r = [x[tipo] for x in lista]
        def q(key):
            v = np.array([x[key] for x in r], float)
            v = v[~np.isnan(v)]
            return float((v < 0.05).mean()) if len(v) else None
        def med(key):
            v = np.array([x[key] for x in r], float)
            v = v[~np.isnan(v)]
            return float(np.median(v)) if len(v) else None
        out[nome] = {'quota_p_W_sotto_005': q('p_W'), 'quota_p_perfetti_sotto_005': q('p_perf'),
                     'quota_p_coppie_sotto_005': {cp: q(cp + ':p') for cp in ('obbligazioni>azioni', 'azioni>mp', 'obbligazioni>mp')},
                     'quota_dopo_mediana': {cp: med(cp) for cp in ('obbligazioni>azioni', 'azioni>mp', 'obbligazioni>mp')},
                     'ritardo_mediano': {cp: med(cp + ':rit') for cp in ('obbligazioni>azioni', 'azioni>mp', 'obbligazioni>mp')},
                     'cicli_completi_mediana': med('completi'), 'quota_ordine_perfetto_mediana': med('perf')}
    return out


rng = np.random.default_rng(424242)
OUT = {'ripetizioni_null': RIP_NULL, 'serie_ritardo_noto': RIP_RIT, 'serie_indipendenti': RIP_IND}
for nome, comune, nrep in (('ritardo_noto', True, RIP_RIT), ('indipendenti', False, RIP_IND)):
    OUT[nome] = {}
    for definizione, lv, ch in (('soglia', 0, 'bassa'), ('soglia', 1, 'media'), ('soglia', 2, 'alta'), ('bb', None, 'bry_boschan')):
        lista = []
        for r in range(nrep):
            ser = genera(rng, comune)
            lista.append(prova(ser, definizione, lv, rng))
        OUT[nome][ch] = riassumi(lista)
        print(nome, ch, json.dumps(OUT[nome][ch]['massimi']['quota_p_W_sotto_005']), json.dumps(OUT[nome][ch]['minimi']['quota_p_W_sotto_005']), flush=True)

# Bry-Boschan: (1) proprietà su tutte le serie vere (alternanza, fasi ≥ 5 mesi, cicli ≥ 15 mesi, niente punti nei primi
# e negli ultimi 6 mesi); (2) sulla produzione industriale (INDPRO, Fed) i punti devono stare vicini alle date NBER.
import dati  # noqa: E402
S = dati.carica()
S['indpro'] = dati.fred('INDPRO')
prop = {}
for k in ('azioni', 'tassi', 'mp', 'ppiaco', 'metalli', 'petrolio', 'dollaro', 'wb_nonen', 'wb_metalli', 'indpro'):
    x = S[k].values.astype(float)
    p = M.bry_boschan(x, log=(k != 'tassi'))
    alt = all(p[i][1] != p[i + 1][1] for i in range(len(p) - 1))
    fase = min((p[i + 1][0] - p[i][0] for i in range(len(p) - 1)), default=None)
    ciclo = min((p[i + 2][0] - p[i][0] for i in range(len(p) - 2)), default=None)
    bordi = all(6 <= i <= len(x) - 7 for i, _ in p)
    prop[k] = {'punti': len(p), 'alternanza': alt, 'fase_minima': fase, 'ciclo_minimo': ciclo, 'bordi_ok': bordi}
OUT['bry_boschan_proprieta'] = prop
ip = S['indpro'][S['indpro'].index >= '1947-01-01']
pb = M.bry_boschan(ip.values.astype(float), log=True)
mb = [(M.mese(ip.index[i]), t) for i, t in pb]
rec = S['rec']
v = rec.values
mm = [M.mese(t) for t in rec.index]
pic = [mm[i] for i in range(1, len(v)) if v[i] == 1 and v[i - 1] == 0 and mm[i] >= M.mese(ip.index[0]) + 6]
mini = [mm[i] for i in range(len(v) - 1) if v[i] == 1 and v[i + 1] == 0 and mm[i] >= M.mese(ip.index[0]) + 6]
def vicini(date, tipo, tol):
    return sum(1 for d in date if any(t == tipo and abs(m - d) <= tol for m, t in mb))
OUT['bry_boschan_indpro_nber'] = {
    'picchi_nber': len(pic), 'minimi_nber': len(mini),
    'picchi_entro_3_mesi': vicini(pic, 1, 3), 'minimi_entro_3_mesi': vicini(mini, -1, 3),
    'picchi_entro_6_mesi': vicini(pic, 1, 6), 'minimi_entro_6_mesi': vicini(mini, -1, 6),
    'punti_bb': len(mb), 'punti_bb_lontani_da_nber_oltre_6_mesi': sum(1 for m, t in mb if not any(abs(m - d) <= 6 for d in (pic if t == 1 else mini))),
    'elenco_bb': [(M.data_mese(m), 'massimo' if t == 1 else 'minimo') for m, t in mb]}
print('BB su INDPRO:', {k: v for k, v in OUT['bry_boschan_indpro_nber'].items() if k != 'elenco_bb'})
print('proprietà BB:', prop)

# un esempio di serie con ritardo noto: elenco dei cicli (per controllo a occhio)
ser = genera(np.random.default_rng(7), True)
p = pts(ser, 'soglia', 1)
OUT['esempio'] = {('massimi' if tipo == 1 else 'minimi'): [{k: M.data_mese(v) for k, v in c.items()} for c in
                  M.cicli_m2({k: M.per_tipo(v, tipo) for k, v in p.items()}, tipo, 18)] for tipo in (1, -1)}


def pulisci(o):
    if isinstance(o, dict):
        return {str(k): pulisci(v) for k, v in o.items()}
    if isinstance(o, list):
        return [pulisci(v) for v in o]
    if isinstance(o, float):
        return None if np.isnan(o) else round(o, 4)
    return o


with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'prove.json'), 'w') as f:
    json.dump(pulisci(OUT), f, ensure_ascii=False, indent=1)
print('scritto prove.json')
