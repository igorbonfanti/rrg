"""
Volatilità implicita, realizzata e GARCH(1,1): S&P 500 (VIX) e Nasdaq-100 (VXN).

Fase di verifica per un possibile grafico nel pannello VIX di Sector Monitor. Non modifica l'app.
Spunto: grafico di Massimo Rea (quant-rea) con VIX, volatilità realizzata a 30 giorni e GARCH(1,1) «fuori campione»
sul Nasdaq-100. Nessun dato è preso dalla piattaforma quant-rea: tutto viene da FRED e Yahoo (ricerca/vix/cache/).

METODO (deciso prima di vedere i risultati, vedi ../volatilita.md)
- Rendimenti: logaritmici close-to-close sulle sedute dell'indice (Yahoo ^GSPC, ^NDX), in percentuale.
- Implicita al giorno t: FRED VIXCLS (S&P 500) o VXNCLS (Nasdaq-100) dello stesso giorno; se FRED non ha il dato quel
  giorno resta mancante (nessun riempimento) e il giorno esce dai confronti.
- RVp(t) realizzata passata: deviazione standard campionaria (ddof=1) dei 21 rendimenti da t-20 a t, ×√252.
  RVf(t) realizzata futura: stessa formula sui rendimenti da t+1 a t+21. Per il confronto «alla Rea» anche RVp a 30 sedute.
- EWMA RiskMetrics: s2(t+1) = 0,94·s2(t) + 0,06·r(t)², media zero, avvio con r(1)² sul primo rendimento.
- GARCH(1,1) con media costante e errori normali: r = mu + e, s2(t) = omega + alpha·e(t-1)² + beta·s2(t-1),
  s2 iniziale = varianza (ddof=0) della finestra. Massima verosimiglianza (SLSQP, alpha+beta <= 0,99999) su una
  finestra mobile di 2520 rendimenti (10 anni) che finisce l'ultima seduta di ogni mese; i parametri si usano da quella
  seduta fino al giorno prima della fine del mese successivo. La varianza filtrata parte dall'inizio della finestra.
  Previsione al giorno t: media della varianza prevista per t+1..t+21 (formula chiusa), ×252, radice → «GARCH 21g».
  Anche la media per t+22..t+63 (durata) e la varianza a un passo (per il confronto alla Rea).
  Nessun dato dopo t entra nella previsione di t.
- Fuori campione: dal 2005 (S&P 500) e dal 2008 (Nasdaq-100). Sottoperiodi: fino al 2012, 2013-2019, 2020-oggi.
  Metriche: MAE, RMSE, distorsione media, correlazione, Mincer-Zarnowitz RVf = a + b·previsione (a, b, R²), anche in log;
  test di Diebold-Mariano (perdita quadratica, errori standard Newey-West con 21 ritardi) GARCH contro gli altri.
  Criterio: il GARCH «prevede meglio» se ha RMSE più basso dell'implicita E dell'EWMA in almeno 2 dei 3 sottoperiodi.
- Eventi (picchi della realizzata): prime sedute in cui RVp supera il suo 90° percentile calcolato sulla storia fino a
  quella seduta (inclusa), dopo almeno 63 sedute consecutive sotto la propria soglia. Premio per la paura:
  P1 = implicita - GARCH 21g, P2 = implicita - RVp. Segnale: premio sopra il suo 80° percentile (storia fino a quel
  giorno). Per ogni evento: segnale in almeno una delle 10 sedute prima (t-10..t-1)? Anticipo = sedute tra il primo
  giorno di segnale nella finestra e l'evento. Base: quota di sedute con segnale (e, più severa, quota di finestre di 10
  sedute con almeno un segnale). Falsi allarmi: inizi di segnale (sopra oggi, non ieri) senza evento nelle 21 sedute dopo.
  Criterio di utilità: eventi preceduti >= 2 × base giornaliera E anticipo mediano >= 3 sedute E almeno metà degli
  inizi di segnale seguita da un evento entro 21 sedute.
- Il GARCH anticipa? Stessi eventi: GARCH 21g sopra il suo 80° percentile nelle 10 sedute prima, contro la base e
  contro la stessa misura fatta sulla RVp e sull'implicita. Durata: realizzata delle sedute t+22..t+63 dopo l'evento
  contro la previsione del giorno dell'evento (GARCH 22-63, GARCH 21g, implicita, RVp, EWMA).
- Percentili: interpolazione lineare (come numpy), sulla storia disponibile fino a quel giorno, valori mancanti esclusi.

USO
  node ricerca/vix/volatilita/script/scarica.mjs          # solo se mancano le serie in ricerca/vix/cache/
  python3 -I ricerca/vix/volatilita/script/analisi.py     # scrive ricerca/vix/volatilita/risultati.json
                                                          # e le serie in ricerca/vix/cache/volatilita_serie_*.json
  node ricerca/vix/volatilita/script/confronto_node.mjs   # ricalcolo indipendente in Node e GARCH Node contro Python
Richiede numpy e scipy; la libreria arch (facoltativa) serve solo al controllo incrociato dei parametri.
"""
import bisect
import json
import math
import pathlib
import sys

