import csv,sys
L=open(sys.argv[1],encoding='utf-8-sig').read().splitlines()
h=[i for i,l in enumerate(L) if l.startswith('Emittententicker')][0]
SUF={'London Stock Exchange':'.L','Nyse Euronext - Euronext Paris':'.PA','Xetra':'.DE','SIX Swiss Exchange':'.SW','Nasdaq Omx Nordic':'.ST','Borsa Italiana':'.MI',
'Euronext Amsterdam':'.AS','Bolsa De Madrid':'.MC','Omx Nordic Exchange Copenhagen A/S':'.CO','Oslo Bors Asa':'.OL','Nasdaq Omx Helsinki Ltd.':'.HE',
'Warsaw Stock Exchange/Equities/Main Market':'.WA','Nyse Euronext - Euronext Brussels':'.BR','Athens Exchange S.A. Cash Market':'.AT','Wiener Boerse Ag':'.VI',
'Irish Stock Exchange - All Market':'.IR','Nyse Euronext - Euronext Lisbon':'.LS','Deutsche Börse AG':'.DE'}
for r in csv.DictReader(L[h:]):
    if r.get('Anlageklasse')!='Aktien': continue
    t=r['Emittententicker'].strip().rstrip('.').replace(' ','-').replace('.','-')
    print(f"{SUF.get(r['Börse'],'?'+r['Börse'])}|{t}{SUF.get(r['Börse'],'')}")
