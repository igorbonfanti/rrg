#!/usr/bin/env python3
"""Ricalcolo indipendente degli oscillatori mensili dell'S&P 500 (^GSPC).

Uso:  python3 -I ricerca/oscillatori/ricalcolo/oscillatori.py
Input:  ricerca/oscillatori/cache/gspc_1d.json  (cache Yahoo chart API, 1d, dal 1985-01-02)
Output: ricerca/oscillatori/ricalcolo/oscillatori_py.json
        + stampa a video (ultimi 24 mesi chiusi, finestre storiche, sensibilita').

Solo Python standard (nessuna libreria esterna), cicli espliciti per leggibilita'.
Valori non definiti = None (null nel JSON), mai valori di riempimento.

Fonti delle formule
- CMO: Francesco Caruso, "Formula ProRealTime del Composite Momentum Oscillator",
  https://www.cicliemercati.it/wp-content/uploads/2021/11/CMO_Prt.pdf (testo riportato in fondo).
- Coppock: WMA10(ROC14 + ROC11), ROC in %.
- KST di Pring (lungo termine, mensile): ROC 9/12/18/24, SMA 6/6/6/9, pesi 1/2/3/4; segnale SMA9.
- MACD: EMA12 - EMA26 delle chiusure, segnale EMA9 del MACD.

Scelte dichiarate (le definizioni ProRealTime non sono documentate in dettaglio sul sito ufficiale):
- WeightedAverage[N](x): media ponderata lineare, pesi N per il valore corrente ... 1 per x[N-1];
  diviso per N(N+1)/2. Definita dalla N-esima barra con x valido.
- average[N](x) / SMA: media semplice, definita dalla N-esima barra valida. average[1](x) = x.
- summation[N](x): somma degli ultimi N valori, definita dalla N-esima barra valida.
- ExponentialAverage[N](x): alfa = 2/(N+1), ema_t = alfa*x_t + (1-alfa)*ema_{t-1};
  inizializzazione = primo valore valido della serie (ema = x al primo bar disponibile).
  Variante di controllo: seme = SMA dei primi N valori (stampata nella sezione sensibilita').
- Stochastic[N,K](close): %K grezzo = 100*(C - min(L, N barre)) / (max(H, N barre) - min(L, N barre))
  su barre mensili (H/L mensili), poi media semplice a K periodi del %K grezzo
  (ricostruzione usata sul forum prorealcode.com; il valore restituito e' la linea %K lenta).
  Varianti di controllo: (a) massimi/minimi dalle sole chiusure, (b) rapporto delle somme
  sum_K(C-LL)/sum_K(HH-LL).
- Barre mensili: massimo = max dei massimi giornalieri, minimo = min dei minimi giornalieri,
  chiusura = chiusura dell'ultima seduta del mese (data di borsa a New York). Si esclude il mese
  in corso (l'ultima seduta della cache appartiene a un mese non chiuso se cade nel mese di oggi).
"""
import json, os, sys, datetime, math
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'cache', 'gspc_1d.json')
OUT = os.path.join(HERE, 'oscillatori_py.json')
MESE_IN_CORSO = '2026-11'   # escluso: non chiuso alla data della cache (ultima seduta 2026-11-11)

# ---------------------------------------------------------------- dati
def barre_mensili(path):
    j = json.load(open(path))
    r = j['chart']['result'][0]
    q = r['indicators']['quote'][0]
    tz = ZoneInfo(r['meta']['exchangeTimezoneName'])
    mesi = {}
    ordine = []
    for i, t in enumerate(r['timestamp']):
        c, h, l = q['close'][i], q['high'][i], q['low'][i]
        if c is None or h is None or l is None:
            continue
        d = datetime.datetime.fromtimestamp(t, tz).date()
        m = '%04d-%02d' % (d.year, d.month)
        if m not in mesi:
            mesi[m] = {'mese': m, 'high': h, 'low': l, 'close': c, 'ultima': d, 'sedute': 0}
            ordine.append(m)
        b = mesi[m]
        b['high'] = max(b['high'], h)
        b['low'] = min(b['low'], l)
        if d >= b['ultima']:
            b['ultima'] = d
            b['close'] = c
        b['sedute'] += 1
    ordine.sort()
    return [mesi[m] for m in ordine if m != MESE_IN_CORSO]

