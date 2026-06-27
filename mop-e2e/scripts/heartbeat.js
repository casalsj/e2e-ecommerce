/**
 * Heartbeat periódico — ejecuta healthcheck y escribe resumen en stdout para Google Chat.
 * Exit 0 = OK, 1 = KO.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { storeIds, stores } from '../stores/index.js';

const root = dirname(fileURLToPath(import.meta.url));
const healthcheck = join(root, 'healthcheck.js');
const failuresFile = join(root, '..', 'healthcheck-failures.txt');

const result = spawnSync(process.execPath, [healthcheck], {
  cwd: join(root, '..'),
  encoding: 'utf8',
});

const checksTotal = storeIds.length * 2;
const storesList = storeIds.map((id) => stores[id].label).join(', ');

/** @type {string[]} */
const lines = [`Tiendas: ${storesList}`, `Checks: ${checksTotal} (home + catálogo por tienda)`];

if (result.status === 0) {
  lines.unshift('✅ *Heartbeat OK* — monitor activo');
  console.log(lines.join('\n'));
  process.exit(0);
}

lines.unshift('🚨 *Heartbeat KO* — healthcheck falló');
if (existsSync(failuresFile)) {
  lines.push(readFileSync(failuresFile, 'utf8').trim());
}

console.log(lines.join('\n'));
process.exit(1);
