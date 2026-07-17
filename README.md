# 🚀 MIMUNDO3D - Impresión 3D & Soluciones NFC

MIMUNDO3D es una plataforma web Full Stack para un emprendimiento de impresión 3D. Este proyecto está construido con **Next.js** (App Router), con una base de datos relacional **Supabase** y listo para ser desplegado en **Vercel**.

## 📋 Características

1. **Landing Page (`/`):** Página de inicio moderna con servicios de impresión FDM, SLA, modelado 3D y soluciones NFC.
2. **Catálogo de Productos (`/catalogo`):** Buscador y filtros de categorías interactivos para explorar el catálogo de piezas 3D.
3. **Página de Datos de Pago NFC (`/pago/[client_id]`):** Ruta dinámica que consulta en tiempo real a Supabase para mostrar los datos bancarios del cliente (beneficiario, banco, CLABE) y permite copiar la CLABE con un solo clic.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** [Next.js 16 (App Router)](https://nextjs.org/) con [React 19](https://react.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Base de Datos:** [Supabase](https://supabase.com/) (`@supabase/supabase-js`)
- **Iconos:** [Lucide React](https://lucide.dev/)

---

## 🚀 Inicialización y Vinculación a GitHub

Sigue estos pasos en tu terminal para inicializar el repositorio local y vincularlo al repositorio remoto vacío de GitHub:

```bash
# 1. Inicializar el repositorio Git
git init

# 2. Agregar el repositorio remoto de GitHub
git remote add origin https://github.com/jesusacu98/MIMUNDO3D.git

# 3. Asegurar que estamos en la rama principal 'main'
git branch -M main

# 4. Crear el commit inicial con los archivos generados
git add .
git commit -m "feat: estructura inicial con Landing, Catálogo e Integración Supabase NFC"

# 5. Subir el código a GitHub
git push -u origin main
```

---

## ⚙️ Configuración del Entorno Local

1. Crea un archivo `.env.local` en la raíz (ya preconfigurado por la inicialización):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://ffxdmtjueqkfxizsjhbp.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mdWGKKsfDlT_1smVB8w2ag_vjF1pL7W
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

4. Compila el proyecto para producción para comprobar errores:
   ```bash
   npm run build
   ```

---

## 🌐 Despliegue en Vercel

1. Ve a [Vercel](https://vercel.com/) e inicia sesión.
2. Haz clic en **"Add New"** > **"Project"**.
3. Importa el repositorio **MIMUNDO3D** desde tu cuenta de GitHub.
4. En **Environment Variables**, añade las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**. ¡Tu aplicación estará en línea y sincronizada automáticamente con cada `git push`!

---

## 📁 Estructura del Código

- `/app`: Rutas del App Router, layouts y vistas principales.
- `/components`: Componentes reutilizables, incluido `PaymentCard.tsx` (con lógica de copiado).
- `/lib`: Utilidades de conexión, cliente de Supabase e interfaces TypeScript de base de datos.
- `/public`: Activos estáticos, logotipos e iconos.
