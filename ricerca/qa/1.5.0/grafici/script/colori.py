"""Contrasto e distinguibilità (anche con daltonismo simulato, matrici di Machado 2009, gravità 1) dei colori della vista 8 VIX.
Colori presi da css/style.css (regole .vx*) e misurati nel browser (stili-*.json)."""
import math
def hx(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def lin(c): c=c/255; return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(rgb): r,g,b=(lin(x) for x in rgb); return 0.2126*r+0.7152*g+0.0722*b
def cr(a,b): la,lb=L(a),L(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
def mix(c,bg,a): return tuple(round(a*x+(1-a)*y) for x,y in zip(c,bg))
M={'deutan':[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
   'protan':[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
   'tritan':[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]}
def sim(rgb,k):
    v=[lin(x) for x in rgb]; o=[sum(M[k][i][j]*v[j] for j in range(3)) for i in range(3)]
    def g(x): x=min(1,max(0,x)); return round(255*(12.92*x if x<=0.0031308 else 1.055*x**(1/2.4)-0.055))
    return tuple(g(x) for x in o)
def lab(rgb):
    r,g,b=(lin(x) for x in rgb)
    X=(0.4124*r+0.3576*g+0.1805*b)/0.95047; Y=0.2126*r+0.7152*g+0.0722*b; Z=(0.0193*r+0.1192*g+0.9505*b)/1.08883
    f=lambda t: t**(1/3) if t>0.008856 else 7.787*t+16/116
    return (116*f(Y)-16, 500*(f(X)-f(Y)), 200*(f(Y)-f(Z)))
def dE(a,b): return math.dist(lab(a),lab(b))
T={'scuro':{'bg':'#000000','c':['#f5a524','#5b9cff','#22c55e','#e05d5d','#b38cff','#2dc8c8'],'down':'#ef4444','amber':'#ffa028','ink2':'#b4b4b4','blue':'#7fa6ff','ink3':'#8a8a8a'},
   'chiaro':{'bg':'#ffffff','c':['#b86e00','#1f5fbf','#127337','#b42318','#6a4bd8','#0b7a7a'],'down':'#c22727','amber':'#9a4a00','ink2':'#3a3a3a','blue':'#1f5ad6','ink3':'#626262'}}
for t,d in T.items():
    bg=hx(d['bg']); print(f'== {t} (sfondo {d["bg"]})')
    cs=[mix(hx(c),bg,.75) for c in d['c']]
    print(' punti (opacità .75) contrasto con lo sfondo:', ', '.join(f'c{i} {cr(c,bg):.2f}' for i,c in enumerate(cs)))
    for k in ['normale','deutan','protan','tritan']:
        f=(lambda x:x) if k=='normale' else (lambda x,k=k: sim(x,k))
        pairs=[(i,(i+1)%6) for i in range(6)]
        print(f' {k}: ΔE episodi consecutivi', ', '.join(f'c{i}/c{j} {dE(f(cs[i]),f(cs[j])):.0f}' for i,j in pairs), '| minimo tra tutte le coppie', f'{min(dE(f(cs[i]),f(cs[j])) for i in range(6) for j in range(i+1,6)):.0f}')
    band=mix(hx(d['down']),bg,.12); leg=mix(hx(d['down']),bg,.45)
    print(f' banda premio ≥80° (fill-opacity .12) {band} contrasto con lo sfondo {cr(band,bg):.2f}; quadratino della legenda (opacity .45) {leg} contrasto {cr(leg,bg):.2f}; ΔE banda/legenda {dE(band,leg):.0f}')
    prem=hx(d['ink2']); print(f' linea del premio su banda: contrasto {cr(prem,band):.2f}; su sfondo {cr(prem,bg):.2f}')
    thr=mix(hx(d['amber']),bg,.7); print(f' soglie 40/50 (ambra, opacità .7) contrasto {cr(thr,bg):.2f}')
    print(f' VIX {cr(hx(d["amber"]),bg):.2f}, realizzata {cr(hx(d["blue"]),bg):.2f}; ΔE VIX/realizzata normale {dE(hx(d["amber"]),hx(d["blue"])):.0f}, deutan {dE(sim(hx(d["amber"]),"deutan"),sim(hx(d["blue"]),"deutan")):.0f}, tritan {dE(sim(hx(d["amber"]),"tritan"),sim(hx(d["blue"]),"tritan")):.0f}')
    print(f' etichette degli assi (ink-3) contrasto {cr(hx(d["ink3"]),bg):.2f}')
