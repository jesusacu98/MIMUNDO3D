# Arquitectura — MIMUNDO3D

Documento técnico de referencia sobre cómo está construido el sitio. Para reglas de convenciones al escribir código ver [CLAUDE.md](./CLAUDE.md); para el detalle exacto del esquema de Supabase y lineamientos de UI ver [DEVELOPMENT_AI.md](./DEVELOPMENT_AI.md).

## 1. Qué es el proyecto

Sitio web de MIMUNDO3D, un emprendimiento de impresión 3D (FDM, SLA, modelado y productos NFC). El sitio cumple dos funciones distintas:

1. **Marketing / catálogo**: landing page y catálogo de productos para captar clientes.
2. **Herramienta de cobro NFC**: cada expositor físico con chip NFC apunta a una URL `/pago/[client_id]` que muestra los datos bancarios de un cliente/negocio para recibir transferencias, con botón de copiado rápido (pensado para pagos por transferencia SPEI en México).

Estas dos funciones comparten el mismo Next.js app pero no comparten datos entre sí: el catálogo es contenido estático de marketing, la parte de pago es dinámica y depende de Supabase.

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.10 (App Router) — ver advertencia de versión en [AGENTS.md](./AGENTS.md) |
| UI | React 19.2.4 |
| Lenguaje | TypeScript 5 (`strict: true`) |
| Estilos | Tailwind CSS v4 (vía `@tailwindcss/postcss`, sin `tailwind.config`) |
| Iconos | lucide-react |
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
  api/
    hello/route.ts           Endpoint de ejemplo/placeholder (no usado en producción)
    pago/[client_id]/route.ts  Endpoint real: consulta Supabase con la service role key
components/
  PaymentCard.tsx             Tarjeta de datos bancarios + copiado al portapapeles
  TrackedLink.tsx              Wrapper de `<a>` que dispara eventos de GA4 al hacer click (usado en los footers)
lib/
  supabaseClient.ts           Cliente Supabase con anon key (público) — usado por `/catalogo` (lectura pública vía RLS)
  supabaseAdmin.ts             Cliente Supabase con service role key (server-only, bypass RLS)
  database.types.ts            Tipado manual de las tablas de Supabase
  gtag.ts                       Helpers tipados para Google Analytics 4 (`pageview`, `event`)
scripts/
  seed.js                       Inserta/actualiza un cliente y cuenta de prueba (ID "1")
  test-query.js                 Query de prueba usando la anon key
  test-query-admin.js           Query de prueba usando la service role key
supabase/
  schema_catalog.sql            DDL de `product_categories` / `products` / `product_colors` + RLS
  seed_catalog.sql              Seed del catálogo (categorías, colores, productos)
```

## 4. Mapa de rutas y su naturaleza

| Ruta | Tipo | Descripción |
|---|---|---|
| `/` | Server Component (estático) | Landing: hero, servicios (FDM/SLA/NFC/Modelado), footer. Tema **claro** (`bg-zinc-50`). |
| `/catalogo` | Server Component async (`page.tsx`) + Client Component (`CatalogoClient.tsx`) | El Server Component consulta `product_categories`/`product_colors`/`products` en Supabase con el cliente anon (RLS de lectura pública) y pasa los datos como props al Client Component, que maneja búsqueda, filtro por categoría y el modal de producto. ISR con `revalidate = 60`. Tema **oscuro** (`bg-slate-950`). |
| `/pago/[client_id]` | Client Component (`'use client'`) | Lee `client_id` de `params` (Promise, ver §6), hace `fetch('/api/pago/${client_id}')` desde el navegador y renderiza `<PaymentCard>` o un estado de error/carga. |
| `/api/hello` | Route Handler | Endpoint de ejemplo dejado por el scaffolding inicial, con un comentario TODO (`//Crear api para obtener los dato de la bd`). No lo consume ninguna página. Candidato a eliminar. |
| `/api/pago/[client_id]` | Route Handler | Único endpoint real de datos. Usa `supabaseAdmin` (service role key) para hacer join `clients` + `client_bank_accounts` y devuelve `{ clientName, bankAccount }` o 404/400/500. |

### Nota de diseño: por qué `/pago/[client_id]` no es Server Component

A pesar de que Next.js/Supabase permitirían resolver los datos directamente en el servidor (Server Component + `supabaseAdmin`), la página actual es un Client Component que hace `fetch` a su propia API Route. Esto añade un round-trip extra (carga → loading spinner → fetch → render) en vez de renderizar los datos ya resueltos en el primer HTML. Es una decisión de implementación existente, no un requisito de la plataforma — si se busca reducir el tiempo a contenido visible en dispositivos NFC (que priorizan velocidad), convertir esta ruta a Server Component async es la optimización más directa disponible.

## 5. Modelo de datos (Supabase)

### Catálogo

Tres tablas (ver `supabase/schema_catalog.sql`):

**`product_categories`**
- `id` (uuid, PK), `name` (unique), `display_order`, `created_at`, `updated_at`

**`product_colors`**
- Paleta global de colores ofrecida en todos los productos (no hay restricción por producto todavía).
- `id` (uuid, PK), `name` (unique), `hex_code`, `display_order`, `created_at`

