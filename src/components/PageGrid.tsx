import { useEffect, useRef, useState, useCallback } from "react";
import { RotateCw, RotateCcw, X } from "lucide-react";

type PDFDoc = import("pdfjs-dist").PDFDocumentProxy;

interface PageGridProps {
  pdfDoc: PDFDoc;
  pageCount: number;
  mode: "view" | "select" | "reorder" | "rotate";
  selectedPages?: Set<number>;
  onSelectionChange?: (pages: Set<number>) => void;
  pageOrder?: number[];
  onOrderChange?: (order: number[]) => void;
  pageRotations?: Record<number, number>;
  onRotationsChange?: (rotations: Record<number, number>) => void;
  highlightRanges?: { pages: number[]; color: string }[];
  pageLabels?: Record<number, string>;
  thumbnailWidth?: number;
  horizontal?: boolean;
}

/* ─── Lazy-rendered single thumbnail ─────────────────────────────────────── */

function LazyThumbnail({
  pdfDoc,
  pageNumber,
  width = 140,
  rotation = 0,
  selected,
  highlightColor,
  label,
  mode,
  onSelect,
  onRotateLeft,
  onRotateRight,
  isDragging,
  isDropTarget,
}: {
  pdfDoc: PDFDoc;
  pageNumber: number;
  width?: number;
  rotation?: number;
  selected?: boolean;
  highlightColor?: string;
  label?: string;
  mode: string;
  onSelect?: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  // Lazy visibility
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Render page
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const baseVp = page.getViewport({ scale: 1 });
        const scale = width / baseVp.width;
        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        if (!cancelled) setRendered(true);
      } catch { /* component unmounted or page invalid */ }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, width, rotation, visible]);

  const norm = ((rotation % 360) + 360) % 360;

  return (
    <div
      ref={sentinelRef}
      className={`inline-flex flex-col items-center gap-1 transition-all duration-150 ${
        mode === "select" ? "cursor-pointer" : ""
      } ${isDragging ? "opacity-40 scale-95" : ""}`}
      onClick={mode === "select" ? onSelect : undefined}
    >
      {label && (
        <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[140px]">{label}</span>
      )}
      <div className={`relative ${isDropTarget ? "ring-2 ring-dashed ring-foreground rounded-lg" : ""}`}>
        {/* Placeholder */}
        {!rendered && (
          <div
            className="rounded-lg bg-muted animate-pulse border border-border"
            style={{ width, height: width * 1.41 }}
          />
        )}
        <canvas
          ref={canvasRef}
          className={`rounded-lg border shadow-sm bg-card transition-shadow ${
            selected && mode === "select"
              ? "ring-2 ring-destructive border-destructive"
              : "border-border"
          } ${!rendered ? "hidden" : ""}`}
          style={
            highlightColor
              ? { boxShadow: `0 0 0 2px ${highlightColor}`, borderColor: highlightColor }
              : undefined
          }
        />
        {/* Select overlay */}
        {mode === "select" && selected && rendered && (
          <div className="absolute inset-0 bg-destructive/40 rounded-lg flex items-center justify-center pointer-events-none">
            <X size={26} className="text-destructive-foreground drop-shadow" strokeWidth={2.5} />
          </div>
        )}
        {/* Rotation badge */}
        {mode === "rotate" && norm !== 0 && rendered && (
          <span className="absolute top-1 right-1 text-[9px] font-mono bg-foreground text-background px-1.5 py-0.5 rounded-full leading-none">
            {norm}°
          </span>
        )}
      </div>

      {/* Rotate controls */}
      {mode === "rotate" && rendered && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onRotateLeft?.(); }}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Rotate left"
          >
            <RotateCcw size={13} strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">{pageNumber}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRotateRight?.(); }}
            className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Rotate right"
          >
            <RotateCw size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Page number (non-rotate) */}
      {mode !== "rotate" && rendered && (
        <span className="text-[10px] font-mono text-muted-foreground">{pageNumber}</span>
      )}
    </div>
  );
}

