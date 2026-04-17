import jsPDF from 'jspdf';

export function pngToPdfBlob(pngDataUrl: string, caption: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const qrSize = 80;
  const x = (pageWidth - qrSize) / 2;
  const y = 30;

  doc.addImage(pngDataUrl, 'PNG', x, y, qrSize, qrSize);

  if (caption) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    const wrapped = doc.splitTextToSize(caption, pageWidth - 40);
    doc.text(wrapped, pageWidth / 2, y + qrSize + 10, { align: 'center' });
  }

  return doc.output('blob');
}
