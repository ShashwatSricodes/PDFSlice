// MuPDF Web Worker — runs off main thread so UI never freezes
// @ts-nocheck

let mupdfModule = null;

async function loadMuPDF() {
  if (mupdfModule) return mupdfModule;
  const mupdf = await import('mupdf');
  mupdfModule = mupdf.default ?? mupdf;
  return mupdfModule;
}

self.onmessage = async (e) => {
  const { fileBuffer, redactions } = e.data;

  try {
    self.postMessage({ type: 'progress', message: 'Loading MuPDF engine...' });

    const mupdf = await loadMuPDF();

    self.postMessage({ type: 'progress', message: 'Opening document...' });

    const doc = mupdf.Document.openDocument(
      new Uint8Array(fileBuffer),
      'application/pdf'
    );

    const totalPages = doc.countPages();

    // Group redactions by page
    const redactionsByPage = new Map();
    for (const r of redactions) {
      if (!redactionsByPage.has(r.page)) redactionsByPage.set(r.page, []);
      redactionsByPage.get(r.page).push(r);
    }

    // Apply redactions page by page
    for (const [pageIndex, pageRedactions] of redactionsByPage) {
      self.postMessage({
        type: 'progress',
        message: `Redacting page ${pageIndex + 1} of ${totalPages}...`,
      });

      const page = doc.loadPage(pageIndex);
      const bounds = page.getBounds();
      const pageWidth = bounds[2] - bounds[0];
      const pageHeight = bounds[3] - bounds[1];

      for (const r of pageRedactions) {
        const x0 = bounds[0] + r.x * pageWidth;
        const y0 = bounds[1] + r.y * pageHeight;
        const x1 = bounds[0] + (r.x + r.width) * pageWidth;
        const y1 = bounds[1] + (r.y + r.height) * pageHeight;

        const annot = page.createAnnotation('Redact');
        annot.setRect([x0, y0, x1, y1]);
        annot.applyRedaction(true);
      }
    }

    self.postMessage({ type: 'progress', message: 'Saving document...' });

    const wasmOutput = doc.saveToBuffer('compress').asUint8Array();
    // Copy from WASM memory (not detachable) into a transferable buffer
    const output = new Uint8Array(wasmOutput.length);
    output.set(wasmOutput);

    self.postMessage(
      { type: 'done', output: output.buffer },
      [output.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err?.message ?? 'Redaction failed',
    });
  }
};
