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
    productPath: '/products/paolo-roversi-doubts',
    catalogPath: '/bookstore/bookstore-annie-leibovitz',
    homeTitle: /MOP/i,
    homeNavLink: /bookstore/i,
    productName: /paolo roversi.*doubts|doubts/i,
    productLinkSelector: 'a[href*="/products/"]',
    pricePattern: /\d+[.,]\d{2}\s*EUR/i,
    cookiePattern: /aceptar todas las cookies|sólo las esenciales/i,
    addToCartPattern: /añadir al carrito/i,
    cartDrawerPattern: /subtotal/i,
    cartInDrawerPattern: /paolo roversi|doubts/i,
    checkoutUrlPattern: /checkout\.themopbookstore\.com|shopify\.com|\/checkouts?\//i,
    checkout: { type: 'link', pattern: /continuar con el pago/i },
    size: null,
  },

  thecampamento: {
    id: 'thecampamento',
    label: 'thecampamento.com',
    baseURL: 'https://thecampamento.com',
    locale: 'es-ES',
    productPath: '/es/es/product/ladybug-jacket',
    catalogPath: '/es/es/kid',
    homeTitle: /campamento/i,
    homeNavLink: /niño|bebé|about|kid/i,
    productName: /chaqueta ladybug|ladybug jacket/i,
    productLinkSelector: 'a[href*="/product/"]',
    pricePattern: /€\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*€/i,
    cookiePattern: /aceptar todas|aceptar$/i,
    addToCartPattern: /^añadir al carrito$/i,
    cartDrawerPattern: /^total$/i,
    cartInDrawerPattern: /chaqueta ladybug|ladybug jacket/i,
    checkoutUrlPattern: /checkout\.thecampamento\.com|shopify\.com|\/checkouts?\//i,
    checkout: { type: 'button', pattern: /^checkout$|^pagar$/i },
    preferApiCheckout: true,
    size: ['5/6', '4', '7/8', '9/10', '3', '2', '11/12', '13/14'],
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
