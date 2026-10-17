import subprocess, json, sys, datetime, urllib.parse, time
for s in sys.argv[1:]:
    u=f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(s)}?period1=0&period2=1800000000&interval=1mo"
    out=subprocess.run(["curl","-sS","-A","Mozilla/5.0",u],capture_output=True,text=True).stdout
    try:
        r=json.loads(out)['chart']['result'][0]; ts=r.get('timestamp') or []; m=r['meta']
        f=lambda t: datetime.datetime.fromtimestamp(t, datetime.UTC).strftime('%Y-%m')
        print(f"{s}\t{f(ts[0]) if ts else '-'}\t{f(m['regularMarketTime'])}\t{m.get('currency')}\t{m.get('exchangeName')}\t{m.get('longName') or m.get('shortName')}")
    except Exception: print(f"{s}\tFAIL")
    time.sleep(0.15)
