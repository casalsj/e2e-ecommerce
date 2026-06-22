import { test, expect } from '@playwright/test';

/**
 * E2E sintético — themopbookstore.com (Shopify headless)
 *
 * Cubre el camino crítico de compra HASTA el checkout de Shopify y se detiene
 * ahí: el checkout es responsabilidad de Shopify, no del frontend. No se
 * completa ningún pago ni se genera ningún pedido.
 *
 * Flujo: home → colección → producto → añadir al carrito → abrir cesta →
 *        continuar con el pago → verificar redirección a Shopify.
 */

const PRODUCT_PATH = '/products/annie-leibovitz-in-wonderland';

/** Localiza el botón de cesta en la cabecera. */
function cartButtonLocator(page) {
  return page.locator('header button, banner button, [class*="header"] button')
    .filter({ hasText: /cesta\s*\(\d+\)/i })
    .first();
}

/** Lee el contador N de "Cesta (N)" desde el texto del botón de cabecera. */
async function getCartCount(page) {
  const text = await cartButtonLocator(page).innerText();
  return parseInt(text.match(/\((\d+)\)/)?.[1] || '0', 10);
}

/** Cierra el banner de cookies si está visible (bloquea clics en la página). */
async function dismissCookieBanner(page) {
  const acceptButton = page
    .getByRole('button', { name: /aceptar todas las cookies|sólo las esenciales/i })
    .first();
  try {
    await acceptButton.click({ timeout: 5_000 });
  } catch {
    // Sin banner (sesión con cookies ya aceptadas)
  }
}

test.describe('Flujo de compra crítico', () => {
  test('home carga y muestra navegación', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MOP/i);
    await expect(page.getByRole('link', { name: /bookstore/i }).first()).toBeVisible();
  });

  test('catálogo bookstore lista productos', async ({ page }) => {
    await page.goto('/bookstore/bookstore-annie-leibovitz');
    // Debe haber al menos un enlace a una ficha de producto
    const productLinks = page.locator('a[href*="/products/"]');
    await expect(productLinks.first()).toBeVisible();
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test('ficha de producto: precio y botón de añadir visibles', async ({ page }) => {
    await page.goto(PRODUCT_PATH);
    // El precio se renderiza como "NN.NN EUR"
    await expect(page.getByText(/\d+[.,]\d{2}\s*EUR/i).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /añadir al carrito/i })
    ).toBeVisible();
  });

  test('camino crítico: producto → carrito → inicio de checkout', async ({ page }) => {
    await page.goto(PRODUCT_PATH);
    await dismissCookieBanner(page);

    // 1. Leer estado inicial de la cesta
    const initialCount = await getCartCount(page);

    // 2. Añadir al carrito
    await page.getByRole('button', { name: /añadir al carrito/i }).first().click();

    // 3. Confirmar que el producto se añadió (contador o cajón con subtotal)
    const subtotal = page.getByText(/subtotal/i);
    await expect(async () => {
      const countIncreased = (await getCartCount(page)) > initialCount;
      const drawerOpen = await subtotal.isVisible();
      expect(countIncreased || drawerOpen).toBe(true);
    }).toPass({ timeout: 15_000 });

    // 4. Abrir el cajón de la cesta si no está visible
    if (!(await subtotal.isVisible())) {
      await cartButtonLocator(page).click();
    }

    // 5. Verificar que el cajón muestra subtotal y el producto añadido
    await expect(page.getByText(/subtotal/i)).toBeVisible();
    await expect(
      page.getByText(/annie leibovitz in wonderland/i).first()
    ).toBeVisible();

    // 6. Pulsar "Continuar con el pago" y verificar redirección al checkout de Shopify.
    //    Es un <a>, no un <button> (el role=button del overlay del cajón confunde getByRole).
    const checkoutLink = page.getByRole('link', { name: /continuar con el pago/i });
    await expect(checkoutLink).toBeVisible();

    await Promise.all([
      page.waitForURL(/checkout\.themopbookstore\.com|shopify\.com|\/checkouts?\//i, {
        timeout: 30_000,
      }),
      checkoutLink.click(),
    ]);

    // 7. Confirmar que estamos en el checkout de Shopify (no en error 4xx/5xx)
    expect(page.url()).toMatch(/checkout\.themopbookstore\.com|shopify\.com|\/checkouts?\//i);
  });
});
