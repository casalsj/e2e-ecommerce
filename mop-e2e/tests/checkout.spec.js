import { test, expect } from '@playwright/test';
import { getStore } from '../stores/index.js';
import {
  dismissCookieBanner,
  dismissNewsletterPopups,
  getCartCount,
  cartButtonLocator,
  selectSizeIfNeeded,
  addToCart,
  goToCheckout,
  openCartDrawerIfNeeded,
} from './helpers.js';

/**
 * E2E sintético — tiendas Shopify headless (MOP stack).
 *
 * Cubre el camino crítico de compra HASTA el checkout de Shopify y se detiene
 * ahí. No se completa ningún pago ni se genera ningún pedido.
 */

test.describe('Flujo de compra crítico', () => {
  test('home carga y muestra navegación', async ({ page }, testInfo) => {
    const store = getStore(testInfo.project.name);

    await page.goto('/');
    await dismissCookieBanner(page, store.cookiePattern);
    await expect(page).toHaveTitle(store.homeTitle);
    const nav = page
      .getByRole('link', { name: store.homeNavLink })
      .or(page.getByRole('button', { name: store.homeNavLink }));
    await expect(nav.first()).toBeVisible();
  });

  test('catálogo lista productos', async ({ page }, testInfo) => {
    const store = getStore(testInfo.project.name);

    await page.goto(store.catalogPath);
    await dismissCookieBanner(page, store.cookiePattern);

    const productLinks = page.locator(store.productLinkSelector);
    await expect(productLinks.first()).toBeVisible({ timeout: 20_000 });
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test('ficha de producto: precio y botón de añadir visibles', async ({ page }, testInfo) => {
    const store = getStore(testInfo.project.name);

    await page.goto(store.productPath);
    await dismissCookieBanner(page, store.cookiePattern);
    await selectSizeIfNeeded(page, store);

    await expect(page.getByText(store.pricePattern).first()).toBeVisible();
    await expect(page.getByRole('button', { name: store.addToCartPattern }).first()).toBeVisible();
  });

  test('camino crítico: producto → carrito → inicio de checkout', async ({ page }, testInfo) => {
    const store = getStore(testInfo.project.name);

    await page.goto(store.productPath);
    await dismissCookieBanner(page, store.cookiePattern);
    await selectSizeIfNeeded(page, store);

    const initialCount = store.id === 'themopbookstore' ? await getCartCount(page) : 0;

    const apiCheckoutUrl = await addToCart(page, store);

    const drawerSignal = page.getByText(store.cartDrawerPattern).first();
    if (store.id === 'themopbookstore') {
      const subtotal = page.getByText(/subtotal/i);
      await expect(async () => {
        const countIncreased = (await getCartCount(page)) > initialCount;
        const drawerOpen = await subtotal.isVisible();
        expect(countIncreased || drawerOpen).toBe(true);
      }).toPass({ timeout: 15_000 });
    } else {
      await expect(drawerSignal).toBeVisible({ timeout: 15_000 });
    }

    await dismissNewsletterPopups(page, store);
    await openCartDrawerIfNeeded(page, store);

    await expect(page.getByText(store.cartInDrawerPattern).first()).toBeVisible();
    await expect(drawerSignal).toBeVisible();

    await goToCheckout(page, store, apiCheckoutUrl);

    expect(page.url()).toMatch(store.checkoutUrlPattern);
  });
});
