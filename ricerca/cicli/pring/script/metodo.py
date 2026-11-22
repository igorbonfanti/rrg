"""metodo.py — punti di svolta, cicli comuni, statistiche d'ordine e modello nullo (ricerca/cicli/pring).

Definizioni (decise prima dei risultati; vedi sintesi.md, sezione «Metodo»):

PUNTI DI SVOLTA, definizione A («soglia», zigzag simmetrico). Sulla serie mensile si tengono il valore più alto e il più
basso dall'ultimo punto. Un MASSIMO è confermato quando la serie scende di almeno X (in % del massimo, o in punti per i
tassi) sotto il valore più alto dall'ultimo minimo; un MINIMO quando sale di almeno X sopra il valore più basso
dall'ultimo massimo. Massimi e minimi si alternano. La conferma è il mese in cui si completa il movimento di X: è il
giorno (mese) in cui, dal vivo, si sarebbe saputo del punto. Un punto vale solo se la serie ha almeno 12 mesi di storia
prima di esso. L'ultimo estremo non ancora confermato non è un punto (è «in corso»).

PUNTI DI SVOLTA, definizione B (Bry-Boschan 1971, versione mensile; vedi bry_boschan()). Nessuna soglia di ampiezza.

VERSO DI PRING. Per le obbligazioni conta il prezzo: un minimo del rendimento è un MASSIMO delle obbligazioni e viceversa.
Per il dollaro (prova a parte) il verso è quello del dollaro.

CICLI COMUNI, metodo M2 (principale, senza ancore). Per un tipo (massimi o minimi) si mettono in fila tutti i punti delle
serie in ordine di data. Si prende il primo punto non ancora usato e si apre un ciclo; per ogni altra serie si aggiunge il
suo primo punto dello stesso tipo non ancora usato entro 18 mesi dal primo punto del ciclo (compresi). Si ripete.
CICLI COMUNI, metodo M1 (controllo, ancorato al NBER). Per ogni picco (minimo) del ciclo economico NBER si prende, per ogni
serie, il massimo (minimo) più vicino entro ±24 mesi non ancora usato; i picchi NBER si visitano in ordine di data.

ORDINE. In un ciclo con tutte e tre le serie l'ordine è «perfetto» se obbligazioni < azioni < materie prime (mesi, in
senso stretto). Per una coppia (A, B) «B dopo A» vuol dire mese di B > mese di A; stesso mese = «insieme».
STATISTICHE dei test (contro il modello nullo): concordanza = statistica di Friedman m·(n − 1)·W sui cicli completi
(W di Kendall, m cicli, n serie); ordine di Pring = numero di cicli completi in ordine perfetto; coppia = numero netto
(casi «B dopo A» meno casi «B prima di A»). Si riportano anche W e le quote, che però non sono le statistiche dei test.

MODELLO NULLO. Spostamento circolare: i punti di ciascuna serie, dentro il periodo comune [inizio, fine], sono spostati
tutti insieme di un numero intero casuale di mesi (uniforme tra 0 e la lunghezza del periodo − 1) e riavvolti. Conserva
quanti punti ha ogni serie, il loro tipo e le distanze tra loro, e rompe gli allineamenti tra serie. Per M1 le date NBER
restano ferme. p = (1 + numero di ripetizioni con statistica ≥ osservata) / (1 + ripetizioni).
"""
import numpy as np


def mese(ts):
    """Indice intero del mese: (anno − 1900) · 12 + (mese − 1)."""
    return (ts.year - 1900) * 12 + ts.month - 1


def data_mese(m):
    return f"{1900 + m // 12:04d}-{m % 12 + 1:02d}"


