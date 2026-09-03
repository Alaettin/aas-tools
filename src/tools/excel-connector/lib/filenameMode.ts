export type FilenameMode = 'full' | 'noext' | 'none';

// Normalizes the stored setting. Legacy rows hold a boolean: missing/true = send, false = omit.
export function filenameMode(v: unknown): FilenameMode {
  if (v === 'full' || v === 'noext' || v === 'none') return v;
  return v === false ? 'none' : 'full';
}
