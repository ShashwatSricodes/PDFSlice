import { useEffect, useRef, useState, useCallback } from "react";

type PDFDoc = import("pdfjs-dist").PDFDocumentProxy;

interface CropPreviewProps {
  pdfDoc: PDFDoc;
  pageCount: number;
  margins: { top: number; right: number; bottom: number; left: number };
  onMarginsChange: (m: { top: number; right: number; bottom: number; left: number }) => void;
}

type Edge = "top" | "right" | "bottom" | "left" | null;

export function CropPreview({ pdfDoc, pageCount, margins, onMarginsChange }: CropPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(1);
  const [dims, setDims] = useState({ pdfW: 612, pdfH: 792, scale: 1 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draggingEdge, setDraggingEdge] = useState<Edge>(null);
  const dragStartRef = useRef({ pos: 0, margin: 0 });

  // Render current page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfDoc.getPage(activePage);
        const baseVp = page.getViewport({ scale: 1 });
        const container = containerRef.current?.parentElement;
        const maxW = container ? Math.min(500, container.clientWidth - 32) : 500;
        const renderScale = maxW / baseVp.width;
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasSize({ width: viewport.width, height: viewport.height });
        setDims({ pdfW: baseVp.width, pdfH: baseVp.height, scale: renderScale });
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport } as any).promise;
      } catch { /* unmounted */ }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, activePage]);

  const s = dims.scale;
  const cropLeft = margins.left * s;
  const cropTop = margins.top * s;
  const cropW = Math.max(0, (dims.pdfW - margins.left - margins.right) * s);
  const cropH = Math.max(0, (dims.pdfH - margins.top - margins.bottom) * s);
  const cropRight = cropLeft + cropW;
  const cropBottom = cropTop + cropH;

  // Determine which edge the mouse is near
  const getEdge = (mx: number, my: number): Edge => {
    const threshold = 10;
    // Check corners aren't ambiguous — prioritize edges
    if (Math.abs(my - cropTop) < threshold && mx >= cropLeft - threshold && mx <= cropRight + threshold) return "top";
    if (Math.abs(my - cropBottom) < threshold && mx >= cropLeft - threshold && mx <= cropRight + threshold) return "bottom";
    if (Math.abs(mx - cropLeft) < threshold && my >= cropTop - threshold && my <= cropBottom + threshold) return "left";
    if (Math.abs(mx - cropRight) < threshold && my >= cropTop - threshold && my <= cropBottom + threshold) return "right";
    return null;
  };

  const getCursor = (edge: Edge) => {
    if (edge === "top" || edge === "bottom") return "ns-resize";
    if (edge === "left" || edge === "right") return "ew-resize";
    return "default";
  };

  const [hoverEdge, setHoverEdge] = useState<Edge>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const edge = getEdge(mx, my);
    if (!edge) return;

    setDraggingEdge(edge);
    const pos = edge === "top" || edge === "bottom" ? e.clientY : e.clientX;
    dragStartRef.current = { pos, margin: margins[edge] };
    e.preventDefault();
  }, [margins, cropTop, cropBottom, cropLeft, cropRight]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (!draggingEdge) {
      setHoverEdge(getEdge(mx, my));
      return;
    }

    const edge = draggingEdge;
    const isVertical = edge === "top" || edge === "bottom";
    const currentPos = isVertical ? e.clientY : e.clientX;
    const delta = currentPos - dragStartRef.current.pos;
    const pdfDelta = delta / s;

    let newMargin: number;
    if (edge === "top" || edge === "left") {
      newMargin = Math.max(0, dragStartRef.current.margin + pdfDelta);
    } else {
      newMargin = Math.max(0, dragStartRef.current.margin - pdfDelta);
    }

    // Clamp so crop area doesn't collapse
    const maxDim = isVertical ? dims.pdfH : dims.pdfW;
    const oppositeEdge = edge === "top" ? "bottom" : edge === "bottom" ? "top" : edge === "left" ? "right" : "left";
    newMargin = Math.min(newMargin, maxDim - margins[oppositeEdge] - 20);

    onMarginsChange({ ...margins, [edge]: Math.round(newMargin) });
  }, [draggingEdge, margins, s, dims, onMarginsChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingEdge(null);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const touch = e.touches[0];
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    const edge = getEdge(mx, my);
    if (!edge) return;

    setDraggingEdge(edge);
    const pos = edge === "top" || edge === "bottom" ? touch.clientY : touch.clientX;
    dragStartRef.current = { pos, margin: margins[edge] };
    e.preventDefault();
  }, [margins, cropTop, cropBottom, cropLeft, cropRight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingEdge) return;
    const touch = e.touches[0];
    const edge = draggingEdge;
    const isVertical = edge === "top" || edge === "bottom";
    const currentPos = isVertical ? touch.clientY : touch.clientX;
    const delta = currentPos - dragStartRef.current.pos;
    const pdfDelta = delta / s;

    let newMargin: number;
    if (edge === "top" || edge === "left") {
      newMargin = Math.max(0, dragStartRef.current.margin + pdfDelta);
    } else {
      newMargin = Math.max(0, dragStartRef.current.margin - pdfDelta);
    }

    const maxDim = isVertical ? dims.pdfH : dims.pdfW;
    const oppositeEdge = edge === "top" ? "bottom" : edge === "bottom" ? "top" : edge === "left" ? "right" : "left";
    newMargin = Math.min(newMargin, maxDim - margins[oppositeEdge] - 20);

    onMarginsChange({ ...margins, [edge]: Math.round(newMargin) });
  }, [draggingEdge, margins, s, dims, onMarginsChange]);

  const handleTouchEnd = useCallback(() => {
    setDraggingEdge(null);
  }, []);

  const activeCursor = draggingEdge ? getCursor(draggingEdge) : hoverEdge ? getCursor(hoverEdge) : "default";

  const HANDLE_SIZE = 8;

  return (
    <div>
      {/* Page selector */}
      {pageCount > 1 && (
        <div className="flex flex-wrap gap-1 mb-3">
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
      )}

      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
        Drag edges to crop {pageCount > 1 ? `(Page ${activePage} preview — applies to all pages)` : ""}
      </label>

      {/* Canvas + interactive overlay */}
      <div
        ref={containerRef}
        className="relative inline-block select-none"
        style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: "100%", cursor: activeCursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="rounded-lg border border-border bg-card shadow-sm block max-w-full" />

        {/* Dimmed overlays */}
        <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
          {/* Top */}
          <div className="absolute bg-foreground/30" style={{ top: 0, left: 0, right: 0, height: Math.max(0, cropTop) }} />
          {/* Bottom */}
          <div className="absolute bg-foreground/30" style={{ bottom: 0, left: 0, right: 0, height: Math.max(0, canvasSize.height - cropBottom) }} />
          {/* Left */}
          <div className="absolute bg-foreground/30" style={{ top: cropTop, left: 0, width: Math.max(0, cropLeft), height: Math.max(0, cropH) }} />
          {/* Right */}
          <div className="absolute bg-foreground/30" style={{ top: cropTop, right: 0, width: Math.max(0, canvasSize.width - cropRight), height: Math.max(0, cropH) }} />

          {/* Crop border */}
          <div
            className="absolute border-2 border-dashed border-primary"
            style={{ top: cropTop, left: cropLeft, width: Math.max(0, cropW), height: Math.max(0, cropH) }}
          />

          {/* Drag handles — edge midpoints */}
          {/* Top handle */}
          <div
            className={`absolute rounded-full ${draggingEdge === "top" ? "bg-primary" : "bg-primary/70"}`}
            style={{
              left: cropLeft + cropW / 2 - HANDLE_SIZE * 1.5,
              top: cropTop - HANDLE_SIZE / 2,
              width: HANDLE_SIZE * 3,
              height: HANDLE_SIZE,
            }}
          />
          {/* Bottom handle */}
          <div
            className={`absolute rounded-full ${draggingEdge === "bottom" ? "bg-primary" : "bg-primary/70"}`}
            style={{
              left: cropLeft + cropW / 2 - HANDLE_SIZE * 1.5,
              top: cropBottom - HANDLE_SIZE / 2,
              width: HANDLE_SIZE * 3,
              height: HANDLE_SIZE,
            }}
          />
          {/* Left handle */}
          <div
            className={`absolute rounded-full ${draggingEdge === "left" ? "bg-primary" : "bg-primary/70"}`}
            style={{
              left: cropLeft - HANDLE_SIZE / 2,
              top: cropTop + cropH / 2 - HANDLE_SIZE * 1.5,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE * 3,
            }}
          />
          {/* Right handle */}
          <div
            className={`absolute rounded-full ${draggingEdge === "right" ? "bg-primary" : "bg-primary/70"}`}
            style={{
              left: cropRight - HANDLE_SIZE / 2,
              top: cropTop + cropH / 2 - HANDLE_SIZE * 1.5,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE * 3,
            }}
          />
        </div>
      </div>

      {/* Margin values display */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {(["top", "right", "bottom", "left"] as const).map(side => (
          <div key={side} className="text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">{side}</span>
            <input
              type="number"
              value={margins[side]}
              onChange={(e) => onMarginsChange({ ...margins, [side]: Math.max(0, Number(e.target.value)) })}
              className="w-full px-2 py-1 rounded-md border border-border bg-background text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