# ---------------------------------------------------------------- definizione A: soglia (zigzag)
def zigzag(x, soglia, modo):
    """x: array di valori; soglia: frazione (0.20) se modo='pct', punti (1.0) se modo='abs'.
    Restituisce lista di (i, tipo, i_conferma) con tipo +1 = massimo, −1 = minimo, e lo stato finale
    (tipo dell'ultimo punto, indice dell'estremo in corso)."""
    n = len(x)
    pts = []
    if n == 0:
        return pts, None
    hi = lo = x[0]
    hi_i = lo_i = 0
    stato = 0  # 0 = non ancora deciso, +1 = in salita (ultimo punto un minimo), −1 = in discesa (ultimo punto un massimo)

    def giu(v, ref):  # v è sceso di almeno la soglia sotto ref
        return v <= ref * (1 - soglia) if modo == 'pct' else v <= ref - soglia

    def su(v, ref):
        return v >= ref * (1 + soglia) if modo == 'pct' else v >= ref + soglia

    for t in range(1, n):
        v = x[t]
        if stato == 0:
            if v > hi:
                hi, hi_i = v, t
            if v < lo:
                lo, lo_i = v, t
            if giu(v, hi) and hi_i < t:
                pts.append((hi_i, +1, t))
                stato = -1
                lo, lo_i = v, t
            elif su(v, lo) and lo_i < t:
                pts.append((lo_i, -1, t))
                stato = +1
                hi, hi_i = v, t
        elif stato == +1:
            if v > hi:
                hi, hi_i = v, t
            elif giu(v, hi):
                pts.append((hi_i, +1, t))
                stato = -1
                lo, lo_i = v, t
        else:
            if v < lo:
                lo, lo_i = v, t
            elif su(v, lo):
                pts.append((lo_i, -1, t))
                stato = +1
                hi, hi_i = v, t
    in_corso = (hi_i if stato == +1 else lo_i) if stato != 0 else None
    return pts, (stato, in_corso)


# ---------------------------------------------------------------- definizione B: Bry-Boschan
SPENCER = np.array([-3, -6, -5, 3, 21, 46, 67, 74, 67, 46, 21, 3, -5, -6, -3]) / 320.0


def _media_mobile(x, pesi):
    """Media mobile centrata con pesi; agli estremi si ripete il primo/ultimo valore (come nella pratica BB)."""
    k = len(pesi) // 2
    xp = np.concatenate([np.full(k, x[0]), x, np.full(k, x[-1])])
    return np.convolve(xp, pesi[::-1], mode='valid')


def _mm12(x):
    """Media mobile centrata a 12 mesi (2×12)."""
    w = np.ones(13)
    w[0] = w[-1] = 0.5
    return _media_mobile(x, w / 12.0)


def _estremi(y, k):
    """Massimi e minimi locali stretti in una finestra ±k (ritorna lista ordinata di (i, tipo))."""
    out = []
    n = len(y)
    for i in range(k, n - k):
        w = y[i - k:i + k + 1]
        if y[i] == w.max() and (w == y[i]).sum() == 1:
            out.append((i, +1))
        elif y[i] == w.min() and (w == y[i]).sum() == 1:
            out.append((i, -1))
    return out


def _alterna(pts, y):
    """Due massimi di fila: resta il più alto; due minimi: il più basso."""
    out = []
    for p in pts:
        if out and out[-1][1] == p[1]:
            q = out[-1]
            if (p[1] == +1 and y[p[0]] > y[q[0]]) or (p[1] == -1 and y[p[0]] < y[q[0]]):
                out[-1] = p
        else:
            out.append(p)
    return out


def _rifinisci(pts, y, k):
    """Sposta ogni punto all'estremo di y entro ±k mesi."""
    out = []
    n = len(y)
    for i, t in pts:
        a, b = max(0, i - k), min(n, i + k + 1)
        seg = y[a:b]
        j = a + (int(np.argmax(seg)) if t == +1 else int(np.argmin(seg)))
        out.append((j, t))
    # due punti finiti sullo stesso mese: resta il primo
    ded = []
    for p in out:
        if not ded or ded[-1][0] != p[0]:
            ded.append(p)
    return ded


