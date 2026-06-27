/**
 * Lee el JSON de Playwright y genera un resumen legible para Google Chat.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RESULTS_FILE = 'test-results/results.json';
const OUT_FILE = process.env.E2E_ALERT_FILE ?? 'e2e-failures.txt';

/** @param {import('@playwright/test/reporter').JSONReportSuite[] | undefined} suites */
function collectFailures(suites, failures = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status === 'unexpected' && test.projectName) {
          failures.push({ store: test.projectName, test: spec.title });
        }
      }
    }
    collectFailures(suite.suites, failures);
  }
  return failures;
}

try {
  const data = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
  const failures = collectFailures(data.suites);

  const lines =
    failures.length > 0
      ? failures.map(({ store, test }) => `• *${store}*: ${test}`)
      : ['• No se pudo determinar el test fallido (revisa el run)'];

  const text = lines.join('\n');
  writeFileSync(OUT_FILE, text);
  console.log(text);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  writeFileSync(OUT_FILE, `• Error leyendo resultados: ${message}`);
  console.error(message);
}
