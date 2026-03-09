import { useEffect, useRef } from "react";

interface PageThumbnailProps {
  pdfDoc: any;
  pageNumber: number;
  width?: number;
  selected?: boolean;
  rotation?: number;
  onClick?: () => void;
}

export function PageThumbnail({ pdfDoc, pageNumber, width = 120, selected, rotation = 0, onClick }: PageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = width / baseViewport.width;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, width, rotation]);

  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-150 ${
        selected ? "ring-2 ring-foreground rounded-lg" : ""
      }`}
    >
      <canvas ref={canvasRef} className="rounded-md border border-border bg-card" />
      <span className="text-[10px] font-mono text-muted-foreground">{pageNumber}</span>
    </div>
  );
}
