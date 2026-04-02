export const CONNECTOR_NAME_MAX = 100;
export const HIERARCHY_NAME_MAX = 60;
export const HIERARCHY_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
export const DATAPOINT_ID_MAX = 120;
export const DATAPOINT_ID_REGEX = /^[a-zA-Z0-9._]+$/;
export const FILE_ID_MAX = 120;
export const FILE_ID_REGEX = /^[a-zA-Z0-9._]+$/;
export const ASSET_ID_MAX = 120;
export const ASSET_ID_REGEX = /^[A-Za-z0-9]+$/;

export function validateConnectorName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name ist erforderlich.';
  if (trimmed.length > CONNECTOR_NAME_MAX) return `Max. ${CONNECTOR_NAME_MAX} Zeichen.`;
  return null;
}

export function validateHierarchyName(name: string): string | null {
  if (!name) return 'Name ist erforderlich.';
  if (name.length > HIERARCHY_NAME_MAX) return `Max. ${HIERARCHY_NAME_MAX} Zeichen.`;
  if (!HIERARCHY_NAME_REGEX.test(name)) return 'Nur Buchstaben, Zahlen, _ und - erlaubt.';
  return null;
}

export function validateDatapointId(id: string): string | null {
  if (!id) return 'ID ist erforderlich.';
  if (id.length > DATAPOINT_ID_MAX) return `Max. ${DATAPOINT_ID_MAX} Zeichen.`;
  if (!DATAPOINT_ID_REGEX.test(id)) return 'Nur Buchstaben, Zahlen, . und _ erlaubt.';
  return null;
}

export function validateFileId(id: string): string | null {
  if (!id) return 'ID ist erforderlich.';
  if (id.length > FILE_ID_MAX) return `Max. ${FILE_ID_MAX} Zeichen.`;
  if (!FILE_ID_REGEX.test(id)) return 'Nur Buchstaben, Zahlen, . und _ erlaubt.';
  return null;
}

export function validateAssetId(id: string): string | null {
  if (!id) return 'ID ist erforderlich.';
  if (id.length > ASSET_ID_MAX) return `Max. ${ASSET_ID_MAX} Zeichen.`;
  if (!ASSET_ID_REGEX.test(id)) return 'Nur Buchstaben und Zahlen erlaubt.';
  return null;
}
