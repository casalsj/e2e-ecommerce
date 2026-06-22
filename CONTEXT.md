# CONTEXT.md — e2e-ecommerce

Contexto para continuar el proyecto en Cursor (o para un agente de IA).
Léeme entero antes de tocar nada.

## Qué es esto

Monitorización sintética end-to-end de **3 tiendas Shopify headless** del mismo
stack, como alternativa gratuita a Checkly/servicios externos.

| Tienda | URL | Repo CI |
|--------|-----|---------|
| MOP Bookstore | https://themopbookstore.com | [casalsj/e2e-ecommerce](https://github.com/casalsj/e2e-ecommerce) |
| The Campamento | https://thecampamento.com | (mismo repo) |
| Eme Studios | https://emestudios.com | (mismo repo) |

- Stack del test: **Playwright** (JS, ESM).
- Ejecución: **GitHub Actions** cron cada 15 min + alerta a **Google Chat** si falla.
- Filosofía: el test ataca la **web ya desplegada** como un usuario real.
  **NO** vive dentro del repo del cliente ni importa nada de su código.

## Regla de oro del alcance

El test cubre el camino crítico de compra **hasta el handoff al checkout de
Shopify y se detiene ahí**. El checkout es responsabilidad de Shopify, no del
frontend. **Nunca se completa un pago ni se genera un pedido.**

URLs de checkout confirmadas en producción:

- `https://checkout.themopbookstore.com/checkouts/...`
- `https://checkout.thecampamento.com/checkouts/...`
- `https://checkout.emestudios.com/checkouts/...`

## Estructura del repo

```
e2e-ecommerce/
├── .github/workflows/e2e.yml   # cron */15 + Google Chat en fallo
├── CONTEXT.md                  # este archivo
├── scripts/setup-github.sh     # primer despliegue (gh + secret)
└── mop-e2e/
    ├── stores/index.js         # config por tienda (rutas, selectores, regex)
    ├── tests/
    │   ├── checkout.spec.js    # 4 tests × 3 tiendas = 12 tests
    │   └── helpers.js          # cookies, talla, carrito, checkout
    ├── playwright.config.js    # 1 proyecto Playwright por tienda
    ├── package.json
    └── README.md
```

## Tests (12 en total)

Por cada tienda (`themopbookstore`, `thecampamento`, `emestudios`):

1. `home carga y muestra navegación`
2. `catálogo lista productos`
3. `ficha de producto: precio y botón de añadir visibles`
4. `camino crítico: producto → carrito → inicio de checkout`

Ejecutar solo una tienda: `npm test -- --project=emestudios`

## Flujos mapeados en producción

### themopbookstore.com

- **Home** `/` — título contiene "MOP"; nav con BOOKSTORE.
- **Catálogo** `/bookstore/bookstore-annie-leibovitz` — enlaces `/products/...`.
- **Producto** `/products/annie-leibovitz-in-wonderland` — precio `NN.NN EUR`.
- **Cookies** — banner "Aceptar todas las cookies" / "Sólo las esenciales".
- **Cesta** — botón `Cesta (N)`; cajón con "Subtotal".
- **Checkout** — enlace **"Continuar con el pago"** (es `<a>`, no `<button>`).

### thecampamento.com

- **Locale** — `/es/en/...` (inglés en España). `locale: en-GB` en Playwright.
- **Home** `/es/en` — título contiene "Campamento".
- **Catálogo** `/es/en/kid` — enlaces `/es/en/product/...`.
- **Producto** `/es/en/product/falling-star-sweatshirt` — precio `€NN.NN`.
- **Cookies** — "ACCEPT ALL" / "REJECT OPTIONAL".
- **Talla obligatoria** — seleccionar talla (ej. `7/8`) antes de "ADD TO CART".
- **Cesta** — botón `bag N`; cajón con "TOTAL" y botón **"CHECKOUT"** (no enlace).
- **Popup Klaviyo** — puede cerrar el cajón; el test reabre con el botón `bag`.

### emestudios.com

- **Locale** — `/es/es/...`. `locale: es-ES` en Playwright.
- **Home** `/es/es/` — título "Eme Studios" / "Always Grateful".
- **Catálogo** `/es/es/best-sellers` — enlaces `/es/es/product/...`.
- **Producto** `/es/es/product/roots-shadow-oversized-tee` — precio `NN,NN €`.
- **Cookies** — botón "ACEPTAR".
- **Talla obligatoria** — seleccionar (ej. `M`) antes de "AÑADIR AL CARRITO".
- **Cesta** — cajón con "Total" (no "Subtotal") y botón **"PAGAR"**.
- **Popup suscripción** — "NO, NO QUIERO RECIBIR DESCUENTOS" puede tapar el cajón.

## Decisiones de diseño

- **Config por tienda** en `stores/index.js`; tests genéricos leen `testInfo.project.name`.
- **Selectores por rol/texto**, no CSS frágil ni `data-testid` (no expuestos).
- **Timeouts altos** (test 45s, navegación 30s): SSR + cold start Fly.io.
- **`retries: 1` solo en CI** — reduce falsos positivos de red.
- **WebKit desactivado** — activar si hay incidencias Safari (histórico en MOP).

## CI / alertas

- Workflow: [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml)
- Secret: `GOOGLE_CHAT_WEBHOOK` (URL del webhook de Google Chat Workspace)
- En fallo: mensaje a Google Chat con enlace al run de Actions + artefacto `playwright-report`

## Setup rápido

```bash
cd mop-e2e
npm install
npx playwright install chromium
npm test                    # las 3 tiendas
npm test -- --project=thecampamento
npm run test:ui             # depurar selectores
```

## Añadir o cambiar una tienda

1. Añadir entrada en [`mop-e2e/stores/index.js`](mop-e2e/stores/index.js).
2. Mapear en producción con `npm run test:ui` (no inventar selectores).
3. Confirmar URL de checkout con un flujo manual.
4. Actualizar este CONTEXT.md.

## Tareas pendientes / ideas

- [ ] Activar WebKit en `playwright.config.js`.
- [ ] Health check ligero (fetch sin navegador) complementario al E2E.
- [ ] Incluir nombre de tienda fallida en el mensaje de Google Chat (parsear reporte).

## Cosas que NO hacer

- No completar el pago ni generar pedidos reales.
- No acoplar tests al repo del cliente.
- No meter URLs de webhook en el código (solo secret de GitHub).
