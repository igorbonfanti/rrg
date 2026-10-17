#!/usr/bin/env node
/*
 * keep_unchanged.js — prima del commit dei dati: un file JSON che differisce dalla versione pubblicata solo per
 * l'ora di generazione ("generated") torna com'era. Senza, ogni corsa del workflow (tre al giorno) farebbe un
 * commit e un nuovo deploy di Pages anche quando le sedute sono le stesse.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 1 << 28 });

// stesso contenuto a parte `generated`?
export function onlyStamp(before, after) {
  try {
    const a = JSON.parse(before), b = JSON.parse(after);
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    delete a.generated; delete b.generated;
    return JSON.stringify(a) === JSON.stringify(b);
  } catch { return false; }
}

function main() {
  const changed = git('diff', '--name-only', '--', 'data/').split('\n').filter((f) => f.endsWith('.json'));
  for (const f of changed) {
    let before;
    try { before = git('show', `HEAD:${f}`); } catch { continue; } // file nuovo
    if (onlyStamp(before, fs.readFileSync(path.join(ROOT, f), 'utf-8'))) {
      git('checkout', '--', f);
      console.log(`${f}: cambia solo l'ora di generazione, non si pubblica`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
