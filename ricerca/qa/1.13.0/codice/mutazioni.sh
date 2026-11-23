#!/usr/bin/env bash
# QA 1.13.0: test/info.test.js può fallire? Copia js, test, index.html e guida.html in una cartella temporanea, introduce
# un errore alla volta e lancia solo test/info.test.js. Uso: bash mutazioni.sh <cartella del worktree 1.13.0>
set -u
SRC=${1:-/tmp/qa-k-new}
S=$(mktemp -d); trap 'rm -rf "$S"' EXIT
cp -r "$SRC"/js "$SRC"/test "$SRC"/index.html "$SRC"/guida.html "$SRC"/package.json "$S"/
cd "$S"
run(){ node --test test/info.test.js 2>&1 | grep -E '^# (pass|fail)' | tr '\n' ' '; echo " <- $1"; }
bak(){ cp "$1" "$1.bak"; }; rst(){ mv "$1.bak" "$1"; }
run "nessuna modifica"
bak js/info.js; sed -i 's/r.left - 12))/r.left - 10))/' js/info.js; run "placeBox: margine sinistro 10 invece di 12"; rst js/info.js
bak js/info.js; sed -i 's/const fitsBelow = below + h <= vh - 8/const fitsBelow = below + h <= vh/' js/info.js; run "placeBox: senza margine in basso"; rst js/info.js
bak index.html; sed -i 's/id="stateHelp" hidden/id="stateHelpX" hidden/' index.html; run "contenitore stateHelp tolto"; rst index.html
bak index.html; sed -i 's/data-guide="formule"/data-guide="formuleX"/' index.html; run "data-guide senza ancora"; rst index.html
bak index.html; sed -i 's/id="mxHelp" hidden/id="mxHelp"/' index.html; run "contenitore non nascosto"; rst index.html
bak index.html; sed -i 's|guida.html#fonti-vix|guida.html#fonti-vixX|' index.html; run "link Fonti e note rotto"; rst index.html
bak js/bottom.js; sed -i 's/data-src="secQualityHelp"/data-src="secQualityHelpX"/' js/bottom.js; run "data-src rotto in un js"; rst js/bottom.js
bak js/app.js; sed -i "s/'pxHelp' : 'rotHelp'/'pxHelpX' : 'rotHelp'/" js/app.js; run "dataset.src dinamico rotto (app.js, #tableInfo)"; rst js/app.js
bak js/info.js; sed -i 's/body.innerHTML = src.innerHTML/body.textContent = ""/' js/info.js; run "fill non copia il contenitore"; rst js/info.js
bak js/info.js; sed -i "s/if (e.key !== 'Escape' || !cur) return;/return;/" js/info.js; run "Esc disattivato"; rst js/info.js
