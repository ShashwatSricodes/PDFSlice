import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  onSignature: (dataUrl: string) => void;
}

export function SignaturePad({ onSignature }: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [isEmpty, setIsEmpty] = useState(true);
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Load Dancing Script font
  useEffect(() => {
    if (!document.querySelector('link[href*="Dancing+Script"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    clearCanvas();
    setTypedName("");
  }, [mode, clearCanvas]);

  // Render typed text onto canvas
  useEffect(() => {
    if (mode !== "type") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typedName.trim()) {
      ctx.font = '48px "Dancing Script", cursive';
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      setIsEmpty(false);
    } else {
      setIsEmpty(true);
    }
  }, [typedName, mode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== "draw") return;
    isDrawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || mode !== "draw") return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const endDraw = () => {
    isDrawing.current = false;
  };

  const handleUse = () => {
    if (isEmpty) return;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSignature(dataUrl);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in-up">
      <h3 className="font-heading text-xl text-card-foreground mb-4">Create Your Signature</h3>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        {(["draw", "type"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            {m === "draw" ? "Draw" : "Type"}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="border border-border rounded-lg overflow-hidden bg-background mb-4">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Type input */}
      {mode === "type" && (
        <input
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Type your name..."
          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring mb-4"
        />
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleUse}
          disabled={isEmpty}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          Use Signature
        </button>
        <button onClick={clearCanvas} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
          Clear
        </button>
      </div>
    </div>
  );
}
