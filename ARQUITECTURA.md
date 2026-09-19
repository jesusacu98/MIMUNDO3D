# Arquitectura — MIMUNDO3D

Documento técnico de referencia sobre cómo está construido el sitio. Para reglas de convenciones al escribir código ver [CLAUDE.md](./CLAUDE.md); para el detalle exacto del esquema de Supabase y lineamientos de UI ver [DEVELOPMENT_AI.md](./DEVELOPMENT_AI.md).

## 1. Qué es el proyecto

Sitio web de MIMUNDO3D, un emprendimiento de impresión 3D (FDM, SLA, modelado y productos NFC). El sitio cumple tres funciones distintas:

1. **Marketing / catálogo**: landing page y catálogo de productos para captar clientes.
2. **Herramienta de cobro NFC**: cada expositor físico con chip NFC apunta a una URL `/pago/[client_id]` que muestra los datos bancarios de un cliente/negocio para recibir transferencias, con botón de copiado rápido (pensado para pagos por transferencia SPEI en México) y, opcionalmente, un botón de WhatsApp.
3. **Gestión interna del negocio** (`/admin`, protegido por auth): catálogo, clientes (NFC y redes), pedidos/ventas, inversión/gastos, una calculadora de costos y un generador de códigos QR. Ver §4bis.

Estas funciones comparten el mismo Next.js app pero no comparten datos entre sí más allá de lo que el admin gestiona: el catálogo público y la página de pago son consumidores de datos que sólo se editan desde `/admin`.

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.10 (App Router) — ver advertencia de versión en [AGENTS.md](./AGENTS.md) |
| UI | React 19.2.4 |
| Lenguaje | TypeScript 5 (`strict: true`) |
| Estilos | Tailwind CSS v4 (vía `@tailwindcss/postcss`, sin `tailwind.config`) |
| Iconos | lucide-react |
| QR | `qrcode` (sólo para generar el SVG en `/admin/qr`, ver §3) |
| Base de datos | Supabase (Postgres + `@supabase/supabase-js`) |
| Hosting | Vercel, deploy automático en cada `git push` a `main` |
| Fuentes | Geist Sans / Geist Mono vía `next/font/google` |

No hay backend propio: la única "API" es un puñado de Route Handlers dentro de `app/api/`, y la persistencia vive enteramente en Supabase.

## 3. Estructura de carpetas

