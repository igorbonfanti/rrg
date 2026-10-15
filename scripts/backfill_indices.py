#!/usr/bin/env python3
"""
backfill_indices.py — ricostruzione una tantum dello storico della breadth degli indici (pagina Indici).

Scrive:
  data/index_breadth.json  % di titoli sopra la media a 20/50/200 sedute per ogni indice di
                           config/indices.json (tranne SPX, che sta già in data/breadth.json)
  data/indices.json        chiusure degli indici (solo prezzo, valuta locale) dal 2000

Metodo, lo stesso di backfill_breadth.py (settori):
  - chiusura rettificata per gli split ma non per i dividendi (campo "close" di Yahoo);
  - titolo "sopra" se ha almeno N sedute di storia e chiude sopra la sua media a N sedute;
  - il denominatore (n) conta i membri quotati quel giorno; "members" conta tutti i membri,
    anche quelli senza prezzi su Yahoo: n / members è la copertura.
  Le medie si calcolano sulle sedute di ogni titolo; nel calendario dell'indice un titolo conta
  con la sua ultima seduta se è al massimo di 5 giorni prima (borse con festività diverse,
  come nello STOXX 600). Composizione: quella di epoca dove esiste (config/index_history.json),
  altrimenti i membri di oggi (data/index_members/).
  Pulizia dei prezzi: si scarta una chiusura isolata più di 3 volte sopra o sotto entrambe le
  vicine (errori di Yahoo, per esempio pence e sterline scambiati per un giorno).

Uso (fuori dalla GitHub Action, come backfill_breadth.py):
  python3 scripts/backfill_indices.py ndx-history --n100 DIR    intervalli NDX da jmccarrell/n100tickers
                                                                (DIR con n100_<anno>.yaml)
  python3 scripts/backfill_indices.py prices --cache DIR        scarica le serie da Yahoo (dal 1990)
  python3 scripts/backfill_indices.py build --cache DIR [--asof DATE]

FORMAT di index_breadth.json:
  {"series": {"NDX": {"dates": [...], "members": RLE, "n": RLE, "a20": [...], "a50": [...], "a200": [...]}, ...}}
  RLE = [[indice_inizio, valore], ...]; a* = numero di titoli sopra la media nel giorno i.
"""
import argparse, bisect, datetime as dt, json, os, re, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, 'config', 'indices.json')
HIST = os.path.join(ROOT, 'config', 'index_history.json')
MEMBERS = os.path.join(ROOT, 'data', 'index_members')
P1 = 631152000  # 1990-01-01
PRICE_FROM = '2000-01-01'
STALE_DAYS = 5
WINDOWS = (20, 50, 200)


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def save(p, obj):
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')


def rle(values):
    out = []
    for i, v in enumerate(values):
        if not out or out[-1][1] != v:
            out.append([i, v])
    return out


# ---------- composizione ----------

def ndx_history(n100dir):
    """Intervalli di appartenenza al Nasdaq-100 dai file annuali di n100tickers."""
    def parse(y):
        t = open(os.path.join(n100dir, f'n100_{y}.yaml'), encoding='utf-8').read()
        snap = re.findall(r'^\s+- (\S+)', t.split('tickers_on_Jan_1:')[1].split('changes:')[0], re.M)
        ch = []
        if 'changes:' in t:
            body = t.split('changes:')[1]
            for m in re.finditer(r"['\"](\d{4}-\d\d-\d\d)['\"]:\n((?:\s+(?:#.*|difference:|union:|- \S+)\n?)*)", body):
                add, rem, cur = [], [], None
                for line in m.group(2).splitlines():
                    line = line.strip()
                    if line.startswith('difference'): cur = rem
                    elif line.startswith('union'): cur = add
                    elif line.startswith('- ') and cur is not None: cur.append(line[2:])
                ch.append((m.group(1), add, rem))
        return snap, sorted(ch)
    iv, cur = {}, set()
    years = sorted(int(m.group(1)) for f in os.listdir(n100dir) if (m := re.match(r'n100_(\d{4})\.yaml$', f)))
    for y in years:
        snap, ch = parse(y)
        s, d0 = set(snap), f'{y}-01-01'
        for t in s - cur: iv.setdefault(t, []).append([d0, None])
        for t in cur - s: iv[t][-1][1] = d0
        cur = s
        for d, add, rem in ch:
            for t in rem:
                if t in cur: iv[t][-1][1] = d; cur.discard(t)
            for t in add:
                if t not in cur: iv.setdefault(t, []).append([d, None]); cur.add(t)
    return dict(sorted(iv.items()))


