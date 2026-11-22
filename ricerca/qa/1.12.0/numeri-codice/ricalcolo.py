#!/usr/bin/env python3
"""Ricalcolo indipendente della linea del tempo dei massimi (1.12.0, vista 0 Massimi).

Controllo indipendente: non usa js/peaks.js né ricerca/rotazione-bolle/script/backtest.mjs. Algoritmi a forza bruta.
Fonti: (a) data/ath_history.json (decodifica fatta qui: d0 + gaps in base 36, cd differenze intere / ps);
       (b) Yahoo Finance (chart API v8), le stesse 9 serie di config/ath.json, chiusure fino al --to.
Uscita: JSON con le 5 finestre (ultimi 4 cali conclusi >= 15% dell'S&P 500 e quello in corso) su stdout o --out.

Uso: python3 -I ricalcolo.py --src file|yahoo [--to 2026-11-20] [--out x.json]
"""
import argparse, json, datetime as dt, os, sys, urllib.request, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
IDS = ['BTC', 'GOLD', 'SILVER', 'COPPER', 'WTI', 'NDX', 'SPX', 'SOXX', 'KOSPI']
SYM = {'BTC': 'BTC-USD', 'GOLD': 'GC=F', 'SILVER': 'SI=F', 'COPPER': 'HG=F', 'WTI': 'CL=F', 'NDX': '^NDX', 'SPX': '^GSPC', 'SOXX': 'SOXX', 'KOSPI': '^KS11'}
D = dt.date.fromisoformat


def load_file():
    h = json.load(open(os.path.join(ROOT, 'data', 'ath_history.json')))
    out = {}
    for k, v in h['series'].items():
        d = [D(v['d0'])]
        for ch in v['gaps']:
            d.append(d[-1] + dt.timedelta(days=int(ch, 36)))
        vals, acc = [], None
        for r in v['cd']:
            if r is None:
                acc = None; vals.append(None); continue
            acc = r if acc is None else acc + r
            vals.append(acc / v['ps'])
        assert len(d) == len(vals), k
        out[k] = [(a, b) for a, b in zip(d, vals) if b is not None]
    return out


def load_yahoo(cache):
    os.makedirs(cache, exist_ok=True)
    out = {}
    for k, s in SYM.items():
        f = os.path.join(cache, k + '.json')
        if not os.path.exists(f):
            url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + urllib.parse.quote(s) + '?period1=946684800&period2=1800000000&interval=1d'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            open(f, 'wb').write(urllib.request.urlopen(req, timeout=60).read()); time.sleep(0.5)
        j = json.load(open(f))['chart']['result'][0]
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(j['meta']['exchangeTimezoneName'])
        cl = j['indicators']['quote'][0]['close']
        rows = {}
        for t, c in zip(j['timestamp'], cl):
            if c is None: continue
            day = dt.datetime.fromtimestamp(t, tz).date()  # data nel fuso della borsa (con l'ora legale)
            rows[day] = c
        out[k] = sorted(rows.items())
    return out


def highs52(s):
    """Indici i con chiusura > di tutte quelle dei giorni [t-365, t), con almeno 365 giorni di storia (forza bruta)."""
    out = []
    first = s[0][0]
    for i, (t, c) in enumerate(s):
        if t < first + dt.timedelta(days=365): continue
        # forza bruta, ma ci si ferma alla prima data fuori finestra (le date sono ordinate)
        prev = []
        k = i - 1
        while k >= 0 and s[k][0] >= t - dt.timedelta(days=365):
            prev.append(s[k][1]); k -= 1
        if prev and c > max(prev): out.append(i)
    return out


def next_higher(s, i):
    for k in range(i + 1, len(s)):
        if s[k][1] > s[i][1]: return k
    return len(s)


