# usage: python3 -I ycheck.py SYM... ; prints ok/fail, first date (monthly), last date
import subprocess, json, sys, datetime, urllib.parse, time
ok=0; res=[]
for s in sys.argv[1:]:
    u=f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(s)}?period1=0&period2=1800000000&interval=1mo"
    out=subprocess.run(["curl","-sS","-A","Mozilla/5.0",u],capture_output=True,text=True).stdout
    try:
        r=json.loads(out)['chart']['result'][0]; ts=r.get('timestamp') or []
        f=lambda t: datetime.datetime.fromtimestamp(t, datetime.UTC).strftime('%Y-%m')
        last=f(r['meta']['regularMarketTime']) if r['meta'].get('regularMarketTime') else '?'
        res.append(f"{s}:{f(ts[0]) if ts else '-'}..{last}"); ok+=1 if ts else 0
    except Exception as e:
        res.append(f"{s}:FAIL")
    time.sleep(0.15)
print(f"resolved {ok}/{len(sys.argv)-1}")
print("  ".join(res))
