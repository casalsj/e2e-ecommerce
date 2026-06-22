/**
 * Healthcheck ligero — GET home + catálogo por tienda.
 * Sin navegador; solo comprueba que responden HTTP 2xx en tiempo razonable.
 */
import { writeFileSync } from 'node:fs';
import { stores, storeIds } from '../stores/index.js';

const TIMEOUT_MS = 15_000;
const FAILURES_FILE = 'healthcheck-failures.txt';

/** @type {string[]} */
const failures = [];

for (const id of storeIds) {
  const store = stores[id];
  const checks = [
    { name: 'home', path: '/' },
    { name: 'catalog', path: store.catalogPath },
  ];

  for (const { name, path } of checks) {
    const url = new URL(path, store.baseURL).href;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
        headers: { 'User-Agent': 'e2e-healthcheck/1.0 (+https://github.com/casalsj/e2e-ecommerce)' },
      });
      const ms = Date.now() - start;

      if (res.ok) {
        console.log(`OK  ${store.label} ${name} → ${res.status} (${ms}ms)`);
      } else {
        failures.push(`${store.label} [${name}]: HTTP ${res.status} (${ms}ms) — ${url}`);
      }
    } catch (err) {
      const ms = Date.now() - start;
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${store.label} [${name}]: ${message} (${ms}ms) — ${url}`);
    }
  }
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:\n${failures.join('\n')}`);
  writeFileSync(FAILURES_FILE, failures.join('\n'));
  process.exit(1);
}

console.log(`\nAll ${storeIds.length * 2} checks passed.`);