import numpy as np
from scipy.optimize import minimize
from scipy.signal import lfilter

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent                     # ricerca/vix/volatilita
CACHE = ROOT.parent / 'cache'          # ricerca/vix/cache
LOG2PI = math.log(2 * math.pi)
W_GARCH = 2520
H = 21
ANN = 252.0

SUBPERIODS = [('fino al 2012', None, '2012-12-31'), ('2013-2019', '2013-01-01', '2019-12-31'), ('2020-oggi', '2020-01-01', None)]
INDICES = {
    'sp500': {'nome': 'S&P 500', 'prezzo': '^GSPC', 'impl': 'VIXCLS', 'impl_yahoo': '^VIX', 'impl_nome': 'VIX',
              'fred_prezzo': 'SP500', 'oos': '2005-01-01'},
    'ndx': {'nome': 'Nasdaq-100', 'prezzo': '^NDX', 'impl': 'VXNCLS', 'impl_yahoo': '^VXN', 'impl_nome': 'VXN',
            'fred_prezzo': 'NASDAQ100', 'oos': '2008-01-01'},
}


def cache_file(name):
    return CACHE / (''.join(c if c.isalnum() else '_' for c in name) + '.json')


def load(name):
    j = json.loads(cache_file(name).read_text())
    return j, [(d, float(v)) for d, v in j['rows']]


def r4(x, n=4):
    if x is None:
        return None
    if isinstance(x, (float, np.floating)):
        if not np.isfinite(x):
            return None
        return round(float(x), n)
    return x


# ---------------------------------------------------------------- GARCH(1,1)
def garch_filter(r, mu, om, a, b, s0):
    """s2[j] per j=0..n: s2[0]=s0, s2[j+1] = om + a*e[j]^2 + b*s2[j]. s2[n] è la previsione a un passo dopo l'ultimo r."""
    e2 = (r - mu) ** 2
    x = om + a * e2
    out = np.empty(len(r) + 1)
    out[0] = s0
    out[1:] = lfilter([1.0], [1.0, -b], x, zi=[b * s0])[0]
    return out


def garch_nll(theta, r, s0):
    mu, om, a, b = theta
    if om <= 0 or a < 0 or b < 0 or a + b >= 1:
        return 1e12
    s2 = garch_filter(r, mu, om, a, b, s0)[:-1]
    if np.any(s2 <= 0):
        return 1e12
    e2 = (r - mu) ** 2
    return 0.5 * float(np.sum(LOG2PI + np.log(s2) + e2 / s2))


def garch_fit(r):
    s0 = float(np.var(r))
    x0 = np.array([float(np.mean(r)), 0.05 * s0, 0.10, 0.85])
    cons = [{'type': 'ineq', 'fun': lambda t: 0.99999 - t[2] - t[3]}]
    bnds = [(-1.0, 1.0), (1e-8, 10 * s0), (0.0, 1.0), (0.0, 1.0)]
    res = minimize(garch_nll, x0, args=(r, s0), method='SLSQP', bounds=bnds, constraints=cons,
                   options={'ftol': 1e-11, 'maxiter': 1000})
    return res.x, float(res.fun), bool(res.success), s0


def garch_avg_var(s1, om, a, b, h1, h2):
    """Media della varianza prevista per gli orizzonti h1..h2 (1 = domani), data la previsione a un passo s1."""
    p = a + b
    vl = om / (1 - p)
    n = h2 - h1 + 1
    geo = (p ** (h1 - 1) - p ** h2) / (1 - p)  # somma di p^(h-1) per h=h1..h2
    return vl + (s1 - vl) * geo / n


