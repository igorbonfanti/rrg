#!/usr/bin/env python3
"""
backfill_indices.py — ricostruzione una tantum dello storico della breadth degli indici (pagina Indici).

Scrive data/indices.json (formato in js/indexdata.js): per ogni indice di config/indices.json le
chiusure dal 2000 (solo prezzo, valuta locale) e i conteggi dei titoli sopra la media a 20/50/200
sedute. L'S&P 500 riusa la serie SPX di data/breadth.json (settori). Poi lo aggiorna ogni sera
scripts/fetch_indices.js.

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
  python3 scripts/backfill_indices.py prices --cache DIR [--only K,…]    scarica le serie da Yahoo (dal 1990)
  python3 scripts/backfill_indices.py build --cache DIR [--asof DATE] [--only K,…]
    --only ricostruisce solo quegli indici e lascia gli altri di data/indices.json come sono.
    Con "from": null in config/indices.json la breadth parte dal mese dopo la prima seduta in cui
    almeno il 60% dei membri di oggi ha 200 sedute di storia; la data trovata si scrive nel file.

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


def expand(r, n):
    out = [None] * n
    for j, (i0, v) in enumerate(r):
        i1 = r[j + 1][0] if j + 1 < len(r) else n
        for i in range(i0, min(i1, n)):
            out[i] = v
    return out


def encode_dates(dates):
    """Formato di js/indexdata.js: prima data e giorni tra le sedute, un carattere in base 36 ciascuno."""
    g = []
    for a, b in zip(dates, dates[1:]):
        k = (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days
        if not 1 <= k <= 35:
            raise ValueError(f'intervallo di {k} giorni tra {a} e {b}')
        g.append('0123456789abcdefghijklmnopqrstuvwxyz'[k])
    return {'d0': dates[0], 'gaps': ''.join(g)}


def compact(price, br):
    """Serie di un indice nel formato di data/indices.json: breadth allineata al calendario del prezzo."""
    dates = price['dates']
    pos = {d: i for i, d in enumerate(dates)}
    nb = len(br['dates'])
    n, mem = expand(br['n'], nb), expand(br['members'], nb)
    first = next(i for i, d in enumerate(br['dates']) if d in pos)
    b0 = pos[br['dates'][first]]
    L = len(dates) - b0
    a = {key: [None] * L for key in ('members', 'n', 'a20', 'a50', 'a200')}
    for i in range(first, nb):
        j = pos.get(br['dates'][i])
        if j is None:
            continue
        j -= b0
        a['members'][j], a['n'][j] = mem[i], n[i]
        for key in ('a20', 'a50', 'a200'):
            a[key][j] = br[key][i]
    # chiude in fondo le sedute con il prezzo ma senza breadth
    while L and a['a200'][L - 1] is None:
        L -= 1
    return {'symbol': price['symbol'], **encode_dates(dates), 'close': price['close'], 'b0': b0,
            'members': rle(a['members'][:L]), 'n': rle(a['n'][:L]),
            'a20': a['a20'][:L], 'a50': a['a50'][:L], 'a200': a['a200'][:L]}


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

MIN_COVERAGE = 0.6
auto_from = {}


def decode_last(x):
    """Ultima data con la breadth in una serie compatta."""
    d = dt.date.fromisoformat(x['d0'])
    for ch in x['gaps'][:x['b0'] + len(x['a200']) - 1]:
        d += dt.timedelta(days=int(ch, 36))
    return d.isoformat()


def set_config_from(found):
    """Scrive in config/indices.json l'inizio trovato con la regola della copertura (al posto di "from": null)."""
    text = open(CFG, encoding='utf-8').read()
    for k, d in found.items():
        text, n = re.subn(r'("%s":\s*\{[^}]*?"from":\s*)null' % re.escape(k), r'\g<1>"%s"' % d, text, count=1)
        print(f'{k}: breadth dal {d} (copertura dei membri di oggi ≥ {MIN_COVERAGE:.0%})' if n else f'{k}: "from" non trovato')
    with open(CFG, 'w', encoding='utf-8') as f:
        f.write(text)


