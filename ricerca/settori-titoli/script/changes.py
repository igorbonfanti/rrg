import re, json, sys, datetime as dt
t = open(sys.argv[1]).read()
tab = t[t.find('id="changes"'):]; tab = tab[:tab.find('\n|}')]
rows = tab.split('\n|-')[2:]
out = []
for r in rows:
    cells = [c.strip() for c in re.split(r'\n\|\|?|\|\|', '\n' + r.strip()) if True][1:]
    cells = [re.sub(r'<ref[^>]*/>|<ref.*?</ref>', '', c, flags=re.S).strip() for c in cells]
    try: d = dt.datetime.strptime(cells[0], '%B %d, %Y').date().isoformat()
    except Exception: continue
    if d < '2025-06-01': break
    clean = lambda s: re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', s)
    out.append({'date': d, 'add': cells[1].replace('.', '-'), 'addName': clean(cells[2]), 'rem': cells[3].replace('.', '-'), 'remName': clean(cells[4]), 'why': clean(cells[5])[:80]})
json.dump(out, open(sys.argv[2], 'w'), indent=0)
print(len(out), 'changes')
for o in out: print(o['date'], o['add'] or '-', '|', o['rem'] or '-', '|', o['why'][:50])
