# 🤖 Contexto de Desarrollo con IA - MIMUNDO3D

Este archivo contiene la especificación de arquitectura, base de datos y diseño del proyecto **MIMUNDO3D** para guiar a los asistentes de IA (Claude Code, Cursor, Copilot, etc.) en futuras expansiones del código.

---

## 🏛️ Arquitectura del Proyecto

- **Next.js v16 (App Router):** Utiliza las últimas convenciones estables de React 19.
- **Ruta de datos:** Server Components por defecto para obtener datos de Supabase, y paso de datos a Client Components (`'use client'`) solo cuando se requiere interactividad (como el portapapeles o búsquedas en cliente).
- **Import Aliases:** Configurado con `@/*` apuntando a la raíz (ej: `@/lib/supabaseClient` o `@/components/PaymentCard`).

### ⚠️ Reglas Críticas de Next.js 15/16
1. **Dynamic Params:** En `layout.tsx` y `page.tsx` dinámicos, `params` y `searchParams` son **Promises** y deben ser esperados antes de leer sus propiedades:
   ```typescript
   export default async function PagoPage({ params }: { params: Promise<{ client_id: string }> }) {
     const { client_id } = await params;
     // ...
   }
   ```
2. **Componentes del Cliente:** Para usar Hooks (`useState`, `useRef`, APIs del navegador como `navigator.clipboard`), el componente debe empezar con `'use client'`.

---

## 🗺️ Mapa de Rutas (App Router)

- `/app/page.tsx`: Landing Page (Sección de Hero, Servicios 3D/NFC, Footer).
- `/app/catalogo/page.tsx`: Catálogo Interactivo de Productos (con filtros y barra de búsqueda en tiempo real).
- `/app/pago/[client_id]/page.tsx`: Página dinámica del expositor NFC (Client Component). Realiza un fetch asíncrono a la API y renderiza `<PaymentCard />`.
- `/app/api/pago/[client_id]/route.ts`: Endpoint seguro de la API de pagos. Consulta Supabase en el servidor utilizando `supabaseAdmin`.
- `/components/PaymentCard.tsx`: Tarjeta interactiva de visualización de transferencia y acción de copiado.
- `/lib/supabaseClient.ts`: Inicialización del cliente público de Supabase.
- `/lib/supabaseAdmin.ts`: Inicialización del cliente administrativo de Supabase (servidor-only) para bypass seguro de RLS.
- `/lib/database.types.ts`: Esquema de tipado de base de datos para TypeScript.

---

## 🗄️ Esquema de Supabase (Base de Datos)

### 1. Tabla `clients`
Registra la información del negocio/cliente asociado al NFC.
- `id` (text / UUID): Llave primaria y parámetro identificador en la URL (`/pago/[client_id]`).
- `name` (text): Nombre comercial o comercial del negocio.
- `created_at` (timestamp con zona horaria).
- `updated_at` (timestamp con zona horaria).

### 2. Tabla `client_bank_accounts`
Registra la información bancaria de cada cliente. Relación de muchos a uno con la tabla `clients`.
- `id` (bigint / UUID): Llave primaria.
- `client_id` (text / UUID): Llave foránea que referencia a `clients.id`.
- `bank_name` (text): Nombre de la institución financiera (ej: "BBVA México", "Santander").
- `card_number` (text, opcional): Número de tarjeta de débito de 16 dígitos.
- `interbank_clabe` (text): CLABE interbancaria de 18 dígitos para transferencias.
- `account_holder_name` (text): Nombre del titular de la cuenta bancaria.
- `created_at` (timestamp con zona horaria).
- `updated_at` (timestamp con zona horaria).

### Declaración en TypeScript (`/lib/database.types.ts`):
Si modificas la base de datos o agregas columnas, asegúrate de actualizar el archivo de tipos de TypeScript.
Para realizar consultas uniendo las dos tablas:
```typescript
import { supabase } from "@/lib/supabaseClient";

// Ejemplo de consulta de join tipada
const { data, error } = await supabase
  .from("clients")
  .select(`
    name,
    client_bank_accounts (
      bank_name,
      interbank_clabe,
      account_holder_name
    )
  `)
  .eq("id", client_id)
  .single();
```

---

## 🎨 Lineamientos de Diseño UI/UX

- **Landing y Catálogo:** Tema oscuro sofisticado (`bg-slate-950`), texto claro (`text-slate-100`), detalles con gradientes violeta e índigo (`from-indigo-500 to-purple-600`), bordes sutiles oscuros (`border-slate-900`).
- **Tarjeta NFC (`/pago/[client_id]`):**
  - **Fondo:** Ultra claro/gris suave (`bg-slate-50`) con centrado absoluto, ideal para visualización móvil (dispositivos escaneados por NFC).
  - **Tarjeta:** Contenedor blanco con curvas pronunciadas (`rounded-3xl`), sombra difuminada y suave (`shadow-xl`).
  - **Identidad visual:** Punto rojo sutil de acento (`bg-rose-500 animate-pulse`) en la esquina superior derecha del panel.
  - **Interactividad:** Botón de copiado con retroalimentación inmediata (cambia a color verde y texto "¡Copiado!" por 2 segundos).