def cycle(s, X, H):
    raw = []
    for i in H:
        j = next_higher(s, i)
        conf = next((k for k in range(i + 1, j) if s[k][1] <= s[i][1] * (1 - X / 100)), None)
        if conf is not None: raw.append((i, j, conf))
    res = []
    for t, (i, j, conf) in enumerate(raw):
        nxt = [q[0] for q in raw[t + 1:] if q[0] > conf]
        end = min(j, nxt[0] if nxt else len(s))
        seg = range(i + 1, end)
        m = min(seg, key=lambda k: (s[k][1], k))
        res.append(dict(i=i, date=s[i][0], close=s[i][1], trough=s[m][0], dd=r1((s[m][1] / s[i][1] - 1) * 100),
                        below0=s[m][1] <= 0, ongoing=end >= len(s), conf=s[conf][0]))
    return res


def r1(x):
    # arrotondamento come Math.round(x*10)/10 (mezzi verso +inf)
    import math
    return math.floor(x * 10 + 0.5) / 10


def run(series, to=None):
    S = {}
    for k in IDS:
        s = [(a, b) for a, b in series[k] if (to is None or a <= to) and b is not None]
        S[k] = s
    H = {k: highs52(S[k]) for k in IDS}
    C20 = {k: cycle(S[k], 20, H[k]) for k in IDS}
    C15 = {k: cycle(S[k], 15, H[k]) for k in IDS}
    A = S['SPX']
    done = [p for p in C15['SPX'] if not p['ongoing']][-4:]
    # calo in corso: ultimo massimo di 52 settimane non superato
    cur = None
    for i in reversed(H['SPX']):
        if next_higher(A, i) == len(A):
            rest = A[i + 1:]
            if rest:
                m = min(rest, key=lambda r: r[1])
                cur = dict(date=A[i][0], dd=r1((m[1] / A[i][1] - 1) * 100), trough=m[0], ongoing=True)
            else:
                cur = dict(date=A[i][0], dd=None, trough=None, ongoing=True)
            break
    eps = []
    for ep in done + ([cur] if cur else []):
        P = ep['date']
        row = {'peak': P.isoformat(), 'ddPct': ep['dd'], 'ongoing': bool(ep.get('ongoing')) and ep is cur, 'markets': {}}
        for k in IDS:
            if k == 'SPX':
                row['markets'][k] = dict(status='anchor', date=P.isoformat(), offset=0, ddPct=ep['dd']); continue
            if S[k][0][0] + dt.timedelta(days=365) > P - dt.timedelta(days=365):
                row['markets'][k] = dict(status='nodata'); continue
            lo, hi = P - dt.timedelta(days=365), P + dt.timedelta(days=365)
            c = [p for p in C20[k] if lo <= p['date'] <= hi]
            if not c:
                c2 = [p for p in C15[k] if lo <= p['date'] <= hi]
                alt = (max(c2, key=lambda p: p['close'])['date'] - P).days if c2 else None
                row['markets'][k] = dict(status='none', alt15=alt); continue
            b = max(c, key=lambda p: p['close'])  # a parità il primo
            row['markets'][k] = dict(status='peak', date=b['date'].isoformat(), offset=(b['date'] - P).days, ddPct=b['dd'], ongoing=b['ongoing'],
                                     belowZero=b['below0'], trough=b['trough'].isoformat(), confirm=b['conf'].isoformat(),
                                     others=[(p['date'] - P).days for p in c if p is not b])
        eps.append(row)
    return {'asOf': A[-1][0].isoformat(), 'episodes': eps}


if __name__ == '__main__':
    import urllib.parse
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='file')
    ap.add_argument('--to')
    ap.add_argument('--out')
    a = ap.parse_args()
    ser = load_file() if a.src == 'file' else load_yahoo(os.path.join(os.path.dirname(__file__), 'cache-yahoo'))
    res = run(ser, D(a.to) if a.to else None)
    txt = json.dumps(res, indent=1, ensure_ascii=False)
    if a.out: open(a.out, 'w').write(txt)
    else: print(txt)
