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
 * Bloque del producto principal (evita clicar tallas/botones de recomendados).
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
export function productAreaLocator(page, store) {
  if (store.id === 'thecampamento') {
    // Hay varios <article> duplicados (responsive); el stub móvil no tiene selector de talla.
    return page.locator('article')
      .filter({ has: page.getByRole('heading', { level: 1, name: store.productName }) })
      .filter({ has: page.getByText(/^Talla$/i) })
      .first();
  }
  if (store.id === 'emestudios') {
    return page.locator('section, article, div').filter({
      has: page.getByRole('heading', { name: store.productName }),
      has: page.getByRole('button', { name: store.addToCartPattern }),
    }).first();
  }
  return page.locator('main').first();
}

/**
 * Cookies, popups y talla antes de interactuar con la ficha.
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
export async function prepareProductPage(page, store) {
  await dismissCookieBanner(page, store.cookiePattern);
  await dismissNewsletterPopups(page, store);
  if (store.id === 'thecampamento') {
    await expect(
      page.getByRole('heading', { level: 1, name: store.productName }).first(),
    ).toBeVisible({ timeout: 20_000 });
  }
  await selectSizeIfNeeded(page, store);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('../stores/index.js').stores[string]} store
 */
function sizeButtonLocator(root, page, size) {
  return root
    .getByRole('button', { name: size, exact: true })
    .filter({ hasNot: page.locator('[disabled], [aria-disabled="true"]') })
    .first();
}

export async function selectSizeIfNeeded(page, store) {
  if (!store.size) return;
  const sizes = Array.isArray(store.size) ? store.size : [store.size];
  const root = productAreaLocator(page, store);

  await expect(async () => {
    for (const size of sizes) {
      const btn = sizeButtonLocator(root, page, size);
      if (await btn.count()) {
        await btn.click();
        return;
      }
    }
    throw new Error(`No hay talla disponible (${sizes.join(', ')}) en ${store.label}`);
  }).toPass({ timeout: 20_000 });
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
  const root = productAreaLocator(page, store);
  const addButton = root.getByRole('button', { name: store.addToCartPattern });

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

/** Cierra popups de newsletter/Klaviyo que tapan la ficha o el cajón de compra. */
export async function dismissNewsletterPopups(page, store) {
  if (!['emestudios', 'thecampamento'].includes(store.id)) return;

  const dialog = page.getByRole('dialog').filter({
    hasText: /10%\s*off|suscri|boletín|members|descuentos|newsletter|klaviyo/i,
  });

  const patterns = [
    /no,?\s*no quiero recibir descuentos/i,
    /no thanks/i,
    /^cerrar$/i,
    /^close$/i,
  ];

  for (const pattern of patterns) {
    try {
      const btn = dialog.getByRole('button', { name: pattern }).or(page.getByRole('button', { name: pattern }));
      await btn.first().click({ timeout: 3_000 });
    } catch {
      // Sin popup o ya cerrado
    }
  }

  try {
    await page.keyboard.press('Escape');
  } catch {
    // Sin foco
  }

  try {
    await dialog.first().waitFor({ state: 'hidden', timeout: 5_000 });
  } catch {
    // Popup ya cerrado o no existía
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
    const checkoutBtn = page.getByRole('button', { name: /^checkout$|^pagar$/i });
    const checkoutVisible = await checkoutBtn.isVisible();
    if (!checkoutVisible) {
      const bagBtn = page
        .locator('button')
        .filter({ has: page.locator('img[alt="bag"], img[alt="Bag"]') })
        .or(page.getByRole('button', { name: /carrito|cart|bag/i }))
        .first();
      if (await bagBtn.count()) {
        await bagBtn.click();
      }
      await checkoutBtn.waitFor({ state: 'visible', timeout: 15_000 });
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
