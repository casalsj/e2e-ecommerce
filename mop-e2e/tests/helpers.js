/** @param {import('@playwright/test').Page} page */
export async function dismissCookieBanner(page, pattern) {
  const acceptButton = page.getByRole('button', { name: pattern }).first();
  try {
    await acceptButton.click({ timeout: 5_000 });
  } catch {
    // Sin banner (sesión con cookies ya aceptadas)
  }
}

/** Cierra popups modales (newsletter Klaviyo, etc.) que bloquean clics. */
export async function dismissBlockingPopups(page) {
  try {
    await page.keyboard.press('Escape');
  } catch {
    // ignore
  }
}

/** Localiza el botón de cesta en la cabecera (themopbookstore). */
export function cartButtonLocator(page) {
  return page
    .locator('header button, banner button, [class*="header"] button')
    .filter({ hasText: /cesta\s*\(\d+\)/i })
    .first();
}

/** Lee el contador N de "Cesta (N)" en themopbookstore. */
export async function getCartCount(page) {
  const text = await cartButtonLocator(page).innerText();
  return parseInt(text.match(/\((\d+)\)/)?.[1] || '0', 10);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
export async function selectSizeIfNeeded(page, store) {
  if (!store.size) return;
  await page.getByRole('button', { name: store.size, exact: true }).first().click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
export function checkoutLocator(page, store) {
  const { checkout } = store;
  if (checkout.type === 'link') {
    return page.getByRole('link', { name: checkout.pattern });
  }
  return page.getByRole('button', { name: checkout.pattern });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
export async function openCartDrawerIfNeeded(page, store) {
  if (store.id === 'thecampamento') {
    const checkoutVisible = await page.getByRole('button', { name: /^checkout$/i }).isVisible();
    if (!checkoutVisible) {
      await page.getByRole('button', { name: /bag/i }).click();
      await page.getByRole('button', { name: /^checkout$/i }).waitFor({ state: 'visible', timeout: 10_000 });
    }
    return;
  }

  if (await page.getByText(store.cartDrawerPattern).first().isVisible()) {
    return;
  }

  if (store.id === 'themopbookstore') {
    await cartButtonLocator(page).click();
    return;
  }

  const cartBtn = page.getByRole('button', { name: /carrito|cart|bag|cesta/i }).first();
  try {
    await cartBtn.click({ timeout: 5_000 });
  } catch {
    // El cajón puede abrirse solo al añadir
  }
}
