// Permisos que necesita el token para publicar (Facebook Login). Archivo sin dependencias de servidor
// para poder importarlo también desde la pantalla del admin.
export const REQUIRED_PERMISSIONS = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'] as const;

export function missingPermissions(granted: string[]): string[] {
  return REQUIRED_PERMISSIONS.filter((p) => !granted.includes(p));
}
