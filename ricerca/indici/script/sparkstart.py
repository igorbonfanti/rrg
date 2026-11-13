# sparkstart.py symfile -> distribution of first-year using spark range=max interval=1mo (20 per request)
import sys,subprocess,json,datetime,time,collections
syms=open(sys.argv[1]).read().split()
first={}; 
for i in range(0,len(syms),20):
    b=syms[i:i+20]
    out=subprocess.run(["curl","-sS","-A","Mozilla/5.0",f"https://query1.finance.yahoo.com/v7/finance/spark?symbols={','.join(b)}&range=max&interval=1mo"],capture_output=True,text=True).stdout
    try:
        for x in json.loads(out)['spark']['result']:
            ts=x['response'][0].get('timestamp') or []
            if ts: first[x['symbol']]=datetime.datetime.fromtimestamp(ts[0],datetime.UTC).year
    except Exception as e: print('err',b[:2],out[:100])
    time.sleep(0.15)
n=len(syms); ys=list(first.values())
print(f"{sys.argv[1]}: n={n} risolti={len(ys)} ({100*len(ys)/n:.0f}%)", ' '.join(f"<= {y}: {sum(1 for v in ys if v<=y)} ({100*sum(1 for v in ys if v<=y)/n:.0f}%)" for y in (1990,1995,2000,2005,2010,2015,2020)))
print('mancanti:',' '.join(s for s in syms if s not in first)[:400])