def dji_intervals(h):
    iv, cur = {}, set(h['initial'])
    for t in cur: iv[t] = [[h['start'], None]]
    for d, add, rem in h['changes']:
        for t in rem: iv[t][-1][1] = d; cur.discard(t)
        for t in add: iv.setdefault(t, []).append([d, None]); cur.add(t)
    return iv


def compositions():
    """{indice: {'pit': {simbolo: [[inizio, fine), ...]]} oppure 'current': [simboli]}}"""
    cfg, hist = load(CFG)['indices'], load(HIST)
    out = {}
    for k in cfg:
        if k == 'SPX':
            continue
        if cfg[k]['composition'] == 'epoca':
            if k == 'DJI':
                out[k] = {'pit': dji_intervals(hist['DJI'])}
            elif k == 'NDX':
                h = hist['NDX']
                iv = {}
                for t, ivs in h['intervals'].items():
                    if t in h['drop']:
                        iv['!' + t] = ivs
                        continue
                    iv.setdefault(h['alias'].get(t, t), []).extend(ivs)
                out[k] = {'pit': iv, 'lateStartOk': set(h.get('lateStartOk', []))}
        else:
            out[k] = {'current': load(os.path.join(MEMBERS, k + '.json'))['tickers']}
    return cfg, out


def all_symbols(cfg, comp):
    s = {cfg[k]['price'] for k in cfg}
    for c in comp.values():
        s |= {t for t in (c.get('pit') or c.get('current')) if not t.startswith('!')}
    return sorted(s)


# ---------- prezzi ----------

def cache_path(cache, sym):
    return os.path.join(cache, urllib.parse.quote(sym, safe='') + '.json')


def fetch(sym, cache):
    p = cache_path(cache, sym)
    if os.path.exists(p):
        return sym, 'cache'
    u = (f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}'
         f'?period1={P1}&period2={int(time.time())}&interval=1d')
    for attempt in range(4):
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (sector-monitor backfill)'})
            r = json.load(urllib.request.urlopen(req, timeout=40))['chart']['result'][0]
            off = r['meta'].get('gmtoffset') or 0
            ts, c = r.get('timestamp') or [], r['indicators']['quote'][0].get('close') or []
            d, v = [], []
            for t, x in zip(ts, c):
                if x is None or x <= 0:
                    continue
                day = dt.datetime.fromtimestamp(t + off, dt.UTC).strftime('%Y-%m-%d')
                if d and d[-1] == day:
                    v[-1] = x
                    continue
                d.append(day); v.append(x)
            save(p, {'symbol': sym, 'currency': r['meta'].get('currency'), 'dates': d, 'close': v})
            return sym, len(d)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                save(p, {'symbol': sym, 'dates': [], 'close': [], 'error': 404})
                return sym, 'not found'
            time.sleep(2 * 2 ** attempt)
        except Exception:
            time.sleep(2 * 2 ** attempt)
    return sym, 'error'