```
app/
  layout.tsx                 Root layout, fuentes y metadata global
  page.tsx                   Landing page ("/") — contenido estático
  globals.css                Import de Tailwind + tema claro/oscuro por CSS vars
  catalogo/
    page.tsx                 Catálogo ("/catalogo") — Server Component async, consulta Supabase (anon key) con ISR (revalidate = 60s)
    CatalogoClient.tsx        Client Component: búsqueda, filtro, modal de producto y footer; recibe productos/categorías/colores como props
  pago/[client_id]/
    page.tsx                 Página de pago NFC — Client Component, fetch a la API propia
  admin/                     Panel de gestión interna, protegido por proxy.ts + verificación de rol por página (ver §4bis)
    page.tsx                 Dashboard: KPIs de negocio (inversión, ingresos, costos, ganancia, ROI) + accesos a cada módulo
    AdminHeader.tsx           Header compartido (nav + logout) para todas las páginas de /admin
    login/page.tsx            Login con Supabase Auth
    productos/                CRUD de productos del catálogo (crear/editar; borrar sólo vía is_active)
    categorias/                CRUD de categorías (crear/editar/borrar)
    subcategorias/             CRUD de subcategorías por categoría (crear/editar/borrar); se asignan a cada producto en /admin/productos
    clientes/                   Alta/edición de clientes con dos secciones en el mismo formulario: NFC (logo, color de marca, WhatsApp, cuenta bancaria) y Redes (links por red)
    pedidos/                    Ventas: alta/edición de pedidos con líneas de producto, estatus, anticipo/pago, KPIs de cobranza
    inversion/                  Registro de gastos/inversión del negocio (fecha, concepto, costo, quién pagó)
    calculadora/                 Calculadora de costo/precio de impresión (client-only, no persiste en Supabase)
    qr/                          Generador de códigos QR (SVG) para URLs (ej. las de /pago/[client_id])
  api/
    hello/route.ts           Endpoint de ejemplo/placeholder (no usado en producción)
    pago/[client_id]/route.ts  Endpoint real: consulta Supabase con la service role key
  r/[client_id]/[network]/route.ts  Redirección corta pública (302) a la red social guardada del cliente; acepta alias (`ig`, `fb`, `tt`, `wa`...). Si no existe, redirige a `/`
components/
  ProductCarousel.tsx           Carrusel horizontal de tarjetas de producto (home y "Productos similares" de la ficha)
  PaymentCard.tsx             Tarjeta de datos bancarios + copiado al portapapeles + botón de WhatsApp opcional
  TrackedLink.tsx              Wrapper de `<a>` que dispara eventos de GA4 al hacer click (usado en los footers)
  AdminNavLink.tsx              Client Component: muestra el link a /admin en la nav pública sólo si hay sesión (evita leer cookies en Server Components públicos)
  SubmitButton.tsx               Botón de submit con estado de carga (`useFormStatus`), usado en los formularios de /admin
  PageSpinner.tsx                 Spinner compartido para los `loading.tsx` de rutas server-side
lib/
  supabaseClient.ts           Cliente Supabase con anon key (público) — usado por `/catalogo` (lectura pública vía RLS)
  supabaseAdmin.ts             Cliente Supabase con service role key (server-only, bypass RLS) — usado en Route Handlers y en Server Actions/páginas de /admin
  supabase/server.ts, browser.ts, middleware.ts  Clientes con sesión de auth (`@supabase/ssr`) para login/rol de /admin; middleware.ts lo usa proxy.ts
  auth.ts                        `isCurrentUserAdmin()` — helper server-side usado por las Server Actions de /admin
  database.types.ts            Tipado manual de las tablas de Supabase
  gtag.ts                       Helpers tipados para Google Analytics 4 (`pageview`, `event`)
  orderStatuses.ts               Constantes de estatus/método de pago de pedidos (`ORDER_STATUSES`, `PAYMENT_STATUSES`, `PAYMENT_METHODS`) y sus clases de color
  qr.ts                           `buildQrSvg()` — genera el QR como SVG a mano (rects, no `toString(..., {type:'svg'})`) para que escale limpio en preview responsive
  storage.ts                      Sube/borra imágenes de producto y logos de clientes NFC en el bucket público `catalogos` de Supabase Storage
scripts/
  seed.js                       Inserta/actualiza un cliente y cuenta de prueba (ID "1")
  test-query.js                 Query de prueba usando la anon key
  test-query-admin.js           Query de prueba usando la service role key
supabase/
  schema_catalog.sql            DDL de `product_categories` / `products` / `product_colors` + RLS
  seed_catalog.sql              Seed del catálogo (categorías, colores, productos)
  schema_auth.sql                DDL de `user_roles` + políticas
  schema_business*.sql (v2-v9)     Migraciones incrementales sobre `clients`/`client_bank_accounts` y las tablas de negocio (`orders`, `order_items`, `investments`), aplicadas a mano en el SQL Editor de Supabase en el orden de su sufijo
  seed_business.sql               Seed de datos de negocio de prueba
```

## 4. Mapa de rutas y su naturaleza

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component (ISR 60s) | Landing: carrusel de Tendencia (arriba de todo), hero, categorías, carruseles de Novedades y Promociones, servicios (FDM/SLA/NFC/Modelado), footer. Tema **claro** (`bg-zinc-50`). |
| `/catalogo` | Server Component async (`page.tsx`) + Client Component (`CatalogoClient.tsx`) | El Server Component consulta `product_categories`/`product_colors`/`products` en Supabase con el cliente anon (RLS de lectura pública) y pasa los datos como props al Client Component, que maneja búsqueda, filtro por categoría y el modal de producto. ISR con `revalidate = 60`. Tema **oscuro** (`bg-slate-950`). |
| `/pago/[client_id]` | Client Component (`'use client'`) | Lee `client_id` de `params` (Promise, ver §6), hace `fetch('/api/pago/${client_id}')` desde el navegador y renderiza `<PaymentCard>` o un estado de error/carga. |
| `/categorias/[categoria]` | Server Component + Client Component (`CategoryProducts.tsx`) | Páginas de categoría del home (`lib/homeCategories.ts`: negocios, llaveros, hogar). El servidor trae los productos activos de la categoría y el cliente los filtra al instante: buscador en tiempo real (espera 350 ms tras dejar de escribir; no va en la URL) y sección de filtros con select de subcategoría (`product_subcategories`) y rango de precio, que sí se guardan en la URL (`?tipo=cortadores-de-galletas&min=100&max=300`) con `history.replaceState`, así que el enlace se puede compartir. "Copiar enlace" sólo se muestra a admins (`lib/useIsAdmin.ts`). Los filtros se conservan al abrir un producto (`?desde=…&tipo=…&min=…&max=…`) y al volver. |
| `/api/hello` | Route Handler | Endpoint de ejemplo dejado por el scaffolding inicial, con un comentario TODO (`//Crear api para obtener los dato de la bd`). No lo consume ninguna página. Candidato a eliminar. |
| `/api/pago/[client_id]` | Route Handler | Único endpoint real de datos. Usa `supabaseAdmin` (service role key) para hacer join `clients` + `client_bank_accounts` y devuelve `{ clientName, logoUrl, brandColor, whatsappNumber, bankAccount }` o 404/400/500. |
| `/admin/*` | Server Components + Server Actions, protegidos | Ver §4bis para el detalle de cada módulo. Tema **claro** (`bg-zinc-50`), igual que la landing. |