**`products`**
- `id` (uuid, PK), `category_id` (FK → `product_categories.id`)
- `price` (numeric, sin símbolo "$" ni texto — el frontend lo formatea) + `is_starting_price` (boolean: `true` = "Desde $X MXN", `false` = precio fijo "$X MXN")
- `is_personalizable` / `has_business_info` / `has_character_option` — controlan qué campos del formulario se muestran en el modal de producto
- `is_active` (soft-hide sin borrar) y `display_order` (orden manual)
- Lectura pública vía RLS (`is_active = true`); sólo `supabaseAdmin` puede escribir.

### Pago NFC

Dos tablas, relación 1→N:

**`clients`**
- `id` (text/UUID, PK) — es el mismo valor que `[client_id]` en la URL.
- `name`
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

La API sólo toma la **primera** cuenta bancaria asociada a un cliente (`client_bank_accounts[0]`); si un cliente llegara a tener más de una cuenta, el resto se ignora silenciosamente.

## 6. Reglas de la plataforma que ya están aplicadas en el código

Next 16 cambia el contrato de `params`/`searchParams`: ahora son `Promise`. El código ya sigue esto correctamente:

- En el Route Handler (`app/api/pago/[client_id]/route.ts`): `const { client_id } = await params;`
- En el Client Component (`app/pago/[client_id]/page.tsx`): usa el hook `use(params)` de React 19, ya que `await` de nivel superior no aplica en un Client Component.

Antes de tocar cualquier ruta dinámica nueva, seguir el mismo patrón. Ver también el aviso general en [AGENTS.md](./AGENTS.md) sobre revisar `node_modules/next/dist/docs/` antes de asumir comportamiento de versiones anteriores de Next.js.

## 7. Seguridad y manejo de claves

Hay dos clientes Supabase con privilegios muy distintos:

- **`lib/supabaseClient.ts`** — usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sujeto a las políticas RLS de Supabase. Usado en `app/catalogo/page.tsx` (Server Component) para leer `product_categories`/`product_colors`/`products`; la lectura pública está habilitada vía RLS porque es contenido de marketing sin datos sensibles.
- **`lib/supabaseAdmin.ts`** — usa `SUPABASE_SERVICE_ROLE_KEY`. Bypassa RLS por completo. Se usa **únicamente** en `app/api/pago/[client_id]/route.ts`, que corre en el servidor. **Nunca debe importarse desde un Client Component ni exponerse al navegador.**

Puntos a vigilar:
- `card_number` y `interbank_clabe` se guardan y se transmiten en texto plano (sin cifrar) y se muestran en una página pública sin autenticación — cualquiera con la URL `/pago/[client_id]` puede verlas. Esto es intencional para el caso de uso NFC (mostrar datos de cobro), pero implica que **el valor de `client_id` actúa como el único control de acceso**. Antes de usar IDs predecibles (secuenciales como `"1"`) en producción, considerar IDs no adivinables (UUID aleatorio).
- El README documenta la anon key públicamente en texto plano — es aceptable porque es una clave pública por diseño (`NEXT_PUBLIC_*`), pero su seguridad real depende de que las políticas RLS en Supabase estén correctamente configuradas para las tablas `clients` y `client_bank_accounts`. Esto no se puede verificar desde el código del repo.
- `.env*` está en `.gitignore`; no hay archivo `.env.local` en el repo. Las variables de entorno requeridas son:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, no debe llevar el prefijo `NEXT_PUBLIC_`)

## 8. Estado del catálogo (`/catalogo`)

Los productos vienen de Supabase (`product_categories`, `product_colors`, `products`, ver §5). `app/catalogo/page.tsx` es un Server Component async que consulta con el cliente anon y pasa los datos a `CatalogoClient.tsx` (interactividad). ISR con `revalidate = 60` segundos, para que las ediciones de un futuro panel de admin se reflejen sin necesidad de un nuevo deploy.

Pendiente: panel de administración para gestionar productos/categorías/colores sin tocar código ni SQL directamente (siguiente pieza de trabajo identificada).

## 9. Consistencia visual (estado actual, no aspiracional)

El proyecto mezcla dos temas según la ruta, esto es el estado real observado en el código (difiere de lo que describe `DEVELOPMENT_AI.md`, que da por hecho tema oscuro en ambas):

- `/` (landing): tema **claro** — `bg-zinc-50`/`bg-white`, texto `zinc-900`.
- `/catalogo`: tema **oscuro** — `bg-slate-950`, texto `slate-100`.
- `/pago/[client_id]`: fondo `bg-zinc-100` con soporte `dark:` opcional, tarjeta blanca centrada — pensada para verse igual sin depender del tema del sitio, ya que se abre standalone desde un NFC.

No hay un design system compartido (tokens, componentes de botón reutilizables, etc.) — cada página define sus propias clases Tailwind de forma independiente.

## 10. Scripts auxiliares

`scripts/*.js` son scripts de Node ejecutados manualmente (`node scripts/seed.js`), no forman parte del build ni de un test runner. Sirven para poblar/verificar datos de prueba en Supabase directamente vía `@supabase/supabase-js`, fuera de la app de Next.js.

## 11. Deploy

Vercel, deploy automático por push a `main`. Variables de entorno de producción se configuran en el dashboard de Vercel (no en el repo). Ver pasos en [README.md](./README.md).
