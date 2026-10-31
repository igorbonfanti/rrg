# Controvalore scambiato ogni giorno dai titoli di ciascun settore (prezzo x volume), composizione storica.
# Serve come sostituto del volume dell'ETF per il POC della regola C6 (protocollo, punto 5).
# Uso: python3 volumi_settori.py <cartella sp500-data di Johnbrick123> <settori.json> <sectors.json congelato> <uscita>
import json, sys, duckdb
jb, SETT, SECJ, OUT = sys.argv[1:5]
SECTORS = {'Information Technology': 'XLK', 'Communication Services': 'XLC', 'Consumer Discretionary': 'XLY', 'Consumer Staples': 'XLP', 'Energy': 'XLE', 'Financials': 'XLF', 'Health Care': 'XLV', 'Industrials': 'XLI', 'Materials': 'XLB', 'Real Estate': 'XLRE', 'Utilities': 'XLU'}
M = json.load(open(SETT))
S = json.load(open(SECJ))
D = S['dates']
con = duckdb.connect()
con.execute("CREATE TABLE sec(ticker VARCHAR, sector VARCHAR)")
con.executemany("INSERT INTO sec VALUES (?, ?)", [(t, SECTORS[v]) for t, v in M['sector_of'].items()])
con.execute(f"CREATE TABLE mi AS SELECT ticker, CAST(start AS DATE) s, CAST(\"end\" AS DATE) e FROM '{jb}/membership_intervals.parquet'")
con.execute(f"CREATE TABLE px AS SELECT ticker, CAST(date AS DATE) d, close, volume FROM '{jb}/prices.parquet' WHERE close > 0 AND volume > 0 AND date >= DATE '2003-01-01'")
rows = con.execute("""
  SELECT CAST(x.d AS VARCHAR), s.sector, sum(x.close * x.volume)
  FROM px x JOIN mi m ON m.ticker = x.ticker AND m.s <= x.d AND (m.e IS NULL OR m.e > x.d)
  JOIN sec s ON s.ticker = x.ticker
  GROUP BY x.d, s.sector""").fetchall()
idx = {d: i for i, d in enumerate(D)}
tv = {k: [None] * len(D) for k in SECTORS.values()}
for d, sec, v in rows:
    if d in idx: tv[sec][idx[d]] = round(v / 1e6, 3)  # milioni di dollari
json.dump({'unit': 'milioni di USD', 'dates_from': D[0], 'dates_to': D[-1], 'tv': tv}, open(OUT, 'w'))
for k, a in tv.items():
    nn = [i for i, v in enumerate(a) if v is not None]
    print(k, 'giorni con dati', len(nn), 'da', D[nn[0]] if nn else '-', 'a', D[nn[-1]] if nn else '-')
