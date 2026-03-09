import { useEffect, useRef, useState } from "react";

interface SignaturePlacerProps {
  pdfDoc: any;
  pageCount: number;
  signatureDataUrl: string;
  onConfirm: (pageIndex: number, position: { x: number; y: number; width: number; height: number }) => void;
  onBack: () => void;
}

export function SignaturePlacer({ pdfDoc, pageCount, signatureDataUrl, onConfirm, onBack }: SignaturePlacerProps) {
  const [activePage, setActivePage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [sigPos, setSigPos] = useState({ x: 100, y: 100 });
  const [sigSize, setSigSize] = useState({ width: 200, height: 80 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const scale = useRef(1);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const page = await pdfDoc.getPage(activePage);
      const baseVp = page.getViewport({ scale: 1 });
      // Fit to container width (max ~700px) instead of fixed 1.5x
      const container = containerRef.current?.parentElement;
      const maxW = container ? container.clientWidth - 48 : 700;
      const s = Math.min(1.5, maxW / baseVp.width);
      scale.current = s;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if near bottom-right corner for resize
    if (Math.abs(mx - (sigPos.x + sigSize.width)) < 12 && Math.abs(my - (sigPos.y + sigSize.height)) < 12) {
      setResizing(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (mx >= sigPos.x && mx <= sigPos.x + sigSize.width && my >= sigPos.y && my <= sigPos.y + sigSize.height) {
      setDragging(true);
      dragStart.current = { x: e.clientX - sigPos.x, y: e.clientY - sigPos.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      setSigPos({
        x: Math.max(0, Math.min(e.clientX - dragStart.current.x, canvasSize.width - sigSize.width)),
        y: Math.max(0, Math.min(e.clientY - dragStart.current.y, canvasSize.height - sigSize.height)),
      });
    } else if (resizing) {
      const dx = e.clientX - dragStart.current.x;
      const newW = Math.max(60, sigSize.width + dx);
      const ratio = newW / sigSize.width;
      setSigSize({ width: newW, height: sigSize.height * ratio });
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  const handleConfirm = async () => {
    const page = await pdfDoc.getPage(activePage);
    const baseVp = page.getViewport({ scale: 1 });
    const pdfW = baseVp.width;
    const pdfH = baseVp.height;
    const s = scale.current;

    const pdfX = sigPos.x / s;
    const pdfSigW = sigSize.width / s;
    const pdfSigH = sigSize.height / s;
    // Flip Y axis: PDF origin is bottom-left
    const pdfY = pdfH - (sigPos.y / s) - pdfSigH;

    onConfirm(activePage - 1, { x: pdfX, y: pdfY, width: pdfSigW, height: pdfSigH });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in-up">
      <h3 className="font-heading text-xl text-card-foreground mb-4">Place Your Signature</h3>

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

      {/* Canvas + signature overlay */}
      <div
        ref={containerRef}
        className="relative inline-block border border-border rounded-lg overflow-hidden cursor-move select-none"
        style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="block" />
        <img
          src={signatureDataUrl}
          alt="Signature"
          className="absolute pointer-events-none border-2 border-dashed border-primary/50"
          style={{
            left: sigPos.x,
            top: sigPos.y,
            width: sigSize.width,
            height: sigSize.height,
            opacity: 0.8,
          }}
        />
        {/* Resize handle */}
        <div
          className="absolute w-3 h-3 bg-primary rounded-sm cursor-nwse-resize"
          style={{ left: sigPos.x + sigSize.width - 6, top: sigPos.y + sigSize.height - 6 }}
        />
      </div>

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={handleConfirm}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Embed Signature →
        </button>
        <button onClick={onBack} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
          ← Choose different signature
        </button>
      </div>
    </div>
  );
}