def _durate_minime(pts, y, ciclo_min, fase_min):
    """Toglie le fasi più corte di fase_min (si tolgono i due punti della fase, il primo caso in ordine di data) e
    poi i cicli (massimo-massimo, minimo-minimo) più corti di ciclo_min (dei due punti dello stesso tipo resta il più
    estremo, e cade con l'altro il punto opposto in mezzo). Si ripete finché nessuna regola è violata."""
    pts = list(pts)
    while True:
        pts = _alterna(pts, y)
        viol = None
        for j in range(len(pts) - 1):
            if pts[j + 1][0] - pts[j][0] < fase_min:
                viol = j
                break
        if viol is None:
            for j in range(len(pts) - 2):
                if pts[j + 2][0] - pts[j][0] < ciclo_min:
                    # ciclo troppo corto: tra i due punti dello stesso tipo resta il più estremo, e si toglie il punto
                    # opposto in mezzo con l'altro
                    a, b = pts[j], pts[j + 2]
                    keep_a = (a[1] == +1 and y[a[0]] >= y[b[0]]) or (a[1] == -1 and y[a[0]] <= y[b[0]])
                    drop = j + 2 if keep_a else j
                    del pts[j + 1]
                    del pts[drop if drop < j + 1 else drop - 1]
                    viol = -1
                    break
            if viol is None:
                return pts
            continue
        # fase troppo corta: si tolgono i due punti (j, j+1), così l'alternanza resta
        del pts[viol + 1]
        del pts[viol]


def bry_boschan(x, log=True):
    """Bry e Boschan (1971), «Cyclical Analysis of Time Series: Selected Procedures and Computer Programs», NBER,
    procedura mensile, nella forma descritta da Watson (1994) e Harding e Pagan (2002):
      1. valori anomali: dove |x − Spencer| > 3,5 deviazioni standard, x è sostituito dalla curva di Spencer;
      2. media mobile centrata a 12 mesi: estremi locali in ±5 mesi, alternanza;
      3. curva di Spencer (15 termini): estremi entro ±5 mesi dai punti del passo 2; cicli ≥ 15 mesi; alternanza;
      4. media mobile corta (3 mesi, centrata): estremi entro ±5 mesi dai punti del passo 3;
      5. serie originale: estremi entro ±4 mesi dai punti del passo 4;
      6. regole finali: niente punti nei primi e negli ultimi 6 mesi; il primo (ultimo) punto deve essere più estremo dei
         valori tra esso e l'inizio (la fine); fasi ≥ 5 mesi, cicli ≥ 15 mesi; alternanza.
    Si lavora sul logaritmo per i prezzi (log=True) e sul livello per i tassi. Restituisce lista di (i, tipo)."""
    y = np.log(np.asarray(x, float)) if log else np.asarray(x, float)
    n = len(y)
    sp = _media_mobile(y, SPENCER)
    r = y - sp
    sd = r.std()
    ya = np.where(np.abs(r) > 3.5 * sd, sp, y)
    m12 = _mm12(ya)
    p = _alterna(_estremi(m12, 5), m12)
    sp2 = _media_mobile(ya, SPENCER)
    p = _alterna(_rifinisci(p, sp2, 5), sp2)
    p = _durate_minime(p, sp2, 15, 1)
    mcd = _media_mobile(ya, np.ones(3) / 3)
    p = _alterna(_rifinisci(p, mcd, 5), mcd)
    p = _alterna(_rifinisci(p, y, 4), y)
    p = [q for q in p if 6 <= q[0] <= n - 7]
    p = _durate_minime(p, y, 15, 5)
    # estremi agli estremi della serie
    while p:
        i, t = p[0]
        seg = y[:i]
        if (t == +1 and len(seg) and seg.max() > y[i]) or (t == -1 and len(seg) and seg.min() < y[i]):
            p = p[1:]
            continue
        break
    while p:
        i, t = p[-1]
        seg = y[i + 1:]
        if (t == +1 and len(seg) and seg.max() > y[i]) or (t == -1 and len(seg) and seg.min() < y[i]):
            p = p[:-1]
            continue
        break
    return _alterna(p, y)


