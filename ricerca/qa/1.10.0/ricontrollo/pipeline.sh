#!/usr/bin/env bash
# Ricontrollo della pipeline (commit 2c565ed): fetch_ath.js, keep_unchanged.js, check_fresh.js su un clone usa e getta,
# senza rete (risposte di Yahoo salvate in ../numeri/cache, servite da ../numeri/mock_yahoo.mjs).
# Uso: pipeline.sh <clone> <cartella temporanea>
set -u
W=$1; T=$2; Q=$(cd "$(dirname "$0")/../numeri" && pwd); export MOCK_CACHE=$Q/cache
cd "$W"
G() { git -c user.email=qa@example.invalid -c user.name=qa "$@"; }
run() { node --import "$Q/mock_yahoo.mjs" scripts/fetch_ath.js > "$T/fa.out" 2>&1; local e=$?; echo "  exit=$e"; grep -v '^  ' "$T/fa.out" | sed 's/^/  | /'; return 0; }
reset() { git checkout -q -- data/ath.json data/ath_history.json; }
ord() { node -p "Object.keys(require('./data/ath_history.json').series).join(',')+' | ath '+require('./data/ath.json').markets.map(m=>m.id).join(',')+' | missing '+JSON.stringify(require('./data/ath.json').missing)"; }
st() { node -e "const a=require('./data/ath.json'); const h=require('./data/ath_history.json'); const m=a.markets.find(x=>x.id==='$1'); console.log('  $1 riga', m.stats? 'lastDate '+m.stats.lastDate+' ref '+m.stats.ref : null, '| missing', JSON.stringify(a.missing), '| storico', !!h.series['$1'])"; }
# file uguali a parte «generated»
same() { node -e "
const cp=require('child_process'), f=(s)=>{const j=JSON.parse(s); delete j.generated; return JSON.stringify(j)};
for (const p of ['data/ath.json','data/ath_history.json']) { const a=f(cp.execSync('git show HEAD:'+p)), b=f(require('fs').readFileSync(p,'utf-8')); console.log('  '+p+(a===b?': uguale a parte generated':': DIVERSO')); }"; }

echo '== A. corsa normale, confronto con il file del commit (a parte generated)'
reset; run; same

echo '== B. due corse di fila con ordine di arrivo diverso (ritardi su ^GSPC poi su BTC-USD e GLD)'
reset; MOCK_DELAY='^GSPC:400' run >/dev/null; G add -A data && G commit -qm base1; echo "  corsa 1: $(ord)"
MOCK_DELAY='BTC-USD:500,GLD:300' run >/dev/null; echo "  corsa 2: $(ord)"; same
node scripts/keep_unchanged.js | sed 's/^/  keep: /'; echo "  da pubblicare dopo keep_unchanged: [$(git status --short data/ | tr '\n' ' ')]"
git checkout -q -- data/
echo '  -- con due mercati mancanti in ordine di arrivo diverso:'
MOCK_FAIL='CL=F,^KS11' MOCK_DELAY='CL=F:500' run >/dev/null; G add -A data && G commit -qm base2; echo "  corsa 3: $(ord)"
MOCK_FAIL='CL=F,^KS11' MOCK_DELAY='^KS11:500' run >/dev/null; echo "  corsa 4: $(ord)"
node scripts/keep_unchanged.js | sed 's/^/  keep: /'; echo "  da pubblicare dopo keep_unchanged: [$(git status --short data/ | tr '\n' ' ')]"
git reset -q --hard HEAD~2

echo '== C. un mercato non arriva (CL=F 404) con il file precedente: exit 1, file scritti con la riga pubblicata'
reset; P=$(node -p "JSON.stringify(require('./data/ath.json').markets.find(m=>m.id==='WTI').stats)"); PH=$(node -p "JSON.stringify(require('./data/ath_history.json').series.WTI)" | sha1sum)
MOCK_FAIL='CL=F' run; st WTI
echo "  riga WTI uguale alla pubblicata: $([ "$P" = "$(node -p "JSON.stringify(require('./data/ath.json').markets.find(m=>m.id==='WTI').stats)")" ] && echo sì || echo NO)"
echo "  storico WTI uguale al pubblicato: $([ "$PH" = "$(node -p "JSON.stringify(require('./data/ath_history.json').series.WTI)" | sha1sum)" ] && echo sì || echo NO)"
echo "  generated cambiato (file riscritti): $(git diff --quiet -- data/ath.json && echo NO || echo sì)"

echo '== D. tutti e 9 non arrivano, file precedente presente'
reset; MOCK_FAIL='BTC-USD,GLD,SLV,HG=F,CL=F,^NDX,^GSPC,SOXX,^KS11' run; echo "  $(ord)"
echo '== E. un mercato non arriva e nessun ath.json precedente'
reset; rm data/ath.json; MOCK_FAIL='CL=F' run; st WTI
echo '== F. tutti non arrivano e nessun ath.json precedente'
reset; rm data/ath.json; MOCK_FAIL='BTC-USD,GLD,SLV,HG=F,CL=F,^NDX,^GSPC,SOXX,^KS11' run; ls data/ath.json 2>&1 | sed 's/^/  /'
echo '== G. storia accorciata (CL=F dal 2015): riga tenuta, passo fallito'
reset; MOCK_SHORT='CL=F:2015' run; st WTI
echo '== H. ultima seduta più vecchia (SLV -2 barre)'
reset; MOCK_OLD='SLV:2' run; st SILVER
reset

echo '== I. check_fresh.js con data/ath.json assente, rotto, vuoto, {} e valido'
cf() { node scripts/check_fresh.js > "$T/cf.out" 2>&1; local e=$?; echo "  $1: exit=$e $(grep -i 'ath' "$T/cf.out" | head -2 | tr '\n' ' ')$(grep -c . "$T/cf.out") righe"; }
reset; cf 'valido'
cp data/ath.json "$T/ath.bak"
rm data/ath.json; cf 'assente'
head -c 300 "$T/ath.bak" > data/ath.json; cf 'troncato'
: > data/ath.json; cf 'vuoto (0 byte)'
echo '{}' > data/ath.json; cf '{}'
echo 'null' > data/ath.json; cf 'null'
echo '{"markets":[]}' > data/ath.json; cf 'markets vuoto'
reset