/* ─── Main grid component ────────────────────────────────────────────────── */

export function PageGrid({
  pdfDoc,
  pageCount,
  mode,
  selectedPages,
  onSelectionChange,
  pageOrder,
  onOrderChange,
  pageRotations,
  onRotationsChange,
  highlightRanges,
  pageLabels,
  thumbnailWidth = 140,
  horizontal,
}: PageGridProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);
  const dropIdxRef = useRef<number | null>(null);

  const order = pageOrder ?? Array.from({ length: pageCount }, (_, i) => i);

  const handleSelect = (pageIdx: number) => {
    if (!onSelectionChange || !selectedPages) return;
    const next = new Set(selectedPages);
    next.has(pageIdx) ? next.delete(pageIdx) : next.add(pageIdx);
    onSelectionChange(next);
  };

  const getHighlight = (pageNum: number): string | undefined => {
    if (!highlightRanges) return undefined;
    for (const r of highlightRanges) {
      if (r.pages.includes(pageNum)) return r.color;
    }
    return undefined;
  };

  // Drag-to-reorder
  const startDrag = useCallback(
    (idx: number) => {
      if (mode !== "reorder" || !onOrderChange) return;
      dragIdxRef.current = idx;
      setDragIdx(idx);

      const onMove = (ev: MouseEvent) => {
        const els = document.querySelectorAll("[data-pgrid-idx]");
        let closest = -1;
        let best = Infinity;
        els.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const d = Math.abs(ev.clientX - cx);
          if (d < best) { best = d; closest = parseInt(el.getAttribute("data-pgrid-idx")!); }
        });
        const target = closest !== dragIdxRef.current ? closest : null;
        dropIdxRef.current = target;
        setDropIdx(target);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const from = dragIdxRef.current;
        const to = dropIdxRef.current;
        if (from !== null && to !== null && from !== to) {
          const newOrder = [...order];
          const [moved] = newOrder.splice(from, 1);
          newOrder.splice(to, 0, moved);
          onOrderChange!(newOrder);
        }
        dragIdxRef.current = null;
        dropIdxRef.current = null;
        setDragIdx(null);
        setDropIdx(null);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [mode, onOrderChange, order]
  );

  const containerClass = horizontal
    ? "flex gap-3 overflow-x-auto pb-2"
    : "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3";

  return (
    <div className={containerClass}>
      {order.map((pageIdx, i) => {
        const pageNum = pageIdx + 1;
        return (
          <div
            key={`${pageIdx}-${i}`}
            data-pgrid-idx={i}
            onMouseDown={
              mode === "reorder"
                ? (e) => { e.preventDefault(); startDrag(i); }
                : undefined
            }
            className={`${mode === "reorder" ? "cursor-grab active:cursor-grabbing select-none" : ""} ${
              horizontal ? "flex-shrink-0" : ""
            }`}
          >
            <LazyThumbnail
              pdfDoc={pdfDoc}
              pageNumber={pageNum}
              width={thumbnailWidth}
              rotation={pageRotations?.[pageIdx] ?? 0}
              selected={selectedPages?.has(pageIdx)}
              highlightColor={getHighlight(pageNum)}
              label={pageLabels?.[pageNum]}
              mode={mode}
              onSelect={() => handleSelect(pageIdx)}
              onRotateLeft={() => {
                if (!onRotationsChange) return;
                onRotationsChange({ ...(pageRotations ?? {}), [pageIdx]: ((pageRotations?.[pageIdx] ?? 0) - 90) });
              }}
              onRotateRight={() => {
                if (!onRotationsChange) return;
                onRotationsChange({ ...(pageRotations ?? {}), [pageIdx]: ((pageRotations?.[pageIdx] ?? 0) + 90) });
              }}
              isDragging={dragIdx === i}
              isDropTarget={dropIdx === i}
            />
          </div>
        );
      })}
    </div>
  );
}
