#!/usr/bin/env python3
"""
backfill_breadth.py — ricostruzione una tantum dello storico della breadth settoriale.

Scrive:
  data/breadth.json   % di titoli sopra la media a 20/50/200 sedute, per l'S&P 500 e per
                      gli 11 settori GICS, dal 2005 (conteggi interi, vedi FORMAT sotto)
  data/sectors.json   chiusure rettificate degli ETF settoriali (XL*), SPY e RSP dal 2004

Metodo (verificato sui valori pubblicati di S5TH: scarto tra -0,1 e +0,9 punti):
  - composizione storica dell'indice (point-in-time), non quella di oggi: con i soli membri
    attuali la breadth storica risulta 3-6 punti troppo alta;
  - chiusura rettificata per gli split ma NON per i dividendi (come i fornitori delle serie S5TH…);
  - titolo "sopra" se ha almeno N sedute di storia e chiude sopra la sua media a N sedute;
    il denominatore conta tutti i membri quotati quel giorno;
  - settore GICS attuale per i membri di oggi; per quelli usciti, l'ultimo settore noto nelle
    versioni storiche della lista dei costituenti (dal dicembre 2012), riportato alla
    classificazione attuale (Telecom → Communication Services, REIT → Real Estate, media e
    internet → Communication Services, pagamenti → Financials). Chi è uscito prima del 2013
    non ha settore noto e conta solo nel totale S&P 500.

Ingressi:
  --jb DIR       file della release di github.com/Johnbrick123/sp500-data (prices.parquet,
                 membership_intervals.parquet, renames.csv) — prezzi Yahoo dal 1995 e
                 composizione storica
  --repo DIR     clone con storia di github.com/datasets/s-and-p-500-companies
                 (git clone https://github.com/datasets/s-and-p-500-companies; git fetch --depth=20000)
  --asof DATE    ultima data da includere (default: ultima data con prezzi per quasi tutti i membri)

Richiede Python 3.10+ e duckdb (pip install duckdb). Non gira nella GitHub Action: quella
aggiunge ogni sera le nuove sedute con scripts/fetch_breadth.js.

FORMAT di breadth.json:
  {"dates": [...], "series": {"XLU": {"members": RLE, "n": RLE, "a20": [...], "a50": [...], "a200": [...]}, ...}}
  RLE = [[indice_inizio, valore], ...]; a* = numero di titoli sopra la media nel giorno i.
"""
import argparse, csv, io, json, re, subprocess, sys
from collections import defaultdict
from datetime import date