def breadth_for(c, px, cal):
    """Conteggi di un indice sulle sedute `cal`; elig = membri con almeno 200 sedute di storia."""
    N = len(cal)
    warm = f'{int(cal[0][:4]) - 2}{cal[0][4:]}'
    cal_ord = [dt.date.fromisoformat(d).toordinal() for d in cal]
    acc = {'members': [0] * N, 'n': [0] * N, 'a20': [0] * N, 'a50': [0] * N, 'a200': [0] * N, 'dropped': []}
    elig = [0] * N
    members = c['pit'] if 'pit' in c else {t: [[cal[0], None]] for t in c['current']}
    for sym, ivs in members.items():
        have = not sym.startswith('!') and px.get(sym) and px[sym][0]
        if have and 'pit' in c and sym not in c.get('lateStartOk', ()):
            # ticker con storia che parte dopo l'ingresso nell'indice: probabilmente riusato
            first = dt.date.fromisoformat(px[sym][0][0])
            late = [iv for iv in ivs if first > dt.date.fromisoformat(max(iv[0], '1990-01-01')) + dt.timedelta(days=10)
                    and (iv[1] is None or iv[1] > px[sym][0][0])]
            if late:
                acc['dropped'].append(f'{sym} (dati dal {px[sym][0][0]}, membro dal {late[0][0]})')
                have = False
        if have:
            sd, sc = px[sym]
            cut = bisect.bisect_left(sd, warm)  # per le medie bastano 2 anni; prima Yahoo è meno pulito
            sd, sc = sd[cut:], sc[cut:]
            have = bool(sd)
        if have:
            fl = flags(sc)
            sord = [dt.date.fromisoformat(x).toordinal() for x in sd]
        always = len(ivs) == 1 and ivs[0][0] <= cal[0] and ivs[0][1] is None
        j = -1
        for i, d in enumerate(cal):
            if not always and not any(iv[0] <= d and (iv[1] is None or d < iv[1]) for iv in ivs):
                continue
            acc['members'][i] += 1
            if not have:
                continue
            while j + 1 < len(sord) and sord[j + 1] <= cal_ord[i]:
                j += 1
            if j < 0 or cal_ord[i] - sord[j] > STALE_DAYS:
                continue
            acc['n'][i] += 1
            if j >= 199:
                elig[i] += 1
            f = fl[j]
            acc['a20'][i] += f[0]; acc['a50'][i] += f[1]; acc['a200'][i] += f[2]
    return cal, acc, elig


