// Ghostscript WASM Web Worker
// Runs compression off the main thread so UI never freezes
// @ts-nocheck

let gsModule: any = null;

async function loadGhostscript() {
  if (gsModule) return gsModule;

  const initGhostscript = (await import(
    /* @vite-ignore */
    'https://cdn.jsdelivr.net/npm/@jspawn/ghostscript-wasm@0.0.2/gs.mjs'
  )).default;

  gsModule = await initGhostscript({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@jspawn/ghostscript-wasm@0.0.2/${file}`,
  });

  return gsModule;
}

const PRESETS: Record<string, string[]> = {
  lossless: [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/printer',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-sOutputFile=output.pdf',
    'input.pdf',
  ],
  balanced: [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-sOutputFile=output.pdf',
    'input.pdf',
  ],
  max: [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dPDFSETTINGS=/screen',
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-sOutputFile=output.pdf',
    'input.pdf',
  ],
};

self.onmessage = async (e: MessageEvent) => {
  const { fileBuffer, level } = e.data;

  try {
    self.postMessage({ type: 'progress', message: 'Loading Ghostscript engine...' });

    const gs = await loadGhostscript();

    self.postMessage({ type: 'progress', message: 'Compressing PDF...' });

    // Write input file to Ghostscript virtual filesystem
    gs.FS.writeFile('input.pdf', new Uint8Array(fileBuffer));

    // Run Ghostscript compression
    await gs.callMain(PRESETS[level] ?? PRESETS.balanced);

    // Read output file from virtual filesystem
    const output = gs.FS.readFile('output.pdf');

    // Clean up virtual filesystem for next run
    try { gs.FS.unlink('input.pdf'); } catch (e) { /* ignore */ }
    try { gs.FS.unlink('output.pdf'); } catch (e) { /* ignore */ }

    self.postMessage({ type: 'done', output: output.buffer }, { transfer: [output.buffer] });
  } catch (err: any) {
    self.postMessage({ type: 'error', message: err?.message ?? 'Compression failed' });
  }
};