# ---------------------------------------------------------------- punti sulla griglia dei mesi
def punti_serie(s, definizione, soglia=None, modo='pct', inverti=False, storia_min=12):
    """s: pd.Series mensile. Ritorna array strutturato con mese, tipo (nel verso di Pring), mese di conferma.
    inverti=True per i tassi (un minimo del rendimento è un massimo delle obbligazioni)."""
    x = s.values.astype(float)
    m0 = mese(s.index[0])
    if definizione == 'soglia':
        pts, _ = zigzag(x, soglia, modo)
        out = [(m0 + i, -t if inverti else t, m0 + c) for i, t, c in pts if i >= storia_min]
    else:
        pts = bry_boschan(x, log=(modo == 'pct'))
        # conferma per Bry-Boschan: non definita dal vivo (servono 6 mesi dopo e le medie centrate); si mette i + 6
        out = [(m0 + i, -t if inverti else t, m0 + i + 6) for i, t in pts if i >= storia_min]
    return out


# ---------------------------------------------------------------- cicli comuni
def cicli_m2(punti, tipo, finestra=18):
    """punti: dict serie -> lista di mesi (già filtrati per tipo). Ritorna lista di dict serie -> mese."""
    ev = sorted((m, k) for k, ms in punti.items() for m in ms)
    usati = set()
    per_serie = {k: sorted(ms) for k, ms in punti.items()}
    out = []
    for m, k in ev:
        if (k, m) in usati:
            continue
        c = {k: m}
        usati.add((k, m))
        for k2, ms in per_serie.items():
            if k2 == k:
                continue
            for m2 in ms:
                if m2 < m or (k2, m2) in usati:
                    continue
                if m2 - m <= finestra:
                    c[k2] = m2
                    usati.add((k2, m2))
                break
        out.append(c)
    return out


def cicli_m1(punti, ancore, finestra=24):
    """ancore: lista di mesi NBER (picchi o minimi). Per ogni ancora, per ogni serie, il punto più vicino entro
    ±finestra non ancora usato (a parità di distanza il precedente)."""
    usati = {k: set() for k in punti}
    out = []
    for a in ancore:
        c = {'_ancora': a}
        for k, ms in punti.items():
            best = None
            for m in ms:
                if m in usati[k] or abs(m - a) > finestra:
                    continue
                if best is None or abs(m - a) < abs(best - a):
                    best = m
            if best is not None:
                c[k] = best
                usati[k].add(best)
        out.append(c)
    return out


# ---------------------------------------------------------------- statistiche d'ordine
def ranghi(vals):
    """Ranghi medi (1..n) con parità."""
    vals = np.asarray(vals, float)
    order = np.argsort(vals, kind='mergesort')
    r = np.empty(len(vals))
    i = 0
    while i < len(vals):
        j = i
        while j + 1 < len(vals) and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        r[order[i:j + 1]] = (i + j) / 2 + 1
        i = j + 1
    return r


def kendall_w(matrice):
    """matrice: m cicli × n serie, mesi. W di Kendall (senza correzione per le parità). nan se m < 2."""
    m, n = matrice.shape
    if m < 2:
        return np.nan
    R = np.array([ranghi(r) for r in matrice])
    S = ((R.sum(0) - m * (n + 1) / 2) ** 2).sum()
    return 12 * S / (m * m * (n ** 3 - n))


