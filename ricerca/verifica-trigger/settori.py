# Settore GICS di ogni titolo della composizione storica, con la stessa logica di scripts/backfill_breadth.py
import csv, importlib.util, json, os, re, sys
sys.dont_write_bytecode = True  # niente __pycache__ in scripts/
from collections import defaultdict
# Uso: python3 settori.py <cartella sp500-data di Johnbrick123> <clone di datasets/s-and-p-500-companies> <settori.json in uscita>
JB, REPO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('bf', os.path.join(HERE, '../../scripts/backfill_breadth.py'))
bf = importlib.util.module_from_spec(spec); spec.loader.exec_module(bf)
import duckdb
jb = JB
con = duckdb.connect()
snaps = bf.snapshots(REPO)
latest_date, latest = snaps[-1]
renames = {}
for r in csv.DictReader(open(f'{jb}/renames.csv')):
    renames.setdefault(bf.norm_sym(r['new']), []).append(bf.norm_sym(r['old']))
intervals = con.execute(f"SELECT ticker, CAST(start AS DATE), CAST(\"end\" AS DATE) FROM '{jb}/membership_intervals.parquet'").fetchall()
sector_of, how = {}, defaultdict(int)
for t, s, e in intervals:
    if t in sector_of or (e is not None and str(e) < bf.START_BREADTH):
        continue
    base = re.sub(r'-\d{6}$', '', t)
    cands = [base] + renames.get(base, [])
    found = None
    if e is None and base in latest:
        found = latest[base]
    else:
        limit = str(e) if e else latest_date
        for d, rows in reversed(snaps):
            if d > limit:
                continue
            hit = next((rows[c] for c in cands if c in rows), None)
            if hit:
                found = hit; break
    if e is not None and base in bf.MANUAL:
        sector_of[t] = bf.MANUAL[base]; how['manuale'] += 1
    elif found and bf.norm_sector(*found):
        sector_of[t] = bf.norm_sector(*found); how['trovato'] += 1
    else:
        how['senza settore'] += 1
json.dump({'sector_of': sector_of, 'intervals': [[t, str(s), str(e) if e else None] for t, s, e in intervals]}, open(OUT, 'w'))
print(len(snaps), 'versioni ·', dict(how), '· con settore', len(sector_of))
