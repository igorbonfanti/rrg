# usage: cov.py YYYY-MM file_with_ycheck_output  -> counts symbols whose history covers YYYY-MM
import sys
ym=sys.argv[1]; lines=open(sys.argv[2]).read().split('\n')
toks=lines[1].split()
cov=[t for t in toks if not t.endswith('FAIL') and t.split(':')[1][:7]<=ym]
bad=[t for t in toks if t.endswith('FAIL') or t.split(':')[1][:7]>ym]
print(lines[0], f'| coprono {ym}: {len(cov)}/{len(toks)}'); print('mancanti/ricicl.:',' '.join(bad))