def statistiche(cicli, ordine):
    """ordine: lista di serie nell'ordine di Pring. Ritorna dict con conteggi."""
    compl = [c for c in cicli if all(k in c for k in ordine)]
    mat = np.array([[c[k] for k in ordine] for c in compl], float).reshape(-1, len(ordine))
    perfetti = int(sum(all(r[i] < r[i + 1] for i in range(len(ordine) - 1)) for r in mat))
    coppie = {}
    for a in range(len(ordine)):
        for b in range(a + 1, len(ordine)):
            A, B = ordine[a], ordine[b]
            casi = [(c[A], c[B]) for c in cicli if A in c and B in c]
            dopo = sum(1 for x, y in casi if y > x)
            insieme = sum(1 for x, y in casi if y == x)
            coppie[f'{A}>{B}'] = {'n': len(casi), 'dopo': dopo, 'insieme': insieme, 'prima': len(casi) - dopo - insieme,
                                  'quota': dopo / len(casi) if casi else np.nan,
                                  'ritardi': sorted(int(y - x) for x, y in casi)}
    # accordo medio con l'ordine di Pring sulle coppie dei cicli completi (parità = 0,5)
    acc = []
    if len(mat):
        for r in mat:
            s = 0.0
            k = 0
            for a in range(len(ordine)):
                for b in range(a + 1, len(ordine)):
                    s += 1.0 if r[b] > r[a] else (0.5 if r[b] == r[a] else 0.0)
                    k += 1
            acc.append(s / k)
        accordo = float(np.mean(acc))
    else:
        accordo = np.nan
    W = float(kendall_w(mat)) if len(mat) >= 2 else np.nan
    # statistiche per il modello nullo (scelte dopo le prove sintetiche e prima dei risultati veri): crescono sia con
    # l'allineamento sia con la coerenza dell'ordine, mentre le quote calcolate su 1-2 cicli del modello nullo
    # valgono spesso 100% e tolgono potenza al test
    friedman = len(mat) * (len(ordine) - 1) * W if len(mat) >= 2 else 0.0
    netto_accordo = float(sum(2 * a - 1 for a in acc) * (len(ordine) * (len(ordine) - 1) / 2)) if len(mat) else 0.0
    for v in coppie.values():
        v['netto'] = v['dopo'] - v['prima']
    return {'cicli': len(cicli), 'completi': len(compl), 'perfetti': perfetti,
            'quota_perfetti': perfetti / len(compl) if len(compl) else np.nan,
            'W': W, 'friedman': friedman, 'accordo': accordo, 'netto_accordo': netto_accordo, 'coppie': coppie}


# ---------------------------------------------------------------- modello nullo
def sposta(ms_tipi, k, inizio, L):
    """ms_tipi: lista di (mese, tipo). Sposta di k mesi e riavvolge dentro [inizio, inizio + L)."""
    return [((m - inizio + k) % L + inizio, t) for m, t in ms_tipi]


def per_tipo(pts, tipo):
    return sorted(m for m, t in pts if t == tipo)


def null_shift(pts_serie, inizio, fine, n_rip, rng, funzione):
    """pts_serie: dict serie -> lista di (mese, tipo) nel periodo [inizio, fine]. funzione(dict spostato) -> dict di
    statistiche numeriche. Ritorna dict nome -> array delle n_rip statistiche."""
    L = fine - inizio + 1
    raccolta = {}
    for _ in range(n_rip):
        sp = {k: sposta(v, int(rng.integers(0, L)), inizio, L) for k, v in pts_serie.items()}
        st = funzione(sp)
        for nome, val in st.items():
            raccolta.setdefault(nome, []).append(val)
    return {k: np.array(v, float) for k, v in raccolta.items()}


def p_value(obs, null, maggiore=True):
    null = null[~np.isnan(null)]
    if np.isnan(obs):
        return np.nan
    k = (null >= obs - 1e-12).sum() if maggiore else (null <= obs + 1e-12).sum()
    return (1 + k) / (1 + len(null))


def bh(pvals):
    """Benjamini-Hochberg: q-value per ogni p (nan ignorati)."""
    p = np.asarray(pvals, float)
    q = np.full(len(p), np.nan)
    ok = ~np.isnan(p)
    pv = p[ok]
    m = len(pv)
    if m == 0:
        return q
    o = np.argsort(pv)
    ranked = pv[o] * m / (np.arange(m) + 1)
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]
    out = np.empty(m)
    out[o] = np.minimum(ranked, 1)
    q[ok] = out
    return q
