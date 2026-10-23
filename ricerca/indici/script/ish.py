# ish.py file.csv -> counts by exchange/location for Equity rows
import csv,sys,collections
L=open(sys.argv[1],encoding='utf-8-sig').read().splitlines()
h=[i for i,l in enumerate(L) if l.startswith('Ticker,')][0]
rows=[r for r in csv.DictReader(L[h:]) if r.get('Asset Class')=='Equity']
print(sys.argv[1], 'equity rows', len(rows), 'asof', L[1])
c=collections.Counter((r['Location'],r['Exchange']) for r in rows)
for k,v in c.most_common(40): print('  ',v,k, [r['Ticker'] for r in rows if (r['Location'],r['Exchange'])==k][:4])