### 4bis. Panel de administración (`/admin`)

Todas las rutas bajo `/admin/*` son Server Components async que, además de la protección de `proxy.ts` (§7), vuelven a verificar sesión + rol `admin` en cada página (defensa en profundidad — ver `CLAUDE.md`). Las escrituras van por Server Actions en cada `actions.ts`, todas usando `supabaseAdmin` (bypass RLS) y empezando con `isCurrentUserAdmin()` de `lib/auth.ts`.

| Ruta | Módulo | Qué hace |
|---|---|---|
| `/admin` | Dashboard | KPIs de negocio: inversión total, ingresos, costos de producción, ganancia bruta/neta y ROI (calculados sobre `order_items` + `investments`), y accesos rápidos a cada módulo con sus conteos. |
| `/admin/productos`, `/admin/categorias` | Catálogo | CRUD ya documentado (§8) — productos sin borrar (sólo `is_active`), categorías con borrar. |
| `/admin/clientes` | Clientes | Alta/edición de `clients` con un formulario de dos secciones (tabs NFC / Redes; ambos paneles se envían en un solo guardado). **NFC**: logo (`lib/storage.ts`, bucket `catalogos/logos/`), color de marca, WhatsApp y `client_bank_accounts` (relación 1→1 en la práctica). Los datos bancarios son opcionales como bloque: vacíos = el cliente no tiene página de pago (`/pago/[id]` responde 404); si se captura algo, se validan banco, titular y CLABE/cuenta. Al editar, dejarlos vacíos borra la cuenta existente. **Redes**: un link por red (`lib/socialNetworks.ts`), acepta `@usuario`/número de WhatsApp y muestra el link corto `/r/[id]/[red]` con botón de copiar; guardar hace upsert de las redes con valor y borra las vacías. Borrar un cliente borra también su cuenta bancaria, sus redes (cascade) y su logo si vive en el bucket administrado. |
| `/admin/pedidos` | Pedidos / ventas | Alta/edición de `orders` con N `order_items` (líneas de producto, elegidas desde el catálogo vía `ProductPicker.tsx` o capturadas libres). Página con buscador, filtro por estatus de pedido/pago y paginación server-side (`PAGE_SIZE = 20`), KPIs de venta total/cobrado y contador por estatus. `updateOrder` borra y re-inserta todos los `order_items` del pedido en cada edición (no hace diff). |
| `/admin/inversion` | Inversión / gastos | CRUD simple de `investments` (fecha, descripción, costo, quién pagó), con totales por pagador. |
| `/admin/calculadora` | Calculadora de costos | Client Component puro (`CalculadoraCosto.tsx`), sin persistencia — calcula costo de filamento + energía + desgaste de máquina y sugiere precio de venta según un margen. No lee ni escribe Supabase. |
| `/admin/qr` | Generador de QR | Client Component (`QRGenerator.tsx`) que arma un SVG de QR con `lib/qr.ts` (renderer propio a base de `<path>` de rectángulos, no el `toString(svg)` de la librería `qrcode`, para que escale sin distorsión) y lo descarga. No persiste nada. |

