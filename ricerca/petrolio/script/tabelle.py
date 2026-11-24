#!/usr/bin/env python3
"""
tabelle.py — stampa in Markdown le tabelle di ricerca/petrolio/backtest.md, lette da ../risultati.json (scritto da
backtest.mjs). Nessun calcolo nuovo: solo formattazione, così i numeri della nota vengono tutti dallo script.
Uso: python3 -I ricerca/petrolio/script/tabelle.py
"""
import json
from pathlib import Path

D = json.loads((Path(__file__).resolve().parent.parent / "risultati.json").read_text())
R = {r["id"]: r for r in D["regole"]}


def f(x, suf=""):
    return "—" if x is None else f"{x:+.1f}{suf}" if isinstance(x, float) and suf == " p" else f"{x}{suf}"


def name(r):
    p, s = r["params"], r["series"].replace("_real", " reale")
    if r["kind"] == "R1":
        return f"R1 {s}, max {p['L']} mesi, +{p['X']}%"
    if r["kind"] == "R2":
        return f"R2 {s}, annua ≥ +{p['Y']}%"
    return f"R3 {s} > {p['S']} $, {p['K']} mesi"


print("### Base (tutti i mesi)\n")
print("| Periodo | Mesi con esito | Calo ≥10% entro 12 mesi | Calo ≥20% | Recessione entro 12 mesi | Rend. mediano 12 mesi | Calo max mediano 12 mesi |")
print("|---|---|---|---|---|---|---|")
for k, b in D["base"].items():
    print(f"| {k} | {b['n_esito12']} | {b['calo10_12m']} ({b['quota_calo10']}%) | {b['calo20_12m']} ({b['quota_calo20']}%) | {b['recessione12']}/{b['n_esito_rec']} ({b['quota_recessione']}%) | {b['rend_mediano']['12']}% | {b['dd_mediano']['12']}% |")


