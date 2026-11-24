#!/usr/bin/env bash
# Prove della pipeline di fetch_ath.js / check_fresh.js / keep_unchanged.js su un clone del commit da controllare.
# Uso: prova_pipeline.sh <clone> (il clone è usa e getta: i file di data/ vengono riscritti)
set -u
W=$1; Q=$(cd "$(dirname "$0")" && pwd); export MOCK_CACHE=$Q/cache
cd "$W"
run() { node --import "$Q/mock_yahoo.mjs" scripts/fetch_ath.js > /tmp/fa.out 2>&1; echo "exit=$?"; grep -v '^  ' /tmp/fa.out; }
reset() { git checkout -q -- data/ath.json data/ath_history.json; }
st() { node -e "const a=require('./data/ath.json'); const h=require('./data/ath_history.json'); const m=a.markets.find(x=>x.id==='$1'); console.log('$1 stats', m.stats? m.stats.lastDate+' start '+m.stats.start+' ref '+m.stats.ref : null, '| missing', JSON.stringify(a.missing), '| storico', !!h.series['$1'], '| ordine storico', Object.keys(h.series).join(','))"; }

echo '== 0. corsa normale (risposte salvate), confronto con il file pubblicato'
reset; run; git diff --stat -- data/; node -e "
const a=JSON.parse(require('child_process').execSync('git show HEAD:data/ath.json')),b=require('./data/ath.json');
for (const m of a.markets){const n=b.markets.find(x=>x.id===m.id); for(const k of Object.keys(m.stats)) if(JSON.stringify(m.stats[k])!==JSON.stringify(n.stats[k])) console.log('  diff', m.id,k,m.stats[k],n.stats[k]); for (const k of ['label','note','kind','symbol']) if (m[k]!==n[k]) console.log('  diff meta', m.id, k)}"
node scripts/keep_unchanged.js; echo "  dopo keep_unchanged: $(git status --short data/ | tr '\n' ' ')"

echo '== 1. due corse senza sedute nuove ma con ordine di arrivo diverso'
reset; MOCK_DELAY='^GSPC:400' run >/dev/null; git add -A data && git -c user.email=a@b -c user.name=qa commit -qm base1 && echo "  ordine 1: $(node -p "Object.keys(require('./data/ath_history.json').series).join(',')")"
MOCK_DELAY='BTC-USD:400' run >/dev/null; echo "  ordine 2: $(node -p "Object.keys(require('./data/ath_history.json').series).join(',')")"
node scripts/keep_unchanged.js; echo "  file da pubblicare dopo keep_unchanged: $(git status --short data/ | tr '\n' ' ')"
git checkout -q -- data/; MOCK_DELAY='^GSPC:400' run >/dev/null; node scripts/keep_unchanged.js; echo "  stesso ordine: da pubblicare: [$(git status --short data/ | tr '\n' ' ')]"
git reset -q --hard HEAD~1

echo '== 2. un mercato non risponde (CL=F 404), file precedente presente'
reset; MOCK_FAIL='CL=F' run; st WTI
echo '== 3. un mercato non risponde e ath.json precedente assente'
reset; rm data/ath.json; MOCK_FAIL='CL=F' run; st WTI
echo '== 4. un mercato non risponde e ath.json precedente corrotto (troncato)'
reset; head -c 500 data/ath.json > /tmp/t.json && mv /tmp/t.json data/ath.json; MOCK_FAIL='CL=F' run; st WTI
echo '== 5. ath_history.json precedente corrotto e un mercato non risponde'
reset; echo '{' > data/ath_history.json; MOCK_FAIL='CL=F' run; st WTI
echo '== 6. storia accorciata (CL=F dal 2015)'
reset; MOCK_SHORT='CL=F:2015' run; st WTI
echo '== 7. storia accorciata di meno di 30 giorni (^GSPC dal 1928-01-25, la pubblicata parte dal 1927-12-30)'
reset; MOCK_SHORT='^GSPC:1928' run | grep -i spx; st SPX
echo '== 8. ultima seduta più vecchia della pubblicata (SLV senza le ultime 2 barre)'
reset; MOCK_OLD='SLV:2' run; st SILVER
echo '== 9. tutti i mercati falliscono'
reset; MOCK_FAIL='BTC-USD,GLD,SLV,HG=F,CL=F,^NDX,^GSPC,SOXX,^KS11' run; git status --short data/
reset