### Nota de diseño: por qué `/pago/[client_id]` no es Server Component

A pesar de que Next.js/Supabase permitirían resolver los datos directamente en el servidor (Server Component + `supabaseAdmin`), la página actual es un Client Component que hace `fetch` a su propia API Route. Esto añade un round-trip extra (carga → loading spinner → fetch → render) en vez de renderizar los datos ya resueltos en el primer HTML. Es una decisión de implementación existente, no un requisito de la plataforma — si se busca reducir el tiempo a contenido visible en dispositivos NFC (que priorizan velocidad), convertir esta ruta a Server Component async es la optimización más directa disponible.

## 5. Modelo de datos (Supabase)

### Catálogo

Tres tablas (ver `supabase/schema_catalog.sql`):

**`product_categories`**
- `id` (uuid, PK), `name` (unique), `display_order`, `created_at`, `updated_at`

**`product_subcategories`**
- `id` (uuid, PK), `category_id` (FK → `product_categories.id`, cascade), `name` (único por categoría), `display_order`, `created_at`, `updated_at`. Se administra en `/admin/subcategorias` y alimenta el select de "Subcategoría" de los filtros de `/categorias/[categoria]`. Lectura pública vía RLS; sólo `supabaseAdmin` escribe.

**`product_colors`**
- Paleta global de colores ofrecida en todos los productos (no hay restricción por producto todavía).
- `id` (uuid, PK), `name` (unique), `hex_code`, `display_order`, `created_at`

**`products`**
- `id` (uuid, PK), `category_id` (FK → `product_categories.id`)
- `price` (numeric, sin símbolo "$" ni texto — el frontend lo formatea) + `is_starting_price` (boolean: `true` = "Desde $X MXN", `false` = precio fijo "$X MXN")
- `cost` (numeric, nullable) — costo de fabricación, **admin-only**: `app/catalogo/page.tsx` no lo incluye en su `select()` con el cliente anon, así que nunca llega al catálogo público aunque RLS no lo bloquee explícitamente por columna.
- `is_trending` / `is_new` / `is_promo` (boolean, default false; `supabase/schema_catalog_v5.sql`) — destacados que se marcan en `/admin/productos` ("Destacar en el inicio") y alimentan los carruseles Tendencia / Novedades y nuevos productos / Promociones y descuentos del home (`lib/featuredProducts.ts`, hasta 12 c/u; novedades por `created_at` más reciente; el home usa ISR `revalidate = 60`). Un carrusel sin productos no se muestra.
- `subcategory_id` (FK → `product_subcategories.id`, `on delete set null`; `supabase/schema_catalog_v4.sql`) — subcategoría opcional del producto, se elige en `/admin/productos` (el select sólo lista las subcategorías de la categoría elegida). La columna de texto `subcategory` de `schema_catalog_v3.sql` quedó sin uso.
- `is_personalizable` / `has_business_info` / `has_character_option` — controlan qué campos del formulario se muestran en el modal de producto
- `is_active` (soft-hide sin borrar) y `display_order` (orden manual)
- Lectura pública vía RLS (`is_active = true`); sólo `supabaseAdmin` puede escribir.

### Pago NFC

Dos tablas, relación 1→N:

**`clients`**
- `id` (bigint/serial, PK) — es el mismo valor (como string) que `[client_id]` en la URL de `/pago/[client_id]`.
- `name`
- `logo_url` (nullable) — logo del negocio, mostrado en `/pago/[client_id]` y en el listado de `/admin/clientes`; subido a Supabase Storage vía `lib/storage.ts` (`uploadClientLogo`), bucket `catalogos/logos/`.
- `brand_color` (nullable, hex `#RRGGBB`) — colorea el botón principal de `PaymentCard.tsx`.
- `whatsapp_number` (nullable, sólo dígitos) — si está presente, `/pago/[client_id]` muestra un botón "Escribir por WhatsApp" (`wa.me/...`); números de 10 dígitos se asumen México y se les antepone `52`.
- `created_at`, `updated_at`

**`client_bank_accounts`**
- `id` (PK)
- `client_id` (FK → `clients.id`)
- `bank_name`
- `card_number` (nullable, texto plano)
- `interbank_clabe` (CLABE interbancaria, texto plano)
- `account_holder_name`
- `created_at`, `updated_at`

