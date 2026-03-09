import { PDFDocument, degrees, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { PDF } from '@libpdf/core';

async function loadPdf(file: File): Promise<PDFDocument> {
  const data = await file.arrayBuffer();
  return PDFDocument.load(data, { ignoreEncryption: true });
}

function toBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as any], { type: 'application/pdf' });
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await loadPdf(file);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  return toBlob(await merged.save());
}

export async function splitPdf(file: File, ranges: [number, number][]): Promise<Blob[]> {
  const src = await loadPdf(file);
  const blobs: Blob[] = [];
  for (const [start, end] of ranges) {
    const doc = await PDFDocument.create();
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach(p => doc.addPage(p));
    blobs.push(toBlob(await doc.save()));
  }
  return blobs;
}

export async function rotatePdf(file: File, pageRotations: Record<number, number>): Promise<Blob> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();
  for (const [pageIdx, deg] of Object.entries(pageRotations)) {
    const page = pages[Number(pageIdx)];
    if (page) {
      const current = page.getRotation().angle;
      page.setRotation(degrees(current + deg));
    }
  }
  return toBlob(await doc.save());
}

export async function removePages(file: File, pagesToRemove: number[]): Promise<Blob> {
  const src = await loadPdf(file);
  const doc = await PDFDocument.create();
  const keepIndices = src.getPageIndices().filter(i => !pagesToRemove.includes(i));
  const pages = await doc.copyPages(src, keepIndices);
  pages.forEach(p => doc.addPage(p));
  return toBlob(await doc.save());
}

export async function reorderPages(file: File, newOrder: number[]): Promise<Blob> {
  const src = await loadPdf(file);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, newOrder);
  pages.forEach(p => doc.addPage(p));
  return toBlob(await doc.save());
}

export async function compressPdf(file: File): Promise<Blob> {
  const doc = await loadPdf(file);
  return toBlob(await doc.save({ useObjectStreams: true }));
}

export async function repairPdf(file: File): Promise<Blob> {
  const doc = await loadPdf(file);
  return toBlob(await doc.save());
}

export async function protectPdf(
  file: File,
  userPassword: string,
  ownerPassword: string
): Promise<Blob> {
  const data = await file.arrayBuffer();
  const pdf = await PDF.load(new Uint8Array(data));
  pdf.setProtection({
    userPassword,
    ownerPassword: ownerPassword || userPassword,
    algorithm: 'AES-256' as any,
  });
  const encrypted = await pdf.save();
  return new Blob([encrypted as any], { type: 'application/pdf' });
}

export async function unlockPdf(
  file: File,
  password: string
): Promise<Blob> {
  const data = await file.arrayBuffer();
  try {
    const pdf = await PDF.load(new Uint8Array(data), { credentials: password } as any);
    const unlocked = await pdf.save();
    return new Blob([unlocked as any], { type: 'application/pdf' });
  } catch {
    throw new Error('Incorrect password. Please check and try again.');
  }
}

export async function addWatermark(file: File, text: string, opacity: number): Promise<Blob> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.08;
    page.drawText(text, {
      x: width / 2 - (font.widthOfTextAtSize(text, fontSize) / 2),
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(45),
    });
  }
  return toBlob(await doc.save());
}

