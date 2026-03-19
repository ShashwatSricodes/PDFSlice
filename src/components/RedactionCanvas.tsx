import { useRef, useState, useEffect } from 'react';
import type { RedactionArea } from '@/lib/pdfTools';

interface Props {
  pageImageUrl: string;
  pageIndex: number;
  redactions: RedactionArea[];
  onAdd: (area: RedactionArea) => void;
  onClear: (pageIndex: number) => void;
}

export function RedactionCanvas({
  pageImageUrl,
  pageIndex,
  redactions,
  onAdd,
  onClear,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw committed redaction boxes
      ctx.fillStyle = '#000000';
      redactions
        .filter(r => r.page === pageIndex)
        .forEach(r => {
          ctx.fillRect(
            r.x * canvas.width,
            r.y * canvas.height,
            r.width * canvas.width,
            r.height * canvas.height
          );
        });

      // Draw in-progress box
      if (drawing && start && current) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(
          Math.min(start.x, current.x) * canvas.width,
          Math.min(start.y, current.y) * canvas.height,
          Math.abs(current.x - start.x) * canvas.width,
          Math.abs(current.y - start.y) * canvas.height
        );
      }
    };
    img.src = pageImageUrl;
  }, [pageImageUrl, redactions, drawing, start, current, pageIndex]);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const pageRedactionCount = redactions.filter(r => r.page === pageIndex).length;

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full border border-border rounded-xl cursor-crosshair select-none"
        onMouseDown={e => { setDrawing(true); const p = getPos(e); setStart(p); setCurrent(p); }}
        onMouseMove={e => { if (drawing) setCurrent(getPos(e)); }}
        onMouseUp={() => {
          if (!drawing || !start || !current) return;
          setDrawing(false);
          const x = Math.min(start.x, current.x);
          const y = Math.min(start.y, current.y);
          const width = Math.abs(current.x - start.x);
          const height = Math.abs(current.y - start.y);
          if (width > 0.01 && height > 0.01) {
            onAdd({ page: pageIndex, x, y, width, height });
          }
          setStart(null); setCurrent(null);
        }}
        onMouseLeave={() => { setDrawing(false); setStart(null); setCurrent(null); }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-mono text-muted-foreground">
          {pageRedactionCount > 0
            ? `${pageRedactionCount} redaction${pageRedactionCount > 1 ? 's' : ''} on this page`
            : 'Click and drag to mark areas for redaction'}
        </span>
        {pageRedactionCount > 0 && (
          <button
            onClick={() => onClear(pageIndex)}
            className="text-xs font-mono text-destructive hover:text-destructive/80 transition-colors"
          >
            Clear page
          </button>
        )}
      </div>
    </div>
  );
}
