/**
 * Configuración por tienda — Shopify headless (stack compartido, copy/UI distintos).
 * Cada entrada define rutas, selectores y señales del cajón de carrito en producción.
 */
export const stores = {
  themopbookstore: {
    id: 'themopbookstore',
    label: 'themopbookstore.com',
    baseURL: 'https://themopbookstore.com',
    locale: 'es-ES',
    productPath: '/products/annie-leibovitz-in-wonderland',
    catalogPath: '/bookstore/bookstore-annie-leibovitz',
    homeTitle: /MOP/i,
    homeNavLink: /bookstore/i,
    productName: /annie leibovitz in wonderland/i,
    productLinkSelector: 'a[href*="/products/"]',
    pricePattern: /\d+[.,]\d{2}\s*EUR/i,
    cookiePattern: /aceptar todas las cookies|sólo las esenciales/i,
    addToCartPattern: /añadir al carrito/i,
    cartDrawerPattern: /subtotal/i,
    cartInDrawerPattern: /subtotal/i,
    checkoutUrlPattern: /checkout\.themopbookstore\.com|shopify\.com|\/checkouts?\//i,
    checkout: { type: 'link', pattern: /continuar con el pago/i },
    size: null,
  },

  thecampamento: {
    id: 'thecampamento',
    label: 'thecampamento.com',
    baseURL: 'https://thecampamento.com',
    locale: 'en-GB',
    productPath: '/es/en/product/falling-star-sweatshirt',
    catalogPath: '/es/en/kid',
    homeTitle: /campamento/i,
    homeNavLink: /kid|about|shop/i,
    productName: /falling star sweatshirt/i,
    productLinkSelector: 'a[href*="/product/"]',
    pricePattern: /€\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*€/i,
    cookiePattern: /accept all|reject optional/i,
    addToCartPattern: /add to cart/i,
    cartDrawerPattern: /^total$/i,
    cartInDrawerPattern: /falling star sweatshirt/i,
    checkoutUrlPattern: /checkout\.thecampamento\.com|shopify\.com|\/checkouts?\//i,
    checkout: { type: 'button', pattern: /^checkout$/i },
    preferApiCheckout: true,
    size: '7/8',
  },

  emestudios: {
    id: 'emestudios',
    label: 'emestudios.com',
    baseURL: 'https://emestudios.com',
    locale: 'es-ES',
    productPath: '/es/es/product/thrill-navy-zipper-knit',
    catalogPath: '/es/es/best-sellers',
    homeTitle: /eme studios|always grateful/i,
    homeNavLink: /colecciones|sample archive/i,
    productName: /thrill navy zipper knit/i,
    productLinkSelector: 'a[href*="/product/"]',
    pricePattern: /\d+[.,]\d{2}\s*€/i,
    cookiePattern: /^aceptar$/i,
    addToCartPattern: /^añadir al carrito$/i,
    cartDrawerPattern: /contenido del carrito/i,
    cartInDrawerPattern: /thrill navy zipper knit/i,
    checkoutUrlPattern: /checkout\.emestudios\.com|shopify\.com|\/checkouts?\//i,
    checkout: { type: 'button', pattern: /^pagar$/i },
    preferApiCheckout: true,
    size: ['M', 'L', 'S', 'XL'],
  },
};

export const storeIds = Object.keys(stores);

export function getStore(projectName) {
  const store = stores[projectName];
  if (!store) {
    throw new Error(`Tienda desconocida para el proyecto Playwright: ${projectName}`);
  }
  return store;
}
