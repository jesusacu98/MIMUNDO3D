@AGENTS.md

# MIMUNDO3D

Sitio web (Next.js App Router) de un emprendimiento de impresión 3D. Combina un sitio de marketing (landing + catálogo) con una herramienta de cobro por NFC (`/pago/[client_id]`) respaldada por Supabase. Deploy en Vercel, automático con cada push a `main`.

Para el detalle completo de rutas, modelo de datos, seguridad y decisiones de diseño, ver **[ARQUITECTURA.md](./ARQUITECTURA.md)**. Para el esquema exacto de Supabase y lineamientos visuales por tabla/color, ver **[DEVELOPMENT_AI.md](./DEVELOPMENT_AI.md)**.

## Comandos

```bash
npm run dev     # servidor de desarrollo (http://localhost:3000)
npm run build   # build de producción — correr antes de dar por terminado cualquier cambio
npm run lint    # eslint (eslint-config-next)
```

No hay test runner configurado. Los scripts en `scripts/` (`seed.js`, `test-query.js`, `test-query-admin.js`) son utilidades manuales contra Supabase, no pruebas automatizadas — se corren con `node scripts/<archivo>.js` y requieren variables de entorno en `.env.local`.

## Stack

Next.js 16.2.10 (App Router) · React 19.2.4 · TypeScript (strict) · Tailwind CSS v4 · Supabase (`@supabase/supabase-js`) · lucide-react.

## Reglas críticas de esta versión de Next.js

Antes de escribir código nuevo, revisar `node_modules/next/dist/docs/` (ver [AGENTS.md](./AGENTS.md)) — esta versión tiene cambios respecto a lo que suele asumirse por defecto. Las dos reglas ya vigentes en el código existente:

- **`params` y `searchParams` son `Promise`.** En Server Components / Route Handlers: `const { x } = await params`. En Client Components no se puede usar `await` de nivel superior — usar el hook `use()` de React, como en [app/pago/[client_id]/page.tsx](app/pago/[client_id]/page.tsx).
- **`'use client'`** es obligatorio en cualquier componente que use hooks (`useState`, `useEffect`, `use`) o APIs del navegador (`navigator.clipboard`).
- **`middleware.ts` está deprecado, se llama `proxy.ts`** (función exportada `proxy`, no `middleware`). Ver [proxy.ts](proxy.ts).
- **`cookies()` fuerza renderizado dinámico.** Si un Server Component público (ej. `/`, `/catalogo`) necesita saber si hay sesión, no lo hagas leyendo cookies ahí — rompe el prerender estático/ISR. Usar un Client Component que consulte la sesión (ver [components/AdminNavLink.tsx](components/AdminNavLink.tsx)).

## Convenciones del proyecto

- Alias de import: `@/*` apunta a la raíz (`@/lib/...`, `@/components/...`).
- Server Components por defecto; sólo marcar `'use client'` cuando se necesita interactividad.
- El estilado es Tailwind puro por archivo — no hay un design system ni componentes de botón/card compartidos. Si se agregan piezas de UI reutilizables, hacerlo de forma incremental, sin forzar una refactorización general no pedida.
- El sitio mezcla temas: `/` es claro, `/catalogo` es oscuro, `/pago/[client_id]` es una tarjeta blanca standalone. Esto es intencional/heredado, no un bug — no "corregir" la paleta de una página sin que se pida explícitamente.

## Supabase: varios clientes con privilegios distintos

- `lib/supabaseClient.ts` — anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), sujeta a RLS. Usado para lecturas públicas (catálogo en `app/catalogo/page.tsx`, categorías/colores).
- `lib/supabaseAdmin.ts` — service role key (`SUPABASE_SERVICE_ROLE_KEY`), bypassa RLS. Se usa en Route Handlers (`app/api/pago/[client_id]/route.ts`) **y** en Server Actions/Server Components dentro de `/admin` (ej. `app/admin/productos/actions.ts`), ya que esa área está protegida por `proxy.ts` + verificación de rol en cada página. **Nunca** importar este archivo desde un Client Component ni exponer esa clave al navegador.
- `lib/supabase/server.ts` y `lib/supabase/browser.ts` — clientes con sesión de auth basada en cookies (`@supabase/ssr`), para el login/rol de `/admin`. `lib/supabase/middleware.ts` es el helper que usa `proxy.ts` para refrescar la sesión en cada request.

Variables de entorno esperadas en `.env.local` (no está en el repo, ver `.gitignore`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

Si se modifica el esquema de las tablas en Supabase, actualizar a mano `lib/database.types.ts` (no se genera automáticamente en este proyecto). Los `CREATE TABLE`/seeds viven en `supabase/*.sql` (correr manualmente en el SQL Editor de Supabase — no hay CLI/migraciones automatizadas).

## Auth y admin (`/admin`)

- Login con Supabase Auth (`/admin/login`), rol en la tabla `user_roles` (`'user'` | `'admin'`). Sólo `'admin'` puede entrar a `/admin/*`.
- `proxy.ts` (raíz) protege las rutas — en esta versión de Next.js el archivo se llama `proxy.ts`/`export function proxy()`, **no** `middleware.ts` (deprecado, ver §"Reglas críticas").
- Cada página bajo `/admin` además re-verifica sesión+rol server-side (defensa en profundidad, no depender sólo del proxy).
- No hay registro público: los usuarios admin se crean directo en Supabase (ver `supabase/seed_admin.sql`).

## Datos sensibles

`card_number` y `interbank_clabe` se guardan y se muestran en texto plano en una ruta pública sin autenticación (`/pago/[client_id]`). El único control de acceso es que `client_id` no sea adivinable. No agregar logging de estos valores, no exponerlos en el cliente más de lo necesario, y avisar antes de cambiar cómo se generan o exponen los `client_id`.

## Cosas a tener presentes al tocar código existente

- `app/catalogo/page.tsx` (Server Component, ISR `revalidate = 60`) consulta `products`/`product_categories`/`product_colors` en Supabase y pasa los datos a `app/catalogo/CatalogoClient.tsx` (interactividad). Las escrituras desde `/admin` deben llamar `revalidatePath('/catalogo')` para no esperar los 60s.
- Las imágenes de producto son archivos estáticos en `public/catalogo/`, subidos al repo y deployados — no hay upload de archivos en el admin. El campo `image_url` sólo guarda la ruta (ej. `/catalogo/21.jpg`).
- `app/api/hello/route.ts` es un endpoint de ejemplo del scaffolding inicial (tiene un TODO sin resolver) y no lo consume ninguna página.
- `/pago/[client_id]/page.tsx` es Client Component y hace `fetch` a su propia API en vez de resolver los datos en el servidor; es una decisión existente, no cambiarla salvo que se pida explícitamente optimizar esa ruta.
