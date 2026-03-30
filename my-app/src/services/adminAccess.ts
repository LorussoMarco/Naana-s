const RAW_ADMIN_LOGIN_PATH = import.meta.env.VITE_ADMIN_LOGIN_PATH || '/access-admin';
const RAW_ADMIN_ORIGIN = import.meta.env.VITE_ADMIN_ORIGIN || '';
const RAW_ADMIN_HOST = import.meta.env.VITE_ADMIN_HOST || '';

export function getAdminLoginPath(): string {
  if (!RAW_ADMIN_LOGIN_PATH) return '/access-admin';
  return RAW_ADMIN_LOGIN_PATH.startsWith('/') ? RAW_ADMIN_LOGIN_PATH : `/${RAW_ADMIN_LOGIN_PATH}`;
}

export function getAdminHomePath(): string {
  return '/admin/products';
}

export function isAdminHost(): boolean {
  if (typeof window === 'undefined') return true;

  const currentHost = window.location.host;
  const configuredHosts = RAW_ADMIN_HOST.split(',').map((h: string) => h.trim()).filter(Boolean);

  // If no host restriction is configured, keep current behavior for local/dev.
  if (configuredHosts.length === 0) return true;

  return configuredHosts.includes(currentHost);
}

export function getAdminLoginUrl(): string {
  const path = getAdminLoginPath();
  if (RAW_ADMIN_ORIGIN) {
    const origin = RAW_ADMIN_ORIGIN.endsWith('/') ? RAW_ADMIN_ORIGIN.slice(0, -1) : RAW_ADMIN_ORIGIN;
    return `${origin}${path}`;
  }
  return path;
}

export function redirectToAdminLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = getAdminLoginUrl();
  }
}