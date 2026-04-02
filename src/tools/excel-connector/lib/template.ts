import { utils, write } from 'xlsx';

const TEMPLATE_DATA = [
  // Row 0: Header
  ['Element', 'Type', 'ASSET001', 'ASSET002'],
  // Row 1: Hierarchy marker
  ['Hierarchy levels', '', '', ''],
  // Row 2-5: Hierarchy levels
  ['Segment', '', 'Example Segment', 'Example Segment'],
  ['Main Group', '', 'Example Group', 'Example Group'],
  ['Group', '', 'Example Subgroup', 'Example Subgroup'],
  // Row 6: Empty separator
  ['', '', '', ''],
  // Row 7+: Datapoints
  ['EN:ProductName', 'Property', 'Product A', 'Product B'],
  ['DE:ProductName', 'Property', 'Produkt A', 'Produkt B'],
  ['SerialNumber', 'Property', 'SN001', 'SN002'],
  ['Manufacturer', 'Property', 'Example GmbH', 'Example GmbH'],
  ['EN:Description', 'Property', 'A sample product', 'Another product'],
  ['DE:Description', 'Property', 'Ein Beispielprodukt', 'Ein weiteres Produkt'],
  ['EN:ProductImage', 'Document', 'product_a.png', 'product_b.png'],
  ['DE:ProductImage', 'Document', '', ''],
  ['EN:Datasheet', 'Document', 'datasheet_a.pdf', 'datasheet_b.pdf'],
  ['DE:Datasheet', 'Document', '', ''],
];

export function createTemplateBlob(): Blob {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(TEMPLATE_DATA);

  // Column widths
  ws['!cols'] = [
    { wch: 28 }, // A: Element
    { wch: 12 }, // B: Type
    { wch: 24 }, // C: Asset 1
    { wch: 24 }, // D: Asset 2
  ];

  utils.book_append_sheet(wb, ws, 'Asset data');

  const buf = write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function createTemplateArrayBuffer(): ArrayBuffer {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(TEMPLATE_DATA);

  ws['!cols'] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 24 },
    { wch: 24 },
  ];

  utils.book_append_sheet(wb, ws, 'Asset data');
  return write(wb, { type: 'array', bookType: 'xlsx' });
}
