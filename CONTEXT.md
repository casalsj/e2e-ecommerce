# CONTEXT.md — mop-e2e

Contexto para continuar el proyecto en Cursor (o para un agente de IA).
Léeme entero antes de tocar nada.

## Qué es esto

Monitorización sintética end-to-end de **themopbookstore.com** (tienda Shopify
headless), construida como alternativa gratuita a Checkly/servicios externos.

- Stack del test: **Playwright** (JS, ESM).
- Ejecución: **GitHub Actions** en cron cada 15 min + alerta a Slack/n8n si falla.
- Filosofía: el test ataca la **web ya desplegada** como un usuario real.
  **NO** vive dentro del repo del cliente ni importa nada de su código.

## Regla de oro del alcance

El test cubre el camino crítico de compra **hasta el handoff al checkout de
Shopify y se detiene ahí**. El checkout es responsabilidad de Shopify, no del
frontend. **Nunca se completa un pago ni se genera un pedido.** Si en el futuro
se quiere testear más allá, hay que usar la pasarela de pruebas (Bogus Gateway)
de Shopify, no la real.

## Flujo real de la tienda (mapeado navegando, no inventado)

1. **Home** → `https://themopbookstore.com`
   - `<title>` contiene "MOP".
   - Nav superior: BUSCAR / PERFIL / CESTA (N) / MENÚ.
   - Nav secundaria: EXPOSICIONES / BOOKSTORE / MERCHANDISING.
2. **Catálogo** → `/bookstore`
   - Colecciones con URL tipo `/bookstore/bookstore-annie-leibovitz`,
     `/bookstore/bookstore-david-bailey`, etc.
3. **Ficha de producto** → `/products/{handle}`
   - Ej: `/products/annie-leibovitz-in-wonderland`.
   - Precio renderizado como texto `"60.00 EUR"` (patrón `\d+[.,]\d{2}\s*EUR`).
   - Botón de añadir: `<button type="submit">` con texto **"Añadir al carrito"**.
     (No hay `data-testid`; se selecciona por rol + texto.)
4. **Cesta** → botón con `aria-label="Cesta (N)"`. Abre un cajón lateral.
   - El cajón muestra "Subtotal" y las líneas de producto.
   - **Ojo:** la cesta puede arrancar con productos ya dentro (vista en pruebas
     con 1-2 items). El contador es **relativo**: el test lee el incremento, no
     asume que empieza en 0.
5. **Inicio de checkout** → botón **"Continuar con el pago"**.
   - Al pulsarlo redirige al checkout de **Shopify** (`*.shopify.com` o ruta
     `/checkouts/`). **Aquí termina el test.**

## Estructura del repo

```
mop-e2e/
├── tests/checkout.spec.js     # 4 tests (ver abajo)
├── playwright.config.js        # baseURL via BASE_URL, timeouts holgados (SSR+Fly cold start)
├── .github/workflows/e2e.yml   # cron */15 + alerta Slack en fallo
├── package.json                # ESM, scripts test / test:ui / report
├── README.md                   # setup de usuario
├── CONTEXT.md                  # este archivo
└── .gitignore
```

Tests en `tests/checkout.spec.js`:
1. `home carga y muestra navegación`
2. `catálogo bookstore lista productos`
3. `ficha de producto: precio y botón de añadir visibles`
4. `camino crítico: producto → carrito → inicio de checkout`

## Decisiones de diseño ya tomadas (no rehacer sin motivo)

- **Selectores por rol/texto**, no por CSS/píxeles. La tienda no expone
  `data-testid`. Si en algún momento el cliente añade `data-testid`, migrar a
  ellos da más robustez (no se rompen al cambiar copy o diseño).
- **Timeouts altos** (test 45s, navegación 30s): SSR + posible cold start de
  Fly.io. No bajarlos sin medir.
- **`retries: 1` solo en CI**: un fallo puntual suele ser flake de red en
  monitorización; un segundo intento reduce falsos positivos sin ocultar caídas
  reales (si falla 2 veces, salta la alerta).
- **WebKit comentado** en la config. Conviene activarlo (la tienda ha tenido
  incidencias específicas de Safari en el pasado).

## Setup rápido

```bash
npm install
npx playwright install chromium
npm test          # local
npm run test:ui   # modo interactivo de Playwright (ideal para depurar selectores)
```

CI: push a GitHub y crear el secret `SLACK_WEBHOOK` (Settings → Secrets and
variables → Actions). Para n8n, sustituir la URL del `curl` en el workflow.

## Tareas pendientes / ideas (TODO)

- [ ] Primera ejecución real (`npm test`) para confirmar que los selectores
      aguantan en producción y ajustar si algún `getByText`/`getByRole` no casa.
- [ ] Activar el proyecto `webkit` en `playwright.config.js`.
- [ ] **Parametrizar para multi-tienda**: extraer `BASE_URL` + `PRODUCT_PATH` +
      selectores a una config por tienda para reusar el mismo repo en
      emestudios.com y thecampamento.com (ambas Shopify headless del mismo stack).
- [ ] Confirmar el regex de la URL de checkout de Shopify en producción
      (`shopify.com` vs ruta `/checkouts/`) y afinar `waitForURL`.
- [ ] Opcional: health checks ligeros (fetch sin navegador) para disponibilidad
      rápida, dejando Playwright solo para el flujo de UI completo. Un Cloudflare
      Worker con cron trigger es buena opción (gratis, sin cold start).

## Cosas que NO hacer

- No completar el pago ni generar pedidos reales.
- No añadir el test al repo del cliente ni acoplarlo a su código.
- No meter credenciales/tokens en el repo ni en URLs. El `SLACK_WEBHOOK` va como
  secret de GitHub.
