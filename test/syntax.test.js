import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// i moduli del browser (bottom.js, indices.js, …) non li carica nessun altro test: almeno la sintassi si controlla qui
test('sintassi di tutti i file in js/', () => {
  const dir = new URL('../js/', import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', new URL(f, dir).pathname], { stdio: 'pipe' }), f);
  }
});