# ---------------------------------------------------------------- primitive
def ok(v):
    return v is not None and not (isinstance(v, float) and math.isnan(v))

def lag(x, n):
    return [None] * n + x[:len(x) - n] if n > 0 else list(x)

def window_ok(x, i, n):
    return i - n + 1 >= 0 and all(ok(x[j]) for j in range(i - n + 1, i + 1))

def sma(x, n):
    return [sum(x[i - n + 1:i + 1]) / n if window_ok(x, i, n) else None for i in range(len(x))]

def wma(x, n):
    den = n * (n + 1) / 2
    out = []
    for i in range(len(x)):
        if not window_ok(x, i, n):
            out.append(None); continue
        s = 0.0
        for k in range(n):            # k=0 valore corrente, peso n
            s += (n - k) * x[i - k]
        out.append(s / den)
    return out

def summation(x, n):
    return [sum(x[i - n + 1:i + 1]) if window_ok(x, i, n) else None for i in range(len(x))]

def ema(x, n, seme='primo'):
    a = 2.0 / (n + 1)
    out = [None] * len(x)
    prev = None
    start = next((i for i, v in enumerate(x) if ok(v)), None)
    if start is None:
        return out
    if seme == 'primo':
        prev = x[start]; out[start] = prev; i0 = start + 1
    else:  # seme = SMA dei primi n valori
        if start + n - 1 >= len(x):
            return out
        prev = sum(x[start:start + n]) / n; out[start + n - 1] = prev; i0 = start + n
    for i in range(i0, len(x)):
        if not ok(x[i]):
            prev = None; out[i] = None; continue   # nessuna serie con buchi interni qui
        prev = a * x[i] + (1 - a) * prev
        out[i] = prev
    return out

def roc(x, n):
    return [(x[i] / x[i - n] - 1) * 100 if i >= n and ok(x[i]) and ok(x[i - n]) else None
            for i in range(len(x))]

def highest(x, n):
    return [max(x[i - n + 1:i + 1]) if window_ok(x, i, n) else None for i in range(len(x))]

def lowest(x, n):
    return [min(x[i - n + 1:i + 1]) if window_ok(x, i, n) else None for i in range(len(x))]

def stochastic(c, h, l, n, k, variante='sma'):
    hh, ll = highest(h, n), lowest(l, n)
    if variante == 'somme':
        num = [c[i] - ll[i] if ok(ll[i]) else None for i in range(len(c))]
        den = [hh[i] - ll[i] if ok(hh[i]) else None for i in range(len(c))]
        sn, sd = summation(num, k), summation(den, k)
        return [100 * sn[i] / sd[i] if ok(sn[i]) and sd[i] else None for i in range(len(c))]
    raw = [100 * (c[i] - ll[i]) / (hh[i] - ll[i]) if ok(hh[i]) and hh[i] != ll[i] else None
           for i in range(len(c))]
    return sma(raw, k)

