const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function sitePath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? `${base}${path}` : path;
}