def rolling_garch(dates, r):
    """r[i] = rendimento dal giorno i-1 al giorno i (r[0]=nan). Restituisce previsioni e parametri per ogni seduta."""
    n = len(dates)
    month_end = [i for i in range(n - 1) if dates[i][:7] != dates[i + 1][:7]]
    s1 = np.full(n, np.nan); g21 = np.full(n, np.nan); g2263 = np.full(n, np.nan)
    params = []
    starts = [i for i in month_end if i - W_GARCH + 1 >= 1]
    for k, i in enumerate(starts):
        w0 = i - W_GARCH + 1
        th, nll, ok, s0 = garch_fit(r[w0:i + 1])
        mu, om, a, b = (float(x) for x in th)
        end = starts[k + 1] - 1 if k + 1 < len(starts) else n - 1
        s2 = garch_filter(r[w0:end + 1], mu, om, a, b, s0)   # s2[j] = varianza del rendimento w0+j; s2[-1] = dopo end
        for t in range(i, end + 1):
            one = s2[t - w0 + 1]
            s1[t] = one
            g21[t] = math.sqrt(ANN * garch_avg_var(one, om, a, b, 1, H))
            g2263[t] = math.sqrt(ANN * garch_avg_var(one, om, a, b, 22, 63))
        params.append({'stima': dates[i], 'mu': mu, 'omega': om, 'alpha': a, 'beta': b, 'nll': nll, 'ok': ok, 's0': s0})
    return {'s1': s1, 'g21': g21, 'g2263': g2263, 'params': params}


# ---------------------------------------------------------------- serie di base
def roll_std(r, i0, i1):
    x = r[i0:i1 + 1]
    if len(x) < 2 or np.any(np.isnan(x)):
        return np.nan
    return float(np.std(x, ddof=1)) * math.sqrt(ANN)


def realized(r, win):
    n = len(r)
    past = np.full(n, np.nan); fut = np.full(n, np.nan)
    for t in range(n):
        if t - win + 1 >= 1:
            past[t] = roll_std(r, t - win + 1, t)
        if t + win <= n - 1:
            fut[t] = roll_std(r, t + 1, t + win)
    return past, fut


def ewma(r, lam=0.94):
    n = len(r)
    out = np.full(n, np.nan)   # out[t] = previsione per t+1 fatta a t, annualizzata
    s2 = None
    for t in range(1, n):
        s2 = r[t] ** 2 if s2 is None else lam * s2 + (1 - lam) * r[t] ** 2
        # s2 qui è la varianza prevista per t+1 (aggiornata con r[t])
        out[t] = math.sqrt(ANN * s2)
    return out


def expanding_pct(x, q):
    """Percentile q (0-1) della storia fino a t inclusa, interpolazione lineare; nan dove x[t] manca o storia < 2."""
    s = []
    out = np.full(len(x), np.nan)
    for t, v in enumerate(x):
        if np.isnan(v):
            continue
        bisect.insort(s, float(v))
        m = len(s)
        if m < 2:
            continue
        pos = (m - 1) * q
        lo = int(math.floor(pos)); hi = min(lo + 1, m - 1)
        out[t] = s[lo] + (s[hi] - s[lo]) * (pos - lo)
    return out


def pct_rank(hist, v):
    h = np.asarray([x for x in hist if not np.isnan(x)])
    return float(np.mean(h <= v) * 100) if len(h) else np.nan


# ---------------------------------------------------------------- metriche
def ols(y, x):
    X = np.column_stack([np.ones_like(x), x])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    res = y - X @ beta
    r2 = 1 - np.sum(res ** 2) / np.sum((y - y.mean()) ** 2)
    return float(beta[0]), float(beta[1]), float(r2)


def metrics(y, f):
    e = f - y
    a, b, r2 = ols(y, f)
    la, lb, lr2 = ols(np.log(y), np.log(f))
    return {'n': int(len(y)), 'mae': float(np.mean(np.abs(e))), 'rmse': float(np.sqrt(np.mean(e ** 2))),
            'distorsione': float(np.mean(e)), 'corr': float(np.corrcoef(y, f)[0, 1]),
            'mz_a': a, 'mz_b': b, 'mz_r2': r2, 'log_a': la, 'log_b': lb, 'log_r2': lr2}


def dm_test(y, f1, f2, lags=21):
    """Diebold-Mariano, perdita quadratica, d = e1² - e2² (negativo: f1 migliore). Newey-West."""
    d = (f1 - y) ** 2 - (f2 - y) ** 2
    n = len(d); dm = d.mean(); u = d - dm
    v = np.sum(u * u) / n
    for k in range(1, lags + 1):
        v += 2 * (1 - k / (lags + 1)) * np.sum(u[k:] * u[:-k]) / n
    return float(dm / math.sqrt(v / n))


def r4dict(d):
    return {k: (r4(v) if isinstance(v, (float, np.floating)) else v) for k, v in d.items()}