# ---------------------------------------------------------------- indicatori
def cmo(c, h, l, seme='primo', stoco_var='sma', stoco_hl=True):
    k = 4
    m1, m2 = wma(c, k), wma(c, 3 * k)
    mom = [(m1[i] - m2[i]) / m1[i] * 100 if ok(m1[i]) and ok(m2[i]) else None for i in range(len(c))]
    mom1 = lag(mom, 1)
    diff = [mom[i] - mom1[i] if ok(mom[i]) and ok(mom1[i]) else None for i in range(len(c))]
    t1 = [None if not ok(diff[i]) else (diff[i] if mom[i] > mom1[i] else 0.0) for i in range(len(c))]
    t2 = [None if not ok(diff[i]) else (diff[i] if mom[i] < mom1[i] else 0.0) for i in range(len(c))]
    ad = [abs(v) if ok(v) else None for v in diff]
    s1, s2, sa = summation(t1, 5), summation(t2, 5), summation(ad, 5)
    s1p, s2p, sap = lag(s1, 1), lag(s2, 1), lag(sa, 1)
    aa, bb = [None] * len(c), [None] * len(c)
    for i in range(len(c)):
        if ok(s1p[i]) and ok(sap[i]) and ok(t1[i]):
            den = sap[i] - sap[i] / 5 + ad[i]
            if den != 0:
                aa[i] = (s1p[i] - s1p[i] / 5 + t1[i]) / den * 100
                bb[i] = (s2p[i] - s2p[i] / 5 + t2[i]) / den * 100
    cc = [aa[i] - abs(bb[i]) if ok(aa[i]) else None for i in range(len(c))]
    key = ema(cc, 3, seme)
    if stoco_hl:
        st = stochastic(c, h, l, 5, 3, stoco_var)
    else:
        st = stochastic(c, c, c, 5, 3, stoco_var)
    w3 = wma(st, 3)
    xtl = [v * 2 - 100 if ok(v) else None for v in w3]
    mix = [(2 * key[i] + xtl[i]) / 3 if ok(key[i]) and ok(xtl[i]) else None for i in range(len(c))]
    return wma(mix, 2), key, xtl

def coppock(c):
    r14, r11 = roc(c, 14), roc(c, 11)
    s = [r14[i] + r11[i] if ok(r14[i]) and ok(r11[i]) else None for i in range(len(c))]
    return wma(s, 10)

def kst(c):
    parti = [(9, 6, 1), (12, 6, 2), (18, 6, 3), (24, 9, 4)]
    sm = [(sma(roc(c, r), s), w) for r, s, w in parti]
    k = [sum(w * x[i] for x, w in sm) if all(ok(x[i]) for x, _ in sm) else None for i in range(len(c))]
    return k, sma(k, 9)

def macd(c, seme='primo'):
    e12, e26 = ema(c, 12, seme), ema(c, 26, seme)
    m = [e12[i] - e26[i] if ok(e12[i]) and ok(e26[i]) else None for i in range(len(c))]
    return m, ema(m, 9, seme)

# ---------------------------------------------------------------- main
def r4(v):
    return round(v, 4) if ok(v) else None

def primo_valido(mesi, x):
    i = next((i for i, v in enumerate(x) if ok(v)), None)
    return mesi[i] if i is not None else None

