export type QrPart = 1 | 2;
export type EccLevel = 'L' | 'M' | 'Q' | 'H';
export type ExportSize = 256 | 512 | 1024 | 2048;

export interface QrOptions {
  part: QrPart;
  ecc: EccLevel;
  quietZone: number;
}

export const DEFAULT_OPTIONS: QrOptions = {
  part: 1,
  ecc: 'M',
  quietZone: 4,
};

export const EXPORT_SIZES: ExportSize[] = [256, 512, 1024, 2048];
