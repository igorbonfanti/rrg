"""tabelle.py — solo formato: tabelle in markdown da ricerca/cicli/pring/risultati.json e prove.json (ricerca/cicli/pring).

Uso: python3 -I ricerca/cicli/pring/script/tabelle.py > ricerca/cicli/pring/tabelle.md
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(BASE, 'risultati.json')))
P = json.load(open(os.path.join(BASE, 'prove.json')))
LIV = ['bassa', 'media', 'alta', 'bry_boschan']
NOME_LIV = {'bassa': 'bassa (15% · 0,75 pt)', 'media': 'media (20% · 1 pt)', 'alta': 'alta (30% · 1,5 pt)', 'bry_boschan': 'Bry-Boschan'}
CP = {'obbligazioni>azioni': 'obbl. → azioni', 'azioni>mp': 'azioni → mat. prime', 'obbligazioni>mp': 'obbl. → mat. prime'}


def f(x, d=3):
    if x is None:
        return '—'
    if isinstance(x, float):
        return f'{x:.{d}f}'.replace('.', ',')
    return str(x)


def pct(x):
    return '—' if x is None else f'{100 * x:.0f}%'


print('# Tabelle · Pring sulla storia lunga\n')
print(f"Generato da `script/tabelle.py` su `risultati.json` ({R['generato'][:10]}). Periodo dei punti: "
      f"{R['periodo']['inizio_punti']} – {R['periodo']['fine']} ({R['periodo']['mesi']} mesi); {R['ripetizioni']} ripetizioni del modello nullo.\n")

print('## T1. Punti di svolta dal 04/1954 (massimi + minimi)\n')
print('| Serie | bassa | media | alta | Bry-Boschan |\n| --- | --- | --- | --- | --- |')
for k in ('obbligazioni', 'azioni', 'mp', 'ppiaco', 'metalli', 'petrolio', 'imf', 'wb_nonen', 'wb_metalli', 'dollaro'):
    row = [sum(1 for p in R['punti'][k][lv] if p['mese'] >= '1954-04') for lv in LIV]
    print(f"| {k} | " + ' | '.join(map(str, row)) + ' |')
print()

for g in ('M2', 'M1'):
    print(f'## T2-{g}. Ordine nei cicli comuni ({g}), obbligazioni (GS10) · S&P 500 · materie prime (WPUID62)\n')
    print('| Soglia | Tipo | Cicli | Completi | In ordine di Pring | Attesi per caso (media) | p ordine | W | p concordanza (Friedman) | p permutazione |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for lv in LIV:
        for t in ('massimi', 'minimi'):
            d = R['principale'][lv][g][t]
            print(f"| {NOME_LIV[lv]} | {t} | {d['cicli']} | {d['completi']} | {d['perfetti']} | {f(d['null_media_perfetti'], 2)} | {f(d['p_perfetti'])} | "
                  f"{f(d['W'], 2)} | {f(d['p_W'])} | {f(d.get('p_perfetti_permutazione'))} |")
    print()

print('## T3. Coppie guida-seguace (M2, criterio 2)\n')
print('| Soglia | Tipo | Coppia | Casi | B dopo A | Insieme | B prima | Quota dopo | Ritardo mediano (mesi) | p | q (BH, 18 test) | 1954-85 dopo/casi | 1986-oggi dopo/casi | Regge |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for x in R['criterio2']:
    pr = x['n'] - x['dopo'] - x['insieme']
    print(f"| {NOME_LIV[x['soglia']]} | {x['tipo']} | {CP[x['coppia']]} | {x['n']} | {x['dopo']} | {x['insieme']} | {pr} | {pct(x['quota'])} | "
          f"{f(x['ritardo_mediano'], 1)} | {f(x['p'])} | {f(x['q_BH'])} | {x['meta1']['dopo']}/{x['meta1']['n']} | {x['meta2']['dopo']}/{x['meta2']['n']} | {'sì' if x['regge'] else 'no'} |")
print('\nCon Bry-Boschan (non nel conteggio dei 18 test):\n')
print('| Tipo | Coppia | Casi | B dopo A | B prima | p | 1954-85 | 1986-oggi |\n| --- | --- | --- | --- | --- | --- | --- | --- |')
for t in ('massimi', 'minimi'):
    for cp, v in R['principale']['bry_boschan']['M2'][t]['coppie'].items():
        h1 = R['meta']['fino_1985']['bry_boschan'][t]['coppie'][cp]
        h2 = R['meta']['dal_1986']['bry_boschan'][t]['coppie'][cp]
        print(f"| {t} | {CP[cp]} | {v['n']} | {v['dopo']} | {v['prima']} | {f(v['p'])} | {h1['dopo']}/{h1['n']} | {h2['dopo']}/{h2['n']} |")
print()

print('## T4. Stabilità: cicli completi e in ordine di Pring per periodo (M2)\n')
print('| Periodo | Soglia | Massimi: completi · in ordine · p | Minimi: completi · in ordine · p |\n| --- | --- | --- | --- |')
for per, nome in (('fino_1985', '1954-1985'), ('dal_1986', '1986-2026'), ('dal_2000', '2000-2026')):
    for lv in LIV:
        a = R['meta'][per][lv]['massimi']
        b = R['meta'][per][lv]['minimi']
        print(f"| {nome} | {NOME_LIV[lv]} | {a['completi']} · {a['perfetti']} · {f(a['p_perfetti'])} | {b['completi']} · {b['perfetti']} · {f(b['p_perfetti'])} |")
c = R['correlazione_azioni_obbligazioni']
print(f"\nCorrelazione dei rendimenti mensili azioni-obbligazioni: fino al 1999 {f(c['fino_1999'], 2)}, dal 2000 {f(c['dal_2000'], 2)}; "
      f"finestra di 60 mesi negativa per la prima volta dopo il 1995 a {c['mobile_60m_primo_negativo_dopo_1995']}, negativa nel "
      f"{pct(c['mobile_60m_quota_negativa_2000_2020'])} dei mesi 2000-2020, ultimo valore {f(c['mobile_60m_ultimo'], 2)} ({c['mobile_60m_ultimo_mese']}).\n")

print('## T5. Fuori campione (criterio 3): ordine stimato 1954-1985, verificato 1986-oggi\n')
print('| Soglia | Tipo | Cicli completi 1954-85 | Ordine stimato | Cicli completi 1986-oggi | Netto concordi − discordi | p |\n| --- | --- | --- | --- | --- | --- | --- |')
for lv in LIV:
    for t in ('massimi', 'minimi'):
        d = R['criterio3'][lv][t]
        if not d.get('ordine_stimato_1954_1985'):
            print(f"| {NOME_LIV[lv]} | {t} | 0 | non stimabile | — | — | — |")
        else:
            print(f"| {NOME_LIV[lv]} | {t} | {d['cicli_completi_1954_1985']} | {' → '.join(d['ordine_stimato_1954_1985'])} | {d['cicli_completi_1986_oggi']} | {f(d['netto_1986_oggi'], 0)} | {f(d['p'])} |")
print()

print('## T6. Utilità (criterio 4): dal mese di conferma della svolta del guida, svolta dello stesso tipo del seguace entro 18 mesi\n')
print('| Soglia | Tipo | Coppia | Svolte del guida | Seguite | Quota | Base | p | q (BH) | Anticipo mediano (mesi) | 1954-85 quota/base | 1986-oggi quota/base | Regge |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for x in R['criterio4']:
    print(f"| {NOME_LIV[x['soglia']]} | {x['tipo']} | {CP[x['coppia']]} | {x['n']} | {x['colti']} | {pct(x['quota'])} | {pct(x['base'])} | {f(x['p_binomiale'])} | {f(x['q_BH'])} | "
          f"{f(x['anticipo_mediano'], 1)} | {pct(x['meta1']['quota'])}/{pct(x['meta1']['base'])} | {pct(x['meta2']['quota'])}/{pct(x['meta2']['base'])} | {'sì' if x['regge'] else 'no'} |")
print()

print('## T7. Dollaro contro materie prime (1974-oggi)\n')
d = R['dollaro']
print('| Soglie (mat. prime · dollaro) | Svolte mat. prime | Svolte dollaro | Con svolta opposta del dollaro entro 12 mesi | Per caso | p | Con svolta nello stesso verso |\n| --- | --- | --- | --- | --- | --- | --- |')
for lv, nome in (('bassa', '15% · 10%'), ('media', '20% · 15%'), ('alta', '30% · 20%')):
    x = d['soglie'][lv]
    print(f"| {nome} | {x['punti_mp']} | {x['punti_dollaro']} | {pct(x['quota_con_dollaro_opposto_12m'])} | {pct(x['null_media'])} | {f(x['p'])} | {pct(x['quota_con_dollaro_stesso_verso_12m'])} |")
print(f"\nCorrelazione delle variazioni a 12 mesi (log): {f(d['correlazione_var_12m'], 2)} (p {f(d['p_correlazione_negativa'], 4)}, spostamento circolare); "
      f"fino al 1999 {f(d['correlazione_var_12m_fino_1999'], 2)}, dal 2000 {f(d['correlazione_var_12m_dal_2000'], 2)}.\n")

print('## T8. Altre serie di materie prime (M2, ordine di Pring)\n')
print('| Serie | Periodo | Soglia | Massimi: completi · in ordine · p | Minimi: completi · in ordine · p |\n| --- | --- | --- | --- | --- |')
for alt, v in R['altre_mp'].items():
    for lv in LIV:
        a, b = v[lv]['massimi'], v[lv]['minimi']
        print(f"| {alt} | {v['periodo'][0]} – {v['periodo'][1]} | {NOME_LIV[lv]} | {a['completi']} · {a['perfetti']} · {f(a['p_perfetti'])} | {b['completi']} · {b['perfetti']} · {f(b['p_perfetti'])} |")
print(f"\nI p più bassi tra i {R['robustezza_BH_numero_test']} test di queste serie, con la correzione BH:\n")
print('| Serie | Definizione | Tipo | Statistica | Completi | In ordine | p | q (BH) |\n| --- | --- | --- | --- | --- | --- | --- | --- |')
for x in R['robustezza_BH'][:6]:
    print(f"| {x['serie']} | {x['definizione']} | {x['tipo']} | {x['statistica']} | {x['completi']} | {x['perfetti']} | {f(x['p'])} | {f(x['q_BH'])} |")
print('\nBry-Boschan, minimi, per metà del campione:\n')
print('| Serie | 1954-85: completi · in ordine · p | 1986-oggi: completi · in ordine · p |\n| --- | --- | --- |')
for alt, v in R['altre_mp_meta'].items():
    a, b = v['fino_1985']['minimi'], v['dal_1986']['minimi']
    print(f"| {alt} | {a['completi']} · {a['perfetti']} · {f(a['p_perfetti'])} | {b['completi']} · {b['perfetti']} · {f(b['p_perfetti'])} |")
print()

print('## T9. Sensibilità alla finestra dei cicli comuni (M2; ordine di Pring)\n')
print('| Finestra | Soglia | Massimi: completi · in ordine · p | Minimi: completi · in ordine · p |\n| --- | --- | --- | --- |')
for w in ('12', '24', '36', '48'):
    for lv in ('bassa', 'media', 'bry_boschan'):
        a, b = R['sensibilita_finestra'][w][lv]['massimi'], R['sensibilita_finestra'][w][lv]['minimi']
        print(f"| {w} mesi | {NOME_LIV[lv]} | {a['completi']} · {a['perfetti']} · {f(a['p_perfetti'])} | {b['completi']} · {b['perfetti']} · {f(b['p_perfetti'])} |")
print()

print('## T10. Ciclo economico NBER: mesi tra la data NBER e la svolta più vicina (±24 mesi) di ogni serie (M1)\n')
print('| Definizione | Tipo | NBER | Obbligazioni | Azioni | Mat. prime |\n| --- | --- | --- | --- | --- | --- |')
for r in R['tabella_nber']:
    print(f"| {r['definizione']} | {r['tipo']} | {r['nber']} | {f(r['obbligazioni'])} | {f(r['azioni'])} | {f(r['mp'])} |")
print()

print('## T11. Stadi di Pring (direzioni di obbligazioni, azioni, materie prime)\n')
print('| Metodo | Mesi | I | II | III | IV | V | VI | Fuori schema | Per caso | p | Passaggi in avanti tra i cambi | Per caso | p |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for m, nome in (('mm12', 'media a 12 mesi'), ('soglia_bassa', 'soglia bassa'), ('soglia_media', 'soglia media')):
    s = R['stadi'][m]
    fr = s['frequenza']
    print(f"| {nome} | {s['mesi']} | " + ' | '.join(fr[str(k)] for k in range(1, 7)) if False else
          f"| {nome} | {s['mesi']} | " + ' | '.join(str(fr[str(k)]) for k in range(1, 7)) +
          f" | {pct(s['quota_fuori_schema'])} | {pct(s['null_fuori_schema_media'])} | {f(s['p_fuori_schema_minore'])} | {pct(s['quota_avanti_tra_cambi_in_schema'])} | {pct(s['null_avanti_media'])} | {f(s['p_avanti'])} |")
print()
o = R['oggi']
print('## T12. Oggi\n')
print('| Serie | Ultimo mese | Valore | Media 12 mesi | Direzione (media) | Ultima svolta a soglia bassa/media | Direzione (soglia media) | Estremo in corso |')
print('| --- | --- | --- | --- | --- | --- | --- | --- |')
for k in ('obbligazioni', 'azioni', 'mp', 'dollaro'):
    x = o[k]
    print(f"| {k} | {x['ultimo_mese']} | {f(x['mm12']['valore'], 2)} | {f(x['mm12']['media_12m'], 2)} | {x['mm12']['direzione']} | {x['media']['tipo_ultimo']} {x['media']['ultimo_punto']} | {x['media']['direzione']} | {x['media']['estremo_in_corso']} ({f(x['media']['valore_estremo'], 2)}) |")
print()

print('## T13. Prove sintetiche (prove.json)\n')
print(f"{P['serie_ritardo_noto']} serie con ritardo noto e {P['serie_indipendenti']} serie indipendenti, {P['ripetizioni_null']} ripetizioni del modello nullo ciascuna.\n")
print('| Caso | Soglia | Tipo | Test con p < 0,05: concordanza · ordine di Pring · coppie (o→a, a→m, o→m) | Ritardi mediani trovati (o→a, a→m, o→m) |\n| --- | --- | --- | --- | --- |')
for c in ('ritardo_noto', 'indipendenti'):
    for lv in LIV:
        for t in ('massimi', 'minimi'):
            x = P[c][lv][t]
            cp = x['quota_p_coppie_sotto_005']
            r = x['ritardo_mediano']
            print(f"| {c} | {NOME_LIV[lv]} | {t} | {pct(x['quota_p_W_sotto_005'])} · {pct(x['quota_p_perfetti_sotto_005'])} · "
                  f"{pct(cp['obbligazioni>azioni'])}, {pct(cp['azioni>mp'])}, {pct(cp['obbligazioni>mp'])} | {f(r['obbligazioni>azioni'], 1)}, {f(r['azioni>mp'], 1)}, {f(r['obbligazioni>mp'], 1)} |")
b = P['bry_boschan_indpro_nber']
print(f"\nBry-Boschan sulla produzione industriale (INDPRO) dal 1947: {b['picchi_entro_6_mesi']} picchi NBER su {b['picchi_nber']} e "
      f"{b['minimi_entro_6_mesi']} minimi su {b['minimi_nber']} ritrovati entro 6 mesi (entro 3 mesi: {b['picchi_entro_3_mesi']} e {b['minimi_entro_3_mesi']}); "
      f"{b['punti_bb_lontani_da_nber_oltre_6_mesi']} punti su {b['punti_bb']} lontani più di 6 mesi da una data NBER.")
