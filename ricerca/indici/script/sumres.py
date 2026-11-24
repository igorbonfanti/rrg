# sumres.py mapfile resfile : mapfile lines "group|sym", resfile lines "sym:first..last" or "sym:FAIL"
import sys,collections
grp={l.split('|')[1]:l.split('|')[0] for l in open(sys.argv[1]).read().split()}
res={}
for l in open(sys.argv[2]).read().split():
    s,v=l.split(':',1); res[s]=v
G=collections.defaultdict(lambda:[0,0,0,0,[]])
for s,g in grp.items():
    v=res.get(s,'FAIL'); G[g][0]+=1
    if v!='FAIL' and v[0]!='-':
        G[g][1]+=1; y=int(v[:4]); G[g][2]+= y<=2005; G[g][3]+= y<=2010
    else: G[g][4].append(s)
tot=[0,0,0,0]
for g,(n,ok,a,b,f) in sorted(G.items(), key=lambda x:-x[1][0]):
    print(f"{g:14} n={n:4} ok={ok:4} ({100*ok/n:.0f}%) start<=2005:{a:4} <=2010:{b:4}  fail es.: {' '.join(f[:5])}")
    tot=[tot[0]+n,tot[1]+ok,tot[2]+a,tot[3]+b]
print('TOT',tot)
