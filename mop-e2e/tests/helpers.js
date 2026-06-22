/** @param {import('@playwright/test').Page} page */
export async function dismissCookieBanner(page, pattern) {
  const acceptButton = page.getByRole('button', { name: pattern }).first();
  try {
    await acceptButton.click({ timeout: 5_000 });
  } catch {
    // Sin banner (sesión con cookies ya aceptadas)
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
  const sizes = Array.isArray(store.size) ? store.size : [store.size];
  for (const size of sizes) {
    const btn = page
      .getByRole('button', { name: size, exact: true })
      .and(page.locator(':enabled'))
      .first();
    if (await btn.count()) {
      await btn.click();
      return;
    }
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 * @returns {Promise<string|null>} checkoutUrl relativa devuelta por la API del carrito
 */
export async function addToCart(page, store) {
  /** @type {string|null} */
  let checkoutUrl = null;

  const onResponse = async (response) => {
    if (!response.url().includes('cart') || response.request().method() === 'GET') return;
    try {
      const body = await response.json();
      checkoutUrl = body?.cart?.checkoutUrl ?? checkoutUrl;
    } catch {
      // No JSON
    }
  };

  page.on('response', onResponse);
  try {
    await page.getByRole('button', { name: store.addToCartPattern }).first().click();
    await page
      .waitForResponse(
        (r) => r.url().includes('cart') && r.request().method() !== 'GET' && r.status() < 400,
        { timeout: 20_000 }
      )
      .catch(() => null);
  } finally {
    page.off('response', onResponse);
  }

  return checkoutUrl;
}

/**
 * Navega al checkout usando la URL devuelta por la API del carrito (fallback fiable en CI).
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 * @param {string} checkoutPath
 */
export async function gotoCheckoutViaApi(page, store, checkoutPath) {
  const target = new URL(checkoutPath, store.baseURL).href;
  await page.goto(target);
  await page.waitForURL(store.checkoutUrlPattern, { timeout: 30_000 });
}

/** Cierra popups de newsletter que tapan el cajón de compra. */
export async function dismissNewsletterPopups(page, store) {
  if (store.id !== 'emestudios') return;
  for (const pattern of [/no,?\s*no quiero recibir descuentos/i, /^cerrar$/i]) {
    try {
      await page.getByRole('button', { name: pattern }).click({ timeout: 1_000 });
    } catch {
      // Sin popup
    }
  }
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
      const bagBtn = page
        .locator('button')
        .filter({ has: page.locator('img[alt="bag"], img[alt="Bag"]') })
        .first();
      if (await bagBtn.count()) {
        await bagBtn.click();
      } else {
        await page.getByRole('button', { name: /bag/i }).first().click();
      }
      await page.getByRole('button', { name: /^checkout$/i }).waitFor({ state: 'visible', timeout: 15_000 });
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
