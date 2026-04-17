import QRCode from 'qrcode';
import type { QrOptions } from '../types';

export interface RenderResult {
  svg: string;
  sizeModules: number;
}

const TRIANGLE_MODULES = 7;
const RIM_MODULES = 1;

export function renderSvg(text: string, opts: QrOptions): RenderResult {
  const qr = QRCode.create(text, { errorCorrectionLevel: opts.ecc });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const qz = opts.quietZone;
  const offset = qz + RIM_MODULES;
  const total = n + 2 * offset;

  const rects: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) {
        rects.push(`<rect x="${x + offset}" y="${y + offset}" width="1" height="1"/>`);
      }
    }
  }

  const frame = `<path d="M0,0 H${total} V${total} H0 Z M${RIM_MODULES},${RIM_MODULES} V${total - RIM_MODULES} H${total - RIM_MODULES} V${RIM_MODULES} Z" fill="#000" fill-rule="evenodd"/>`;

  const t = TRIANGLE_MODULES;
  const trianglePoints = `${total},${total} ${total - t},${total} ${total},${total - t}`;
  const triangle =
    opts.part === 1
      ? `<polygon points="${trianglePoints}" fill="#000"/>`
      : `<polygon points="${trianglePoints}" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="miter"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#000">${rects.join('')}</g>${frame}${triangle}</svg>`;

  return { svg, sizeModules: total };
}
