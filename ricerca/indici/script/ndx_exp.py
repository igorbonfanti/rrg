# Esperimento: breadth NDX (% sopra SMA200) con membri point-in-time vs membri attuali
import re, json, subprocess, datetime, time, os, bisect
D='/tmp/claude-0/-home-user-rrg/d11a05ff-fe30-5458-88d7-bab1e13b8eb0/scratchpad/indici/dl/'
def parse(y):
    t=open(D+f'n100_{y}.yaml').read()
    snap=re.findall(r'^\s+- (\S+)', t.split('tickers_on_Jan_1:')[1].split('changes:')[0], re.M)
    ch=[]
    if 'changes:' in t:
        body=t.split('changes:')[1]
        for m in re.finditer(r"['\"](\d{4}-\d\d-\d\d)['\"]:\n((?:\s+(?:#.*|difference:|union:|- \S+)\n?)*)", body):
            d=m.group(1); add=[];rem=[];cur=None
            for l in m.group(2).splitlines():
                l=l.strip()
                if l.startswith('difference'): cur=rem
                elif l.startswith('union'): cur=add
                elif l.startswith('- ') and cur is not None: cur.append(l[2:])
            ch.append((d,add,rem))
    return snap,ch
def members(date):
    y=int(date[:4]); snap,ch=parse(y); s=set(snap)
    for d,a,r in ch:
        if d<=date: s-=set(r); s|=set(a)
    return s
current=set(re.findall(r'\S+', open(D+'ndx_current.txt').read()))
dates=[f'{y}-{m:02d}-15' for y in range(2008,2027) for m in (1,4,7,10) if f'{y}-{m:02d}-15'<'2026-10-01']
allsyms=set(current)
for d in dates: allsyms|=members(d)
def load(s):
    f=D+'px/'+s+'.json'
    if not os.path.exists(f):
        out=subprocess.run(["curl","-sS","-A","Mozilla/5.0",f"https://query1.finance.yahoo.com/v8/finance/chart/{s}?period1=1104537600&period2=1800000000&interval=1d"],capture_output=True,text=True).stdout
        open(f,'w').write(out); time.sleep(0.1)
    try:
        r=json.load(open(f))['chart']['result'][0]; ts=r['timestamp']; c=r['indicators']['quote'][0]['close']
        pts=[(datetime.datetime.fromtimestamp(t,datetime.UTC).strftime('%Y-%m-%d'),v) for t,v in zip(ts,c) if v is not None]
        return pts
    except Exception: return None
P={s:load(s) for s in sorted(allsyms)}
def above(s,date):
    p=P.get(s)
    if not p: return None
    ds=[x[0] for x in p]; i=bisect.bisect_right(ds,date)-1
    if i<199: return None
    if date > '2026-10-01' and False: pass
    # titolo deve essere quotato vicino alla data
    if (datetime.date.fromisoformat(date)-datetime.date.fromisoformat(ds[i])).days>7: return None
    sma=sum(x[1] for x in p[i-199:i+1])/200
    return p[i][1]>sma
print('data       PIT_membri PIT_coperti PIT_%sopra | ATTUALI_coperti ATT_%sopra | scarto')
diffs=[]
for d in dates:
    m=members(d); a=[above(s,d) for s in m]; cov=[x for x in a if x is not None]
    b=[above(s,d) for s in current]; covb=[x for x in b if x is not None]
    pa=100*sum(cov)/len(cov); pb=100*sum(covb)/len(covb); diffs.append(pb-pa)
    print(f'{d} {len(m):4} {len(cov):4} ({100*len(cov)/len(m):3.0f}%) {pa:5.1f} | {len(covb):4} {pb:5.1f} | {pb-pa:+5.1f}')
import statistics
print('scarto medio', round(statistics.mean(diffs),1), 'mediana', round(statistics.median(diffs),1), 'min', round(min(diffs),1), 'max', round(max(diffs),1))
m=members('2026-07-15'); print('solo PIT:',sorted(m-current)); print('solo attuali:',sorted(current-m))
print('PIT oggi vs attuali:', sorted(members('2026-10-14')^current))
