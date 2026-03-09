import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, X, Plus, Zap, GripVertical } from "lucide-react";
import { getToolById } from "@/lib/toolsData";
import { DropZone } from "@/components/DropZone";
import { PageGrid } from "@/components/PageGrid";
import { ProgressBar } from "@/components/ProgressBar";
import { SuccessState } from "@/components/SuccessState";
import { SignaturePad } from "@/components/SignaturePad";
import { SignaturePlacer } from "@/components/SignaturePlacer";
import { FormFiller } from "@/components/FormFiller";
import { RedactionCanvas } from "@/components/RedactionCanvas";
import { CropPreview } from "@/components/CropPreview";
import * as pdfTools from "@/lib/pdfTools";

type PDFDoc = import("pdfjs-dist").PDFDocumentProxy;

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  return pdfjsLib;
}

async function loadPdfDoc(file: File): Promise<PDFDoc> {
  const lib = await getPdfjsLib();
  const data = await file.arrayBuffer();
  return lib.getDocument({ data }).promise;
}

type WorkspaceState = "idle" | "loaded" | "processing" | "done";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─── Watermark live preview ──────────────────────────────────────────────── */

function WatermarkPreview({ pdfDoc, text, opacity }: { pdfDoc: PDFDoc; text: string; opacity: number }) {
  const totalPages = pdfDoc.numPages;
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 1; i <= totalPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const baseVp = page.getViewport({ scale: 1 });
          const scale = 220 / baseVp.width;
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[i - 1];
          if (!canvas || cancelled) return;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          if (cancelled) return;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4);
          ctx.globalAlpha = opacity;
          ctx.fillStyle = "#808080";
          const fontSize = Math.min(canvas.width, canvas.height) * 0.08;
          ctx.font = `bold ${fontSize}px Helvetica, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text || "WATERMARK", 0, 0);
          ctx.restore();
        } catch { /* unmounted */ }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfDoc, text, opacity, totalPages]);

  return (
    <div className="mb-4">
      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
        Preview — all {totalPages} page{totalPages !== 1 ? "s" : ""}
      </label>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {Array.from({ length: totalPages }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <canvas
              ref={(el) => { canvasRefs.current[i] = el; }}
              className="rounded-lg border border-border bg-card shadow-sm max-w-full"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* CropPreview moved to src/components/CropPreview.tsx */
/* ─── Merge file order with drag & drop ───────────────────────────────── */

function MergeFileOrder({ files, onReorder }: { files: File[]; onReorder: (files: File[]) => void }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      const next = [...files];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      onReorder(next);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div className="space-y-1 mt-4">
      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
        File order — drag to reorder
      </label>
      {files.map((f, i) => (
        <div
          key={`${f.name}-${i}`}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing select-none transition-all ${
            dragIdx === i ? "opacity-40 scale-95" : ""
          } ${dropIdx === i && dragIdx !== i ? "ring-2 ring-primary bg-accent" : "bg-muted"}`}
        >
          <GripVertical size={14} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
          <span className="text-sm font-mono text-foreground flex-1 truncate">{f.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main ToolPage ───────────────────────────────────────────────────────── */

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const tool = getToolById(toolId || "");

  const [state, setState] = useState<WorkspaceState>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfDoc, setPdfDoc] = useState<PDFDoc | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [result, setResult] = useState<Blob | Blob[] | string | null>(null);
  const [resultFilename, setResultFilename] = useState("");

  // Tool-specific state
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [splitRanges, setSplitRanges] = useState("");
  const [margins, setMargins] = useState({ top: 50, right: 50, bottom: 50, left: 50 });
  const [blankAfter, setBlankAfter] = useState("");
  const [removedMetadata, setRemovedMetadata] = useState<string[]>([]);

  // Sign tool state
  const [signStep, setSignStep] = useState<"pad" | "place" | "processing" | "done">("pad");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");

  // Form filler state
  const [formFields, setFormFields] = useState<Array<{ name: string; type: string; options?: string[] }>>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  // Redact state
  const [redactions, setRedactions] = useState<Array<{
    pageIndex: number; x: number; y: number; width: number; height: number;
  }>>([]);

  // Merge preview docs
  const [mergeDocs, setMergeDocs] = useState<{ doc: PDFDoc; pages: number; fileName: string }[]>([]);


  // Page title
  useEffect(() => {
    if (tool) {
      document.title = `${tool.name} — PDFSlice`;
    }
    return () => { document.title = 'PDFSlice'; };
  }, [tool]);

  // Reset on tool change
  useEffect(() => {
    setState("idle");
    setFiles([]);
    setPdfDoc(null);
    setPageCount(0);
    setResult(null);
    setSelectedPages(new Set());
    setPageRotations({});
    setPageOrder([]);
    setPassword("");
    setConfirmPassword("");
    setOwnerPassword("");
    setWatermarkText("CONFIDENTIAL");
    setWatermarkOpacity(0.3);
    setSplitRanges("");
    setRemovedMetadata([]);
    setSignStep("pad");
    setSignatureDataUrl("");
    setFormFields([]);
    setFormValues({});
    setRedactions([]);
    setMergeDocs([]);
  }, [toolId]);

  // Load merge docs when files change for merge tool
  useEffect(() => {
    if (toolId !== "merge" || files.length === 0) {
      setMergeDocs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const docs = await Promise.all(
          files.map(async (f) => {
            const doc = await loadPdfDoc(f);
            return { doc, pages: doc.numPages, fileName: f.name };
          })
        );
        if (!cancelled) setMergeDocs(docs);
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, [toolId, files]);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    if (tool?.inputType === "multi" || tool?.inputType === "images") {
      setFiles(prev => [...prev, ...newFiles]);
    } else {
      setFiles(newFiles.slice(0, 1));
    }
    setState("loaded");

    // Load PDF doc for page-based tools
    if (tool?.inputType === "single" && newFiles[0]?.type === "application/pdf") {
      try {
        const doc = await loadPdfDoc(newFiles[0]);
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i));

        if (toolId === "fill-forms") {
          const fields = await pdfTools.detectFormFields(newFiles[0]);
          setFormFields(fields);
          const defaults: Record<string, string> = {};
          fields.forEach(f => { defaults[f.name] = ''; });
          setFormValues(defaults);
        }
      } catch (e) {
        console.error("Failed to load PDF for preview:", e);
      }
    }
  }, [tool, toolId]);

  const handleProcess = async () => {
    if (!tool || files.length === 0) return;
    setState("processing");

    try {
      let output: Blob | Blob[] | string;
      const file = files[0];

      switch (toolId) {
        case "merge":
          output = await pdfTools.mergePdfs(files);
          setResultFilename("merged.pdf");
          break;
        case "split": {
          const ranges = pdfTools.parseSplitRanges(splitRanges);
          if (ranges.length === 0) { setState("loaded"); return; }
          output = await pdfTools.splitPdf(file, ranges);
          setResultFilename("split.pdf");
          break;
        }
        case "remove-pages":
          output = await pdfTools.removePages(file, Array.from(selectedPages));
          setResultFilename("pages-removed.pdf");
          break;
        case "reorder":
          output = await pdfTools.reorderPages(file, pageOrder);
          setResultFilename("reordered.pdf");
          break;
        case "rotate":
          output = await pdfTools.rotatePdf(file, pageRotations);
          setResultFilename("rotated.pdf");
          break;
        case "compress":
          output = await pdfTools.compressPdf(file);
          setResultFilename("compressed.pdf");
          break;
        case "repair":
          output = await pdfTools.repairPdf(file);
          setResultFilename("repaired.pdf");
          break;
        case "protect":
          if (password !== confirmPassword || !password) { setState("loaded"); return; }
          output = await pdfTools.protectPdf(file, password, ownerPassword || password);
          setResultFilename("protected.pdf");
          break;
        case "unlock":
          output = await pdfTools.unlockPdf(file, password);
          setResultFilename("unlocked.pdf");
          break;
        case "watermark":
          output = await pdfTools.addWatermark(file, watermarkText, watermarkOpacity);
          setResultFilename("watermarked.pdf");
          break;
        case "page-numbers":
          output = await pdfTools.addPageNumbers(file);
          setResultFilename("numbered.pdf");
          break;
        case "images-to-pdf":
          output = await pdfTools.imagesToPdf(files);
          setResultFilename("images.pdf");
          break;
        case "pdf-to-images": {
          const imgBlobs = await pdfTools.pdfToImages(file);
          if (imgBlobs.length > 1) {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            imgBlobs.forEach((blob, i) => {
              zip.file(`page-${String(i + 1).padStart(3, '0')}.png`, blob);
            });
            output = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            setResultFilename(`${file.name.replace('.pdf', '')}-images.zip`);
          } else {
            output = imgBlobs[0];
            setResultFilename('page-1.png');
          }
          break;
        }
        case "pdf-to-text":
          output = await pdfTools.pdfToText(file);
          setResultFilename("extracted.txt");
          break;
        case "blank-pages": {
          const positions = blankAfter.split(",").map(s => Number(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0);
          output = await pdfTools.addBlankPages(file, positions);
          setResultFilename("with-blanks.pdf");
          break;
        }
        case "crop":
          output = await pdfTools.cropPdf(file, margins);
          setResultFilename("cropped.pdf");
          break;
        case "remove-metadata": {
          const { blob, removed } = await pdfTools.removeMetadata(file);
          output = blob;
          setRemovedMetadata(removed);
          setResultFilename("clean.pdf");
          break;
        }
        case "pdf-to-zip":
          output = await pdfTools.pdfToZip(file);
          setResultFilename("pages.zip");
          break;
        case "fill-forms":
          output = await pdfTools.fillAndFlattenForm(file, formValues);
          setResultFilename("filled.pdf");
          break;
        case "redact":
          output = await pdfTools.redactPdf(file, redactions);
          setResultFilename("redacted.pdf");
          break;
        default:
          setState("loaded");
          return;
      }
      setResult(output);
      setState("done");
    } catch (err) {
      console.error("Processing error:", err);
      setState("loaded");
    }
  };

  const handleSignConfirm = async (
    pageIndex: number,
    position: { x: number; y: number; width: number; height: number }
  ) => {
    setState("processing");
    setState("processing");
    try {
      const output = await pdfTools.signPdf(files[0], signatureDataUrl, pageIndex, position);
      setResult(output);
      setResultFilename("signed.pdf");
      setState("done");
    } catch (err) {
      console.error("Sign error:", err);
      setState("loaded");
      setSignStep("pad");
    }
  };

  const downloadBlob = async (blob: Blob, filename: string) => {
    const { saveFile } = await import('@/lib/platform');
    const mime = filename.endsWith('.zip') ? 'application/zip'
      : filename.endsWith('.txt') ? 'text/plain'
      : 'application/pdf';
    const typedBlob = new Blob([blob], { type: mime });
    await saveFile(typedBlob, filename);
  };

  const handleDownload = async () => {
    if (!result) return;
    if (typeof result === "string") {
      const blob = new Blob([result], { type: "text/plain" });
      downloadBlob(blob, resultFilename);
    } else if (Array.isArray(result)) {
      if (result.length === 1) {
        const ext = resultFilename.endsWith('.png') ? 'png' : 'pdf';
        downloadBlob(result[0], `page-1.${ext}`);
        return;
      }
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      result.forEach((blob, i) => {
        const pageNum = String(i + 1).padStart(3, '0');
        const ext = resultFilename.endsWith('.png') ? 'png' : 'pdf';
        zip.file(`page-${pageNum}.${ext}`, blob);
      });
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const baseName = files[0]?.name.replace('.pdf', '') ?? 'pages';
      downloadBlob(zipBlob, `${baseName}-images.zip`);
    } else {
      downloadBlob(result, resultFilename);
    }
  };

  if (!tool) {
    return (
      <div className="p-12 text-center">
        <p className="font-mono text-muted-foreground">Tool not found</p>
      </div>
    );
  }

  const accept = tool.inputType === "images" ? "image/png,image/jpeg" : ".pdf";
  const isSignTool = toolId === "sign";

  const processingMessage = 'Processing...';

  // Split range highlighting
  const splitColors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
  const parsedSplitRanges = splitRanges ? pdfTools.parseSplitRanges(splitRanges) : [];
  const splitHighlightRanges = parsedSplitRanges.map((range, i) => ({
    pages: Array.from({ length: range[1] - range[0] + 1 }, (_, j) => range[0] + j),
    color: splitColors[i % splitColors.length],
  }));

  // Process button label
  const processLabel = (() => {
    if (toolId === "remove-pages" && selectedPages.size > 0)
      return `Remove ${selectedPages.size} page${selectedPages.size !== 1 ? "s" : ""}`;
    if (toolId === "rotate") return "Apply Rotations";
    return "Process PDF";
  })();

  // Process button disabled state
  const processDisabled =
    state !== "loaded" ||
    (toolId === "remove-pages" && selectedPages.size === 0) ||
    (toolId === "redact" && redactions.length === 0);

  // Merge page labels & combined doc for preview
  const mergePreviewDoc = mergeDocs.length > 0 ? mergeDocs[0] : null;

  return (
    <>
    <div className="p-4 sm:p-8 lg:p-12 max-w-4xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft size={16} strokeWidth={1.5} /> Back to tools
        </button>
        <h1 className="font-heading text-2xl sm:text-4xl text-foreground">{tool.name}</h1>
        <p className="text-[15px] font-mono text-muted-foreground mt-1">{tool.description}</p>
      </div>

      {/* Sign tool has a special flow */}
      {isSignTool ? (
        <>
          {state === "idle" && (
            <DropZone accept={accept} multiple={false} onFiles={handleFiles} label="Drop your PDF here" />
          )}

          {state !== "idle" && (
            <div className="bg-card border border-border rounded-xl p-4 mb-6 card-shadow">
              <div className="font-mono text-sm">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className="text-foreground">{f.name}</span>
                    <span className="text-muted-foreground">{formatSize(f.size)}</span>
                    {pageCount > 0 && <span className="text-muted-foreground">{pageCount} pages</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state === "loaded" && signStep === "pad" && (
            <SignaturePad onSignature={(url) => { setSignatureDataUrl(url); setSignStep("place"); }} />
          )}

          {state === "loaded" && signStep === "place" && pdfDoc && (
            <SignaturePlacer
              pdfDoc={pdfDoc}
              pageCount={pageCount}
              signatureDataUrl={signatureDataUrl}
              onConfirm={handleSignConfirm}
              onBack={() => setSignStep("pad")}
            />
          )}

          {state === "processing" && (
            <div className="bg-card border border-border rounded-xl p-8 card-shadow">
              <p className="text-sm font-mono text-muted-foreground mb-4 text-center">Processing...</p>
              <ProgressBar active />
            </div>
          )}

          {state === "done" && result != null && (
            <>
              <SuccessState
                originalSize={files[0]?.size}
                resultSize={result instanceof Blob ? result.size : 0}
                filename={resultFilename}
                onDownload={handleDownload}
              />
              <div className="mt-6 text-center">
                <button onClick={() => { setState("idle"); setFiles([]); setPdfDoc(null); setResult(null); setSignStep("pad"); setSignatureDataUrl(""); }}
                  className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
                  Process another file →
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* Step 1: Drop Zone */}
          {state === "idle" && (
            <DropZone
              accept={accept}
              multiple={tool.inputType !== "single"}
              onFiles={handleFiles}
              label={tool.inputType === "images" ? "Drop your images here" : "Drop your PDF here"}
            />
          )}

          {/* File info */}
          {state !== "idle" && (
            <div className="bg-card border border-border rounded-xl p-4 mb-6 card-shadow">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <span className="text-foreground">{f.name}</span>
                      <span className="text-muted-foreground">{formatSize(f.size)}</span>
                      {pageCount > 0 && files.length === 1 && (
                        <span className="text-muted-foreground">{pageCount} pages</span>
                      )}
                      {(tool.inputType === "multi" || tool.inputType === "images") && (
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {state === "loaded" && (tool.inputType === "multi" || tool.inputType === "images") && (
                  <label className="cursor-pointer flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-xs font-mono hover:bg-accent transition-colors">
                    <Plus size={14} strokeWidth={1.5} /> Add more
                    <input type="file" accept={accept} multiple onChange={(e) => {
                      const f = Array.from(e.target.files || []);
                      if (f.length) handleFiles(f);
                    }} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Tool Controls */}
          {state === "loaded" && (
            <div className="bg-card border border-border rounded-xl p-6 mb-6 card-shadow animate-fade-in-up">

              {/* ── Remove Pages ──────────────────────────────────────────── */}
              {toolId === "remove-pages" && pdfDoc && (
                <div className="mb-4">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                    Click pages to mark for removal
                  </label>
                  <PageGrid
                    pdfDoc={pdfDoc}
                    pageCount={pageCount}
                    mode="select"
                    selectedPages={selectedPages}
                    onSelectionChange={setSelectedPages}
                  />
                  {selectedPages.size > 0 && (
                    <p className="text-xs font-mono text-destructive mt-3">
                      {selectedPages.size} page{selectedPages.size !== 1 ? "s" : ""} selected for removal
                    </p>
                  )}
                </div>
              )}

              {/* ── Reorder Pages ─────────────────────────────────────────── */}
              {toolId === "reorder" && pdfDoc && (
                <div className="mb-4">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                    Drag pages to reorder
                  </label>
                  <PageGrid
                    pdfDoc={pdfDoc}
                    pageCount={pageCount}
                    mode="reorder"
                    pageOrder={pageOrder}
                    onOrderChange={setPageOrder}
                  />
                </div>
              )}

              {/* ── Rotate Pages ──────────────────────────────────────────── */}
              {toolId === "rotate" && pdfDoc && (
                <div className="mb-4">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                    Click rotation buttons below each page
                  </label>
                  <PageGrid
                    pdfDoc={pdfDoc}
                    pageCount={pageCount}
                    mode="rotate"
                    pageRotations={pageRotations}
                    onRotationsChange={setPageRotations}
                  />
                </div>
              )}

              {/* ── Split PDF ─────────────────────────────────────────────── */}
              {toolId === "split" && pdfDoc && (
                <div className="mb-4">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                    Page overview
                  </label>
                  <PageGrid
                    pdfDoc={pdfDoc}
                    pageCount={pageCount}
                    mode="view"
                    highlightRanges={splitHighlightRanges.length > 0 ? splitHighlightRanges : undefined}
                  />
                  <div className="mt-4">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                      Page ranges (e.g. 1-3, 5-7, 10)
                    </label>
                    <input
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="1-3, 5-7"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {splitHighlightRanges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {splitHighlightRanges.map((r, i) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: r.color, color: r.color }}>
                            Part {i + 1}: pages {parsedSplitRanges[i][0]}–{parsedSplitRanges[i][1]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Watermark ─────────────────────────────────────────────── */}
              {toolId === "watermark" && (
                <div className="space-y-4">
                  {pdfDoc && (
                    <WatermarkPreview pdfDoc={pdfDoc} text={watermarkText} opacity={watermarkOpacity} />
                  )}
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">Watermark Text</label>
                    <input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                      Opacity: {Math.round(watermarkOpacity * 100)}%
                    </label>
                    <input type="range" min="0.05" max="1" step="0.05" value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* ── Crop ──────────────────────────────────────────────────── */}
              {toolId === "crop" && pdfDoc && (
                <CropPreview pdfDoc={pdfDoc} pageCount={pageCount} margins={margins} onMarginsChange={setMargins} />
              )}

              {/* ── Merge preview ─────────────────────────────────────────── */}
              {toolId === "merge" && mergeDocs.length > 0 && (
                <div className="mb-4">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-3">
                    Merged page preview
                  </label>
                  <div className="space-y-4">
                    {mergeDocs.map((md, fileIdx) => (
                      <div key={fileIdx}>
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">
                          File {fileIdx + 1}: {md.fileName} ({md.pages} pages)
                        </p>
                        <PageGrid
                          pdfDoc={md.doc}
                          pageCount={md.pages}
                          mode="view"
                          thumbnailWidth={110}
                          horizontal
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Merge file order (drag & drop) ────────────────────────── */}
              {(toolId === "merge" || toolId === "images-to-pdf") && files.length > 1 && (
                <MergeFileOrder files={files} onReorder={setFiles} />
              )}

              {/* Password tools */}
              {(toolId === "protect" || toolId === "unlock") && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  {toolId === "protect" && (
                    <>
                      <div>
                        <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {password && confirmPassword && password !== confirmPassword && (
                          <p className="text-xs font-mono text-destructive mt-1">Passwords don't match</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                          Owner Password <span className="normal-case">(optional — defaults to same)</span>
                        </label>
                        <input
                          type="password"
                          placeholder="Leave blank to use same password"
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Compress info */}
              {toolId === "compress" && (
                <p className="text-sm font-mono text-muted-foreground">
                  Re-saves the PDF with object streams enabled. For deeper compression of embedded images, a native tool is recommended.
                </p>
              )}

              {/* Blank pages */}
              {toolId === "blank-pages" && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                    Insert blank page after page numbers (comma separated)
                  </label>
                  <input value={blankAfter} onChange={(e) => setBlankAfter(e.target.value)} placeholder="1, 3, 5"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              {/* Fill & Flatten Forms */}
              {toolId === "fill-forms" && (
                <FormFiller fields={formFields} onChange={setFormValues} />
              )}

              {/* Redact */}
              {toolId === "redact" && pdfDoc && (
                <RedactionCanvas pdfDoc={pdfDoc} pageCount={pageCount} onRedactionsChange={setRedactions} />
              )}

              {/* Process button */}
              <div className="mt-6">
                <button
                  onClick={handleProcess}
                  disabled={processDisabled}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Zap size={16} strokeWidth={1.5} />
                  {processLabel}
                </button>
              </div>
            </div>
          )}

          {/* Processing */}
          {state === "processing" && (
            <div className="bg-card border border-border rounded-xl p-8 card-shadow">
              <p className="text-sm font-mono text-muted-foreground mb-4 text-center">
                {processingMessage}
              </p>
              <ProgressBar active />
            </div>
          )}

          {/* Done */}
          {state === "done" && result != null && (
            <>
              {typeof result === "string" ? (
                <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in-up">
                  <h3 className="font-heading text-xl mb-4 text-card-foreground">Extracted Text</h3>
                  <pre className="text-xs font-mono text-muted-foreground bg-muted p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                    {result}
                  </pre>
                  <button onClick={handleDownload}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-mono text-sm font-medium hover:opacity-90 transition-opacity">
                    Download as .txt
                  </button>
                </div>
              ) : (
                <SuccessState
                  originalSize={files[0]?.size}
                  resultSize={Array.isArray(result) ? result.reduce((s, b) => s + b.size, 0) : result.size}
                  filename={resultFilename}
                  onDownload={handleDownload}
              />
              )}

              {toolId === 'pdf-to-images' && Array.isArray(result) && result.length > 1 && (
                <p className="text-xs font-mono text-muted-foreground text-center mt-2">
                  {result.length} pages bundled into one ZIP file
                </p>
              )}

              {/* Removed metadata display */}
              {toolId === 'remove-metadata' && removedMetadata.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 mt-4 card-shadow animate-fade-in-up">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Removed fields</h4>
                  <div className="space-y-1">
                    {removedMetadata.map((item, i) => (
                      <div key={i} className="text-sm font-mono text-foreground flex items-center gap-2">
                        <span className="text-destructive">✕</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {toolId === 'remove-metadata' && removedMetadata.length === 0 && state === 'done' && (
                <div className="bg-card border border-border rounded-xl p-6 mt-4 card-shadow animate-fade-in-up">
                  <p className="text-sm font-mono text-muted-foreground">
                    No metadata found — this PDF was already clean.
                  </p>
                </div>
              )}

              <div className="mt-6 text-center">
                <button onClick={() => { setState("idle"); setFiles([]); setPdfDoc(null); setResult(null); }}
                  className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
                  Process another file →
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>

    </>
  );
}
