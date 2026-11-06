# Contrasto WCAG dei colori principali (token di css/style.css) nei due temi, con e senza CVD.
# Testo: AA 4,5:1 (3:1 sopra 18,66 px grassetto). Elementi grafici (linee, punti, bordi): 3:1 (WCAG 1.4.11).
def h(c):
    c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
def L(c):
    f = lambda v: v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    r, g, b = [x/255 for x in h(c)]; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a, b):
    x, y = L(a), L(b); return (max(x, y)+.05)/(min(x, y)+.05)
D = dict(bg='#000000', panel='#0e0e0e', panel2='#1a1a1a', ink='#e8e8e8', ink2='#b4b4b4', ink3='#8a8a8a', amber='#ffa028', amber2='#ffd23f',
         up='#22c55e', down='#ef4444', blue='#3b7bff', bluetext='#3b7bff', bluelight='#7fa6ff', qlead='#35d0ba', qweak='#ffc400', qlag='#ff5c4d', qimp='#9b7bff',
         watch='#ffc400', trig='#22c55e', cvdup='#3b9eff', cvddown='#ff5c4d', chartaxis='#55555c', chartline='#5a5a5a', placeholder='#937b5a', rule='#2a2a2a', br50='#4a4a4a')
Lt = dict(bg='#ffffff', panel='#f2f2f0', panel2='#e6e6e3', ink='#111111', ink2='#3a3a3a', ink3='#626262', amber='#9a4a00', amber2='#7a4600',
          up='#127337', down='#c22727', blue='#3b7bff', bluetext='#1f5ad6', bluelight='#1f5ad6', qlead='#0a7164', qweak='#825e00', qlag='#bb341e', qimp='#6a4bd8',
          watch='#825e00', trig='#127337', cvdup='#0b65c1', cvddown='#bb341e', chartaxis='#8c8c8c', chartline='#b8b8b8', placeholder='#86694a', rule='#c4c4c0', br50='#a8a8a8')
TXT = ['ink', 'ink2', 'ink3', 'amber', 'amber2', 'up', 'down', 'bluetext', 'bluelight', 'qlead', 'qweak', 'qlag', 'qimp', 'watch', 'cvdup', 'cvddown', 'placeholder']
GR = ['blue', 'trig', 'chartaxis', 'chartline', 'rule', 'br50']
for name, T in (('SCURO', D), ('CHIARO', Lt)):
    print(f'== {name}')
    for k in TXT:
        a, b = cr(T[k], T['bg']), cr(T[k], T['panel'])
        flag = '' if min(a, b) >= 4.5 else ('  <-- sotto 4,5 (testo)' if min(a, b) >= 3 else '  <-- sotto 3')
        print(f'  testo {k:11s} {T[k]}  su bg {a:5.2f}  su panel {b:5.2f}{flag}')
    for k in GR:
        a, b = cr(T[k], T['bg']), cr(T[k], T['panel'])
        flag = '' if min(a, b) >= 3 else '  <-- sotto 3 (grafica)'
        print(f'  linea {k:11s} {T[k]}  su bg {a:5.2f}  su panel {b:5.2f}{flag}')
print('== badge con testo nero (#000) su fondo pieno')
for k, c in [('st-watch', '#ffc400'), ('st-setup/blue', '#3b7bff'), ('st-trig', '#22c55e'), ('st-fail scuro', '#ef4444'), ('amber-fill', '#ffa028'), ('q-lead-fill', '#35d0ba'), ('q-imp-fill', '#9b7bff'), ('cvd up-fill', '#3b9eff'), ('cvd down-fill', '#ff5c4d')]:
    print(f'  #000 su {k:14s} {c}  {cr("#000000", c):5.2f}')
print('== CVD: quadrante Improving (viola) contro su (blu) CVD')
print(f'  scuro q-imp #9b7bff vs cvd up #3b9eff: {cr("#9b7bff", "#3b9eff"):.2f}; chiaro #6a4bd8 vs #0b65c1: {cr("#6a4bd8", "#0b65c1"):.2f}')
