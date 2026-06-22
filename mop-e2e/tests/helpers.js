import { expect } from '@playwright/test';

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

/** Respuesta de la API headless al mutar el carrito (añadir línea). */
function isCartMutationResponse(response) {
  if (response.request().method() === 'GET' || response.status() >= 400) return false;
  const url = response.url();
  return url.includes('/cart/lines') || (url.includes('/api/shopify/cart') && url.includes('cart'));
}

/**
 * @param {import('@playwright/test').Response} response
 * @returns {Promise<string|null>}
 */
async function checkoutUrlFromCartResponse(response) {
  try {
    const body = await response.json();
    return body?.cart?.checkoutUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 * @returns {Promise<string|null>} checkoutUrl relativa devuelta por la API del carrito
 */
export async function addToCart(page, store) {
  const addButton = page.getByRole('button', { name: store.addToCartPattern }).first();

  const linesResponse = page
    .waitForResponse((r) => isCartMutationResponse(r) && r.url().includes('/lines'), {
      timeout: 20_000,
    })
    .catch(() => null);

  const cartResponse = page
    .waitForResponse((r) => isCartMutationResponse(r), { timeout: 20_000 })
    .catch(() => null);

  await addButton.click();

  const response = (await linesResponse) ?? (await cartResponse);
  if (!response) return null;

  return checkoutUrlFromCartResponse(response);
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
  for (const pattern of [/no,?\s*no quiero recibir descuentos/i, /^cerrar$/i, /^close$/i]) {
    try {
      await page.getByRole('button', { name: pattern }).click({ timeout: 1_500 });
    } catch {
      // Sin popup
    }
  }
  try {
    await page.keyboard.press('Escape');
  } catch {
    // Sin foco
  }
}

/**
 * Llega al checkout: API (fiable en CI) o clic en el botón/enlace del cajón.
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 * @param {string|null} apiCheckoutUrl
 */
export async function goToCheckout(page, store, apiCheckoutUrl) {
  if (store.preferApiCheckout && apiCheckoutUrl) {
    await gotoCheckoutViaApi(page, store, apiCheckoutUrl);
    return;
  }

  await dismissNewsletterPopups(page, store);
  await openCartDrawerIfNeeded(page, store);

  const btn = checkoutLocator(page, store).last();
  if (await btn.isVisible()) {
    await Promise.all([
      page.waitForURL(store.checkoutUrlPattern, { timeout: 15_000 }),
      btn.click({ timeout: 5_000 }),
    ]);
    return;
  }

  if (apiCheckoutUrl) {
    await gotoCheckoutViaApi(page, store, apiCheckoutUrl);
    return;
  }

  await expect(btn).toBeVisible();
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
