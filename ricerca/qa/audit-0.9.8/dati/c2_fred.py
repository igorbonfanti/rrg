# C2 ter. Chiusure di S&P 500 e Dow Jones dei file degli indici contro FRED (SP500, DJIA; fonte indipendente da Yahoo).
# uso: python3 -I c2_fred.py   (dopo c1_macro.py, o con i CSV di FRED in $QA98/fred)
import sys, os, csv, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import app_index, W
for k, fid in (('SPX', 'SP500'), ('DJI', 'DJIA')):
    p = W + 'fred/' + fid + '.csv'
    if not os.path.exists(p):
        subprocess.run(['curl', '-sS', '-m', '60', '-o', p, f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={fid}&cosd=2016-01-01'], check=True)
    fr = {r[0]: float(r[1]) for r in list(csv.reader(open(p)))[1:] if r[1] not in ('', '.')}
    A = app_index(k); m = [(d, c, fr[d]) for d, c in zip(A['dates'], A['close']) if d in fr and c]
    rel = sorted(((abs(c / f - 1), d, c, f) for d, c, f in m), reverse=True)
    miss = [d for d in fr if d >= A['dates'][0] and d not in set(A['dates'])]
    print(f'{k}: {len(m)} sedute in comune con FRED {fid}; oltre 0,01%: {sum(1 for r in rel if r[0] > 1e-4)}; massimo {rel[0][0]*100:.3f}% il {rel[0][1]} ({rel[0][2]} contro {rel[0][3]}); ultime: {m[-1]} | date FRED assenti nel file: {miss[:5]}')