def main():
    B = barre_mensili(SRC)
    mesi = [b['mese'] for b in B]
    C = [b['close'] for b in B]; H = [b['high'] for b in B]; L = [b['low'] for b in B]
    comp, key, xtl = cmo(C, H, L)
    cop = coppock(C)
    k, ks = kst(C)
    md, ms = macd(C)
    righe = []
    for i, m in enumerate(mesi):
        righe.append({'mese': m, 'close': r4(C[i]), 'high': r4(H[i]), 'low': r4(L[i]),
                      'cmo': r4(comp[i]), 'coppock': r4(cop[i]), 'kst': r4(k[i]),
                      'kst_sig': r4(ks[i]), 'macd': r4(md[i]), 'macd_sig': r4(ms[i])})
    with open(OUT, 'w') as f:
        json.dump(righe, f, indent=0, separators=(',', ':'))
        f.write('\n')

    print('Barre mensili: %d, da %s a %s (escluso %s). Sedute primo mese %s: %d' % (
        len(B), mesi[0], mesi[-1], MESE_IN_CORSO, mesi[0], B[0]['sedute']))
    print('Ultima seduta usata: %s' % B[-1]['ultima'])
    for nome, x in [('cmo', comp), ('key', key), ('xtl', xtl), ('coppock', cop), ('kst', k),
                    ('kst_sig', ks), ('macd', md), ('macd_sig', ms)]:
        print('  primo mese valido %-8s %s' % (nome, primo_valido(mesi, x)))

    def riga(i):
        r = righe[i]
        f = lambda v, w=9, d=2: ('%*.*f' % (w, d, v)) if v is not None else '%*s' % (w, '—')
        return '%s %9.2f %9.2f %9.2f %s %s %s %s %s %s' % (
            r['mese'], r['close'], r['high'], r['low'], f(r['cmo']), f(r['coppock']),
            f(r['kst'], 9, 1), f(r['kst_sig'], 9, 1), f(r['macd']), f(r['macd_sig']))
    hdr = 'mese        close      high       low       cmo   coppock       kst   kst_sig      macd  macd_sig'
    print('\n== Ultimi 24 mesi chiusi ==\n' + hdr)
    for i in range(len(righe) - 24, len(righe)):
        print(riga(i))
    for centro in ['1998-05', '1999-11', '2007-11', '2015-01', '2018-09', '2020-01', '2022-01']:
        c0 = mesi.index(centro)
        print('\n== Intorno a %s (±3 mesi) ==\n%s' % (centro, hdr))
        for i in range(c0 - 3, c0 + 4):
            print(riga(i))

    # ---------------- sensibilita' alle scelte non documentate
    print("\n== Sensibilita' (differenza massima assoluta, dal 1990-01 in poi / ultimi 24 mesi) ==")
    i90 = mesi.index('1990-01'); i24 = len(mesi) - 24
    def dmax(a, b, i0):
        d = [abs(a[i] - b[i]) for i in range(i0, len(a)) if ok(a[i]) and ok(b[i])]
        return max(d) if d else None
    varianti = {
        'CMO, EMA seme=SMA3': cmo(C, H, L, seme='sma')[0],
        'CMO, stocastico rapporto delle somme': cmo(C, H, L, stoco_var='somme')[0],
        'CMO, stocastico su sole chiusure': cmo(C, H, L, stoco_hl=False)[0],
    }
    for nome, v in varianti.items():
        print('  %-40s %10.4f  %10.4f' % (nome, dmax(comp, v, i90), dmax(comp, v, i24)))
    m2, s2 = macd(C, seme='sma')
    print('  %-40s %10.4f  %10.4f' % ('MACD, EMA seme=SMA', dmax(md, m2, i90), dmax(md, m2, i24)))
    print('  %-40s %10.4f  %10.4f' % ('MACD segnale, EMA seme=SMA', dmax(ms, s2, i90), dmax(ms, s2, i24)))
    print('\nScritto %s (%d righe)' % (os.path.relpath(OUT), len(righe)))

if __name__ == '__main__':
    main()

# Testo della formula (PDF CMO_Prt.pdf, Cicli&Mercati / Market Risk Management):
# k=4
# media1=WeightedAverage[k](Close)
# media2=WeightedAverage[k*3](Close)
# MOM=average[1](media1-media2)/(media1)*100
# diffMOM=MOM-MOM[1]
# If MOM>MOM[1] then temp1=diffMOM else temp1=0 endif
# If MOM<MOM[1] then temp2=diffMOM else temp2=0 endif
# sumtemp1=summation[5](temp1)
# sumtemp2=summation[5](temp2)
# abssumdiff=summation[5](abs(diffMOM))
# aa=((sumtemp1[1]-(sumtemp1[1]/5)+temp1)/(abssumdiff[1]-(abssumdiff[1]/5)+abs(diffmom))*100)
# bb=((sumtemp2[1]-(sumtemp2[1]/5)+temp2)/(abssumdiff[1]-(abssumdiff[1]/5)+abs(diffmom))*100)
# cc=aa-abs(bb)
# key=ExponentialAverage[3](cc)
# stoco=Stochastic[5,3](close)
# xtl=WeightedAverage[3](stoco)*2-100
# Composite=WeightedAverage[2]((2*key+xtl)/3)