def clean(dates, close):
    """Errori di scala di Yahoo. Toglie le chiusure isolate più di 3 volte sopra o sotto entrambe le
    vicine; poi, per ogni salto di almeno 4 volte in una seduta: se entro 60 sedute c'è il salto
    inverso scarta il tratto (unità sbagliata per qualche giorno), altrimenti riporta la storia
    precedente alla nuova scala (split non rettificato). Restituisce date, chiusure, correzioni."""
    keep = [True] * len(close)
    for i in range(1, len(close) - 1):
        a, b, c = close[i - 1], close[i], close[i + 1]
        if (b > 3 * a and b > 3 * c) or (3 * b < a and 3 * b < c):
            keep[i] = False
    d = [x for x, k in zip(dates, keep) if k]
    c = [x for x, k in zip(close, keep) if k]
    fixes = keep.count(False)
    big = lambda r: r >= 4 or r <= 0.25
    i = 1
    while i < len(c):
        r = c[i] / c[i - 1]
        if not big(r):
            i += 1
            continue
        back = next((j for j in range(i + 1, min(len(c), i + 61)) if big(c[j] / c[j - 1]) and 0.5 < r * c[j] / c[j - 1] < 2), None)
        if back is not None:
            del d[i:back], c[i:back]
        else:
            for j in range(i):
                c[j] *= r
            i += 1
        fixes += 1
    return d, c, fixes


def flags(close):
    """Per ogni seduta del titolo: (sopra20, sopra50, sopra200) con almeno N sedute."""
    n = len(close)
    out = [[False] * 3 for _ in range(n)]
    for j, w in enumerate(WINDOWS):
        s = 0.0
        for i in range(n):
            s += close[i]
            if i >= w:
                s -= close[i - w]
            if i >= w - 1 and close[i] > s / w:
                out[i][j] = True
    return out


# ---------- breadth ----------

