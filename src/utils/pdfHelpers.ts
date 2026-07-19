import jsPDF from 'jspdf';
import bwipjs from 'bwip-js';

/**
 * Renders a Code128 barcode (client-side, no network call) and drops it
 * into the PDF at the given position. Replaces the old multi-API QR code
 * fetch chain -- faster, more reliable, and works offline.
 *
 * @param pdf       the jsPDF instance
 * @param text      the value to encode (e.g. reference_id or tracking_id)
 * @param x         left position in mm
 * @param y         top position in mm
 * @param width     rendered width in mm
 * @param height    rendered height in mm
 * @param showText  whether to print the human-readable value under the bars
 */
export const addBarcode = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  showText: boolean = true
): void => {
  try {
    const canvas = document.createElement('canvas');
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',       // barcode type -- widely scannable, alphanumeric
      text: text || '000000000',
      scale: 3,               // internal render scale (crisper output)
      height: 10,              // bar height in the source render, mm-ish units
      includetext: showText,
      textxalign: 'center',
      textsize: 8,
    });
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', x, y, width, height);
  } catch (error) {
    console.error('Error generating barcode:', error);
    // Continue without a barcode rather than failing the whole PDF
  }
};

/**
 * Draws text wrapped to a max width, without ever overlapping content
 * below it. Returns the Y position immediately after the last line drawn,
 * so the caller can continue laying out the rest of the block from the
 * correct spot instead of using a fixed "+5" guess that breaks on long
 * addresses.
 *
 * @param pdf        the jsPDF instance
 * @param text       the text to wrap (any length)
 * @param x          left position in mm
 * @param y          starting baseline in mm
 * @param maxWidth   max line width in mm before wrapping
 * @param lineHeight vertical space between wrapped lines in mm
 * @param maxLines   hard cap on lines drawn (extra text is dropped safely
 *                   rather than overflowing into the next section)
 */
export const addWrappedText = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number = 4,
  maxLines: number = 3
): number => {
  const safe = text && text.trim().length > 0 ? text : 'N/A';
  const allLines: string[] = pdf.splitTextToSize(safe, maxWidth);
  const lines = allLines.slice(0, maxLines);

  lines.forEach((line, i) => {
    pdf.text(line, x, y + i * lineHeight);
  });

  // Y position for whatever comes next
  return y + (lines.length - 1) * lineHeight;
};
