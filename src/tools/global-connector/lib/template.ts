import { utils, write } from 'xlsx';

const TEMPLATE_DATA = [
  // Row 0: Header — only one asset column (GLOBAL)
  ['Element', 'Type', 'GLOBAL'],
  // Row 1: Hierarchy marker
  ['Hierarchy levels', '', ''],
  // Row 2-4: Hierarchy levels
  ['Segment', '', 'Example Segment'],
  ['Main Group', '', 'Example Group'],
  ['Group', '', 'Example Subgroup'],
  // Row 5: Empty separator
  ['', '', ''],
  // Row 6+: Datapoints
  ['EN:ProductName', 'Property', 'Product A'],
  ['DE:ProductName', 'Property', 'Produkt A'],
  ['SerialNumber', 'Property', 'SN001'],
  ['Manufacturer', 'Property', 'Example GmbH'],
  ['EN:Description', 'Property', 'A sample product'],
  ['DE:Description', 'Property', 'Ein Beispielprodukt'],
  ['EN:ProductImage', 'Document', 'product_a.png'],
  ['DE:ProductImage', 'Document', ''],
  ['EN:Datasheet', 'Document', 'datasheet_a.pdf'],
  ['DE:Datasheet', 'Document', ''],
];

export function createTemplateBlob(): Blob {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(TEMPLATE_DATA);

  ws['!cols'] = [
    { wch: 28 }, // A: Element
    { wch: 12 }, // B: Type
    { wch: 30 }, // C: GLOBAL
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
    { wch: 30 },
  ];

  utils.book_append_sheet(wb, ws, 'Asset data');
  return write(wb, { type: 'array', bookType: 'xlsx' });
}
