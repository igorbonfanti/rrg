# usage: tables.py file.html  -> list tables with shape and columns
import sys, pandas as pd, io, warnings; warnings.filterwarnings('ignore')
ts=pd.read_html(io.StringIO(open(sys.argv[1],encoding='utf-8').read()))
for i,t in enumerate(ts):
    if len(t)>=10: print(i, t.shape, [str(c)[:30] for c in t.columns][:8])