def build(cache, asof=None):
    cfg, comp = compositions()
    px, cleaned = {}, {}
    for sym in all_symbols(cfg, comp):
        p = cache_path(cache, sym)
        if not os.path.exists(p):
            sys.exit(f'manca {sym} nella cache: lancia prima "prices"')
        j = load(p)
        d, c, k = clean(j['dates'], j['close'])
        if k:
            cleaned[sym] = k
        px[sym] = (d, c)
    if cleaned:
        print('chiusure isolate scartate:', ', '.join(f'{s} {k}' for s, k in sorted(cleaned.items())))

    series, prices, report = {}, {}, {}
    for k, c in comp.items():
        idx_dates, idx_close = px[cfg[k]['price']]
        if asof:
            m = bisect.bisect_right(idx_dates, asof)
            idx_dates, idx_close = idx_dates[:m], idx_close[:m]
        f0 = bisect.bisect_left(idx_dates, PRICE_FROM)
        prices[k] = {'symbol': cfg[k]['price'], 'dates': idx_dates[f0:], 'close': [round(x, 2) for x in idx_close[f0:]]}
        b0 = bisect.bisect_left(idx_dates, cfg[k]['from'])
        cal = idx_dates[b0:]
        warm = f'{int(cal[0][:4]) - 2}{cal[0][4:]}'
        N = len(cal)
        acc = {'members': [0] * N, 'n': [0] * N, 'a20': [0] * N, 'a50': [0] * N, 'a200': [0] * N}
        if 'pit' in c:
            members = c['pit']
        else:
            members = {t: [[cal[0], None]] for t in c['current']}
        dropped = []
        for sym, ivs in members.items():
            have = not sym.startswith('!') and px.get(sym) and px[sym][0]
            if have and 'pit' in c and sym not in c.get('lateStartOk', ()):
                # ticker con storia che parte dopo l'ingresso nell'indice: probabilmente riusato
                first = dt.date.fromisoformat(px[sym][0][0])
                late = [iv for iv in ivs if first > dt.date.fromisoformat(max(iv[0], '1990-01-01')) + dt.timedelta(days=10)
                        and (iv[1] is None or iv[1] > px[sym][0][0])]
                if late:
                    dropped.append(f'{sym} (dati dal {px[sym][0][0]}, membro dal {late[0][0]})')
                    have = False
            if have:
                sd, sc = px[sym]
                cut = bisect.bisect_left(sd, warm)  # per le medie bastano 2 anni; prima Yahoo è meno pulito
                sd, sc = sd[cut:], sc[cut:]
                have = bool(sd)
            if have:
                fl = flags(sc)
                sord = [dt.date.fromisoformat(x).toordinal() for x in sd]
            for i, d in enumerate(cal):
                if not any(iv[0] <= d and (iv[1] is None or d < iv[1]) for iv in ivs):
                    continue
                acc['members'][i] += 1
                if not have:
                    continue
                j = bisect.bisect_right(sd, d) - 1
                if j < 0 or dt.date.fromisoformat(d).toordinal() - sord[j] > STALE_DAYS:
                    continue
                acc['n'][i] += 1
                f = fl[j]
                acc['a20'][i] += f[0]; acc['a50'][i] += f[1]; acc['a200'][i] += f[2]
        series[k] = {'dates': cal, 'members': rle(acc['members']), 'n': rle(acc['n']),
                     'a20': acc['a20'], 'a50': acc['a50'], 'a200': acc['a200']}
        report[k] = {'dropped': dropped}
        cov = [acc['n'][i] / acc['members'][i] if acc['members'][i] else 0 for i in range(N)]
        yrs = sorted({d[:4] for d in cal})
        line = ' '.join(f"{y}:{100 * cov[cal.index(next(d for d in cal if d[:4] == y))]:.0f}%" for y in yrs[::3])
        print(f'{k:5} {cal[0]} → {cal[-1]} ({N}) copertura {line}' + (f'\n      esclusi: {"; ".join(dropped)}' if dropped else ''))

    today = dt.date.today().isoformat()
    method = ('close > SMA(close, N) con almeno N sedute; chiusure rettificate per split, non per dividendi; '
              'composizione di epoca dove indicato in config/indices.json, altrimenti membri attuali; '
              f'ultima seduta del titolo entro {STALE_DAYS} giorni')
    save(os.path.join(ROOT, 'data', 'index_breadth.json'),
         {'generated': today, 'asOf': max(s['dates'][-1] for s in series.values()), 'method': method,
          'source': 'ricostruzione: scripts/backfill_indices.py (prezzi Yahoo Finance)', 'series': series})
    save(os.path.join(ROOT, 'data', 'indices.json'),
         {'generated': today, 'note': 'chiusure degli indici, solo prezzo, valuta locale', 'series': prices})
    return report


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('ndx-history'); a.add_argument('--n100', required=True)
    a = sub.add_parser('prices'); a.add_argument('--cache', required=True); a.add_argument('--workers', type=int, default=4)
    a = sub.add_parser('build'); a.add_argument('--cache', required=True); a.add_argument('--asof')
    args = ap.parse_args()
    if args.cmd == 'ndx-history':
        h = load(HIST)
        h['NDX']['intervals'] = ndx_history(args.n100)
        s = json.dumps(h, ensure_ascii=False, indent=2)
        # liste senza annidamenti su una riga sola
        one = lambda m: '[' + re.sub(r'\s*\n\s*', ' ', m.group(1)) + ']'
        s = re.sub(r'\[\s+([^\[\]{}]*?)\s+\]', one, s)
        s = re.sub(r'\[\s+((?:[^\[\]{}]|\[[^\[\]\n]*\])*?)\s+\]', one, s)
        with open(HIST, 'w', encoding='utf-8') as f:
            f.write(s + '\n')
        print('NDX:', len(h['NDX']['intervals']), 'ticker')
    elif args.cmd == 'prices':
        os.makedirs(args.cache, exist_ok=True)
        cfg, comp = compositions()
        syms = all_symbols(cfg, comp)
        bad = []
        with ThreadPoolExecutor(args.workers) as ex:
            for i, (s, r) in enumerate(ex.map(lambda s: fetch(s, args.cache), syms)):
                if r in ('not found', 'error') or r == 0:
                    bad.append(f'{s}:{r}')
                if i % 100 == 99:
                    print(f'{i + 1}/{len(syms)}', flush=True)
        print(f'{len(syms)} simboli; senza dati: {", ".join(bad) or "nessuno"}')
    else:
        build(args.cache, args.asof)


if __name__ == '__main__':
    main()
