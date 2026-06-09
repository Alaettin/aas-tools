export const PROXY_NAME_MAX = 100;

export function validateProxyName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name ist erforderlich.';
  if (trimmed.length > PROXY_NAME_MAX) return `Max. ${PROXY_NAME_MAX} Zeichen.`;
  return null;
}

export function validateTargetUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return 'Nur http(s) URLs sind erlaubt.';
    }
    return null;
  } catch {
    return 'Ungültige URL.';
  }
}
