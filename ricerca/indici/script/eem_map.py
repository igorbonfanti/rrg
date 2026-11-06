import csv,sys
L=open(sys.argv[1],encoding='utf-8-sig').read().splitlines()
h=[i for i,l in enumerate(L) if l.startswith('Ticker,')][0]
rows=[r for r in csv.DictReader(L[h:]) if r.get('Asset Class')=='Equity']
SUF={'Shanghai Stock Exchange':'.SS','Shenzhen Stock Exchange':'.SZ','National Stock Exchange Of India':'.NS','Hong Kong Exchanges And Clearing Ltd':'.HK',
'Korea Exchange (Stock Market)':'.KS','Korea Exchange (Kosdaq)':'.KQ','Taiwan Stock Exchange':'.TW','Gretai Securities Market':'.TWO','XBSP':'.SA',
'Saudi Stock Exchange':'.SR','Johannesburg Stock Exchange':'.JO','Bolsa Mexicana De Valores':'.MX','Bursa Malaysia':'.KL','Stock Exchange Of Thailand':'.BK',
'Warsaw Stock Exchange/Equities/Main Market':'.WA','Istanbul Stock Exchange':'.IS','Qatar Exchange':'.QA','Athens Exchange S.A. Cash Market':'.AT',
'Santiago Stock Exchange':'.SN','Abu Dhabi Securities Exchange':'.AD','Dubai Financial Market':'.AE','Indonesia Stock Exchange':'.JK',
'Philippine Stock Exchange Inc.':'.PS','Kuwait Stock Exchange':'.KW','NASDAQ':'','NYSE':'','Budapest Stock Exchange':'.BD',
'Bolsa De Valores De Colombia':'.CL','Prague Stock Exchange':'.PR','Egyptian Exchange':'.CA','Bse Ltd':'.BO','Standard-Classica-Forts':'.ME'}
out=[]
for r in rows:
    t=r['Ticker'].strip(); ex=r['Exchange']
    if ex not in SUF or t in ('-',''): continue
    s=SUF[ex]
    if s=='.HK': t=t.zfill(4)
    if s=='.BK' and t.endswith('.R'): t=t[:-2]
    if s=='.IS' and t.endswith('.E'): t=t[:-2]
    t=t.replace(' ','-').replace('.','-') if s in ('', '.SN','.MX') else t.replace(' ','-')
    out.append(f"{r['Location'][:10].replace(' ','_')}|{t}{s}")
print('\n'.join(out))
