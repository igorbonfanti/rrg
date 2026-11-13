#!/usr/bin/env bash
# Corsa in coda partita dal commit vecchio: il passo «Commit dati aggiornati» si ferma su un conflitto.
#
# Meccanismo (GitHub Actions): una corsa programmata ha come GITHUB_SHA l'ultimo commit di main al momento in cui
# GitHub la crea. Se in quel momento un'altra corsa del gruppo `update-data` è in corso, la nuova resta in attesa
# (concurrency, cancel-in-progress: false) con lo SHA di prima. actions/checkout senza `ref` scarica proprio quello
# SHA, quindi i dati di partenza sono quelli di prima della pubblicazione appena fatta dall'altra corsa.
# I file in data/ sono JSON su una riga: due versioni diverse dello stesso file non si fondono mai.
#
# Qui: un repository «origin», la corsa R1 che pubblica i dati del 19/10, la corsa R2 partita dallo SHA precedente
# che scarica anch'essa il 19/10 (con un'altra ora di generazione) e fa `git pull --rebase` come il workflow.
# Uso: bash prova_sha_coda.sh [cartella di lavoro]
set -u
W="${1:-$(mktemp -d)}"; rm -rf "$W"; mkdir -p "$W"; cd "$W" || exit 1
git init -q --bare origin.git && git --git-dir=origin.git symbolic-ref HEAD refs/heads/main
git clone -q origin.git base 2>/dev/null; cd base
git config user.email qa@example.com; git config user.name qa
mkdir data; echo '{"generated":"2026-10-17T01:00:00Z","asOf":"2026-10-16","dates":["2026-10-15","2026-10-16"]}' > data/prices.json
git add . && git commit -qm "dati al 16/10" && git push -q origin HEAD:main 2>/dev/null
SHA_VECCHIO=$(git rev-parse HEAD); cd ..
# R2 creata mentre R1 è in corso: checkout dello SHA vecchio
git clone -q origin.git r2 2>/dev/null; (cd r2 && git checkout -q "$SHA_VECCHIO")
# R1 pubblica
git clone -q origin.git r1 2>/dev/null; cd r1; git config user.email qa@example.com; git config user.name qa
echo '{"generated":"2026-10-20T01:21:00Z","asOf":"2026-10-19","dates":["2026-10-15","2026-10-16","2026-10-19"]}' > data/prices.json
git commit -qam "R1: dati al 19/10" && git push -q origin HEAD:main 2>/dev/null; cd ..
# R2 parte dopo la fine di R1, scarica gli stessi dati e prova a pubblicare
cd r2; git config user.email qa@example.com; git config user.name qa; git checkout -q -B main
echo '{"generated":"2026-10-20T01:27:00Z","asOf":"2026-10-19","dates":["2026-10-15","2026-10-16","2026-10-19"]}' > data/prices.json
git commit -qam "R2: dati al 19/10"
git branch -q --set-upstream-to=origin/main 2>/dev/null || git fetch -q origin && git branch -q --set-upstream-to=origin/main
if git pull --rebase -q 2>err.txt; then echo "ESITO: rebase riuscito (inatteso)"; else echo "ESITO: git pull --rebase fallisce (uscita $?): $(grep -m1 -i conflict err.txt || head -1 err.txt)"; fi
echo "Nel workflow il passo «Commit dati aggiornati» non ha continue-on-error: il job si ferma, alert e check_fresh non partono, la corsa è rossa e GitHub manda la mail."
echo "Con 'ref: main' nel checkout (o 'git fetch && git reset --hard origin/main' all'inizio) R2 partirebbe dai dati di R1 e il gate la fermerebbe."
