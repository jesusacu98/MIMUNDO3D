import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  devIndicators: false,
  // OpenSCAD compilado a WASM (~11MB): se carga desde node_modules en vez de empaquetarse.
  serverExternalPackages: ["openscad-wasm-prebuilt"],
  // El generador de anuncios lee fuentes y el logo con fs: sin esto Vercel no los empaqueta.
  outputFileTracingIncludes: {
    "/api/admin/anuncios/generate": ["./assets/fonts/**/*", "./public/logo.png"],
  },
  images: {
    // Sin optimizador de Vercel: su cuota gratis se agotó y las imágenes devolvían 402 «Payment
    // required» al azar (catálogo y admin). Las fotos se sirven directo desde Supabase Storage, ya
    // reducidas al subirlas (lib/storage.ts). Para volver al optimizador, quitar esta línea.
    unoptimized: true,
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  experimental: {
    serverActions: {
      // Default es 1MB; las imágenes de producto (máx. 10MB) necesitan más espacio,
      // más margen extra para el overhead de multipart/form-data.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