def build(cache, asof=None, only=None):
    cfg, comp = compositions()
    px, cleaned = {}, {}
    need = all_symbols({k: v for k, v in cfg.items() if not only or k in only}, {k: v for k, v in comp.items() if not only or k in only})
    for sym in need:
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
    keys = [k for k in comp if not only or k in only]
    for k in keys:
        c = comp[k]
        idx_dates, idx_close = px[cfg[k]['price']]
        if asof:
            m = bisect.bisect_right(idx_dates, asof)
            idx_dates, idx_close = idx_dates[:m], idx_close[:m]
        f0 = bisect.bisect_left(idx_dates, PRICE_FROM)
        prices[k] = {'symbol': cfg[k]['price'], 'dates': idx_dates[f0:], 'close': [round(x, 2) for x in idx_close[f0:]]}
        start = cfg[k].get('from')
        if not start:
            # indici con limiti: si parte dal mese dopo la prima seduta in cui almeno il 60% dei membri di oggi
            # ha 200 sedute di storia (la media a 200 si può calcolare)
            cal, acc, elig = breadth_for(c, px, idx_dates[bisect.bisect_left(idx_dates, '2000-01-01'):])
            i = next((i for i in range(len(cal)) if elig[i] >= MIN_COVERAGE * acc['members'][i]), len(cal) - 1)
            start = next((d for d in cal[i:] if d[:7] > cal[i][:7]), cal[i])
            auto_from[k] = start
        cal, acc, elig = breadth_for(c, px, idx_dates[bisect.bisect_left(idx_dates, start):])
        series[k] = {'dates': cal, 'members': rle(acc['members']), 'n': rle(acc['n']),
                     'a20': acc['a20'], 'a50': acc['a50'], 'a200': acc['a200']}
        report[k] = {'dropped': acc['dropped']}
        N = len(cal)
        cov = [acc['n'][i] / acc['members'][i] if acc['members'][i] else 0 for i in range(N)]
        yrs = sorted({d[:4] for d in cal})
        line = ' '.join(f"{y}:{100 * cov[cal.index(next(d for d in cal if d[:4] == y))]:.0f}%" for y in yrs[::3])
        dropped = acc['dropped']
        print(f'{k:5} {cal[0]} → {cal[-1]} ({N}) copertura {line}' + (f'\n      esclusi: {"; ".join(dropped)}' if dropped else ''), flush=True)

    # S&P 500: la breadth è quella dei settori (data/breadth.json), il prezzo ^GSPC
    if only and 'SPX' not in only:
        return finish(cfg, prices, series, report, only)
    bj = load(os.path.join(ROOT, 'data', 'breadth.json'))
    sp = bj['series']['SPX']
    nb = len(bj['dates'])
    series['SPX'] = {'dates': bj['dates'], 'members': sp['members'], 'n': sp['n'], 'a20': sp['a20'], 'a50': sp['a50'], 'a200': sp['a200']}
    gd, gc = px[cfg['SPX']['price']]
    if asof:
        m = bisect.bisect_right(gd, asof)
        gd, gc = gd[:m], gc[:m]
    f0 = bisect.bisect_left(gd, PRICE_FROM)
    prices['SPX'] = {'symbol': cfg['SPX']['price'], 'dates': gd[f0:], 'close': [round(x, 2) for x in gc[f0:]]}

    return finish(cfg, prices, series, report, only)


def finish(cfg, prices, series, report, only):
    """Scrive data/indices.json; con `only` sostituisce solo quegli indici e tiene gli altri."""
    file = os.path.join(ROOT, 'data', 'indices.json')
    more = os.path.join(ROOT, 'data', 'indices_more.json')
    # tutti gli indici in indices.json (formato esteso): fetch_indices.js li ridivide e li compatta alla prima corsa
    out = {}
    if only:
        for f in (more, file):
            if os.path.exists(f):
                out.update(load(f)['series'])
    for k in cfg:
        if k in series:
            out[k] = compact(prices[k], series[k])
    out = {k: out[k] for k in cfg if k in out}
    if auto_from:
        set_config_from(auto_from)
    today = dt.date.today().isoformat()
    last = lambda x: decode_last(x)
    save(file, {
        'generated': today, 'asOf': max(last(x) for x in out.values()),
        'method': ('close > SMA(close, N) con almeno N sedute; chiusure rettificate per split, non per dividendi; '
                   'composizione di epoca dove indicato in config/indices.json, altrimenti membri attuali; '
                   f'ultima seduta del titolo entro {STALE_DAYS} giorni. Prezzo degli indici: solo prezzo, valuta locale'),
        'source': 'ricostruzione: scripts/backfill_indices.py (prezzi Yahoo Finance); S&P 500 da data/breadth.json',
        'series': out})
    if os.path.exists(more):
        os.remove(more)
    return report


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('ndx-history'); a.add_argument('--n100', required=True)
    a = sub.add_parser('prices'); a.add_argument('--cache', required=True); a.add_argument('--workers', type=int, default=4)
    a.add_argument('--only', help='solo i simboli di questi indici, separati da virgole')
    a = sub.add_parser('build'); a.add_argument('--cache', required=True); a.add_argument('--asof')
    a.add_argument('--only', help='indici da ricostruire, separati da virgole (gli altri restano come sono)')
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
        if args.only:
            keep = set(args.only.split(','))
            cfg, comp = {k: v for k, v in cfg.items() if k in keep}, {k: v for k, v in comp.items() if k in keep}
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
        build(args.cache, args.asof, set(args.only.split(',')) if args.only else None)


if __name__ == '__main__':
    main()