export async function addPageNumbers(file: File): Promise<Blob> {
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const text = `${i + 1}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: 20,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  });
  return toBlob(await doc.save());
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const data = await file.arrayBuffer();
    const bytes = new Uint8Array(data);
    let image;
    if (file.type === 'image/png') {
      image = await doc.embedPng(bytes);
    } else {
      image = await doc.embedJpg(bytes);
    }
    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return toBlob(await doc.save());
}

export async function addBlankPages(file: File, afterPages: number[]): Promise<Blob> {
  const src = await loadPdf(file);
  const doc = await PDFDocument.create();
  const allPages = await doc.copyPages(src, src.getPageIndices());
  for (let i = 0; i < allPages.length; i++) {
    doc.addPage(allPages[i]);
    if (afterPages.includes(i)) {
      doc.addPage(PageSizes.A4);
    }
  }
  return toBlob(await doc.save());
}

export async function cropPdf(file: File, margins: { top: number; right: number; bottom: number; left: number }): Promise<Blob> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.setCropBox(
      margins.left,
      margins.bottom,
      width - margins.left - margins.right,
      height - margins.top - margins.bottom
    );
  }
  return toBlob(await doc.save());
}

async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  }
  return pdfjsLib;
}

export async function pdfToText(file: File): Promise<string> {
  const pdfjsLib = await getPdfjsLib();
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str).join(' ');
    fullText += `--- Page ${i} ---\n${strings}\n\n`;
  }
  return fullText;
}

export async function pdfToImages(file: File): Promise<Blob[]> {
  const pdfjsLib = await getPdfjsLib();
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const blobs: Blob[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    const renderTask = page.render({ canvasContext: ctx, viewport } as any);
    await (renderTask.promise ?? renderTask);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Failed to create image blob'));
      }, 'image/png');
    });
    blobs.push(blob);
  }
  return blobs;
}

export async function removeMetadata(file: File): Promise<{ blob: Blob; removed: string[] }> {
  const doc = await loadPdf(file);
  const removed: string[] = [];
  if (doc.getTitle())    { removed.push(`Title: "${doc.getTitle()}"`); }
  if (doc.getAuthor())   { removed.push(`Author: "${doc.getAuthor()}"`); }
  if (doc.getSubject())  { removed.push(`Subject: "${doc.getSubject()}"`); }
  if (doc.getCreator())  { removed.push(`Creator: "${doc.getCreator()}"`); }
  if (doc.getProducer()) { removed.push(`Producer: "${doc.getProducer()}"`); }
  if (doc.getKeywords()) { removed.push(`Keywords: "${doc.getKeywords()}"`); }
  if (doc.getCreationDate()) { removed.push(`Created: "${doc.getCreationDate()}"`); }
  if (doc.getModificationDate()) { removed.push(`Modified: "${doc.getModificationDate()}"`); }

  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setCreator('');
  doc.setProducer('');
  doc.setKeywords([]);
  doc.setCreationDate(new Date(0));
  doc.setModificationDate(new Date(0));

  const blob = toBlob(await doc.save());
  return { blob, removed };
}

export async function pdfToZip(file: File): Promise<Blob> {
  const imageBlobs = await pdfToImages(file);
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  imageBlobs.forEach((blob, i) => {
    const pageNum = String(i + 1).padStart(3, '0');
    zip.file(`page-${pageNum}.png`, blob);
  });
  return await zip.generateAsync({ type: 'blob' });
}

export async function signPdf(
  file: File,
  signatureDataUrl: string,
  pageIndex: number,
  position: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();
  const page = pages[pageIndex];
  const base64 = signatureDataUrl.split(',')[1];
  const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const image = await doc.embedPng(pngBytes);
  page.drawImage(image, {
    x: position.x,
    y: position.y,
    width: position.width,
    height: position.height,
  });
  return toBlob(await doc.save());
}

export async function fillAndFlattenForm(
  file: File,
  fieldValues: Record<string, string>
): Promise<Blob> {
  const doc = await loadPdf(file);
  const form = doc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const name = field.getName();
    const value = fieldValues[name];
    if (value === undefined) continue;
    try {
      if (field.constructor.name === 'PDFTextField') {
        (field as any).setText(value);
      } else if (field.constructor.name === 'PDFCheckBox') {
        if (value === 'true') (field as any).check();
        else (field as any).uncheck();
      } else if (field.constructor.name === 'PDFDropdown') {
        (field as any).select(value);
      } else if (field.constructor.name === 'PDFRadioGroup') {
        (field as any).select(value);
      }
    } catch (e) {
      console.warn(`Could not set field ${name}:`, e);
    }
  }

  form.flatten();
  return toBlob(await doc.save());
}

export async function detectFormFields(
  file: File
): Promise<Array<{ name: string; type: string; options?: string[] }>> {
  const doc = await loadPdf(file);
  const form = doc.getForm();
  const fields = form.getFields();

  return fields.map(field => {
    const type = field.constructor.name
      .replace('PDF', '')
      .replace('Field', '')
      .replace('Group', '');
    const result: { name: string; type: string; options?: string[] } = {
      name: field.getName(),
      type,
    };
    if (type === 'Dropdown' || type === 'RadioGroup') {
      result.options = (field as any).getOptions?.() ?? [];
    }
    return result;
  });
}

export async function redactPdf(
  file: File,
  redactions: Array<{
    pageIndex: number; x: number; y: number; width: number; height: number;
  }>
): Promise<Blob> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();

  for (const r of redactions) {
    const page = pages[r.pageIndex];
    if (!page) continue;
    page.drawRectangle({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      color: rgb(0, 0, 0),
      opacity: 1,
    });
  }

  return toBlob(await doc.save());
}

export async function getPageCount(file: File): Promise<number> {
  const doc = await loadPdf(file);
  return doc.getPageCount();
}

export function parseSplitRanges(input: string): [number, number][] {
  return input.split(',').map(r => {
    const parts = r.trim().split('-').map(Number);
    if (parts.length === 1) return [parts[0], parts[0]] as [number, number];
    return [parts[0], parts[1]] as [number, number];
  }).filter(([a, b]) => !isNaN(a) && !isNaN(b) && a > 0 && b >= a);
}