# ---------------------------------------------------------------- analisi per indice
def analyze(key, cfg):
    jp, px = load(cfg['prezzo'])
    ji, imp = load(cfg['impl'])
    jy, imp_y = load(cfg['impl_yahoo'])
    dates = [d for d, _ in px]
    close = np.array([v for _, v in px])
    n = len(dates)
    r = np.full(n, np.nan)
    r[1:] = np.log(close[1:] / close[:-1]) * 100
    impd = dict(imp)
    iv = np.array([impd.get(d, np.nan) for d in dates])
    rvp, rvf = realized(r, H)
    rvp30, _ = realized(r, 30)
    ew = ewma(r)
    G = rolling_garch(dates, r)
    g21, g2263, s1 = G['g21'], G['g2263'], G['s1']
    g1 = np.sqrt(ANN * s1)
    idx = {d: i for i, d in enumerate(dates)}
    out = {'nome': cfg['nome'], 'implicita': cfg['impl_nome']}

    # ---- dati: copertura e seconda fonte
    yd = dict(imp_y)
    common = [d for d, _ in imp if d in yd]
    diffs = np.array([abs(impd[d] - yd[d]) for d in common])
    fp = dict(load(cfg['fred_prezzo'])[1])
    cp = [d for d in dates if d in fp]
    rel = np.array([abs(close[idx[d]] / fp[d] - 1) for d in cp])
    rr = []
    for d0, d1 in zip(cp[:-1], cp[1:]):
        i0, i1 = idx[d0], idx[d1]
        if i1 == i0 + 1:
            rr.append(abs(math.log(close[i1] / close[i0]) - math.log(fp[d1] / fp[d0])) * 100)
    rr = np.array(rr)
    out['dati'] = {
        'prezzo': {'fonte': jp['source'], 'scaricato': jp['fetched'], 'prima': dates[0], 'ultima': dates[-1], 'sedute': n},
        'implicita': {'fonte': ji['source'], 'scaricato': ji['fetched'], 'prima': imp[0][0], 'ultima': imp[-1][0],
                      'sedute_indice_senza_implicita_dopo_inizio': [d for d in dates if d >= imp[0][0] and d not in impd]},
        'seconda_fonte_implicita': {'serie': cfg['impl_yahoo'], 'date_comuni': len(common),
                                    'diff_oltre_0_01': int(np.sum(diffs > 0.01)), 'diff_max': r4(float(diffs.max())),
                                    'ultima_yahoo': imp_y[-1][0]},
        'seconda_fonte_prezzo': {'serie': 'FRED ' + cfg['fred_prezzo'], 'date_comuni': len(cp),
                                 'scarto_relativo_max': float(rel.max()), 'date_scarto_oltre_1e-4': int(np.sum(rel > 1e-4)),
                                 'rendimenti_confrontati': int(len(rr)), 'scarto_rendimento_max_pp': r4(float(rr.max()), 6),
                                 'rendimenti_scarto_oltre_0_01pp': int(np.sum(rr > 0.01))},
    }
    p = G['params']
    out['garch_parametri'] = {
        'stime': len(p), 'prima_stima': p[0]['stima'], 'ultima_stima': p[-1]['stima'],
        'convergenza_ok': int(sum(x['ok'] for x in p)),
        'alpha_mediana': r4(float(np.median([x['alpha'] for x in p]))),
        'beta_mediana': r4(float(np.median([x['beta'] for x in p]))),
        'persistenza_min': r4(float(min(x['alpha'] + x['beta'] for x in p))),
        'persistenza_max': r4(float(max(x['alpha'] + x['beta'] for x in p))),
        'ultima': r4dict({k: v for k, v in p[-1].items() if k != 'ok'}),
    }

    # ---- 1. previsione della RVf
    oos = [t for t in range(n) if dates[t] >= cfg['oos']]
    # extra, fuori dal criterio: implicita meno il suo premio medio passato (media di implicita - RVf sulle sedute s
    # con s+21 <= t, cioè con la RVf già nota al giorno t)
    gap = iv - rvf
    ivc = np.full(n, np.nan); acc = 0.0; cnt = 0
    for t in range(n):
        s_ = t - H
        if s_ >= 0 and np.isfinite(gap[s_]):
            acc += gap[s_]; cnt += 1
        if cnt >= 252 and np.isfinite(iv[t]):
            ivc[t] = iv[t] - acc / cnt
    preds = {'implicita': iv, 'RVp': rvp, 'EWMA': ew, 'GARCH': g21}
    ok = [t for t in oos if all(np.isfinite(v[t]) for v in preds.values()) and np.isfinite(rvf[t])]
    assert all(np.isfinite(ivc[t]) for t in ok)
    preds['extra_implicita_meno_premio_passato'] = ivc

    def table(target, sel):
        y = target[sel]
        tab = {k: r4dict(metrics(y, v[sel])) for k, v in preds.items()}
        tab['_dm_garch_contro'] = {k: r4(dm_test(y, g21[sel], v[sel])) for k, v in preds.items() if k != 'GARCH'}
        tab['_migliore_rmse'] = min((k for k in preds if not k.startswith('extra')), key=lambda k: tab[k]['rmse'])
        tab['_migliore_r2'] = min((k for k in preds if not k.startswith('extra')), key=lambda k: -tab[k]['mz_r2'])
        tab['_migliore_log_r2'] = min((k for k in preds if not k.startswith('extra')), key=lambda k: -tab[k]['log_r2'])
        return tab

    sub = {}
    for name, a, b in SUBPERIODS:
        sel = np.array([t for t in ok if (a is None or dates[t] >= a) and (b is None or dates[t] <= b)])
        sub[name] = {'dal': dates[sel[0]], 'al': dates[sel[-1]], **table(rvf, sel)}
    ok = np.array(ok)
    tot = {'dal': dates[ok[0]], 'al': dates[ok[-1]], **table(rvf, ok)}
    wins = sum(1 for s in sub.values() if s['GARCH']['rmse'] < s['implicita']['rmse'] and s['GARCH']['rmse'] < s['EWMA']['rmse'])
    out['previsione'] = {'bersaglio': 'RVf: realizzata delle 21 sedute successive', 'totale': tot, 'sottoperiodi': sub,
                         'garch_rmse_migliore_di_implicita_e_ewma_nei_sottoperiodi': wins,
                         'criterio_garch_prevede_meglio': wins >= 2}

    # quota di giorni in cui l'implicita è sopra la RVf (premio per il rischio di varianza)
    out['previsione']['quota_implicita_sopra_RVf'] = r4(float(np.mean(iv[ok] > rvf[ok])))

    # ---- 1b. confronto alla Rea: contro la realizzata PASSATA
    rea = {}
    for tname, target in (('RVp21', rvp), ('RVp30', rvp30)):
        sel = np.array([t for t in ok if np.isfinite(target[t])])
        y = target[sel]
        rea[tname] = {k: r4dict(metrics(y, v[sel])) for k, v in
                      {'implicita': iv, 'GARCH_1passo': g1, 'GARCH_21g': g21, 'EWMA': ew}.items()}
    # stessa cosa con parametri fissi stimati sul 2010-2019 e applicati dal 2020 (come «taglio» fuori campione)
    i0 = idx[next(d for d in dates if d >= '2010-01-01')]
    i1 = idx[[d for d in dates if d <= '2019-12-31'][-1]]
    th, _, okf, s0 = garch_fit(r[i0:i1 + 1])
    mu, om, a, b = (float(x) for x in th)
    s2 = garch_filter(r[i0:], mu, om, a, b, s0)
    fx1 = np.full(n, np.nan); fx21 = np.full(n, np.nan)
    for t in range(i0, n):
        fx1[t] = math.sqrt(ANN * s2[t - i0 + 1])
        fx21[t] = math.sqrt(ANN * garch_avg_var(s2[t - i0 + 1], om, a, b, 1, H))
    cut = [t for t in range(i1 + 1, n) if np.isfinite(iv[t]) and np.isfinite(rvp30[t])]
    cutf = [t for t in cut if np.isfinite(rvf[t])]
    rt = {'parametri_2010_2019': r4dict({'mu': mu, 'omega': om, 'alpha': a, 'beta': b}), 'dal': dates[cut[0]]}
    for tname, target, sel in (('RVp30', rvp30, cut), ('RVp21', rvp, cut), ('RVf', rvf, cutf)):
        sel = np.array(sel)
        rt[tname] = {k: r4dict(metrics(target[sel], v[sel])) for k, v in
                     {'implicita': iv, 'GARCH_fisso_1passo': fx1, 'GARCH_fisso_21g': fx21}.items()}
    rea['taglio_2020_parametri_fissi'] = rt
    out['confronto_alla_rea'] = rea

    # ---- correlazione implicita/GARCH(t) con RVp(t+k): dove è massima?
    lag = {}
    for nm, v in (('implicita', iv), ('GARCH', g21), ('RVp', rvp)):
        cs = {}
        for k in range(-21, 43):
            sel = [t for t in ok if 0 <= t + k < n and np.isfinite(rvp[t + k])]
            sel = np.array(sel)
            cs[k] = float(np.corrcoef(v[sel], rvp[sel + k])[0, 1])
        best = max(cs, key=cs.get)
        lag[nm] = {'k_massimo': best, 'corr_massima': r4(cs[best]), 'corr_k0': r4(cs[0]), 'corr_k21': r4(cs[21])}
    out['correlazione_con_RVp_spostata'] = lag

    # ---- 2-3. eventi
    p90 = expanding_pct(rvp, 0.90)
    prem1 = iv - g21
    prem2 = iv - rvp
    start = oos[0]
    out['eventi'] = event_study(dates, start, rvp, p90, {'P1_impl_meno_GARCH': prem1, 'P2_impl_meno_RVp': prem2,
                                                        'GARCH_livello': g21, 'RVp_livello': rvp, 'implicita_livello': iv},
                                iv, g21, g2263, rvp, ew, r)

    # sensibilità
    sens = []
    for (q_ev, gap, win, q_sig) in [(0.90, 63, 10, 0.80), (0.85, 63, 10, 0.80), (0.95, 63, 10, 0.80), (0.90, 42, 10, 0.80),
                                    (0.90, 126, 10, 0.80), (0.90, 63, 5, 0.80), (0.90, 63, 20, 0.80), (0.90, 63, 10, 0.75),
                                    (0.90, 63, 10, 0.90)]:
        pe = p90 if q_ev == 0.90 else expanding_pct(rvp, q_ev)
        ev = find_events(rvp, pe, start, n - 1, gap)
        row = {'pct_evento': q_ev, 'sedute_sotto': gap, 'finestra': win, 'pct_segnale': q_sig, 'eventi': len(ev)}
        for nm, pr in (('P1', prem1), ('P2', prem2), ('GARCH', g21)):
            s = signals(pr, q_sig)
            row[nm] = r4dict(signal_stats(s, ev, start, n - 1, win))
        sens.append(row)
    out['sensibilita_eventi'] = sens

    # ---- profilo medio attorno agli eventi
    ev = [e['i'] for e in out['eventi']['lista']]
    prof = {}
    for nm, v in (('implicita', iv), ('RVp', rvp), ('GARCH_21g', g21), ('P1', prem1), ('P2', prem2)):
        prof[nm] = {}
        for k in range(-20, 64):
            vals = [v[e + k] for e in ev if 0 <= e + k < n and np.isfinite(v[e + k])]
            prof[nm][k] = r4(float(np.median(vals)), 2) if vals else None
    out['profilo_mediano_eventi'] = prof
    for e in out['eventi']['lista']:
        del e['i']

    # ---- 3b. durata in generale (tutte le sedute fuori campione): RV delle sedute t+22..t+63
    rv2263 = np.full(n, np.nan)
    for t in range(n):
        if t + 63 <= n - 1:
            rv2263[t] = roll_std(r, t + 22, t + 63)
    sel = np.array([t for t in ok if np.isfinite(rv2263[t]) and np.isfinite(g2263[t])])
    out['durata_tutte_le_sedute'] = {'dal': dates[sel[0]], 'al': dates[sel[-1]], **{k: r4dict(metrics(rv2263[sel], v[sel])) for k, v in
                                     {'GARCH_22_63': g2263, 'GARCH_21g': g21, 'implicita': iv, 'RVp': rvp, 'EWMA': ew}.items()}}

    # ---- 4. lettura oggi (ultimo giorno con implicita FRED) e ultimo giorno con Yahoo
    def today(t, ivt, src):
        hist_iv = list(iv[:t]) + [ivt]
        p1h = list(prem1[:t]) + [ivt - g21[t]]
        p2h = list(prem2[:t]) + [ivt - rvp[t]]
        return {'data': dates[t], 'fonte_implicita': src, 'implicita': r4(ivt, 2), 'implicita_pct': r4(pct_rank(hist_iv, ivt), 1),
                'RVp': r4(rvp[t], 2), 'RVp_pct': r4(pct_rank(rvp[:t + 1], rvp[t]), 1),
                'RVp_soglia_evento_p90': r4(p90[t], 2),
                'GARCH_21g': r4(g21[t], 2), 'GARCH_pct': r4(pct_rank(g21[:t + 1], g21[t]), 1),
                'GARCH_22_63': r4(g2263[t], 2), 'EWMA': r4(ew[t], 2),
                'P1_impl_meno_GARCH': r4(ivt - g21[t], 2), 'P1_pct': r4(pct_rank(p1h, ivt - g21[t]), 1),
                'P2_impl_meno_RVp': r4(ivt - rvp[t], 2), 'P2_pct': r4(pct_rank(p2h, ivt - rvp[t]), 1),
                'rendimento_giorno_pct': r4(r[t], 2),
                'parametri_garch_stimati_il': [x['stima'] for x in p if x['stima'] <= dates[t]][-1]}
    tf = max(t for t in range(n) if np.isfinite(iv[t]))
    out['oggi'] = {'fred': today(tf, iv[tf], cfg['impl'])}
    if dates[-1] > dates[tf] and dates[-1] in yd:
        out['oggi']['yahoo_ultimo_giorno'] = today(n - 1, yd[dates[-1]], cfg['impl_yahoo'] + ' (Yahoo, seconda fonte)')

    # ---- controllo incrociato con la libreria arch (backcast diverso: atteso scarto piccolo, non nullo)
    try:
        from arch import arch_model
        chk = []
        for x in p[:: max(1, len(p) // 6)][:6] + [p[-1]]:
            i = idx[x['stima']]
            am = arch_model(r[i - W_GARCH + 1:i + 1], mean='Constant', vol='GARCH', p=1, q=1, dist='normal', rescale=False)
            fr = am.fit(disp='off')
            pa = fr.params
            fc = fr.forecast(horizon=H, reindex=False).variance.values[-1]
            chk.append({'stima': x['stima'], 'alpha_nostro': r4(x['alpha']), 'alpha_arch': r4(float(pa['alpha[1]'])),
                        'beta_nostro': r4(x['beta']), 'beta_arch': r4(float(pa['beta[1]'])),
                        'garch21_nostro': r4(g21[i], 3), 'garch21_arch': r4(math.sqrt(ANN * float(np.mean(fc))), 3)})
        out['controllo_arch'] = chk
    except ImportError:
        out['controllo_arch'] = 'libreria arch non installata'

    # serie per il confronto con Node (cache, non versionata)
    ser = {'dates': dates, 'iv': iv.tolist(), 'rvp': rvp.tolist(), 'rvf': rvf.tolist(), 'ewma': ew.tolist(),
           'g21': g21.tolist(), 'g2263': g2263.tolist(), 's1': s1.tolist(), 'params': p}
    (CACHE / f'volatilita_serie_{key}.json').write_text(json.dumps(ser, allow_nan=True).replace('NaN', 'null'))
    return out


def find_events(rvp, thr, start, end, gap=63):
    above = np.array([np.isfinite(a) and np.isfinite(b) and a > b for a, b in zip(rvp, thr)])
    valid = np.isfinite(rvp) & np.isfinite(thr)
    ev = []
    for t in range(max(start, gap), end + 1):
        if above[t] and valid[t - gap:t].all() and not above[t - gap:t].any():
            ev.append(t)
    return ev


def signals(x, q):
    p = expanding_pct(x, q)
    return np.array([np.isfinite(a) and np.isfinite(b) and a > b for a, b in zip(x, p)])


def signal_stats(sig, ev, start, end, win=10, follow=21):
    n_ev = len(ev)
    prec = [e for e in ev if sig[e - win:e].any()]
    lead = [e - (e - win + int(np.argmax(sig[e - win:e]))) for e in prec]
    days = sig[start:end + 1]
    base = float(days.mean())
    wbase = float(np.mean([sig[t - win:t].any() for t in range(start, end + 1)]))
    onsets = [t for t in range(start, end + 1) if sig[t] and not sig[t - 1]]
    evset = set(ev)
    judged = [s for s in onsets if s + follow <= end]
    hit = [s for s in judged if any(s < e <= s + follow for e in evset)]
    return {'eventi': n_ev, 'preceduti': len(prec), 'quota_preceduti': len(prec) / n_ev if n_ev else None,
            'anticipo_mediano': float(np.median(lead)) if lead else None,
            'base_giornaliera': base, 'base_finestre': wbase,
            'rapporto_su_base_giornaliera': (len(prec) / n_ev) / base if n_ev and base else None,
            'rapporto_su_base_finestre': (len(prec) / n_ev) / wbase if n_ev and wbase else None,
            'inizi_segnale': len(onsets), 'inizi_valutabili': len(judged), 'inizi_seguiti_da_evento': len(hit),
            'quota_inizi_seguiti': len(hit) / len(judged) if judged else None}


def event_study(dates, start, rvp, p90, sers, iv, g21, g2263, rvp_, ew, r):
    n = len(dates)
    ev = find_events(rvp, p90, start, n - 1)
    res = {'definizione': 'RVp > 90° percentile (storia fino al giorno), dopo almeno 63 sedute sotto', 'misure': {}}
    sigs = {nm: signals(x, 0.80) for nm, x in sers.items()}
    for nm, s in sigs.items():
        st = signal_stats(s, ev, start, n - 1)
        if nm.startswith('P'):
            st['criterio_utilita'] = bool(st['quota_preceduti'] is not None and st['rapporto_su_base_giornaliera'] >= 2
                                          and st['anticipo_mediano'] is not None and st['anticipo_mediano'] >= 3
                                          and st['quota_inizi_seguiti'] >= 0.5)
        res['misure'][nm] = r4dict(st)
    lst = []
    for e in ev:
        row = {'i': e, 'data': dates[e], 'RVp': r4(rvp[e], 2), 'soglia_p90': r4(p90[e], 2), 'implicita': r4(iv[e], 2),
               'GARCH_21g': r4(g21[e], 2), 'rendimento_giorno_pct': r4(r[e], 2)}
        for nm, s in sigs.items():
            w = s[e - 10:e]
            row[nm] = (10 - int(np.argmax(w))) if w.any() else None   # sedute di anticipo del primo segnale, None = nessuno
            if nm.startswith('P') and w.any():
                f0 = e - 10 + int(np.argmax(w))
                row[nm + '_rend_primo_segnale'] = r4(r[f0], 2)
                row[nm + '_rend_5g_prima_del_segnale'] = r4(float(np.nansum(r[f0 - 4:f0 + 1])), 2)
        # durata: realizzata t+22..t+63 contro le previsioni del giorno dell'evento
        if e + 63 <= n - 1:
            rv = roll_std(r, e + 22, e + 63)
            rv1 = roll_std(r, e + 1, e + 21)
            row['durata'] = {'RV_1_21': r4(rv1, 2), 'RV_22_63': r4(rv, 2), 'GARCH_22_63': r4(g2263[e], 2),
                             'GARCH_21g': r4(g21[e], 2), 'implicita': r4(iv[e], 2), 'RVp': r4(rvp_[e], 2), 'EWMA': r4(ew[e], 2)}
        lst.append(row)
    res['lista'] = lst
    # episodi citati: massimo della RVp nella finestra, soglia di quel giorno, evento o motivo per cui non lo è
    eps = [('2008 Lehman', '2008-09-01', '2008-12-31'), ('2011 debito USA', '2011-07-15', '2011-10-31'),
           ('2015 svalutazione yuan', '2015-08-01', '2015-10-15'), ('2018 febbraio', '2018-01-25', '2018-03-31'),
           ('2018 ottobre-dicembre', '2018-10-01', '2019-01-31'), ('2020 Covid', '2020-02-15', '2020-04-30'),
           ('2022 rialzo tassi', '2022-01-01', '2022-10-31'), ('2024 agosto', '2024-07-15', '2024-09-15'),
           ('2025 dazi', '2025-03-15', '2025-05-15')]
    out_eps = []
    for nm, a, b in eps:
        ts = [t for t in range(n) if a <= dates[t] <= b and np.isfinite(rvp[t])]
        if not ts:
            continue
        tm = max(ts, key=lambda t: rvp[t])
        cross = [t for t in ts if np.isfinite(p90[t]) and rvp[t] > p90[t]]
        evs = [dates[e] for e in ev if a <= dates[e] <= b]
        row = {'episodio': nm, 'RVp_max': r4(rvp[tm], 2), 'data_max': dates[tm], 'soglia_p90_quel_giorno': r4(p90[tm], 2),
               'prima_seduta_sopra_soglia': dates[cross[0]] if cross else None, 'evento': evs[0] if evs else None}
        if cross and not evs:
            c = cross[0]
            prev = [dates[e] for e in ev if e <= c]
            row['nota'] = 'sopra la soglia ma non è un evento nuovo: meno di 63 sedute sotto (evento precedente ' + (prev[-1] if prev else '-') + ')'
        if cross:
            c = cross[0]
            for k, sg in sigs.items():
                if k.startswith('P'):
                    w = sg[c - 10:c]
                    row[k + '_anticipo'] = (10 - int(np.argmax(w))) if w.any() else None
        out_eps.append(row)
    res['episodi'] = out_eps
    # riepilogo durata
    dd = [x['durata'] for x in lst if 'durata' in x and all(x['durata'][k] is not None for k in x['durata'])]
    y = np.array([d['RV_22_63'] for d in dd])
    summ = {'eventi': len(dd)}
    for k in ('GARCH_22_63', 'GARCH_21g', 'implicita', 'RVp', 'EWMA'):
        f = np.array([d[k] for d in dd])
        summ[k] = {'mae': r4(float(np.mean(np.abs(f - y))), 2), 'rmse': r4(float(np.sqrt(np.mean((f - y) ** 2))), 2),
                   'mediana_errore': r4(float(np.median(f - y)), 2),
                   'corr': r4(float(np.corrcoef(f, y)[0, 1])) if len(dd) > 2 else None}
    summ['GARCH_22_63_piu_vicino_di_implicita'] = int(sum(abs(d['GARCH_22_63'] - d['RV_22_63']) < abs(d['implicita'] - d['RV_22_63']) for d in dd))
    summ['GARCH_22_63_piu_vicino_di_RVp'] = int(sum(abs(d['GARCH_22_63'] - d['RV_22_63']) < abs(d['RVp'] - d['RV_22_63']) for d in dd))
    res['durata_dopo_evento'] = summ
    return res


def main():
    out = {'generato_da': 'ricerca/vix/volatilita/script/analisi.py', 'metodo': __doc__.split('USO')[0].strip()}
    for key, cfg in INDICES.items():
        print('...', cfg['nome'], file=sys.stderr)
        out[key] = analyze(key, cfg)
    (ROOT / 'risultati.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print('scritto', ROOT / 'risultati.json', file=sys.stderr)


if __name__ == '__main__':
    main()
