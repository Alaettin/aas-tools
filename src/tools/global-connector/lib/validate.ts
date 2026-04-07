export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const ASSET_ID_RE = /^[a-zA-Z0-9_]+$/;

export function validateExcel(
  rows: (string | number | null)[][],
  documentNames: string[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    errors.push('Excel ist leer.');
    return { errors, warnings };
  }

  const header = rows[0] || [];
  if (String(header[0] || '').trim() !== 'Element') {
    errors.push('Zeile 1, Spalte A muss "Element" enthalten.');
  }
  if (String(header[1] || '').trim() !== 'Type') {
    errors.push('Zeile 1, Spalte B muss "Type" enthalten.');
  }

  const assetIds = header.slice(2).map(v => String(v || '').trim()).filter(Boolean);
  const seenIds = new Set<string>();
  for (const id of assetIds) {
    if (!ASSET_ID_RE.test(id)) {
      errors.push(`Asset-ID "${id}" enthält ungültige Zeichen (nur Buchstaben, Zahlen, Underscore erlaubt).`);
    }
    if (seenIds.has(id)) {
      errors.push(`Asset-ID "${id}" ist doppelt.`);
    }
    seenIds.add(id);
  }

  if (rows.length > 1) {
    const marker = String(rows[1]?.[0] || '').trim();
    if (marker !== 'Hierarchy levels') {
      errors.push('Zeile 2, Spalte A muss "Hierarchy levels" enthalten.');
    }
  } else {
    errors.push('Zeile 2 fehlt (Hierarchy levels Marker).');
  }

  let separatorRow = -1;
  for (let i = 2; i < rows.length; i++) {
    const element = String(rows[i]?.[0] || '').trim();
    const type = String(rows[i]?.[1] || '').trim();
    if (!element && !type) {
      separatorRow = i;
      break;
    }
  }

  if (separatorRow === -1 && rows.length > 2) {
    errors.push('Es fehlt eine Leerzeile als Trenner zwischen Hierarchy-Levels und Datapoints.');
  }

  if (separatorRow >= 0) {
    const docNamesSet = new Set(documentNames);
    const prefixedKeys = new Map<string, Set<string>>();

    for (let i = separatorRow + 1; i < rows.length; i++) {
      const element = String(rows[i]?.[0] || '').trim();
      const type = String(rows[i]?.[1] || '').trim();
      if (!element && !type) continue;

      if (element && (element.startsWith('EN:') || element.startsWith('DE:'))) {
        const prefix = element.substring(0, 2) as 'EN' | 'DE';
        const cleanKey = element.substring(3);
        if (!prefixedKeys.has(cleanKey)) prefixedKeys.set(cleanKey, new Set());
        prefixedKeys.get(cleanKey)!.add(prefix);
      }

      if (element && !type) {
        errors.push(`Zeile ${i + 1}: "${element}" hat keinen Type (Property oder Document erforderlich).`);
        continue;
      }

      if (type && type !== 'Property' && type !== 'Document') {
        errors.push(`Zeile ${i + 1}: Unbekannter Type "${type}" (erlaubt: Property, Document).`);
        continue;
      }

      if (type === 'Document') {
        for (let c = 2; c < header.length; c++) {
          const cellValue = String(rows[i]?.[c] || '').trim();
          if (cellValue && !docNamesSet.has(cellValue)) {
            warnings.push(`Zeile ${i + 1}: Datei "${cellValue}" nicht in Documents gefunden.`);
          }
        }
      }
    }

    for (const [cleanKey, langs] of prefixedKeys) {
      if (langs.size === 1) {
        const missing = langs.has('EN') ? 'DE' : 'EN';
        errors.push(`"${[...langs][0]}:${cleanKey}" existiert, aber "${missing}:${cleanKey}" fehlt.`);
      }
    }
  }

  return { errors, warnings };
}
