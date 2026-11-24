"""dati.py — lettura dei file in ricerca/cicli/pring/cache/ e costruzione delle serie mensili (ricerca, non tocca l'app).

Tutte le serie sono MENSILI (la storia lunga c'è solo così). Regole, decise prima dei risultati:
  - S&P 500 (Yahoo ^GSPC, solo prezzo, senza dividendi): media mensile delle chiusure giornaliere, come le serie FRED
    (GS10 e WTISPLC sono medie mensili; i PPI sono rilevazioni mensili). Si usano solo i mesi chiusi.
  - Obbligazioni: rendimento del decennale USA a scadenza costante, GS10 (media mensile, Fed H.15), dal 04/1953.
    «Prezzo» = rendimento con il segno cambiato: un massimo del prezzo è un minimo del rendimento.
  - Materie prime, serie principale: PPI «Unprocessed goods for intermediate demand» (WPUID62, BLS, dal 1947): è la
    vecchia «Crude materials for further processing» (WPUSOP1000, chiusa nel 2015; si controlla che coincidano).
    Non è un indice di mercato: sono prezzi alla produzione rilevati dal BLS (con alimentari ed energia), rivisti per
    4 mesi dopo la prima uscita. Seconde serie: PPIACO (tutte le merci, dal 1913, molto più liscia), WPU102 (metalli
    non ferrosi, dal 1926), WTISPLC (petrolio WTI; prezzi amministrati fino al 1973, quindi usato dal 1974), e, solo dal
    1992, PCOPPUSDM (rame, IMF) e PALLFNFINDEXM (indice IMF di tutte le materie prime). Prezzi di mercato dal 1960:
    World Bank Pink Sheet (CC BY 4.0), indici «Non-energy» e «Metals & Minerals» (aggiunti come controllo dopo aver
    visto che WPUID62 non ha oscillazioni del 15% tra il 1956 e il 1983).
  - Dollaro: TWEXMMTH (valute principali, Fed, 01/1973-12/2019), proseguito dal 01/2020 con le variazioni mensili della
    media mensile di DTWEXAFEGS (economie avanzate, Fed, il successore). Prima del 1973 i cambi erano fissi.
  - Recessioni NBER: USRECM (1 dal mese del picco al mese del minimo compreso).
"""
import csv
import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
CACHE = os.path.join(BASE, 'cache')


def fred(id_):
    """Serie FRED come pd.Series (indice = primo giorno del periodo), valori mancanti ('.') scartati."""
    rows = []
    with open(os.path.join(CACHE, f'fred_{id_}.csv')) as f:
        r = csv.reader(f)
        next(r)
        for d, v in r:
            if v in ('', '.'):
                continue
            rows.append((pd.Timestamp(d), float(v)))
    s = pd.Series([v for _, v in rows], index=pd.DatetimeIndex([d for d, _ in rows]), name=id_)
    return s


def yahoo(sym):
    with open(os.path.join(CACHE, f"yahoo_{re.sub('[^A-Za-z0-9]', '_', sym)}.json")) as f:
        j = json.load(f)
    return pd.Series(j['close'], index=pd.DatetimeIndex(pd.to_datetime(j['dates'])), name=sym)


def mensile(daily, ultimo_mese_chiuso):
    """Media mensile delle osservazioni giornaliere; solo mesi fino a ultimo_mese_chiuso compreso."""
    m = daily.groupby(daily.index.to_period('M')).mean()
    m.index = m.index.to_timestamp()
    return m[m.index <= ultimo_mese_chiuso]


