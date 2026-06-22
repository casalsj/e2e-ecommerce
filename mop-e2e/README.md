# mop-e2e

Monitorización sintética E2E de **themopbookstore.com** sin servicio externo
(alternativa gratuita a Checkly). Corre con Playwright desde GitHub Actions en
cron y avisa por Google Chat si el camino crítico de compra se rompe.

No toca el código del cliente: ataca la web ya desplegada como un usuario real.

## Qué verifica

- Home carga y la navegación está presente
- El catálogo lista productos
- La ficha de producto muestra precio y botón de añadir
- **Camino crítico**: producto → añadir al carrito → abrir cesta → "Continuar
  con el pago" → **redirección al checkout de Shopify** (`checkout.themopbookstore.com`)

Se detiene en el handoff a Shopify. No completa el pago ni genera pedidos.

## Local

```bash
npm install
npx playwright install chromium
npm test            # o: npm run test:ui  (modo interactivo)
```

## CI (GitHub Actions)

El workflow está en la raíz del repo: [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml).
Corre cada 15 min y se puede lanzar a mano desde la pestaña Actions.

### Alertas en Google Chat

1. En el espacio de Google Chat: nombre del espacio → **Apps e integraciones** → **Webhooks**.
2. Crear un webhook (ej. "E2E Monitor").
3. Copiar la URL del webhook.
4. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Nombre: `GOOGLE_CHAT_WEBHOOK`
   - Valor: la URL completa (`https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...`)

No guardes la URL del webhook en el código ni en el repo.

Para probar el webhook manualmente:

```bash
curl -sf -X POST \
  -H 'Content-Type: application/json; charset=UTF-8' \
  --data '{"text":"✅ Prueba E2E Monitor — themopbookstore.com"}' \
  "$GOOGLE_CHAT_WEBHOOK"
```

## Ajustes habituales

- **Frecuencia**: edita el `cron` en el workflow. `*/15 * * * *` = cada 15 min.
- **Safari/WebKit**: descomenta el proyecto `webkit` en `playwright.config.js`.
- **Otra tienda**: cambia `BASE_URL` y los selectores en `tests/checkout.spec.js`.
- **Producto de prueba**: edita `PRODUCT_PATH` en `tests/checkout.spec.js`.
