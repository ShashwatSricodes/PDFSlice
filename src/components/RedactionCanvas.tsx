import { useEffect, useRef, useState } from "react";

interface Redaction {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RedactionCanvasProps {
  pdfDoc: any;
  pageCount: number;
  onRedactionsChange: (redactions: Redaction[]) => void;
}

export function RedactionCanvas({ pdfDoc, pageCount, onRedactionsChange }: RedactionCanvasProps) {
  const [activePage, setActivePage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const page = await pdfDoc.getPage(activePage);
      const baseVp = page.getViewport({ scale: 1 });
      const container = overlayRef.current?.parentElement?.parentElement;
      const maxW = container ? container.clientWidth - 48 : 700;
      const s = Math.min(1.5, maxW / baseVp.width);
      scaleRef.current = s;
      const viewport = page.getViewport({ scale: s });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, activePage]);

  const getPos = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    setDrawStart(pos);
    setDrawCurrent(pos);
    setDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    setDrawCurrent(getPos(e));
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    setDrawing(false);

    const px = Math.min(drawStart.x, drawCurrent.x);
    const py = Math.min(drawStart.y, drawCurrent.y);
    const pw = Math.abs(drawCurrent.x - drawStart.x);
    const ph = Math.abs(drawCurrent.y - drawStart.y);

    if (pw < 5 || ph < 5) return; // too small

    const s = scaleRef.current;
    const pageIdx = activePage - 1;

    // We need the PDF page height for Y-flip
    pdfDoc.getPage(activePage).then((page: any) => {
      const baseVp = page.getViewport({ scale: 1 });
      const pdfH = baseVp.height;

      const r: Redaction = {
        pageIndex: pageIdx,
        x: px / s,
        y: pdfH - (py / s) - (ph / s), // flip Y
        width: pw / s,
        height: ph / s,
      };

      const updated = [...redactions, r];
      setRedactions(updated);
      onRedactionsChange(updated);
    });
  };

  const removeRedaction = (idx: number) => {
    const updated = redactions.filter((_, i) => i !== idx);
    setRedactions(updated);
    onRedactionsChange(updated);
  };

  const clearAll = () => {
    setRedactions([]);
    onRedactionsChange([]);
  };

  // Convert PDF-space redactions back to screen pixels for rendering
  const getScreenRedactions = () => {
    const s = scaleRef.current;
    return redactions
      .map((r, idx) => ({ ...r, idx }))
      .filter(r => r.pageIndex === activePage - 1);
  };

  const [pdfPageHeight, setPdfPageHeight] = useState(0);
  useEffect(() => {
    pdfDoc.getPage(activePage).then((page: any) => {
      const baseVp = page.getViewport({ scale: 1 });
      setPdfPageHeight(baseVp.height);
    });
  }, [pdfDoc, activePage]);

  const currentPageRedactions = getScreenRedactions();

  return (
    <div>
      {/* Page selector */}
      <div className="flex flex-wrap gap-1 mb-4">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => setActivePage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-mono border transition-colors ${
              activePage === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Canvas + overlay */}
      <div className="relative inline-block border border-border rounded-lg overflow-hidden" style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: "100%" }}>
        <canvas ref={canvasRef} className="block" />
        <div
          ref={overlayRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (drawing) handleMouseUp(); }}
        >
          {/* Drawing preview */}
          {drawing && (
            <div
              className="absolute bg-black/60 pointer-events-none"
              style={{
                left: Math.min(drawStart.x, drawCurrent.x),
                top: Math.min(drawStart.y, drawCurrent.y),
                width: Math.abs(drawCurrent.x - drawStart.x),
                height: Math.abs(drawCurrent.y - drawStart.y),
              }}
            />
          )}
          {/* Existing redactions on current page */}
          {currentPageRedactions.map(r => {
            const s = scaleRef.current;
            const screenX = r.x * s;
            const screenY = (pdfPageHeight - r.y - r.height) * s;
            const screenW = r.width * s;
            const screenH = r.height * s;
            return (
              <div
                key={r.idx}
                className="absolute bg-black group"
                style={{ left: screenX, top: screenY, width: screenW, height: screenH }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); removeRedaction(r.idx); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-mono text-muted-foreground space-y-0.5">
          {Array.from(new Set(redactions.map(r => r.pageIndex))).sort().map(pi => {
            const count = redactions.filter(r => r.pageIndex === pi).length;
            return <div key={pi}>Page {pi + 1}: {count} redaction{count > 1 ? "s" : ""}</div>;
          })}
          {redactions.length === 0 && <div>Draw rectangles over content to redact</div>}
        </div>
        {redactions.length > 0 && (
          <button onClick={clearAll} className="text-xs font-mono text-destructive hover:text-destructive/80 transition-colors">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