def table(sens):
    print("\n| Regola | Segnali | Calo ≥10% entro 12 m | vs base | 1950-1989 | 1990-oggi | Rend. med. 3/6/12 m | Calo max med. 6/12/18 m | Recess. entro 12 m | Cali ≥20% avvisati | Cali ≥10% avvisati | Copertura a caso | Recessioni avvisate | Mesi in allarme | Stato: calo ≥10% | a | b | c |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in D["regole"]:
        if r["sensibilita"] != sens:
            continue
        t, p1, p2, cr = r["periodi"]["tutto"], r["periodi"]["1950-1989"], r["periodi"]["1990-oggi"], r["criterio"]
        rm, dm = ({k: ('—' if v is None else v) for k, v in t[x].items()} for x in ('rend_mediano', 'dd_mediano'))
        q = lambda x: "—" if x["n_esito12"] == 0 else f"{x['calo10_12m']}/{x['n_esito12']} ({x['vantaggio_calo10']:+.1f})"
        st = r["stato"]["tutto"]
        print(f"| {name(r)} | {t['n']} | {t['calo10_12m']}/{t['n_esito12']} ({t['quota_calo10'] if t['quota_calo10'] is not None else '—'}%) | {f(t['vantaggio_calo10'])} | {q(p1)} | {q(p2)} | {rm['3']}/{rm['6']}/{rm['12']} | {dm['6']}/{dm['12']}/{dm['18']} | {t['recessione12']}/{t['n_esito_rec']} | {r['eventi']['calo20']['avvisati']}/{r['eventi']['calo20']['eventi']} | {r['eventi']['calo10']['avvisati']}/{r['eventi']['calo10']['eventi']} | {r['eventi']['copertura_casuale_pct']}% | {r['eventi']['recessioni']['avvisati']}/{r['eventi']['recessioni']['eventi']} | {r['mesi_in_allarme']['quota']}% | {st['calo10_12m']}/{st['n_esito12']} ({f(st['vantaggio_calo10'])}) | {'sì' if cr['a'] else 'no'} | {' / '.join(cr['b'])} | {'sì' if cr['c'] else 'no'} |")


print("\n### Sintesi (regole decise prima)\n")
print("| Regola | Segnali (con esito a 12 m) | Seguiti da calo ≥10% entro 12 m | Punti sulla base | 1950-1989 | 1990-oggi | Cali ≥20% avvisati (a caso) | Recessioni avvisate | Mesi in allarme | Criterio a / b / c |")
print("|---|---|---|---|---|---|---|---|---|---|")
for r in D["regole"]:
    if r["sensibilita"]:
        continue
    t, p1, p2, cr = r["periodi"]["tutto"], r["periodi"]["1950-1989"], r["periodi"]["1990-oggi"], r["criterio"]
    q = lambda x: "—" if x["n_esito12"] == 0 else f"{x['calo10_12m']}/{x['n_esito12']} ({x['vantaggio_calo10']:+.1f})"
    v = "—" if t["vantaggio_calo10"] is None else f"{t['vantaggio_calo10']:+.1f}"
    b = " / ".join("pochi" if x == "troppo pochi casi" else x for x in cr["b"])
    print(f"| {name(r)} | {t['n']} ({t['n_esito12']}) | {t['calo10_12m']}/{t['n_esito12']} | {v} | {q(p1)} | {q(p2)} | {r['eventi']['calo20']['avvisati']}/{r['eventi']['calo20']['eventi']} ({r['eventi']['copertura_casuale_pct']}%) | {r['eventi']['recessioni']['avvisati']}/{r['eventi']['recessioni']['eventi']} | {r['mesi_in_allarme']['quota']}% | {'sì' if cr['a'] else 'no'} / {b} / {'sì' if cr['c'] else 'no'} |")

print("\n### Regole decise prima (tutte le colonne)")
table(False)
print("\n### Sensibilità (soglie vicine, non decise prima)")
table(True)

print("\n### Segnali delle regole principali\n")
print("| Regola | Segnale (mese) | Prezzo | S&P già sotto il max 12 m | Calo max 12 m | Rend. 12 m | Recessione entro 12 m |")
print("|---|---|---|---|---|---|---|")
for k in ["R1_WTI_L36_X0", "R2_WTI_Y50", "R3_WTI_real_S100_K2", "R3_Brent_S100_K2"]:
    for s in R[k]["segnali_dettaglio"]:
        rec = "—" if s["rec12"] is None else ("sì" if s["rec12"] else "no")
        print(f"| {name(R[k])} | {s['mese']} | {s['prezzo']} | {s['sp_sotto_max12m_prima']}% | {f(s['dd12'], '%') if s['dd12'] is not None else '—'} | {f(s['ret12'], '%') if s['ret12'] is not None else '—'} | {rec} |")

print("\n### Episodi\n")
print("| Episodio | Petrolio (min → max nel periodo) | Primi segnali | Cali S&P ≥20% (massimo da 12 m prima) | Recessione | Esito del primo segnale |")
print("|---|---|---|---|---|---|")
for e in D["episodi"]:
    w = e["petrolio"]["WTI"]
    b = e["petrolio"]["Brent"]
    oil = f"WTI {w['min'][1]} ({w['min'][0]}) → {w['max'][1]} ({w['max'][0]})" + (f"; Brent max {b['max'][1]} ({b['max'][0]})" if b else "")
    sig = "; ".join(f"{k.replace('_', ' ')}: {', '.join(v)}" for k, v in e["segnali"].items() if v)
    ex = e["esito_primo_segnale"]
    exs = "—" if not ex or ex["dd12"] is None else f"{e['primo_segnale']}: calo max {ex['dd12']}%, rend. {ex['ret12']}%, recessione {'sì' if ex['rec12'] else 'no'}"
    print(f"| {e['nome']} | {oil} | {sig or '—'} | {'; '.join(e['cali20_con_massimo_da_12m_prima']) or 'nessuno'} | {', '.join(e['recessioni_iniziate']) or 'nessuna'} | {exs} |")

print("\n### Adesso\n")
a = D["adesso"]
for k in ["brent_giornaliero_FRED_da_ottobre", "wti_giornaliero_FRED_da_ottobre", "brent_Yahoo_BZF_da_ottobre", "wti_Yahoo_CLF_da_ottobre", "sp500_2026", "sp500_da_fine_ottobre"]:
    v = a[k]
    print(f"- {k}: massimo {v['massimo'][1]} il {v['massimo'][0]}; ultimo {v['ultimo'][1]} il {v['ultimo'][0]} ({v['calo_pct']}%); minimo dopo il massimo {v['minimo_dopo'][1]} il {v['minimo_dopo'][0]} ({v['calo_max_pct']}%)")
print("- mensile (nominale, reale in $ di", a["cpi_riferimento"][0] + "):", json.dumps(a["petrolio_mensile"]))
print("- soglia 100 $ di oggi espressa in $ dell'epoca:", a["soglia_100_reale_in_nominale"], "; massimo reale storico:", a["massimo_reale_storico"])

print("\n### Controlli dei dati\n")
for k, v in D["controlli_dati"].items():
    print(f"- {k}: {json.dumps(v, ensure_ascii=False)}")
