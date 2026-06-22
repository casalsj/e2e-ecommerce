# e2e-ecommerce (mop-e2e)

Monitorización sintética E2E de tiendas Shopify headless sin servicio externo.
Corre con Playwright desde GitHub Actions cada 15 min y avisa por **Google Chat**
si algún camino crítico de compra se rompe.

## Tiendas monitorizadas

| Proyecto Playwright | Dominio | Tests |
|---------------------|---------|-------|
| `themopbookstore` | themopbookstore.com | 4 |
| `thecampamento` | thecampamento.com | 4 |
| `emestudios` | emestudios.com | 4 |

**Total: 12 tests.** Todos verifican el flujo hasta el checkout de Shopify (sin pago).

## Qué verifica cada tienda

- Home carga y la navegación está presente
- El catálogo lista productos
- La ficha de producto muestra precio y botón de añadir (con talla si aplica)
- **Camino crítico**: producto → carrito → handoff al checkout (`checkout.{dominio}.com`)
- En **emestudios** y **thecampamento** el checkout en CI usa la API del carrito
  (`preferApiCheckout`) para evitar popups; **themopbookstore** pulsa el enlace UI.

## Local

```bash
npm install
npx playwright install chromium
npm test                              # las 3 tiendas
npm test -- --project=emestudios      # una sola tienda
npm run test:ui                       # modo interactivo
```

## Configuración por tienda

Toda la configuración (rutas, selectores, regex de checkout) está en
[`stores/index.js`](stores/index.js). Los tests en [`tests/checkout.spec.js`](tests/checkout.spec.js)
son genéricos y leen el proyecto activo de Playwright.

## CI (GitHub Actions)

Workflow en la raíz: [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml).

### Alertas en Google Chat

1. Espacio de Google Chat → **Apps e integraciones** → **Webhooks**.
2. Crear webhook (ej. "E2E Monitor").
3. Secret en GitHub: `GOOGLE_CHAT_WEBHOOK` con la URL completa del webhook.

Prueba manual:

```bash
curl -sf -X POST \
  -H 'Content-Type: application/json; charset=UTF-8' \
  --data '{"text":"✅ Prueba E2E Monitor — multi-tienda"}' \
  "$GOOGLE_CHAT_WEBHOOK"
```

## Ajustes habituales

- **Producto de prueba**: editar `productPath` en `stores/index.js`.
- **Frecuencia CI**: `cron` en el workflow (`*/15 * * * *` = cada 15 min).
- **Safari/WebKit**: descomentar proyecto `webkit` en `playwright.config.js`.
- **Nueva tienda**: nueva entrada en `stores/index.js` + documentar en `CONTEXT.md`.