SECTORS = {
    'Information Technology': 'XLK', 'Communication Services': 'XLC', 'Consumer Discretionary': 'XLY',
    'Consumer Staples': 'XLP', 'Energy': 'XLE', 'Financials': 'XLF', 'Health Care': 'XLV',
    'Industrials': 'XLI', 'Materials': 'XLB', 'Real Estate': 'XLRE', 'Utilities': 'XLU',
}
ETFS = ['XLK', 'XLC', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLRE', 'XLU', 'SPY', 'RSP']
START_ETF, START_BREADTH = '2004-01-02', '2005-01-03'

# Riclassificazioni GICS 2016/2018/2023 per i titoli usciti prima del cambio.
SUBIND_TO_SECTOR = {
    'Advertising': 'Communication Services', 'Broadcasting': 'Communication Services',
    'Cable & Satellite': 'Communication Services', 'Movies & Entertainment': 'Communication Services',
    'Publishing': 'Communication Services', 'Interactive Media & Services': 'Communication Services',
    'Interactive Home Entertainment': 'Communication Services', 'Internet Software & Services': None,
    'Data Processing & Outsourced Services': None,
}
# Titoli usciti prima del 2018/2023 la cui sotto-industria non compare nelle vecchie versioni della lista
MANUAL = {
    # media e internet (Communication Services dal 2018)
    'TWX': 'Communication Services', 'TWC': 'Communication Services', 'DTV': 'Communication Services',
    'CVC': 'Communication Services', 'SNI': 'Communication Services', 'GCI': 'Communication Services',
    'NYT': 'Communication Services',
    'YHOO': 'Communication Services', 'AABA': 'Communication Services', 'FOX': 'Communication Services',
    'FOXA': 'Communication Services', 'TGNA': 'Communication Services', 'DISCA': 'Communication Services',
    'DISCK': 'Communication Services', 'VIAB': 'Communication Services', 'CBS': 'Communication Services',
    'NWSA': 'Communication Services', 'NWS': 'Communication Services', 'CTL': 'Communication Services',
    # pagamenti (Financials dal 2023)
    'ADS': 'Financials', 'TSS': 'Financials', 'WU': 'Financials',
}
REIT_WORDS = re.compile(r'\b(REIT|Realty|Properties|Property|Residential|Apartment|Storage|Real Estate|Hospitality Prop|Healthcare Trust|Plum Creek)\b', re.I)


def norm_sym(s):
    return s.strip().replace('.', '-').upper()


def norm_sector(sector, sub, name):
    sector = (sector or '').strip()
    if sector.startswith('Telecommunication'):
        return 'Communication Services'
    if sub in SUBIND_TO_SECTOR and SUBIND_TO_SECTOR[sub]:
        return SUBIND_TO_SECTOR[sub]
    if sector == 'Financials' and ((sub and ('REIT' in sub or 'Real Estate' in sub)) or (not sub and REIT_WORDS.search(name or ''))):
        return 'Real Estate'
    return sector if sector in SECTORS else None


def snapshots(repo):
    """[(data, {simbolo: (settore, sotto-industria, nome)})] dalle versioni storiche di constituents.csv"""
    log = subprocess.run(['git', '-C', repo, 'log', '--format=%H %ad', '--date=short', '--', 'data/constituents.csv'],
                         capture_output=True, text=True, check=True).stdout.split('\n')
    out = []
    for line in filter(None, log):
        sha, d = line.split()
        raw = subprocess.run(['git', '-C', repo, 'show', f'{sha}:data/constituents.csv'], capture_output=True, text=True).stdout
        rows = {}
        for r in csv.DictReader(io.StringIO(raw)):
            sym = norm_sym(r.get('Symbol', ''))
            if sym:
                rows[sym] = (r.get('GICS Sector') or r.get('Sector'), r.get('GICS Sub-Industry') or r.get('GICS Sub Industry'), r.get('Security') or r.get('Name'))
        out.append((d, rows))
    out.reverse()  # git log parte dalla più recente: in ordine cronologico, a parità di data resta l'ordine dei commit
    out.sort(key=lambda x: x[0])
    return out


def rle(values):
    out, last = [], object()
    for i, v in enumerate(values):
        if v != last:
            out.append([i, v]); last = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jb', required=True)
    ap.add_argument('--repo', required=True)
    ap.add_argument('--asof')
    ap.add_argument('--out', default='data')
    args = ap.parse_args()
    import duckdb

    con = duckdb.connect()
    jb = args.jb.rstrip('/')
    snaps = snapshots(args.repo)
    latest_date, latest = snaps[-1]
    print(f'{len(snaps)} versioni della lista costituenti ({snaps[0][0]} → {latest_date}), {len(latest)} membri attuali')
    renames = {}
    try:
        for r in csv.DictReader(open(f'{jb}/renames.csv')):
            renames.setdefault(norm_sym(r['new']), []).append(norm_sym(r['old']))
    except FileNotFoundError:
        pass

    intervals = con.execute(f"SELECT ticker, CAST(start AS DATE), CAST(\"end\" AS DATE) FROM '{jb}/membership_intervals.parquet'").fetchall()
    sector_of, how = {}, defaultdict(list)
    for t, s, e in intervals:
        if t in sector_of or (e is not None and str(e) < START_BREADTH):
            continue
        base = re.sub(r'-\d{6}$', '', t)
        cands = [base] + renames.get(base, [])
        found = None
        if e is None and base in latest:
            found = latest[base]
            how['attuale'].append(t)
        else:
            limit = str(e) if e else latest_date
            for d, rows in reversed(snaps):
                if d > limit:
                    continue
                hit = next((rows[c] for c in cands if c in rows), None)
                if hit:
                    found = hit
                    how['storico'].append(t)
                    break
        if e is not None and base in MANUAL:  # solo titoli usciti: per i membri attuali vale il settore di oggi
            sector_of[t] = MANUAL[base]
            how['manuale'].append(t)
        elif found:
            sec = norm_sector(*found)
            if sec:
                sector_of[t] = sec
            else:
                how['settore non riconosciuto'].append(t)
        else:
            how['senza settore'].append(t)
    print({k: len(v) for k, v in how.items()})

    con.execute(f"""CREATE TABLE px AS SELECT ticker, CAST(date AS DATE) d, close FROM '{jb}/prices.parquet' WHERE close IS NOT NULL AND close > 0""")
    # ultima seduta con i prezzi di almeno il 99% dei membri attuali
    asof = args.asof or con.execute(f"""
        WITH mem AS (SELECT ticker FROM '{jb}/membership_intervals.parquet' WHERE "end" IS NULL)
        SELECT max(d) FROM (SELECT d, count(*) c FROM px JOIN mem USING (ticker) GROUP BY d)
        WHERE c >= 0.99 * (SELECT count(*) FROM mem)""").fetchone()[0]
    asof = str(asof)
    dates = [str(r[0]) for r in con.execute(f"SELECT DISTINCT d FROM px WHERE ticker = 'SPY' AND d >= DATE '{START_ETF}' AND d <= DATE '{asof}' ORDER BY d").fetchall()]
    idx = {d: i for i, d in enumerate(dates)}
    b0 = idx[next(d for d in dates if d >= START_BREADTH)]
    print(f'date {dates[0]} → {asof} ({len(dates)}), breadth dal {dates[b0]}')

    con.execute("""CREATE TABLE sma AS SELECT ticker, d, close,
        avg(close) OVER w20 s20, count(*) OVER w20 c20, avg(close) OVER w50 s50, count(*) OVER w50 c50,
        avg(close) OVER w200 s200, count(*) OVER w200 c200
      FROM px WINDOW w20 AS (PARTITION BY ticker ORDER BY d ROWS 19 PRECEDING),
                     w50 AS (PARTITION BY ticker ORDER BY d ROWS 49 PRECEDING),
                     w200 AS (PARTITION BY ticker ORDER BY d ROWS 199 PRECEDING)""")
    con.execute(f"CREATE TABLE mi AS SELECT ticker, CAST(start AS DATE) s, CAST(\"end\" AS DATE) e FROM '{jb}/membership_intervals.parquet'")
    con.execute("CREATE TABLE sec(ticker VARCHAR, sector VARCHAR)")
    con.executemany("INSERT INTO sec VALUES (?, ?)", list(sector_of.items()))
    con.execute(f"CREATE TABLE cal AS SELECT DISTINCT d FROM px WHERE ticker = 'SPY' AND d >= DATE '{dates[b0]}' AND d <= DATE '{asof}'")
    rows = con.execute("""
      SELECT c.d, coalesce(s.sector, '?') sector, count(*) members, count(x.close) n,
        sum(CASE WHEN x.c20 = 20 AND x.close > x.s20 THEN 1 ELSE 0 END) a20,
        sum(CASE WHEN x.c50 = 50 AND x.close > x.s50 THEN 1 ELSE 0 END) a50,
        sum(CASE WHEN x.c200 = 200 AND x.close > x.s200 THEN 1 ELSE 0 END) a200
      FROM cal c JOIN mi m ON m.s <= c.d AND (m.e IS NULL OR m.e > c.d)
      LEFT JOIN sec s ON s.ticker = m.ticker
      LEFT JOIN sma x ON x.ticker = m.ticker AND x.d = c.d
      GROUP BY c.d, sector ORDER BY c.d""").fetchall()

    N = len(dates) - b0
    acc = {k: {'members': [0] * N, 'n': [0] * N, 'a20': [0] * N, 'a50': [0] * N, 'a200': [0] * N} for k in list(SECTORS.values()) + ['SPX']}
    for d, sector, members, n, a20, a50, a200 in rows:
        i = idx[str(d)] - b0
        keys = ['SPX'] + ([SECTORS[sector]] if sector in SECTORS else [])
        for k in keys:
            a = acc[k]
            a['members'][i] += members; a['n'][i] += n; a['a20'][i] += int(a20); a['a50'][i] += int(a50); a['a200'][i] += int(a200)
    series = {k: {'members': rle(v['members']), 'n': rle(v['n']), 'a20': v['a20'], 'a50': v['a50'], 'a200': v['a200']} for k, v in acc.items()}
    breadth = {
        'generated': date.today().isoformat(), 'asOf': asof,
        'method': 'close > SMA(close, N) con almeno N sedute; chiusure rettificate per split, non per dividendi; composizione storica S&P 500; settori GICS attuali (ultimo noto per i titoli usciti)',
        'source': 'ricostruzione: Johnbrick123/sp500-data + datasets/s-and-p-500-companies; aggiornamenti giornalieri da Yahoo Finance',
        'dates': dates[b0:], 'series': series,
    }
    with open(f'{args.out}/breadth.json', 'w') as f:
        json.dump(breadth, f, separators=(',', ':'))

    etf = {}
    for t in ETFS:
        m = {str(d): round(v, 2) for d, v in con.execute(f"SELECT CAST(date AS DATE), adj_close FROM '{jb}/prices.parquet' WHERE ticker = '{t}' AND adj_close IS NOT NULL").fetchall()}
        last = None
        col = []
        for d in dates:
            if d in m:
                last = m[d]
            col.append(last)
        etf[t] = col
    with open(f'{args.out}/sectors.json', 'w') as f:
        json.dump({'generated': date.today().isoformat(), 'asOf': asof, 'dates': dates, 'adjclose': etf}, f, separators=(',', ':'))

    last = N - 1
    for k, v in acc.items():
        n = v['n'][last]
        print(f"{k:5} {v['a200'][last]:3}/{n:3} = {100 * v['a200'][last] / n:5.1f}% sopra 200g · copertura {100 * n / max(1, v['members'][last]):.0f}% · 2008-10-10 copertura {100 * v['n'][idx['2008-10-10'] - b0] / max(1, v['members'][idx['2008-10-10'] - b0]):.0f}%")


if __name__ == '__main__':
    sys.exit(main())