def worldbank():
    """Foglio «Monthly Indices» e «Monthly Prices» del Pink Sheet (CC BY 4.0), lettura con la sola libreria standard."""
    p = os.path.join(CACHE, 'wb_CMO-Historical-Data-Monthly.xlsx')
    if not os.path.exists(p):
        return None
    z = zipfile.ZipFile(p)
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sst = [''.join(t.itertext()) for t in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid = {r.get('Id'): r.get('Target') for r in rels}
    out = {}
    for sh in wb.find('m:sheets', ns):
        name = sh.get('name')
        if name not in ('Monthly Prices', 'Monthly Indices'):
            continue
        target = rid[sh.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')]
        root = ET.fromstring(z.read('xl/' + target.lstrip('/').replace('xl/', '')))
        grid = []
        for row in root.iter('{%s}row' % ns['m']):
            cells = {}
            for c in row.findall('m:c', ns):
                ref = c.get('r')
                col = re.match('[A-Z]+', ref).group(0)
                v = c.find('m:v', ns)
                if v is None:
                    isel = c.find('m:is', ns)
                    val = ''.join(isel.itertext()) if isel is not None else None
                elif c.get('t') == 's':
                    val = sst[int(v.text)]
                else:
                    val = v.text
                cells[col] = val
            grid.append(cells)
        out[name] = grid
    return out


def wb_serie(grid, header_match):
    """Colonna del foglio World Bank il cui titolo contiene header_match; righe con data tipo 1960M01."""
    col = None
    for row in grid[:12]:
        for k, v in row.items():
            if v and header_match.lower() in str(v).lower():
                col = k
        if col:
            break
    if col is None:
        return None
    idx, vals = [], []
    for row in grid:
        a = row.get('A')
        if a and re.fullmatch(r'\d{4}M\d{2}', str(a)):
            v = row.get(col)
            try:
                x = float(v)
            except (TypeError, ValueError):
                continue
            idx.append(pd.Timestamp(int(a[:4]), int(a[5:]), 1))
            vals.append(x)
    return pd.Series(vals, index=pd.DatetimeIndex(idx), name=header_match)


def ultimo_mese_chiuso(daily_index):
    """Ultimo mese di cui la serie giornaliera ha già il mese successivo (mese finito)."""
    last = daily_index.max()
    first_of_month = pd.Timestamp(last.year, last.month, 1)
    return first_of_month - pd.offsets.MonthBegin(1)


def carica():
    """Dizionario delle serie mensili (pd.Series con indice mensile al primo del mese) e note sui controlli."""
    spx_d = yahoo('^GSPC')
    ultimo = ultimo_mese_chiuso(spx_d.index)
    spx = mensile(spx_d, ultimo)
    gs10 = fred('GS10')
    dollar_old = fred('TWEXMMTH')
    afe = mensile(fred('DTWEXAFEGS'), pd.Timestamp('2100-01-01'))
    # ultimo mese di AFE: solo se il mese è finito rispetto all'ultima osservazione giornaliera
    afe = afe[afe.index <= ultimo_mese_chiuso(fred('DTWEXAFEGS').index)]
    ext = afe[afe.index >= '2019-12-01']
    dollar = pd.concat([dollar_old, dollar_old.loc['2019-12-01'] * (ext / ext.loc['2019-12-01']).iloc[1:]])
    s = {
        'azioni': spx,
        'tassi': gs10,
        'mp': fred('WPUID62'),
        'ppiaco': fred('PPIACO'),
        'metalli': fred('WPU102'),
        'petrolio': fred('WTISPLC')[lambda x: x.index >= '1974-01-01'],
        'rame': fred('PCOPPUSDM'),
        'imf': fred('PALLFNFINDEXM'),
        'dollaro': dollar,
        'rec': fred('USRECM'),
    }
    wb = worldbank()
    if wb:
        s['wb_nonen'] = wb_serie(wb['Monthly Indices'], 'Non-energy')
        s['wb_metalli'] = wb_serie(wb['Monthly Indices'], 'Metals  & Minerals')
        s['oro'] = wb_serie(wb['Monthly Prices'], 'Gold')
    return s


NOMI = {
    'azioni': 'S&P 500 (media mensile, Yahoo ^GSPC)',
    'tassi': 'Decennale USA, rendimento (GS10)',
    'obbligazioni': 'Obbligazioni (prezzo = GS10 con il segno cambiato)',
    'mp': 'Materie prime grezze (PPI WPUID62)',
    'ppiaco': 'PPI tutte le merci (PPIACO)',
    'metalli': 'PPI metalli non ferrosi (WPU102)',
    'petrolio': 'Petrolio WTI (WTISPLC, dal 1974)',
    'rame': 'Rame (IMF PCOPPUSDM, dal 1992)',
    'imf': 'Indice IMF materie prime (dal 1992)',
    'dollaro': 'Dollaro (Fed, valute principali, raccordato con AFE dal 2020)',
    'wb_nonen': 'World Bank, indice materie prime non energetiche (dal 1960)',
    'wb_metalli': 'World Bank, indice metalli e minerali (dal 1960)',
    'oro': 'Oro, World Bank (dal 1960; prezzo fisso fino al 1968-1971)',
}