El tipado vive a mano en `lib/database.types.ts` (no generado automáticamente por la CLI de Supabase) — si se modifica el esquema en Supabase hay que actualizar este archivo manualmente.

La API sólo toma la **primera** cuenta bancaria asociada a un cliente (`client_bank_accounts[0]`); si un cliente llegara a tener más de una cuenta, el resto se ignora silenciosamente. El admin (`/admin/clientes`) asume lo mismo: siempre lee/escribe una sola cuenta por cliente (crea la primera si no existe, actualiza esa si ya existe, la borra si se dejan vacíos los datos bancarios).

### Pedidos / ventas e inversión (usadas sólo por `/admin`, no tienen contraparte pública)

Dos tablas sin relación FK entre sí (`order_items.product_id` es un vínculo opcional a `products.id`, sin FK declarada en el tipado):

**`orders`**
- `id` (uuid, PK)
- `order_date` (date, nullable), `client_name` (texto libre, no FK a `clients` — es un cliente de venta, no un cliente NFC)
- `payment_status` (`'Pagado' | 'Anticipo' | 'Pendiente'`, ver `lib/orderStatuses.ts`), `payment_method` (texto libre restringido en el form a `PAYMENT_METHODS`, ej. `'Efectivo Jesus'`, `'Transferencia Adriana'`)
- `advance_amount` (numeric, nullable) — monto del anticipo cuando `payment_status = 'Anticipo'`
- `whatsapp_link` (nullable) — link o número del chat de WhatsApp/Meta Business del pedido
- `order_status` (`'Pendiente Cotizar' | 'Pendiente Imprimir' | 'Imprimiendo' | 'Impreso' | 'Entregado' | 'Cancelado'`)
- `created_at`, `updated_at`

**`order_items`**
- `id` (uuid, PK), `order_id` (FK → `orders.id`)
- `product_id` (nullable) — referencia opcional a `products.id`; nulo en líneas personalizadas o fuera de catálogo
- `product_name`, `quantity`, `sale_price` (nullable), `cost` (nullable), `makerworld_link` (nullable)
- `created_at`

`profit` por pedido y los totales globales del dashboard/§4bis se calculan en el frontend (`sale_price - cost` sumado sobre los items), no hay columnas derivadas en la base.

**`client_social_links`** (`supabase/schema_business_v10.sql`)
- `id` (uuid, PK), `client_id` (FK → `clients.id`, `on delete cascade`), `network` (clave de `lib/socialNetworks.ts`), `url`; único por `(client_id, network)`. Sin políticas RLS: sólo `supabaseAdmin` la lee (la ruta pública `/r/...` corre en el servidor).

**`investments`**
- `id` (uuid, PK)
- `expense_date` (date, nullable), `description`, `cost` (numeric), `paid_by` (texto libre, ej. `'Jesus'`/`'Adriana'`)
- `created_at`, `updated_at`

## 6. Reglas de la plataforma que ya están aplicadas en el código

Next 16 cambia el contrato de `params`/`searchParams`: ahora son `Promise`. El código ya sigue esto correctamente:

- En el Route Handler (`app/api/pago/[client_id]/route.ts`): `const { client_id } = await params;`
- En el Client Component (`app/pago/[client_id]/page.tsx`): usa el hook `use(params)` de React 19, ya que `await` de nivel superior no aplica en un Client Component.

Antes de tocar cualquier ruta dinámica nueva, seguir el mismo patrón. Ver también el aviso general en [AGENTS.md](./AGENTS.md) sobre revisar `node_modules/next/dist/docs/` antes de asumir comportamiento de versiones anteriores de Next.js.

## 7. Seguridad y manejo de claves

Hay dos clientes Supabase con privilegios muy distintos:

- **`lib/supabaseClient.ts`** — usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sujeto a las políticas RLS de Supabase. Usado en `app/catalogo/page.tsx` (Server Component) para leer `product_categories`/`product_colors`/`products`; la lectura pública está habilitada vía RLS porque es contenido de marketing sin datos sensibles.
- **`lib/supabaseAdmin.ts`** — usa `SUPABASE_SERVICE_ROLE_KEY`. Bypassa RLS por completo. Se usa en `app/api/pago/[client_id]/route.ts` y también, ahora, en **todas** las Server Actions/páginas de `/admin` (productos, categorías, clientes, pedidos, inversión) — esto es correcto porque `/admin/*` ya está protegido por `proxy.ts` + la re-verificación de rol en cada página (§4bis), pero significa que cualquier bug en esa protección expone lectura/escritura total sin RLS. **Nunca debe importarse desde un Client Component ni exponerse al navegador.**
- **`lib/supabase/server.ts` / `browser.ts` / `middleware.ts`** — clientes con sesión de auth basada en cookies (`@supabase/ssr`), sólo para login/rol de `/admin`; no tocan las tablas de negocio directamente salvo para leer `user_roles`.

