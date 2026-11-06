import sys, pandas as pd, io, warnings; warnings.filterwarnings('ignore')
f,idx,col=sys.argv[1],int(sys.argv[2]),sys.argv[3]
t=pd.read_html(io.StringIO(open(f,encoding='utf-8').read()))[idx]
c=[c for c in t.columns if col in str(c)][0]
print(' '.join(str(x).replace(' ','_') for x in t[c].tolist()))