Puntos a vigilar:
- `card_number` y `interbank_clabe` se guardan y se transmiten en texto plano (sin cifrar) y se muestran en una página pública sin autenticación — cualquiera con la URL `/pago/[client_id]` puede verlas. Esto es intencional para el caso de uso NFC (mostrar datos de cobro), pero implica que **el valor de `client_id` actúa como el único control de acceso**. `clients.id` es un entero autoincremental (no UUID) — los IDs son secuenciales y por lo tanto adivinables; no cambiar cómo se generan sin avisar (ver `CLAUDE.md`, sección "Datos sensibles").
- El README documenta la anon key públicamente en texto plano — es aceptable porque es una clave pública por diseño (`NEXT_PUBLIC_*`), pero su seguridad real depende de que las políticas RLS en Supabase estén correctamente configuradas para las tablas `clients` y `client_bank_accounts`. Esto no se puede verificar desde el código del repo.
- `products.cost`, y todas las columnas de `orders`/`order_items`/`investments`, son datos de negocio internos (costos, ganancias) — nunca se seleccionan desde el cliente anon ni se exponen a rutas públicas; sólo `supabaseAdmin` dentro de `/admin` los toca.
- `.env*` está en `.gitignore`; no hay archivo `.env.local` en el repo. Las variables de entorno requeridas son:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, no debe llevar el prefijo `NEXT_PUBLIC_`)

## 8. Estado del catálogo (`/catalogo`)

Los productos vienen de Supabase (`product_categories`, `product_colors`, `products`, ver §5). `app/catalogo/page.tsx` es un Server Component async que consulta con el cliente anon y pasa los datos a `CatalogoClient.tsx` (interactividad). ISR con `revalidate = 60` segundos; las Server Actions de `/admin/productos` y `/admin/categorias` llaman `revalidatePath('/catalogo')` al escribir para no esperar esos 60s.

Pendiente: no hay gestión de `product_colors` en el admin — la tabla existe y está sembrada, pero agregar/editar/borrar colores todavía requiere SQL directo.

## 9. Consistencia visual (estado actual, no aspiracional)

El proyecto mezcla dos temas según la ruta, esto es el estado real observado en el código (difiere de lo que describe `DEVELOPMENT_AI.md`, que da por hecho tema oscuro en ambas):

- `/` (landing): tema **claro** — `bg-zinc-50`/`bg-white`, texto `zinc-900`.
- `/catalogo`: tema **oscuro** — `bg-slate-950`, texto `slate-100`.
- `/pago/[client_id]`: fondo `bg-zinc-100` con soporte `dark:` opcional, tarjeta blanca centrada — pensada para verse igual sin depender del tema del sitio, ya que se abre standalone desde un NFC.
- `/admin/*`: tema **claro** consistente en las 6 secciones — `bg-zinc-50`, tarjetas blancas con borde `zinc-200/60` y esquinas grandes (`rounded-2xl`), acento `primary` (gradiente `from-primary to-primary-dark`) en botones principales. Es la única zona del sitio con algo parecido a un lenguaje visual repetido entre páginas, aunque sigue sin ser un design system formal (cada página repite las mismas clases Tailwind en vez de importar un componente compartido).

No hay un design system compartido (tokens, componentes de botón reutilizables, etc.) — cada página define sus propias clases Tailwind de forma independiente.

## 10. Scripts auxiliares

`scripts/*.js` son scripts de Node ejecutados manualmente (`node scripts/seed.js`), no forman parte del build ni de un test runner. Sirven para poblar/verificar datos de prueba en Supabase directamente vía `@supabase/supabase-js`, fuera de la app de Next.js.

## 11. Deploy

Vercel, deploy automático por push a `main`. Variables de entorno de producción se configuran en el dashboard de Vercel (no en el repo). Ver pasos en [README.md](./README.md).
